/**
 * AdminSeats — seat manager.
 *
 * Per-section cards show every table with its seats laid out in rows of 8,
 * separated by a ruled divider. The "Add seats" form lets the librarian
 * specify the exact seat name prefix, starting number, and count — a live
 * preview shows the exact labels that will be created before they commit.
 */
import { useMemo, useState } from 'react'
import {
  RiSofaLine,
  RiAddLine,
  RiCheckLine,
  RiMapPinLine,
  RiRefreshLine,
  RiAlertLine,
} from 'react-icons/ri'
import { AdminLayout }  from '../../components/AdminLayout.jsx'
import { Button }       from '../../components/Button.jsx'
import { StatusPill }   from '../../components/StatusPill.jsx'
import { useApp }       from '../../context/useApp.js'
import { getSeatStats } from '../../lib/seats.js'

/* ── helpers ───────────────────────────────────────────────── */

/** Split an array into chunks of `n`. */
function chunk(arr, n) {
  const out = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

/** Derive the status dot colour for a seat label pill. */
function seatDotClass(seat) {
  if (!seat) return 'bg-ash'
  switch (seat.status) {
    case 'vacant':   return 'bg-signal-deep'
    case 'occupied': return 'bg-stone'
    case 'pending':  return 'bg-signal-deep/50'
    case 'overdue':  return 'bg-amber'
    default:         return 'bg-ash'
  }
}

function seatPillClass(seat) {
  if (!seat) return 'border-ash bg-parchment text-stone'
  switch (seat.status) {
    case 'vacant':   return 'border-signal-line bg-signal-wash text-signal-deep'
    case 'occupied': return 'border-ash bg-parchment/60 text-stone'
    case 'pending':  return 'border-dashed border-signal-deep/50 bg-canvas text-signal-deep'
    case 'overdue':  return 'border-amber/40 bg-amber-wash text-amber'
    default:         return 'border-ash bg-parchment text-stone'
  }
}

/* ── SeatRows: seats laid out in rows of 8 with dividers ───── */
function SeatRows({ tableSeats, groupSize = 8 }) {
  if (tableSeats.length === 0) {
    return (
      <p className="py-2 text-[11px] italic text-stone">No seats assigned yet.</p>
    )
  }

  const groups = chunk(tableSeats, groupSize)

  return (
    <div className="space-y-3">
      {groups.map((group, gi) => (
        <div key={gi}>
          {/* Row number label — only shown when there's more than one group */}
          {groups.length > 1 && (
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-stone/60">
              Seats {gi * groupSize + 1}–{gi * groupSize + group.length}
            </p>
          )}

          {/* Seat label pills */}
          <div className="flex flex-wrap gap-1.5">
            {group.map((seat) => (
              <span
                key={seat.id}
                className={`inline-flex items-center gap-1 rounded-inner border px-2 py-1 text-[11px] font-semibold leading-none ${seatPillClass(seat)}`}
              >
                <span className={`size-1.5 rounded-full ${seatDotClass(seat)}`} aria-hidden="true" />
                {seat.label}
              </span>
            ))}
          </div>

          {/* Ruled divider between groups — not after the last */}
          {gi < groups.length - 1 && (
            <div className="mt-3 flex items-center gap-2">
              <span className="h-px flex-1 bg-ash" />
              <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-stone/50">
                next 8
              </span>
              <span className="h-px flex-1 bg-ash" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ── Add-seats form ────────────────────────────────────────── */
function AddSeatsForm({ area, seats, onAdd }) {
  const [tableId, setTableId] = useState(area.tables[0]?.id ?? '')
  const [prefix,  setPrefix]  = useState(area.prefix)
  const [startNo, setStartNo] = useState('')   // kept as string for controlled input
  const [count,   setCount]   = useState(1)
  const [flash,   setFlash]   = useState(false)

  // Auto-suggest starting number whenever tableId changes
  const suggestedStart = useMemo(() => {
    const tableSeats = seats.filter((s) => s.tableId === tableId)
    if (tableSeats.length === 0) return 1
    // Find the highest numeric suffix in this table's labels
    const nums = tableSeats
      .map((s) => parseInt(s.label.replace(/\D/g, ''), 10))
      .filter(Number.isFinite)
    return nums.length ? Math.max(...nums) + 1 : tableSeats.length + 1
  }, [tableId, seats])

  const effectiveStart = startNo === '' ? suggestedStart : Math.max(1, Number(startNo))

  // Build the preview labels
  const previewLabels = useMemo(() => {
    const labels = []
    for (let i = 0; i < count; i++) {
      const num = effectiveStart + i
      labels.push(`${prefix.trim()}${String(num).padStart(2, '0')}`)
    }
    return labels
  }, [prefix, effectiveStart, count])

  // Detect duplicates against existing seats
  const existingIds = useMemo(() => new Set(seats.map((s) => s.id)), [seats])
  const duplicates  = previewLabels.filter((l) => existingIds.has(l))

  const hasError = duplicates.length > 0 || !prefix.trim() || count < 1

  const handleAdd = () => {
    if (hasError) return
    onAdd(area.id, tableId, previewLabels)
    setFlash(true)
    setStartNo('')
    setCount(1)
    setTimeout(() => setFlash(false), 2000)
  }

  return (
    <div className={`mt-5 rounded-inner border p-4 transition-colors ${flash ? 'border-lime-line bg-lime-wash' : 'border-ash bg-parchment/30'}`}>
      <p className="text-[12px] font-semibold text-ink">Add seats to this section</p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/* Table selector */}
        <div className="col-span-2 sm:col-span-2">
          <label htmlFor={`tbl-${area.id}`} className="text-[11px] text-ink-soft">
            Table
          </label>
          <select
            id={`tbl-${area.id}`}
            value={tableId}
            onChange={(e) => { setTableId(e.target.value); setStartNo('') }}
            className="mt-1 h-10 w-full rounded-input border border-ash bg-canvas px-3 text-[13px] text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-lime"
          >
            {area.tables.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Seat name prefix */}
        <div>
          <label htmlFor={`pfx-${area.id}`} className="text-[11px] text-ink-soft">
            Seat prefix
          </label>
          <input
            id={`pfx-${area.id}`}
            type="text"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder={area.prefix}
            maxLength={4}
            className="mt-1 h-10 w-full rounded-input border border-ash bg-canvas px-3 text-[13px] font-semibold text-ink placeholder:text-stone focus:border-ink focus:outline-none focus:ring-2 focus:ring-lime"
          />
        </div>

        {/* Starting number */}
        <div>
          <label htmlFor={`start-${area.id}`} className="text-[11px] text-ink-soft">
            Start #
          </label>
          <input
            id={`start-${area.id}`}
            type="number"
            min={1}
            value={startNo === '' ? suggestedStart : startNo}
            onChange={(e) => setStartNo(e.target.value)}
            className="mt-1 h-10 w-full rounded-input border border-ash bg-canvas px-3 text-[13px] text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-lime"
          />
        </div>
      </div>

      {/* Count slider + input */}
      <div className="mt-3">
        <label htmlFor={`cnt-${area.id}`} className="text-[11px] text-ink-soft">
          How many seats — <span className="font-semibold text-ink">{count}</span>
        </label>
        <div className="mt-1.5 flex items-center gap-3">
          <input
            id={`cnt-${area.id}`}
            type="range"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="h-2 flex-1 cursor-pointer accent-lime-deep"
          />
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value))))}
            className="h-9 w-16 rounded-input border border-ash bg-canvas px-2 text-center text-[13px] text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-lime"
          />
        </div>
      </div>

      {/* Live preview */}
      {previewLabels.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] text-ink-soft">
            Preview — {previewLabels.length} seat{previewLabels.length !== 1 ? 's' : ''} will be added:
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {previewLabels.map((label) => {
              const isDupe = existingIds.has(label)
              return (
                <span
                  key={label}
                  className={`inline-flex items-center rounded-inner border px-2 py-1 text-[11px] font-semibold leading-none ${
                    isDupe
                      ? 'border-danger/30 bg-danger-wash text-danger'
                      : 'border-lime-line bg-lime-wash text-ink'
                  }`}
                >
                  {label}
                  {isDupe && <RiAlertLine size={10} className="ml-1" aria-hidden="true" />}
                </span>
              )
            })}
          </div>
          {duplicates.length > 0 && (
            <p className="mt-1.5 text-[11px] text-danger">
              {duplicates.join(', ')} already exist — change the prefix or starting number.
            </p>
          )}
        </div>
      )}

      {/* Submit */}
      <div className="mt-4">
        <Button size="md" onClick={handleAdd} disabled={hasError}>
          {flash ? (
            <><RiCheckLine size={15} aria-hidden="true" /> Seats added</>
          ) : (
            <><RiAddLine size={15} aria-hidden="true" /> Add {count} seat{count !== 1 ? 's' : ''}</>
          )}
        </Button>
      </div>
    </div>
  )
}

/* ── Per-area card ──────────────────────────────────────────── */
function AreaCard({ area, seats, onAddSeats }) {
  const areaSeats = seats.filter((s) => s.areaId === area.id)
  const vacant    = areaSeats.filter((s) => s.status === 'vacant').length

  return (
    <div className="rounded-card border border-ash bg-canvas p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[16px] font-semibold tracking-[-0.01em]">{area.name}</h3>
          <p className="mt-0.5 inline-flex items-center gap-1.5 text-[12px] text-ink-soft">
            <RiMapPinLine size={12} aria-hidden="true" />
            {area.floor}
          </p>
        </div>
        <div className="text-right">
          <p className="numeric text-[26px] font-bold leading-none tracking-[-0.04em]">
            {areaSeats.length}
          </p>
          <p className="text-[11px] text-ink-soft">
            {vacant} open
          </p>
        </div>
      </div>

      {/* Tables with seat rows */}
      <div className="mt-5 space-y-5">
        {area.tables.map((table, ti) => {
          const tableSeats = seats.filter((s) => s.tableId === table.id)
          return (
            <div key={table.id}>
              {/* Table label row */}
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-semibold">{table.label}</p>
                <span className="numeric text-[11px] text-ink-soft">
                  {tableSeats.length} seat{tableSeats.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Seat pills in groups of 8 */}
              <div className="mt-2 rounded-inner border border-ash bg-parchment/40 p-3">
                <SeatRows tableSeats={tableSeats} groupSize={8} />
              </div>

              {/* Thin ruled divider between tables (not after last) */}
              {ti < area.tables.length - 1 && (
                <div className="mt-5 h-px w-full bg-ash" />
              )}
            </div>
          )
        })}
      </div>

      {/* Add seats form */}
      <AddSeatsForm area={area} seats={seats} onAdd={onAddSeats} />
    </div>
  )
}

/* ── Page ───────────────────────────────────────────────────── */
export default function AdminSeats() {
  const { areas, seats, addSeatsToArea, resetDemo } = useApp()
  const stats = getSeatStats(seats)

  return (
    <AdminLayout>
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <StatusPill status="neutral">
            <RiSofaLine size={12} className="mr-1" aria-hidden="true" />
            Seat manager
          </StatusPill>
          <h1 className="mt-3 text-[clamp(1.9rem,4vw,2.8rem)] font-bold leading-[1] tracking-[-0.03em]">
            Manage seats
          </h1>
          <p className="mt-2 max-w-[54ch] text-sm leading-relaxed text-ink-soft">
            Name your seats, pick a table, and set how many to add. A live preview shows
            exactly what labels will appear on the floor plan before you commit.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetDemo}>
          <RiRefreshLine size={14} aria-hidden="true" />
          Reset demo
        </Button>
      </div>

      {/* Summary strip */}
      <section aria-label="Floor summary" className="mt-6 rounded-card border border-ash bg-canvas">
        <dl className="grid grid-cols-2 divide-x divide-y divide-ash sm:grid-cols-4 sm:divide-y-0">
          {[
            { label: 'Total seats', value: stats.total,                     tone: '' },
            { label: 'Open',        value: stats.vacant,                    tone: 'text-signal-deep' },
            { label: 'In use',      value: stats.occupied + stats.overdue,  tone: '' },
            { label: 'Sections',    value: areas.length,                    tone: '' },
          ].map((s) => (
            <div key={s.label} className="px-5 py-4">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
                {s.label}
              </dt>
              <dd className={`numeric mt-1 text-[30px] font-bold leading-none ${s.tone}`}>
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-ink-soft">
        {[
          { dot: 'bg-signal-deep',    label: 'Open' },
          { dot: 'bg-stone',          label: 'Occupied' },
          { dot: 'bg-signal-deep/50', label: 'Held' },
          { dot: 'bg-amber',          label: 'Overdue' },
        ].map(({ dot, label }) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${dot}`} aria-hidden="true" />
            {label}
          </span>
        ))}
        <span className="text-stone italic">
          Seats shown in groups of 8 · ruled line marks each group
        </span>
      </div>

      {/* Per-area cards — single column for readability */}
      <div className="mt-5 grid gap-5">
        {areas.map((area) => (
          <AreaCard
            key={area.id}
            area={area}
            seats={seats}
            onAddSeats={addSeatsToArea}
          />
        ))}
      </div>

      <p className="mt-6 text-[11px] text-ink-soft">
        New seats appear immediately on the live map as vacant. Use Reset demo to
        restore the original layout.
      </p>
    </AdminLayout>
  )
}
