import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Flame,
  Inbox,
  Plus,
} from 'lucide-react'
import { cn, dueMeta, filterTasks, isTaskOverdue, sortTasks } from '../lib/utils'
import { PRIORITY_META, STATUS_META, STATUS_ORDER, type Task, type TaskStatus } from '../types'
import { useWorkspace } from '../context/WorkspaceProvider'
import { useUI } from '../context/UIProvider'
import { useToast } from '../context/ToastProvider'
import { TaskFilterBar } from '../components/tasks/TaskFilterBar'
import { Avatar, AvatarGroup } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { PriorityBadge, StatusBadge, Tag } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { Segmented } from '../components/ui/Segmented'
import { PageHeader } from '../components/ui/PageHeader'

function RowActions({ task }: { task: Task }) {
  const { updateTask } = useWorkspace()
  const { toast } = useToast()
  const nextStatus: TaskStatus = task.status === 'done' ? 'in_progress' : 'done'
  return (
    <button
      type="button"
      onClick={() =>
        updateTask(task.id, { status: nextStatus }).then(() =>
          toast({
            title: nextStatus === 'done' ? 'Task completed' : 'Task reopened',
            description: task.title,
          }),
        )
      }
      className={cn(
        'flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[10.5px] font-semibold transition',
        task.status === 'done'
          ? 'border border-line bg-surface text-muted hover:text-ink'
          : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400',
      )}
    >
      <CheckCircle2 size={12} />
      {task.status === 'done' ? 'Reopen' : 'Complete'}
    </button>
  )
}

function TaskRow({ task, index }: { task: Task; index: number }) {
  const { projects, members } = useWorkspace()
  const { openTask: open } = useUI()
  const project = projects.find((item) => item.id === task.projectId)
  const assignee = members.find((member) => member.id === task.assigneeId)
  const due = dueMeta(task.dueDate)
  const overdue = isTaskOverdue(task)

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.3) }}
    >
      <button
        type="button"
        onClick={() => open(task.id)}
        className="group flex w-full items-center gap-3 border-b border-line/60 px-4 py-3 text-left transition last:border-0 hover:bg-raised/70 sm:px-5"
      >
        <span
          className={cn(
            'flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border-2 transition',
            task.status === 'done'
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-muted/30 group-hover:border-accent',
          )}
          style={{ height: 18, width: 18 }}
        >
          {task.status === 'done' && (
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
              <path d="M2 6.2 4.8 9 10 3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p
              className={cn(
                'truncate text-[13px] font-semibold tracking-[-0.005em] transition group-hover:text-accent',
                task.status === 'done' ? 'text-muted line-through decoration-muted/40' : 'text-ink',
              )}
            >
              {task.title}
            </p>
            {overdue && (
              <span className="shrink-0 rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-rose-500">
                Overdue
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {project && (
              <span className="flex items-center gap-1 text-[10.5px] text-muted">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: project.color }} />
                {project.name}
              </span>
            )}
            {task.labels.map((label) => (
              <Tag key={label} className="border-0 bg-raised px-1.5">
                {label}
              </Tag>
            ))}
            {task.dueDate && (
              <span
                className={cn(
                  'flex items-center gap-1 text-[10.5px]',
                  overdue ? 'font-semibold text-rose-500' : due.tone === 'today' ? 'font-semibold text-amber-500' : 'text-muted',
                )}
              >
                <CalendarDays size={10} />
                {due.label}
              </span>
            )}
          </div>
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} />
        </div>

        <Avatar user={assignee} size="sm" />
        <span className="hidden md:block">
          <RowActions task={task} />
        </span>
      </button>
    </motion.div>
  )
}

export function MyTasksPage() {
  const { tasks, projects, members, loading, currentUserId } = useWorkspace()
  const { createTask } = useUI()
  const [query, setQuery] = useState('')
  const [groupBy, setGroupBy] = useState<'status' | 'priority' | 'none'>('status')
  const [statusOpen, setStatusOpen] = useState<Record<string, boolean>>({})

  const mine = useMemo(
    () =>
      filterTasks(tasks, {
        query,
        statuses: [],
        priorities: [],
        projectIds: [],
        assigneeIds: [],
        sort: 'due',
      }).filter((task) => task.assigneeId === currentUserId),
    [tasks, query, currentUserId],
  )

  const filters = useMemo(
    () => ({
      query,
      statuses: [] as TaskStatus[],
      priorities: [] as Task['priority'][],
      projectIds: [] as string[],
      assigneeIds: [] as string[],
      sort: 'due' as const,
    }),
    [query],
  )

  const sections = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'all', label: 'All my tasks', items: sortTasks(mine, 'due') }]
    if (groupBy === 'priority') {
      const order = (['urgent', 'high', 'medium', 'low'] as const).map((priority) => ({
        key: priority,
        label: `${PRIORITY_META[priority].label} priority`,
        items: mine.filter((task) => task.priority === priority),
      }))
      return order.filter((section) => section.items.length > 0)
    }
    return STATUS_ORDER.map((status) => ({
      key: status,
      label: STATUS_META[status].label,
      items: mine.filter((task) => task.status === status),
    })).filter((section) => section.items.length > 0)
  }, [mine, groupBy])

  const doneCount = mine.filter((task) => task.status === 'done').length
  const progress = mine.length ? Math.round((doneCount / mine.length) * 100) : 0

  return (
    <div className="space-y-5">
      <PageHeader
        title="My tasks"
        description={`Everything assigned to you across ${projects.length} projects, sorted by due date.`}
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => createTask()}>
            New task
          </Button>
        }
      />

      <div className="card flex items-center gap-4 p-4">
        <div className="relative shrink-0">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent/60 font-mono text-sm font-bold text-accent-ink shadow-glow">
            {progress}%
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-ink">Your workload</p>
          <p className="mt-0.5 text-[11.5px] text-muted">
            {doneCount} of {mine.length} tasks complete · {mine.length - doneCount} remaining
          </p>
          <div className="mt-2 max-w-md">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', stiffness: 80, damping: 20 }}
                className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-500"
              />
            </div>
          </div>
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <AvatarGroup users={members.slice(0, 4)} />
        </div>
      </div>

      <TaskFilterBar
        filters={filters}
        onChange={(next) => setQuery(next.query)}
        resultCount={mine.length}
      />

      <div className="flex items-center gap-2">
        <Segmented
          value={groupBy}
          onChange={(value) => setGroupBy(value)}
          options={[
            { value: 'status', label: 'By status' },
            { value: 'priority', label: 'By priority' },
            { value: 'none', label: 'List' },
          ]}
        />
        <span className="text-[11px] text-muted">
          {mine.length} task{mine.length === 1 ? '' : 's'} assigned to you
        </span>
      </div>

      {loading ? (
        <div className="card divide-y divide-line/60">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 px-5 py-4">
              <div className="skeleton h-4.5 w-4.5 rounded-full" style={{ height: 18, width: 18 }} />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3.5 w-2/5" />
                <div className="skeleton h-2.5 w-1/4" />
              </div>
              <div className="skeleton h-5 w-14 rounded-full" />
            </div>
          ))}
        </div>
      ) : mine.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Inbox size={20} />}
            title="Nothing on your plate"
            description={
              query
                ? 'No tasks match your current search and filters.'
                : 'You are all caught up. Create a task to keep the momentum going.'
            }
            action={
              <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => createTask()}>
                Create a task
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => {
            const open = statusOpen[section.key] ?? true
            return (
              <section key={section.key} className="card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setStatusOpen((current) => ({ ...current, [section.key]: !open }))}
                  className="flex w-full items-center gap-2.5 bg-raised/50 px-5 py-3 text-left transition hover:bg-raised"
                >
                  <ChevronDown
                    size={14}
                    className={cn('text-muted transition-transform', !open && '-rotate-90')}
                  />
                  {groupBy === 'status' && (
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        STATUS_META[section.key as TaskStatus]?.dot,
                      )}
                    />
                  )}
                  {groupBy === 'priority' && (
                    <Flame
                      size={12}
                      className={cn(
                        section.key === 'urgent'
                          ? 'text-rose-500'
                          : section.key === 'high'
                            ? 'text-orange-500'
                            : 'text-muted',
                      )}
                    />
                  )}
                  {groupBy === 'none' && <CheckCircle2 size={13} className="text-muted" />}
                  <h2 className="text-[12.5px] font-bold text-ink">{section.label}</h2>
                  <span className="rounded-md bg-surface px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-muted shadow-sm">
                    {section.items.length}
                  </span>
                  {section.key === 'done' || section.key === 'all' ? (
                    <span className="ml-auto text-[10px] text-muted">
                      {Math.round(
                        (section.items.filter((task) => task.status === 'done').length /
                          Math.max(section.items.length, 1)) *
                          100,
                      )}
                      % done
                    </span>
                  ) : null}
                </button>
                {open && (
                  <div>
                    {section.items.map((task, index) => (
                      <TaskRow key={task.id} task={task} index={index} />
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      {mine.length > 0 && mine.length === doneCount && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card flex items-center gap-3 border-emerald-500/20 bg-emerald-500/[0.03] p-4"
        >
          <CircleDashed size={18} className="text-emerald-500" />
          <p className="text-[12.5px] font-semibold text-ink">
            Every task is complete. Exceptional work.
          </p>
        </motion.div>
      )}
    </div>
  )
}
