import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
  compact?: boolean
}

export function EmptyState({ icon, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 text-center',
        compact ? 'py-8' : 'py-14',
        className,
      )}
    >
      <div className="relative mb-4">
        <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-accent/10 blur-2xl" />
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-gradient-to-b from-raised to-surface text-accent shadow-soft">
          {icon}
        </div>
      </div>
      <h3 className="text-sm font-bold tracking-[-0.01em] text-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
