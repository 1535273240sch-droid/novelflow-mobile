import { useUiStore } from '../../stores/ui'

export function ToastContainer() {
  const toasts = useUiStore((s) => s.toasts)
  const dismiss = useUiStore((s) => s.dismiss)
  if (toasts.length === 0) return null
  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className="pointer-events-auto rounded-lg bg-slate-900/90 px-4 py-2 text-sm text-white shadow-lg transition-opacity"
        >
          {t.text}
        </button>
      ))}
    </div>
  )
}
