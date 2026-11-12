import { useEffect, useId, useRef } from 'react'
import { RiCloseLine } from 'react-icons/ri'

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className = '',
}) {
  const ref = useRef(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    const handleCancel = (event) => {
      event.preventDefault()
      onClose()
    }

    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [onClose])

  return (
    <dialog
      ref={ref}
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descriptionId : undefined}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      className={`m-auto w-[min(92vw,560px)] rounded-card border border-ash bg-canvas p-0 text-ink backdrop:bg-ink/40 open:animate-rise ${className}`}
    >
      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && (
              <h2
                id={titleId}
                className="text-[26px] font-medium leading-[1.1] tracking-[-0.03em]"
              >
                {title}
              </h2>
            )}
            {description && (
              <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-ink-soft">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-ash bg-canvas text-ink-soft transition-colors hover:border-ink hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <RiCloseLine size={16} aria-hidden="true" />
          </button>
        </div>

        {children && <div className="mt-5">{children}</div>}

        {footer && (
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  )
}
