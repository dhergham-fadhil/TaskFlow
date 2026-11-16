import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface SegmentedOption<T extends string> {
  value: T
  label?: string
  icon?: ReactNode
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
  className,
}: {
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-xl border border-line bg-raised p-0.5',
        className,
      )}
      role="tablist"
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            title={option.label}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[9px] font-semibold transition-all duration-200',
              size === 'sm' ? 'h-7 px-2.5 text-[11px]' : 'h-8 px-3 text-xs',
              active
                ? 'bg-surface text-ink shadow-sm'
                : 'text-muted hover:text-ink',
            )}
          >
            {option.icon}
            {option.label && <span>{option.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
