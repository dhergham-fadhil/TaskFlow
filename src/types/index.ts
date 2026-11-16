/**
 * TaskFlow domain types.
 *
 * These are intentionally shaped like the DTOs (Data Transfer Objects) that the
 * ASP.NET Core API will return. When we swap the mock API for the real one,
 * these types should barely change.
 */

export type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'done'

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export type ProjectStatus = 'active' | 'paused' | 'completed'

export type AccentKey = 'violet' | 'blue' | 'emerald' | 'amber' | 'rose' | 'cyan'

export interface User {
  id: string
  name: string
  email: string
  role: string
  /** Two-colour gradient used to render the initials avatar */
  avatarColors: [string, string]
}

export interface SubTask {
  id: string
  title: string
  done: boolean
}

export interface Comment {
  id: string
  authorId: string
  body: string
  createdAt: string
}

export interface Project {
  id: string
  name: string
  description: string
  /** Hex colour used for the project dot and accents */
  color: string
  icon: 'rocket' | 'palette' | 'code' | 'chart' | 'phone' | 'book'
  status: ProjectStatus
  dueDate: string | null
  memberIds: string[]
  createdAt: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  projectId: string
  assigneeId: string | null
  labels: string[]
  dueDate: string | null
  subtasks: SubTask[]
  comments: Comment[]
  /** Position within its Kanban column (ascending) */
  order: number
  createdAt: string
  updatedAt: string
}

export interface Activity {
  id: string
  actorId: string
  /** e.g. "completed", "created", "commented on" */
  action: string
  target: string
  createdAt: string
  kind: 'complete' | 'create' | 'comment' | 'move' | 'project' | 'update'
}

export interface Workspace {
  tasks: Task[]
  projects: Project[]
  members: User[]
  activities: Activity[]
  currentUserId: string
  /** Whether demo-mode reset is enabled on the server (Development only). */
  demoEnabled: boolean
}

/** Payload accepted by POST /api/tasks */
export type CreateTaskInput = {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  projectId: string
  assigneeId?: string | null
  labels?: string[]
  dueDate?: string | null
  subtasks?: SubTask[]
}

/** Payload accepted by PUT/PATCH /api/tasks/{id} */
export type UpdateTaskInput = Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>

export interface TaskFilters {
  query: string
  statuses: TaskStatus[]
  priorities: TaskPriority[]
  projectIds: string[]
  assigneeIds: string[]
  sort: 'updated' | 'due' | 'priority' | 'title'
}

export const STATUS_META: Record<
  TaskStatus,
  { label: string; short: string; dot: string; tint: string; text: string }
> = {
  backlog: {
    label: 'Backlog',
    short: 'Backlog',
    dot: 'bg-slate-400',
    tint: 'bg-slate-400/10',
    text: 'text-slate-500 dark:text-slate-400',
  },
  in_progress: {
    label: 'In progress',
    short: 'Active',
    dot: 'bg-blue-500',
    tint: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
  },
  review: {
    label: 'In review',
    short: 'Review',
    dot: 'bg-amber-500',
    tint: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
  },
  done: {
    label: 'Done',
    short: 'Done',
    dot: 'bg-emerald-500',
    tint: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
}

export const PRIORITY_META: Record<
  TaskPriority,
  { label: string; rank: number; dot: string; tint: string; text: string; bar: string }
> = {
  low: {
    label: 'Low',
    rank: 0,
    dot: 'bg-sky-400',
    tint: 'bg-sky-400/10',
    text: 'text-sky-600 dark:text-sky-400',
    bar: 'bg-sky-400',
  },
  medium: {
    label: 'Medium',
    rank: 1,
    dot: 'bg-amber-400',
    tint: 'bg-amber-400/10',
    text: 'text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-400',
  },
  high: {
    label: 'High',
    rank: 2,
    dot: 'bg-orange-500',
    tint: 'bg-orange-500/10',
    text: 'text-orange-600 dark:text-orange-400',
    bar: 'bg-orange-500',
  },
  urgent: {
    label: 'Urgent',
    rank: 3,
    dot: 'bg-rose-500',
    tint: 'bg-rose-500/10',
    text: 'text-rose-600 dark:text-rose-400',
    bar: 'bg-rose-500',
  },
}

export const STATUS_ORDER: TaskStatus[] = ['backlog', 'in_progress', 'review', 'done']

export const ACCENTS: Record<AccentKey, { label: string; value: string; rgb: string }> = {
  violet: { label: 'Violet', value: '#6D5EF8', rgb: '109 94 248' },
  blue: { label: 'Blue', value: '#2563EB', rgb: '37 99 235' },
  emerald: { label: 'Emerald', value: '#059669', rgb: '5 150 105' },
  amber: { label: 'Amber', value: '#C2740A', rgb: '194 116 10' },
  rose: { label: 'Rose', value: '#E11D48', rgb: '225 29 72' },
  cyan: { label: 'Cyan', value: '#0891B2', rgb: '8 145 178' },
}
