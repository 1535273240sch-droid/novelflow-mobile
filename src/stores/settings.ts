import { create } from 'zustand'
import type { AppConfig, AppSettings, PresetInput, RoleMapping } from '../shared/types'
import {
  deletePreset as svcDeletePreset,
  getSettings as svcGetSettings,
  setAppConfig as svcSetAppConfig,
  setRoles as svcSetRoles,
  upsertPreset as svcUpsertPreset
} from '../services/settings-store'
import { llm } from '../lib/llm/service'

interface SettingsState {
  settings: AppSettings | null
  load: () => void
  savePreset: (input: PresetInput) => PresetView2
  deletePreset: (id: string) => void
  setRoles: (roles: RoleMapping) => void
  setAppConfig: (patch: Partial<AppConfig>) => void
}

type PresetView2 = ReturnType<typeof svcGetSettings>['presets'][number]

/** 保存性能配置时同步 LLM 调用层（并发上限 / 节流） */
function applyLlmConfig(config: AppConfig): void {
  llm.updateConfig({ concurrencyLimit: config.concurrencyLimit, throttleMs: config.streamThrottleMs })
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  load: () => {
    const settings = svcGetSettings()
    if (settings.config) applyLlmConfig(settings.config)
    set({ settings })
  },
  savePreset: (input) => {
    const view = svcUpsertPreset(input)
    get().load()
    return view
  },
  deletePreset: (id) => {
    svcDeletePreset(id)
    get().load()
  },
  setRoles: (roles) => {
    svcSetRoles(roles)
    get().load()
  },
  setAppConfig: (patch) => {
    const config = svcSetAppConfig(patch)
    applyLlmConfig(config)
    get().load()
  }
}))
