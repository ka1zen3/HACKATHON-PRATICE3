import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  RiCheckLine,
  RiTimeLine,
  RiMapPinLine,
  RiArrowRightLine,
} from 'react-icons/ri'
import { AppLayout }     from '../components/AppLayout.jsx'
import { PageContainer } from '../components/PageContainer.jsx'
import { Button }        from '../components/Button.jsx'
import { AreaFilter }    from '../components/AreaFilter.jsx'
import { SeatGrid }      from '../components/SeatGrid.jsx'
import { SeatLegend }    from '../components/SeatLegend.jsx'
import { StatusPill }    from '../components/StatusPill.jsx'
import { Modal }         from '../components/Modal.jsx'
import { Toast }         from '../components/Toast.jsx'
import { useApp }        from '../context/useApp.js'
import { AREAS }         from '../data/mockData.js'
import { formatShort, getArea, getSeatStats } from '../lib/seats.js'
import { initials }      from '../lib/format.js'

export default function Reserve() {
  const { seats, student, activeSession, reserveSeat } = useApp()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialArea = searchParams.get('area')
  const [areaFilter, setAreaFilter] = useState(
    AREAS.some((a) => a.id === initialArea) ? initialArea : 'all',
  )
  const [selectedId, setSelectedId]   = useState(null)
  const [modalOpen,  setModalOpen]    = useState(false)
  const [notice,     setNotice]       = useState('')

  const stats        = useMemo(() => getSeatStats(seats), [seats])
  const selectedSeat = seats.find((s) => s.id === selectedId) ?? null
  const selectedArea = selectedSeat ? getArea(selectedSeat.areaId) : null
  const visibleAreas = areaFilter === 'all' ? AREAS : AREAS.filter((a) => a.id === areaFilter)
  const visibleSeats = areaFilter === 'all' ? seats  : seats.filter((s) => s.areaId === areaFilter)

  if (activeSession) return <Navigate to="/session" replace />

  const handleSeatClick = (seat) => {
    if (seat.status === 'vacant') {
      setSelectedId(seat.id)
      setNotice('')
      return
    }

    setSelectedId(null)

    if (seat.status === 'pending') {
      const left = Math.max(0, seat.session.claimDeadline - Date.now())
      setNotice(`Seat ${seat.label} is held for another ${formatShort(left)}.`)
      return
    }
    if (seat.status === 'overdue') {
      setNotice(`Seat ${seat.label} is overdue and staff are on it. Pick another seat.`)
      return
    }
    const duration = Math.max(0, Date.now() - seat.session.occupiedAt)
    setNotice(`Seat ${seat.label} is occupied for ${formatShort(duration)}. Pick another seat.`)
  }

  const handleReserve = () => {
    if (!selectedSeat) return
    const ok = reserveSeat(selectedSeat.id)
    if (!ok) {
      setModalOpen(false)
      setSelectedId(null)
      setNotice('That seat was just taken. Pick another one.')
      return
    }
    setModalOpen(false)
    navigate('/session')
  }

  return (
    <AppLayout>
      <div className="bg-parchment pb-28 pt-10 sm:pt-14 lg:pb-16">
        <PageContainer>
          {/* Page header */}
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="text-[clamp(2rem,4.6vw,3.6rem)] font-bold leading-[0.98] tracking-[-0.03em]">
                Reserve a seat
              </h1>
              <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-ink-soft">
                You&apos;re timed in as{' '}
                <span className="font-semibold text-ink">{student?.name}</span>.
                Pick any green seat and we&apos;ll hold it for 15 minutes.
              </p>
            </div>
            {/* Student badge */}
            <div className="flex items-center gap-3 rounded-pill border border-ash bg-canvas px-3 py-2">
              <span className="grid size-7 place-items-center rounded-full bg-lime text-[10px] font-bold text-ink">
                {initials(student?.name)}
              </span>
              <div className="text-[12px] leading-tight">
                <p className="font-semibold">{student?.number}</p>
                <p className="text-ink-soft">{stats.vacant} seats open</p>
              </div>
            </div>
          </div>

          {/* Area filter + status */}
          <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
            <AreaFilter areas={AREAS} seats={seats} value={areaFilter} onChange={setAreaFilter} />
            <StatusPill status="live" pulse>
              {stats.vacant} open
            </StatusPill>
          </div>

          {/* Two-column layout: floor plan + sidebar */}
          <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
            {/* Floor plan card */}
            <div className="rounded-card border border-ash bg-canvas p-4 sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[13px] font-semibold">
                  {areaFilter === 'all' ? 'All sections' : visibleAreas[0]?.name}
                </p>
                <SeatLegend />
              </div>
              <SeatGrid
                seats={visibleSeats}
                areas={visibleAreas}
                selectedId={selectedId}
                onSeatClick={handleSeatClick}
                showAreaHeader={areaFilter === 'all'}
                physical
              />
            </div>

            {/* Sidebar */}
            <aside className="lg:sticky lg:top-[96px] space-y-4">
              {/* Seat details card */}
              <div className="rounded-card border border-ash bg-canvas p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-subheading font-semibold">Your seat</h2>
                  <StatusPill status={selectedSeat ? 'vacant' : 'neutral'}>
                    {selectedSeat ? 'Selected' : 'None'}
                  </StatusPill>
                </div>

                {selectedSeat ? (
                  <>
                    <p className="numeric mt-4 text-[56px] font-bold leading-none tracking-[-0.04em]">
                      {selectedSeat.label}
                    </p>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-ink-soft">
                      <RiMapPinLine size={14} aria-hidden="true" />
                      {selectedArea.name} · {selectedArea.floor}
                    </p>

                    <dl className="mt-5 space-y-2.5 border-t border-ash pt-4 text-[13px]">
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-ink-soft">Hold window</dt>
                        <dd className="numeric font-semibold">15 minutes</dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-ink-soft">Session limit</dt>
                        <dd className="numeric font-semibold">4 hours</dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-ink-soft">Claim</dt>
                        <dd className="font-semibold">Tap I&apos;m here</dd>
                      </div>
                    </dl>

                    <Button size="xl" className="mt-6 w-full" onClick={() => setModalOpen(true)}>
                      Reserve seat
                      <RiArrowRightLine size={20} aria-hidden="true" />
                    </Button>
                  </>
                ) : (
                  <div className="mt-5 rounded-inner border border-dashed border-ash bg-parchment p-5">
                    <p className="text-sm font-semibold">Pick a green seat</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
                      Tap any open seat on the floor plan. Its details and hold window
                      will appear here.
                    </p>
                  </div>
                )}
              </div>

              {/* How the hold works */}
              <div className="rounded-card border border-ash bg-parchment p-5">
                <h3 className="inline-flex items-center gap-2 text-[14px] font-semibold">
                  <RiTimeLine size={16} className="text-ink-soft" aria-hidden="true" />
                  How the hold works
                </h3>
                <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-ink-soft">
                  <li className="flex gap-2">
                    <RiCheckLine size={14} className="mt-0.5 shrink-0 text-lime-deep" aria-hidden="true" />
                    15 minutes to arrive and tap I&apos;m here.
                  </li>
                  <li className="flex gap-2">
                    <RiCheckLine size={14} className="mt-0.5 shrink-0 text-lime-deep" aria-hidden="true" />
                    4 hours maximum per session.
                  </li>
                  <li className="flex gap-2">
                    <RiCheckLine size={14} className="mt-0.5 shrink-0 text-lime-deep" aria-hidden="true" />
                    Time out when you leave so the seat reopens.
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </PageContainer>
      </div>

      {/* Mobile sticky bar */}
      {selectedSeat && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ash bg-canvas p-4 lg:hidden">
          <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.1em] text-ink-soft">Selected</p>
              <p className="text-[18px] font-bold">
                {selectedSeat.label} · {selectedArea.short}
              </p>
            </div>
            <Button size="lg" onClick={() => setModalOpen(true)}>
              Reserve
            </Button>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Reserve seat ${selectedSeat?.label ?? ''}?`}
        description={selectedArea ? `${selectedArea.name} · ${selectedArea.floor}` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Not yet</Button>
            <Button onClick={handleReserve}>
              Reserve this seat
              <RiCheckLine size={16} aria-hidden="true" />
            </Button>
          </>
        }
      >
        <div className="rounded-inner border border-ash bg-parchment p-4">
          <div className="flex items-center justify-between gap-4 text-[13px]">
            <span className="text-ink-soft">Hold window</span>
            <span className="numeric font-semibold">15 minutes</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-4 text-[13px]">
            <span className="text-ink-soft">Session limit</span>
            <span className="numeric font-semibold">4 hours</span>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          We&apos;ll mark the seat as held. Tap{' '}
          <span className="font-semibold text-ink">I&apos;m here</span>{' '}
          when you arrive to start your session.
        </p>
      </Modal>

      <Toast message={notice} onClose={() => setNotice('')} />
    </AppLayout>
  )
}
