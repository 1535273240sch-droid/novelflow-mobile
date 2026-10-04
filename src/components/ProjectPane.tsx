import { useRef, useState } from 'react'
import { useProjectStore } from '../stores/project'
import { useUiStore } from '../stores/ui'
import { Sheet } from './common/Sheet'
import type { ProjectBackup } from '../shared/types'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-1 px-1 text-xs font-semibold tracking-wide text-slate-400">{title}</div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  )
}

function Item({
  label,
  active,
  onClick
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`truncate rounded px-3 py-2.5 text-left text-sm active:opacity-80 ${
        active ? 'bg-slate-800 text-white' : 'bg-white text-slate-700'
      }`}
    >
      {label}
    </button>
  )
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded border border-dashed border-slate-300 px-3 py-2 text-left text-xs text-slate-500 active:border-slate-400 active:text-slate-700"
    >
      + {label}
    </button>
  )
}

/** 「项目」页：项目卡片 + 故事框架/章节计划/正文 三段文件树（与桌面版项目树同构） */
export function ProjectPane() {
  const project = useProjectStore((s) => s.project)
  const bible = useProjectStore((s) => s.bible)
  const outline = useProjectStore((s) => s.outline)
  const chapters = useProjectStore((s) => s.chapters)
  const currentPath = useProjectStore((s) => s.currentPath)
  const openFile = useProjectStore((s) => s.openFile)
  const newChapter = useProjectStore((s) => s.newChapter)
  const exportCurrent = useProjectStore((s) => s.exportCurrent)
  const importBackup = useProjectStore((s) => s.importBackup)
  const setTab = useUiStore((s) => s.setTab)
  const setProjectSheet = useUiStore((s) => s.setProjectSheet)
  const sheet = useUiStore((s) => s.projectSheet)
  const showToast = useUiStore((s) => s.showToast)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const onExport = () => {
    const backup = exportCurrent()
    if (!backup) {
      showToast('当前没有打开的项目')
      return
    }
    try {
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${backup.project.name || '项目'}-novelflow备份.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      showToast('备份已导出（含全部文件）')
    } catch {
      showToast('导出失败：当前环境不支持下载')
    }
  }

  const onImportFile = async (file: File) => {
    try {
      const text = await file.text()
      const backup = JSON.parse(text) as ProjectBackup
      importBackup(backup)
      useUiStore.getState().setProjectSheet('none')
    } catch {
      showToast('导入失败：文件解析错误')
    }
  }

  if (!project) return null

  return (
    <div className="h-full overflow-y-auto px-4 pb-6 pt-4">
      {/* 项目卡片 */}
      <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4">
        <div className="font-semibold text-slate-800">{project.name}</div>
        <div className="mt-1 text-xs text-slate-500">
          题材：{project.genre || '（未设置）'} · 目标 {project.targetWords.toLocaleString('zh-CN')} 字
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={onExport}
            className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 active:bg-slate-100"
          >
            导出备份
          </button>
          <button
            onClick={() => setProjectSheet('switch')}
            className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 active:bg-slate-100"
          >
            切换项目
          </button>
          <button
            onClick={() => setProjectSheet('import')}
            className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 active:bg-slate-100"
          >
            导入备份
          </button>
        </div>
      </div>

      <Section title="故事框架（bible）">
        {bible.map((e) => (
          <Item
            key={e.path}
            label={e.type === 'dir' ? `${e.name}/` : e.name.replace(/\.md$/, '')}
            active={currentPath === e.path}
            onClick={() => {
              if (e.type === 'file') {
                openFile(e.path)
                setTab('editor')
              }
            }}
          />
        ))}
        {bible.length === 0 && <div className="px-1 text-xs text-slate-400">（空）</div>}
      </Section>

      <Section title="章节计划（outline）">
        <AddButton label="新建章节计划" onClick={() => newChapter('outline')} />
        {outline.map((e) => (
          <Item
            key={e.path}
            label={e.name.replace(/\.md$/, '')}
            active={currentPath === e.path}
            onClick={() => {
              openFile(e.path)
              setTab('editor')
            }}
          />
        ))}
      </Section>

      <Section title="正文（chapters）">
        <AddButton label="新建正文章节" onClick={() => newChapter('chapters')} />
        {chapters.map((e) => (
          <Item
            key={e.path}
            label={e.name.replace(/\.md$/, '')}
            active={currentPath === e.path}
            onClick={() => {
              openFile(e.path)
              setTab('editor')
            }}
          />
        ))}
      </Section>

      <p className="px-1 text-xs leading-relaxed text-slate-400">
        项目保存在本机设备存储：novel.json、bible/（故事框架）、outline/（章节计划）、chapters/（正文）、
        state/（人物状态、伏笔、事件）。导出备份即可迁移到桌面版或其他设备。
      </p>

      {/* 新建项目 */}
      <CreateProjectSheet open={sheet === 'create'} onClose={() => setProjectSheet('none')} />

      {/* 切换项目 */}
      <SwitchProjectSheet open={sheet === 'switch'} onClose={() => setProjectSheet('none')} />

      {/* 导入备份 */}
      <Sheet open={sheet === 'import'} onClose={() => setProjectSheet('none')} title="导入项目备份">
        <p className="mb-3 text-xs text-slate-500">
          选择此前导出的 NovelFlow 备份 JSON（novelflow-project-backup），将生成一个新项目，不会覆盖现有项目。
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onImportFile(f)
            e.target.value = ''
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded bg-blue-600 px-4 py-2.5 text-sm text-white active:bg-blue-500"
        >
          选择备份文件
        </button>
      </Sheet>
    </div>
  )
}

function CreateProjectSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createProject = useProjectStore((s) => s.createProject)
  const [name, setName] = useState('')
  const [genre, setGenre] = useState('')
  const [targetWords, setTargetWords] = useState('1000000')

  const submit = () => {
    if (!name.trim()) {
      useUiStore.getState().showToast('请输入项目名称')
      return
    }
    const info = createProject({ name, genre, targetWords: Number(targetWords) || 1_000_000 })
    if (info) {
      setName('')
      setGenre('')
      setTargetWords('1000000')
      onClose()
    }
  }

  const inputCls = 'w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none'

  return (
    <Sheet open={open} onClose={onClose} title="新建项目">
      <div className="flex flex-col gap-3">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">项目名称</span>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：雨夜小巷" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">题材</span>
          <input className={inputCls} value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="例如：都市悬疑" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">目标字数</span>
          <input
            type="number"
            min={10000}
            className={inputCls}
            value={targetWords}
            onChange={(e) => setTargetWords(e.target.value)}
          />
        </label>
        <div className="mt-1 flex gap-2">
          <button onClick={submit} className="flex-1 rounded bg-blue-600 px-4 py-2.5 text-sm text-white active:bg-blue-500">
            创建项目
          </button>
          <button onClick={onClose} className="rounded border border-slate-300 px-4 py-2.5 text-sm text-slate-700 active:bg-slate-100">
            取消
          </button>
        </div>
        <p className="text-xs leading-relaxed text-slate-400">
          创建后自动生成标准结构：novel.json、bible/（概述/世界观/人物/主线与卷纲/文风规范/时间线）、outline/、chapters/、state/。
        </p>
      </div>
    </Sheet>
  )
}

function SwitchProjectSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const projects = useProjectStore((s) => s.projects)
  const currentId = useProjectStore((s) => s.project?.id ?? null)
  const openProject = useProjectStore((s) => s.openProject)
  const deleteProject = useProjectStore((s) => s.deleteProject)
  const showToast = useUiStore((s) => s.showToast)

  return (
    <Sheet open={open} onClose={onClose} title="切换项目">
      {projects.length === 0 && <p className="text-sm text-slate-500">本机还没有项目，先新建一个吧。</p>}
      <div className="flex flex-col gap-2">
        {projects.map((p) => (
          <div
            key={p.id}
            className={`flex items-center justify-between gap-2 rounded border p-3 ${
              p.id === currentId ? 'border-blue-300 bg-blue-50/40' : 'border-slate-200'
            }`}
          >
            <button
              className="min-w-0 flex-1 text-left"
              onClick={() => {
                openProject(p.id)
                onClose()
              }}
            >
              <div className="truncate text-sm font-medium text-slate-800">
                {p.name}
                {p.id === currentId && <span className="ml-2 text-xs text-blue-600">当前</span>}
              </div>
              <div className="mt-0.5 truncate text-xs text-slate-500">
                {p.genre || '（未设置题材）'} · 创建于 {new Date(p.createdAt).toLocaleDateString('zh-CN')}
              </div>
            </button>
            <button
              onClick={() => {
                if (window.confirm(`确定删除项目「${p.name}」？其全部文件将从本机移除，建议先导出备份。`)) {
                  deleteProject(p.id)
                  showToast('项目已删除')
                }
              }}
              className="shrink-0 rounded border border-red-200 px-2.5 py-1.5 text-xs text-red-600 active:bg-red-50"
            >
              删除
            </button>
          </div>
        ))}
      </div>
    </Sheet>
  )
}
