import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowUpDown,
  BarChart3,
  CalendarDays,
  FolderKanban,
  LayoutGrid,
  Plus,
  Rocket,
  Search,
} from 'lucide-react'
import { cn, projectProgress, relativeTime, sortTasks } from '../lib/utils'
import type { Project, ProjectStatus } from '../types'
import { useWorkspace } from '../context/WorkspaceProvider'
import { useUI } from '../context/UIProvider'
import { AvatarGroup } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { ProjectIcon } from '../components/projects/ProjectIcon'
import { ProgressBar } from '../components/ui/Progress'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { Popover, MenuItem, MenuLabel } from '../components/ui/Popover'


type SortKey = 'progress' | 'name' | 'tasks' | 'updated'

const sortLabels: Record<SortKey, string> = {
  progress: 'Completion',
  name: 'Name',
  tasks: 'Task count',
  updated: 'Recently active',
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const { tasks, members } = useWorkspace()
  const navigate = useNavigate()
  const { createTask } = useUI()

  const scoped = useMemo(() => tasks.filter((task) => task.projectId === project.id), [tasks, project.id])
  const done = scoped.filter((task) => task.status === 'done').length
  const progress = projectProgress(scoped, project.id)
  const active = scoped.filter((task) => task.status !== 'done')
  const overdue = active.filter((task) => {
    if (!task.dueDate) return false
    return new Date(task.dueDate) < new Date(new Date().toDateString())
  })
  const upcoming = sortTasks(active, 'due')
    .filter((task) => task.dueDate)
    .slice(0, 2)
  const projectMembers = members.filter((member) => project.memberIds.includes(member.id))

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 240, damping: 26 }}
      onClick={() => navigate(`/projects/${project.id}`)}
      className="card group relative overflow-hidden p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-[0.07] blur-2xl transition-opacity duration-300 group-hover:opacity-[0.14]"
        style={{ backgroundColor: project.color }}
      />

      <div className="flex items-start justify-between gap-3">
        <ProjectIcon project={project} size="lg" />
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

      <h3 className="mt-3.5 text-[15px] font-bold tracking-[-0.015em] text-ink transition group-hover:text-accent">
        {project.name}
      </h3>
      <p className="mt-1 line-clamp-2 min-h-[32px] text-[11.5px] leading-relaxed text-muted">
        {project.description}
      </p>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[10.5px]">
          <span className="font-medium text-muted">{progress}% complete</span>
          <span className="font-mono text-muted">
            {done}/{scoped.length}
          </span>
        </div>
        <ProgressBar value={progress} color={project.color} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10.5px] text-muted">
          <span className="flex items-center gap-1">
            <CalendarDays size={11} />
            {project.dueDate ? relativeTime(project.dueDate + 'T00:00:00') : 'No deadline'}
          </span>
          {overdue.length > 0 && (
            <span className="rounded-md bg-rose-500/10 px-1.5 py-0.5 font-semibold text-rose-500">
              {overdue.length} overdue
            </span>
          )}
        </div>
        <AvatarGroup users={projectMembers} max={3} size="xs" />
      </div>

      {upcoming.length > 0 && (
        <div className="mt-3 border-t border-line/60 pt-3">
          {upcoming.map((task) => (
            <div key={task.id} className="flex items-center gap-2 py-0.5 text-[10.5px] text-muted">
              <span className="h-1 w-1 rounded-full" style={{ backgroundColor: project.color }} />
              <span className="truncate">{task.title}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10.5px] text-muted/70">{active.length} open task{active.length === 1 ? '' : 's'}</span>
        <span
          role="button"
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation()
            createTask({ projectId: project.id })
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.stopPropagation()
              createTask({ projectId: project.id })
            }
          }}
          className="flex h-7 items-center gap-1 rounded-lg border border-line bg-surface px-2.5 text-[10.5px] font-semibold text-muted opacity-0 transition group-hover:opacity-100 hover:border-accent/40 hover:text-accent"
        >
          <Plus size={11} />
          Add task
        </span>
      </div>
    </motion.button>
  )
}

export function ProjectsPage() {
  const { projects, tasks } = useWorkspace()
  const { setProjectModalOpen } = useUI()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all')
  const [sort, setSort] = useState<SortKey>('updated')

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const filtered = projects.filter((project) => {
      if (statusFilter !== 'all' && project.status !== statusFilter) return false
      if (!normalized) return true
      return (
        project.name.toLowerCase().includes(normalized) ||
        project.description.toLowerCase().includes(normalized)
      )
    })

    return [...filtered].sort((a, b) => {
      const aTasks = tasks.filter((task) => task.projectId === a.id)
      const bTasks = tasks.filter((task) => task.projectId === b.id)
      switch (sort) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'tasks':
          return bTasks.length - aTasks.length
        case 'updated':
          const aLast = aTasks.length
            ? aTasks.reduce((max, task) => (task.updatedAt > max ? task.updatedAt : max), '')
            : ''
          const bLast = bTasks.length
            ? bTasks.reduce((max, task) => (task.updatedAt > max ? task.updatedAt : max), '')
            : ''
          return bLast.localeCompare(aLast)
        case 'progress':
        default:
          return projectProgress(bTasks, b.id) - projectProgress(aTasks, a.id)
      }
    })
  }, [projects, tasks, query, statusFilter, sort])

  const totals = useMemo(() => {
    const active = projects.filter((project) => project.status === 'active').length
    const allTasks = tasks.length
    const doneTasks = tasks.filter((task) => task.status === 'done').length
    return {
      active,
      allTasks,
      doneTasks,
      rate: allTasks ? Math.round((doneTasks / allTasks) * 100) : 0,
    }
  }, [projects, tasks])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Projects"
        description={`${projects.length} projects · ${totals.active} active`}
        actions={
          <Button
            variant="primary"
            icon={<Plus size={15} />}
            onClick={() => setProjectModalOpen(true)}
          >
            New project
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Active projects', value: totals.active, icon: <FolderKanban size={15} /> },
          { label: 'Total tasks', value: totals.allTasks, icon: <LayoutGrid size={15} /> },
          { label: 'Completed tasks', value: totals.doneTasks, icon: <BarChart3 size={15} /> },
          { label: 'Overall rate', value: `${totals.rate}%`, icon: <Rocket size={15} /> },
        ].map((stat) => (
          <div key={stat.label} className="card flex items-center gap-3 p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/[0.08] text-accent">
              {stat.icon}
            </span>
            <div>
              <p className="text-[18px] font-extrabold leading-none tracking-[-0.02em] text-ink">
                {stat.value}
              </p>
              <p className="mt-1 text-[10.5px] font-medium text-muted">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-[260px]">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted/70" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects…"
            aria-label="Search projects"
            className="input h-9 pl-9 text-[12px]"
          />
        </div>

        <div className="inline-flex items-center gap-0.5 rounded-xl border border-line bg-raised p-0.5">
          {(['all', 'active', 'paused', 'completed'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={cn(
                'h-8 rounded-[9px] px-3 text-[11px] font-semibold capitalize transition-all',
                statusFilter === value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
              )}
            >
              {value}
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
              <MenuLabel>Sort projects</MenuLabel>
              {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                <MenuItem
                  key={key}
                  active={sort === key}
                  icon={sort === key ? <BarChart3 size={13} /> : <span className="h-3 w-3" />}
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
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<FolderKanban size={20} />}
            title="No projects match"
            description={
              query
                ? `Nothing found for “${query}”. Try a different search.`
                : 'Create your first project to start organizing work.'
            }
            action={
              <Button
                size="sm"
                variant="primary"
                icon={<Plus size={13} />}
                onClick={() => setProjectModalOpen(true)}
              >
                Create project
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {visible.map((project, index) => (
              <ProjectCard key={project.id} project={project} index={index} />
            ))}
          </AnimatePresence>
        </div>
      )}

    </div>
  )
}
