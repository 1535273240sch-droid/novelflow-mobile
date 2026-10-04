import React from 'react'
import { useProjectStore } from '../stores/project'
import { useUiStore } from '../stores/ui'

export const BookshelfPane: React.FC = () => {
  const projectList = useProjectStore((s) => s.projectList)
  const currentProject = useProjectStore((s) => s.currentProject)
  const openProject = useProjectStore((s) => s.openProject)
  const deleteProject = useProjectStore((s) => s.deleteProject)
  const setWizardOpen = useProjectStore((s) => s.setWizardOpen)
  const setTab = useUiStore((s) => s.setTab)
  const showToast = useUiStore((s) => s.showToast)

  const handleSelect = (id: string) => {
    openProject(id)
    setTab('editor')
    showToast('已展开卷册')
  }

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm(`确定要封存并抹除卷册「${name}」吗？`)) {
      deleteProject(id)
    }
  }

  return (
    <div className="h-full flex flex-col bg-[var(--parchment-bg)] select-none">
      {/* 顶部阁名与引言 */}
      <div className="shrink-0 px-4 py-3 border-b border-[var(--parchment-border)] bg-[var(--parchment-card)] flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <span className="seal-badge px-2 py-0.5 text-xs">藏阁</span>
          <h2 className="ink-title text-base font-bold text-[var(--ink-primary)]">
            文澜书阁 · 万卷藏珍
          </h2>
        </div>
        <button
          onClick={() => setWizardOpen(true)}
          className="parchment-btn-primary px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
        >
          <span>+</span>
          <span>新立长卷</span>
        </button>
      </div>

      {/* 书卷列表 */}
      <div className="flex-1 overflow-y-auto p-4 parchment-scroll space-y-3 pb-24">
        {projectList.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-20 text-center">
            <span className="seal-badge-outline px-3 py-1 text-xs mb-3">书斋空阔</span>
            <p className="ink-title text-sm font-semibold text-[var(--ink-secondary)]">
              尚无藏书入阁
            </p>
            <p className="text-xs text-[var(--ink-muted)] mt-1 max-w-xs">
              “白纸千般意，墨香自此生”<br />
              随时轻点右上角「新立长卷」，开启属于你的传奇。
            </p>
            <button
              onClick={() => setWizardOpen(true)}
              className="mt-6 parchment-btn-primary px-5 py-2.5 rounded-xl text-xs font-bold shadow-md"
            >
              立刻开卷创作
            </button>
          </div>
        ) : (
          projectList.map((p) => {
            const isCurrent = currentProject?.id === p.id
            const dateStr = new Date(p.createdAt).toLocaleDateString('zh-CN')

            return (
              <div
                key={p.id}
                onClick={() => handleSelect(p.id)}
                className={`parchment-box rounded-xl p-4 border transition-all cursor-pointer active:scale-[0.99] ${
                  isCurrent
                    ? 'border-[var(--seal-vermilion)] ring-1 ring-[var(--seal-vermilion)]/30 bg-[var(--parchment-card)]'
                    : 'border-[var(--parchment-border)] hover:border-[var(--gold-accent)]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="seal-badge text-[11px] px-2 py-0.5 shrink-0">
                      {p.genre || '卷'}
                    </span>
                    <h3 className="ink-title font-bold text-base text-[var(--ink-primary)] truncate">
                      {p.name}
                    </h3>
                    {isCurrent && (
                      <span className="text-[10px] text-[var(--seal-vermilion)] border border-[var(--seal-vermilion)] px-1 rounded-xs">
                        研读中
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => handleDelete(p.id, p.name, e)}
                    className="p-1 text-[var(--ink-muted)] hover:text-[var(--seal-vermilion)] active:scale-95"
                    title="封存抹除"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-[var(--ink-secondary)] pt-2 border-t border-[var(--parchment-border)]/60">
                  <span className="text-[11px] text-[var(--ink-muted)]">建卷于：{dateStr}</span>
                  <span className="text-[var(--gold-accent)] font-medium flex items-center gap-1">
                    <span>展开研读</span>
                    <span>›</span>
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
