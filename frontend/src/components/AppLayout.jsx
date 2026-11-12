import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { RiMenuLine, RiCloseLine } from 'react-icons/ri'
import { Logo } from './Logo.jsx'
import { PageContainer } from './PageContainer.jsx'
import { buttonClass } from '../lib/buttonClass.js'
import { useApp } from '../context/useApp.js'
import { initials } from '../lib/format.js'

const NAV = [
  { to: '/',        label: 'Live map',  end: true },
  { to: '/reserve', label: 'Reserve' },
  { to: '/session', label: 'Session' },
]

function navClasses({ isActive }) {
  return [
    'inline-flex h-9 items-center rounded-pill px-3.5 text-[13px] font-semibold transition-colors duration-150',
    isActive
      ? 'bg-parchment text-ink'
      : 'text-ink-soft hover:bg-parchment hover:text-ink',
  ].join(' ')
}

export function AppLayout({ children }) {
  const { student, activeSession, signOut } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuRoute, setMenuRoute] = useState(null)
  const location = useLocation()
  const menuVisible = menuOpen && menuRoute === location.pathname

  const primaryTo    = student ? (activeSession ? '/session' : '/reserve') : '/login'
  const primaryLabel = student ? (activeSession ? 'Session'  : 'Reserve')  : 'Time in'

  return (
    <div className="flex min-h-svh flex-col">
      {/* ── Top nav ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-ash bg-canvas/95 backdrop-blur-sm">
        <PageContainer className="flex h-[72px] items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Logo />
            <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
              {NAV.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={navClasses}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {student ? (
              <>
                <Link
                  to="/session"
                  className="hidden items-center gap-2 rounded-pill border border-ash bg-parchment py-1.5 pl-1.5 pr-3 text-[12px] font-semibold transition-colors hover:border-ink sm:inline-flex"
                >
                  <span className="grid size-6 place-items-center rounded-full bg-lime text-[9px] font-bold text-ink">
                    {initials(student.name)}
                  </span>
                  {student.name.split(' ')[0]}
                  {activeSession && (
                    <span
                      className="size-1.5 rounded-full bg-signal-deep animate-pulse-dot"
                      aria-hidden="true"
                    />
                  )}
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  className="hidden h-9 items-center px-3 text-[13px] font-semibold text-ink-soft transition-colors hover:text-ink sm:inline-flex"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                to="/admin/login"
                className="hidden h-9 items-center px-3 text-[13px] font-semibold text-ink-soft transition-colors hover:text-ink sm:inline-flex"
              >
                Staff
              </Link>
            )}

            <Link
              to={primaryTo}
              className={buttonClass({ size: 'md', className: 'hidden sm:inline-flex' })}
            >
              {primaryLabel}
            </Link>

            <button
              type="button"
              onClick={() => {
                if (menuVisible) {
                  setMenuOpen(false)
                } else {
                  setMenuRoute(location.pathname)
                  setMenuOpen(true)
                }
              }}
              aria-expanded={menuVisible}
              aria-controls="mobile-menu"
              aria-label={menuVisible ? 'Close menu' : 'Open menu'}
              className="grid size-10 place-items-center rounded-full border border-ash bg-canvas text-ink transition-colors hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink lg:hidden"
            >
              {menuVisible
                ? <RiCloseLine size={18} aria-hidden="true" />
                : <RiMenuLine  size={18} aria-hidden="true" />
              }
            </button>
          </div>
        </PageContainer>

        {/* Mobile menu */}
        {menuVisible && (
          <div id="mobile-menu" className="border-t border-ash bg-canvas lg:hidden">
            <PageContainer className="py-4">
              <nav className="grid gap-1" aria-label="Mobile navigation">
                {NAV.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex h-11 items-center rounded-inner px-3 text-sm font-semibold ${
                        isActive
                          ? 'bg-parchment text-ink'
                          : 'text-ink-soft hover:bg-parchment'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-ash pt-4">
                <Link
                  to={primaryTo}
                  className={buttonClass({ size: 'md', className: 'flex-1' })}
                  onClick={() => setMenuOpen(false)}
                >
                  {primaryLabel}
                </Link>
                {student ? (
                  <button
                    type="button"
                    onClick={() => { signOut(); setMenuOpen(false) }}
                    className={buttonClass({ variant: 'outline', size: 'md' })}
                  >
                    Sign out
                  </button>
                ) : (
                  <Link
                    to="/admin/login"
                    className={buttonClass({ variant: 'outline', size: 'md' })}
                    onClick={() => setMenuOpen(false)}
                  >
                    Staff
                  </Link>
                )}
              </div>
            </PageContainer>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="bg-charcoal text-parchment">
        <PageContainer className="py-14">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <Logo tone="onDark" />
              <p className="mt-4 max-w-[34ch] text-sm leading-relaxed text-parchment/70">
                A live seat map for the school library. Find an open chair, time in, and
                keep your session honest.
              </p>
            </div>

            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.1em] text-parchment/50">
                Explore
              </h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><Link to="/"        className="text-parchment/80 transition-colors hover:text-parchment">Live map</Link></li>
                <li><Link to="/login"   className="text-parchment/80 transition-colors hover:text-parchment">Time in</Link></li>
                <li><Link to="/reserve" className="text-parchment/80 transition-colors hover:text-parchment">Reserve a seat</Link></li>
                <li><Link to="/session" className="text-parchment/80 transition-colors hover:text-parchment">Your session</Link></li>
              </ul>
            </div>

            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.1em] text-parchment/50">
                Staff
              </h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><Link to="/admin/login"      className="text-parchment/80 transition-colors hover:text-parchment">Librarian console</Link></li>
                <li><Link to="/admin/dashboard"  className="text-parchment/80 transition-colors hover:text-parchment">Live monitor</Link></li>
                <li><Link to="/admin/sessions"   className="text-parchment/80 transition-colors hover:text-parchment">Active sessions</Link></li>
                <li><Link to="/admin/students"   className="text-parchment/80 transition-colors hover:text-parchment">Student records</Link></li>
                <li><Link to="/admin/seats"      className="text-parchment/80 transition-colors hover:text-parchment">Seat manager</Link></li>
              </ul>
              <p className="mt-5 max-w-[30ch] text-[12px] leading-relaxed text-parchment/50">
                Demo build. Seats, names, and sessions are mock data.
              </p>
            </div>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-parchment/15 pt-5 text-[12px] text-parchment/50">
            <span>SeatSync · School Library System</span>
            <span>Library open daily until 9:00 PM</span>
          </div>
        </PageContainer>
      </footer>
    </div>
  )
}
