import { create } from 'zustand'
import type { AppConfig, AppSettings, PresetInput } from '../shared/types'
import {
  deletePreset as svcDeletePreset,
  getSettings as svcGetSettings,
  setAppConfig as svcSetAppConfig,
  setStageModels as svcSetStageModels,
  upsertPreset as svcUpsertPreset
} from '../services/settings-store'
import { llm } from '../lib/llm/service'

interface SettingsState {
  settings: AppSettings | null
  load: () => void
  savePreset: (input: PresetInput) => any
  deletePreset: (id: string) => void
  setStageModels: (models: Record<string, string>) => void
  setAppConfig: (patch: Partial<AppConfig>) => void
}

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
  setStageModels: (models) => {
    svcSetStageModels(models)
    get().load()
  },
  setAppConfig: (patch) => {
    const config = svcSetAppConfig(patch)
    applyLlmConfig(config)
    get().load()
  }
}))
