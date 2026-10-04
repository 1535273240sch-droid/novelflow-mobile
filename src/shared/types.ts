/**
 * NovelFlow Mobile 共享类型（与桌面版 src/shared/types.ts 对齐，差异见注释）。
 */

/** 模型协议：桌面版两种 + 手机版内置 local-demo（离线演示，不出网） */
export type Protocol = 'openai-compatible' | 'anthropic' | 'local-demo'

export const PROTOCOL_LABELS: Record<Protocol, string> = {
  'openai-compatible': 'OpenAI 兼容',
  anthropic: 'Anthropic',
  'local-demo': '演示模型（内置离线）'
}

/** 内置演示模型的固定预设 id（设置里不可编辑/删除） */
export const DEMO_PRESET_ID = 'builtin-demo'

/** 模型角色：规划 / 写作 / 检查 / 润色 */
export type ModelRole = 'planner' | 'writer' | 'checker' | 'polisher'

export const MODEL_ROLES: ModelRole[] = ['planner', 'writer', 'checker', 'polisher']

export const MODEL_ROLE_LABELS: Record<ModelRole, string> = {
  planner: '规划模型',
  writer: '写作模型',
  checker: '检查模型',
  polisher: '润色模型'
}

/** 模型预设（UI 视图，绝不含明文密钥） */
export interface PresetView {
  id: string
  name: string
  protocol: Protocol
  baseUrl: string
  /** 脱敏提示，如 "sk-***abcd" */
  apiKeyHint: string
  /** true 表示密钥仅本次会话有效（未勾选记住） */
  apiKeySessionOnly: boolean
  model: string
  contextLength: number
  temperature: number
  maxOutputTokens: number
  createdAt: string
}

/** 新建/编辑预设输入；apiKey 传 null/undefined 表示沿用已存密钥 */
export interface PresetInput {
  id?: string
  name: string
  protocol: Protocol
  baseUrl: string
  apiKey?: string | null
  /** 勾选后密钥保存在本机设备存储；不勾选仅本次会话有效 */
  rememberKey?: boolean
  model: string
  contextLength: number
  temperature: number
  maxOutputTokens: number
}

/** 模型角色映射：角色 → 预设 id */
export type RoleMapping = Partial<Record<ModelRole, string>>

/** 应用设置（并发限制、节流、自动保存间隔） */
export interface AppConfig {
  concurrencyLimit: number
  streamThrottleMs: number
  autoSaveMs: number
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  concurrencyLimit: 2,
  streamThrottleMs: 80,
  autoSaveMs: 3500
}

export interface AppSettings {
  version: number
  presets: PresetView[]
  roles: RoleMapping
  config: AppConfig
}

/** 项目信息（手机版项目保存在本机设备存储内，id 即“文件夹”） */
export interface ProjectInfo {
  id: string
  name: string
  genre: string
  targetWords: number
  createdAt: string
}

/** 文件/目录条目（项目树用） */
export interface FileEntry {
  name: string
  path: string
  type: 'file' | 'dir'
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatStartParams {
  presetId?: string
  prompt: string
  system?: string
}

export type LlmEventType = 'delta' | 'done' | 'error'

/** 流式事件（delta 为节流后的全量快照，与桌面版一致） */
export interface LlmEvent {
  callId: string
  type: LlmEventType
  full: string
  error?: string
  cancelled?: boolean
}

export interface TestConnectionResult {
  ok: boolean
  latencyMs?: number
  model?: string
  error?: string
}

/** 项目备份（导出/导入）：novel.json 元数据 + 全部文件，等价桌面版的“项目文件夹” */
export interface ProjectBackup {
  format: 'novelflow-project-backup'
  version: 1
  project: Pick<ProjectInfo, 'name' | 'genre' | 'targetWords' | 'createdAt'>
  /** 相对路径 → 文件内容（与桌面版目录结构一致：novel.json、bible/…、outline/…、chapters/…、state/…） */
  files: Record<string, string>
  exportedAt: string
}

/** 取某预设的调用凭据（明文 key 只在本模块内存中出现） */
export interface PresetCreds {
  protocol: Protocol
  baseUrl: string
  apiKey: string
  model: string
  temperature: number
  maxOutputTokens: number
  contextLength?: number
}
