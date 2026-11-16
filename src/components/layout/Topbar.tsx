import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  Command,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  UserRound,
} from 'lucide-react'
import { cn, greeting, relativeTime } from '../../lib/utils'
import { useWorkspace } from '../../context/WorkspaceProvider'
import { useAuth } from '../../context/AuthProvider'
import { useUI } from '../../context/UIProvider'
import { useTheme } from '../../context/ThemeProvider'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Kbd } from '../ui/Badge'
import { MenuItem, MenuLabel, MenuSeparator, Popover } from '../ui/Popover'

const pageTitles: Record<string, string> = {
  '/': 'Overview',
  '/tasks': 'My tasks',
  '/board': 'Board',
  '/calendar': 'Calendar',
  '/projects': 'Projects',
  '/settings': 'Settings',
}

export function Topbar() {
  const { currentUser, members, activities } = useWorkspace()
  const { logout } = useAuth()
  const { setMobileNavOpen, setPaletteOpen, createTask } = useUI()
  const { resolvedTheme, setTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [notificationsRead, setNotificationsRead] = useState(false)

  const pageTitle = location.pathname.startsWith('/projects/')
    ? 'Project'
    : (pageTitles[location.pathname] ?? 'TaskFlow')

  const unread = notificationsRead ? 0 : activities.length
  const recentActivities = useMemo(() => activities.slice(0, 5), [activities])

  return (
    <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line/70 px-4 sm:px-6">
      <button
        type="button"
        onClick={() => setMobileNavOpen(true)}
        className="icon-btn -ml-1 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>

      <div className="hidden min-w-0 items-center gap-2 text-[12px] sm:flex">
        <span className="font-medium text-muted">Workspace</span>
        <ChevronRight size={12} className="text-muted/50" />
        <span className="truncate font-semibold text-ink">{pageTitle}</span>
      </div>

      <div className="hidden flex-1 md:block" />

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="group hidden h-9 w-[280px] items-center gap-2.5 rounded-xl border border-line bg-raised/60 px-3 text-left text-[12px] text-muted/80 transition hover:border-accent/30 hover:bg-surface hover:text-muted md:flex xl:w-[320px]"
        aria-label="Search tasks and projects"
      >
        <Search size={15} className="text-muted/70 transition group-hover:text-accent" />
        <span className="flex-1 truncate">Search tasks, projects…</span>
        <span className="flex items-center gap-1">
          <Kbd>
            <Command size={9} className="-ml-0.5" />K
          </Kbd>
        </span>
      </button>

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="icon-btn md:hidden"
        aria-label="Search"
      >
        <Search size={18} />
      </button>

      <div className="hidden flex-1 md:block" />

      <div className="flex items-center gap-1">
        <span className="mr-1 hidden text-[11px] font-medium text-muted xl:block">
          {greeting()}, {currentUser?.name.split(' ')[0] ?? 'there'}
        </span>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => createTask()}
          className="mr-1 h-9 px-3 sm:px-3.5"
        >
          <span className="hidden sm:inline">New task</span>
          <span className="sm:hidden">Add</span>
        </Button>

        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="icon-btn relative overflow-hidden"
          aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
          title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={resolvedTheme}
              initial={{ y: 12, opacity: 0, rotate: -20 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              exit={{ y: -12, opacity: 0, rotate: 20 }}
              transition={{ duration: 0.18 }}
              className="flex"
            >
              {resolvedTheme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </motion.span>
          </AnimatePresence>
        </button>

        <Popover
          panelClassName="w-[336px] p-0"
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              className="icon-btn relative"
              aria-label="Notifications"
            >
              <Bell size={17} />
              {unread > 0 && (
                <span className="absolute right-2 top-2 flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-accent" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                </span>
              )}
            </button>
          )}
        >
          {(close) => (
            <div>
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-bold text-ink">Notifications</p>
                  {unread > 0 && (
                    <span className="rounded-full bg-accent/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-accent">
                      {unread}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setNotificationsRead(true)}
                  className="flex items-center gap-1 text-[10.5px] font-semibold text-muted transition hover:text-accent"
                >
                  <Check size={11} />
                  Mark all read
                </button>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-1.5">
                {recentActivities.length === 0 ? (
                  <p className="px-3 py-8 text-center text-xs text-muted">You're all caught up.</p>
                ) : (
                  recentActivities.map((activity) => {
                    const actor = members.find((member) => member.id === activity.actorId)
                    return (
                      <button
                        key={activity.id}
                        type="button"
                        onClick={() => {
                          close()
                          navigate('/')
                        }}
                        className="flex w-full items-start gap-2.5 rounded-lg p-2.5 text-left transition hover:bg-raised"
                      >
                        <Avatar user={actor} size="sm" className="mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11.5px] leading-relaxed text-muted">
                            <span className="font-semibold text-ink">{actor?.name}</span>{' '}
                            {activity.action}{' '}
                            <span className="font-medium text-ink">“{activity.target}”</span>
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted/70">
                            {relativeTime(activity.createdAt)}
                          </p>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
              <div className="border-t border-line p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    close()
                    navigate('/')
                  }}
                  className="flex h-8 w-full items-center justify-center rounded-lg text-[11px] font-semibold text-accent transition hover:bg-accent/5"
                >
                  View activity feed
                </button>
              </div>
            </div>
          )}
        </Popover>

        <div className="mx-1 h-5 w-px bg-line" />

        <Popover
          panelClassName="w-[232px]"
          trigger={({ toggle, open }) => (
            <button
              type="button"
              onClick={toggle}
              className={cn(
                'flex items-center gap-1.5 rounded-xl p-1 pr-1.5 transition hover:bg-raised',
                open && 'bg-raised',
              )}
              aria-label="Account menu"
            >
              <Avatar user={currentUser} size="md" />
              <ChevronDown size={13} className="text-muted" />
            </button>
          )}
        >
          {(close) => (
            <>
              <div className="mb-1 flex items-center gap-2.5 px-2.5 pb-2 pt-1.5">
                <Avatar user={currentUser} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-bold text-ink">{currentUser?.name}</p>
                  <p className="truncate text-[10.5px] text-muted">{currentUser?.email}</p>
                </div>
              </div>
              <MenuSeparator />
              <MenuItem
                icon={<UserRound size={14} />}
                onClick={() => {
                  close()
                  navigate('/settings')
                }}
              >
                Profile & preferences
              </MenuItem>
              <MenuItem
                icon={<Settings size={14} />}
                onClick={() => {
                  close()
                  navigate('/settings')
                }}
              >
                Workspace settings
              </MenuItem>
              <MenuLabel>Quick jump</MenuLabel>
              {['/tasks', '/board', '/projects'].map((path) => (
                <MenuItem
                  key={path}
                  onClick={() => {
                    close()
                    navigate(path)
                  }}
                >
                  {path === '/tasks' ? 'My tasks' : path === '/board' ? 'Kanban board' : 'Projects'}
                </MenuItem>
              ))}
              <MenuSeparator />
              <MenuItem
                icon={<LogOut size={14} />}
                danger
                onClick={() => {
                  close()
                  logout()
                }}
              >
                Sign out
              </MenuItem>
            </>
          )}
        </Popover>
      </div>
    </header>
  )
}
