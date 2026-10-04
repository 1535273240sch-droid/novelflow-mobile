import { useUiStore } from '../stores/ui'

/** 未打开项目时的欢迎页（与桌面版 Welcome 同文案同风格，改为手机布局） */
export function Welcome() {
  const setProjectSheet = useUiStore((s) => s.setProjectSheet)
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen)
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-10">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-800">NovelFlow</h1>
        <p className="mt-2 text-slate-500">小说写作工作台 · 项目即文件夹，设定/大纲/正文/状态各自成文件</p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          onClick={() => setProjectSheet('create')}
          className="rounded bg-blue-600 px-6 py-3 text-white active:bg-blue-500"
        >
          新建项目
        </button>
        <button
          onClick={() => setProjectSheet('switch')}
          className="rounded border border-slate-300 bg-white px-6 py-3 text-slate-700 active:bg-slate-100"
        >
          打开项目
        </button>
        <button
          onClick={() => setProjectSheet('import')}
          className="rounded border border-slate-300 bg-white px-6 py-3 text-slate-700 active:bg-slate-100"
        >
          导入备份
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          className="rounded px-6 py-2 text-sm text-slate-500 active:text-slate-700"
        >
          先去设置模型 →
        </button>
      </div>
      <p className="max-w-md text-center text-xs leading-relaxed text-slate-400">
        新建项目将生成标准目录结构：novel.json、bible/（故事框架）、outline/（章节计划）、chapters/（正文）、
        state/（人物状态、伏笔、事件）。未配置真实模型时，内置「演示模型（内置离线）」可直接体验完整流程。
      </p>
    </div>
  )
}
