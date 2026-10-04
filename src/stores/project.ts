import { create } from 'zustand'
import type { FileEntry, ProjectBackup, ProjectInfo } from '../shared/types'
import * as vfs from '../services/vfs'
import { llm } from '../lib/llm/service'
import { useUiStore } from './ui'
import { useSettingsStore } from './settings'

interface ProjectState {
  /** 本机全部项目（切换用） */
  projects: ProjectInfo[]
  project: ProjectInfo | null
  bible: FileEntry[]
  outline: FileEntry[]
  chapters: FileEntry[]
  /** 当前打开文件的相对路径（如 chapters/第001章.md） */
  currentPath: string | null
  currentTitle: string
  content: string
  dirty: boolean
  saving: boolean
  lastSavedAt: string | null
  /** 流式生成状态 */
  streamCallId: string | null
  /** 流式目标章节（防止生成中切换文件把内容写错地方） */
  streamTargetPath: string | null
  streamStatus: 'idle' | 'streaming'
  /** 流式开始时的内容基准长度（流式输出追加在基准之后） */
  streamBase: string

  init: () => void
  refreshProjects: () => void
  createProject: (meta: { name?: string; genre?: string; targetWords?: number }) => ProjectInfo | null
  openProject: (id: string) => boolean
  deleteProject: (id: string) => void
  exportCurrent: () => ProjectBackup | null
  importBackup: (backup: ProjectBackup) => ProjectInfo | null
  refresh: () => void
  openFile: (relPath: string) => void
  newChapter: (kind: 'chapters' | 'outline') => void
  setContent: (text: string) => void
  saveNow: () => boolean
  generate: (prompt: string, presetId?: string) => void
  cancelStream: () => void
  endStream: () => void
}

export const useProjectStore = create<ProjectState>((set, get) => {
  const toast = (text: string) => useUiStore.getState().showToast(text)

  const handleEvent = (callId: string, type: 'delta' | 'done' | 'error', full: string, error?: string, cancelled?: boolean): void => {
    const st = get()
    if (st.streamCallId !== callId) return
    if (type === 'delta') {
      // 仅当用户仍停留在流式目标章节时才追加，避免写错文件
      if (st.currentPath !== st.streamTargetPath) return
      set({ content: st.streamBase + full, dirty: true })
    } else {
      get().endStream()
      if (type === 'error') {
        toast(cancelled ? '生成已取消' : `生成失败：${error ?? '未知错误'}`)
      }
    }
  }

  return {
    projects: [],
    project: null,
    bible: [],
    outline: [],
    chapters: [],
    currentPath: null,
    currentTitle: '',
    content: '',
    dirty: false,
    saving: false,
    lastSavedAt: null,
    streamCallId: null,
    streamTargetPath: null,
    streamStatus: 'idle',
    streamBase: '',

    init: () => {
      get().refreshProjects()
      const currentId = vfs.getCurrentProjectId()
      if (currentId) get().openProject(currentId)
    },

    refreshProjects: () => set({ projects: vfs.listProjects() }),

    createProject: (meta) => {
      try {
        const info = vfs.createProject(meta)
        set({ projects: vfs.listProjects() })
        get().openProject(info.id)
        vfs.setCurrentProjectId(info.id)
        toast(`已创建项目「${info.name}」`)
        return info
      } catch (e) {
        toast(e instanceof Error ? e.message : String(e))
        return null
      }
    },

    openProject: (id) => {
      const info = vfs.getProjectInfo(id)
      if (!info) {
        toast('项目不存在')
        return false
      }
      set({
        project: info,
        currentPath: null,
        currentTitle: '',
        content: '',
        dirty: false,
        lastSavedAt: null,
        streamCallId: null,
        streamTargetPath: null,
        streamStatus: 'idle'
      })
      vfs.setCurrentProjectId(id)
      get().refresh()
      return true
    },

    deleteProject: (id) => {
      vfs.deleteProject(id)
      if (get().project?.id === id) {
        set({ project: null, currentPath: null, currentTitle: '', content: '', dirty: false })
      }
      get().refreshProjects()
      toast('项目已删除')
    },

    exportCurrent: () => {
      const p = get().project
      if (!p) return null
      return vfs.exportProject(p.id)
    },

    importBackup: (backup) => {
      try {
        const info = vfs.importProject(backup)
        get().refreshProjects()
        get().openProject(info.id)
        toast(`已导入项目「${info.name}」`)
        return info
      } catch (e) {
        toast(e instanceof Error ? e.message : String(e))
        return null
      }
    },

    refresh: () => {
      const p = get().project
      if (!p) return
      set({
        bible: vfs.listDir(p.id, 'bible'),
        outline: vfs.listDir(p.id, 'outline'),
        chapters: vfs.listDir(p.id, 'chapters')
      })
    },

    openFile: (relPath) => {
      const st = get()
      if (st.currentPath === relPath) return
      if (st.dirty) st.saveNow()
      try {
        const p = st.project
        if (!p) return
        const content = vfs.readRel(p.id, relPath)
        set({
          currentPath: relPath,
          currentTitle: relPath.split('/').pop() ?? relPath,
          content,
          dirty: false
        })
      } catch (e) {
        toast(e instanceof Error ? e.message : String(e))
      }
    },

    newChapter: (kind) => {
      const st = get()
      const p = st.project
      if (!p) return
      try {
        const rel = vfs.createChapter(p.id, kind)
        get().refresh()
        get().openFile(rel)
        toast(`已新建：${rel}`)
      } catch (e) {
        toast(e instanceof Error ? e.message : String(e))
      }
    },

    setContent: (text) =>
      set((s) => (s.content === text ? s : { content: text, dirty: true })),

    saveNow: () => {
      const st = get()
      if (!st.currentPath || !st.dirty || st.saving || !st.project) return false
      set({ saving: true })
      try {
        vfs.writeRel(st.project.id, st.currentPath, st.content)
        set({ dirty: false, lastSavedAt: new Date().toLocaleTimeString('zh-CN') })
        return true
      } catch (e) {
        toast(e instanceof Error ? e.message : String(e))
        return false
      } finally {
        set({ saving: false })
      }
    },

    generate: (prompt, presetId) => {
      const st = get()
      const settings = useSettingsStore.getState().settings
      const presets = settings?.presets ?? []
      const roles = settings?.roles ?? {}
      const effectivePreset = presetId || roles.writer || presets[0]?.id || ''
      if (!effectivePreset) {
        toast('请先在设置中添加模型预设')
        return
      }
      if (!prompt.trim()) {
        toast('请输入提示内容')
        return
      }
      const isChapter = st.currentPath?.startsWith('chapters/')
      if (!st.project || !isChapter) {
        toast('请先在「项目」页打开或新建一个正文章节（流式结果写入正文）')
        return
      }
      if (st.streamStatus === 'streaming') {
        toast('已有生成任务进行中')
        return
      }
      set({
        streamCallId: null,
        streamTargetPath: st.currentPath,
        streamStatus: 'streaming',
        streamBase: st.content
      })
      const ticket = llm.startChat(
        { presetId: effectivePreset, prompt: prompt.trim() },
        {
          onDelta: (callId, full) => handleEvent(callId, 'delta', full),
          onDone: (callId, _text) => handleEvent(callId, 'done', ''),
          onError: (callId, error, _partial, cancelled) =>
            handleEvent(callId, 'error', '', error, cancelled)
        }
      )
      set({ streamCallId: ticket.callId })
    },

    cancelStream: () => {
      const callId = get().streamCallId
      if (callId) llm.cancel(callId)
    },

    endStream: () => set({ streamCallId: null, streamTargetPath: null, streamStatus: 'idle' })
  }
})

/** 统计「字数」：去除空白字符后的长度（中文按字计） */
export function countChars(text: string): number {
  return text.replace(/\s/g, '').length
}
