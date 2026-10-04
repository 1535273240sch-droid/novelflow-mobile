import { useUiStore } from '../../stores/ui'

export function ToastContainer() {
  const toasts = useUiStore((s) => s.toasts)
  const dismiss = useUiStore((s) => s.dismiss)
  if (toasts.length === 0) return null
  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4 animate-fade-in">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className="pointer-events-auto flex items-center gap-2 rounded-xl border border-[var(--parchment-border)] bg-[var(--parchment-card)]/95 px-4 py-2.5 text-xs font-medium text-[var(--ink-primary)] shadow-xl backdrop-blur-sm transition-all active:scale-95"
        >
          <span className="seal-badge px-1.5 py-0.2 text-[9px]">印</span>
          <span className="tracking-wide">{t.text}</span>
        </button>
      ))}
    </div>
  )
}
