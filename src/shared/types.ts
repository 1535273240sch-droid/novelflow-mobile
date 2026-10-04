/**
 * NovelFlow 共享类型与契约
 * 融合工作流引擎核心与移动端专属状态
 */

export * from '../../packages/core/src/types'

export type Protocol = 'openai-compatible' | 'anthropic' | 'local-demo'

export const PROTOCOL_LABELS: Record<Protocol, string> = {
  'openai-compatible': 'OpenAI 兼容（通义/DeepSeek/SiliconFlow等）',
  anthropic: 'Anthropic Claude',
  'local-demo': '古墨天工模拟（离线演示免Key）'
}

export const DEMO_PRESET_ID = 'builtin-demo'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface PresetCreds {
  protocol: Protocol
  baseUrl: string
  apiKey: string
  model: string
  temperature: number
  maxOutputTokens: number
  contextLength?: number
}

export interface PresetView {
  id: string
  name: string
  protocol: Protocol
  baseUrl: string
  apiKeyHint: string
  apiKeySessionOnly: boolean
  model: string
  contextLength: number
  temperature: number
  maxOutputTokens: number
  createdAt: string
}

export interface PresetInput {
  id?: string
  name: string
  protocol: Protocol
  baseUrl: string
  apiKey?: string | null
  rememberKey?: boolean
  model: string
  contextLength: number
  temperature: number
  maxOutputTokens: number
}

export type LlmEventType = 'delta' | 'done' | 'error'

export interface LlmEvent {
  callId: string
  type: LlmEventType
  full: string
  error?: string
  cancelled?: boolean
}

export interface AppConfig {
  theme: 'parchment' | 'dark'
  fontSize: 'small' | 'medium' | 'large' | 'xlarge'
  autoShowTitleSheet: boolean
  concurrencyLimit: number
  streamThrottleMs: number
  autoSaveMs: number
  bannedWords: string[]
  haptics: boolean
  keepScreenOn: boolean
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  theme: 'parchment',
  fontSize: 'medium',
  autoShowTitleSheet: true,
  concurrencyLimit: 2,
  streamThrottleMs: 80,
  autoSaveMs: 3000,
  bannedWords: [
    '不禁',
    '嘴角勾起一抹弧度',
    '眼中闪过一丝',
    '心中暗想',
    '仿佛……一般',
    '深吸一口气',
    '空气仿佛凝固了',
    '命运的齿轮开始转动',
    '总而言之',
    '不是……而是……'
  ],
  haptics: true,
  keepScreenOn: true
}

export interface AppSettings {
  version: number
  presets: PresetView[]
  stageModels: Record<string, string> // stage -> presetId
  config: AppConfig
}

export interface TestConnectionResult {
  ok: boolean
  latencyMs?: number
  model?: string
  error?: string
}

export interface FileEntry {
  name: string
  path: string
  type: 'file' | 'dir'
}

export interface ProjectInfo {
  id: string
  name: string
  genre: string
  targetWords: number
  createdAt: string
}

export interface ProjectBackup {
  format: 'novelflow-project-backup'
  version: 1
  project: Pick<ProjectInfo, 'name' | 'genre' | 'targetWords' | 'createdAt'>
  files: Record<string, string>
  exportedAt: string
}
