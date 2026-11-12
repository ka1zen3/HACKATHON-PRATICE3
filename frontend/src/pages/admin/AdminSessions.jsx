import { useState } from 'react'
import { ChevronRight, ListFilter, RotateCcw, Search, X } from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout.jsx'
import { Button } from '../../components/Button.jsx'
import { EmptyState } from '../../components/EmptyState.jsx'
import { SeatDetailModal } from '../../components/SeatDetailModal.jsx'
import { StatusPill } from '../../components/StatusPill.jsx'
import { Toast } from '../../components/Toast.jsx'
import { useApp } from '../../context/useApp.js'
import { useNow } from '../../hooks/useNow.js'
import { formatShort, isHoldExpired } from '../../lib/seats.js'
import { formatTimeOfDay, plural } from '../../lib/format.js'

export default function AdminSessions() {
  const { seats, forceTimeOut, resetDemo } = useApp()
  const now = useNow(30000)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [activeSeat, setActiveSeat] = useState(null)
  const [seatModalOpen, setSeatModalOpen] = useState(false)
  const [notice, setNotice] = useState('')

  const rows = seats
    .filter((seat) => seat.session)
    .map((seat) => ({
      seat,
      start: seat.session.occupiedAt ?? seat.session.reservedAt,
      duration:
        now - (seat.session.occupiedAt ?? seat.session.reservedAt ?? now),
    }))
    .sort((a, b) => b.duration - a.duration)

  const counts = {
    all: rows.length,
    occupied: rows.filter((row) => row.seat.status === 'occupied').length,
    pending: rows.filter((row) => row.seat.status === 'pending').length,
    overdue: rows.filter((row) => row.seat.status === 'overdue').length,
  }

  const filters = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'occupied', label: 'In use', count: counts.occupied },
    { id: 'pending', label: 'Held', count: counts.pending },
    { id: 'overdue', label: 'Overdue', count: counts.overdue },
  ]

  const normalizedQuery = query.trim().toLowerCase()
  const filteredRows = rows.filter((row) => {
    if (filter !== 'all' && row.seat.status !== filter) return false
    if (!normalizedQuery) return true
    return [
      row.seat.label,
      row.seat.session.studentName,
      row.seat.session.studentNumber,
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  })

  const openSeat = (seat) => {
    setActiveSeat(seat)
    setSeatModalOpen(true)
  }

  const closeSeat = () => {
    setSeatModalOpen(false)
    setActiveSeat(null)
  }

  const handleForceTimeOut = (seatId) => {
    const label = activeSeat?.label
    forceTimeOut(seatId)
    setActiveSeat(null)
    if (label) setNotice(`Seat ${label} is open again.`)
  }

  const handleReset = () => {
    resetDemo()
    closeSeat()
    setQuery('')
    setFilter('all')
    setNotice('Demo data reset to the opening snapshot.')
  }

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <StatusPill status="live" pulse>
            Live log
          </StatusPill>
          <h1 className="mt-3 text-[clamp(1.9rem,4vw,2.8rem)] font-medium leading-[1] tracking-[-0.03em]">
            Active sessions
          </h1>
          <p className="mt-2 max-w-[54ch] text-sm leading-relaxed text-ink-soft">
            {plural(rows.length, 'session')} open right now. Search the floor or
            open a row to review and release a seat.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Reset demo
        </Button>
      </div>

      <div className="mt-7 flex flex-col gap-3 rounded-card border border-ash bg-canvas p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-[340px]">
          <label htmlFor="session-search" className="sr-only">
            Search sessions
          </label>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone"
            aria-hidden="true"
          />
          <input
            id="session-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search seat, student, or number"
            className="h-10 w-full rounded-input border border-ash bg-parchment pl-10 pr-9 text-[13px] text-ink placeholder:text-stone focus:border-signal-deep focus:outline-none focus:ring-2 focus:ring-signal/40"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-ink-soft transition-colors hover:bg-ash hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter sessions">
          {filters.map((item) => {
            const active = filter === item.id
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(item.id)}
                className={[
                  'inline-flex h-8 items-center gap-1.5 rounded-pill border px-3 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
                  active
                    ? 'border-ink bg-ink text-parchment'
                    : 'border-ash bg-canvas text-ink hover:border-ink',
                ].join(' ')}
              >
                {item.label}
                <span className={`numeric text-[11px] ${active ? 'text-parchment/60' : 'text-ink-soft'}`}>
                  {item.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <section className="mt-4 overflow-hidden rounded-card border border-ash bg-canvas">
        {filteredRows.length === 0 ? (
          <EmptyState
            icon={ListFilter}
            title="No sessions match"
            description="Try a different search or filter. Released seats drop off this list immediately."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery('')
                  setFilter('all')
                }}
              >
                Clear filters
              </Button>
            }
            className="rounded-none border-0 border-dashed bg-canvas"
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-left">
                <thead className="border-b border-ash bg-parchment">
                  <tr className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-soft">
                    <th scope="col" className="py-3 pl-5 pr-4">Seat</th>
                    <th scope="col" className="px-4 py-3">Student</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3">Started</th>
                    <th scope="col" className="px-4 py-3">Duration</th>
                    <th scope="col" className="py-3 pl-4 pr-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(({ seat, start, duration }) => {
                    const expired = isHoldExpired(seat, now)
                    const status = expired ? 'expired' : seat.status
                    return (
                      <tr
                        key={seat.id}
                        className="border-b border-ash text-[13px] last:border-0 hover:bg-parchment/60"
                      >
                        <td className="py-3.5 pl-5 pr-4">
                          <div className="flex items-center gap-3">
                            <span className="numeric grid size-9 place-items-center rounded-inner border border-ash bg-parchment text-[12px] font-medium">
                              {seat.label}
                            </span>
                            <span className="text-[11px] text-ink-soft">
                              {seat.session.studentNumber}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-medium">{seat.session.studentName}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusPill status={status} pulse={!expired}>
                            {expired ? 'Expired' : seat.status}
                          </StatusPill>
                        </td>
                        <td className="numeric px-4 py-3.5 text-ink-soft">
                          {start ? formatTimeOfDay(start) : '—'}
                        </td>
                        <td className="numeric px-4 py-3.5">{formatShort(duration)}</td>
                        <td className="py-3 pl-4 pr-5 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openSeat(seat)}
                            aria-label={`Review seat ${seat.label}`}
                          >
                            Review
                            <ChevronRight className="size-3.5" aria-hidden="true" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-ash md:hidden">
              {filteredRows.map(({ seat, start, duration }) => {
                const expired = isHoldExpired(seat, now)
                const status = expired ? 'expired' : seat.status
                return (
                  <button
                    key={seat.id}
                    type="button"
                    onClick={() => openSeat(seat)}
                    aria-label={`Review seat ${seat.label}, ${seat.session.studentName}`}
                    className="block w-full p-4 text-left transition-colors hover:bg-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="numeric grid size-10 shrink-0 place-items-center rounded-inner border border-ash bg-parchment text-[12px] font-medium">
                          {seat.label}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-medium">
                            {seat.session.studentName}
                          </p>
                          <p className="numeric truncate text-[12px] text-ink-soft">
                            {seat.session.studentNumber}
                          </p>
                        </div>
                      </div>
                      <StatusPill status={status} pulse={!expired}>
                        {expired ? 'Expired' : seat.status}
                      </StatusPill>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-ash pt-3 text-[12px] text-ink-soft">
                      <span>
                        Started {start ? formatTimeOfDay(start) : '—'}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="numeric">{formatShort(duration)}</span>
                        <ChevronRight className="size-3.5" aria-hidden="true" />
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </section>

      <p className="mt-4 text-[11px] text-ink-soft">
        {filteredRows.length} of {rows.length} sessions shown · updates every 30 seconds
      </p>

      <SeatDetailModal
        seat={activeSeat}
        open={seatModalOpen}
        onClose={closeSeat}
        onForceTimeOut={handleForceTimeOut}
      />

      <Toast message={notice} onClose={() => setNotice('')} />
    </AdminLayout>
  )
}
