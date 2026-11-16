import { NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarDays,
  Columns3,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  Plus,
  Settings as SettingsIcon,
  Sparkles,
  X,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useWorkspace } from '../../context/WorkspaceProvider'
import { useUI } from '../../context/UIProvider'
import { Logo } from '../brand/Logo'
import { ProgressRing } from '../ui/Progress'
import { differenceInCalendarDays, parseISO } from 'date-fns'

const mainNav = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/tasks', label: 'My tasks', icon: ListChecks },
  { to: '/board', label: 'Board', icon: Columns3 },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { projects, tasks, currentUser, loading } = useWorkspace()
  const { createTask, setProjectModalOpen } = useUI()
  const location = useLocation()

  const openTasks = tasks.filter((task) => task.status !== 'done').length
  const completedThisWeek = tasks.filter(
    (task) =>
      task.status === 'done' &&
      differenceInCalendarDays(new Date(), parseISO(task.updatedAt)) <= 7,
  ).length
  const weeklyGoal = 12
  const momentum = Math.min(100, Math.round((completedThisWeek / weeklyGoal) * 100))

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between px-5">
        <NavLink to="/" onClick={onNavigate} aria-label="TaskFlow home">
          <Logo />
        </NavLink>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              createTask()
              onNavigate?.()
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted shadow-sm transition hover:border-accent/40 hover:text-accent"
            aria-label="New task"
            title="New task"
          >
            <Plus size={15} />
          </button>
          <button
            type="button"
            onClick={onNavigate}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-raised hover:text-ink lg:hidden"
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="px-3.5 pb-3">
        <div className="relative overflow-hidden rounded-xl border border-line bg-gradient-to-br from-raised to-surface p-3">
          <div className="absolute -right-6 -top-8 h-20 w-20 rounded-full bg-accent/10 blur-2xl" />
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent/70 text-[11px] font-extrabold text-accent-ink shadow-sm">
              TS
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-bold tracking-[-0.01em] text-ink">
                TaskFlow Studio
              </p>
              <p className="truncate text-[10.5px] text-muted">Product team workspace</p>
            </div>
            <span className="rounded-md border border-accent/20 bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">
              Pro
            </span>
          </div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3.5 pb-4">
        <p className="mb-1.5 px-2.5 pt-2 text-[9.5px] font-bold uppercase tracking-[0.14em] text-muted/60">
          Workspace
        </p>
        <div className="space-y-0.5">
          {mainNav.map((item) => {
            const Icon = item.icon
            const active = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={cn('nav-item group', active && 'active')}
              >
                <Icon
                  size={16.5}
                  strokeWidth={active ? 2.2 : 1.9}
                  className={cn('transition-colors', active ? 'text-accent' : 'text-muted/80 group-hover:text-ink')}
                />
                <span className="flex-1">{item.label}</span>
                {item.to === '/tasks' && openTasks > 0 && (
                  <span
                    className={cn(
                      'rounded-md px-1.5 py-0.5 font-mono text-[9.5px] font-semibold',
                      active ? 'bg-accent/15 text-accent' : 'bg-raised text-muted',
                    )}
                  >
                    {openTasks}
                  </span>
                )}
                {active && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute -left-[14px] top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-accent"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
              </NavLink>
            )
          })}
        </div>

        <div className="mb-1.5 mt-6 flex items-center justify-between px-2.5">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-muted/60">
            Projects
          </p>
          <NavLink
            to="/projects"
            onClick={onNavigate}
            className="text-[10px] font-semibold text-muted transition hover:text-accent"
          >
            View all
          </NavLink>
        </div>

        <div className="space-y-0.5">
          {loading && !projects.length
            ? Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex h-9 items-center gap-3 px-3">
                  <span className="h-2 w-2 rounded-full bg-muted/20" />
                  <span className="h-2.5 w-24 rounded bg-muted/10" />
                </div>
              ))
            : projects.slice(0, 5).map((project) => {
                const active = location.pathname === `/projects/${project.id}`
                return (
                  <NavLink
                    key={project.id}
                    to={`/projects/${project.id}`}
                    onClick={onNavigate}
                    className={cn(
                      'group flex h-9 items-center gap-2.5 rounded-lg px-3 text-[12.5px] font-medium transition-colors',
                      active
                        ? 'bg-raised text-ink'
                        : 'text-muted hover:bg-raised/70 hover:text-ink',
                    )}
                  >
                    <span
                      className="h-[7px] w-[7px] shrink-0 rounded-full transition-transform group-hover:scale-125"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="truncate">{project.name}</span>
                  </NavLink>
                )
              })}
          <button
            type="button"
            onClick={() => {
              setProjectModalOpen(true)
              onNavigate?.()
            }}
            className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-[12px] font-medium text-muted/70 transition hover:bg-raised/70 hover:text-ink"
          >
            <Plus size={13} />
            <span>New project</span>
          </button>
        </div>
      </nav>

      <div className="shrink-0 space-y-2 border-t border-line/80 p-3.5">
        <div className="rounded-xl border border-line bg-raised/70 p-3">
          <div className="flex items-center gap-3">
            <ProgressRing value={momentum} size={42} stroke={4}>
              <span className="font-mono text-[9px] font-bold text-ink">{momentum}%</span>
            </ProgressRing>
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-[11.5px] font-bold text-ink">
                Weekly momentum <Sparkles size={10} className="text-amber-400" />
              </p>
              <p className="mt-0.5 text-[10.5px] leading-snug text-muted">
                {completedThisWeek} of {weeklyGoal} tasks completed
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NavLink
            to="/settings"
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'nav-item h-9 flex-1',
                isActive && 'bg-accent/[0.08] text-accent',
              )
            }
          >
            <SettingsIcon size={16} strokeWidth={1.9} />
            <span>Settings</span>
          </NavLink>
          <NavLink
            to="/projects"
            onClick={onNavigate}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-muted shadow-sm transition hover:text-accent"
            title="All projects"
            aria-label="All projects"
          >
            <ArrowRight size={14} />
          </NavLink>
        </div>

        <NavLink
          to="/settings"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-xl px-1 py-1 transition hover:bg-raised/70"
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{
              backgroundImage: currentUser
                ? `linear-gradient(135deg, ${currentUser.avatarColors[0]}, ${currentUser.avatarColors[1]})`
                : undefined,
            }}
          >
            {currentUser?.name
              .split(' ')
              .map((part) => part[0])
              .slice(0, 2)
              .join('') ?? '—'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-ink">
              {currentUser?.name ?? 'Loading…'}
            </p>
            <p className="truncate text-[10px] text-muted">{currentUser?.email ?? ''}</p>
          </div>
          <SettingsIcon size={13} className="text-muted/60" />
        </NavLink>
      </div>
    </div>
  )
}

export function Sidebar() {
  const { mobileNavOpen, setMobileNavOpen } = useUI()

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] flex-col border-r border-line/80 bg-surface/60 backdrop-blur-xl lg:flex">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {mobileNavOpen && (
          <div className="fixed inset-0 z-[75] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-[rgb(8_8_14/0.5)] backdrop-blur-sm"
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="relative flex h-full w-[284px] flex-col border-r border-line bg-surface shadow-lift"
            >
              <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
