import { useEffect } from 'react'
import { countChars, useProjectStore } from '../stores/project'
import { useSettingsStore } from '../stores/settings'
import { useUiStore } from '../stores/ui'

/** 复制文本：优先 Clipboard API，WebView 内降级 execCommand */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

/**
 * 编辑器页：按章加载（不整书载入）、自动保存、一键复制（提示「已复制 N 字」）。
 * 与桌面版 EditorPane 同布局：标题栏 / 编辑区 / 状态栏。
 */
export function EditorPane() {
  const content = useProjectStore((s) => s.content)
  const currentPath = useProjectStore((s) => s.currentPath)
  const currentTitle = useProjectStore((s) => s.currentTitle)
  const dirty = useProjectStore((s) => s.dirty)
  const saving = useProjectStore((s) => s.saving)
  const lastSavedAt = useProjectStore((s) => s.lastSavedAt)
  const streamStatus = useProjectStore((s) => s.streamStatus)
  const setContent = useProjectStore((s) => s.setContent)
  const saveNow = useProjectStore((s) => s.saveNow)
  const showToast = useUiStore((s) => s.showToast)
  const setTab = useUiStore((s) => s.setTab)
  const autoSaveMs = useSettingsStore((s) => s.settings?.config.autoSaveMs ?? 3500)

  // 自动保存：默认 3.5 秒（可在设置中调整）；卸载前兜底保存
  useEffect(() => {
    const timer = setInterval(() => {
      saveNow()
    }, autoSaveMs)
    return () => {
      clearInterval(timer)
      saveNow()
    }
  }, [autoSaveMs, saveNow])

  const onCopy = async () => {
    if (!content) {
      showToast('当前内容为空，未复制')
      return
    }
    const ok = await copyText(content)
    showToast(ok ? `已复制 ${countChars(content)} 字` : '复制失败：当前环境不支持剪贴板')
  }

  const onManualSave = () => {
    const saved = saveNow()
    if (saved) showToast('已保存')
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-slate-800">
            {currentTitle || '未打开文件'}
          </span>
          {dirty && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" title="有未保存修改" />}
          {streamStatus === 'streaming' && (
            <span className="shrink-0 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">流式生成中…</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={onManualSave}
            disabled={!currentPath}
            className="rounded border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 active:bg-slate-100 disabled:opacity-40"
          >
            {saving ? '保存中…' : '保存'}
          </button>
          <button
            onClick={() => void onCopy()}
            disabled={!currentPath}
            className="rounded bg-slate-800 px-2.5 py-1.5 text-xs text-white active:bg-slate-700 disabled:opacity-40"
          >
            复制全文
          </button>
          <button
            onClick={() => setTab('trial')}
            className="rounded bg-blue-600 px-2.5 py-1.5 text-xs text-white active:bg-blue-500"
          >
            试写
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {currentPath ? (
          <div className="nf-editor">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
              placeholder="开始写作…"
            />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
            <p className="text-sm text-slate-500">尚未打开文件</p>
            <p className="text-xs text-slate-400">到「项目」页打开或新建一个章节即可开始写作</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 border-t border-slate-200 px-3 py-1.5 text-xs text-slate-500">
        <span className="max-w-full truncate">{currentPath ?? '—'}</span>
        <div className="flex items-center gap-3">
          <span>字数：{countChars(content)}</span>
          <span>自动保存：{Math.round(autoSaveMs / 1000)} 秒</span>
          <span>{lastSavedAt ? `上次保存 ${lastSavedAt}` : '尚未保存'}</span>
        </div>
      </div>
    </div>
  )
}
