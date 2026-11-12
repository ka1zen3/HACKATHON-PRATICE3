import { initials } from '../lib/format.js'

/* ── Status styling ─────────────────────────────────────────── */
const SEAT_STYLES = {
  vacant:
    'border-signal-line bg-signal-wash text-signal-deep hover:-translate-y-0.5 hover:border-signal-deep hover:bg-signal cursor-pointer',
  occupied:
    'border-ash bg-parchment text-stone cursor-not-allowed',
  pending:
    'border-dashed border-signal-deep bg-canvas text-signal-deep cursor-not-allowed',
  overdue:
    'border-amber/30 bg-amber-wash text-amber cursor-not-allowed',
}

function SeatButton({ seat, selected, onSeatClick, compact, admin }) {
  const clickable = typeof onSeatClick === 'function'

  return (
    <button
      type="button"
      onClick={clickable ? () => onSeatClick(seat) : undefined}
      aria-pressed={selected || undefined}
      aria-label={`Seat ${seat.label}, ${seat.status}${seat.session ? `, ${seat.session.studentName}` : ''}`}
      className={[
        'group relative flex aspect-square flex-col items-center justify-center rounded-inner border text-center',
        'transition-[background-color,border-color,color,transform] duration-150',
        'focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        selected
          ? 'border-ink bg-ink text-canvas ring-2 ring-lime ring-offset-2'
          : (SEAT_STYLES[seat.status] ?? SEAT_STYLES.vacant),
        compact ? 'min-h-[36px]' : 'min-h-[44px]',
      ].join(' ')}
    >
      <span className={`numeric font-semibold leading-none ${compact ? 'text-[11px]' : 'text-[13px]'}`}>
        {seat.label}
      </span>

      {admin && seat.session && !compact && (
        <span className="mt-0.5 text-[8px] font-medium uppercase tracking-[0.04em] opacity-70">
          {initials(seat.session.studentName)}
        </span>
      )}

      {seat.status === 'overdue' && (
        <span aria-hidden="true" className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-amber" />
      )}
      {seat.status === 'pending' && (
        <span aria-hidden="true" className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-signal-deep animate-pulse-dot" />
      )}
      {selected && (
        <span aria-hidden="true" className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-lime" />
      )}
    </button>
  )
}

/**
 * Renders a long-table row, inserting a visual divider after every `groupSize`
 * seats (default 8) so physical table segments stay legible.
 */
function LongTableRow({ table, tableSeats, selectedId, onSeatClick, compact, admin, groupSize = 8 }) {
  if (tableSeats.length === 0) return null

  // Build chunks of groupSize
  const chunks = []
  for (let i = 0; i < tableSeats.length; i += groupSize) {
    chunks.push(tableSeats.slice(i, i + groupSize))
  }

  const gap = compact ? 'gap-1.5' : 'gap-2'

  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone">
        {table.label}
      </p>

      {/* Table surface visual: inset rounded rect */}
      <div className="rounded-inner border border-ash bg-parchment/40 px-3 py-2">
        <div className={`flex flex-wrap ${compact ? 'gap-3' : 'gap-4'}`}>
          {chunks.map((chunk, ci) => (
            <div key={ci} className="flex flex-col gap-0.5">
              {/* Optional chunk label for multi-segment tables */}
              {chunks.length > 1 && (
                <span className="mb-1 text-center text-[8px] text-stone/60">
                  Seats {ci * groupSize + 1}–{ci * groupSize + chunk.length}
                </span>
              )}
              <div
                className={`grid ${gap}`}
                style={{ gridTemplateColumns: `repeat(${Math.min(chunk.length, groupSize)}, minmax(0, 1fr))` }}
              >
                {chunk.map((seat) => (
                  <SeatButton
                    key={seat.id}
                    seat={seat}
                    selected={seat.id === selectedId}
                    onSeatClick={onSeatClick}
                    compact={compact}
                    admin={admin}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * PhysicalFloorPlan renders each section's tables the way they appear in the room.
 *
 * Layout rules:
 *   long   → LongTableRow with per-8 seat separators + WINDOW / ENTRANCE labels
 *   square → 2×2 grids rendered side-by-side in pairs
 *   carrel → isolated single box with carrel label beneath
 */
function PhysicalFloorPlan({ area, seats, selectedId, onSeatClick, compact, admin }) {
  const seatsByTable = {}
  for (const seat of seats) {
    if (!seatsByTable[seat.tableId]) seatsByTable[seat.tableId] = []
    seatsByTable[seat.tableId].push(seat)
  }

  const tables       = area.tables ?? []
  const longTables   = tables.filter((t) => t.type === 'long')
  const squareTables = tables.filter((t) => t.type === 'square')
  const carrels      = tables.filter((t) => t.type === 'carrel')

  return (
    <div className="space-y-5">
      {/* ── WINDOW edge ─────────────────────────────────── */}
      <div className="flex items-center gap-3 text-[9px] font-semibold tracking-[0.18em] text-stone/70 uppercase">
        <span className="h-px flex-1 bg-ash" />
        WINDOW
        <span className="h-px flex-1 bg-ash" />
      </div>

      {/* ── Long tables ─────────────────────────────────── */}
      {longTables.map((table) => (
        <LongTableRow
          key={table.id}
          table={table}
          tableSeats={seatsByTable[table.id] ?? []}
          selectedId={selectedId}
          onSeatClick={onSeatClick}
          compact={compact}
          admin={admin}
          groupSize={8}
        />
      ))}

      {/* ── Square tables — pairs side by side ──────────── */}
      {squareTables.length > 0 && (
        <div
          className={`grid ${compact ? 'gap-3' : 'gap-4'}`}
          style={{
            gridTemplateColumns: `repeat(${Math.min(squareTables.length, 2)}, minmax(0, 1fr))`,
          }}
        >
          {squareTables.map((table) => {
            const tableSeats = seatsByTable[table.id] ?? []
            return (
              <div key={table.id} className="rounded-inner border border-ash bg-parchment/50 p-2">
                <p className="mb-1.5 text-center text-[9px] font-semibold uppercase tracking-[0.08em] text-stone">
                  {table.label}
                </p>
                <div
                  className={`grid ${compact ? 'gap-1.5' : 'gap-2'}`}
                  style={{ gridTemplateColumns: `repeat(${table.cols}, minmax(0, 1fr))` }}
                >
                  {tableSeats.map((seat) => (
                    <SeatButton
                      key={seat.id}
                      seat={seat}
                      selected={seat.id === selectedId}
                      onSeatClick={onSeatClick}
                      compact={compact}
                      admin={admin}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Individual carrels ──────────────────────────── */}
      {carrels.length > 0 && (
        <div
          className={`grid ${compact ? 'gap-3' : 'gap-4'}`}
          style={{
            gridTemplateColumns: `repeat(${Math.min(carrels.length, 4)}, minmax(0, 1fr))`,
          }}
        >
          {carrels.map((table) => {
            const tableSeats = seatsByTable[table.id] ?? []
            return tableSeats.map((seat) => (
              <div key={seat.id} className="flex flex-col items-center gap-1.5">
                <SeatButton
                  seat={seat}
                  selected={seat.id === selectedId}
                  onSeatClick={onSeatClick}
                  compact={compact}
                  admin={admin}
                />
                <span className="text-[9px] text-stone">{table.label}</span>
              </div>
            ))
          })}
        </div>
      )}

      {/* ── ENTRANCE edge ───────────────────────────────── */}
      <div className="mt-2 flex justify-center">
        <span className="border border-b-0 border-dashed border-ash px-6 py-1.5 text-[8px] font-semibold uppercase tracking-[0.15em] text-stone">
          ENTRANCE
        </span>
      </div>
    </div>
  )
}

/**
 * SeatGrid — primary export.
 *
 * physical=true (default)  → real floor plan with table groupings
 * physical=false           → plain uniform grid (home preview, admin)
 */
export function SeatGrid({
  seats,
  areas,
  selectedId = null,
  onSeatClick,
  compact = false,
  admin = false,
  physical = true,
  showAreaHeader = true,
  className = '',
}) {
  const grouped = areas
    .map((area) => ({
      area,
      seats: seats.filter((s) => s.areaId === area.id),
    }))
    .filter((g) => g.seats.length > 0)

  return (
    <div className={`space-y-8 ${className}`}>
      {grouped.map(({ area, seats: areaSeats }) => {
        const open = areaSeats.filter((s) => s.status === 'vacant').length

        return (
          <section key={area.id} aria-label={area.name}>
            {showAreaHeader && (
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{area.name}</h3>
                  <p className="text-[12px] text-ink-soft">
                    {area.floor} ·{' '}
                    <span className="font-medium text-signal-deep">{open} open</span>
                  </p>
                </div>
                {!compact && (
                  <span className="text-[10px] uppercase tracking-[0.1em] text-stone">
                    {areaSeats.length} seats
                  </span>
                )}
              </div>
            )}

            {physical && area.tables ? (
              <PhysicalFloorPlan
                area={area}
                seats={areaSeats}
                selectedId={selectedId}
                onSeatClick={onSeatClick}
                compact={compact}
                admin={admin}
              />
            ) : (
              <div
                className={`grid ${compact ? 'gap-1.5' : 'gap-2'}`}
                style={{ gridTemplateColumns: `repeat(${area.cols}, minmax(0, 1fr))` }}
              >
                {areaSeats.map((seat) => (
                  <SeatButton
                    key={seat.id}
                    seat={seat}
                    selected={seat.id === selectedId}
                    onSeatClick={onSeatClick}
                    compact={compact}
                    admin={admin}
                  />
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
