import { CloudOff, RotateCw } from 'lucide-react'
import { Button } from './Button'
import { cn } from '../../lib/utils'

export function ErrorState({
  message,
  onRetry,
  className,
  compact = false,
}: {
  message?: string
  onRetry?: () => void
  className?: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-line bg-surface px-6 text-center',
        compact ? 'py-10' : 'min-h-[60vh] py-16',
        className,
      )}
    >
      <div className="relative mb-5">
        <div className="absolute inset-0 scale-150 rounded-full bg-rose-500/10 blur-2xl" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-raised text-rose-500">
          <CloudOff size={22} strokeWidth={1.8} />
        </div>
      </div>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-rose-500">
        Connection lost
      </p>
      <h2 className="mt-1.5 text-lg font-bold tracking-[-0.02em] text-ink">
        We hit an unexpected snag
      </h2>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
        {message ?? 'Something went wrong while loading your workspace. Your data is safe.'}
      </p>
      {onRetry && (
        <Button className="mt-5" variant="primary" icon={<RotateCw size={15} />} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
