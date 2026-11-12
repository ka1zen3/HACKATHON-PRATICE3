import { initials } from '../lib/format.js'

const SEAT_STYLES = {
  vacant:
    'border-signal-line bg-signal-wash text-ink hover:-translate-y-0.5 hover:border-signal-deep hover:bg-signal',
  occupied: 'border-ash bg-parchment text-stone hover:border-stone',
  pending:
    'border-dashed border-signal-deep bg-canvas text-signal-deep hover:border-ink',
  overdue: 'border-amber/30 bg-amber-wash text-amber hover:border-amber/60',
}

export function SeatGrid({
  seats,
  areas,
  selectedId = null,
  onSeatClick,
  compact = false,
  admin = false,
  showAreaHeader = true,
  className = '',
}) {
  const grouped = areas
    .map((area) => ({
      area,
      seats: seats.filter((seat) => seat.areaId === area.id),
    }))
    .filter((group) => group.seats.length > 0)

  return (
    <div className={`space-y-6 ${className}`}>
      {grouped.map(({ area, seats: areaSeats }) => {
        const open = areaSeats.filter((seat) => seat.status === 'vacant').length

        return (
          <section key={area.id} aria-label={area.name}>
            {showAreaHeader && (
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-medium tracking-[-0.01em]">{area.name}</h3>
                  <p className="text-[12px] text-ink-soft">
                    {area.floor} · {open} open
                  </p>
                </div>
                {!compact && (
                  <span className="text-[10px] uppercase tracking-[0.1em] text-ink-soft">
                    {areaSeats.length} seats
                  </span>
                )}
              </div>
            )}

            <div
              className={`grid ${compact ? 'gap-1.5' : 'gap-2'}`}
              style={{ gridTemplateColumns: `repeat(${area.cols}, minmax(0, 1fr))` }}
            >
              {areaSeats.map((seat) => {
                const selected = seat.id === selectedId
                const clickable = typeof onSeatClick === 'function'

                return (
                  <button
                    key={seat.id}
                    type="button"
                    onClick={clickable ? () => onSeatClick(seat) : undefined}
                    aria-pressed={selected || undefined}
                    aria-label={`Seat ${seat.label}, ${seat.status}${seat.session ? `, ${seat.session.studentName}` : ''}`}
                    className={[
                      'group relative flex aspect-square flex-col items-center justify-center rounded-inner border text-center transition-[background-color,border-color,color,transform] duration-150 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
                      selected
                        ? 'border-ink bg-ink text-parchment ring-2 ring-signal ring-offset-2'
                        : (SEAT_STYLES[seat.status] ?? SEAT_STYLES.vacant),
                      clickable ? 'cursor-pointer' : 'cursor-default',
                      compact ? 'min-h-[40px]' : 'min-h-[46px]',
                    ].join(' ')}
                  >
                    <span
                      className={`numeric font-medium ${compact ? 'text-[12px]' : 'text-[13px]'}`}
                    >
                      {seat.label}
                    </span>

                    {admin && seat.session && !compact && (
                      <span className="mt-0.5 text-[8px] font-medium uppercase tracking-[0.04em] opacity-70">
                        {initials(seat.session.studentName)}
                      </span>
                    )}

                    {seat.status === 'overdue' && (
                      <span
                        aria-hidden="true"
                        className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-amber"
                      />
                    )}
                    {seat.status === 'pending' && (
                      <span
                        aria-hidden="true"
                        className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-signal-deep"
                      />
                    )}
                    {selected && (
                      <span
                        aria-hidden="true"
                        className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-signal"
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
