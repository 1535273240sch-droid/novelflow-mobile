import { useEffect, type ReactElement } from 'react'
import { useProjectStore } from './stores/project'
import { useSettingsStore } from './stores/settings'
import { useUiStore, type MainTab } from './stores/ui'
import { EditorPane } from './components/EditorPane'
import { BookshelfPane } from './components/BookshelfPane'
import { SettingsPage } from './components/SettingsPage'
import { WizardBottomSheet } from './components/WizardBottomSheet'
import { TitleSheet } from './components/TitleSheet'
import { ToastContainer } from './components/common/Toast'
import { ErrorBoundary } from './components/common/ErrorBoundary'

const NAV_TABS: Array<{ key: MainTab; label: string; seal: string; icon: ReactElement }> = [
  {
    key: 'editor',
    label: '写作',
    seal: '写',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    )
  },
  {
    key: 'bookshelf',
    label: '书架',
    seal: '阁',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="M9 7h6M9 11h4" />
      </svg>
    )
  },
  {
    key: 'settings',
    label: '设置',
    seal: '工',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    )
  }
]

function AncientBottomNav() {
  const tab = useUiStore((s) => s.tab)
  const setTab = useUiStore((s) => s.setTab)

  return (
    <nav className="safe-bottom flex shrink-0 border-t border-[var(--parchment-border)] bg-[var(--parchment-card)] shadow-lg">
      {NAV_TABS.map((item) => {
        const active = tab === item.key
        return (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`flex flex-1 flex-col items-center justify-center py-2 min-h-[52px] transition-all relative ${
              active ? 'text-[var(--seal-vermilion)]' : 'text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]'
            }`}
          >
            {active && (
              <span className="absolute top-0 w-8 h-[2px] bg-[var(--seal-vermilion)] rounded-full" />
            )}
            <div className="relative">
              {item.icon}
            </div>
            <span className={`text-[11px] mt-0.5 tracking-wider ${active ? 'font-bold ink-title' : 'font-normal'}`}>
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

export default function App() {
  const initProject = useProjectStore((s) => s.init)
  const loadSettings = useSettingsStore((s) => s.load)
  const settings = useSettingsStore((s) => s.settings)
  const tab = useUiStore((s) => s.tab)

  useEffect(() => {
    initProject()
    loadSettings()
  }, [initProject, loadSettings])

  // 动态同步古风日夜主题
  useEffect(() => {
    if (settings?.config?.theme === 'dark') {
      document.documentElement.classList.add('theme-dark')
    } else {
      document.documentElement.classList.remove('theme-dark')
    }
  }, [settings?.config?.theme])

  return (
    <ErrorBoundary>
      <div className="flex h-full flex-col overflow-hidden bg-[var(--parchment-bg)] select-none">
        {/* 古墨雅韵顶栏 */}
        <header className="safe-top shrink-0 flex items-center justify-between border-b border-[var(--parchment-border)] bg-[var(--parchment-card)] px-4 py-2 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="seal-badge w-6 h-6 text-xs font-bold shadow-xs">墨</span>
            <div className="flex flex-col">
              <span className="ink-title font-extrabold text-sm tracking-wide text-[var(--ink-primary)]">
                NovelFlow · 古墨长卷
              </span>
              <span className="text-[9px] text-[var(--ink-muted)] tracking-wider">
                小说工作流流水线 · 手机端
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="seal-badge-outline text-[10px] px-1.5 py-0.5 font-serif">
              {tab === 'editor' ? '卷房' : tab === 'bookshelf' ? '书阁' : '天工'}
            </span>
          </div>
        </header>

        {/* 主视窗主体 */}
        <main className="min-h-0 flex-1 overflow-hidden relative">
          {tab === 'editor' && <EditorPane />}
          {tab === 'bookshelf' && <BookshelfPane />}
          {tab === 'settings' && <SettingsPage />}
        </main>

        {/* 底部导航 */}
        <AncientBottomNav />

        {/* 6 步向导弹窗 */}
        <WizardBottomSheet />

        {/* 8 候选标题小窗口抽屉 */}
        <TitleSheet />

        {/* 全局 Toast 提示 */}
        <ToastContainer />
      </div>
    </ErrorBoundary>
  )
}
