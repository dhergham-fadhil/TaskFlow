import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            {eyebrow}
          </div>
        )}
        <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.035em] text-ink sm:text-[30px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
