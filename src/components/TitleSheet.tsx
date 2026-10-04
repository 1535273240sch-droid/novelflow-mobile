import React, { useState } from 'react'
import { useProjectStore } from '../stores/project'
import { useUiStore } from '../stores/ui'
import type { TitleCandidate } from '../../packages/core/src/types'

export const TitleSheet: React.FC = () => {
  const isTitleSheetOpen = useProjectStore((s) => s.isTitleSheetOpen)
  const setTitleSheetOpen = useProjectStore((s) => s.setTitleSheetOpen)
  const currentProject = useProjectStore((s) => s.currentProject)
  const generateTitles = useProjectStore((s) => s.generateTitles)
  const updateCurrentProject = useProjectStore((s) => s.updateCurrentProject)
  const showToast = useUiStore((s) => s.showToast)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  if (!isTitleSheetOpen) return null

  const titles: TitleCandidate[] = currentProject?.titles || []

  const handleCopyTitle = async (t: TitleCandidate) => {
    try {
      await navigator.clipboard.writeText(t.title)
      if (window.navigator?.vibrate) window.navigator.vibrate(25)
      showToast(`已题签复制书名「${t.title}」`)
      // 顺便把当前项目名字设为此标题
      if (currentProject) {
        updateCurrentProject({ name: t.title })
      }
    } catch {
      showToast('复制失败')
    }
  }

  const handleStartEdit = (t: TitleCandidate, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(t.id)
    setEditText(t.title)
  }

  const handleSaveEdit = (t: TitleCandidate) => {
    if (!editText.trim()) return
    const updated = titles.map((item) =>
      item.id === t.id ? { ...item, title: editText.trim() } : item
    )
    updateCurrentProject({ titles: updated })
    setEditingId(null)
    showToast('书名已修改')
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="flex-1" onClick={() => setTitleSheetOpen(false)} />

      {/* 半屏抽屉 */}
      <div className="parchment-scroll max-h-[68vh] w-full rounded-t-2xl border-t-2 border-[var(--parchment-border-inner)] p-5 shadow-2xl flex flex-col safe-bottom">
        {/* 顶部标题与换一批操作 */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--parchment-border)]">
          <div className="flex items-center gap-2">
            <span className="seal-badge px-2 py-0.5 text-xs">题签</span>
            <span className="ink-title font-bold text-base text-[var(--ink-primary)]">
              题签金石 · 候选书名
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => generateTitles()}
              className="text-xs text-[var(--gold-accent)] font-semibold flex items-center gap-1 active:opacity-70 px-2 py-1 rounded bg-[rgba(163,121,44,0.1)] border border-[rgba(163,121,44,0.25)]"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
              另觅佳题
            </button>
            <button
              onClick={() => setTitleSheetOpen(false)}
              className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="py-2 text-xs text-[var(--ink-muted)] flex items-center justify-between">
          <span>点击书签即刻复制并定名 · 长按或点击笔形可自拟修改</span>
          <span className="text-[10px] text-[var(--gold-accent)]">共 {titles.length} 选</span>
        </div>

        {/* 8 个候选标题列表 */}
        <div className="flex-1 overflow-y-auto py-2 space-y-2.5 min-h-[220px]">
          {titles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <span className="seal-badge-outline px-3 py-1 text-xs mb-2">案头虚席</span>
              <p className="text-xs text-[var(--ink-secondary)]">正文尚未完成或尚未题签</p>
              <button
                onClick={() => generateTitles()}
                className="mt-3 parchment-btn-primary px-4 py-2 rounded-lg text-xs font-bold"
              >
                立即为全卷推演书名
              </button>
            </div>
          ) : (
            titles.map((t, index) => {
              const isEditing = editingId === t.id
              return (
                <div
                  key={t.id}
                  onClick={() => !isEditing && handleCopyTitle(t)}
                  className="parchment-box rounded-xl p-3 border border-[var(--parchment-border)] hover:border-[var(--gold-accent)] cursor-pointer transition-all active:scale-[0.99] flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="w-5 text-center text-xs font-bold text-[var(--ink-muted)]">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="h-8 px-2 rounded border border-[var(--parchment-border)] bg-[var(--parchment-bg)] text-sm flex-1"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(t)}
                            className="seal-badge px-2 py-1 text-xs"
                          >
                            存
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h4 className="ink-title font-bold text-sm text-[var(--ink-primary)] truncate">
                            {t.title}
                          </h4>
                          <span className="seal-badge-outline px-1.5 py-0.2 text-[10px] shrink-0">
                            {t.type}
                          </span>
                        </div>
                      )}
                      <p className="text-xs text-[var(--ink-secondary)] mt-0.5 truncate">
                        {t.pitch}
                      </p>
                    </div>
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-2 pl-2 shrink-0">
                      <button
                        onClick={(e) => handleStartEdit(t, e)}
                        className="p-1.5 text-[var(--ink-muted)] hover:text-[var(--gold-accent)] active:scale-95"
                        title="自拟修改"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <span className="seal-badge text-[10px] px-2 py-1 shadow-xs">
                        拓印
                      </span>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
