import React, { useState } from 'react'
import { useProjectStore } from '../stores/project'
import type { NovelGenre, NovelLength, NovelStyle, StoryConfig } from '../../packages/core/src/types'

const GENRE_OPTIONS: NovelGenre[] = [
  '都市',
  '玄幻',
  '仙侠',
  '言情',
  '悬疑',
  '科幻',
  '历史',
  '末世',
  '校园'
]

const STYLE_OPTIONS: NovelStyle[] = [
  '轻松幽默',
  '热血爽文',
  '细腻文艺',
  '暗黑压抑',
  '甜宠',
  '烧脑反转'
]

const LENGTH_OPTIONS: Array<{ key: NovelLength; label: string; desc: string }> = [
  { key: 'short', label: '短篇长卷', desc: '约 3000 字 · 节奏明快·一气呵成' },
  { key: 'medium', label: '中篇佳作', desc: '约 10000 字 · 冲突丰满·跌宕起伏' },
  { key: 'chapters', label: '连载巨著', desc: '按章节展开 · 每章约 2000 字' }
]

const RANDOM_NAMES = {
  male: ['林沉', '谢昭', '陆行舟', '顾云深', '沈听澜', '裴寂', '楚怀风', '萧墨寒'],
  female: ['苏晚', '沈清辞', '姜黎', '温寄柔', '虞听雨', '许青黛', '顾朝颜', '云舒']
}

export const WizardBottomSheet: React.FC = () => {
  const isWizardOpen = useProjectStore((s) => s.isWizardOpen)
  const setWizardOpen = useProjectStore((s) => s.setWizardOpen)
  const createProjectWithConfig = useProjectStore((s) => s.createProjectWithConfig)
  const runWorkflow = useProjectStore((s) => s.runWorkflow)

  const [step, setStep] = useState<number>(1)
  const [genre, setGenre] = useState<NovelGenre>('都市')
  const [customGenre, setCustomGenre] = useState('')
  const [selectedStyles, setSelectedStyles] = useState<NovelStyle[]>(['轻松幽默'])
  const [maleLead, setMaleLead] = useState('林沉')
  const [femaleLead, setFemaleLead] = useState('苏晚')
  const [idea, setIdea] = useState('')
  const [length, setLength] = useState<NovelLength>('short')

  if (!isWizardOpen) return null

  const handleNext = () => {
    if (step < 6) {
      setStep(step + 1)
    } else {
      finishAndLaunch()
    }
  }

  const handleSkip = () => {
    if (step === 1 && !genre) setGenre('都市')
    if (step === 2 && selectedStyles.length === 0) setSelectedStyles(['轻松幽默'])
    if (step === 3 && !maleLead) setMaleLead('林沉')
    if (step === 4 && !femaleLead) setFemaleLead('苏晚')
    if (step === 6 && !length) setLength('short')

    if (step < 6) {
      setStep(step + 1)
    } else {
      finishAndLaunch()
    }
  }

  const finishAndLaunch = () => {
    const finalGenre = customGenre.trim() || genre
    const config: StoryConfig = {
      id: `story_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: `${finalGenre}卷·${maleLead || '林沉'}记`,
      genre: finalGenre,
      style: selectedStyles.length > 0 ? selectedStyles : ['轻松幽默'],
      maleLead: maleLead.trim() || '林沉',
      femaleLead: femaleLead.trim() || '苏晚',
      idea: idea.trim() || undefined,
      length,
      createdAt: Date.now()
    }

    createProjectWithConfig(config)
    setStep(1)
    // 立即启动生成流水线
    setTimeout(() => {
      runWorkflow()
    }, 250)
  }

  const toggleStyle = (st: NovelStyle) => {
    if (selectedStyles.includes(st)) {
      if (selectedStyles.length > 1) {
        setSelectedStyles(selectedStyles.filter((s) => s !== st))
      }
    } else {
      setSelectedStyles([...selectedStyles, st])
    }
  }

  const pickRandomMale = () => {
    const pool = RANDOM_NAMES.male
    const r = pool[Math.floor(Math.random() * pool.length)]
    setMaleLead(r)
  }

  const pickRandomFemale = () => {
    const pool = RANDOM_NAMES.female
    const r = pool[Math.floor(Math.random() * pool.length)]
    setFemaleLead(r)
  }

  const stepTitles = [
    '开卷定界 · 题材类型',
    '定韵调风 · 笔法风格',
    '点将点墨 · 男主尊名',
    '顾盼生姿 · 女主芳名',
    '神思机杼 · 核心念头',
    '排篇立册 · 鸿篇篇幅'
  ]

  const stepSubtitles = [
    '万象世界，从何而始？请择定小说的核心天地。',
    '行文走笔，情致几何？多选或单选皆可。',
    '谁立狂澜，谁主沉浮？留空则由 AI 赐名。',
    '月华倾泻，佳人何名？留空则由 AI 赐名。',
    '一句话或几个关键词，供天工推演（可选）。',
    '短小精悍，亦或连绵万字？'
  ]

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in">
      {/* 遮罩点击关闭 */}
      <div className="flex-1" onClick={() => setWizardOpen(false)} />

      {/* 抽屉主体 */}
      <div className="parchment-scroll max-h-[85vh] w-full rounded-t-2xl border-t-2 border-[var(--parchment-border-inner)] p-5 shadow-2xl flex flex-col safe-bottom">
        {/* 顶部把手与诗词引言 */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--parchment-border)]">
          <div className="flex items-center gap-2">
            <span className="seal-badge px-2 py-0.5 text-xs">问策</span>
            <span className="text-xs tracking-wider text-[var(--ink-secondary)]">
              胸中罗万象 · 笔底起风雷
            </span>
          </div>
          <button
            onClick={() => setWizardOpen(false)}
            className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 6 步流金进度点 */}
        <div className="flex items-center justify-between py-3 px-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-1">
              <div
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-7 bg-[var(--seal-vermilion)] ring-2 ring-[var(--gold-glow)]'
                    : i < step
                    ? 'w-2.5 bg-[var(--gold-accent)]'
                    : 'w-2.5 bg-[var(--parchment-border)]'
                }`}
              />
            </div>
          ))}
        </div>

        {/* 标题 */}
        <div className="mt-1 mb-4">
          <h2 className="ink-title text-lg font-bold text-[var(--ink-primary)]">
            {stepTitles[step - 1]}
          </h2>
          <p className="text-xs text-[var(--ink-muted)] mt-0.5">
            {stepSubtitles[step - 1]}
          </p>
        </div>

        {/* 动态步骤内容 */}
        <div className="flex-1 overflow-y-auto py-2 min-h-[180px]">
          {/* 第 1 步：题材类型 */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2.5">
                {GENRE_OPTIONS.map((g) => {
                  const isSelected = genre === g && !customGenre
                  return (
                    <button
                      key={g}
                      onClick={() => {
                        setGenre(g)
                        setCustomGenre('')
                      }}
                      className={`h-12 rounded-lg border text-sm font-medium transition-all ${
                        isSelected
                          ? 'parchment-btn-primary font-bold shadow-md'
                          : 'parchment-btn text-[var(--ink-primary)] hover:border-[var(--parchment-border-inner)]'
                      }`}
                    >
                      {g}
                    </button>
                  )
                })}
              </div>
              <div className="pt-2">
                <input
                  type="text"
                  placeholder="或自填题材（如：诡异修仙、无限流等）"
                  value={customGenre}
                  onChange={(e) => setCustomGenre(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-[var(--parchment-border)] bg-[var(--parchment-card)] text-sm text-[var(--ink-primary)] outline-none focus:border-[var(--gold-accent)]"
                />
              </div>
            </div>
          )}

          {/* 第 2 步：风格选择 */}
          {step === 2 && (
            <div className="grid grid-cols-2 gap-2.5">
              {STYLE_OPTIONS.map((st) => {
                const isSelected = selectedStyles.includes(st)
                return (
                  <button
                    key={st}
                    onClick={() => toggleStyle(st)}
                    className={`h-12 rounded-lg border text-sm font-medium flex items-center justify-between px-3 transition-all ${
                      isSelected
                        ? 'parchment-btn-primary font-bold'
                        : 'parchment-btn text-[var(--ink-primary)]'
                    }`}
                  >
                    <span>{st}</span>
                    {isSelected && (
                      <span className="text-xs bg-white/20 rounded-full px-1.5 py-0.2">✓</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* 第 3 步：男主尊名 */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={maleLead}
                  onChange={(e) => setMaleLead(e.target.value)}
                  placeholder="留空则由天工AI推演起名（默认：林沉）"
                  className="w-full h-12 px-4 rounded-lg border border-[var(--parchment-border)] bg-[var(--parchment-card)] text-[var(--ink-primary)] text-base font-medium outline-none focus:border-[var(--gold-accent)]"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-[var(--ink-muted)]">建议：简洁有辨识度</span>
                <button
                  type="button"
                  onClick={pickRandomMale}
                  className="text-xs flex items-center gap-1 text-[var(--gold-accent)] hover:underline active:opacity-70"
                >
                  <span className="seal-badge-outline px-1.5 py-0.5 text-[10px]">掷卦</span>
                  妙赐雅名
                </button>
              </div>
            </div>
          )}

          {/* 第 4 步：女主芳名 */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={femaleLead}
                  onChange={(e) => setFemaleLead(e.target.value)}
                  placeholder="留空则由天工AI推演起名（默认：苏晚）"
                  className="w-full h-12 px-4 rounded-lg border border-[var(--parchment-border)] bg-[var(--parchment-card)] text-[var(--ink-primary)] text-base font-medium outline-none focus:border-[var(--gold-accent)]"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-[var(--ink-muted)]">建议：灵动富意境</span>
                <button
                  type="button"
                  onClick={pickRandomFemale}
                  className="text-xs flex items-center gap-1 text-[var(--gold-accent)] hover:underline active:opacity-70"
                >
                  <span className="seal-badge-outline px-1.5 py-0.5 text-[10px]">掷卦</span>
                  妙赐芳名
                </button>
              </div>
            </div>
          )}

          {/* 第 5 步：一句话想法 */}
          {step === 5 && (
            <div className="space-y-2">
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="例如：一把能听懂古琴声的乌木戒尺，引出一桩二十年前江南丝绸案；或者：留空由AI自行激荡推演..."
                rows={4}
                className="w-full p-3 rounded-lg border border-[var(--parchment-border)] bg-[var(--parchment-card)] text-[var(--ink-primary)] text-sm outline-none focus:border-[var(--gold-accent)] leading-relaxed resize-none"
              />
              <span className="text-xs text-[var(--ink-muted)]">此步可跳过，由大模型自行动念布局</span>
            </div>
          )}

          {/* 第 6 步：篇幅规划 */}
          {step === 6 && (
            <div className="space-y-2.5">
              {LENGTH_OPTIONS.map((opt) => {
                const isSelected = length === opt.key
                return (
                  <div
                    key={opt.key}
                    onClick={() => setLength(opt.key)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[var(--seal-vermilion)] bg-[rgba(168,46,34,0.06)] shadow-sm'
                        : 'border-[var(--parchment-border)] bg-[var(--parchment-card)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="ink-title font-bold text-sm text-[var(--ink-primary)]">
                        {opt.label}
                      </span>
                      {isSelected && (
                        <span className="seal-badge text-[10px] px-1.5 py-0.5">择定</span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--ink-secondary)] mt-1">{opt.desc}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 底部按钮栏（说明书要求：跳过用默认 + 下一步/开始生成） */}
        <div className="mt-4 pt-3 border-t border-[var(--parchment-border)] flex items-center gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 h-12 rounded-xl parchment-btn text-sm font-medium text-[var(--ink-secondary)]"
          >
            {step === 6 ? '默认开卷' : '随缘跳过'}
          </button>
          <button
            onClick={handleNext}
            className="flex-2 h-12 rounded-xl parchment-btn-primary text-sm font-bold tracking-wider flex items-center justify-center gap-2"
          >
            {step === 6 ? (
              <>
                <span>挥毫立卷 · 开始生成</span>
                <span className="text-xs opacity-80">➜</span>
              </>
            ) : (
              <>
                <span>下一步</span>
                <span className="text-xs opacity-80">›</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
