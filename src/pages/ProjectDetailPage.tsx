import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowUpDown,
  CalendarDays,
  CirclePause,
  CirclePlay,
  FolderKanban,
  Plus,
  Search,
} from 'lucide-react'
import { cn, dueMeta, filterTasks, isTaskOverdue, pluralize, projectProgress } from '../lib/utils'
import { STATUS_META, STATUS_ORDER } from '../types'
import { useWorkspace } from '../context/WorkspaceProvider'
import { useUI } from '../context/UIProvider'
import { useToast } from '../context/ToastProvider'
import { Avatar, AvatarGroup } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { PriorityBadge, StatusBadge, Tag } from '../components/ui/Badge'
import { ProjectIcon } from '../components/projects/ProjectIcon'
import { ProgressBar } from '../components/ui/Progress'
import { EmptyState } from '../components/ui/EmptyState'
import { Popover, MenuItem, MenuLabel } from '../components/ui/Popover'

type SortKey = 'updated' | 'due' | 'priority' | 'title'

const sortLabels: Record<SortKey, string> = {
  updated: 'Recently updated',
  due: 'Due date',
  priority: 'Priority',
  title: 'Alphabetical',
}

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { projects, tasks, members, updateProjectStatus } = useWorkspace()
  const { openTask, createTask } = useUI()
  const { toast } = useToast()
  const navigate = useNavigate()

  const project = projects.find((item) => item.id === projectId)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [sort, setSort] = useState<SortKey>('updated')

  const scoped = useMemo(
    () => tasks.filter((task) => task.projectId === projectId),
    [tasks, projectId],
  )

  const visible = useMemo(() => {
    const base = filterTasks(scoped, {
      query,
      statuses: status === 'all' ? [] : [status as keyof typeof STATUS_META],
      priorities: [],
      projectIds: [],
      assigneeIds: [],
      sort,
    })
    return base
  }, [scoped, query, status, sort])

  if (!project) {
    return (
      <div className="card">
        <EmptyState
          icon={<FolderKanban size={20} />}
          title="Project not found"
          description="This project may have been removed, or the link is wrong."
          action={
            <Button size="sm" variant="secondary" onClick={() => navigate('/projects')}>
              Back to projects
            </Button>
          }
        />
      </div>
    )
  }

  const progress = projectProgress(scoped, project.id)
  const overdue = scoped.filter((task) => isTaskOverdue(task)).length
  const projectMembers = members.filter((member) => project.memberIds.includes(member.id))

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => navigate('/projects')}
        className="flex items-center gap-1 text-[11.5px] font-semibold text-muted transition hover:text-accent"
      >
        <ArrowLeft size={13} />
        All projects
      </button>

      <div className="card overflow-hidden">
        <div
          className="h-2 w-full"
          style={{
            background: `linear-gradient(90deg, ${project.color}, ${project.color}88)`,
          }}
        />
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <ProjectIcon project={project} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[20px] font-extrabold tracking-[-0.025em] text-ink">
                  {project.name}
                </h1>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                    project.status === 'active' && 'bg-emerald-500/10 text-emerald-500',
                    project.status === 'paused' && 'bg-amber-500/10 text-amber-500',
                    project.status === 'completed' && 'bg-muted/10 text-muted',
                  )}
                >
                  {project.status}
                </span>
              </div>
              <p className="mt-1 max-w-lg text-[12.5px] leading-relaxed text-muted">
                {project.description}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[10.5px] text-muted">
                {project.dueDate && (
                  <span className="flex items-center gap-1">
                    <CalendarDays size={11} />
                    Target: {new Date(project.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
                <span>
                  {pluralize(overdue, 'overdue task', 'overdue tasks')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[22px] font-extrabold leading-none tracking-[-0.03em] text-ink">
                  {progress}%
                </p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted">
                  Complete
                </p>
              </div>
              <ProgressBar value={progress} color={project.color} className="w-28" height={6} />
            </div>
            <AvatarGroup users={projectMembers} size="sm" />
            <Button
              size="sm"
              variant="secondary"
              icon={project.status === 'paused' ? <CirclePlay size={13} /> : <CirclePause size={13} />}
              onClick={() =>
                updateProjectStatus(project.id, project.status === 'paused' ? 'active' : 'paused')
                  .then(() =>
                    toast({
                      title: project.status === 'paused' ? 'Project resumed' : 'Project paused',
                      description: project.name,
                    }),
                  )
              }
            >
              {project.status === 'paused' ? 'Resume' : 'Pause'}
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => createTask({ projectId: project.id })}
            >
              Add task
            </Button>
          </div>
        </div>

        <div className="border-t border-line/70 bg-raised/40 px-5 py-3 sm:px-6">
          <div className="flex h-5 items-center gap-4 overflow-hidden">
            {STATUS_ORDER.map((statusKey) => {
              const count = scoped.filter((task) => task.status === statusKey).length
              return (
                <span
                  key={statusKey}
                  className="flex items-center gap-1.5 text-[10.5px] font-medium text-muted"
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_META[statusKey].dot)} />
                  {STATUS_META[statusKey].label}
                  <span className="font-mono text-[10px]">{count}</span>
                </span>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-[240px]">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted/70" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search in this project…"
            aria-label="Search tasks in project"
            className="input h-9 pl-9 text-[12px]"
          />
        </div>

        <div className="inline-flex items-center gap-0.5 rounded-xl border border-line bg-raised p-0.5">
          {(['all', ...STATUS_ORDER] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={cn(
                'h-8 rounded-[9px] px-2.5 text-[11px] font-semibold capitalize transition-all',
                status === value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
              )}
            >
              {value === 'all' ? 'All' : STATUS_META[value].short}
            </button>
          ))}
        </div>

        <Popover
          panelClassName="w-[190px]"
          trigger={({ toggle, open }) => (
            <Button
              size="sm"
              variant="secondary"
              onClick={toggle}
              icon={<ArrowUpDown size={13} />}
              className={cn('h-9', open && 'border-accent/40 text-accent')}
            >
              Sort: {sortLabels[sort]}
            </Button>
          )}
        >
          {(close) => (
            <>
              <MenuLabel>Sort tasks</MenuLabel>
              {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                <MenuItem
                  key={key}
                  active={sort === key}
                  icon={sort === key ? <ArrowUpDown size={13} /> : <span className="h-3 w-3" />}
                  onClick={() => {
                    setSort(key)
                    close()
                  }}
                >
                  {sortLabels[key]}
                </MenuItem>
              ))}
            </>
          )}
        </Popover>

        <span className="ml-auto font-mono text-[10.5px] text-muted">
          {visible.length} of {scoped.length} task{scoped.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="card overflow-hidden">
        {visible.length === 0 ? (
          <EmptyState
            icon={<FolderKanban size={20} />}
            title="No tasks here yet"
            description="Add the first task to get this project moving."
            action={
              <Button
                size="sm"
                variant="primary"
                icon={<Plus size={13} />}
                onClick={() => createTask({ projectId: project.id })}
              >
                Add a task
              </Button>
            }
          />
        ) : (
          visible.map((task, index) => {
            const assignee = members.find((member) => member.id === task.assigneeId)
            const due = dueMeta(task.dueDate)
            const taskOverdue = isTaskOverdue(task)
            return (
              <motion.button
                key={task.id}
                type="button"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.02, 0.25) }}
                onClick={() => openTask(task.id)}
                className="group flex w-full items-center gap-3 border-b border-line/60 px-5 py-3.5 text-left transition last:border-0 hover:bg-raised/70"
              >
                <span
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                    task.status === 'done'
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-muted/30 group-hover:border-accent',
                  )}
                >
                  {task.status === 'done' && (
                    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-white" fill="none">
                      <path d="M2 6.2 4.8 9 10 3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'truncate text-[13px] font-semibold transition group-hover:text-accent',
                      task.status === 'done' && 'text-muted line-through decoration-muted/40',
                    )}
                  >
                    {task.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {task.labels.map((label) => (
                      <Tag key={label}>{label}</Tag>
                    ))}
                    {task.dueDate && (
                      <span
                        className={cn(
                          'flex items-center gap-1 text-[10.5px]',
                          taskOverdue ? 'font-semibold text-rose-500' : 'text-muted',
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
              </motion.button>
            )
          })
        )}
      </div>
    </div>
  )
}
