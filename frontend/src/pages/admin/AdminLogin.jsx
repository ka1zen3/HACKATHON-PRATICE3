import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, KeyRound, ShieldCheck } from 'lucide-react'
import { Logo } from '../../components/Logo.jsx'
import { Button } from '../../components/Button.jsx'
import { StatusPill } from '../../components/StatusPill.jsx'
import { useApp } from '../../context/useApp.js'
import { ADMIN_CREDENTIALS } from '../../data/mockData.js'
import { getAttentionRows, getSeatStats } from '../../lib/seats.js'
import { useNow } from '../../hooks/useNow.js'

export default function AdminLogin() {
  const { seats, adminAuthed, adminLogin } = useApp()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const now = useNow(30000)
  const stats = useMemo(() => getSeatStats(seats), [seats])
  const attention = useMemo(
    () => getAttentionRows(seats, now),
    [seats, now],
  )

  if (adminAuthed) {
    return <Navigate to="/admin/dashboard" replace />
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const ok = adminLogin(username, password)

    if (!ok) {
      setError('That username and password did not match. Try the demo credentials below.')
      return
    }

    navigate('/admin/dashboard', { replace: true })
  }

  const fillDemo = () => {
    setUsername(ADMIN_CREDENTIALS.username)
    setPassword(ADMIN_CREDENTIALS.password)
    setError('')
  }

  return (
    <div className="min-h-svh bg-parchment lg:grid lg:grid-cols-2">
      <section className="relative flex flex-col justify-between overflow-hidden bg-charcoal p-6 text-parchment sm:p-10 lg:min-h-svh lg:p-14">
        <div className="flex items-center justify-between gap-4">
          <Logo tone="onDark" />
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[12px] font-medium text-parchment/70 transition-colors hover:text-parchment"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to site
          </Link>
        </div>

        <div className="mt-14 max-w-[30ch] lg:mt-0">
          <span className="inline-flex items-center gap-2 rounded-pill border border-signal/30 bg-signal/10 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-signal">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Staff access
          </span>
          <h1 className="mt-5 text-[clamp(2.6rem,6vw,4.6rem)] font-medium leading-[0.92] tracking-[-0.04em]">
            Keep the floor honest.
          </h1>
          <p className="mt-5 max-w-[36ch] text-[15px] leading-relaxed text-parchment/65">
            See every session, spot the seats that need attention, and release a seat
            without leaving the desk.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 border-t border-parchment/15 pt-6 lg:mt-0">
          <div>
            <p className="numeric text-[32px] font-medium leading-none">{stats.vacant}</p>
            <p className="mt-1 text-[12px] text-parchment/50">seats open</p>
          </div>
          <div>
            <p className={`numeric text-[32px] font-medium leading-none ${attention.length ? 'text-signal' : ''}`}>
              {attention.length}
            </p>
            <p className="mt-1 text-[12px] text-parchment/50">need attention</p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-8 lg:min-h-svh lg:px-14">
        <div className="w-full max-w-[440px]">
          <StatusPill status="live" pulse>
            Librarian console
          </StatusPill>
          <h2 className="mt-4 text-[clamp(1.9rem,4vw,2.6rem)] font-medium leading-[1.02] tracking-[-0.03em]">
            Sign in to the desk
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Use the shared circulation account. Students use the time-in page.
          </p>

          <form onSubmit={handleSubmit} className="mt-8" noValidate>
            <div>
              <label htmlFor="admin-username" className="text-[13px] font-medium">
                Username
              </label>
              <input
                id="admin-username"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value)
                  if (error) setError('')
                }}
                aria-invalid={Boolean(error)}
                className="mt-2 h-12 w-full rounded-input border border-ash bg-canvas px-4 text-[15px] text-ink placeholder:text-stone focus:border-signal-deep focus:outline-none focus:ring-2 focus:ring-signal/40"
                placeholder="admin"
              />
            </div>

            <div className="mt-4">
              <label htmlFor="admin-password" className="text-[13px] font-medium">
                Password
              </label>
              <input
                id="admin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  if (error) setError('')
                }}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'admin-login-error' : undefined}
                className="mt-2 h-12 w-full rounded-input border border-ash bg-canvas px-4 text-[15px] text-ink placeholder:text-stone focus:border-signal-deep focus:outline-none focus:ring-2 focus:ring-signal/40"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p
                id="admin-login-error"
                role="alert"
                className="mt-3 text-[13px] font-medium text-danger"
              >
                {error}
              </p>
            )}

            <Button type="submit" size="xl" className="mt-6 w-full">
              <KeyRound className="size-5" aria-hidden="true" />
              Sign in
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </form>

          <div className="mt-6 rounded-card border border-ash bg-canvas p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-medium">Demo credentials</p>
                <p className="mt-1 text-[12px] text-ink-soft">
                  <span className="font-medium text-ink">admin</span> /{' '}
                  <span className="font-medium text-ink">library123</span>
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={fillDemo}>
                Fill in
              </Button>
            </div>
          </div>

          <p className="mt-5 text-[12px] leading-relaxed text-ink-soft">
            Looking for the student time-in?{' '}
            <Link to="/login" className="font-medium text-ink underline underline-offset-2">
              Go to time in
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  )
}
