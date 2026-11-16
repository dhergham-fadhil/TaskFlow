import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarClock,
  CircleCheckBig,
  Flame,
  MessageSquare,
  Plus,
} from 'lucide-react'
import { cn, dueMeta, greeting, pluralize, relativeTime, sortTasks } from '../lib/utils'
import { useWorkspace } from '../context/WorkspaceProvider'
import { useUI } from '../context/UIProvider'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { PriorityBadge, StatusBadge } from '../components/ui/Badge'
import { ProjectIcon } from '../components/projects/ProjectIcon'
import { ProgressBar } from '../components/ui/Progress'
import { CompletionChart, StatusDistribution, StatCard, dashboardStats, statCards } from '../components/dashboard/Stats'

export function OverviewPage() {
  const { tasks, projects, members, activities, currentUser } = useWorkspace()
  const { openTask, createTask } = useUI()
  const navigate = useNavigate()

  const dueToday = tasks.filter(
    (task) => task.dueDate && dueMeta(task.dueDate).tone === 'today' && task.status !== 'done',
  )
  const stats = dashboardStats(tasks, dueToday)
  const cards = statCards(stats)

  const recentActivity = activities.slice(0, 5)
  const topPriority = sortTasks(
    tasks.filter((task) => task.status !== 'done'),
    'priority',
  ).slice(0, 3)

  const projectRows = projects
    .map((project) => {
      const scoped = tasks.filter((task) => task.projectId === project.id)
      const done = scoped.filter((task) => task.status === 'done').length
      return {
        project,
        total: scoped.length,
        done,
        progress: scoped.length ? Math.round((done / scoped.length) * 100) : 0,
      }
    })
    .sort((a, b) => b.progress - a.progress)

  return (
    <div className="space-y-6">
      {/* Hero greeting */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            {greeting()}
          </p>
          <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.035em] text-ink sm:text-[30px]">
            {currentUser?.name.split(' ')[0] ?? 'Welcome back'},{' '}
            <span className="text-gradient">let's build.</span>
          </h1>
          <p className="mt-1.5 text-[13px] text-muted">
            You have {pluralize(stats.active.length, 'open task')}
            {stats.dueToday.length > 0 && (
              <>
                {' '}and <span className="font-semibold text-amber-500">{pluralize(stats.dueToday.length, 'task')} due today</span>
              </>
            )}
            .
          </p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => createTask()}>
          New task
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((card, index) => (
          <StatCard
            key={card.label}
            icon={card.icon}
            label={card.label}
            value={card.value}
            trend={card.trend}
            trendUp={card.trendUp}
            delay={index * 0.05}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Focus list */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="card xl:col-span-2"
        >
          <header className="flex items-center justify-between border-b border-line/80 px-5 py-4">
            <div>
              <h2 className="text-[13.5px] font-bold tracking-[-0.01em] text-ink">
                Needs your attention
              </h2>
              <p className="mt-0.5 text-[11px] text-muted">
                Highest-priority open work across all projects
              </p>
            </div>
            <Link
              to="/tasks"
              className="flex items-center gap-1 text-[11px] font-semibold text-accent transition hover:gap-1.5"
            >
              View all <ArrowRight size={12} />
            </Link>
          </header>
          <div className="divide-y divide-line/60">
            {topPriority.map((task) => {
              const project = projects.find((item) => item.id === task.projectId)
              const assignee = members.find((member) => member.id === task.assigneeId)
              const due = dueMeta(task.dueDate)
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => openTask(task.id)}
                  className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-raised/60"
                >
                  <PriorityBadge priority={task.priority} withLabel={false} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink transition group-hover:text-accent">
                      {task.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[10.5px] text-muted">
                      {project && (
                        <span className="flex items-center gap-1">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: project.color }}
                          />
                          {project.name}
                        </span>
                      )}
                      {due.tone !== 'none' && (
                        <span
                          className={cn(
                            'flex items-center gap-1',
                            due.tone === 'overdue' && 'font-semibold text-rose-500',
                            due.tone === 'today' && 'font-semibold text-amber-500',
                          )}
                        >
                          <CalendarClock size={10} />
                          {due.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={task.status} />
                  <Avatar user={assignee} size="sm" />
                </button>
              )
            })}
          </div>
        </motion.section>

        {/* Distribution */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.4 }}
          className="card p-5"
        >
          <h2 className="mb-1 text-[13.5px] font-bold tracking-[-0.01em] text-ink">
            Workflow health
          </h2>
          <p className="mb-4 text-[11px] text-muted">Where work sits right now</p>
          <StatusDistribution tasks={tasks} />
        </motion.section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Activity */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="card"
        >
          <header className="flex items-center justify-between border-b border-line/80 px-5 py-4">
            <div>
              <h2 className="text-[13.5px] font-bold tracking-[-0.01em] text-ink">Recent activity</h2>
              <p className="mt-0.5 text-[11px] text-muted">What the team shipped lately</p>
            </div>
          </header>
          <div className="divide-y divide-line/60">
            {recentActivity.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-[12px] font-semibold text-ink">No activity yet</p>
                <p className="mx-auto mt-1 max-w-[260px] text-[11px] leading-relaxed text-muted">
                  Create a task, post a comment, or move work between columns and the
                  latest updates will show up here.
                </p>
              </div>
            ) : (
              recentActivity.map((activity) => {
                const actor = members.find((member) => member.id === activity.actorId)
                return (
                  <div key={activity.id} className="flex items-start gap-3 px-5 py-3.5">
                    <Avatar user={actor} size="sm" className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] leading-snug text-muted">
                        <span className="font-semibold text-ink">{actor?.name ?? 'Someone'}</span>{' '}
                        {activity.action}{' '}
                        <span className="font-medium text-ink">“{activity.target}”</span>
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted/60">
                        {relativeTime(activity.createdAt)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md',
                        activity.kind === 'complete' && 'bg-emerald-500/10 text-emerald-500',
                        activity.kind === 'create' && 'bg-accent/10 text-accent',
                        activity.kind === 'comment' && 'bg-amber-500/10 text-amber-500',
                        activity.kind === 'move' && 'bg-blue-500/10 text-blue-500',
                        activity.kind === 'project' && 'bg-muted/10 text-muted',
                      )}
                    >
                      {activity.kind === 'complete' ? (
                        <CircleCheckBig size={11} />
                      ) : activity.kind === 'comment' ? (
                        <MessageSquare size={10} />
                      ) : (
                        <Flame size={10} />
                      )}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </motion.section>

        {/* Completion chart */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, duration: 0.4 }}
          className="card p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-[13.5px] font-bold tracking-[-0.01em] text-ink">Throughput</h2>
              <p className="mt-0.5 text-[11px] text-muted">Created vs completed, last 7 days</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-medium text-muted">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-sm bg-muted/30" /> Created
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-sm bg-accent" /> Completed
              </span>
            </div>
          </div>
          <CompletionChart tasks={tasks} />
        </motion.section>

        {/* Project progress */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.4 }}
          className="card"
        >
          <header className="flex items-center justify-between border-b border-line/80 px-5 py-4">
            <div>
              <h2 className="text-[13.5px] font-bold tracking-[-0.01em] text-ink">Projects</h2>
              <p className="mt-0.5 text-[11px] text-muted">Completion by project</p>
            </div>
            <Link
              to="/projects"
              className="flex items-center gap-1 text-[11px] font-semibold text-accent transition hover:gap-1.5"
            >
              All <ArrowRight size={12} />
            </Link>
          </header>
          <div className="divide-y divide-line/60">
            {projectRows.slice(0, 4).map(({ project, total, done, progress }) => (
              <button
                key={project.id}
                type="button"
                onClick={() => navigate(`/projects/${project.id}`)}
                className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-raised/60"
              >
                <ProjectIcon project={project} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[12.5px] font-semibold text-ink transition group-hover:text-accent">
                      {project.name}
                    </p>
                    <span className="font-mono text-[10px] text-muted">{progress}%</span>
                  </div>
                  <ProgressBar value={progress} color={project.color} className="mt-1.5" height={4} />
                </div>
                <span className="shrink-0 text-[10px] text-muted">
                  {done}/{total}
                </span>
              </button>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  )
}
