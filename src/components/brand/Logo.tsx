import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[11px] bg-gradient-to-br from-[#8B7DFF] to-[#4F3FF0] shadow-[0_6px_16px_-6px_rgba(99,82,250,0.7)]">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
          <motion.path
            d="M4.5 12.5 9.4 17.4 19.5 6.8"
            stroke="white"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 rounded-[11px] ring-1 ring-inset ring-white/25" />
      </div>
      {!compact && (
        <div className="min-w-0">
          <p className="text-[15px] font-extrabold leading-none tracking-[-0.03em] text-ink">
            TaskFlow
          </p>
          <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted/70">
            Studio
          </p>
        </div>
      )}
    </div>
  )
}
