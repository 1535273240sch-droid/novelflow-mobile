/**
 * 文本自然段落分块器与合并器
 * 满足说明书第四至七节及手机端专属性能约束：
 * - 优先按自然段（\n\n 或 \n）完整切分，防止把句子截断
 * - 分块大小可配（默认 1000 - 1500 字）
 * - 块间非重叠，保持自然段落边界
 */

export interface TextChunk {
  index: number
  total: number
  text: string
  charCount: number
}

export function splitIntoChunks(text: string, maxChunkSize = 1200): TextChunk[] {
  if (!text || text.trim().length === 0) {
    return []
  }

  // 按换行拆分段落
  const rawParagraphs = text.split(/\r?\n/)
  const chunks: string[] = []
  let currentBuffer: string[] = []
  let currentLength = 0

  for (const para of rawParagraphs) {
    const paraLen = para.length + 1
    // 如果单个段落极其巨大（超标），按句号等断句符号二次拆分
    if (paraLen > maxChunkSize) {
      if (currentBuffer.length > 0) {
        chunks.push(currentBuffer.join('\n'))
        currentBuffer = []
        currentLength = 0
      }
      const sentenceParts = para.match(/[^。！？!?]+[。！？!?]?/g) || [para]
      let subBuffer: string[] = []
      let subLen = 0
      for (const sent of sentenceParts) {
        if (subLen + sent.length > maxChunkSize && subBuffer.length > 0) {
          chunks.push(subBuffer.join(''))
          subBuffer = []
          subLen = 0
        }
        subBuffer.push(sent)
        subLen += sent.length
      }
      if (subBuffer.length > 0) {
        chunks.push(subBuffer.join(''))
      }
      continue
    }

    if (currentLength + paraLen > maxChunkSize && currentBuffer.length > 0) {
      chunks.push(currentBuffer.join('\n'))
      currentBuffer = [para]
      currentLength = paraLen
    } else {
      currentBuffer.push(para)
      currentLength += paraLen
    }
  }

  if (currentBuffer.length > 0) {
    chunks.push(currentBuffer.join('\n'))
  }

  return chunks.map((chunk, idx) => ({
    index: idx,
    total: chunks.length,
    text: chunk,
    charCount: chunk.length
  }))
}

export function mergeChunks(chunks: Array<{ text: string }>): string {
  return chunks.map((c) => c.text.trim()).filter(Boolean).join('\n\n')
}
