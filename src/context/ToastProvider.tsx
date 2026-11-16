import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '../lib/utils'

type ToastVariant = 'success' | 'error' | 'info'

export interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
  /** Optional inline action, e.g. Retry */
  action?: { label: string; onClick: () => void }
}

interface Toast extends ToastOptions {
  id: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (options: ToastOptions) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

const tones: Record<ToastVariant, string> = {
  success: 'text-emerald-500 bg-emerald-500/10',
  error: 'text-rose-500 bg-rose-500/10',
  info: 'text-accent bg-accent/10',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      const next: Toast = { ...options, id, variant: options.variant ?? 'success' }
      setToasts((current) => [...current.slice(-2), next])
      const timer = setTimeout(() => dismiss(id), options.action ? 7000 : 4200)
      timers.current.set(id, timer)
      return id
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6">
        <AnimatePresence initial={false}>
          {toasts.map((item) => {
            const Icon = icons[item.variant]
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-surface/95 p-3.5 shadow-lift backdrop-blur-xl"
                role="status"
                aria-live="polite"
              >
                <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', tones[item.variant])}>
                  <Icon size={16} strokeWidth={2.2} />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[13px] font-semibold text-ink">{item.title}</p>
                  {item.description && (
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">{item.description}</p>
                  )}
                  {item.action && (
                    <button
                      type="button"
                      onClick={() => {
                        item.action?.onClick()
                        dismiss(item.id)
                      }}
                      className="mt-2 text-xs font-semibold text-accent hover:underline"
                    >
                      {item.action.label}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  className="rounded-lg p-1 text-muted/70 transition hover:bg-raised hover:text-ink"
                  aria-label="Dismiss notification"
                >
                  <X size={14} />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
