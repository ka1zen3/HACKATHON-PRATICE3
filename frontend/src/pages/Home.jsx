import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Clock3, MapPin, Users } from 'lucide-react'
import { AppLayout } from '../components/AppLayout.jsx'
import { PageContainer } from '../components/PageContainer.jsx'
import { buttonClass } from '../lib/buttonClass.js'
import { SeatGrid } from '../components/SeatGrid.jsx'
import { SeatLegend } from '../components/SeatLegend.jsx'
import { StatusPill } from '../components/StatusPill.jsx'
import { Toast } from '../components/Toast.jsx'
import { useApp } from '../context/useApp.js'
import { AREAS } from '../data/mockData.js'
import { formatShort, getSeatStats } from '../lib/seats.js'

function LiveFloorCard({ seats, student, onSeatClick }) {
  const [activeArea, setActiveArea] = useState(AREAS[0].id)
  const stats = getSeatStats(seats)
  const area = AREAS.find((item) => item.id === activeArea) ?? AREAS[0]
  const areaSeats = seats.filter((seat) => seat.areaId === area.id)
  const areaOpen = areaSeats.filter((seat) => seat.status === 'vacant').length

  return (
    <div className="rounded-card border border-ash bg-canvas p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] text-ink-soft">Live floor</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="numeric text-[44px] font-medium leading-none tracking-[-0.04em]">
              {stats.vacant}
            </span>
            <span className="text-[13px] text-ink-soft">seats open now</span>
          </p>
        </div>
        <StatusPill status="live" pulse>
          Live
        </StatusPill>
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5" role="group" aria-label="Choose an area">
        {AREAS.map((item) => {
          const open = seats.filter(
            (seat) => seat.areaId === item.id && seat.status === 'vacant',
          ).length
          const active = item.id === activeArea
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => setActiveArea(item.id)}
              className={[
                'inline-flex h-8 items-center gap-1.5 rounded-pill border px-3 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
                active
                  ? 'border-ink bg-ink text-parchment'
                  : 'border-ash bg-canvas text-ink hover:border-ink',
              ].join(' ')}
            >
              {item.short}
              <span className={`numeric text-[10px] ${active ? 'text-parchment/60' : 'text-ink-soft'}`}>
                {open}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-5 rounded-inner bg-parchment p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[12px] font-medium">{area.name}</p>
          <p className="numeric text-[11px] text-ink-soft">{areaOpen} open</p>
        </div>
        <SeatGrid
          seats={areaSeats}
          areas={[area]}
          onSeatClick={onSeatClick}
          compact
          showAreaHeader={false}
        />
      </div>

      <SeatLegend compact className="mt-4" />

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-ash pt-4">
        <span className="text-[11px] text-ink-soft">Updated just now</span>
        <Link
          to={student ? '/reserve' : '/login'}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium underline decoration-1 underline-offset-4 hover:decoration-2"
        >
          Open full map
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}

function AreaCard({ area, seats, to }) {
  const areaSeats = seats.filter((seat) => seat.areaId === area.id)
  const open = areaSeats.filter((seat) => seat.status === 'vacant').length
  const percentage = Math.round((open / areaSeats.length) * 100)

  return (
    <Link
      to={to}
      className="group flex flex-col rounded-card border border-ash bg-canvas p-5 transition-colors duration-200 hover:border-ink sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-subheading font-medium">{area.name}</h3>
          <p className="mt-1 inline-flex items-center gap-1.5 text-[12px] text-ink-soft">
            <MapPin className="size-3.5" aria-hidden="true" />
            {area.floor}
          </p>
        </div>
        <span className="numeric text-[30px] font-medium leading-none tracking-[-0.04em]">
          {open}
        </span>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-ink-soft">{area.blurb}</p>

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

      <div className="mt-auto pt-5">
        <div className="flex h-1.5 overflow-hidden rounded-full bg-ash" aria-hidden="true">
          <span className="h-full rounded-full bg-signal-deep" style={{ width: `${percentage}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-[12px]">
          <span className="text-ink-soft">
            {open} open of {areaSeats.length}
          </span>
          <span className="inline-flex items-center gap-1 font-medium">
            View seats
            <ArrowRight
              className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
        </div>
      </div>
    </Link>
  )
}

const STEPS = [
  {
    title: 'Time in',
    body: 'Enter your student number and confirm your name. That is the whole gate.',
  },
  {
    title: 'Pick a live seat',
    body: 'Tap any green seat on the shared floor plan. It is held for fifteen minutes.',
  },
  {
    title: 'Claim and settle in',
    body: 'Tap “I’m here” when you arrive. Time out when you leave so the map stays honest.',
  },
]

export default function Home() {
  const navigate = useNavigate()
  const { seats, student, activeSession } = useApp()
  const [notice, setNotice] = useState('')
  const stats = useMemo(() => getSeatStats(seats), [seats])

  const handleSeatClick = (seat) => {
    if (seat.status === 'vacant') {
      navigate(student ? '/reserve' : '/login')
      return
    }

    if (seat.status === 'pending') {
      const left = Math.max(0, seat.session.claimDeadline - Date.now())
      setNotice(`Seat ${seat.label} is held for another ${formatShort(left)}.`)
      return
    }

    if (seat.status === 'overdue') {
      const over = Math.max(0, Date.now() - seat.session.dueAt)
      setNotice(`Seat ${seat.label} is overdue by ${formatShort(over)}. Staff have been notified.`)
      return
    }

    const duration = Math.max(0, Date.now() - seat.session.occupiedAt)
    setNotice(`Seat ${seat.label} is occupied for ${formatShort(duration)}.`)
  }

  const primaryTo = student ? (activeSession ? '/session' : '/reserve') : '/login'
  const primaryLabel = student ? (activeSession ? 'Your session' : 'Reserve a seat') : 'Time in'
  const secondaryTo = student ? '/session' : '#how-it-works'
  const secondaryLabel = student ? 'Your session' : 'How it works'

  return (
    <AppLayout>
      <section className="bg-parchment">
        <PageContainer className="grid gap-12 py-12 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14 lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-pill border border-signal-line bg-canvas px-3 py-1.5 text-[12px] font-medium text-signal-deep">
              <span className="size-1.5 rounded-full bg-signal-deep animate-pulse-dot" aria-hidden="true" />
              Live · {stats.vacant} of {stats.total} seats open
            </div>

            <h1 className="mt-6 max-w-[11ch] text-[clamp(3rem,8.4vw,5.8rem)] font-medium leading-[0.88] tracking-[-0.04em] text-ink">
              Sit down. Time in. Get to work.
            </h1>

            <p className="mt-6 max-w-[46ch] text-[17px] leading-[1.55] text-ink-soft">
              SeatSync shows every open seat in the library, live. Claim one in under a
              minute and keep an eye on your session from anywhere.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to={primaryTo} className={buttonClass({ size: 'lg' })}>
                {primaryLabel}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <a
                href={secondaryTo}
                className={buttonClass({ variant: 'ghost', size: 'lg' })}
              >
                {secondaryLabel}
              </a>
            </div>

            <div className="mt-10 grid max-w-[460px] grid-cols-3 gap-4 border-t border-ash pt-5 text-[12px] text-ink-soft">
              <span className="inline-flex items-center gap-2">
                <Users className="size-4 text-ink" aria-hidden="true" />
                {stats.occupied + stats.overdue} in use
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock3 className="size-4 text-ink" aria-hidden="true" />
                {stats.pending} held
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin className="size-4 text-ink" aria-hidden="true" />
                4 areas
              </span>
            </div>
          </div>

          <LiveFloorCard seats={seats} student={student} onSeatClick={handleSeatClick} />
        </PageContainer>
      </section>

      <section className="bg-canvas py-16 sm:py-20">
        <PageContainer>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="max-w-[16ch] text-[clamp(2rem,4.4vw,3.4rem)] font-medium leading-[1.02] tracking-[-0.03em]">
              Every area, one shared truth.
            </h2>
            <p className="max-w-[38ch] text-[15px] leading-relaxed text-ink-soft">
              Pick your kind of quiet. Availability updates as seats are claimed and
              released, on both sides of the desk.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {AREAS.map((area) => (
              <AreaCard
                key={area.id}
                area={area}
                seats={seats}
                to={student ? `/reserve?area=${area.id}` : '/login'}
              />
            ))}
          </div>
        </PageContainer>
      </section>

      <section id="how-it-works" className="scroll-mt-24 bg-parchment py-16 sm:py-20">
        <PageContainer className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <h2 className="max-w-[14ch] text-[clamp(2rem,4.4vw,3.4rem)] font-medium leading-[1.02] tracking-[-0.03em]">
              Three steps. No queue.
            </h2>
            <p className="mt-5 max-w-[38ch] text-[15px] leading-relaxed text-ink-soft">
              A fifteen-minute grace period keeps the map honest. If you do not show up,
              the seat goes back to the room.
            </p>
            <Link
              to={primaryTo}
              className={buttonClass({ size: 'md', className: 'mt-7' })}
            >
              {primaryLabel}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <ol className="grid gap-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="flex items-start gap-5 rounded-card border border-ash bg-canvas p-5 sm:p-7"
              >
                <span className="numeric mt-1 text-[13px] font-medium text-ink-soft">
                  0{index + 1}
                </span>
                <div>
                  <h3 className="text-subheading font-medium">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </PageContainer>
      </section>

      <section className="bg-signal">
        <PageContainer className="py-16 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
            <h2 className="max-w-[16ch] text-[clamp(2.4rem,6vw,4.6rem)] font-medium leading-[0.92] tracking-[-0.04em] text-ink">
              The seat you need is probably open.
            </h2>
            <div>
              <p className="text-sm text-ink/70">
                {stats.vacant} of {stats.total} seats are open right now.
              </p>
              <Link
                to={primaryTo}
                className="mt-4 inline-flex items-center gap-2 border-b border-ink pb-1 text-[15px] font-medium text-ink transition-colors hover:border-ink/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4 focus-visible:ring-offset-signal"
              >
                Find yours
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </PageContainer>
      </section>

      <Toast message={notice} onClose={() => setNotice('')} />
    </AppLayout>
  )
}
