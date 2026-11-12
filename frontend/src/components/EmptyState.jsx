import { RiAlertLine } from 'react-icons/ri'

export function EmptyState({ icon: Icon = RiAlertLine, title, description, action, className = '' }) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-card border border-dashed border-ash bg-canvas px-6 py-12 text-center ${className}`}
    >
      <span className="grid size-12 place-items-center rounded-full bg-parchment text-ink-soft">
        <Icon size={20} aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-[20px] font-semibold tracking-[-0.02em]">{title}</h3>
      {description && (
        <p className="mt-2 max-w-[42ch] text-sm leading-relaxed text-ink-soft">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
