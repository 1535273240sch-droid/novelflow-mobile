import { useEffect, useState } from 'react'
import {
  DEMO_PRESET_ID,
  MODEL_ROLES,
  MODEL_ROLE_LABELS,
  PROTOCOL_LABELS,
  type AppConfig,
  type PresetInput,
  type Protocol,
  type RoleMapping,
  type TestConnectionResult
} from '../shared/types'
import { useSettingsStore } from '../stores/settings'
import { useUiStore } from '../stores/ui'
import { getCredentials, SECURITY_NOTE } from '../services/settings-store'
import { llm } from '../lib/llm/service'
import { wipeAllData } from '../services/vfs'
import { Sheet } from './common/Sheet'

function emptyForm(): PresetInput {
  return {
    name: '',
    protocol: 'openai-compatible',
    baseUrl: '',
    apiKey: '',
    rememberKey: true,
    model: '',
    contextLength: 128000,
    temperature: 0.7,
    maxOutputTokens: 4096
  }
}

/** 设置页：模型预设增删改 + 测试连接 + 模型角色映射 + 性能配置（与桌面版同功能，手机版单列布局） */
export function SettingsPage({ onBack }: { onBack: () => void }) {
  const settings = useSettingsStore((s) => s.settings)
  const savePreset = useSettingsStore((s) => s.savePreset)
  const deletePreset = useSettingsStore((s) => s.deletePreset)
  const setRoles = useSettingsStore((s) => s.setRoles)
  const setAppConfig = useSettingsStore((s) => s.setAppConfig)
  const showToast = useUiStore((s) => s.showToast)

  const [form, setForm] = useState<PresetInput | null>(null)
  const [testing, setTesting] = useState<string>('')
  const [results, setResults] = useState<Record<string, TestConnectionResult>>({})
  const [rolesDraft, setRolesDraft] = useState<RoleMapping>({})
  const [configDraft, setConfigDraft] = useState<AppConfig | null>(null)

  // 设置数据加载后同步草稿
  useEffect(() => {
    if (settings) {
      setRolesDraft({ ...settings.roles })
      setConfigDraft({ ...settings.config })
    }
  }, [settings])

  if (!settings || !configDraft) return null

  const startEdit = (id: string) => {
    const p = settings.presets.find((x) => x.id === id)
    if (!p) return
    setForm({
      id: p.id,
      name: p.name,
      protocol: p.protocol,
      baseUrl: p.baseUrl,
      apiKey: '', // 留空 = 不修改已存密钥
      rememberKey: !p.apiKeySessionOnly,
      model: p.model,
      contextLength: p.contextLength,
      temperature: p.temperature,
      maxOutputTokens: p.maxOutputTokens
    })
  }

  const submitForm = () => {
    if (!form) return
    if (!form.name.trim() || (form.protocol !== 'local-demo' && (!form.baseUrl.trim() || !form.model.trim()))) {
      showToast('名称、base_url、模型名不能为空')
      return
    }
    const input: PresetInput = { ...form, apiKey: form.apiKey?.trim() ? form.apiKey.trim() : null }
    savePreset(input)
    showToast('预设已保存（Key 保存在本机设备）')
    setForm(null)
  }

  const testConnection = async (id: string) => {
    const creds = getCredentials(id)
    if (!creds) {
      setResults((r) => ({ ...r, [id]: { ok: false, error: '预设不存在' } }))
      return
    }
    setTesting(id)
    setResults((r) => ({ ...r, [id]: { ok: false, error: '测试中…' } }))
    const result = await llm.testConnection(creds)
    setResults((r) => ({ ...r, [id]: result }))
    setTesting('')
  }

  const remove = (id: string, name: string) => {
    if (!window.confirm(`确定删除预设「${name}」？`)) return
    deletePreset(id)
    showToast('已删除')
  }

  const field = (label: string, node: React.ReactNode, hint?: string) => (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-600">{label}</span>
      {node}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  )

  const inputCls =
    'w-full rounded border border-slate-300 px-2 py-2 text-sm focus:border-slate-500 focus:outline-none'

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-4">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-xl font-bold">设置</h1>
          <button onClick={onBack} className="rounded border border-slate-300 px-3 py-1.5 text-sm active:bg-slate-100">
            返回
          </button>
        </div>

        {/* 模型预设 */}
        <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">模型预设</h2>
            <button
              onClick={() => setForm(emptyForm())}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white active:bg-blue-500"
            >
              + 新建预设
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {settings.presets.map((p) => {
              const r = results[p.id]
              const isDemo = p.id === DEMO_PRESET_ID
              return (
                <div key={p.id} className="rounded border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{p.name}</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                          {PROTOCOL_LABELS[p.protocol]}
                        </span>
                        {p.apiKeySessionOnly && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                            Key 仅本次会话有效
                          </span>
                        )}
                      </div>
                      <div className="mt-1 truncate text-xs text-slate-500">
                        {isDemo
                          ? '内置离线演示：不出网即可体验完整流式写作'
                          : `${p.baseUrl || '（未设置 base_url）'} · 模型 ${p.model} · 密钥 ${p.apiKeyHint || '（未设置）'}`}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => void testConnection(p.id)}
                        disabled={testing === p.id}
                        className="rounded border border-slate-300 px-2.5 py-1.5 text-xs active:bg-slate-100 disabled:opacity-50"
                      >
                        {testing === p.id ? '测试中…' : '测试连接'}
                      </button>
                      {!isDemo && (
                        <>
                          <button
                            onClick={() => startEdit(p.id)}
                            className="rounded border border-slate-300 px-2.5 py-1.5 text-xs active:bg-slate-100"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => remove(p.id, p.name)}
                            className="rounded border border-red-200 px-2.5 py-1.5 text-xs text-red-600 active:bg-red-50"
                          >
                            删除
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {r && (
                    <div className={`mt-2 text-xs ${r.ok ? 'text-green-700' : 'text-red-600'}`}>
                      {r.ok ? `连接成功，延迟 ${r.latencyMs}ms（模型 ${r.model}）` : `连接失败：${r.error}`}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* 新建/编辑表单 */}
        {form && (
          <Sheet open onClose={() => setForm(null)} title={form.id ? '编辑预设' : '新建预设'}>
            <div className="flex flex-col gap-3">
              {field('名称', (
                <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="例如：DeepSeek / 本地 Ollama" />
              ))}
              {field('协议', (
                <select className={inputCls} value={form.protocol} onChange={(e) => setForm({ ...form, protocol: e.target.value as Protocol })}>
                  <option value="openai-compatible">openai-compatible</option>
                  <option value="anthropic">anthropic</option>
                </select>
              ))}
              {field('base_url', (
                <input className={inputCls} value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} placeholder="例如 https://api.deepseek.com/v1" />
              ), 'OpenAI 兼容地址通常以 /v1 结尾；本地模型（Ollama/LM Studio）同样适用')}
              {field('API Key', (
                <input type="password" className={inputCls} value={form.apiKey ?? ''} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder={form.id ? '留空则不修改已存密钥' : '仅保存在本机设备'} />
              ))}
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.rememberKey ?? true}
                  onChange={(e) => setForm({ ...form, rememberKey: e.target.checked })}
                />
                记住密钥（保存在本机；不勾选则仅本次会话有效）
              </label>
              {field('模型名', (
                <input className={inputCls} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="例如 deepseek-chat / gpt-4o-mini" />
              ))}
              {field('上下文长度（token）', (
                <input type="number" min={1024} className={inputCls} value={form.contextLength} onChange={(e) => setForm({ ...form, contextLength: Number(e.target.value) || 0 })} />
              ))}
              {field('默认温度', (
                <input type="number" step={0.1} min={0} max={2} className={inputCls} value={form.temperature} onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })} />
              ))}
              {field('最大输出（token）', (
                <input type="number" min={16} className={inputCls} value={form.maxOutputTokens} onChange={(e) => setForm({ ...form, maxOutputTokens: Number(e.target.value) || 0 })} />
              ))}
              <div className="mt-1 flex gap-2">
                <button onClick={submitForm} className="flex-1 rounded bg-blue-600 px-4 py-2.5 text-sm text-white active:bg-blue-500">
                  保存
                </button>
                <button onClick={() => setForm(null)} className="rounded border border-slate-300 px-4 py-2.5 text-sm active:bg-slate-100">
                  取消
                </button>
              </div>
            </div>
          </Sheet>
        )}

        {/* 模型角色映射 */}
        <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">模型角色映射</h2>
          <p className="mb-3 text-xs text-slate-500">为不同任务指定不同模型；试写默认使用「写作模型」。</p>
          <div className="flex flex-col gap-3">
            {MODEL_ROLES.map((role) => (
              <label key={role} className="text-sm">
                <span className="mb-1 block text-slate-600">{MODEL_ROLE_LABELS[role]}</span>
                <select
                  className={inputCls}
                  value={rolesDraft[role] ?? ''}
                  onChange={(e) => setRolesDraft({ ...rolesDraft, [role]: e.target.value || undefined })}
                >
                  <option value="">（未指定）</option>
                  {settings.presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}（{p.model}）
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <button
            onClick={() => {
              setRoles(rolesDraft)
              showToast('角色映射已保存')
            }}
            className="mt-3 w-full rounded bg-slate-800 px-4 py-2.5 text-sm text-white active:bg-slate-700"
          >
            保存角色映射
          </button>
        </section>

        {/* 性能 */}
        <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">性能</h2>
          <div className="flex flex-col gap-3">
            {field('并发 LLM 请求数', (
              <input type="number" min={1} max={8} className={inputCls} value={configDraft.concurrencyLimit} onChange={(e) => setConfigDraft({ ...configDraft, concurrencyLimit: Number(e.target.value) || 1 })} />
            ), '默认 2')}
            {field('流式刷新节流（毫秒）', (
              <input type="number" min={20} max={500} step={10} className={inputCls} value={configDraft.streamThrottleMs} onChange={(e) => setConfigDraft({ ...configDraft, streamThrottleMs: Number(e.target.value) || 80 })} />
            ), '默认 80（约 50–100ms）')}
            {field('自动保存间隔（毫秒）', (
              <input type="number" min={2000} max={10000} step={500} className={inputCls} value={configDraft.autoSaveMs} onChange={(e) => setConfigDraft({ ...configDraft, autoSaveMs: Number(e.target.value) || 3500 })} />
            ), '默认 3500（3–5 秒）')}
          </div>
          <button
            onClick={() => {
              setAppConfig(configDraft)
              showToast('性能配置已保存')
            }}
            className="mt-3 w-full rounded bg-slate-800 px-4 py-2.5 text-sm text-white active:bg-slate-700"
          >
            保存性能配置
          </button>
        </section>

        {/* 安全与数据 */}
        <section className="mb-10 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">安全与数据</h2>
          <p className="text-xs leading-relaxed text-slate-500">{SECURITY_NOTE}</p>
          <button
            onClick={() => {
              if (!window.confirm('确定清空本机全部 NovelFlow 数据（项目、预设、设置）？此操作不可恢复，建议先导出备份。')) return
              wipeAllData()
              showToast('已清空，即将重启界面')
              setTimeout(() => window.location.reload(), 800)
            }}
            className="mt-3 w-full rounded border border-red-300 px-4 py-2.5 text-sm text-red-600 active:bg-red-50"
          >
            清空本机全部数据
          </button>
        </section>
      </div>
    </div>
  )
}
