import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiCheckLine,
  RiHashtag,
  RiRefreshLine,
} from 'react-icons/ri'
import { Logo }        from '../components/Logo.jsx'
import { Button }      from '../components/Button.jsx'
import { StatusPill }  from '../components/StatusPill.jsx'
import { useApp }      from '../context/useApp.js'
import { DEMO_STUDENT_NUMBER } from '../data/mockData.js'
import { formatClock, initials } from '../lib/format.js'
import { getSeatStats, hoursUntilClose } from '../lib/seats.js'

function StepBars({ step }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1.5" aria-hidden="true">
        <span className={`h-1.5 w-10 rounded-full transition-colors ${step >= 1 ? 'bg-ink' : 'bg-ink/15'}`} />
        <span className={`h-1.5 w-10 rounded-full transition-colors ${step >= 2 ? 'bg-ink' : 'bg-ink/15'}`} />
      </div>
      <span className="text-[12px] font-semibold text-ink-soft">Step {step} of 2</span>
    </div>
  )
}

export default function Login() {
  const { seats, findStudentByNumber, confirmStudent } = useApp()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [step,      setStep]      = useState(1)
  const [value,     setValue]     = useState('')
  const [candidate, setCandidate] = useState(null)
  const [error,     setError]     = useState('')
  const stats   = useMemo(() => getSeatStats(seats), [seats])
  const closing = hoursUntilClose()

  const handleLookup = (event) => {
    event.preventDefault()
    const found = findStudentByNumber(value)
    if (!found) {
      setError('We could not find that number. Check the digits, or use the demo number below.')
      return
    }
    setError('')
    setCandidate(found)
    setStep(2)
  }

  const handleConfirm = () => {
    if (!candidate) return
    confirmStudent(candidate)
    const from = location.state?.from
    const dest = from && from !== '/login' ? from : '/reserve'
    navigate(dest, { replace: true })
  }

  const handleBack = () => {
    setStep(1)
    setCandidate(null)
    setError('')
  }

  return (
    <div className="min-h-svh bg-lime text-ink">
      {/* Top bar */}
      <header className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Logo tone="onGreen" />
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[13px] font-semibold underline decoration-1 underline-offset-4 transition-colors hover:decoration-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4 focus-visible:ring-offset-lime"
        >
          <RiArrowLeftLine size={16} aria-hidden="true" />
          Back to live map
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-[1400px] gap-10 px-5 pb-16 pt-4 sm:px-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-center lg:gap-16 lg:pb-24 lg:pt-8">
        {/* Left — hero copy */}
        <section>
          <StepBars step={step} />

          <h1 className="mt-6 text-[clamp(4.6rem,16vw,12rem)] font-extrabold leading-[0.78] tracking-[-0.04em] text-ink">
            <span className="block">TIME</span>
            <span className="block">IN.</span>
          </h1>

          <p className="mt-8 max-w-[38ch] text-[17px] leading-[1.5] text-ink/75">
            Your student number is the only key. Confirm who you are, then pick a seat
            from the live floor.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-ink/20 pt-5 text-[13px] text-ink/70">
            <span className="inline-flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-ink" aria-hidden="true" />
              {stats.vacant} seats open now
            </span>
            <span>Library closes in {formatClock(closing)}</span>
          </div>
        </section>

        {/* Right — form card */}
        <section>
          <div className="rounded-card border border-ink/10 bg-canvas p-6 sm:p-8 lg:p-9">
            {step === 1 ? (
              <form onSubmit={handleLookup} noValidate>
                <div className="flex items-center justify-between gap-4">
                  <StatusPill status="live" pulse>Time in</StatusPill>
                  <span className="text-[11px] uppercase tracking-[0.1em] text-ink-soft">
                    No password
                  </span>
                </div>

                <h2 className="mt-6 text-[clamp(1.75rem,4vw,2.4rem)] font-bold leading-[1.02] tracking-[-0.03em]">
                  Your student number
                </h2>
                <p className="mt-2 max-w-[38ch] text-sm leading-relaxed text-ink-soft">
                  We use it to find your record. No account, no password, no queue.
                </p>

                <div className="mt-7">
                  <label htmlFor="student-number" className="text-[13px] font-semibold text-ink">
                    Student number
                  </label>
                  <div className="relative mt-2">
                    <RiHashtag
                      size={20}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft"
                      aria-hidden="true"
                    />
                    <input
                      id="student-number"
                      name="student-number"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      autoFocus
                      value={value}
                      onChange={(e) => { setValue(e.target.value); if (error) setError('') }}
                      placeholder="23-00174"
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? 'sn-error' : 'sn-hint'}
                      className="h-[76px] w-full rounded-input border border-ash bg-canvas pl-12 pr-4 text-[24px] font-semibold tracking-[0.02em] text-ink numeric placeholder:text-stone focus:border-ink focus:outline-none focus:ring-2 focus:ring-lime sm:text-[28px]"
                    />
                  </div>

                  {error ? (
                    <p id="sn-error" role="alert" className="mt-2 text-[13px] font-semibold text-danger">
                      {error}
                    </p>
                  ) : (
                    <p id="sn-hint" className="mt-2 text-[12px] text-ink-soft">
                      Format: 2-digit year, a dash, then 5 digits — e.g. 23-00174
                    </p>
                  )}
                </div>

                <Button type="submit" size="xl" className="mt-6 w-full">
                  Continue
                  <RiArrowRightLine size={20} aria-hidden="true" />
                </Button>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-ash pt-4">
                  <span className="text-[12px] text-ink-soft">Demo student</span>
                  <button
                    type="button"
                    onClick={() => { setValue(DEMO_STUDENT_NUMBER); setError('') }}
                    className="inline-flex items-center gap-1.5 rounded-pill border border-ash px-3 py-1.5 text-[12px] font-semibold text-ink transition-colors hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                  >
                    <RiRefreshLine size={14} aria-hidden="true" />
                    24-00457
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div className="flex items-center justify-between gap-4">
                  <StatusPill status="live" pulse>Identity found</StatusPill>
                  <span className="text-[11px] uppercase tracking-[0.1em] text-ink-soft">Step 2 of 2</span>
                </div>

                <div className="mt-7 flex items-center gap-4">
                  <span className="grid size-16 shrink-0 place-items-center rounded-full bg-lime text-[20px] font-bold text-ink">
                    {initials(candidate.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] text-ink-soft">Is this you?</p>
                    <h2 className="truncate text-[clamp(1.8rem,4.4vw,2.6rem)] font-bold leading-[1.05] tracking-[-0.03em]">
                      {candidate.name}
                    </h2>
                  </div>
                </div>

                <dl className="mt-6 space-y-2.5 rounded-inner border border-ash bg-parchment p-4 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-ink-soft">Program</dt>
                    <dd className="text-right font-semibold">{candidate.program}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-ink-soft">Year</dt>
                    <dd className="text-right">{candidate.year}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-ink-soft">Student number</dt>
                    <dd className="numeric text-right font-semibold">{candidate.number}</dd>
                  </div>
                </dl>

                <p className="mt-4 text-[13px] leading-relaxed text-ink-soft">
                  Next, choose a seat from the live floor. Your seat is held for 15
                  minutes while you walk over.
                </p>

                <div className="mt-6 grid gap-2">
                  <Button size="xl" className="w-full" onClick={handleConfirm}>
                    <RiCheckLine size={20} aria-hidden="true" />
                    Yes, that&apos;s me
                  </Button>
                  <Button variant="outline" size="lg" className="w-full" onClick={handleBack}>
                    Use a different number
                  </Button>
                </div>
              </div>
            )}
          </div>

          <p className="mt-4 text-[12px] leading-relaxed text-ink/60">
            Demo build. No real student records stored. Use{' '}
            <Link
              to="/admin/login"
              className="font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-lime"
            >
              staff login
            </Link>{' '}
            for the librarian console.
          </p>
        </section>
      </main>
    </div>
  )
}
