/** LLM 调用层错误类型（移植自桌面版，所有错误信息面向用户且已脱敏）。 */

export class LlmError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LlmError'
  }
}

/** 超时（连接超时或流式空闲超时） */
export class TimeoutError extends LlmError {}

/** 用户主动取消 */
export class CancelledError extends LlmError {}

/** HTTP 状态错误 */
export class HttpError extends LlmError {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

/** 429/5xx 可自动重试（指数退避，最多 3 次） */
export function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599)
}

/** 把任意异常转成面向用户的中文原因 */
export function describeError(e: unknown): string {
  if (e instanceof TimeoutError) return e.message
  if (e instanceof CancelledError) return e.message || '已取消'
  if (e instanceof HttpError) {
    if (e.status === 401 || e.status === 403) return `认证失败（HTTP ${e.status}）：API Key 无效或无权限`
    if (e.status === 404) return `接口不存在（HTTP 404）：请检查 base_url 是否正确（通常需以 /v1 结尾）`
    if (e.status === 429) return `触发限流（HTTP 429）：请求过于频繁或额度不足`
    if (e.status >= 500) return `服务端错误（HTTP ${e.status}）`
    return `请求失败（HTTP ${e.status}）：${e.message}`
  }
  const msg = e instanceof Error ? `${e.message}` : String(e)
  // 浏览器/WebView 环境的网络错误是 TypeError: Failed to fetch
  if (/failed to fetch|networkerror|load failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(msg)) {
    return '无法连接到 base_url（网络错误或被 CORS 拦截），请检查地址、端口与服务端跨域设置'
  }
  return msg || '未知错误'
}
