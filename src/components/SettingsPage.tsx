import React, { useState } from 'react'
import { useSettingsStore } from '../stores/settings'
import { useUiStore } from '../stores/ui'
import { complete } from '../lib/llm/adapters'
import { getCredentials, SECURITY_NOTE } from '../services/settings-store'
import type { PresetInput, PresetView, Protocol } from '../shared/types'
import { DEFAULT_DEAI_WORDS } from '../../packages/core/src/deai-words'

const STAGE_LABELS: Record<string, string> = {
  framework: '立骨安魂（故事框架）',
  plan: '排篇布局（章节计划）',
  draft: '秉烛挥毫（正文初稿）',
  typo: '校勘厘正（错别字检查）',
  deai: '洗练铅华（去AI味）',
  polish: '锦上添花（润色精修）',
  title: '题签金石（候选书名）'
}

export const SettingsPage: React.FC = () => {
  const settings = useSettingsStore((s) => s.settings)
  const savePreset = useSettingsStore((s) => s.savePreset)
  const deletePreset = useSettingsStore((s) => s.deletePreset)
  const setStageModels = useSettingsStore((s) => s.setStageModels)
  const setAppConfig = useSettingsStore((s) => s.setAppConfig)
  const showToast = useUiStore((s) => s.showToast)

  // 预设编辑表单弹窗
  const [editingPreset, setEditingPreset] = useState<PresetInput | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<string | null>(null)

  // 新增 AI 味词汇输入框
  const [newBannedWord, setNewBannedWord] = useState('')

  if (!settings) return null

  const presets: PresetView[] = settings.presets || []
  const stageModels = settings.stageModels || {}
  const config = settings.config
  const bannedWords = config.bannedWords || DEFAULT_DEAI_WORDS

  const handleTestConnection = async (presetId: string) => {
    setTestingId(presetId)
    setTestResult('正在建立文曲连通测试...')
    try {
      const creds = getCredentials(presetId)
      if (!creds || creds.protocol === 'local-demo') {
        await new Promise((r) => setTimeout(r, 400))
        setTestResult('✅ 本地模拟模型连通畅通，随时可离线推演')
        showToast('测试成功')
        return
      }
      const t0 = performance.now()
      const resp = await complete(
        creds,
        [{ role: 'user', content: '请输出两字：通畅' }],
        { connectTimeoutMs: 15000 }
      )
      const latency = Math.round(performance.now() - t0)
      setTestResult(`✅ 连通成功！延迟 ${latency}ms，返回：「${resp.trim().slice(0, 20)}」`)
      showToast('模型连接成功')
    } catch (e: any) {
      setTestResult(`❌ 连通失败：${e.message || '网络连接受阻'}`)
      showToast('连接测试失败')
    } finally {
      setTestingId(null)
    }
  }

  const handleOpenAdd = () => {
    setEditingPreset({
      name: '',
      protocol: 'openai-compatible',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      rememberKey: true,
      model: 'gpt-4o-mini',
      contextLength: 128000,
      temperature: 0.7,
      maxOutputTokens: 4096
    })
    setTestResult(null)
  }

  const handleSavePreset = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPreset || !editingPreset.name.trim()) {
      showToast('请输入模型配置名称')
      return
    }
    savePreset(editingPreset)
    setEditingPreset(null)
    showToast('模型配置已存卷')
  }

  const handleAddBannedWord = () => {
    const word = newBannedWord.trim()
    if (!word) return
    if (bannedWords.includes(word)) {
      showToast('该词汇已存在于词库中')
      return
    }
    const updated = [...bannedWords, word]
    setAppConfig({ bannedWords: updated })
    setNewBannedWord('')
    showToast(`已将「${word}」纳入洗练词库`)
  }

  const handleRemoveBannedWord = (word: string) => {
    const updated = bannedWords.filter((w) => w !== word)
    setAppConfig({ bannedWords: updated })
    showToast(`已从词库中移除「${word}」`)
  }

  return (
    <div className="h-full flex flex-col bg-[var(--parchment-bg)] select-none">
      {/* 顶栏 */}
      <div className="shrink-0 px-4 py-3 border-b border-[var(--parchment-border)] bg-[var(--parchment-card)] flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <span className="seal-badge px-2 py-0.5 text-xs">天工</span>
          <h2 className="ink-title text-base font-bold text-[var(--ink-primary)]">
            天工墨引 · 枢机配置
          </h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 parchment-scroll space-y-5 pb-24">
        {/* 1. 外观与文韵设定 */}
        <section className="parchment-box rounded-xl p-4 border border-[var(--parchment-border)] space-y-3">
          <div className="flex items-center gap-2 border-b border-[var(--parchment-border)] pb-2">
            <span className="seal-badge text-[10px] px-1.5 py-0.2">风韵</span>
            <h3 className="ink-title font-bold text-sm text-[var(--ink-primary)]">
              古典墨韵与阅读排版
            </h3>
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <div className="text-xs font-semibold text-[var(--ink-primary)]">卷轴底色主题</div>
              <div className="text-[11px] text-[var(--ink-muted)]">
                {config.theme === 'parchment' ? '澄心羊皮卷（古雅暖宣）' : '玄砚洒金夜（老坑深墨）'}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setAppConfig({ theme: 'parchment' })}
                className={`px-2.5 py-1 rounded text-xs border ${
                  config.theme === 'parchment'
                    ? 'parchment-btn-primary font-bold'
                    : 'parchment-btn text-[var(--ink-secondary)]'
                }`}
              >
                澄心卷
              </button>
              <button
                onClick={() => setAppConfig({ theme: 'dark' })}
                className={`px-2.5 py-1 rounded text-xs border ${
                  config.theme === 'dark'
                    ? 'parchment-btn-primary font-bold'
                    : 'parchment-btn text-[var(--ink-secondary)]'
                }`}
              >
                玄砚夜
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-1 border-t border-[var(--parchment-border)]/50 pt-2">
            <div>
              <div className="text-xs font-semibold text-[var(--ink-primary)]">定稿后自动题签</div>
              <div className="text-[11px] text-[var(--ink-muted)]">正文生成完毕后自动弹出8个候选书名</div>
            </div>
            <input
              type="checkbox"
              checked={config.autoShowTitleSheet}
              onChange={(e) => setAppConfig({ autoShowTitleSheet: e.target.checked })}
              className="w-4 h-4 accent-[var(--seal-vermilion)] cursor-pointer"
            />
          </div>
        </section>

        {/* 2. 模型库管理 */}
        <section className="parchment-box rounded-xl p-4 border border-[var(--parchment-border)] space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--parchment-border)] pb-2">
            <div className="flex items-center gap-2">
              <span className="seal-badge text-[10px] px-1.5 py-0.2">文曲</span>
              <h3 className="ink-title font-bold text-sm text-[var(--ink-primary)]">
                大语言模型预设
              </h3>
            </div>
            <button
              onClick={handleOpenAdd}
              className="parchment-btn-primary px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 shadow-xs"
            >
              <span>+</span>
              <span>新增模型</span>
            </button>
          </div>

          <p className="text-[11px] text-[var(--ink-muted)] leading-relaxed">
            {SECURITY_NOTE}
          </p>

          {/* 预设列表 */}
          <div className="space-y-2 pt-1">
            {presets.map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-lg border border-[var(--parchment-border)] bg-[var(--parchment-bg)] flex items-center justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="ink-title font-bold text-xs text-[var(--ink-primary)] truncate">
                      {p.name}
                    </span>
                    <span className="seal-badge-outline text-[9px] px-1 py-0.1">
                      {p.model}
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--ink-muted)] mt-0.5 truncate">
                    {p.protocol === 'local-demo'
                      ? '离线天工模拟（无需网络与密钥）'
                      : p.baseUrl || '官方默认端点'}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pl-2">
                  <button
                    onClick={() => handleTestConnection(p.id)}
                    disabled={testingId === p.id}
                    className="text-[11px] text-[var(--gold-accent)] font-semibold px-2 py-1 rounded border border-[var(--gold-accent)]/30 hover:bg-[var(--gold-glow)]"
                  >
                    {testingId === p.id ? '测验中...' : '测试'}
                  </button>
                  {p.protocol !== 'local-demo' && (
                    <button
                      onClick={() => {
                        if (window.confirm(`确认删除模型预设「${p.name}」？`)) {
                          deletePreset(p.id)
                          showToast('已删除模型预设')
                        }
                      }}
                      className="text-[11px] text-[var(--seal-vermilion)] p-1 hover:opacity-80"
                    >
                      删除
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {testResult && (
            <div className="p-2.5 rounded-lg bg-[var(--parchment-card)] border border-[var(--parchment-border)] text-xs text-[var(--ink-secondary)] leading-relaxed animate-fade-in">
              {testResult}
            </div>
          )}
        </section>

        {/* 3. 各阶段模型指派 */}
        <section className="parchment-box rounded-xl p-4 border border-[var(--parchment-border)] space-y-3">
          <div className="flex items-center gap-2 border-b border-[var(--parchment-border)] pb-2">
            <span className="seal-badge text-[10px] px-1.5 py-0.2">司职</span>
            <h3 className="ink-title font-bold text-sm text-[var(--ink-primary)]">
              七大阶段模型分工指派
            </h3>
          </div>
          <p className="text-[11px] text-[var(--ink-muted)]">
            可为正文创作指定长文本能力强的模型，为错别字与去AI味指定高速经济模型。
          </p>

          <div className="space-y-2 pt-1">
            {Object.entries(STAGE_LABELS).map(([stKey, label]) => {
              const currentModelId = stageModels[stKey] || 'builtin-demo'
              return (
                <div key={stKey} className="flex items-center justify-between py-1.5 border-b border-[var(--parchment-border)]/40 text-xs">
                  <span className="text-[var(--ink-secondary)] font-medium">{label}</span>
                  <select
                    value={currentModelId}
                    onChange={(e) => {
                      const updated = { ...stageModels, [stKey]: e.target.value }
                      setStageModels(updated)
                      showToast(`已更新「${label}」所指派模型`)
                    }}
                    className="h-8 px-2 rounded border border-[var(--parchment-border)] bg-[var(--parchment-card)] text-[var(--ink-primary)] text-xs outline-none focus:border-[var(--gold-accent)]"
                  >
                    {presets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
        </section>

        {/* 4. 去 AI 味词库维护 */}
        <section className="parchment-box rounded-xl p-4 border border-[var(--parchment-border)] space-y-3">
          <div className="flex items-center gap-2 border-b border-[var(--parchment-border)] pb-2">
            <span className="seal-badge text-[10px] px-1.5 py-0.2">洗墨</span>
            <h3 className="ink-title font-bold text-sm text-[var(--ink-primary)]">
              去 AI 味套话词库管理
            </h3>
          </div>
          <p className="text-[11px] text-[var(--ink-muted)]">
            工作流执行至「洗练铅华」阶段时，将针对以下套话句式执行严苛筛除与重构：
          </p>

          {/* 添加新词 */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              placeholder="添加需要扫除的陈词套话..."
              value={newBannedWord}
              onChange={(e) => setNewBannedWord(e.target.value)}
              className="flex-1 h-9 px-3 rounded-lg border border-[var(--parchment-border)] bg-[var(--parchment-card)] text-xs text-[var(--ink-primary)] outline-none focus:border-[var(--gold-accent)]"
            />
            <button
              onClick={handleAddBannedWord}
              className="parchment-btn-primary px-3 h-9 rounded-lg text-xs font-bold"
            >
              录入
            </button>
          </div>

          {/* 词汇标签云 */}
          <div className="flex flex-wrap gap-1.5 pt-2 max-h-40 overflow-y-auto">
            {bannedWords.map((w) => (
              <span
                key={w}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--parchment-bg)] border border-[var(--parchment-border)] text-xs text-[var(--ink-primary)] font-serif"
              >
                <span>{w}</span>
                <button
                  onClick={() => handleRemoveBannedWord(w)}
                  className="text-[var(--ink-muted)] hover:text-[var(--seal-vermilion)] ml-0.5 text-xs font-bold"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </section>
      </div>

      {/* 预设编辑浮层 */}
      {editingPreset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="parchment-box w-full max-w-md rounded-2xl border-2 border-[var(--gold-accent)] p-5 shadow-2xl safe-bottom max-h-[90vh] overflow-y-auto">
            <h3 className="ink-title text-base font-bold text-[var(--ink-primary)] mb-3 pb-2 border-b border-[var(--parchment-border)]">
              {editingPreset.id ? '编辑模型预设' : '添加 OpenAI 兼容模型'}
            </h3>

            <form onSubmit={handleSavePreset} className="space-y-3 text-xs">
              <div>
                <label className="block text-[var(--ink-secondary)] mb-1">配置名称</label>
                <input
                  type="text"
                  required
                  placeholder="例如：通义千问 / DeepSeek / 本地Ollama"
                  value={editingPreset.name}
                  onChange={(e) => setEditingPreset({ ...editingPreset, name: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-[var(--parchment-border)] bg-[var(--parchment-bg)] text-[var(--ink-primary)]"
                />
              </div>

              <div>
                <label className="block text-[var(--ink-secondary)] mb-1">协议类型</label>
                <select
                  value={editingPreset.protocol}
                  onChange={(e) =>
                    setEditingPreset({ ...editingPreset, protocol: e.target.value as Protocol })
                  }
                  className="w-full h-10 px-2 rounded-lg border border-[var(--parchment-border)] bg-[var(--parchment-bg)] text-[var(--ink-primary)]"
                >
                  <option value="openai-compatible">OpenAI 兼容（通义/DeepSeek/SiliconFlow等）</option>
                  <option value="anthropic">Anthropic Claude</option>
                </select>
              </div>

              <div>
                <label className="block text-[var(--ink-secondary)] mb-1">API 基础端点 (Base URL)</label>
                <input
                  type="text"
                  required
                  placeholder="https://api.openai.com/v1"
                  value={editingPreset.baseUrl}
                  onChange={(e) => setEditingPreset({ ...editingPreset, baseUrl: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-[var(--parchment-border)] bg-[var(--parchment-bg)] text-[var(--ink-primary)]"
                />
              </div>

              <div>
                <label className="block text-[var(--ink-secondary)] mb-1">API 密钥 (API Key)</label>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={editingPreset.apiKey || ''}
                  onChange={(e) => setEditingPreset({ ...editingPreset, apiKey: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-[var(--parchment-border)] bg-[var(--parchment-bg)] text-[var(--ink-primary)]"
                />
              </div>

              <div>
                <label className="block text-[var(--ink-secondary)] mb-1">模型名称 (Model)</label>
                <input
                  type="text"
                  required
                  placeholder="deepseek-chat / gpt-4o / qwen-max"
                  value={editingPreset.model}
                  onChange={(e) => setEditingPreset({ ...editingPreset, model: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-[var(--parchment-border)] bg-[var(--parchment-bg)] text-[var(--ink-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[var(--ink-secondary)] mb-1">温度 (Temperature)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="2"
                    value={editingPreset.temperature}
                    onChange={(e) =>
                      setEditingPreset({
                        ...editingPreset,
                        temperature: parseFloat(e.target.value) || 0.7
                      })
                    }
                    className="w-full h-9 px-2 rounded-lg border border-[var(--parchment-border)] bg-[var(--parchment-bg)] text-[var(--ink-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--ink-secondary)] mb-1">最大输出 Token</label>
                  <input
                    type="number"
                    step="256"
                    min="512"
                    value={editingPreset.maxOutputTokens}
                    onChange={(e) =>
                      setEditingPreset({
                        ...editingPreset,
                        maxOutputTokens: parseInt(e.target.value, 10) || 4096
                      })
                    }
                    className="w-full h-9 px-2 rounded-lg border border-[var(--parchment-border)] bg-[var(--parchment-bg)] text-[var(--ink-primary)]"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-[var(--parchment-border)] mt-4">
                <button
                  type="button"
                  onClick={() => setEditingPreset(null)}
                  className="h-10 px-4 rounded-xl parchment-btn text-[var(--ink-secondary)]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl parchment-btn-primary font-bold shadow-md"
                >
                  保存预设
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
