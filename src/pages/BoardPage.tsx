import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowUpDown,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Plus,
  RotateCcw,
  Search,
} from 'lucide-react'
import { addDays, isWithinInterval, parseISO, startOfDay } from 'date-fns'
import { cn, dueMeta, filterTasks, isTaskOverdue, pluralize } from '../lib/utils'
import type { Task } from '../types'
import { useWorkspace } from '../context/WorkspaceProvider'
import { useUI } from '../context/UIProvider'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { PriorityBadge, StatusBadge } from '../components/ui/Badge'
import { ProjectIcon } from '../components/projects/ProjectIcon'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { KanbanBoard } from '../components/board/KanbanBoard'

type ViewMode = 'board' | 'list'

function ListRow({ task, index }: { task: Task; index: number }) {
  const { projects, members } = useWorkspace()
  const { openTask } = useUI()
  const project = projects.find((item) => item.id === task.projectId)
  const assignee = members.find((member) => member.id === task.assigneeId)
  const due = dueMeta(task.dueDate)
  const overdue = isTaskOverdue(task)

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.35) }}
      type="button"
      onClick={() => openTask(task.id)}
      className="group flex w-full items-center gap-3 border-b border-line/60 px-4 py-3 text-left transition last:border-0 hover:bg-raised/70 sm:px-5"
    >
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full border-2',
          task.status === 'done'
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-muted/30 group-hover:border-accent',
        )}
        style={{ height: 16, width: 16 }}
      >
        {task.status === 'done' && <Check size={9} strokeWidth={3.5} />}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-[12.5px] font-semibold transition group-hover:text-accent',
            task.status === 'done' ? 'text-muted line-through decoration-muted/40' : 'text-ink',
          )}
        >
          {task.title}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted">
          {project && (
            <span className="flex items-center gap-1">
              <span className="h-1 w-1 rounded-full" style={{ backgroundColor: project.color }} />
              {project.name}
            </span>
          )}
        </div>
      </div>
      <div className="hidden items-center gap-2 sm:flex">
        <PriorityBadge priority={task.priority} />
        <StatusBadge status={task.status} />
      </div>
      {task.dueDate && (
        <span
          className={cn(
            'hidden items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold sm:flex',
            overdue
              ? 'bg-rose-500/10 text-rose-500'
              : due.tone === 'today'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'text-muted',
          )}
        >
          <CalendarDays size={10} />
          {due.label}
        </span>
      )}
      <Avatar user={assignee} size="xs" />
    </motion.button>
  )
}

export function BoardPage() {
  const { tasks, projects } = useWorkspace()
  const { createTask } = useUI()
  const navigate = useNavigate()
  const [view, setView] = useState<ViewMode>('board')
  const [query, setQuery] = useState('')
  const [range, setRange] = useState<'all' | 'today' | 'week'>('all')

  const visible = useMemo(() => {
    const base = filterTasks(tasks, {
      query,
      statuses: [],
      priorities: [],
      projectIds: [],
      assigneeIds: [],
      sort: 'due',
    })
    if (range === 'all') return base
    const start = startOfDay(new Date())
    const end = addDays(start, range === 'today' ? 1 : 7)
    return base.filter((task) => {
      if (!task.dueDate) return false
      return isWithinInterval(parseISO(task.dueDate), { start, end })
    })
  }, [tasks, query, range])

  const dueTodayCount = visible.filter((task) => dueMeta(task.dueDate).tone === 'today').length
  const overdueCount = visible.filter((task) => isTaskOverdue(task)).length

  return (
    <div className="space-y-5">
      <PageHeader
        title="Board"
        description="Drag work between columns. Everything saves instantly."
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => createTask()}>
            New task
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-[260px]">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted/70" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter tasks on the boardâ€¦"
            aria-label="Filter tasks"
            className="input h-9 pl-9 text-[12px]"
          />
        </div>

        <div className="inline-flex items-center gap-0.5 rounded-xl border border-line bg-raised p-0.5">
          {(
            [
              { value: 'board', label: 'Board', icon: Check },
              { value: 'list', label: 'List', icon: ArrowUpDown },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setView(option.value)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-[9px] px-3 text-xs font-semibold transition-all',
                view === option.value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
              )}
            >
              <option.icon size={13} />
              {option.label}
            </button>
          ))}
        </div>

        <div className="inline-flex items-center gap-0.5 rounded-xl border border-line bg-raised p-0.5">
          {(
            [
              { value: 'all', label: 'All' },
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'This week' },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRange(option.value)}
              className={cn(
                'inline-flex h-8 items-center rounded-[9px] px-3 text-xs font-semibold transition-all',
                range === option.value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3 text-[10.5px] font-medium">
          {overdueCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-1 font-semibold text-rose-500">
              <Clock3 size={10} />
              {pluralize(overdueCount, 'overdue')}
            </span>
          )}
          <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 font-semibold text-amber-600 dark:text-amber-400">
            <CalendarDays size={10} />
            {pluralize(dueTodayCount, 'due today')}
          </span>
        </div>
      </div>

      {view === 'board' ? (
        <KanbanBoard tasks={visible} />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card overflow-hidden"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={visible.length + range}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {visible.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 size={20} />}
                  title="No tasks in this view"
                  description="Try a different time range, or clear your search filter."
                  action={
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<RotateCcw size={12} />}
                      onClick={() => {
                        setQuery('')
                        setRange('all')
                      }}
                    >
                      Reset filters
                    </Button>
                  }
                />
              ) : (
                visible.map((task, index) => <ListRow key={task.id} task={task} index={index} />)
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}

      {projects.length === 0 && (
        <div className="card">
          <EmptyState
            icon={<ProjectIcon project={{ icon: 'rocket', color: '#6D5EF8' }} size="lg" showBackground={false} />}
            title="No projects yet"
            description="Projects group related tasks together."
            action={
              <Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => navigate('/projects')}>
                Go to projects
              </Button>
            }
          />
        </div>
      )}
    </div>
  )
}
