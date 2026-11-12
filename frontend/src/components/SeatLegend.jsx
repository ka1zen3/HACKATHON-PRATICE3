const LEGEND = [
  { label: 'Open',   className: 'border-signal-line  bg-signal-wash' },
  { label: 'Held',   className: 'border-dashed border-signal-deep bg-canvas' },
  { label: 'In use', className: 'border-ash bg-parchment' },
  { label: 'Overdue',className: 'border-amber/30 bg-amber-wash' },
]

export function SeatLegend({ compact = false, className = '' }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-ink-soft ${className}`}
    >
      {LEGEND.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span
            className={`size-3 rounded-[4px] border ${item.className}`}
            aria-hidden="true"
          />
          {item.label}
        </span>
      ))}
      {!compact && (
        <span className="text-[11px] text-stone italic">Tap a seat for details</span>
      )}
    </div>
  )
}
