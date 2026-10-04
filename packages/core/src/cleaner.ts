/**
 * 输出文本净化与清洗工具
 * 严格执行说明书第七节第7条与第四条验收标准：
 * - 剥离“好的，以下是……”、“为您生成如下正文：”等客套开场与尾部说明
 * - 剥离 Markdown 标题符（#、##）、代码围栏（```、```markdown）
 * - 剥离章节外多余作者碎碎念
 * - 保持正文缩进与纯净文本段落
 * - 超强容错的 JSON 提取与数组安全解包
 */

export function cleanFinalNovelText(rawText: string): string {
  if (!rawText) return ''

  let text = rawText

  // 1. 移除 markdown 代码块围栏
  text = text.replace(/```[a-zA-Z]*\r?\n?/g, '').replace(/```\r?\n?/g, '')

  // 2. 剥离常见的大模型开场白与结尾陈词
  const prefixes = [
    /^(好的[，,！!]?)?(以下是|为您呈现|这是为您创作的|根据您的要求|我已经为您生成|续写如下)[^\n]*\n+/i,
    /^(当然可以[，,！!]?)[^\n]*\n+/i,
    /^(这是一篇关于[^\n]+的小说[：:]?)\n+/i,
    /^(请查收[^\n]*)\n+/i
  ]
  for (const prefix of prefixes) {
    text = text.replace(prefix, '')
  }

  const suffixes = [
    /\n+(希望您喜欢[^\n]*|以上就是[^\n]*|如果您需要修改[^\n]*|未完待续[，,]?敬请期待[^\n]*|如需进一步润色[^\n]*).*$/is,
    /\n+(本章完|（全剧终）|（完）|—— 完 ——)\s*$/i
  ]
  for (const suffix of suffixes) {
    text = text.replace(suffix, '')
  }

  // 3. 移除 Markdown 标题标记（#、##、###）与粗体（**）
  text = text
    .split('\n')
    .map((line) => {
      let l = line.trim()
      // 移除开头的 markdown 标题符
      l = l.replace(/^#{1,6}\s+/, '')
      // 移除加粗与斜体标记
      l = l.replace(/\*\*([^*]+)\*\*/g, '$1')
      l = l.replace(/\*([^*]+)\*/g, '$1')
      l = l.replace(/__([^_]+)__/g, '$1')
      return l
    })
    .join('\n')

  // 4. 段落整理：规范换行，确保每段之间有清晰空行，段内无奇怪首行空格
  const paragraphs = text
    .split(/\r?\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  return paragraphs.map((p) => `    ${p.replace(/^[\s　]+/, '')}`).join('\n\n')
}

/**
 * 健壮提取 JSON 对象
 */
export function extractJsonFromResponse<T = any>(rawText: string, fallback?: T): T {
  if (!rawText) return fallback as T
  try {
    return JSON.parse(rawText.trim())
  } catch {
    // 匹配代码块中的 json
    const blockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (blockMatch && blockMatch[1]) {
      try {
        return JSON.parse(blockMatch[1].trim())
      } catch {
        // continue
      }
    }

    // 匹配 { ... }
    const firstBrace = rawText.indexOf('{')
    const lastBrace = rawText.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(rawText.substring(firstBrace, lastBrace + 1))
      } catch {
        // continue
      }
    }

    // 匹配 [ ... ]
    const firstBracket = rawText.indexOf('[')
    const lastBracket = rawText.lastIndexOf(']')
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      try {
        return JSON.parse(rawText.substring(firstBracket, lastBracket + 1))
      } catch {
        // continue
      }
    }

    return fallback as T
  }
}

/**
 * 专为章节计划、标题列表等设计的超强容错数组提取器
 * 绝对保证返回 Array 实例，彻底杜绝 .map is not a function 异常！
 */
export function extractArrayFromResponse<T = any>(rawText: string, fallback: T[] = []): T[] {
  if (!rawText) return fallback

  let parsed: any = null

  // 1. 优先尝试直接在文本中截取 [ ... ] 数组
  const firstBracket = rawText.indexOf('[')
  const lastBracket = rawText.lastIndexOf(']')
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try {
      const arr = JSON.parse(rawText.substring(firstBracket, lastBracket + 1))
      if (Array.isArray(arr) && arr.length > 0) {
        return arr
      }
    } catch {
      // continue
    }
  }

  // 2. 尝试常规 JSON 解析
  parsed = extractJsonFromResponse(rawText, null)

  // 3. 如果直接是数组
  if (Array.isArray(parsed) && parsed.length > 0) {
    return parsed
  }

  // 4. 如果大模型用对象包裹了数组，例如 { "chapters": [...] }, { "plan": [...] }, { "titles": [...] }
  if (parsed && typeof parsed === 'object') {
    const candidateKeys = [
      'chapters',
      'plan',
      'items',
      'titles',
      'candidates',
      'data',
      'list',
      'sections',
      'outline'
    ]
    for (const key of candidateKeys) {
      if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
        return parsed[key]
      }
    }

    // 遍历所有键值，看哪个值是数组
    for (const val of Object.values(parsed)) {
      if (Array.isArray(val) && val.length > 0) {
        return val as T[]
      }
    }

    // 如果对象是键值对列表形如 { "1": {...}, "2": {...} }
    const vals = Object.values(parsed)
    if (vals.length > 0 && vals.every((v) => typeof v === 'object' && v !== null)) {
      return vals as T[]
    }
  }

  return fallback
}
