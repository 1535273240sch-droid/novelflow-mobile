import { useEffect, type ReactElement } from 'react'
import { useProjectStore } from './stores/project'
import { useSettingsStore } from './stores/settings'
import { useUiStore, type WorkTab } from './stores/ui'
import { ProjectPane } from './components/ProjectPane'
import { EditorPane } from './components/EditorPane'
import { TrialPane } from './components/TrialPane'
import { SettingsPage } from './components/SettingsPage'
import { Welcome } from './components/Welcome'
import { ToastContainer } from './components/common/Toast'
import { ErrorBoundary } from './components/common/ErrorBoundary'

const TAB_ITEMS: Array<{ key: WorkTab; label: string; icon: ReactElement }> = [
  {
    key: 'project',
    label: '项目',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
      </svg>
    )
  },
  {
    key: 'editor',
    label: '写作',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    )
  },
  {
    key: 'trial',
    label: '试写',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1m0-12.8l-2.1 2.1M7.7 16.3l-2.1 2.1" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
]

function BottomNav() {
  const tab = useUiStore((s) => s.tab)
  const setTab = useUiStore((s) => s.setTab)
  const project = useProjectStore((s) => s.project)
  return (
    <nav className="safe-bottom flex shrink-0 border-t border-slate-200 bg-white">
      {TAB_ITEMS.map((item) => {
        const active = tab === item.key
        return (
          <button
            key={item.key}
            onClick={() => {
              if (!project && item.key !== 'project') {
                useUiStore.getState().showToast('请先创建或打开项目')
                return
              }
              setTab(item.key)
            }}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 ${
              active ? 'text-blue-600' : 'text-slate-500'
            }`}
          >
            {item.icon}
            <span className={`text-xs ${active ? 'font-semibold' : ''}`}>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export default function App() {
  const project = useProjectStore((s) => s.project)
  const init = useProjectStore((s) => s.init)
  const loadSettings = useSettingsStore((s) => s.load)
  const tab = useUiStore((s) => s.tab)
  const settingsOpen = useUiStore((s) => s.settingsOpen)
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen)

  useEffect(() => {
    init()
    loadSettings()
  }, [init, loadSettings])

  return (
    <ErrorBoundary>
      <div className="flex h-full flex-col">
        {/* 顶栏（与桌面版同一视觉语言：白底、细分隔线、蓝色主操作） */}
        <header className="safe-top flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <span className="font-bold text-slate-800">NovelFlow</span>
            <span className="max-w-[50vw] truncate text-sm text-slate-500">
              {project ? project.name : '未打开项目'}
            </span>
          </div>
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="rounded border border-slate-300 px-3 py-1 text-sm active:bg-slate-100"
          >
            {settingsOpen ? '返回编辑器' : '设置'}
          </button>
        </header>

        {/* 主体 */}
        <main className="min-h-0 flex-1 overflow-hidden">
          {settingsOpen ? (
            <SettingsPage onBack={() => setSettingsOpen(false)} />
          ) : !project ? (
            <Welcome />
          ) : tab === 'project' ? (
            <ProjectPane />
          ) : tab === 'editor' ? (
            <EditorPane />
          ) : (
            <TrialPane />
          )}
        </main>

        {!settingsOpen && <BottomNav />}
        <ToastContainer />
      </div>
    </ErrorBoundary>
  )
}
