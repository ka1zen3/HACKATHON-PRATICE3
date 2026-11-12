import { useCallback, useEffect, useRef, useState } from 'react'
import { RiCheckLine, RiArrowRightSLine, RiRefreshLine, RiWifiOffLine } from 'react-icons/ri'
import { AdminLayout } from '../../components/AdminLayout.jsx'
import { AreaFilter } from '../../components/AreaFilter.jsx'
import { Button } from '../../components/Button.jsx'
import { SeatDetailModal } from '../../components/SeatDetailModal.jsx'
import { SeatGrid } from '../../components/SeatGrid.jsx'
import { SeatLegend } from '../../components/SeatLegend.jsx'
import { StatusPill } from '../../components/StatusPill.jsx'
import { Toast } from '../../components/Toast.jsx'
import { useApp } from '../../context/useApp.js'
import { useAdminApi } from '../../hooks/useAdminApi.js'
import { useNow } from '../../hooks/useNow.js'
import { AREAS } from '../../data/mockData.js'
import {
  attentionReason,
  getAttentionRows,
  getSeatStats,
  isHoldExpired,
} from '../../lib/seats.js'

const STATS = [
  { key: 'vacant',    label: 'Open',      tone: 'text-signal-deep' },
  { key: 'pending',   label: 'Held',      tone: 'text-ink' },
  { key: 'inUse',     label: 'In use',    tone: 'text-ink' },
  { key: 'attention', label: 'Attention', tone: 'text-amber' },
]

// How often to re-fetch the floor from the API (ms)
const POLL_INTERVAL = 10_000

export default function AdminDashboard() {
  // Context seats used as the initial/fallback data source
  const { seats: ctxSeats, areas: ctxAreas, forceTimeOut, resetDemo } = useApp()
  const { getFloor, releaseSession } = useAdminApi()
  const now = useNow(1000)

  // Live data state — starts from context, refreshed by API
  const [seats,      setSeats]      = useState(ctxSeats)
  const [areas,      setAreas]      = useState(ctxAreas)
  const [offline,    setOffline]    = useState(false)
  const [offlineReason, setOfflineReason] = useState('')
  const [lastSync,   setLastSync]   = useState(null)
  const [areaFilter, setAreaFilter] = useState('all')
  const [activeSeat, setActiveSeat] = useState(null)
  const [seatModalOpen, setSeatModalOpen] = useState(false)
  const [notice,     setNotice]     = useState('')

  // ── Fetch live floor from backend ──────────────────────────
  const fetchFloor = useCallback(async () => {
    const { data, error, unauthorized } = await getFloor()
    if (unauthorized) return // redirect handled by adminLogout
    if (error || !data) {
      setOffline(true)
      setOfflineReason(error ?? 'Unknown error')
      return
    }
    setOffline(false)
    setOfflineReason('')
    setAreas(data.areas ?? ctxAreas)
    setSeats(data.seats ?? ctxSeats)
    setLastSync(Date.now())
  }, [getFloor, ctxAreas, ctxSeats])

  // Initial load + polling
  useEffect(() => {
    fetchFloor()
    const id = setInterval(fetchFloor, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetchFloor])

  // Keep local seats in sync when context changes (student actions in same tab)
  const prevCtxSeats = useRef(ctxSeats)
  useEffect(() => {
    if (ctxSeats !== prevCtxSeats.current) {
      prevCtxSeats.current = ctxSeats
      // Don't overwrite if we have live DB data
      if (offline) setSeats(ctxSeats)
    }
  }, [ctxSeats, offline])

  const stats     = getSeatStats(seats)
  const attention = getAttentionRows(seats, now)
  const visibleSeats =
    areaFilter === 'all' ? seats : seats.filter((s) => s.areaId === areaFilter)

  const statValues = {
    vacant:    stats.vacant,
    pending:   stats.pending,
    inUse:     stats.occupied + stats.overdue,
    attention: attention.length,
  }

  const openSeat  = (seat) => { setActiveSeat(seat); setSeatModalOpen(true) }
  const closeSeat = () => { setSeatModalOpen(false); setActiveSeat(null) }

  const handleForceTimeOut = async (seatId) => {
    const label = activeSeat?.label
    // Optimistic: update local state immediately
    forceTimeOut(seatId)
    setSeats((prev) =>
      prev.map((s) => s.id === seatId ? { ...s, status: 'vacant', session: null } : s),
    )
    closeSeat()
    if (label) setNotice(`Seat ${label} is open again.`)
    // Persist to DB
    await releaseSession(seatId)
    // Re-fetch to confirm
    setTimeout(fetchFloor, 500)
  }

  const handleReset = () => {
    resetDemo()
    setSeats(ctxSeats)
    closeSeat()
    setNotice('Demo data reset to the opening snapshot.')
  }

  const handleManualRefresh = () => {
    fetchFloor()
    setNotice('Refreshed from database.')
  }

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <StatusPill status="live" pulse>Live floor</StatusPill>
          <h1 className="mt-3 text-[clamp(1.9rem,4vw,2.8rem)] font-medium leading-[1] tracking-[-0.03em]">
            Live monitor
          </h1>
          <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-ink-soft">
            Every seat, every session, in real time. Review holds and release seats
            that need a librarian.
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
          <Button variant="outline" size="sm" onClick={handleManualRefresh}>
            <RiRefreshLine size={14} aria-hidden="true" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset demo
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      <section aria-label="Floor summary" className="mt-7 rounded-card border border-ash bg-canvas">
        <dl className="grid grid-cols-2 divide-x divide-y divide-ash sm:grid-cols-4 sm:divide-y-0">
          {STATS.map((stat) => (
            <div key={stat.key} className="px-5 py-4">
              <dt className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-soft">
                {stat.label}
              </dt>
              <dd className={`numeric mt-1 text-[30px] font-medium leading-none ${stat.tone}`}>
                {statValues[stat.key]}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        {/* Seat map */}
        <section className="rounded-card border border-ash bg-canvas p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-[17px] font-medium tracking-[-0.01em]">Seat map</h2>
              <p className="mt-1 text-[12px] text-ink-soft">
                Select any seat to review its session.
                {lastSync && (
                  <span className="ml-2 text-stone">
                    Synced {Math.round((now - lastSync) / 1000)}s ago
                  </span>
                )}
              </p>
            </div>
            <AreaFilter areas={areas} seats={seats} value={areaFilter} onChange={setAreaFilter} />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-ash py-3">
            <SeatLegend />
            <span className="text-[11px] text-ink-soft">{visibleSeats.length} seats shown</span>
          </div>

          <div className="mt-6">
            <SeatGrid seats={visibleSeats} areas={areas} onSeatClick={openSeat} admin />
          </div>
        </section>

        {/* Attention sidebar */}
        <aside className="space-y-4">
          <section className="rounded-card border border-ash bg-canvas p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[17px] font-medium tracking-[-0.01em]">Needs attention</h2>
                <p className="mt-1 text-[12px] text-ink-soft">
                  Overdue, expiring, or nearly finished.
                </p>
              </div>
              <span className="numeric grid size-8 place-items-center rounded-full border border-ash bg-parchment text-[12px] font-medium">
                {attention.length}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {attention.length === 0 ? (
                <div className="rounded-inner border border-dashed border-ash bg-parchment px-4 py-8 text-center">
                  <span className="mx-auto grid size-9 place-items-center rounded-full bg-signal-wash text-signal-deep">
                    <RiCheckLine size={16} aria-hidden="true" />
                  </span>
                  <p className="mt-3 text-[14px] font-medium">All clear</p>
                  <p className="mt-1 text-[12px] text-ink-soft">
                    No holds or sessions need a decision right now.
                  </p>
                </div>
              ) : (
                attention.map((seat) => {
                  const expired = isHoldExpired(seat, now)
                  const status  = expired ? 'expired' : seat.status
                  return (
                    <button
                      key={seat.id}
                      type="button"
                      onClick={() => openSeat(seat)}
                      className="group flex w-full items-center gap-3 rounded-inner border border-ash bg-canvas p-3 text-left transition-colors hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                    >
                      <span className="numeric grid size-11 shrink-0 place-items-center rounded-inner border border-ash bg-parchment text-[13px] font-medium">
                        {seat.label}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">
                          {seat.session.studentName}
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-ink-soft">
                          {attentionReason(seat, now)}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1.5">
                        <StatusPill status={status} pulse={!expired} className="hidden sm:inline-flex">
                          {expired ? 'Expired' : seat.status}
                        </StatusPill>
                        <RiArrowRightSLine
                          size={16}
                          className="text-stone transition-transform group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </section>

          <section className="rounded-card border border-ash bg-parchment p-5">
            <h2 className="text-[14px] font-medium">Desk checklist</h2>
            <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-ink-soft">
              <li>Expired holds should be released before the seat is reassigned.</li>
              <li>Force time-out ends the student session immediately.</li>
              <li>Every release updates the live map and session list.</li>
            </ul>
            <p className="mt-4 border-t border-ash pt-3 text-[11px] text-ink-soft">
              Syncs every {POLL_INTERVAL / 1000}s from database. Demo data resets from the button above.
            </p>
          </section>
        </aside>
      </div>

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
