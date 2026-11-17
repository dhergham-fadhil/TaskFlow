import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  isThisYear,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
  startOfDay,
} from 'date-fns'
import {
  PRIORITY_META,
  STATUS_ORDER,
  type Task,
  type TaskFilters,
  type TaskPriority,
  type TaskStatus,
} from '../types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function addDaysISO(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return format(date, 'yyyy-MM-dd')
}

export function formatDate(value: string | null | undefined, pattern = 'MMM d'): string {
  if (!value) return '—'
  const date = parseISO(value)
  if (Number.isNaN(date.getTime())) return '—'
  if (pattern === 'MMM d' && !isThisYear(date)) return format(date, 'MMM d, yyyy')
  return format(date, pattern)
}

export function relativeTime(value: string): string {
  const date = parseISO(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${formatDistanceToNowStrict(date)} ago`
}

export function dueMeta(value: string | null): {
  label: string
  tone: 'overdue' | 'today' | 'soon' | 'normal' | 'none'
  days: number | null
} {
  if (!value) return { label: 'No date', tone: 'none', days: null }
  const date = parseISO(value)
  if (Number.isNaN(date.getTime())) return { label: 'No date', tone: 'none', days: null }

  if (isToday(date)) return { label: 'Today', tone: 'today', days: 0 }
  if (isTomorrow(date)) return { label: 'Tomorrow', tone: 'soon', days: 1 }
  if (isYesterday(date)) return { label: 'Yesterday', tone: 'overdue', days: -1 }

  const days = differenceInCalendarDays(date, startOfDay(new Date()))
  if (days < 0) return { label: formatDate(value, 'MMM d'), tone: 'overdue', days }
  if (days <= 3) return { label: formatDate(value, 'MMM d'), tone: 'soon', days }
  return { label: formatDate(value), tone: 'normal', days }
}

export function isTaskOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') return false
  const due = parseISO(task.dueDate)
  return differenceInCalendarDays(due, startOfDay(new Date())) < 0
}

export function sortTasks(tasks: Task[], sort: TaskFilters['sort']): Task[] {
  const copy = [...tasks]
  switch (sort) {
    case 'due':
      return copy.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return a.order - b.order
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return a.dueDate.localeCompare(b.dueDate)
      })
    case 'priority':
      return copy.sort(
        (a, b) => PRIORITY_META[b.priority].rank - PRIORITY_META[a.priority].rank,
      )
    case 'title':
      return copy.sort((a, b) => a.title.localeCompare(b.title))
    case 'updated':
    default:
      return copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }
}

export function filterTasks(
  tasks: Task[],
  filters: TaskFilters,
  extra?: { projectId?: string; memberId?: string },
): Task[] {
  const query = filters.query.trim().toLowerCase()

  const filtered = tasks.filter((task) => {
    if (extra?.projectId && task.projectId !== extra.projectId) return false
    if (extra?.memberId && task.assigneeId !== extra.memberId) return false
    if (filters.statuses.length && !filters.statuses.includes(task.status)) return false
    if (filters.priorities.length && !filters.priorities.includes(task.priority)) return false
    if (filters.projectIds.length && !filters.projectIds.includes(task.projectId)) return false
    if (filters.assigneeIds.length && !filters.assigneeIds.includes(task.assigneeId ?? ''))
      return false
    if (!query) return true
    return (
      task.title.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query) ||
      task.labels.some((label) => label.toLowerCase().includes(query))
    )
  })

  return sortTasks(filtered, filters.sort)
}

export function countActiveFilters(filters: TaskFilters): number {
  return (
    filters.statuses.length +
    filters.priorities.length +
    filters.projectIds.length +
    filters.assigneeIds.length +
    (filters.query.trim() ? 1 : 0)
  )
}

export function tasksByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const groups = Object.fromEntries(STATUS_ORDER.map((status) => [status, [] as Task[]])) as Record<
    TaskStatus,
    Task[]
  >
  for (const task of tasks) {
    groups[task.status]?.push(task)
  }
  for (const status of STATUS_ORDER) {
    groups[status].sort((a, b) => a.order - b.order)
  }
  return groups
}

export function progressOf(task: Task): number {
  if (!task.subtasks.length) return task.status === 'done' ? 100 : 0
  return Math.round((task.subtasks.filter((s) => s.done).length / task.subtasks.length) * 100)
}

export function projectProgress(tasks: Task[], projectId: string): number {
  const scoped = tasks.filter((task) => task.projectId === projectId)
  if (!scoped.length) return 0
  const done = scoped.filter((task) => task.status === 'done').length
  return Math.round((done / scoped.length) * 100)
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function priorityOrder(priority: TaskPriority): number {
  return PRIORITY_META[priority].rank
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

export function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
