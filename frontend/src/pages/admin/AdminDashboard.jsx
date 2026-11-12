import { useState } from 'react'
import { Check, ChevronRight, RotateCcw } from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout.jsx'
import { AreaFilter } from '../../components/AreaFilter.jsx'
import { Button } from '../../components/Button.jsx'
import { SeatDetailModal } from '../../components/SeatDetailModal.jsx'
import { SeatGrid } from '../../components/SeatGrid.jsx'
import { SeatLegend } from '../../components/SeatLegend.jsx'
import { StatusPill } from '../../components/StatusPill.jsx'
import { Toast } from '../../components/Toast.jsx'
import { useApp } from '../../context/useApp.js'
import { useNow } from '../../hooks/useNow.js'
import { AREAS } from '../../data/mockData.js'
import {
  attentionReason,
  getAttentionRows,
  getSeatStats,
  isHoldExpired,
} from '../../lib/seats.js'

const STATS = [
  { key: 'vacant', label: 'Open', tone: 'text-signal-deep' },
  { key: 'pending', label: 'Held', tone: 'text-ink' },
  { key: 'inUse', label: 'In use', tone: 'text-ink' },
  { key: 'attention', label: 'Attention', tone: 'text-amber' },
]

export default function AdminDashboard() {
  const { seats, forceTimeOut, resetDemo } = useApp()
  const now = useNow()
  const [areaFilter, setAreaFilter] = useState('all')
  const [activeSeat, setActiveSeat] = useState(null)
  const [seatModalOpen, setSeatModalOpen] = useState(false)
  const [notice, setNotice] = useState('')

  const stats = getSeatStats(seats)
  const attention = getAttentionRows(seats, now)
  const visibleSeats =
    areaFilter === 'all'
      ? seats
      : seats.filter((seat) => seat.areaId === areaFilter)

  const statValues = {
    vacant: stats.vacant,
    pending: stats.pending,
    inUse: stats.occupied + stats.overdue,
    attention: attention.length,
  }

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
    setNotice('Demo data reset to the opening snapshot.')
  }

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <StatusPill status="live" pulse>
            Live floor
          </StatusPill>
          <h1 className="mt-3 text-[clamp(1.9rem,4vw,2.8rem)] font-medium leading-[1] tracking-[-0.03em]">
            Live monitor
          </h1>
          <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-ink-soft">
            Every seat, every session, in real time. Review holds and release seats
            that need a librarian.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Reset demo
        </Button>
      </div>

      <section
        aria-label="Floor summary"
        className="mt-7 rounded-card border border-ash bg-canvas"
      >
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
        <section className="rounded-card border border-ash bg-canvas p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-[17px] font-medium tracking-[-0.01em]">Seat map</h2>
              <p className="mt-1 text-[12px] text-ink-soft">
                Select any seat to review its session.
              </p>
            </div>
            <AreaFilter
              areas={AREAS}
              seats={seats}
              value={areaFilter}
              onChange={setAreaFilter}
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-ash py-3">
            <SeatLegend />
            <span className="text-[11px] text-ink-soft">
              {visibleSeats.length} seats shown
            </span>
          </div>

          <div className="mt-6">
            <SeatGrid
              seats={visibleSeats}
              areas={AREAS}
              onSeatClick={openSeat}
              admin
            />
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-card border border-ash bg-canvas p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[17px] font-medium tracking-[-0.01em]">
                  Needs attention
                </h2>
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
                    <Check className="size-4" aria-hidden="true" />
                  </span>
                  <p className="mt-3 text-[14px] font-medium">All clear</p>
                  <p className="mt-1 text-[12px] text-ink-soft">
                    No holds or sessions need a decision right now.
                  </p>
                </div>
              ) : (
                attention.map((seat) => {
                  const expired = isHoldExpired(seat, now)
                  const status = expired ? 'expired' : seat.status
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
                        <ChevronRight
                          className="size-4 text-stone transition-transform group-hover:translate-x-0.5"
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
              Snapshot updates every second. Demo data resets from the button above.
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
