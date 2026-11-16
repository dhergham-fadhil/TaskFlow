import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListPlus,
  Plus,
} from 'lucide-react'
import {
  addDays,
  addMonths,
  format,
  isSameMonth,
  isToday as dateFnsIsToday,
  startOfMonth,
  startOfWeek,
  endOfMonth,
  endOfWeek,
} from 'date-fns'
import { cn, dueMeta } from '../lib/utils'
import type { Task } from '../types'
import { useWorkspace } from '../context/WorkspaceProvider'
import { useUI } from '../context/UIProvider'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { PriorityBadge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function CalendarPage() {
  const { tasks, projects, members } = useWorkspace()
  const { openTask, createTask } = useUI()
  const [cursor, setCursor] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const monthStart = startOfMonth(cursor)
  const monthEnd = endOfMonth(cursor)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = useMemo(() => {
    const result: Date[] = []
    let day = gridStart
    while (day <= gridEnd) {
      result.push(day)
      day = addDays(day, 1)
    }
    return result
  }, [gridStart, gridEnd])

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const task of tasks) {
      if (!task.dueDate) continue
      const key = task.dueDate
      const list = map.get(key) ?? []
      list.push(task)
      map.set(key, list)
    }
    return map
  }, [tasks])

  const selectedTasks = useMemo(() => {
    if (!selectedDate) return []
    const key = format(selectedDate, 'yyyy-MM-dd')
    return tasksByDay.get(key) ?? []
  }, [selectedDate, tasksByDay])

  const selectedKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''

  return (
    <div className="space-y-5">
      <PageHeader
        title="Calendar"
        description="Deadlines at a glance. Click a day to focus on it."
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => createTask()}>
            New task
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="card overflow-hidden"
        >
          <header className="flex items-center justify-between border-b border-line/80 px-5 py-4">
            <h2 className="text-[17px] font-extrabold tracking-[-0.02em] text-ink">
              {format(cursor, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCursor((date) => addMonths(date, -1))}
                className="icon-btn h-8 w-8"
                aria-label="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setCursor(new Date())}
                className={cn(
                  'h-8 rounded-lg px-3 text-[11.5px] font-semibold transition',
                  dateFnsIsToday(cursor)
                    ? 'bg-accent/10 text-accent'
                    : 'text-muted hover:bg-raised hover:text-ink',
                )}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setCursor((date) => addMonths(date, 1))}
                className="icon-btn h-8 w-8"
                aria-label="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </header>

          <div className="grid grid-cols-7 border-b border-line/80">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="py-2.5 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-muted/70"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd')
              const dayTasks = tasksByDay.get(key) ?? []
              const inMonth = isSameMonth(day, cursor)
              const isSelected = selectedKey === key
              const today = dateFnsIsToday(day)

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(isSelected ? null : day)}
                  className={cn(
                    'group relative flex min-h-[96px] flex-col items-stretch gap-1 border-b border-r border-line/50 p-1.5 text-left transition last:border-r-0 sm:min-h-[110px]',
                    !inMonth && 'bg-raised/30',
                    isSelected && 'bg-accent/[0.07]',
                    'hover:bg-raised/50',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-[10.5px] font-bold',
                      today
                        ? 'bg-accent text-accent-ink shadow-[0_4px_10px_-3px_rgb(var(--accent)/0.6)]'
                        : inMonth
                          ? 'text-ink'
                          : 'text-muted/50',
                      isSelected && !today && 'bg-accent/15 text-accent',
                    )}
                  >
                    {format(day, 'd')}
                  </span>

                  <div className="flex flex-col gap-0.5">
                    {dayTasks.slice(0, 2).map((task) => {
                      const project = projects.find((item) => item.id === task.projectId)
                      return (
                        <span
                          key={task.id}
                          onClick={(event) => {
                            event.stopPropagation()
                            openTask(task.id)
                          }}
                          className={cn(
                            'truncate rounded-md px-1.5 py-0.5 text-left text-[9.5px] font-semibold transition group-hover:opacity-100',
                            task.status === 'done'
                              ? 'bg-emerald-500/10 text-emerald-600 line-through opacity-70 dark:text-emerald-400'
                              : 'text-white',
                          )}
                          style={
                            task.status !== 'done'
                              ? {
                                  background: `linear-gradient(120deg, ${project?.color ?? '#6D5EF8'}E6, ${project?.color ?? '#6D5EF8'}B8)`,
                                }
                              : undefined
                          }
                        >
                          {task.title}
                        </span>
                      )
                    })}
                    {dayTasks.length > 2 && (
                      <span className="pl-0.5 text-[9px] font-semibold text-muted">
                        +{dayTasks.length - 2} more
                      </span>
                    )}
                  </div>

                  {dayTasks.length > 0 && (
                    <span className="absolute bottom-1.5 right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-raised px-1 font-mono text-[8px] font-bold text-muted ring-1 ring-line">
                      {dayTasks.length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </motion.section>

        <motion.aside
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="card flex max-h-[640px] flex-col overflow-hidden"
        >
          <header className="border-b border-line/80 px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              Day detail
            </p>
            <h3 className="mt-0.5 text-[15px] font-extrabold tracking-[-0.015em] text-ink">
              {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a day'}
            </h3>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {!selectedDate ? (
              <EmptyState
                icon={<CalendarDays size={20} />}
                title="Pick a date"
                description="Click any day in the calendar to see everything due on it."
                compact
              />
            ) : selectedTasks.length === 0 ? (
              <EmptyState
                icon={<Clock3 size={20} />}
                title="Nothing due this day"
                description="Enjoy the breathing room, or schedule something useful."
                compact
                action={
                  <Button
                    size="sm"
                    variant="soft"
                    icon={<ListPlus size={13} />}
                    onClick={() => createTask()}
                  >
                    Add a task
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-line/60">
                {selectedTasks.map((task) => {
                  const project = projects.find((item) => item.id === task.projectId)
                  const assignee = members.find((member) => member.id === task.assigneeId)
                  const due = dueMeta(task.dueDate)
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => openTask(task.id)}
                      className="group flex w-full items-start gap-2.5 px-4 py-3 text-left transition hover:bg-raised/60"
                    >
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: project?.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'text-[12px] font-semibold leading-snug transition group-hover:text-accent',
                            task.status === 'done' && 'text-muted line-through',
                          )}
                        >
                          {task.title}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          {project && (
                            <span className="text-[10px] text-muted">{project.name}</span>
                          )}
                          <span
                            className={cn(
                              'text-[10px] font-semibold',
                              due.tone === 'overdue' ? 'text-rose-500' : 'text-muted',
                            )}
                          >
                            {due.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <PriorityBadge priority={task.priority} withLabel={false} />
                        <Avatar user={assignee} size="xs" />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {selectedTasks.length > 0 && (
            <footer className="border-t border-line bg-raised/40 px-5 py-3">
              <p className="text-[10.5px] font-medium text-muted">
                {selectedTasks.length} task{selectedTasks.length === 1 ? '' : 's'} due{' '}
                {format(selectedDate!, 'EEEE, MMMM d')}
              </p>
            </footer>
          )}
        </motion.aside>
      </div>
    </div>
  )
}
