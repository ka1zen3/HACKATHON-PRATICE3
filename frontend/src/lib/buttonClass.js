const VARIANTS = {
  primary:
    'bg-signal text-ink hover:bg-signal-bright active:bg-signal-deep active:text-white',
  outline:
    'border border-ash bg-canvas text-ink hover:border-ink hover:bg-parchment',
  ghost: 'text-ink hover:bg-ink/5',
  danger:
    'border border-danger/25 bg-danger-wash text-danger hover:bg-danger hover:text-white',
}

const SIZES = {
  sm: 'h-9 px-3.5 text-[13px]',
  md: 'h-11 px-5 text-sm',
  lg: 'h-14 px-7 text-base',
  xl: 'h-16 px-8 text-[17px]',
}

export function buttonClass({ variant = 'primary', size = 'md', className = '' } = {}) {
  return [
    'inline-flex select-none items-center justify-center gap-2 rounded-pill font-medium transition-[background-color,color,border-color,transform] duration-200 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-40',
    VARIANTS[variant] ?? VARIANTS.primary,
    SIZES[size] ?? SIZES.md,
    className,
  ].join(' ')
}
