import {
  DEFAULT_APP_CONFIG,
  DEMO_PRESET_ID,
  type AppConfig,
  type AppSettings,
  type PresetInput,
  type PresetView,
  type Protocol
} from '../shared/types'
import { maskKey } from '../lib/llm/redact'

const LS_SETTINGS = 'novelflow:settings'

export interface StoredPreset {
  id: string
  name: string
  protocol: Protocol
  baseUrl: string
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
  stageModels: Record<string, string>
  config: AppConfig
}

function defaultSettings(): SettingsFile {
  return {
    version: 1,
    presets: [],
    stageModels: {
      framework: DEMO_PRESET_ID,
      plan: DEMO_PRESET_ID,
      draft: DEMO_PRESET_ID,
      typo: DEMO_PRESET_ID,
      deai: DEMO_PRESET_ID,
      polish: DEMO_PRESET_ID,
      title: DEMO_PRESET_ID
    },
    config: { ...DEFAULT_APP_CONFIG }
  }
}

function load(): SettingsFile {
  try {
    const raw = localStorage.getItem(LS_SETTINGS)
    if (!raw) return defaultSettings()
    const data = JSON.parse(raw) as SettingsFile
    if (!Array.isArray(data.presets)) data.presets = []
    data.config = { ...DEFAULT_APP_CONFIG, ...data.config }
    data.stageModels = { ...defaultSettings().stageModels, ...(data.stageModels || {}) }
    return data
  } catch {
    return defaultSettings()
  }
}

function persist(data: SettingsFile): void {
  localStorage.setItem(LS_SETTINGS, JSON.stringify(data))
}

const sessionKeys = new Map<string, string>()

function newPresetId(): string {
  return `preset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function demoPresetView(): PresetView {
  return {
    id: DEMO_PRESET_ID,
    name: '古墨天工模拟（离线演示免Key）',
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
    stageModels: { ...d.stageModels },
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
  for (const st of Object.keys(d.stageModels)) {
    if (d.stageModels[st] === id) {
      d.stageModels[st] = DEMO_PRESET_ID
    }
  }
  persist(d)
}

export function setStageModels(stageModels: Record<string, string>): void {
  const d = load()
  d.stageModels = { ...stageModels }
  persist(d)
}

export function setAppConfig(patch: Partial<AppConfig>): AppConfig {
  const d = load()
  d.config = { ...d.config, ...patch }
  if (d.config.concurrencyLimit < 1) d.config.concurrencyLimit = 1
  persist(d)
  return { ...d.config }
}

export function getCredentials(presetId: string): any {
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

export const SECURITY_NOTE =
  '密钥加密保存在本地设备存储中，调用时直接经端到端通信（不经过任何第三方中转），保证纯净安全。'
