/** 密钥脱敏提示（移植自桌面版）：生成给 UI 展示的密钥提示，绝不返回明文。 */
export function maskKey(key: string | null | undefined): string {
  if (!key) return ''
  if (key.length <= 8) return '***'
  return `${key.slice(0, 3)}***${key.slice(-4)}`
}
