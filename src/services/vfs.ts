import type { FileEntry, ProjectBackup, ProjectInfo } from '../shared/types'
import { BIBLE_FILES, characterTemplate, novelJson, STATE_TEMPLATES, type NovelMeta } from './templates'

/**
 * 设备内虚拟项目文件系统（localStorage 持久化）：
 * 手机没有桌面版的“系统文件夹选择”，这里把「项目 = 一个文件夹」映射为
 * 本机存储里的一个键空间（novel.json + bible/ + outline/ + chapters/ + state/）。
 * 结构、路径、命名与桌面版完全一致，导出的备份可直接人工阅读/迁移。
 */

const LS_PROJECTS = 'novelflow:projects'
const LS_CURRENT = 'novelflow:current'
const projectKey = (id: string) => `novelflow:project:${id}`

interface StoredProject {
  info: ProjectInfo
  files: Record<string, string>
}

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function lsSet(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

function readStored(id: string): StoredProject | null {
  return lsGet<StoredProject | null>(projectKey(id), null)
}

function writeStored(st: StoredProject): void {
  lsSet(projectKey(st.info.id), st)
}

const workflowProjectKey = (id: string) => `novelflow:workflow:${id}`

export function saveWorkflowProject(p: any): void {
  lsSet(workflowProjectKey(p.id), p)
}

export function getWorkflowProject(id: string): any | null {
  return lsGet<any | null>(workflowProjectKey(id), null)
}

export function listProjects(): ProjectInfo[] {
  return lsGet<ProjectInfo[]>(LS_PROJECTS, []).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  )
}

export function getCurrentProjectId(): string | null {
  return lsGet<string | null>(LS_CURRENT, null)
}

export function setCurrentProjectId(id: string | null): void {
  if (id === null) localStorage.removeItem(LS_CURRENT)
  else lsSet(LS_CURRENT, id)
}

export function newId(): string {
  return `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/** 新建项目：生成与桌面版一致的标准目录结构 */
export function createProject(meta: { name?: string; genre?: string; targetWords?: number }): ProjectInfo {
  const name = meta.name?.trim() || '未命名小说'
  const info: ProjectInfo = {
    id: newId(),
    name,
    genre: meta.genre?.trim() ?? '',
    targetWords: meta.targetWords ?? 1_000_000,
    createdAt: new Date().toISOString()
  }
  const files: Record<string, string> = {}
  files['novel.json'] = JSON.stringify(novelJson(name, info.genre, info.targetWords), null, 2)
  for (const f of BIBLE_FILES) files[`bible/${f.name}`] = f.content
  // 桌面版会创建 bible/02-人物 目录；这里放入一个主角模板文件，保证人物区非空可用
  files['bible/02-人物/主角.md'] = characterTemplate('主角')
  for (const [fileName, value] of Object.entries(STATE_TEMPLATES)) {
    files[`state/${fileName}`] = JSON.stringify(value, null, 2)
  }
  writeStored({ info, files })
  const projects = lsGet<ProjectInfo[]>(LS_PROJECTS, [])
  projects.push(info)
  lsSet(LS_PROJECTS, projects)
  return info
}

export function deleteProject(id: string): void {
  localStorage.removeItem(projectKey(id))
  lsSet(
    LS_PROJECTS,
    lsGet<ProjectInfo[]>(LS_PROJECTS, []).filter((p) => p.id !== id)
  )
  if (getCurrentProjectId() === id) setCurrentProjectId(null)
}

export function updateProjectInfo(id: string, patch: Partial<Pick<ProjectInfo, 'name' | 'genre' | 'targetWords'>>): ProjectInfo | null {
  const st = readStored(id)
  if (!st) return null
  st.info = { ...st.info, ...patch }
  writeStored(st)
  const projects = lsGet<ProjectInfo[]>(LS_PROJECTS, []).map((p) => (p.id === id ? st.info : p))
  lsSet(LS_PROJECTS, projects)
  return st.info
}

/** 项目内相对路径守卫：禁止逃出项目根 */
function safeRel(relPath: string): string {
  const p = relPath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (p.includes('../') || p.startsWith('/')) throw new Error(`非法路径：${relPath}`)
  return p
}

/** 列出项目内相对目录（与桌面版 ProjectStore.listDir 同语义：目录在前，zh-CN 排序，隐藏 . 开头） */
export function listDir(id: string, relDir: string): FileEntry[] {
  const st = readStored(id)
  if (!st) return []
  const prefix = relDir.replace(/\/+$/, '')
  const names = new Set<string>()
  const isDir = new Set<string>()
  for (const path of Object.keys(st.files)) {
    if (path.startsWith('.')) continue
    if (prefix && !path.startsWith(`${prefix}/`)) continue
    const rest = prefix ? path.slice(prefix.length + 1) : path
    const slash = rest.indexOf('/')
    if (slash >= 0) {
      names.add(rest.slice(0, slash))
      isDir.add(rest.slice(0, slash))
    } else {
      names.add(rest)
    }
  }
  const entries: FileEntry[] = []
  for (const name of names) {
    const path = prefix ? `${prefix}/${name}` : name
    entries.push({ name, path, type: isDir.has(name) ? 'dir' : 'file' })
  }
  entries.sort((a, b) =>
    a.type === b.type ? a.name.localeCompare(b.name, 'zh-CN') : a.type === 'dir' ? -1 : 1
  )
  return entries
}

export function readRel(id: string, relPath: string): string {
  const st = readStored(id)
  if (!st) throw new Error('项目不存在')
  const p = safeRel(relPath)
  if (!(p in st.files)) throw new Error(`文件不存在：${relPath}`)
  return st.files[p]
}

export function writeRel(id: string, relPath: string, content: string): void {
  const st = readStored(id)
  if (!st) throw new Error('项目不存在')
  st.files[safeRel(relPath)] = content
  // 同步 novel.json 的 updatedAt（等价桌面版的元数据维护）
  if (relPath !== 'novel.json' && 'novel.json' in st.files) {
    try {
      const meta = JSON.parse(st.files['novel.json']) as NovelMeta
      meta.updatedAt = new Date().toISOString()
      st.files['novel.json'] = JSON.stringify(meta, null, 2)
    } catch {
      // novel.json 损坏时不动它
    }
  }
  writeStored(st)
}

function chapterFileName(n: number): string {
  return `第${String(n).padStart(3, '0')}章.md`
}

function nextChapterNumber(st: StoredProject, kind: 'chapters' | 'outline'): number {
  let max = 0
  for (const path of Object.keys(st.files)) {
    const m = path.match(new RegExp(`^${kind}/第(\\d+)章\\.md$`))
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return max + 1
}

/** 在 chapters/ 或 outline/ 下确定下一个章号并新建文件，返回相对路径 */
export function createChapter(id: string, kind: 'chapters' | 'outline'): string {
  const st = readStored(id)
  if (!st) throw new Error('项目不存在')
  const rel = `${kind}/${chapterFileName(nextChapterNumber(st, kind))}`
  writeRel(id, rel, '')
  return rel
}

export function getProjectInfo(id: string): ProjectInfo | null {
  return readStored(id)?.info ?? null
}

/** 导出项目备份：novel.json 元数据 + 全部文件（等价桌面版整个项目文件夹） */
export function exportProject(id: string): ProjectBackup | null {
  const st = readStored(id)
  if (!st) return null
  return {
    format: 'novelflow-project-backup',
    version: 1,
    project: {
      name: st.info.name,
      genre: st.info.genre,
      targetWords: st.info.targetWords,
      createdAt: st.info.createdAt
    },
    files: { ...st.files },
    exportedAt: new Date().toISOString()
  }
}

/** 导入项目备份：生成新项目（不覆盖已有项目） */
export function importProject(backup: ProjectBackup): ProjectInfo {
  if (backup?.format !== 'novelflow-project-backup' || typeof backup.files !== 'object') {
    throw new Error('不是有效的 NovelFlow 项目备份文件')
  }
  const info = createProject({
    name: backup.project?.name ? `${backup.project.name}（导入）` : '导入的项目',
    genre: backup.project?.genre ?? '',
    targetWords: backup.project?.targetWords ?? 1_000_000
  })
  const st = readStored(info.id)
  if (!st) throw new Error('导入失败')
  for (const [path, content] of Object.entries(backup.files)) {
    st.files[safeRel(path)] = content
  }
  writeStored(st)
  return info
}

/** 清空本机全部 NovelFlow 数据（设置页「危险操作」用） */
export function wipeAllData(): void {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && typeof k === 'string' && k.startsWith('novelflow:')) keys.push(k)
  }
  for (const k of keys) localStorage.removeItem(k)
}
