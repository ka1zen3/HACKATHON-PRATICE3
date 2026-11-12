import { useCallback, useEffect, useState } from 'react'
import { RiArrowRightSLine, RiListCheck2, RiRefreshLine, RiSearchLine, RiCloseLine, RiWifiOffLine } from 'react-icons/ri'
import { AdminLayout } from '../../components/AdminLayout.jsx'
import { Button } from '../../components/Button.jsx'
import { EmptyState } from '../../components/EmptyState.jsx'
import { SeatDetailModal } from '../../components/SeatDetailModal.jsx'
import { StatusPill } from '../../components/StatusPill.jsx'
import { Toast } from '../../components/Toast.jsx'
import { useApp } from '../../context/useApp.js'
import { useAdminApi } from '../../hooks/useAdminApi.js'
import { useNow } from '../../hooks/useNow.js'
import { formatShort, isHoldExpired } from '../../lib/seats.js'
import { formatTimeOfDay, plural } from '../../lib/format.js'

const POLL_INTERVAL = 10_000

// Convert a DB session row → the seat-shape the existing SeatDetailModal expects
function dbSessionToSeat(s) {
  return {
    id:     s.seat_id,
    label:  s.seat_id,
    areaId: s.area_id,
    tableId: null,
    status: s.status,
    session: {
      studentName:   s.student_name,
      studentNumber: s.student_number,
      reservedAt:    s.reserved_at    ? new Date(s.reserved_at).getTime()    : null,
      claimDeadline: s.claim_deadline ? new Date(s.claim_deadline).getTime() : null,
      occupiedAt:    s.occupied_at    ? new Date(s.occupied_at).getTime()    : null,
      dueAt:         s.due_at         ? new Date(s.due_at).getTime()         : null,
    },
  }
}

export default function AdminSessions() {
  const { seats: ctxSeats, forceTimeOut, resetDemo } = useApp()
  const { getSessions, releaseSession } = useAdminApi()
  const now = useNow(1000)

  const [rows,          setRows]          = useState([])
  const [offline,       setOffline]       = useState(false)
  const [offlineReason, setOfflineReason] = useState('')
  const [lastSync,      setLastSync]      = useState(null)
  const [query,         setQuery]         = useState('')
  const [filter,        setFilter]        = useState('all')
  const [activeSeat,    setActiveSeat]    = useState(null)
  const [seatModalOpen, setSeatModalOpen] = useState(false)
  const [notice,        setNotice]        = useState('')

  // ── Build rows from API sessions ─────────────────────────────
  const buildRowsFromApi = useCallback((sessions) =>
    sessions.map((s) => {
      const seat = dbSessionToSeat(s)
      const start = seat.session.occupiedAt ?? seat.session.reservedAt
      const duration = now - (start ?? now)
      const effectiveStatus =
        seat.status === 'occupied' && seat.session.dueAt && now >= seat.session.dueAt
          ? 'overdue'
          : seat.status
      return { seat, start, duration, effectiveStatus }
    }).sort((a, b) => b.duration - a.duration),
  [now])

  // ── Fetch from API ───────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    const { data, error, unauthorized } = await getSessions()
    if (unauthorized) return // adminLogout() already called, redirect will happen
    if (error || !data) {
      setOffline(true)
      setOfflineReason(error ?? 'Unknown error')
      return
    }
    setOffline(false)
    setOfflineReason('')
    setRows(buildRowsFromApi(data))
    setLastSync(Date.now())
  }, [getSessions, buildRowsFromApi])

  useEffect(() => {
    fetchSessions()
    const id = setInterval(fetchSessions, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetchSessions])

  // Counts derived from current rows
  const counts = {
    all:      rows.length,
    occupied: rows.filter((r) => r.effectiveStatus === 'occupied').length,
    pending:  rows.filter((r) => r.effectiveStatus === 'pending').length,
    overdue:  rows.filter((r) => r.effectiveStatus === 'overdue').length,
  }

  const filters = [
    { id: 'all',      label: 'All',     count: counts.all },
    { id: 'occupied', label: 'In use',  count: counts.occupied },
    { id: 'pending',  label: 'Held',    count: counts.pending },
    { id: 'overdue',  label: 'Overdue', count: counts.overdue },
  ]

  const normalizedQuery = query.trim().toLowerCase()
  const filteredRows = rows.filter((row) => {
    if (filter !== 'all' && row.effectiveStatus !== filter) return false
    if (!normalizedQuery) return true
    return [row.seat.label, row.seat.session.studentName, row.seat.session.studentNumber]
      .join(' ').toLowerCase().includes(normalizedQuery)
  })

  const openSeat  = (seat) => { setActiveSeat(seat); setSeatModalOpen(true) }
  const closeSeat = () => { setSeatModalOpen(false); setActiveSeat(null) }

  const handleForceTimeOut = async (seatId) => {
    const label = activeSeat?.label
    // Optimistic remove from list
    setRows((prev) => prev.filter((r) => r.seat.id !== seatId))
    forceTimeOut(seatId) // keep context in sync
    closeSeat()
    if (label) setNotice(`Seat ${label} is open again.`)
    // Persist to DB
    await releaseSession(seatId)
    setTimeout(fetchSessions, 500)
  }

  const handleReset = () => {
    resetDemo()
    setQuery('')
    setFilter('all')
    setNotice('Demo data reset to the opening snapshot.')
    setTimeout(fetchSessions, 300)
  }

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <StatusPill status="live" pulse>Live log</StatusPill>
          <h1 className="mt-3 text-[clamp(1.9rem,4vw,2.8rem)] font-medium leading-[1] tracking-[-0.03em]">
            Active sessions
          </h1>
          <p className="mt-2 max-w-[54ch] text-sm leading-relaxed text-ink-soft">
            {plural(rows.length, 'session')} open right now.
            {lastSync && !offline && (
              <span className="ml-1 text-stone text-[11px]">
                · synced {Math.round((now - lastSync) / 1000)}s ago
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {offline && (
            <span className="inline-flex items-center gap-1.5 rounded-pill border border-danger/30 bg-danger-wash px-3 py-1.5 text-[11px] font-medium text-danger">
              <RiWifiOffLine size={13} aria-hidden="true" />
              {offlineReason.includes('unreachable')
                ? 'Backend offline — run node server.js'
                : offlineReason || 'Cannot reach backend'}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchSessions}>
            <RiRefreshLine size={14} aria-hidden="true" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset demo
          </Button>
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="mt-7 flex flex-col gap-3 rounded-card border border-ash bg-canvas p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-[340px]">
          <label htmlFor="session-search" className="sr-only">Search sessions</label>
          <RiSearchLine size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone" aria-hidden="true" />
          <input
            id="session-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search seat, student, or number"
            className="h-10 w-full rounded-input border border-ash bg-parchment pl-10 pr-9 text-[13px] text-ink placeholder:text-stone focus:border-signal-deep focus:outline-none focus:ring-2 focus:ring-signal/40"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search"
              className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-ink-soft transition-colors hover:bg-ash hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">
              <RiCloseLine size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter sessions">
          {filters.map((item) => {
            const active = filter === item.id
            return (
              <button key={item.id} type="button" aria-pressed={active} onClick={() => setFilter(item.id)}
                className={[
                  'inline-flex h-8 items-center gap-1.5 rounded-pill border px-3 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
                  active ? 'border-ink bg-ink text-parchment' : 'border-ash bg-canvas text-ink hover:border-ink',
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

      {/* Table */}
      <section className="mt-4 overflow-hidden rounded-card border border-ash bg-canvas">
        {filteredRows.length === 0 ? (
          <EmptyState
            icon={offline ? RiWifiOffLine : RiListCheck2}
            title={offline ? 'Backend offline' : 'No sessions match'}
            description={
              offline
                ? 'Run `node server.js` in the backend folder, then click Refresh.'
                : 'Try a different search or filter. Released seats drop off this list immediately.'
            }
            action={
              offline ? (
                <Button variant="outline" size="sm" onClick={fetchSessions}>
                  <RiRefreshLine size={14} aria-hidden="true" />
                  Retry connection
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => { setQuery(''); setFilter('all') }}>
                  Clear filters
                </Button>
              )
            }
            className="rounded-none border-0 border-dashed bg-canvas"
          />
        ) : (
          <>
            {/* Desktop table */}
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
                  {filteredRows.map(({ seat, start, duration, effectiveStatus }) => {
                    const expired = isHoldExpired(seat, now)
                    const status  = expired ? 'expired' : effectiveStatus
                    return (
                      <tr key={seat.id} className="border-b border-ash text-[13px] last:border-0 hover:bg-parchment/60">
                        <td className="py-3.5 pl-5 pr-4">
                          <div className="flex items-center gap-3">
                            <span className="numeric grid size-9 place-items-center rounded-inner border border-ash bg-parchment text-[12px] font-medium">
                              {seat.label}
                            </span>
                            <span className="text-[11px] text-ink-soft">{seat.session.studentNumber}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-medium">{seat.session.studentName}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusPill status={status} pulse={!expired && effectiveStatus !== 'overdue'}>
                            {status === 'expired' ? 'Expired' : status}
                          </StatusPill>
                        </td>
                        <td className="numeric px-4 py-3.5 text-ink-soft">
                          {start ? formatTimeOfDay(start) : '—'}
                        </td>
                        <td className="numeric px-4 py-3.5">{formatShort(duration)}</td>
                        <td className="py-3 pl-4 pr-5 text-right">
                          <Button variant="outline" size="sm" onClick={() => openSeat(seat)} aria-label={`Review seat ${seat.label}`}>
                            Review
                            <RiArrowRightSLine size={14} aria-hidden="true" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-ash md:hidden">
              {filteredRows.map(({ seat, start, duration, effectiveStatus }) => {
                const expired = isHoldExpired(seat, now)
                const status  = expired ? 'expired' : effectiveStatus
                return (
                  <button key={seat.id} type="button" onClick={() => openSeat(seat)}
                    aria-label={`Review seat ${seat.label}, ${seat.session.studentName}`}
                    className="block w-full p-4 text-left transition-colors hover:bg-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="numeric grid size-10 shrink-0 place-items-center rounded-inner border border-ash bg-parchment text-[12px] font-medium">
                          {seat.label}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-medium">{seat.session.studentName}</p>
                          <p className="numeric truncate text-[12px] text-ink-soft">{seat.session.studentNumber}</p>
                        </div>
                      </div>
                      <StatusPill status={status} pulse={!expired && effectiveStatus !== 'overdue'}>
                        {status === 'expired' ? 'Expired' : status}
                      </StatusPill>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-ash pt-3 text-[12px] text-ink-soft">
                      <span>Started {start ? formatTimeOfDay(start) : '—'}</span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="numeric">{formatShort(duration)}</span>
                        <RiArrowRightSLine size={14} aria-hidden="true" />
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
        {filteredRows.length} of {rows.length} sessions shown · live
      </p>

      <SeatDetailModal seat={activeSeat} open={seatModalOpen} onClose={closeSeat} onForceTimeOut={handleForceTimeOut} />
      <Toast message={notice} onClose={() => setNotice('')} />
    </AdminLayout>
  )
}
