import { create } from 'zustand'

export interface ToastItem {
  id: number
  text: string
}

export type WorkTab = 'project' | 'editor' | 'trial'

/** 项目页底部弹层：新建 / 切换 / 导入 */
export type ProjectSheet = 'none' | 'create' | 'switch' | 'import'

interface UiState {
  toasts: ToastItem[]
  tab: WorkTab
  settingsOpen: boolean
  projectSheet: ProjectSheet
  showToast: (text: string) => void
  dismiss: (id: number) => void
  setTab: (tab: WorkTab) => void
  setSettingsOpen: (open: boolean) => void
  setProjectSheet: (sheet: ProjectSheet) => void
}

let nextId = 1

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  tab: 'project',
  settingsOpen: false,
  projectSheet: 'none',
  showToast: (text) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, text }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 2600)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setTab: (tab) => set({ tab }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setProjectSheet: (sheet) => set({ projectSheet: sheet })
}))
