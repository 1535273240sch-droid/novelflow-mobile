import {
  DEFAULT_APP_CONFIG,
  DEMO_PRESET_ID,
  type AppConfig,
  type AppSettings,
  type PresetCreds,
  type PresetInput,
  type PresetView,
  type Protocol,
  type RoleMapping
} from '../shared/types'
import { maskKey } from '../lib/llm/redact'

/**
 * 应用设置存储（localStorage: novelflow:settings）：
 * 与桌面版 settings-store.ts 对齐——渲染层永远只能拿到 apiKeyHint；
 * 差异：桌面版密钥经 Electron safeStorage 加密落盘，手机版存于本机设备存储，
 * 未勾选「记住」的密钥仅保存在内存（本次会话有效）。
 */

const LS_SETTINGS = 'novelflow:settings'

export interface StoredPreset {
  id: string
  name: string
  protocol: Protocol
  baseUrl: string
  /** 勾选「记住」时保存在本机设备存储；否则为 null */
  apiKeyStored: string | null
  apiKeyHint: string
  model: string
  contextLength: number
  temperature: number
  maxOutputTokens: number
  createdAt: string
}

interface SettingsFile {
  version: number
  presets: StoredPreset[]
  roles: RoleMapping
  config: AppConfig
}

function defaultSettings(): SettingsFile {
  return { version: 1, presets: [], roles: {}, config: { ...DEFAULT_APP_CONFIG } }
}

function load(): SettingsFile {
  try {
    const raw = localStorage.getItem(LS_SETTINGS)
    if (!raw) return defaultSettings()
    const data = JSON.parse(raw) as SettingsFile
    if (!Array.isArray(data.presets)) data.presets = []
    data.config = { ...DEFAULT_APP_CONFIG, ...data.config }
    data.roles = data.roles ?? {}
    return data
  } catch {
    return defaultSettings()
  }
}

function persist(data: SettingsFile): void {
  localStorage.setItem(LS_SETTINGS, JSON.stringify(data))
}

/** 未记住的密钥（仅内存，刷新页面失效） */
const sessionKeys = new Map<string, string>()

function newPresetId(): string {
  return `preset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function demoPresetView(): PresetView {
  return {
    id: DEMO_PRESET_ID,
    name: '演示模型（内置离线）',
    protocol: 'local-demo',
    baseUrl: '',
    apiKeyHint: '',
    apiKeySessionOnly: false,
    model: 'novelflow-demo',
    contextLength: 32000,
    temperature: 0.7,
    maxOutputTokens: 2048,
    createdAt: ''
  }
}

function toView(p: StoredPreset, sessionOnly: boolean): PresetView {
  return {
    id: p.id,
    name: p.name,
    protocol: p.protocol,
    baseUrl: p.baseUrl,
    apiKeyHint: p.apiKeyHint,
    apiKeySessionOnly: sessionOnly,
    model: p.model,
    contextLength: p.contextLength,
    temperature: p.temperature,
    maxOutputTokens: p.maxOutputTokens,
    createdAt: p.createdAt
  }
}

export function getSettings(): AppSettings {
  const d = load()
  return {
    version: d.version,
    presets: [demoPresetView(), ...d.presets.map((p) => toView(p, sessionKeys.has(p.id)))],
    roles: { ...d.roles },
    config: { ...d.config }
  }
}

export function upsertPreset(input: PresetInput): PresetView {
  const d = load()
  const existing = input.id ? d.presets.find((p) => p.id === input.id) : undefined
  const now = new Date().toISOString()
  let stored: StoredPreset

  if (existing) {
    existing.name = input.name
    existing.protocol = input.protocol
    existing.baseUrl = input.baseUrl
    existing.model = input.model
    existing.contextLength = input.contextLength
    existing.temperature = input.temperature
    existing.maxOutputTokens = input.maxOutputTokens
    stored = existing
  } else {
    stored = {
      id: newPresetId(),
      name: input.name,
      protocol: input.protocol,
      baseUrl: input.baseUrl,
      apiKeyStored: null,
      apiKeyHint: '',
      model: input.model,
      contextLength: input.contextLength,
      temperature: input.temperature,
      maxOutputTokens: input.maxOutputTokens,
      createdAt: now
    }
    d.presets.push(stored)
  }

  if (input.apiKey != null && input.apiKey !== '') {
    if (input.rememberKey) {
      stored.apiKeyStored = input.apiKey
      stored.apiKeyHint = maskKey(input.apiKey)
      sessionKeys.delete(stored.id)
    } else {
      // 未勾选记住：密钥只留在内存，本次会话有效，绝不写入本机存储
      stored.apiKeyStored = null
      stored.apiKeyHint = maskKey(input.apiKey)
      sessionKeys.set(stored.id, input.apiKey)
    }
  }
  persist(d)
  return toView(stored, sessionKeys.has(stored.id))
}

export function deletePreset(id: string): void {
  const d = load()
  d.presets = d.presets.filter((p) => p.id !== id)
  sessionKeys.delete(id)
  for (const role of Object.keys(d.roles) as Array<keyof RoleMapping>) {
    if (d.roles[role] === id) delete d.roles[role]
  }
  persist(d)
}

export function setRoles(roles: RoleMapping): void {
  const d = load()
  d.roles = { ...roles }
  persist(d)
}

export function setAppConfig(patch: Partial<AppConfig>): AppConfig {
  const d = load()
  d.config = { ...d.config, ...patch }
  if (d.config.concurrencyLimit < 1) d.config.concurrencyLimit = 1
  persist(d)
  return { ...d.config }
}

/** 取某预设的调用凭据（明文 key 只在本进程内存中出现） */
export function getCredentials(presetId: string): PresetCreds | null {
  if (presetId === DEMO_PRESET_ID) {
    return {
      protocol: 'local-demo',
      baseUrl: '',
      apiKey: '',
      model: 'novelflow-demo',
      temperature: 0.7,
      maxOutputTokens: 2048,
      contextLength: 32000
    }
  }
  const d = load()
  const p = d.presets.find((x) => x.id === presetId)
  if (!p) return null
  const key = p.apiKeyStored ?? sessionKeys.get(p.id) ?? ''
  return {
    protocol: p.protocol,
    baseUrl: p.baseUrl,
    apiKey: key,
    model: p.model,
    temperature: p.temperature,
    maxOutputTokens: p.maxOutputTokens,
    contextLength: p.contextLength
  }
}

/** 手机版安全说明文案（设置页展示） */
export const SECURITY_NOTE =
  '手机版密钥保存在本机设备存储中，绝不随小说内容上传；勾选「记住」的 Key 会持久保存在本机（与桌面版 safeStorage 加密不同，App 卸载即清除）。'
