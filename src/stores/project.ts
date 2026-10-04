import { create } from 'zustand'
import type {
  Project,
  StoryConfig,
  WorkflowProgress,
  StageConfig,
  StageType
} from '../../packages/core/src/types'
import { NovelWorkflowEngine } from '../../packages/core/src/workflow-engine'
import * as vfs from '../services/vfs'
import { getCredentials } from '../services/settings-store'
import { useUiStore } from './ui'
import { useSettingsStore } from './settings'
import { streamChat } from '../lib/llm/adapters'
import { demoStreamChat } from '../lib/llm/demo-stream'

interface ProjectStoreState {
  // 项目集合与当前激活项目
  projectList: Array<{ id: string; name: string; genre: string; createdAt: number }>
  currentProject: Project | null
  
  // 工作流执行状态
  isGenerating: boolean
  streamText: string
  progress: WorkflowProgress | null
  
  // 标题小窗口
  isTitleSheetOpen: boolean
  isWizardOpen: boolean
  
  // 引擎控制器引用
  engineRef: NovelWorkflowEngine | null
  
  // 动作
  init: () => void
  openProject: (id: string) => void
  createProjectWithConfig: (config: StoryConfig) => Project
  deleteProject: (id: string) => void
  runWorkflow: () => Promise<void>
  stopWorkflow: () => void
  generateTitles: () => Promise<void>
  copyFinalText: () => Promise<boolean>
  exportFinalText: () => void
  setWizardOpen: (open: boolean) => void
  setTitleSheetOpen: (open: boolean) => void
  updateCurrentProject: (patch: Partial<Project>) => void
}

const DEFAULT_STAGES: Record<StageType, StageConfig> = {
  framework: { stage: 'framework', name: '立骨安魂（故事框架）', enabled: true, modelId: '', promptFile: '01_framework.md' },
  plan: { stage: 'plan', name: '排篇布局（章节计划）', enabled: true, modelId: '', promptFile: '02_plan.md' },
  draft: { stage: 'draft', name: '秉烛挥毫（正文初稿）', enabled: true, modelId: '', promptFile: '03_draft.md' },
  typo: { stage: 'typo', name: '校勘厘正（错别字检查）', enabled: true, modelId: '', promptFile: '04_typo.md' },
  deai: { stage: 'deai', name: '洗练铅华（去AI味）', enabled: true, modelId: '', promptFile: '05_deai.md' },
  polish: { stage: 'polish', name: '锦上添花（润色精修）', enabled: true, modelId: '', promptFile: '06_polish.md' },
  title: { stage: 'title', name: '题签金石（候选书名）', enabled: true, modelId: '', promptFile: '07_title.md' }
}

export const useProjectStore = create<ProjectStoreState>((set, get) => {
  const toast = (msg: string) => useUiStore.getState().showToast(msg)

  const triggerHaptic = () => {
    try {
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(30)
      }
    } catch {
      // ignore
    }
  }

  return {
    projectList: [],
    currentProject: null,
    isGenerating: false,
    streamText: '',
    progress: null,
    isTitleSheetOpen: false,
    isWizardOpen: false,
    engineRef: null,

    init: () => {
      // 1. 读取所有保存的工作流项目
      const rawList = localStorage.getItem('novelflow:workflow:list')
      let list: Array<{ id: string; name: string; genre: string; createdAt: number }> = []
      if (rawList) {
        try {
          list = JSON.parse(rawList)
        } catch {
          list = []
        }
      }
      set({ projectList: list })

      // 2. 如果有当前项目则恢复
      const lastId = localStorage.getItem('novelflow:workflow:current_id')
      if (lastId) {
        get().openProject(lastId)
      } else if (list.length > 0) {
        get().openProject(list[0].id)
      }
    },

    openProject: (id: string) => {
      const p = vfs.getWorkflowProject(id)
      if (p) {
        set({ currentProject: p, streamText: '', progress: null })
        localStorage.setItem('novelflow:workflow:current_id', id)
      }
    },

    createProjectWithConfig: (config: StoryConfig) => {
      const newProj: Project = {
        id: config.id,
        name: config.name || `${config.genre}卷·${config.maleLead || '林沉'}传`,
        config,
        framework: null,
        chapters: [],
        characterState: {},
        titles: [],
        finalText: '',
        currentStage: 'framework',
        updatedAt: Date.now()
      }

      vfs.saveWorkflowProject(newProj)
      const list = get().projectList.filter((item) => item.id !== newProj.id)
      const updatedList = [
        { id: newProj.id, name: newProj.name, genre: newProj.config.genre, createdAt: newProj.config.createdAt },
        ...list
      ]
      set({
        projectList: updatedList,
        currentProject: newProj,
        isWizardOpen: false,
        streamText: '',
        progress: null
      })
      localStorage.setItem('novelflow:workflow:list', JSON.stringify(updatedList))
      localStorage.setItem('novelflow:workflow:current_id', newProj.id)
      toast(`卷册「${newProj.name}」已立卷，即将开笔`)
      return newProj
    },

    deleteProject: (id: string) => {
      const list = get().projectList.filter((x) => x.id !== id)
      set({ projectList: list })
      localStorage.setItem('novelflow:workflow:list', JSON.stringify(list))
      localStorage.removeItem(`novelflow:workflow:${id}`)
      if (get().currentProject?.id === id) {
        const next = list[0] ? vfs.getWorkflowProject(list[0].id) : null
        set({ currentProject: next })
        if (next) localStorage.setItem('novelflow:workflow:current_id', next.id)
        else localStorage.removeItem('novelflow:workflow:current_id')
      }
      toast('卷册已归档抹除')
    },

    updateCurrentProject: (patch: Partial<Project>) => {
      const cur = get().currentProject
      if (!cur) return
      const updated = { ...cur, ...patch, updatedAt: Date.now() }
      vfs.saveWorkflowProject(updated)
      set({ currentProject: updated })
    },

    setWizardOpen: (open: boolean) => set({ isWizardOpen: open }),
    setTitleSheetOpen: (open: boolean) => set({ isTitleSheetOpen: open }),

    stopWorkflow: () => {
      const eng = get().engineRef
      if (eng) {
        eng.cancel()
        set({ isGenerating: false, engineRef: null })
        toast('已驻笔凝思，当前进度已封卷存盘')
      }
    },

    runWorkflow: async () => {
      const cur = get().currentProject
      if (!cur) {
        toast('请先创立或打开卷册')
        return
      }
      if (get().isGenerating) {
        toast('天工墨引正在挥毫，请稍候...')
        return
      }

      const settings = useSettingsStore.getState().settings
      const stageModels = settings?.stageModels || {}
      const bannedWords = settings?.config?.bannedWords

      // 准备各阶段配置
      const stageConfigs: Record<StageType, StageConfig> = { ...DEFAULT_STAGES }
      for (const k of Object.keys(stageConfigs) as StageType[]) {
        stageConfigs[k] = {
          ...stageConfigs[k],
          modelId: stageModels[k] || ''
        }
      }

      // LLM 调用者封装
      const llmCaller = {
        callStream: async ({
          modelId,
          prompt,
          system,
          onDelta,
          signal
        }: {
          modelId?: string
          prompt: string
          system?: string
          onDelta: (delta: string, full: string) => void
          signal?: AbortSignal
        }) => {
          const creds = getCredentials(modelId || '')
          if (!creds || creds.protocol === 'local-demo') {
            return await demoStreamChat(prompt, onDelta, signal || new AbortController().signal)
          }

          const msgs: Array<{ role: 'system' | 'user'; content: string }> = []
          if (system) msgs.push({ role: 'system', content: system })
          msgs.push({ role: 'user', content: prompt })

          return await streamChat(creds, msgs, onDelta, {
            signal,
            connectTimeoutMs: 60000,
            idleTimeoutMs: 90000
          })
        }
      }

      // 节流流式更新 UI
      let lastRenderTime = 0
      let pendingFullText = ''
      let renderTimer: any = null

      const handleStreamUpdate = (fullText: string) => {
        pendingFullText = fullText
        const now = performance.now()
        if (now - lastRenderTime > 80) {
          lastRenderTime = now
          set({ streamText: fullText })
        } else if (!renderTimer) {
          renderTimer = setTimeout(() => {
            renderTimer = null
            lastRenderTime = performance.now()
            set({ streamText: pendingFullText })
          }, 80)
        }
      }

      const engine = new NovelWorkflowEngine({
        project: cur,
        stageConfigs,
        llmCaller,
        options: {
          bannedWords,
          chunkSize: 1000,
          maxRetries: 3
        },
        onProgress: (prog) => {
          set({ progress: prog })
        },
        onProjectUpdate: (updated) => {
          vfs.saveWorkflowProject(updated)
          set({ currentProject: { ...updated } })
        }
      })

      set({ isGenerating: true, engineRef: engine, streamText: '' })

      try {
        await engine.runPipeline(handleStreamUpdate)
        set({ isGenerating: false, engineRef: null, streamText: '' })
        triggerHaptic()
        toast('全卷创作完满！正文已定稿')
        // 自动弹出标题抽屉
        if (settings?.config?.autoShowTitleSheet !== false) {
          setTimeout(() => {
            set({ isTitleSheetOpen: true })
          }, 600)
        }
      } catch (err: any) {
        set({ isGenerating: false, engineRef: null })
        if (err.message?.includes('中止') || err.message?.includes('aborted')) {
          toast('生成已中止，进度已妥善存卷')
        } else {
          toast(`天工受阻：${err.message || '网络波动'}`)
        }
      }
    },

    generateTitles: async () => {
      const cur = get().currentProject
      if (!cur) return
      const settings = useSettingsStore.getState().settings
      const modelId = settings?.stageModels?.title || ''

      toast('正在甄选 8 款雅丽书名...')
      const llmCaller = {
        callStream: async ({ prompt, signal }: any) => {
          const creds = getCredentials(modelId)
          if (!creds || creds.protocol === 'local-demo') {
            return await demoStreamChat(prompt, () => {}, signal || new AbortController().signal)
          }
          return await streamChat(creds, [{ role: 'user', content: prompt }], () => {}, { signal })
        }
      }

      const stageConfigs: Record<StageType, StageConfig> = { ...DEFAULT_STAGES }
      const engine = new NovelWorkflowEngine({
        project: cur,
        stageConfigs,
        llmCaller
      })

      try {
        await engine.runTitleStage(new AbortController().signal)
        set({ currentProject: { ...cur } })
        vfs.saveWorkflowProject(cur)
        toast('新一组书名已题写完成')
        triggerHaptic()
      } catch (e: any) {
        toast(`题签受阻：${e.message || '异常'}`)
      }
    },

    copyFinalText: async () => {
      const cur = get().currentProject
      if (!cur || !cur.finalText) {
        toast('暂无定稿正文可复制')
        return false
      }
      try {
        await navigator.clipboard.writeText(cur.finalText)
        triggerHaptic()
        toast('已拓印全文纯文本至剪切板（无杂质）')
        return true
      } catch {
        toast('复制失败，请手动长按复制')
        return false
      }
    },

    exportFinalText: () => {
      const cur = get().currentProject
      if (!cur || !cur.finalText) {
        toast('尚无可导出的正文')
        return
      }
      const title = cur.name || '小说定稿'
      const blob = new Blob([cur.finalText], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title}.txt`
      a.click()
      URL.revokeObjectURL(url)
      triggerHaptic()
      toast(`已导出典籍「${title}.txt」`)
    }
  }
})
