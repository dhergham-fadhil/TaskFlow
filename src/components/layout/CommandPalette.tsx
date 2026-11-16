import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarDays,
  Columns3,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useUI } from '../../context/UIProvider'
import { useWorkspace } from '../../context/WorkspaceProvider'
import { useTheme } from '../../context/ThemeProvider'
import { Kbd, StatusBadge } from '../ui/Badge'
import { ProjectIcon } from '../projects/ProjectIcon'

interface PaletteItem {
  id: string
  group: string
  label: string
  hint?: string
  icon?: React.ReactNode
  badge?: React.ReactNode
  action: () => void
}

const pageLinks = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/tasks', label: 'My tasks', icon: ListChecks },
  { path: '/board', label: 'Board', icon: Columns3 },
  { path: '/calendar', label: 'Calendar', icon: CalendarDays },
  { path: '/projects', label: 'Projects', icon: FolderKanban },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, createTask, openTask } = useUI()
  const { tasks, projects } = useWorkspace()
  const { resolvedTheme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const close = () => setPaletteOpen(false)

  useEffect(() => {
    if (paletteOpen) {
      setQuery('')
      setSelected(0)
      const timer = setTimeout(() => inputRef.current?.focus(), 40)
      const original = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        clearTimeout(timer)
        document.body.style.overflow = original
      }
    }
  }, [paletteOpen])

  const items = useMemo<PaletteItem[]>(() => {
    const normalized = query.trim().toLowerCase()
    const result: PaletteItem[] = []

    const matches = (text: string) => !normalized || text.toLowerCase().includes(normalized)

    if (!normalized) {
      result.push({
        id: 'action-new-task',
        group: 'Quick actions',
        label: 'Create a new task',
        hint: 'N',
        icon: <Plus size={15} />,
        action: () => createTask(),
      })
      result.push({
        id: 'action-theme',
        group: 'Quick actions',
        label: `Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`,
        icon: resolvedTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />,
        action: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),
      })
    }

    const taskMatches = tasks
      .filter(
        (task) =>
          matches(task.title) ||
          matches(task.description) ||
          task.labels.some((label) => matches(label)),
      )
      .slice(0, 6)

    for (const task of taskMatches) {
      const project = projects.find((item) => item.id === task.projectId)
      result.push({
        id: `task-${task.id}`,
        group: 'Tasks',
        label: task.title,
        hint: project?.name,
        icon: <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: project?.color }} />,
        badge: <StatusBadge status={task.status} className="hidden sm:inline-flex" />,
        action: () => openTask(task.id),
      })
    }

    const projectMatches = projects.filter(
      (project) => matches(project.name) || matches(project.description),
    )
    for (const project of projectMatches.slice(0, 4)) {
      result.push({
        id: `project-${project.id}`,
        group: 'Projects',
        label: project.name,
        hint: `${tasks.filter((task) => task.projectId === project.id).length} tasks`,
        icon: <ProjectIcon project={project} size="sm" showBackground={false} />,
        action: () => navigate(`/projects/${project.id}`),
      })
    }

    for (const page of pageLinks) {
      if (matches(page.label)) {
        const Icon = page.icon
        result.push({
          id: `page-${page.path}`,
          group: 'Navigate',
          label: page.label,
          icon: <Icon size={15} />,
          action: () => navigate(page.path),
        })
      }
    }

    return result
  }, [query, tasks, projects, resolvedTheme, createTask, openTask, navigate, setTheme])

  useEffect(() => {
    setSelected((current) => Math.min(current, Math.max(items.length - 1, 0)))
  }, [items.length])

  useEffect(() => {
    const element = listRef.current?.querySelector<HTMLElement>(`[data-index="${selected}"]`)
    element?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  const execute = (item: PaletteItem) => {
    close()
    // Let the closing animation start before panels mount.
    window.setTimeout(() => item.action(), 30)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelected((current) => (current + 1) % Math.max(items.length, 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelected((current) => (current - 1 + items.length) % Math.max(items.length, 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (items[selected]) execute(items[selected])
    } else if (event.key === 'Escape') {
      close()
    }
  }

  const groups: Array<{ name: string; items: Array<PaletteItem & { index: number }> }> = []
  items.forEach((item, index) => {
    const group = groups.find((entry) => entry.name === item.group)
    if (group) group.items.push({ ...item, index })
    else groups.push({ name: item.group, items: [{ ...item, index }] })
  })

  return createPortal(
    <AnimatePresence>
      {paletteOpen && (
        <div className="fixed inset-0 z-[85] flex items-start justify-center p-4 pt-[10vh] sm:pt-[14vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-[rgb(8_8_14/0.55)] backdrop-blur-[4px]"
            onClick={close}
          />
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="relative z-10 w-full max-w-[620px] overflow-hidden rounded-2xl border border-line bg-surface shadow-lift"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search size={18} className="shrink-0 text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setSelected(0)
                }}
                onKeyDown={onKeyDown}
                placeholder="Search tasks, projects or jump to a page…"
                className="h-[58px] w-full bg-transparent text-[14px] font-medium text-ink outline-none placeholder:font-normal placeholder:text-muted/70"
              />
              <Kbd>Esc</Kbd>
            </div>

            <div ref={listRef} className="max-h-[min(440px,55vh)] overflow-y-auto p-2">
              {items.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <p className="text-sm font-semibold text-ink">No results for “{query}”</p>
                  <p className="mt-1 text-xs text-muted">
                    Try a task title, a label, or a project name.
                  </p>
                </div>
              ) : (
                groups.map((group) => (
                  <div key={group.name} className="mb-1.5">
                    <p className="px-2.5 pb-1 pt-2 text-[9.5px] font-bold uppercase tracking-[0.13em] text-muted/60">
                      {group.name}
                    </p>
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        data-index={item.index}
                        onMouseEnter={() => setSelected(item.index)}
                        onClick={() => execute(item)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors',
                          selected === item.index ? 'bg-accent/[0.08]' : 'hover:bg-raised/70',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-raised',
                            selected === item.index ? 'text-accent' : 'text-muted',
                          )}
                        >
                          {item.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-semibold text-ink">
                            {item.label}
                          </span>
                          {item.hint && (
                            <span className="block truncate text-[10.5px] text-muted">
                              {item.hint}
                            </span>
                          )}
                        </span>
                        {item.badge}
                        <ArrowRight
                          size={13}
                          className={cn(
                            'shrink-0 transition-opacity',
                            selected === item.index ? 'text-accent opacity-100' : 'opacity-0',
                          )}
                        />
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t border-line bg-raised/50 px-4 py-2.5 text-[10px] text-muted">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd> navigate
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>↵</Kbd> open
                </span>
              </div>
              <span className="font-medium">TaskFlow command menu</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
