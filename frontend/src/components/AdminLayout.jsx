import { Link, NavLink, useNavigate } from 'react-router-dom'
import { RiExternalLinkLine, RiLayoutGridLine, RiListCheck2, RiLogoutBoxLine, RiShieldCheckLine, RiTeamLine, RiSofaLine } from 'react-icons/ri'
import { Logo } from './Logo.jsx'
import { useApp } from '../context/useApp.js'
import { useNow } from '../hooks/useNow.js'
import { formatLongDate, formatTimeOfDay } from '../lib/format.js'

const ADMIN_NAV = [
  { to: '/admin/dashboard', label: 'Live monitor', icon: RiLayoutGridLine, end: true },
  { to: '/admin/sessions',  label: 'Sessions',     icon: RiListCheck2,     end: true },
  { to: '/admin/students',  label: 'Students',     icon: RiTeamLine,       end: true },
  { to: '/admin/seats',     label: 'Seat manager', icon: RiSofaLine,       end: true },
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
  const { adminLogout, staffInfo } = useApp()
  const navigate = useNavigate()

  // Derive initials from full_name, falling back to "AD"
  const initials = staffInfo?.full_name
    ? staffInfo.full_name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('')
    : 'AD'
  const displayName = staffInfo?.full_name ?? 'Admin'
  const displayRole = staffInfo?.role === 'admin' ? 'Admin' : 'Staff'
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
          <span className="inline-flex items-center gap-2 rounded-pill border border-lime-line bg-lime-wash px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink">
            <RiShieldCheckLine size={14} aria-hidden="true" />
            Librarian console
          </span>
        </div>

        <nav className="mt-6 space-y-1 px-3" aria-label="Admin navigation">
          {ADMIN_NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={sidebarClasses}>
              <Icon size={16} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-2 border-t border-ash p-4">
          <div className="flex items-center gap-2.5 rounded-inner border border-ash bg-canvas p-3">
            <span className="grid size-8 place-items-center rounded-full bg-charcoal text-[11px] font-medium text-parchment">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-medium">{displayName}</p>
              <p className="text-[11px] text-ink-soft">{displayRole}</p>
            </div>
          </div>
          <Link
            to="/"
            className="flex h-9 items-center gap-2 rounded-pill px-3 text-[13px] font-medium text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
          >
            <RiExternalLinkLine size={14} aria-hidden="true" />
            Back to site
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-9 w-full items-center gap-2 rounded-pill px-3 text-[13px] font-medium text-ink-soft transition-colors hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <RiLogoutBoxLine size={16} aria-hidden="true" />
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
                <RiExternalLinkLine size={14} aria-hidden="true" />
                Back to site
              </Link>
              <span className="inline-flex h-9 items-center gap-2 rounded-pill border border-ash bg-canvas px-3 text-[12px] font-medium">
                <span className="grid size-5 place-items-center rounded-full bg-charcoal text-[9px] text-parchment">
                  {initials}
                </span>
                {displayName}
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
                <Icon size={14} aria-hidden="true" />
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
