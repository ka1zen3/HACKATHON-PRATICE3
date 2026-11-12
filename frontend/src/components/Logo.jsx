import { Link } from 'react-router-dom'

function SeatMark({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M7 4.5v8.25a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M9 10.5h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M8 17.5v2M16 17.5v2M6.5 14.75h11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

const TONES = {
  default: { mark: 'bg-signal', glyph: 'text-ink', word: 'text-ink' },
  onGreen: { mark: 'bg-ink', glyph: 'text-signal', word: 'text-ink' },
  onDark: { mark: 'bg-signal', glyph: 'text-ink', word: 'text-parchment' },
}

export function Logo({ to = '/', tone = 'default', showWord = true, className = '' }) {
  const palette = TONES[tone] ?? TONES.default

  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ${className}`}
    >
      <span className={`grid size-9 place-items-center rounded-[11px] ${palette.mark}`}>
        <SeatMark className={`size-5 ${palette.glyph}`} />
      </span>
      {showWord && (
        <span className={`text-[19px] font-medium tracking-[-0.03em] ${palette.word}`}>
          SeatSync
        </span>
      )}
    </Link>
  )
}
