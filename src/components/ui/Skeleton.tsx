import type { ReactNode } from 'react'
import type { CSSProperties } from 'react'
import { cn } from '../../lib/utils'

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cn('skeleton', className)} style={style} aria-hidden />
}

export function TaskCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('card space-y-3 p-4', className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3 w-3/5" />
      <div className="flex items-center justify-between pt-2">
        <div className="flex -space-x-1.5">
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-7 w-7 rounded-full" />
        </div>
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="flex h-56 items-end gap-3 px-2">
      {[42, 68, 52, 84, 61, 92, 74].map((height, index) => (
        <div key={index} className="flex flex-1 flex-col items-center gap-2">
          <Skeleton className="w-full rounded-t-lg" style={{ height: `${height}%` }} />
          <Skeleton className="h-2 w-6" />
        </div>
      ))}
    </div>
  )
}

export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card space-y-3 p-5">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="card p-6">
        <Skeleton className="mb-6 h-5 w-40" />
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 border-b border-line/70 py-4 last:border-0">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SectionTitle({
  title,
  action,
  subtitle,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h2 className="text-[15px] font-bold tracking-[-0.01em] text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
