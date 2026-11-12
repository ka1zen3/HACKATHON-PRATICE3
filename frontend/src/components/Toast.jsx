import { useEffect } from 'react'
import { X } from 'lucide-react'

export function Toast({ message, action, onClose, duration = 4200 }) {
  useEffect(() => {
    if (!message) return undefined
    const id = window.setTimeout(onClose, duration)
    return () => window.clearTimeout(id)
  }, [message, onClose, duration])

  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 left-1/2 z-50 flex w-[min(92vw,460px)] -translate-x-1/2 items-center gap-3 rounded-pill border border-ink/10 bg-ink px-4 py-3 text-parchment animate-toast"
    >
      <span className="size-2 shrink-0 rounded-full bg-signal" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-[13px] leading-snug">{message}</p>
      {action}
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss message"
        className="grid size-7 shrink-0 place-items-center rounded-full text-parchment/60 transition-colors hover:bg-parchment/10 hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}
