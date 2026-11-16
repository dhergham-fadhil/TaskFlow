import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { TaskStatus } from '../types'
import { isEditableTarget } from '../lib/utils'

interface TaskDefaults {
  status?: TaskStatus
  projectId?: string
}

interface TaskPanelState {
  open: boolean
  taskId: string | null
  defaults: TaskDefaults
}

interface UIContextValue {
  taskPanel: TaskPanelState
  openTask: (taskId: string) => void
  createTask: (defaults?: TaskDefaults) => void
  closeTaskPanel: () => void
  paletteOpen: boolean
  setPaletteOpen: (open: boolean) => void
  mobileNavOpen: boolean
  setMobileNavOpen: (open: boolean) => void
  projectModalOpen: boolean
  setProjectModalOpen: (open: boolean) => void
}

const UIContext = createContext<UIContextValue | null>(null)

export function UIProvider({ children }: { children: ReactNode }) {
  const [taskPanel, setTaskPanel] = useState<TaskPanelState>({
    open: false,
    taskId: null,
    defaults: {},
  })
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [projectModalOpen, setProjectModalOpen] = useState(false)

  const openTask = useCallback((taskId: string) => {
    setTaskPanel({ open: true, taskId, defaults: {} })
  }, [])

  const createTask = useCallback((defaults: TaskDefaults = {}) => {
    setTaskPanel({ open: true, taskId: null, defaults })
  }, [])

  const closeTaskPanel = useCallback(() => {
    setTaskPanel((current) => ({ ...current, open: false }))
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
        return
      }
      if (event.key === 'Escape') {
        setMobileNavOpen(false)
      }
      if (isEditableTarget(event.target)) return
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const value = useMemo(
    () => ({
      taskPanel,
      openTask,
      createTask,
      closeTaskPanel,
      paletteOpen,
      setPaletteOpen,
      mobileNavOpen,
      setMobileNavOpen,
      projectModalOpen,
      setProjectModalOpen,
    }),
    [taskPanel, openTask, createTask, closeTaskPanel, paletteOpen, mobileNavOpen, projectModalOpen],
  )

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI() {
  const context = useContext(UIContext)
  if (!context) throw new Error('useUI must be used inside UIProvider')
  return context
}
