import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
}

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  icon,
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = original
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-[rgb(8_8_14/0.5)] backdrop-blur-[3px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              'relative z-10 w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-lift',
              sizes[size],
            )}
          >
            {(title || description) && (
              <div className="flex items-start gap-3 border-b border-line px-5 py-4">
                {icon && (
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    {icon}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  {title && (
                    <h2 className="text-[15px] font-bold tracking-[-0.01em] text-ink">{title}</h2>
                  )}
                  {description && (
                    <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="icon-btn -mr-1 -mt-1"
                  aria-label="Close dialog"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {children && (
              <div className="max-h-[65vh] overflow-y-auto px-5 py-5">{children}</div>
            )}
            {footer && (
              <div className="flex items-center justify-end gap-2 border-t border-line bg-raised/60 px-5 py-3.5">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  onCancel,
  onConfirm,
  loading,
  danger,
  children,
}: {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  onCancel: () => void
  onConfirm: () => void
  loading?: boolean
  danger?: boolean
  children?: ReactNode
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="sm"
      title={title}
      description={description}
      footer={
        <>
          <Button size="md" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            size="md"
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  )
}
