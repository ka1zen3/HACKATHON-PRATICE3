/**
 * AdminSeats — seat manager page.
 * Lets librarians add more seats to any table in any section.
 * Shows live per-table occupancy: vacant / occupied / pending / overdue counts.
 */
import { useMemo, useState } from 'react'
import {
  RiSofaLine,
  RiAddLine,
  RiCheckLine,
  RiMapPinLine,
} from 'react-icons/ri'
import { AdminLayout }  from '../../components/AdminLayout.jsx'
import { Button }       from '../../components/Button.jsx'
import { StatusPill }   from '../../components/StatusPill.jsx'
import { useApp }       from '../../context/useApp.js'
import { useNow }       from '../../hooks/useNow.js'
import { getSeatStats } from '../../lib/seats.js'

// Dot colours for status breakdown
const STATUS_DOT = {
  vacant:   'bg-signal-deep',
  occupied: 'bg-ink',
  pending:  'bg-amber',
  overdue:  'bg-danger',
}

function TableRow({ table, seats }) {
  const tSeats = seats.filter((s) => s.tableId === table.id)
  const counts = tSeats.reduce(
    (acc, s) => { acc[s.status] = (acc[s.status] ?? 0) + 1; return acc },
    {},
  )
  const vacant   = counts.vacant   ?? 0
  const occupied = counts.occupied ?? 0
  const pending  = counts.pending  ?? 0
  const overdue  = counts.overdue  ?? 0
  const total    = tSeats.length

  return (
    <div className="flex items-center justify-between gap-3 rounded-inner bg-parchment px-3 py-2.5 text-[12px]">
      <span className="font-medium">{table.label}</span>
      <div className="flex items-center gap-3">
        {/* Status dots */}
        <div className="flex items-center gap-1.5">
          {overdue > 0 && (
            <span className="inline-flex items-center gap-1 text-danger">
              <span className={`size-1.5 rounded-full ${STATUS_DOT.overdue}`} aria-hidden="true" />
              <span className="numeric">{overdue}</span>
            </span>
          )}
          {pending > 0 && (
            <span className="inline-flex items-center gap-1 text-amber">
              <span className={`size-1.5 rounded-full ${STATUS_DOT.pending}`} aria-hidden="true" />
              <span className="numeric">{pending}</span>
            </span>
          )}
          {occupied > 0 && (
            <span className="inline-flex items-center gap-1 text-ink-soft">
              <span className={`size-1.5 rounded-full ${STATUS_DOT.occupied}`} aria-hidden="true" />
              <span className="numeric">{occupied}</span>
            </span>
          )}
          {vacant > 0 && (
            <span className="inline-flex items-center gap-1 text-signal-deep">
              <span className={`size-1.5 rounded-full ${STATUS_DOT.vacant}`} aria-hidden="true" />
              <span className="numeric">{vacant}</span>
            </span>
          )}
        </div>
        <span className="numeric text-ink-soft">{total} seats</span>
      </div>
    </div>
  )
}

function AreaCard({ area, seats, onAddSeats }) {
  const [tableId, setTableId] = useState(area.tables[0]?.id ?? '')
  const [count,   setCount]   = useState(1)
  const [flash,   setFlash]   = useState(false)

  const areaSeats = seats.filter((s) => s.areaId === area.id)
  const stats     = getSeatStats(areaSeats)
  const pct       = stats.total > 0 ? Math.round((stats.vacant / stats.total) * 100) : 0

  const handleAdd = () => {
    if (!tableId || count < 1) return
    onAddSeats(area.id, tableId, count)
    setFlash(true)
    setCount(1)
    setTimeout(() => setFlash(false), 1800)
  }

  return (
    <div className={`rounded-card border p-5 transition-colors sm:p-6 ${flash ? 'border-lime-line bg-lime-wash' : 'border-ash bg-canvas'}`}>
      {/* Area header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[16px] font-semibold tracking-[-0.01em]">{area.name}</h3>
          <p className="mt-0.5 inline-flex items-center gap-1.5 text-[12px] text-ink-soft">
            <RiMapPinLine size={12} aria-hidden="true" />
            {area.floor}
          </p>
        </div>
        <div className="text-right">
          <p className="numeric text-[26px] font-bold leading-none tracking-[-0.04em]">{stats.total}</p>
          <p className="text-[11px] text-ink-soft">seats</p>
        </div>
      </div>

      {/* Availability bar */}
      <div className="mt-3">
        <div className="flex justify-between text-[11px] text-ink-soft mb-1">
          <span>{stats.vacant} open</span>
          <span>{stats.occupied + stats.overdue} in use{stats.pending > 0 ? ` · ${stats.pending} held` : ''}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-ash" aria-hidden="true">
          <div
            className="h-full rounded-full bg-signal-deep transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Per-table breakdown */}
      <div className="mt-4 space-y-1.5">
        {area.tables.map((table) => (
          <TableRow key={table.id} table={table} seats={seats} />
        ))}
      </div>

      {/* Add seats form */}
      <div className="mt-5 border-t border-ash pt-4">
        <p className="text-[12px] font-semibold text-ink">Add seats</p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div className="min-w-[140px] flex-1">
            <label htmlFor={`table-${area.id}`} className="text-[11px] text-ink-soft">
              Table
            </label>
            <select
              id={`table-${area.id}`}
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              className="mt-1 h-10 w-full rounded-input border border-ash bg-canvas px-3 text-[13px] text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-lime"
            >
              {area.tables.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="w-24">
            <label htmlFor={`count-${area.id}`} className="text-[11px] text-ink-soft">
              Count
            </label>
            <input
              id={`count-${area.id}`}
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value))))}
              className="mt-1 h-10 w-full rounded-input border border-ash bg-canvas px-3 text-[13px] text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-lime"
            />
          </div>

          <Button size="md" onClick={handleAdd} className={flash ? 'bg-lime-deep' : ''}>
            {flash ? (
              <><RiCheckLine size={16} aria-hidden="true" /> Added</>
            ) : (
              <><RiAddLine size={16} aria-hidden="true" /> Add seats</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function AdminSeats() {
  const { areas, seats, addSeatsToArea, resetDemo } = useApp()
  // 10s tick is enough — seat status changes arrive via context, not polling
  const now    = useNow(10000)
  const stats  = useMemo(() => getSeatStats(seats), [seats])

  // Compute overdue count live: occupied seats past dueAt
  const overdueCount = useMemo(
    () => seats.filter(
      (s) => s.status === 'occupied' && s.session?.dueAt && now >= s.session.dueAt,
    ).length + seats.filter((s) => s.status === 'overdue').length,
    [seats, now],
  )

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
            Add seats to any table in any section. New seats appear immediately on the live map as vacant.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetDemo}>
          Reset demo
        </Button>
      </div>

      {/* Summary stats */}
      <section
        aria-label="Floor summary"
        className="mt-6 rounded-card border border-ash bg-canvas"
      >
        <dl className="grid grid-cols-2 divide-x divide-y divide-ash sm:grid-cols-5 sm:divide-y-0">
          {[
            { label: 'Total seats', value: stats.total,                        tone: '' },
            { label: 'Open',        value: stats.vacant,                       tone: 'text-signal-deep' },
            { label: 'Held',        value: stats.pending,                      tone: 'text-amber' },
            { label: 'In use',      value: stats.occupied,                     tone: '' },
            { label: 'Overdue',     value: overdueCount,                       tone: overdueCount > 0 ? 'text-danger' : '' },
          ].map((s) => (
            <div key={s.label} className="px-5 py-4">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-soft">{s.label}</dt>
              <dd className={`numeric mt-1 text-[30px] font-bold leading-none ${s.tone}`}>{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Per-area cards */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
        Changes are live immediately. Use Reset demo to restore the original layout.
      </p>
    </AdminLayout>
  )
}
