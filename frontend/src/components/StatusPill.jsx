const STYLES = {
  vacant: 'border-signal-line bg-signal-wash text-signal-deep',
  occupied: 'border-ash bg-parchment text-ink-soft',
  pending: 'border-dashed border-signal-deep bg-canvas text-signal-deep',
  overdue: 'border-amber/30 bg-amber-wash text-amber',
  expired: 'border-danger/25 bg-danger-wash text-danger',
  live: 'border-signal-line bg-signal-wash text-signal-deep',
  neutral: 'border-ash bg-parchment text-ink-soft',
  dark: 'border-parchment/20 bg-parchment/10 text-parchment',
}

const DOTS = {
  vacant: 'bg-signal-deep',
  occupied: 'bg-stone',
  pending: 'bg-signal-deep',
  overdue: 'bg-amber',
  expired: 'bg-danger',
  live: 'bg-signal-deep',
  neutral: 'bg-stone',
  dark: 'bg-signal',
}

export function StatusPill({ status = 'neutral', pulse = false, className = '', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] ${STYLES[status] ?? STYLES.neutral} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${DOTS[status] ?? DOTS.neutral} ${pulse ? 'animate-pulse-dot' : ''}`}
      />
      {children ?? status}
    </span>
  )
}
