import type {
  Activity,
  CreateTaskInput,
  Project,
  Task,
  UpdateTaskInput,
  User,
  Workspace,
} from '../types'
import * as client from './client'

/**
 * Adapter between the ASP.NET Core API (numeric ids, PascalCase-free JSON)
 * and the frontend domain types (string ids). Every mutation funnels through
 * here so response handling stays consistent.
 */

export function mapProject(p: any): Project {
  return {
    id: p.id.toString(),
    name: p.name,
    description: p.description ?? '',
    color: p.color || '#6D5EF8',
    icon: p.icon || 'rocket',
    status: p.status || 'active',
    dueDate: p.dueDate ?? null,
    memberIds: (p.memberIds || []).map((id: any) => id.toString()),
    createdAt: p.createdAt,
  }
}

export function mapTask(t: any): Task {
  return {
    id: t.id.toString(),
    title: t.title,
    description: t.description ?? '',
    status: t.status,
    priority: t.priority,
    projectId: t.projectId.toString(),
    assigneeId: t.assigneeId != null ? t.assigneeId.toString() : null,
    labels: t.labels || [],
    dueDate: t.dueDate ?? null,
    subtasks: (t.subtasks || []).map((s: any) => ({
      id: s.id.toString(),
      title: s.title,
      done: !!s.done,
    })),
    comments: (t.comments || []).map((c: any) => ({
      id: c.id.toString(),
      authorId: c.authorId.toString(),
      body: c.body,
      createdAt: c.createdAt,
    })),
    order: t.order ?? 0,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }
}

export function mapUser(m: any): User {
  return {
    id: m.id.toString(),
    name: m.name,
    email: m.email,
    role: m.role || 'member',
    avatarColors: ['#6D5EF8', '#8B5CF6'],
  }
}

export function mapActivity(a: any): Activity {
  return {
    id: a.id.toString(),
    actorId: a.actorId.toString(),
    action: a.action,
    target: a.target,
    createdAt: a.createdAt,
    kind: a.kind as Activity['kind'],
  }
}

export function mapWorkspace(data: any): Workspace {
  return {
    projects: (data?.projects || []).map(mapProject),
    tasks: (data?.tasks || []).map(mapTask),
    members: (data?.members || []).map(mapUser),
    activities: (data?.activities || []).map(mapActivity),
    currentUserId: data?.currentUserId ? data.currentUserId.toString() : '',
  }
}

export async function fetchWorkspace(): Promise<Workspace> {
  return mapWorkspace(await client.fetchWorkspace())
}

function mapSubtasks(input: CreateTaskInput) {
  return (input.subtasks || []).map((s) => ({ title: s.title, done: !!s.done }))
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const created = await client.createTask({
    title: input.title,
    description: input.description || '',
    status: input.status || 'backlog',
    priority: input.priority || 'medium',
    projectId: parseInt(input.projectId, 10),
    assigneeId: input.assigneeId ? parseInt(input.assigneeId, 10) : null,
    dueDate: input.dueDate || null,
    labels: input.labels || [],
    subtasks: mapSubtasks(input),
  })
  return mapTask(created)
}

export async function updateTask(id: string, patch: UpdateTaskInput): Promise<Task> {
  const body: Record<string, any> = {}

  if (patch.title !== undefined) body.title = patch.title
  if (patch.description !== undefined) body.description = patch.description
  if (patch.status !== undefined) body.status = patch.status
  if (patch.priority !== undefined) body.priority = patch.priority
  if (patch.projectId !== undefined) body.projectId = parseInt(patch.projectId, 10)
  if (patch.assigneeId !== undefined)
    body.assigneeId = patch.assigneeId ? parseInt(patch.assigneeId, 10) : null
  if (patch.dueDate !== undefined) body.dueDate = patch.dueDate
  if (patch.labels !== undefined) body.labels = patch.labels
  if (patch.order !== undefined) body.order = patch.order
  if (patch.subtasks !== undefined)
    body.subtasks = patch.subtasks.map((s) => {
      // Subtasks without a numeric id (newly added in the panel) are created
      // server-side; numeric ids target existing rows for update/delete.
      const numericId = s.id ? parseInt(s.id, 10) : NaN
      return Number.isNaN(numericId)
        ? { title: s.title, done: !!s.done }
        : { id: numericId, title: s.title, done: !!s.done }
    })

  const updated = await client.updateTask(parseInt(id, 10), body)
  return mapTask(updated)
}

export async function deleteTask(id: string): Promise<void> {
  await client.deleteTask(parseInt(id, 10))
}

export interface CreateProjectInput {
  name: string
  description: string
  color: string
  icon: string
  dueDate: string | null
  status?: string
  memberIds?: string[]
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const created = await client.createProject({
    name: input.name,
    description: input.description,
    color: input.color,
    icon: input.icon,
    dueDate: input.dueDate,
    status: input.status || 'active',
    memberIds: (input.memberIds || []).map((id) => parseInt(id, 10)),
  })
  return mapProject(created)
}

export async function updateProjectStatus(id: string, status: string): Promise<Project> {
  const updated = await client.setProjectStatus(parseInt(id, 10), status)
  return mapProject(updated)
}

export async function updateProfile(patch: {
  name?: string
  email?: string
  role?: string
}): Promise<User> {
  const updated = await client.authApi.updateProfile(patch)
  return mapUser(updated)
}

export async function moveTask(id: string, status: string, index: number): Promise<Task[]> {
  const column = await client.moveTask(parseInt(id, 10), status, index)
  return (column || []).map(mapTask)
}

export async function toggleSubtask(taskId: string, subtaskId: string): Promise<Task> {
  const updated = await client.toggleSubtask(parseInt(taskId, 10), parseInt(subtaskId, 10))
  return mapTask(updated)
}

export async function addComment(taskId: string, body: string): Promise<any> {
  return client.addComment(parseInt(taskId, 10), body)
}

export async function fetchActivities(page = 1, pageSize = 50): Promise<Activity[]> {
  const data = await client.fetchActivities(page, pageSize)
  return (data?.items || data || []).map(mapActivity)
}

export async function resetWorkspace(): Promise<void> {
  await client.resetWorkspace()
}
