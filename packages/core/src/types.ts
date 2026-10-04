/**
 * NovelFlow 核心数据结构与契约
 * 严格按照《小说生成工作流软件执行说明书》第六节规范构建
 */

export type NovelGenre =
  | '都市'
  | '玄幻'
  | '仙侠'
  | '言情'
  | '悬疑'
  | '科幻'
  | '历史'
  | '末世'
  | '校园'
  | string

export type NovelStyle =
  | '轻松幽默'
  | '热血爽文'
  | '细腻文艺'
  | '暗黑压抑'
  | '甜宠'
  | '烧脑反转'
  | string

export type NovelLength = 'short' | 'medium' | 'chapters'

export interface StoryConfig {
  id: string
  name: string
  genre: NovelGenre
  style: NovelStyle[]
  maleLead: string
  femaleLead: string
  idea?: string
  length: NovelLength
  createdAt: number
}

export interface ModelProfile {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  model: string
  temperature?: number
  isDefault?: boolean
}

export type StageType =
  | 'framework'
  | 'plan'
  | 'draft'
  | 'typo'
  | 'deai'
  | 'polish'
  | 'title'

export interface StageConfig {
  stage: StageType
  name: string
  enabled: boolean
  modelId: string
  promptFile: string
}

export interface FrameworkData {
  title_suggestion?: string
  world_setting: string
  male_lead: {
    name: string
    identity?: string
    personality: string
    goal: string
    flaw?: string
  }
  female_lead: {
    name: string
    identity?: string
    personality: string
    goal: string
    flaw?: string
  }
  supporting_characters?: Array<{
    name: string
    role: string
    trait: string
  }>
  core_conflict: string
  plot_outline: {
    qi: string
    cheng: string
    zhuan: string
    he: string
  }
  ending_direction: string
}

export interface ChapterPlanItem {
  index: number
  title: string
  target: string
  key_events: string
  characters: string[]
  hook: string
}

export interface TypoCorrectionItem {
  original: string
  fixed: string
  reason?: string
}

export interface Chapter {
  index: number
  title?: string
  plan: string
  planMeta?: ChapterPlanItem
  draft?: string
  typoFixed?: string
  typoChanges?: TypoCorrectionItem[]
  deai?: string
  polished?: string
  summary?: string
  status: 'pending' | 'running' | 'done' | 'error'
  error?: string
}

export interface TitleCandidate {
  id: string
  title: string
  type: string // 直白型 | 悬念型 | 文艺型 | 爽点型
  pitch: string // 10字以内卖点
}

export interface Project {
  id: string
  name: string
  config: StoryConfig
  framework?: FrameworkData | null
  chapters: Chapter[]
  characterState: Record<string, string>
  titles: TitleCandidate[]
  finalText?: string
  currentStage?: StageType
  updatedAt: number
}

export interface WorkflowProgress {
  stage: StageType
  stageName: string
  chapterIndex?: number
  totalChapters?: number
  chunkIndex?: number
  totalChunks?: number
  percentage: number
  message: string
}

export interface CoreEngineOptions {
  bannedWords?: string[]
  timeoutMs?: number
  maxRetries?: number
  chunkSize?: number
}
