import { create } from 'zustand'

export interface ToastItem {
  id: number
  text: string
}

export type MainTab = 'editor' | 'bookshelf' | 'settings'

interface UiState {
  toasts: ToastItem[]
  tab: MainTab
  showToast: (text: string) => void
  dismiss: (id: number) => void
  setTab: (tab: MainTab) => void
}

let nextId = 1

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  tab: 'editor',
  showToast: (text) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, text }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 2800)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setTab: (tab) => set({ tab })
}))
