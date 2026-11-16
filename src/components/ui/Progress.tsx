import { cn } from '../../lib/utils'

export function ProgressBar({
  value,
  color,
  className,
  trackClassName,
  height = 6,
}: {
  value: number
  color?: string
  className?: string
  trackClassName?: string
  height?: number
}) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      className={cn('w-full overflow-hidden rounded-full bg-muted/15', trackClassName, className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-all duration-700 ease-spring"
        style={{
          width: `${clamped}%`,
          background: color ?? 'rgb(var(--accent))',
        }}
      />
    </div>
  )
}

export function ProgressRing({
  value,
  size = 56,
  stroke = 5,
  color = 'rgb(var(--accent))',
  children,
  trackColor = 'rgb(var(--muted) / 0.15)',
}: {
  value: number
  size?: number
  stroke?: number
  color?: string
  children?: React.ReactNode
  trackColor?: string
}) {
  const clamped = Math.max(0, Math.min(100, value))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-spring"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">{children}</span>
    </div>
  )
}
