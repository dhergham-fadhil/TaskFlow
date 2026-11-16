import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '../../lib/utils'

interface PopoverProps {
  trigger: (state: { open: boolean; toggle: () => void }) => ReactNode
  children: ReactNode | ((close: () => void) => ReactNode)
  align?: 'start' | 'end'
  side?: 'bottom' | 'top'
  className?: string
  panelClassName?: string
}

export function Popover({
  trigger,
  children,
  align = 'end',
  side = 'bottom',
  className,
  panelClassName,
}: PopoverProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <div ref={ref} className={cn('relative inline-flex', className)}>
      {trigger({ open, toggle: () => setOpen((value) => !value) })}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: side === 'bottom' ? -6 : 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: side === 'bottom' ? -4 : 4, scale: 0.985 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'absolute z-50 min-w-[200px] overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-lift',
              side === 'bottom' ? 'top-[calc(100%+8px)]' : 'bottom-[calc(100%+8px)]',
              align === 'end' ? 'right-0' : 'left-0',
              panelClassName,
            )}
            role="menu"
          >
            {typeof children === 'function' ? children(close) : children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function MenuItem({
  icon,
  children,
  onClick,
  active,
  danger,
  shortcut,
  disabled,
}: {
  icon?: ReactNode
  children: ReactNode
  onClick?: () => void
  active?: boolean
  danger?: boolean
  shortcut?: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-medium transition-colors disabled:opacity-40',
        active ? 'bg-accent/10 text-accent' : 'text-ink hover:bg-raised',
        danger && 'text-rose-500 hover:bg-rose-500/10',
      )}
    >
      {icon && <span className="flex h-4 w-4 items-center justify-center text-muted">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
      {shortcut && <span className="font-mono text-[10px] text-muted">{shortcut}</span>}
    </button>
  )
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-muted/70">
      {children}
    </p>
  )
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-line" />
}
