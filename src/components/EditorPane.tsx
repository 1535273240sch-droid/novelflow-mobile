import React, { useRef, useEffect, useState } from 'react'
import { useProjectStore } from '../stores/project'
import { useSettingsStore } from '../stores/settings'
import { useUiStore } from '../stores/ui'
import type { StageType } from '../../packages/core/src/types'

const STAGE_STEPS: Array<{ key: StageType; label: string; seal: string }> = [
  { key: 'framework', label: '立骨', seal: '骨' },
  { key: 'plan', label: '排篇', seal: '篇' },
  { key: 'draft', label: '挥毫', seal: '毫' },
  { key: 'typo', label: '校勘', seal: '校' },
  { key: 'deai', label: '洗墨', seal: '洗' },
  { key: 'polish', label: '点金', seal: '金' },
  { key: 'title', label: '题签', seal: '签' }
]

export const EditorPane: React.FC = () => {
  const currentProject = useProjectStore((s) => s.currentProject)
  const isGenerating = useProjectStore((s) => s.isGenerating)
  const streamText = useProjectStore((s) => s.streamText)
  const progress = useProjectStore((s) => s.progress)
  const runWorkflow = useProjectStore((s) => s.runWorkflow)
  const stopWorkflow = useProjectStore((s) => s.stopWorkflow)
  const copyFinalText = useProjectStore((s) => s.copyFinalText)
  const exportFinalText = useProjectStore((s) => s.exportFinalText)
  const setTitleSheetOpen = useProjectStore((s) => s.setTitleSheetOpen)
  const setWizardOpen = useProjectStore((s) => s.setWizardOpen)
  const setTab = useUiStore((s) => s.setTab)
  const showToast = useUiStore((s) => s.showToast)
  
  const settings = useSettingsStore((s) => s.settings)
  const setAppConfig = useSettingsStore((s) => s.setAppConfig)

  const [autoScroll, setAutoScroll] = useState(true)
  const [selectedChapterIdx, setSelectedChapterIdx] = useState<number>(-1) // -1 为全文定稿
  const streamContainerRef = useRef<HTMLDivElement>(null)

  // 字号映射
  const fontSizeClass = {
    small: 'text-xs leading-loose',
    medium: 'text-sm leading-loose',
    large: 'text-base leading-loose tracking-wide',
    xlarge: 'text-lg leading-loose tracking-wider'
  }[settings?.config?.fontSize || 'medium']

  // 流式生成自动滚动控制
  useEffect(() => {
    if (isGenerating && autoScroll && streamContainerRef.current) {
      streamContainerRef.current.scrollTop = streamContainerRef.current.scrollHeight
    }
  }, [streamText, isGenerating, autoScroll])

  const handleScroll = () => {
    if (!streamContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = streamContainerRef.current
    // 用户手动往上滑超过 60px 时暂停自动滚动
    if (scrollHeight - scrollTop - clientHeight > 60) {
      setAutoScroll(false)
    } else {
      setAutoScroll(true)
    }
  }

  // 如果没有打开的项目
  if (!currentProject) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center parchment-scroll">
        <div className="w-16 h-16 rounded-2xl border-2 border-[var(--gold-accent)] bg-[var(--parchment-card)] flex items-center justify-center shadow-lg mb-4">
          <span className="seal-badge w-10 h-10 text-xl font-bold">卷</span>
        </div>
        <h2 className="ink-title text-xl font-bold text-[var(--ink-primary)]">案头虚席 · 尚无卷册</h2>
        <p className="text-xs text-[var(--ink-secondary)] max-w-xs mt-2 leading-relaxed">
          “笔落惊风雨，诗成泣鬼神”<br />
          点选下方按钮，以六问开卷问策，由天工大模型全自动构筑长卷。
        </p>
        <div className="mt-6 flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => setWizardOpen(true)}
            className="h-12 rounded-xl parchment-btn-primary font-bold text-sm tracking-wider flex items-center justify-center gap-2 shadow-md"
          >
            <span className="seal-badge px-1.5 py-0.2 text-[10px]">始</span>
            开卷问策 · 创作新书
          </button>
          <button
            onClick={() => setTab('bookshelf')}
            className="h-11 rounded-xl parchment-btn text-xs text-[var(--ink-secondary)] font-medium"
          >
            前往藏书阁浏览已有卷册
          </button>
        </div>
      </div>
    )
  }

  const currentStageKey = progress?.stage || currentProject.currentStage || 'framework'
  const currentStageIndex = STAGE_STEPS.findIndex((s) => s.key === currentStageKey)
  const isFinalDone = !!currentProject.finalText

  return (
    <div className="h-full flex flex-col bg-[var(--parchment-bg)] select-none">
      {/* 顶部卷首信息栏 */}
      <div className="shrink-0 px-4 py-2.5 border-b border-[var(--parchment-border)] bg-[var(--parchment-card)] flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="seal-badge px-2 py-0.5 text-xs shrink-0">
            {currentProject.config.genre || '卷'}
          </span>
          <div className="min-w-0">
            <h3 className="ink-title text-sm font-bold truncate text-[var(--ink-primary)]">
              {currentProject.name}
            </h3>
            <p className="text-[10px] text-[var(--ink-muted)] truncate">
              主角：{currentProject.config.maleLead} · {currentProject.config.femaleLead} · {currentProject.config.style.join('/')}
            </p>
          </div>
        </div>

        {/* 字号与主题切换操作 */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              const sizes: Array<'small' | 'medium' | 'large' | 'xlarge'> = ['small', 'medium', 'large', 'xlarge']
              const cur = settings?.config?.fontSize || 'medium'
              const next = sizes[(sizes.indexOf(cur) + 1) % sizes.length]
              setAppConfig({ fontSize: next })
              showToast(`字号已切换为：${next}`)
            }}
            className="px-2 py-1 rounded parchment-btn text-xs font-serif"
            title="字号"
          >
            字
          </button>
          <button
            onClick={() => {
              const curTheme = settings?.config?.theme || 'parchment'
              const nextTheme = curTheme === 'parchment' ? 'dark' : 'parchment'
              setAppConfig({ theme: nextTheme })
              showToast(nextTheme === 'dark' ? '已入玄砚洒金夜' : '已换澄心羊皮卷')
            }}
            className="p-1.5 rounded parchment-btn text-xs"
            title="日夜主题"
          >
            {settings?.config?.theme === 'dark' ? '🌙' : '📜'}
          </button>
        </div>
      </div>

      {/* 阶段进度横向水墨圆点指示条 */}
      <div className="shrink-0 px-3 py-2 bg-[var(--parchment-bg-secondary)]/50 border-b border-[var(--parchment-border)] flex items-center justify-between">
        <div className="flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar">
          {STAGE_STEPS.map((st, idx) => {
            const isCurrent = st.key === currentStageKey
            const isPassed = currentStageIndex > idx || (isFinalDone && !isGenerating)
            return (
              <div key={st.key} className="flex items-center gap-1 shrink-0">
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] transition-all ${
                    isCurrent
                      ? 'bg-[var(--seal-vermilion)] text-white font-bold ring-2 ring-[var(--gold-glow)]'
                      : isPassed
                      ? 'bg-[rgba(163,121,44,0.15)] text-[var(--gold-accent)] font-semibold'
                      : 'text-[var(--ink-muted)] opacity-60'
                  }`}
                >
                  <span className="text-[9px]">{st.seal}</span>
                  <span>{st.label}</span>
                </div>
                {idx < STAGE_STEPS.length - 1 && (
                  <span className="text-[var(--parchment-border)] text-xs">›</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 生成中提示栏 */}
      {isGenerating && progress && (
        <div className="shrink-0 px-4 py-1.5 bg-[rgba(168,46,34,0.06)] border-b border-[rgba(168,46,34,0.2)] flex items-center justify-between text-xs animate-pulse">
          <div className="flex items-center gap-2 truncate">
            <span className="seal-badge px-1.5 py-0.2 text-[9px]">天工</span>
            <span className="text-[var(--seal-vermilion)] font-medium truncate">
              {progress.message}
            </span>
          </div>
          <span className="text-[10px] text-[var(--gold-accent)] font-bold shrink-0">
            {progress.percentage}%
          </span>
        </div>
      )}

      {/* 核心内容视窗 */}
      <div
        ref={streamContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 parchment-scroll select-text relative"
      >
        {isGenerating ? (
          /* 流式生成实时渲染态 */
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--parchment-border)]">
              <span className="text-xs text-[var(--gold-accent)] flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--seal-vermilion)] animate-ping" />
                正在实时泼墨挥毫 · 节流渲染中
              </span>
              {!autoScroll && (
                <button
                  onClick={() => setAutoScroll(true)}
                  className="seal-badge-outline px-2 py-0.5 text-[10px]"
                >
                  回到底部
                </button>
              )}
            </div>
            <div className={`font-serif text-[var(--ink-primary)] whitespace-pre-wrap ${fontSizeClass}`}>
              {streamText || '文思激荡，神念推演中，文字即将跃然纸上...'}
            </div>
          </div>
        ) : isFinalDone ? (
          /* 正文定稿完成态（线装书式排版） */
          <div className="max-w-2xl mx-auto pb-20">
            {/* 章节切换便签条 */}
            {currentProject.chapters.length > 0 && (
              <div className="flex items-center gap-1.5 pb-3 mb-3 border-b border-[var(--parchment-border)] overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setSelectedChapterIdx(-1)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium shrink-0 transition-all ${
                    selectedChapterIdx === -1
                      ? 'parchment-btn-primary font-bold'
                      : 'parchment-btn text-[var(--ink-secondary)]'
                  }`}
                >
                  全书定稿 ({currentProject.finalText?.length || 0}字)
                </button>
                {currentProject.chapters.map((c, i) => (
                  <button
                    key={c.index}
                    onClick={() => setSelectedChapterIdx(i)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium shrink-0 transition-all ${
                      selectedChapterIdx === i
                        ? 'parchment-btn-primary font-bold'
                        : 'parchment-btn text-[var(--ink-secondary)]'
                    }`}
                  >
                    {c.title || `第${i + 1}章`}
                  </button>
                ))}
              </div>
            )}

            {/* 正文文本呈现 */}
            <div className="parchment-border-classical p-5 rounded-2xl bg-[var(--parchment-card)] shadow-md">
              <div className="text-center pb-4 mb-4 border-b border-[var(--parchment-border)]">
                <h2 className="ink-title text-xl font-bold text-[var(--ink-primary)] tracking-wide">
                  {selectedChapterIdx === -1
                    ? currentProject.name
                    : currentProject.chapters[selectedChapterIdx]?.title}
                </h2>
                <div className="mt-1 flex items-center justify-center gap-2 text-xs text-[var(--ink-muted)]">
                  <span>{currentProject.config.genre}</span>
                  <span>·</span>
                  <span>{currentProject.config.style.join('、')}</span>
                  <span>·</span>
                  <span className="seal-badge-outline text-[10px] px-1 py-0.2">定稿纯正</span>
                </div>
              </div>

              <div className={`font-serif text-[var(--ink-primary)] whitespace-pre-wrap ${fontSizeClass}`}>
                {selectedChapterIdx === -1
                  ? currentProject.finalText
                  : currentProject.chapters[selectedChapterIdx]?.polished ||
                    currentProject.chapters[selectedChapterIdx]?.deai ||
                    currentProject.chapters[selectedChapterIdx]?.typoFixed ||
                    currentProject.chapters[selectedChapterIdx]?.draft ||
                    '本章正文未就绪'}
              </div>

              <div className="mt-8 pt-4 border-t border-[var(--parchment-border)] text-center text-xs text-[var(--ink-muted)]">
                “墨染千秋卷，纸载万卷书” · 纯正文本无杂质
              </div>
            </div>
          </div>
        ) : (
          /* 初建项目未跑完态（提示继续跑） */
          <div className="max-w-md mx-auto py-10 text-center">
            <span className="seal-badge px-3 py-1 text-xs mb-3">待启</span>
            <h3 className="ink-title text-base font-bold text-[var(--ink-primary)]">
              长卷已立，等待天工推演
            </h3>
            <p className="text-xs text-[var(--ink-secondary)] mt-2 leading-relaxed">
              设定已录入：题材【{currentProject.config.genre}】、风格【
              {currentProject.config.style.join('/')}】、男主【
              {currentProject.config.maleLead}】、女主【{currentProject.config.femaleLead}】。
            </p>
            <button
              onClick={() => runWorkflow()}
              className="mt-5 parchment-btn-primary px-6 py-3 rounded-xl font-bold text-sm tracking-wide shadow-md"
            >
              一键开启全套工作流（框架→润色）
            </button>
          </div>
        )}
      </div>

      {/* 底部固定操作栏（根据是否在生成中显示不同状态） */}
      <div className="shrink-0 p-3 bg-[var(--parchment-card)] border-t border-[var(--parchment-border)] safe-bottom shadow-lg">
        {isGenerating ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => stopWorkflow()}
              className="flex-1 h-12 rounded-xl parchment-btn text-sm font-bold text-[var(--seal-vermilion)] border-[var(--seal-vermilion)]/40 flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <span className="inline-block w-2.5 h-2.5 bg-[var(--seal-vermilion)] rounded-xs" />
              收笔驻留（中止并存盘）
            </button>
          </div>
        ) : isFinalDone ? (
          <div className="flex items-center gap-2.5">
            {/* 一键纯文拓印（复制全文） */}
            <button
              onClick={() => copyFinalText()}
              className="flex-2 h-12 rounded-xl parchment-btn-primary text-sm font-bold tracking-wide flex items-center justify-center gap-2 shadow-md active:scale-[0.99]"
            >
              <span className="seal-badge text-[10px] px-1 py-0.2 bg-white/20 border-white/40">拓</span>
              复制全文纯文本
            </button>

            {/* 题签（标题小窗口） */}
            <button
              onClick={() => setTitleSheetOpen(true)}
              className="flex-1 h-12 rounded-xl parchment-btn text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.99]"
            >
              <svg className="w-4 h-4 text-[var(--gold-accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              题签小窗
            </button>

            {/* 导出典籍 TXT */}
            <button
              onClick={() => exportFinalText()}
              className="w-12 h-12 rounded-xl parchment-btn flex items-center justify-center text-[var(--ink-secondary)] active:scale-[0.99]"
              title="导出TXT"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => runWorkflow()}
              className="flex-1 h-12 rounded-xl parchment-btn-primary font-bold text-sm tracking-wider flex items-center justify-center gap-2 shadow-md"
            >
              <span>继续执笔推进（断点续写）</span>
              <span>➜</span>
            </button>
          </div>
        )}
      </div>

      {/* 悬浮朱砂印章小按钮（随时召出标题抽屉） */}
      {isFinalDone && !isGenerating && (
        <button
          onClick={() => setTitleSheetOpen(true)}
          className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full seal-badge shadow-xl flex items-center justify-center text-sm font-bold active:scale-95 transition-transform"
          title="题签候选"
        >
          签
        </button>
      )}
    </div>
  )
}
