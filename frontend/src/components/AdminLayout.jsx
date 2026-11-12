import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ExternalLink, LayoutGrid, List, LogOut, ShieldCheck } from 'lucide-react'
import { Logo } from './Logo.jsx'
import { useApp } from '../context/useApp.js'
import { useNow } from '../hooks/useNow.js'
import { formatLongDate, formatTimeOfDay } from '../lib/format.js'

const ADMIN_NAV = [
  { to: '/admin/dashboard', label: 'Live monitor', icon: LayoutGrid, end: true },
  { to: '/admin/sessions', label: 'Sessions', icon: List, end: true },
]

function sidebarClasses({ isActive }) {
  return [
    'flex items-center gap-3 rounded-pill px-3.5 py-2.5 text-[13px] font-medium transition-colors',
    isActive
      ? 'bg-ink text-parchment'
      : 'text-ink-soft hover:bg-canvas hover:text-ink',
  ].join(' ')
}

export function AdminLayout({ children }) {
  const { adminLogout } = useApp()
  const navigate = useNavigate()
  const now = useNow(30000)

  const handleLogout = () => {
    adminLogout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="min-h-svh bg-parchment lg:flex">
      <aside className="sticky top-0 hidden h-svh w-[248px] shrink-0 flex-col border-r border-ash bg-parchment lg:flex">
        <div className="p-5">
          <Logo to="/admin/dashboard" />
        </div>

        <div className="px-5">
          <span className="inline-flex items-center gap-2 rounded-pill border border-signal-line bg-signal-wash px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-signal-deep">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Librarian console
          </span>
        </div>

        <nav className="mt-6 space-y-1 px-3" aria-label="Admin navigation">
          {ADMIN_NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={sidebarClasses}>
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-2 border-t border-ash p-4">
          <div className="flex items-center gap-2.5 rounded-inner border border-ash bg-canvas p-3">
            <span className="grid size-8 place-items-center rounded-full bg-charcoal text-[11px] font-medium text-parchment">
              AD
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-medium">Admin</p>
              <p className="text-[11px] text-ink-soft">Circulation desk</p>
            </div>
          </div>
          <Link
            to="/"
            className="flex h-9 items-center gap-2 rounded-pill px-3 text-[13px] font-medium text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            Back to site
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-9 w-full items-center gap-2 rounded-pill px-3 text-[13px] font-medium text-ink-soft transition-colors hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-ash bg-parchment">
          <div className="flex items-center justify-between gap-4 px-5 py-3.5 lg:px-8">
            <div className="lg:hidden">
              <Logo to="/admin/dashboard" />
            </div>

            <div className="hidden items-center gap-3 text-[12px] text-ink-soft lg:flex">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-signal-deep animate-pulse-dot" aria-hidden="true" />
                Live
              </span>
              <span className="text-ash" aria-hidden="true">/</span>
              <span>{formatLongDate(now)}</span>
              <span className="text-ash" aria-hidden="true">/</span>
              <span className="numeric">{formatTimeOfDay(now)}</span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/"
                className="hidden h-9 items-center gap-1.5 rounded-pill border border-ash bg-canvas px-3 text-[12px] font-medium transition-colors hover:border-ink sm:inline-flex"
              >
                <ExternalLink className="size-3.5" aria-hidden="true" />
                Back to site
              </Link>
              <span className="inline-flex h-9 items-center gap-2 rounded-pill border border-ash bg-canvas px-3 text-[12px] font-medium">
                <span className="grid size-5 place-items-center rounded-full bg-charcoal text-[9px] text-parchment">
                  AD
                </span>
                Admin
              </span>
            </div>
          </div>

          <nav
            className="flex gap-1 overflow-x-auto px-5 pb-3 lg:hidden"
            aria-label="Admin navigation"
          >
            {ADMIN_NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `inline-flex h-9 shrink-0 items-center gap-1.5 rounded-pill border px-3 text-[12px] font-medium ${
                    isActive
                      ? 'border-ink bg-ink text-parchment'
                      : 'border-ash bg-canvas text-ink-soft'
                  }`
                }
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="flex-1 px-5 py-7 lg:px-8 lg:py-9">{children}</main>
      </div>
    </div>
  )
}
