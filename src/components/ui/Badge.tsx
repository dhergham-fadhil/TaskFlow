import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { PRIORITY_META, STATUS_META, type TaskPriority, type TaskStatus } from '../../types'

export function StatusBadge({
  status,
  className,
  dotOnly = false,
}: {
  status: TaskStatus
  className?: string
  dotOnly?: boolean
}) {
  const meta = STATUS_META[status]
  if (dotOnly) return <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot, className)} />
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        meta.tint,
        meta.text,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  )
}

export function PriorityBadge({
  priority,
  className,
  withLabel = true,
}: {
  priority: TaskPriority
  className?: string
  withLabel?: boolean
}) {
  const meta = PRIORITY_META[priority]
  return (
    <span
      title={`${meta.label} priority`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        meta.tint,
        meta.text,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {withLabel ? meta.label : null}
    </span>
  )
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-line bg-raised px-1.5 py-0.5 text-[10.5px] font-medium text-muted',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-line bg-raised px-1.5 font-mono text-[10px] font-medium text-muted shadow-[inset_0_-1px_0_rgb(var(--line))]">
      {children}
    </kbd>
  )
}
