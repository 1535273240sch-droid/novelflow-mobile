import type { ReactNode } from 'react'

/** 手机版通用底部弹层（桌面版的对话框在手机上统一为 Bottom Sheet） */
export function Sheet({
  open,
  onClose,
  title,
  children
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="safe-bottom relative max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-slate-200 bg-white p-4">
        <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-slate-300" />
        {title && <div className="mb-3 font-semibold text-slate-800">{title}</div>}
        {children}
      </div>
    </div>
  )
}
