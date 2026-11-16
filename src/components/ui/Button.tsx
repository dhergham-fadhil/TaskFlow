import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'soft' | 'danger'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-ink shadow-[0_1px_2px_rgba(0,0,0,0.12),0_8px_20px_-8px_rgb(var(--accent)/0.6)] hover:brightness-[1.06] active:brightness-[0.97]',
  secondary:
    'border border-line bg-surface text-ink shadow-sm hover:bg-raised hover:border-muted/30 active:scale-[0.99]',
  ghost: 'text-muted hover:bg-raised hover:text-ink',
  soft: 'bg-accent/10 text-accent hover:bg-accent/15',
  danger: 'bg-rose-500 text-white shadow-sm hover:bg-rose-600 active:bg-rose-700',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-xs',
  md: 'h-10 gap-2 rounded-xl px-4 text-[13px]',
  lg: 'h-11 gap-2 rounded-xl px-5 text-sm',
  icon: 'h-9 w-9 rounded-xl',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  iconAfter?: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  iconAfter,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex select-none items-center justify-center font-semibold tracking-[-0.01em] transition-all duration-200 disabled:pointer-events-none disabled:opacity-55',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" />
      ) : (
        icon
      )}
      {children}
      {!loading && iconAfter}
    </button>
  )
}
