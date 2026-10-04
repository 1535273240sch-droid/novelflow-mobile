import type { LlmEvent, PresetCreds, TestConnectionResult } from '../../shared/types'
import { complete, streamChat } from './adapters'
import { demoStreamChat } from './demo-stream'
import { CancelledError, describeError, HttpError, isRetryableStatus, TimeoutError } from './errors'
import { Semaphore } from './concurrency'
import { ThrottledEmitter } from './throttle'
import { getCredentials } from '../../services/settings-store'

/**
 * 手机版 LLM 调用层（移植自桌面版 main/services/llm/service.ts）：
 * 并发限制（默认 2，可配置）→ 指数退避重试（429/5xx/超时，最多 3 次，
 * 仅在未收到任何内容时重试）→ 流式节流（默认 80ms）→ 可随时取消。
 * 桌面版跑在主进程、经 IPC 推事件；手机版直接在页面内回调。
 */

interface LlmServiceConfig {
  concurrencyLimit: number
  throttleMs: number
  connectTimeoutMs: number
  idleTimeoutMs: number
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
}

const DEFAULT_LLM_SERVICE_CONFIG: LlmServiceConfig = {
  concurrencyLimit: 2,
  throttleMs: 80,
  connectTimeoutMs: 30_000,
  idleTimeoutMs: 60_000,
  maxRetries: 3,
  baseDelayMs: 1_000,
  maxDelayMs: 15_000
}

export interface ChatRequest {
  presetId: string
  prompt: string
  system?: string
  onDelta?: (callId: string, full: string) => void
  signal?: AbortSignal
  throttleMs?: number
  maxRetries?: number
}

export interface ChatHandlers {
  onDelta?: (callId: string, full: string) => void
  onDone?: (callId: string, text: string) => void
  onError?: (callId: string, error: string, partialText: string, cancelled: boolean) => void
}

export interface ChatTicket {
  callId: string
  done: Promise<{ text: string; cancelled: boolean; error?: string }>
}

function newCallId(): string {
  return `call_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new CancelledError('已取消'))
      return
    }
    const t = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t)
        reject(new CancelledError('已取消'))
      },
      { once: true }
    )
  })
}

class LlmService {
  private config: LlmServiceConfig = { ...DEFAULT_LLM_SERVICE_CONFIG }
  private sema = new Semaphore(this.config.concurrencyLimit)
  private calls = new Map<string, AbortController>()
  private listeners = new Set<(ev: LlmEvent) => void>()

  /** 供设置页同步并发上限 */
  updateConfig(partial: Partial<Pick<LlmServiceConfig, 'concurrencyLimit' | 'throttleMs'>>): void {
    this.config = { ...this.config, ...partial }
    this.sema.limit = this.config.concurrencyLimit
  }

  onEvent(cb: (ev: LlmEvent) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  private emit(ev: LlmEvent): void {
    for (const cb of this.listeners) cb(ev)
  }

  /** 发起可取消的流式对话；永不 reject，错误经 onError 回调 */
  startChat(req: ChatRequest, handlers: ChatHandlers = {}): ChatTicket {
    const callId = newCallId()
    const ctrl = new AbortController()
    this.calls.set(callId, ctrl)
    let partial = ''
    const onDelta = (full: string) => {
      partial = full
      handlers.onDelta?.(callId, full)
      this.emit({ callId, type: 'delta', full })
    }
    const done = this.chat(req, onDelta, ctrl.signal)
      .then((text) => {
        handlers.onDone?.(callId, text)
        this.emit({ callId, type: 'done', full: text })
        return { text, cancelled: false as const }
      })
      .catch((e: unknown) => {
        const cancelled = e instanceof CancelledError || ctrl.signal.aborted
        const msg = describeError(e)
        handlers.onError?.(callId, msg, partial, cancelled)
        this.emit({ callId, type: 'error', full: partial, error: msg, cancelled })
        return { text: partial, cancelled, error: msg }
      })
      .finally(() => {
        this.calls.delete(callId)
      })
    return { callId, done }
  }

  /** 取消进行中的调用；callId 不存在时返回 false */
  cancel(callId: string): boolean {
    const ctrl = this.calls.get(callId)
    if (!ctrl) return false
    ctrl.abort()
    return true
  }

  /** 测试连接：发一个极短请求，返回成功/失败原因（单次尝试，不重试） */
  async testConnection(creds: PresetCreds): Promise<TestConnectionResult> {
    const startedAt = Date.now()
    try {
      if (creds.protocol === 'local-demo') {
        return { ok: true, latencyMs: 1, model: creds.model }
      }
      await complete(creds, [{ role: 'user', content: 'ping' }], { connectTimeoutMs: 20_000 })
      return { ok: true, latencyMs: Date.now() - startedAt, model: creds.model }
    } catch (e) {
      return { ok: false, error: describeError(e) }
    }
  }

  private async chat(req: ChatRequest, onDelta: (full: string) => void, signal: AbortSignal): Promise<string> {
    const creds = getCredentials(req.presetId)
    if (!creds) throw new Error('预设不存在，请重新选择模型')
    const release = await this.sema.acquire(signal)
    try {
      return await this.executeWithRetry(req, creds, onDelta, signal)
    } finally {
      release()
    }
  }

  private async executeWithRetry(
    req: ChatRequest,
    creds: PresetCreds,
    onDelta: (full: string) => void,
    signal: AbortSignal
  ): Promise<string> {
    const maxRetries = req.maxRetries ?? this.config.maxRetries
    const throttleMs = req.throttleMs ?? this.config.throttleMs
    const messages = [
      ...(req.system ? [{ role: 'system' as const, content: req.system }] : []),
      { role: 'user' as const, content: req.prompt }
    ]
    let attempt = 0
    let receivedAny = false
    let lastFull = ''
    for (;;) {
      try {
        const throttled = new ThrottledEmitter<string>(throttleMs, (full) => {
          lastFull = full
          onDelta(full)
        })
        const text =
          creds.protocol === 'local-demo'
            ? await demoStreamChat(req.prompt, (_delta, full) => {
                receivedAny = true
                throttled.push(full)
              }, signal)
            : await streamChat(
                creds,
                messages,
                (_delta, full) => {
                  receivedAny = true
                  throttled.push(full)
                },
                {
                  signal,
                  connectTimeoutMs: this.config.connectTimeoutMs,
                  idleTimeoutMs: this.config.idleTimeoutMs
                }
              )
        throttled.push(text)
        throttled.flush()
        return text
      } catch (e) {
        if (signal.aborted) throw new CancelledError('已取消')
        // 重试条件：尚未收到任何内容，且错误为超时或 429/5xx
        const retryable =
          !receivedAny &&
          (e instanceof TimeoutError || (e instanceof HttpError && isRetryableStatus(e.status)))
        if (!retryable || attempt >= maxRetries) {
          if (lastFull) onDelta(lastFull)
          throw e
        }
        await defaultSleep(Math.min(this.config.baseDelayMs * 2 ** attempt, this.config.maxDelayMs), signal)
        attempt++
      }
    }
  }
}

export const llm = new LlmService()
