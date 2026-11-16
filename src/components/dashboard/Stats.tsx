import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  CircleCheckBig,
  Flame,
  ListTodo,
} from 'lucide-react'
import { cn, pluralize } from '../../lib/utils'
import type { Task, TaskStatus } from '../../types'

const STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: '#94A3B8',
  in_progress: '#3B82F6',
  review: '#F59E0B',
  done: '#10B981',
}

export function CompletionChart({ tasks }: { tasks: Task[] }) {
  const data = useMemo(() => {
    const days: Array<{ label: string; completed: number; created: number }> = []
    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date()
      date.setDate(date.getDate() - offset)
      const key = date.toISOString().slice(0, 10)
      days.push({
        label: date.toLocaleDateString('en-US', { weekday: 'narrow' }),
        completed: tasks.filter((task) => task.updatedAt.slice(0, 10) === key && task.status === 'done').length,
        created: tasks.filter((task) => task.createdAt.slice(0, 10) === key).length,
      })
    }
    return days
  }, [tasks])

  const max = Math.max(3, ...data.map((day) => Math.max(day.completed, day.created)))

  return (
    <div className="flex h-44 items-end gap-2 px-1">
      {data.map((day, index) => (
        <div key={index} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex h-32 w-full items-end justify-center gap-1">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(day.created / max) * 100}%` }}
              transition={{ delay: index * 0.05, type: 'spring', stiffness: 200, damping: 24 }}
              className="w-2.5 rounded-t-[4px] bg-muted/20"
              title={`${day.created} created`}
            />
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(day.completed / max) * 100}%` }}
              transition={{ delay: index * 0.05 + 0.04, type: 'spring', stiffness: 200, damping: 24 }}
              className="w-2.5 rounded-t-[4px] bg-gradient-to-t from-accent to-accent/60"
              title={`${day.completed} completed`}
            />
          </div>
          <span className="text-[9px] font-semibold uppercase text-muted/60">{day.label}</span>
        </div>
      ))}
    </div>
  )
}

export function StatusDistribution({ tasks }: { tasks: Task[] }) {
  const total = Math.max(
    1,
    tasks.length,
  )
  const segments = (['backlog', 'in_progress', 'review', 'done'] as TaskStatus[]).map((status) => ({
    status,
    count: tasks.filter((task) => task.status === status).length,
  }))

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {segments.map((segment) => (
          <motion.div
            key={segment.status}
            initial={{ width: 0 }}
            animate={{ width: `${(segment.count / total) * 100}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 22, delay: 0.15 }}
            className="h-full"
            style={{ backgroundColor: STATUS_COLORS[segment.status] }}
            title={segment.status}
          />
        ))}
      </div>
      <div className="mt-3.5 space-y-2">
        {segments.map((segment) => (
          <div key={segment.status} className="flex items-center gap-2 text-[11px]">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[segment.status] }}
            />
            <span className="capitalize text-muted">
              {segment.status.replace('_', ' ')}
            </span>
            <span className="ml-auto font-mono font-semibold text-ink">{segment.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function StatCard({
  icon,
  label,
  value,
  trend,
  trendUp,
  delay = 0,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  trend?: string
  trendUp?: boolean
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 26 }}
      className="card group relative overflow-hidden p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-accent/[0.05] blur-xl transition-opacity duration-300 group-hover:opacity-100" />
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/[0.08] text-accent">
          {icon}
        </div>
        {trend && (
          <span
            className={cn(
              'flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold',
              trendUp
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'bg-rose-500/10 text-rose-500',
            )}
          >
            {trendUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {trend}
          </span>
        )}
      </div>
      <p className="mt-3 text-[26px] font-extrabold leading-none tracking-[-0.04em] text-ink">
        {value}
      </p>
      <p className="mt-1.5 text-[11px] font-medium text-muted">{label}</p>
    </motion.div>
  )
}

export function dashboardStats(tasks: Task[], dueToday: Task[]) {
  const active = tasks.filter((task) => task.status !== 'done')
  const completedThisWeek = tasks.filter(
    (task) =>
      task.status === 'done' &&
      (Date.now() - new Date(task.updatedAt).getTime()) / 86_400_000 <= 7,
  ).length
  const overdue = tasks.filter((task) => {
    if (!task.dueDate || task.status === 'done') return false
    return new Date(task.dueDate) < new Date(new Date().toDateString())
  })
  const completionRate = tasks.length
    ? Math.round((tasks.filter((task) => task.status === 'done').length / tasks.length) * 100)
    : 0

  return {
    active,
    completedThisWeek,
    overdue,
    dueToday,
    completionRate,
  }
}

export const statCards = (stats: ReturnType<typeof dashboardStats>) => [
  {
    icon: <ListTodo size={17} />,
    label: 'Active tasks',
    value: stats.active.length,
    trend: `${pluralize(stats.dueToday.length, 'task')} due today`,
    trendUp: true,
  },
  {
    icon: <CircleCheckBig size={17} />,
    label: 'Completed this week',
    value: stats.completedThisWeek,
    trend: '+12% vs last week',
    trendUp: true,
  },
  {
    icon: <CalendarClock size={17} />,
    label: 'Overdue',
    value: stats.overdue.length,
    trend: stats.overdue.length ? 'Needs attention' : 'All clear',
    trendUp: stats.overdue.length === 0,
  },
  {
    icon: <Flame size={17} />,
    label: 'Completion rate',
    value: `${stats.completionRate}%`,
    trend: 'This month',
    trendUp: true,
  },
]
