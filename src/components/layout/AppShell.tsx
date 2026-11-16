import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu } from 'lucide-react'
import { useWorkspace } from '../../context/WorkspaceProvider'
import { useUI } from '../../context/UIProvider'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ErrorState } from '../ui/ErrorState'
import { CreateProjectModal } from '../../components/projects/CreateProjectModal'

export function AppShell() {
  const { error, refresh, loading } = useWorkspace()
  const { setMobileNavOpen, projectModalOpen, setProjectModalOpen } = useUI()
  const location = useLocation()
  const [rendered, setRendered] = useState(location.pathname)

  useEffect(() => {
    const timer = window.setTimeout(() => setRendered(location.pathname), 0)
    return () => window.clearTimeout(timer)
  }, [location.pathname])

  if (error) {
    return (
      <div className="ambient min-h-dvh">
        <div className="mx-auto max-w-xl px-4 py-16">
          <ErrorState
            message={error}
            onRetry={() => void refresh()}
          />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex min-h-dvh">
        <Sidebar />

        <div className="flex min-h-dvh flex-1 flex-col lg:pl-[272px]">
          <Topbar />

          <main className="relative flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="fixed bottom-5 left-5 z-40 flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-surface text-ink shadow-lift lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>

          <AnimatePresence mode="wait">
            <motion.div
              key={rendered}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {loading ? (
                <div className="space-y-4" aria-busy="true" aria-label="Loading workspace">
                  <div className="space-y-2">
                    <div className="skeleton h-8 w-56" />
                    <div className="skeleton h-4 w-80 max-w-full" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="card space-y-3 p-4">
                        <div className="skeleton h-9 w-9 rounded-xl" />
                        <div className="skeleton h-7 w-16" />
                        <div className="skeleton h-3 w-28" />
                      </div>
                    ))}
                  </div>
                  <div className="card space-y-3 p-5">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="skeleton h-8 w-8 rounded-full" />
                        <div className="flex-1 space-y-1.5">
                          <div className="skeleton h-3.5 w-1/2" />
                          <div className="skeleton h-2.5 w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <Outlet />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {loading && (
          <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden">
            <div className="h-full w-1/3 animate-[shimmer_1.2s_infinite] bg-accent" />
          </div>
        )}
      </div>
    </div>

    <CreateProjectModal
      open={projectModalOpen}
      onClose={() => setProjectModalOpen(false)}
    />
    </>
  )
}
