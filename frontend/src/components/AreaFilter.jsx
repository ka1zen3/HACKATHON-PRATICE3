export function AreaFilter({ areas, seats, value = 'all', onChange, className = '' }) {
  const options = [
    {
      id: 'all',
      label: 'All areas',
      count: seats.filter((s) => s.status === 'vacant').length,
    },
    ...areas.map((area) => ({
      id: area.id,
      label: area.short,
      count: seats.filter((s) => s.areaId === area.id && s.status === 'vacant').length,
    })),
  ]

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`} role="group" aria-label="Filter by area">
      {options.map((option) => {
        const active = value === option.id
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={[
              'inline-flex h-8 items-center gap-1.5 rounded-pill border px-3 text-[12px] font-semibold',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
              active
                ? 'border-ink bg-ink text-parchment'
                : 'border-ash bg-canvas text-ink hover:border-ink hover:bg-parchment',
            ].join(' ')}
          >
            {option.label}
            <span className={`numeric text-[11px] ${active ? 'text-parchment/60' : 'text-ink-soft'}`}>
              {option.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
