/**
 * 跨端小说生成工作流引擎 (Workflow Engine)
 * 严格按照第一至九节规范实现：
 * - 阶段流转：框架(framework) → 计划(plan) → 正文初稿(draft) → 错别字(typo) → 去AI味(deai) → 润色(polish) → 纯文本定稿
 * - 支持逐章流式输出与节流渲染
 * - 长文本分块处理 (chunker)
 * - 指数退避重试 (最多 3 次，超时 90 秒)
 * - 随时取消与断点保存
 */

import {
  Chapter,
  ChapterPlanItem,
  CoreEngineOptions,
  FrameworkData,
  Project,
  StageConfig,
  StageType,
  TitleCandidate,
  WorkflowProgress
} from './types'
import { BUILTIN_PROMPTS, renderPrompt } from './prompts'
import { splitIntoChunks, mergeChunks } from './chunker'
import { cleanFinalNovelText, extractJsonFromResponse, extractArrayFromResponse } from './cleaner'
import { DEFAULT_DEAI_WORDS, formatBannedWordsPrompt } from './deai-words'

export type StreamCallback = (delta: string, full: string) => void

export interface LlmCaller {
  callStream: (params: {
    modelId?: string
    prompt: string
    system?: string
    onDelta: StreamCallback
    signal?: AbortSignal
  }) => Promise<string>
}

export class NovelWorkflowEngine {
  private project: Project
  private stageConfigs: Record<StageType, StageConfig>
  private llmCaller: LlmCaller
  private options: CoreEngineOptions
  private abortController: AbortController | null = null
  private onProgress?: (p: WorkflowProgress) => void
  private onProjectUpdate?: (p: Project) => void

  constructor(params: {
    project: Project
    stageConfigs: Record<StageType, StageConfig>
    llmCaller: LlmCaller
    options?: CoreEngineOptions
    onProgress?: (p: WorkflowProgress) => void
    onProjectUpdate?: (p: Project) => void
  }) {
    this.project = params.project
    this.stageConfigs = params.stageConfigs
    this.llmCaller = params.llmCaller
    this.options = {
      bannedWords: DEFAULT_DEAI_WORDS,
      timeoutMs: 90000,
      maxRetries: 3,
      chunkSize: 1000,
      ...params.options
    }
    this.onProgress = params.onProgress
    this.onProjectUpdate = params.onProjectUpdate
  }

  public cancel(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  private notifyUpdate(): void {
    this.project.updatedAt = Date.now()
    this.onProjectUpdate?.(this.project)
  }

  private notifyProgress(stage: StageType, stageName: string, pct: number, msg: string, chapterIdx?: number, totalChap?: number) {
    this.project.currentStage = stage
    this.onProgress?.({
      stage,
      stageName,
      chapterIndex: chapterIdx,
      totalChapters: totalChap,
      percentage: Math.min(100, Math.max(0, pct)),
      message: msg
    })
  }

  /**
   * 带指数退避与超时的重试执行包装器
   */
  private async executeWithRetry<T>(
    fn: (attempt: number) => Promise<T>,
    stageName: string
  ): Promise<T> {
    const maxRetries = this.options.maxRetries || 3
    let lastError: any = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (this.abortController?.signal.aborted) {
        throw new Error('用户已中止生成')
      }
      try {
        return await fn(attempt)
      } catch (err: any) {
        lastError = err
        if (this.abortController?.signal.aborted) throw err
        if (attempt < maxRetries) {
          const delay = Math.min(10000, 1500 * Math.pow(2, attempt - 1))
          this.notifyProgress(
            this.project.currentStage || 'draft',
            stageName,
            0,
            `第 ${attempt} 次执行受阻，${Math.round(delay / 1000)}秒后重试 (${err.message || '网络波动'})...`
          )
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }
    throw new Error(`${stageName} 阶段连续 ${maxRetries} 次失败: ${lastError?.message || '未知异常'}`)
  }

  /**
   * 执行完整流水线（支持从断点阶段继续）
   */
  public async runPipeline(onStreamText?: (text: string) => void): Promise<Project> {
    this.abortController = new AbortController()
    const signal = this.abortController.signal

    try {
      // 阶段 1：故事框架
      if (!this.project.framework && this.stageConfigs.framework.enabled) {
        await this.runFrameworkStage(signal, onStreamText)
      }

      // 阶段 2：章节计划
      if (this.project.chapters.length === 0 && this.stageConfigs.plan.enabled) {
        await this.runPlanStage(signal, onStreamText)
      }

      // 阶段 3-6：逐章创作、错字校勘、去AI味、润色
      const totalChapters = this.project.chapters.length
      for (let i = 0; i < totalChapters; i++) {
        const chapter = this.project.chapters[i]
        await this.runChapterPipeline(chapter, i, totalChapters, signal, onStreamText)
      }

      // 阶段 7：生成纯文本最终正文
      this.compileFinalText()

      // 标题生成（如果尚未生成）
      if (this.project.titles.length === 0 && this.stageConfigs.title.enabled) {
        await this.runTitleStage(signal)
      }

      this.notifyProgress('title', '完卷大吉', 100, '全书创作与润色已完成，可一键拓印正文')
      return this.project
    } finally {
      this.abortController = null
    }
  }

  /**
   * 阶段 ①：故事框架 (framework)
   */
  public async runFrameworkStage(signal: AbortSignal, onStream?: (s: string) => void): Promise<FrameworkData> {
    this.notifyProgress('framework', '构筑纲骨', 10, '正在以文心推演世界观与人物设定...')
    const cfg = this.project.config
    const promptTpl = BUILTIN_PROMPTS['01_framework.md']
    const prompt = renderPrompt(promptTpl, {
      genre: cfg.genre,
      style: cfg.style.join('、'),
      male_lead: cfg.maleLead || '林沉',
      female_lead: cfg.femaleLead || '苏晚',
      idea: cfg.idea || '由天工文思自行演化绝妙故事'
    })

    const raw = await this.executeWithRetry(async () => {
      return await this.llmCaller.callStream({
        modelId: this.stageConfigs.framework.modelId,
        prompt,
        signal,
        onDelta: (_delta, full) => onStream?.(full)
      })
    }, '故事框架')

    const parsedObj = extractJsonFromResponse<any>(raw, null)
    const rawFw = parsedObj?.framework || parsedObj?.data || parsedObj || {}

    const framework: FrameworkData = {
      title_suggestion: rawFw.title_suggestion || `${cfg.genre}卷·${cfg.maleLead || '林沉'}记`,
      world_setting: rawFw.world_setting || '乾坤广大，风云暗涌。',
      male_lead: {
        name: rawFw.male_lead?.name || cfg.maleLead || '林沉',
        identity: rawFw.male_lead?.identity || '主角',
        personality: rawFw.male_lead?.personality || '坚韧孤傲',
        goal: rawFw.male_lead?.goal || '破开宿命迷局',
        flaw: rawFw.male_lead?.flaw || '过刚易折'
      },
      female_lead: {
        name: rawFw.female_lead?.name || cfg.femaleLead || '苏晚',
        identity: rawFw.female_lead?.identity || '女主',
        personality: rawFw.female_lead?.personality || '灵慧如玉',
        goal: rawFw.female_lead?.goal || '护佑心中所念',
        flaw: rawFw.female_lead?.flaw || '情深不寿'
      },
      supporting_characters: Array.isArray(rawFw.supporting_characters) ? rawFw.supporting_characters : [],
      core_conflict: rawFw.core_conflict || '宿命枷锁与个体意志之争',
      plot_outline: {
        qi: rawFw.plot_outline?.qi || '风起微末，主角登场',
        cheng: rawFw.plot_outline?.cheng || '拨云见日，矛盾升级',
        zhuan: rawFw.plot_outline?.zhuan || '绝处逢生，重大转折',
        he: rawFw.plot_outline?.he || '终局定鼎，尘埃落定'
      },
      ending_direction: rawFw.ending_direction || '荡气回肠，余韵悠长'
    }

    this.project.framework = framework
    if (framework.title_suggestion && (!this.project.name || this.project.name === '新作品')) {
      this.project.name = framework.title_suggestion
    }
    this.notifyUpdate()
    return framework
  }

  /**
   * 阶段 ②：章节计划 (plan)
   */
  public async runPlanStage(signal: AbortSignal, onStream?: (s: string) => void): Promise<Chapter[]> {
    this.notifyProgress('plan', '布设机杼', 25, '正在厘定章节脉络与悬念扣子...')
    const cfg = this.project.config
    const lengthMap = {
      short: '短篇小说（全篇约3000字，规划 2-3 章）',
      medium: '中篇佳作（全篇约10000字，规划 4-6 章）',
      chapters: '连载长卷（每章约2000字，规划 5-8 章起首卷）'
    }

    const fw = this.project.framework
    const fwDesc = fw
      ? `【故事世界观】${fw.world_setting}\n【核心矛盾】${fw.core_conflict}\n【起承转合】起：${fw.plot_outline?.qi}；承：${fw.plot_outline?.cheng}；转：${fw.plot_outline?.zhuan}；合：${fw.plot_outline?.he}`
      : '乾坤浩瀚，风云汇聚。'

    const promptTpl = BUILTIN_PROMPTS['02_plan.md']
    const prompt = renderPrompt(promptTpl, {
      framework_desc: fwDesc,
      male_lead: cfg.maleLead || '林沉',
      female_lead: cfg.femaleLead || '苏晚',
      idea: cfg.idea || '由天工文思自行演化绝妙故事',
      length_desc: lengthMap[cfg.length] || lengthMap.short
    })

    const raw = await this.executeWithRetry(async () => {
      return await this.llmCaller.callStream({
        modelId: this.stageConfigs.plan.modelId,
        prompt,
        signal,
        onDelta: (_delta, full) => onStream?.(full)
      })
    }, '章节计划')

    const fallbackItems: ChapterPlanItem[] = [
      {
        index: 1,
        title: '第一章 惊澜初起',
        target: '主角入局，命运交错',
        key_events: `宿命相逢，围绕主角「${cfg.maleLead || '林沉'}」的暗线伏笔`,
        characters: [cfg.maleLead || '林沉', cfg.femaleLead || '苏晚'],
        hook: '暗夜中一柄带露长剑霍然出鞘'
      },
      {
        index: 2,
        title: '第二章 迷雾藏机',
        target: '揭开真相一角，危机骤临',
        key_events: `勘破端倪，主角「${cfg.maleLead || '林沉'}」身陷重围`,
        characters: [cfg.maleLead || '林沉'],
        hook: '原来一切早在局中'
      },
      {
        index: 3,
        title: '第三章 剑破乾坤',
        target: '终局决战，尘埃落定',
        key_events: `破釜沉舟，主角「${cfg.maleLead || '林沉'}」真相大白`,
        characters: [cfg.maleLead || '林沉', cfg.femaleLead || '苏晚'],
        hook: '烟波江上，故人回眸'
      }
    ]

    const extracted = extractArrayFromResponse<ChapterPlanItem>(raw, fallbackItems)
    const items = Array.isArray(extracted) && extracted.length > 0 ? extracted : fallbackItems

    this.project.chapters = items.map((item, idx) => ({
      index: typeof item.index === 'number' ? item.index : idx + 1,
      title: item.title || `第 ${idx + 1} 章`,
      plan: `【目标】${item.target || '主线推进'}\n【事件】${item.key_events || '核心冲突'}\n【扣子】${item.hook || '悬念待解'}`,
      planMeta: item,
      status: 'pending'
    }))

    this.notifyUpdate()
    return this.project.chapters
  }

  /**
   * 阶段 ③-⑥：单章流转
   */
  private async runChapterPipeline(
    chapter: Chapter,
    idx: number,
    total: number,
    signal: AbortSignal,
    onStream?: (s: string) => void
  ): Promise<void> {
    const cfg = this.project.config
    const chapterName = chapter.title || `第 ${idx + 1} 章`
    const basePct = 25 + Math.floor((idx / total) * 65)

    // ③ 正文初稿
    if (!chapter.draft) {
      chapter.status = 'running'
      this.notifyProgress('draft', '秉烛挥毫', basePct, `正在执笔创作「${chapterName}」...`, idx + 1, total)

      // 提取滚动前情摘要（前一章的摘要）
      const prevSummary =
        idx > 0 && this.project.chapters[idx - 1]?.summary
          ? this.project.chapters[idx - 1].summary!
          : `开篇第一章，主角「${cfg.maleLead || '林沉'}」正式步入故事舞台。`

      const charStates = Object.entries(this.project.characterState)
        .map(([k, v]) => `${k}：${v}`)
        .join('； ') || `主角「${cfg.maleLead || '林沉'}」心境沉着，蓄势待发。`

      const promptTpl = BUILTIN_PROMPTS['03_draft.md']
      const prompt = renderPrompt(promptTpl, {
        male_lead: cfg.maleLead || '林沉',
        female_lead: cfg.femaleLead || '苏晚',
        idea: cfg.idea || '紧扣设定展开精彩故事',
        world_setting: this.project.framework?.world_setting || '乾坤广大，风云暗涌',
        previous_summary: prevSummary,
        character_states: charStates,
        chapter_plan: chapter.plan,
        chapter_index: String(idx + 1)
      })

      const draft = await this.executeWithRetry(async () => {
        return await this.llmCaller.callStream({
          modelId: this.stageConfigs.draft.modelId,
          prompt,
          signal,
          onDelta: (_delta, full) => onStream?.(full)
        })
      }, `正文初稿-${chapterName}`)

      chapter.draft = draft
      chapter.summary = draft.slice(0, 180) + '...'
      if (this.project.config.maleLead) {
        this.project.characterState[this.project.config.maleLead] = `经历${chapterName}事件后，心志愈坚`
      }
      this.notifyUpdate()
    }

    let workingText = chapter.draft

    // ④ 错别字检查
    if (this.stageConfigs.typo.enabled && !chapter.typoFixed) {
      this.notifyProgress('typo', '校勘厘正', basePct + 2, `正在校对「${chapterName}」错讹字句...`, idx + 1, total)
      workingText = await this.processInChunks(
        workingText,
        '04_typo.md',
        { male_lead: cfg.maleLead || '林沉', female_lead: cfg.femaleLead || '苏晚' },
        signal,
        this.stageConfigs.typo.modelId
      )
      chapter.typoFixed = workingText
      this.notifyUpdate()
    } else if (chapter.typoFixed) {
      workingText = chapter.typoFixed
    }

    // ⑤ 去 AI 味
    if (this.stageConfigs.deai.enabled && !chapter.deai) {
      this.notifyProgress('deai', '洗练铅华', basePct + 4, `正在拂拭「${chapterName}」陈套虚浮之气...`, idx + 1, total)
      const bannedPrompt = formatBannedWordsPrompt(this.options.bannedWords || DEFAULT_DEAI_WORDS)
      workingText = await this.processInChunks(
        workingText,
        '05_deai.md',
        {
          banned_words: bannedPrompt,
          male_lead: cfg.maleLead || '林沉',
          female_lead: cfg.femaleLead || '苏晚'
        },
        signal,
        this.stageConfigs.deai.modelId
      )
      chapter.deai = workingText
      this.notifyUpdate()
    } else if (chapter.deai) {
      workingText = chapter.deai
    }

    // ⑥ 润色
    if (this.stageConfigs.polish.enabled && !chapter.polished) {
      this.notifyProgress('polish', '文气点金', basePct + 6, `正在对「${chapterName}」雕琢文风气韵...`, idx + 1, total)
      workingText = await this.processInChunks(
        workingText,
        '06_polish.md',
        {
          style: this.project.config.style.join('、'),
          male_lead: cfg.maleLead || '林沉',
          female_lead: cfg.femaleLead || '苏晚'
        },
        signal,
        this.stageConfigs.polish.modelId
      )
      chapter.polished = workingText
      this.notifyUpdate()
    } else if (chapter.polished) {
      workingText = chapter.polished
    }

    chapter.status = 'done'
    this.notifyUpdate()
  }

  /**
   * 分块处理辅助方法（适用于 typo, deai, polish）
   */
  private async processInChunks(
    text: string,
    promptFile: string,
    extraVars: Record<string, string>,
    signal: AbortSignal,
    modelId?: string
  ): Promise<string> {
    const chunks = splitIntoChunks(text, this.options.chunkSize || 1000)
    if (chunks.length === 0) return text

    const results: Array<{ text: string }> = []
    const promptTpl = BUILTIN_PROMPTS[promptFile]

    for (let i = 0; i < chunks.length; i++) {
      if (signal.aborted) throw new Error('用户已中止生成')
      const chunk = chunks[i]
      const prompt = renderPrompt(promptTpl, {
        ...extraVars,
        content_chunk: chunk.text
      })

      const processedChunk = await this.executeWithRetry(async () => {
        return await this.llmCaller.callStream({
          modelId,
          prompt,
          signal,
          onDelta: () => {}
        })
      }, `${promptFile}-分块${i + 1}/${chunks.length}`)

      results.push({ text: processedChunk })
    }

    return mergeChunks(results)
  }

  /**
   * 最终文本拼装与净化
   */
  public compileFinalText(): string {
    const chapters = this.project.chapters
    const fullBuffer: string[] = []

    for (const c of chapters) {
      const bestText = c.polished || c.deai || c.typoFixed || c.draft || ''
      if (bestText) {
        const titleLine = c.title ? `【${c.title}】` : `【第 ${c.index} 章】`
        fullBuffer.push(titleLine + '\n\n' + bestText)
      }
    }

    const rawCombined = fullBuffer.join('\n\n\n')
    const cleaned = cleanFinalNovelText(rawCombined)
    this.project.finalText = cleaned
    this.notifyUpdate()
    return cleaned
  }

  /**
   * 阶段：标题生成（8个候选标题）
   */
  public async runTitleStage(signal: AbortSignal): Promise<TitleCandidate[]> {
    this.notifyProgress('title', '题签定名', 95, '正在为全卷量身题写雅丽书名...')
    const text = this.project.finalText || ''
    const frontSnippet = text.slice(0, 800)
    const tailSnippet = text.slice(-300)
    const summary = `【开篇】${frontSnippet}\n\n【收尾】${tailSnippet}`

    const promptTpl = BUILTIN_PROMPTS['07_title.md']
    const prompt = renderPrompt(promptTpl, {
      genre: this.project.config.genre,
      style: this.project.config.style.join('、'),
      male_lead: this.project.config.maleLead || '林沉',
      female_lead: this.project.config.femaleLead || '苏晚',
      summary
    })

    const raw = await this.executeWithRetry(async () => {
      return await this.llmCaller.callStream({
        modelId: this.stageConfigs.title.modelId,
        prompt,
        signal,
        onDelta: () => {}
      })
    }, '标题生成')

    const fallbackTitles = [
      { title: '一砚梨花雨', type: '诗意文艺型', pitch: '墨染梨花，情深缘浅' },
      { title: '问剑青云巅', type: '爆点爽意型', pitch: '一剑破万法，快意恩仇' },
      { title: '大乾镇妖录', type: '直白破题型', pitch: '斩妖除魔，步步为营' },
      { title: '雾中回眸客', type: '悬念引人型', pitch: '层层剥茧，反转惊心' },
      { title: '长风踏歌行', type: '诗意文艺型', pitch: '纵马江湖，快哉平生' },
      { title: '天机不可泄', type: '悬念引人型', pitch: '算尽天机，唯漏一心' },
      { title: '绝品炼气士', type: '爆点爽意型', pitch: '扮猪吃虎，横推八荒' },
      { title: '沉晚辞归路', type: '直白破题型', pitch: '双星辉映，宿命同舟' }
    ]

    const extractedList = extractArrayFromResponse<any>(raw, fallbackTitles)
    const list = Array.isArray(extractedList) && extractedList.length > 0 ? extractedList : fallbackTitles

    const candidates: TitleCandidate[] = list.map((item, idx) => ({
      id: `title-${idx + 1}-${Date.now()}`,
      title: item.title || `候选书名${idx + 1}`,
      type: item.type || '典雅型',
      pitch: item.pitch || '扣人心弦'
    }))

    this.project.titles = candidates
    this.notifyUpdate()
    return candidates
  }
}
