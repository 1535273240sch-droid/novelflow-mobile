import { useState } from 'react'
import { useProjectStore } from '../stores/project'
import { useSettingsStore } from '../stores/settings'
import { useUiStore } from '../stores/ui'

/**
 * 「试写」页（对应桌面版右栏 StreamDemo）：
 * - 用户自己输入提示，软件不内置任何 LLM 提示词；
 * - 结果按设置的节流间隔流式追加进当前打开的正文章节；
 * - 可随时取消；内置演示模型离线可用。
 */
export function TrialPane() {
  const presets = useSettingsStore((s) => s.settings?.presets ?? [])
  const roles = useSettingsStore((s) => s.settings?.roles ?? {})
  const project = useProjectStore((s) => s.project)
  const chapters = useProjectStore((s) => s.chapters)
  const currentPath = useProjectStore((s) => s.currentPath)
  const streamStatus = useProjectStore((s) => s.streamStatus)
  const generate = useProjectStore((s) => s.generate)
  const cancelStream = useProjectStore((s) => s.cancelStream)

  const [presetId, setPresetId] = useState('')
  const [prompt, setPrompt] = useState('')

  const effectivePreset = presetId || roles.writer || presets[0]?.id || ''
  const running = streamStatus === 'streaming'

  const start = () => {
    if (!effectivePreset) {
      useUiStore.getState().showToast('请先在设置中添加模型预设')
      return
    }
    generate(prompt, presetId || undefined)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-xl flex-col gap-3 p-4">
        <div className="text-sm font-semibold text-slate-700">模型试写（流式演示）</div>

        <label className="text-xs text-slate-500">
          模型预设
          <select
            value={effectivePreset}
            onChange={(e) => setPresetId(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-2 text-sm"
          >
            {presets.length === 0 && <option value="">（暂无预设，请到设置页添加）</option>}
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}（{p.model}）
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-slate-500">
          提示（自行输入，软件不内置提示词）
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="例如：请用两句话描写雨夜的小巷。"
            className="mt-1 w-full resize-none rounded border border-slate-300 px-2 py-2 text-sm"
          />
        </label>

        {!running ? (
          <button
            onClick={start}
            disabled={chapters.length === 0 || !project}
            className="rounded bg-blue-600 px-3 py-2.5 text-sm text-white active:bg-blue-500 disabled:opacity-40"
          >
            开始生成
          </button>
        ) : (
          <button onClick={cancelStream} className="rounded bg-red-600 px-3 py-2.5 text-sm text-white active:bg-red-500">
            取消
          </button>
        )}

        <div className="text-xs text-slate-500">
          状态：
          {running
            ? '流式生成中（输出追加到当前正文章节）'
            : streamStatus === 'idle' && project && currentPath?.startsWith('chapters/')
              ? '空闲（可发起生成）'
              : '空闲'}
        </div>

        <div className="rounded bg-slate-100 p-3 text-xs leading-relaxed text-slate-500">
          说明：结果会流式追加到「写作」页当前打开的章节末尾，可随时点「取消」。流式刷新已按设置节流（默认
          80ms）。未配置真实服务时，可直接选择内置「演示模型（内置离线）」体验完整流程；接入真实模型请在「设置」添加预设
          （OpenAI 兼容 / Anthropic）。
        </div>
      </div>
    </div>
  )
}
