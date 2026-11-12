import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Armchair, Check, Clock3, LogOut, MapPin } from 'lucide-react'
import { AppLayout } from '../components/AppLayout.jsx'
import { PageContainer } from '../components/PageContainer.jsx'
import { Button } from '../components/Button.jsx'
import { EmptyState } from '../components/EmptyState.jsx'
import { Modal } from '../components/Modal.jsx'
import { StatusPill } from '../components/StatusPill.jsx'
import { Toast } from '../components/Toast.jsx'
import { useApp } from '../context/useApp.js'
import { useNow } from '../hooks/useNow.js'
import { formatClock, formatTimeOfDay, initials } from '../lib/format.js'
import { formatShort, getArea, getWindowProgress } from '../lib/seats.js'
import { buttonClass } from '../lib/buttonClass.js'

const BAR_TONES = {
  signal: 'bg-signal-deep',
  amber: 'bg-amber',
  danger: 'bg-danger',
}

export default function Session() {
  const { seats, student, activeSession, markHere, timeOut } = useApp()
  const now = useNow()
  const [modalOpen, setModalOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [endedSeat, setEndedSeat] = useState(null)

  const seat = activeSession
    ? seats.find((item) => item.id === activeSession.seatId)
    : null
  const area = seat ? getArea(seat.areaId) : null

  const view = (() => {
    if (!activeSession || !seat) return null

    const pending = activeSession.state === 'pending'
    const start = activeSession.occupiedAt ?? activeSession.reservedAt
    const progress = getWindowProgress(seat, now)
    const expired = pending && now >= activeSession.claimDeadline
    const remaining = pending
      ? Math.max(0, activeSession.claimDeadline - now)
      : Math.max(0, activeSession.dueAt - now)
    const elapsed = Math.max(0, now - start)
    const percent = Math.min(100, Math.round((progress.elapsed / progress.total) * 100))

    return {
      pending,
      expired,
      start,
      progress,
      remaining,
      elapsed,
      percent,
      timer: pending ? remaining : elapsed,
      timerLabel: pending
        ? expired
          ? 'Hold expired'
          : 'Time left to claim'
        : 'Time in session',
      helper: pending
        ? expired
          ? 'The 15-minute hold has ended. Release the seat so someone else can use it.'
          : `Tap I’m here within ${formatClock(remaining)} to keep this seat.`
        : `Time out when you leave. Your session ends at ${formatTimeOfDay(activeSession.dueAt)}.`,
      progressLabel: pending ? 'Grace window' : 'Session limit',
      supporting: `${formatShort(remaining)} left`,
    }
  })()

  const handleHere = () => {
    markHere()
    setNotice('You’re checked in. The clock is running.')
  }

  const handleEnd = () => {
    if (!seat) return
    const label = seat.label
    timeOut()
    setModalOpen(false)
    setEndedSeat(label)
  }

  const status = !activeSession
    ? 'neutral'
    : view?.expired
      ? 'expired'
      : activeSession.state === 'pending'
        ? 'pending'
        : 'occupied'

  return (
    <AppLayout>
      <div className="min-h-[70svh] bg-parchment py-10 sm:py-14">
        <PageContainer>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <StatusPill status={status} pulse={activeSession && !view?.expired}>
                {!activeSession
                  ? 'No session'
                  : view?.expired
                    ? 'Hold expired'
                    : activeSession.state === 'pending'
                      ? 'Held'
                      : 'In session'}
              </StatusPill>
              <h1 className="mt-3 text-[clamp(2rem,4.6vw,3.6rem)] font-medium leading-[0.98] tracking-[-0.03em]">
                Your session
              </h1>
            </div>

            {student && (
              <div className="flex items-center gap-3 rounded-pill border border-ash bg-canvas px-3 py-2">
                <span className="grid size-7 place-items-center rounded-full bg-signal text-[10px] font-medium text-ink">
                  {initials(student.name)}
                </span>
                <div className="text-[12px] leading-tight">
                  <p className="font-medium">{student.name}</p>
                  <p className="text-ink-soft">{student.number}</p>
                </div>
              </div>
            )}
          </div>

          {!activeSession ? (
            <div className="mt-8">
              {endedSeat ? (
                <EmptyState
                  icon={Check}
                  title="Session ended"
                  description={`Seat ${endedSeat} is open again. Someone else can take it from the live map.`}
                  action={
                    <div className="flex flex-wrap justify-center gap-2">
                      <Link to="/reserve" className={buttonClass({ size: 'md' })}>
                        Reserve another seat
                      </Link>
                      <Link to="/" className={buttonClass({ variant: 'outline', size: 'md' })}>
                        Back to live map
                      </Link>
                    </div>
                  }
                />
              ) : (
                <EmptyState
                  icon={Armchair}
                  title="No active session"
                  description="You’re timed in, but you haven’t claimed a seat yet. Pick one from the live floor and we’ll hold it for 15 minutes."
                  action={
                    <Link to="/reserve" className={buttonClass({ size: 'md' })}>
                      Reserve a seat
                    </Link>
                  }
                />
              )}
            </div>
          ) : (
            <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_340px] lg:items-start">
              <section className="rounded-card border border-ash bg-canvas p-5 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[12px] text-ink-soft">
                      {area.name} · {area.floor}
                    </p>
                    <p className="mt-1 text-[22px] font-medium tracking-[-0.02em]">
                      Seat {seat.label}
                    </p>
                  </div>
                  <StatusPill status={status} pulse={!view?.expired}>
                    {view?.expired
                      ? 'Expired'
                      : activeSession.state === 'pending'
                        ? 'Held'
                        : 'In session'}
                  </StatusPill>
                </div>

                <div className="mt-8">
                  <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-soft">
                    {view?.timerLabel}
                  </p>
                  <p
                    role="timer"
                    aria-live="off"
                    className={`numeric mt-2 text-[clamp(4rem,15vw,9.5rem)] font-medium leading-[0.82] tracking-[-0.04em] ${
                      view?.expired ? 'text-danger' : 'text-ink'
                    }`}
                  >
                    {formatClock(view?.timer ?? 0)}
                  </p>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between gap-3 text-[12px]">
                    <span className="text-ink-soft">{view?.progressLabel}</span>
                    <span className="numeric text-ink-soft">{view?.supporting}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-ash" aria-hidden="true">
                    <div
                      className={`h-full rounded-full transition-[width] duration-500 ${BAR_TONES[view?.progress.tone] ?? BAR_TONES.signal}`}
                      style={{ width: `${view?.percent ?? 0}%` }}
                    />
                  </div>
                </div>

                <p className="mt-4 max-w-[52ch] text-[13px] leading-relaxed text-ink-soft">
                  {view?.helper}
                </p>

                <div className="mt-7 flex flex-col gap-2 sm:flex-row">
                  {activeSession.state === 'pending' && !view?.expired && (
                    <>
                      <Button size="xl" className="sm:flex-1" onClick={handleHere}>
                        <Check className="size-5" aria-hidden="true" />
                        I&apos;m here
                      </Button>
                      <Button variant="outline" size="xl" onClick={() => setModalOpen(true)}>
                        Release seat
                      </Button>
                    </>
                  )}

                  {activeSession.state === 'pending' && view?.expired && (
                    <Button variant="danger" size="xl" onClick={() => setModalOpen(true)}>
                      Release seat
                    </Button>
                  )}

                  {activeSession.state === 'occupied' && (
                    <>
                      <Button size="xl" className="sm:flex-1" onClick={() => setModalOpen(true)}>
                        <LogOut className="size-5" aria-hidden="true" />
                        Time out
                      </Button>
                      <Link
                        to="/"
                        className={buttonClass({ variant: 'outline', size: 'xl' })}
                      >
                        Back to map
                      </Link>
                    </>
                  )}
                </div>
              </section>

              <aside>
                <div className="rounded-card border border-ash bg-canvas p-5 sm:p-6">
                  <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-soft">
                    Your seat
                  </p>
                  <p className="numeric mt-2 text-[52px] font-medium leading-none tracking-[-0.04em]">
                    {seat.label}
                  </p>
                  <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-ink-soft">
                    <MapPin className="size-3.5" aria-hidden="true" />
                    {area.name} · {area.floor}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {area.amenities.map((amenity) => (
                      <span
                        key={amenity}
                        className="rounded-pill border border-ash px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-soft"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>

                  <dl className="mt-5 space-y-2.5 border-t border-ash pt-4 text-[13px]">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-ink-soft">Student</dt>
                      <dd className="text-right font-medium">{student?.name}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-ink-soft">
                        {activeSession.state === 'pending' ? 'Reserved' : 'Claimed'}
                      </dt>
                      <dd className="numeric text-right">{formatTimeOfDay(view?.start)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-ink-soft">Elapsed</dt>
                      <dd className="numeric text-right">{formatClock(view?.elapsed ?? 0)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-ink-soft">
                        {activeSession.state === 'pending' ? 'Claim by' : 'Ends at'}
                      </dt>
                      <dd className="numeric text-right">
                        {formatTimeOfDay(
                          activeSession.state === 'pending'
                            ? activeSession.claimDeadline
                            : activeSession.dueAt,
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-4 rounded-card border border-ash bg-parchment p-5">
                  <h2 className="inline-flex items-center gap-2 text-[14px] font-medium">
                    <Clock3 className="size-4" aria-hidden="true" />
                    Session rules
                  </h2>
                  <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-ink-soft">
                    <li>15-minute grace period to claim your seat.</li>
                    <li>4-hour maximum per session.</li>
                    <li>Time out when you leave so the seat reopens.</li>
                  </ul>
                </div>
              </aside>
            </div>
          )}
        </PageContainer>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          activeSession?.state === 'occupied'
            ? `Time out of seat ${seat?.label ?? ''}?`
            : `Release seat ${seat?.label ?? ''}?`
        }
        description="This ends the session immediately and returns the seat to the live map."
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Keep session
            </Button>
            <Button variant="danger" onClick={handleEnd}>
              {activeSession?.state === 'occupied' ? 'Time out' : 'Release seat'}
            </Button>
          </>
        }
      >
        <div className="rounded-inner border border-ash bg-parchment p-4 text-[13px] text-ink-soft">
          <p>
            {activeSession?.state === 'occupied'
              ? `You’ve been in this seat for ${formatShort(view?.elapsed ?? 0)}.`
              : `The seat is held for another ${formatShort(view?.remaining ?? 0)}.`}
          </p>
        </div>
      </Modal>

      <Toast message={notice} onClose={() => setNotice('')} />
    </AppLayout>
  )
}
