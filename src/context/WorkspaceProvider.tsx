import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  Activity,
  CreateTaskInput,
  Project,
  Task,
  TaskStatus,
  UpdateTaskInput,
  User,
  Workspace,
} from '../types'
import * as api from '../api/mockApi'
import { useAuth } from './AuthProvider'

interface WorkspaceContextValue {
  workspace: Workspace | null
  tasks: Task[]
  projects: Project[]
  members: User[]
  activities: Activity[]
  currentUser: User | null
  currentUserId: string
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  createTask: (input: CreateTaskInput) => Promise<Task>
  updateTask: (id: string, patch: UpdateTaskInput) => Promise<Task>
  deleteTask: (id: string) => Promise<void>
  moveTask: (id: string, status: TaskStatus, index: number) => Promise<void>
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>
  addComment: (taskId: string, body: string) => Promise<void>
  createProject: (input: api.CreateProjectInput) => Promise<Project>
  updateProjectStatus: (id: string, status: Project['status']) => Promise<Project>
  updateProfile: (patch: { name?: string; email?: string; role?: string }) => Promise<User>
  refreshActivities: () => Promise<void>
  resetWorkspace: () => Promise<void>
  demoEnabled: boolean
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    setError(null)
    try {
      const next = await api.fetchWorkspace()
      setWorkspace(next)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to load workspace.')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const refreshActivities = useCallback(async () => {
    try {
      const activities = await api.fetchActivities(1, 50)
      setWorkspace((current) => (current ? { ...current, activities } : current))
    } catch {
      // Activity feed is non-critical; keep the rest of the workspace intact.
    }
  }, [])

  const resetWorkspace = useCallback(async () => {
    await api.resetWorkspace()
    await refresh()
  }, [api, refresh])

  const createTask = useCallback(async (input: CreateTaskInput) => {
    const created = await api.createTask(input)
    setWorkspace((current) =>
      current ? { ...current, tasks: [created, ...current.tasks] } : current,
    )
    await refresh()
    return created
  }, [api, refresh])

  const updateTask = useCallback(async (id: string, patch: UpdateTaskInput) => {
    const updated = await api.updateTask(id, patch)
    setWorkspace((current) =>
      current
        ? {
            ...current,
            tasks: current.tasks.map((task) => (task.id === id ? updated : task)),
          }
        : current,
    )
    await refresh()
    return updated
  }, [api, refresh])

  const deleteTask = useCallback(async (id: string) => {
    await api.deleteTask(id)
    setWorkspace((current) =>
      current
        ? { ...current, tasks: current.tasks.filter((task) => task.id !== id) }
        : current,
    )
    await refresh()
  }, [api, refresh])

  const moveTask = useCallback(async (id: string, status: TaskStatus, index: number) => {
    const column = await api.moveTask(id, status, index)
    setWorkspace((current) => {
      if (!current) return current
      const byId = new Map(column.map((task) => [task.id, task]))
      return {
        ...current,
        tasks: current.tasks.map((task) => byId.get(task.id) ?? task),
      }
    })
    await refresh()
  }, [api, refresh])

  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    const updated = await api.toggleSubtask(taskId, subtaskId)
    setWorkspace((current) =>
      current
        ? {
            ...current,
            tasks: current.tasks.map((task) => (task.id === taskId ? updated : task)),
          }
        : current,
    )
    await refresh()
  }, [api, refresh])

  const addComment = useCallback(async (taskId: string, body: string) => {
    const comment = await api.addComment(taskId, body)
    setWorkspace((current) => {
      if (!current || !comment) return current
      return {
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                comments: [
                  ...task.comments,
                  {
                    id: comment.id.toString(),
                    authorId: comment.authorId.toString(),
                    body: comment.body,
                    createdAt: comment.createdAt,
                  },
                ],
              }
            : task,
        ),
      }
    })
    await refresh()
  }, [api, refresh])

  const createProject = useCallback(async (input: api.CreateProjectInput) => {
    const created = await api.createProject(input)
    setWorkspace((current) =>
      current
        ? { ...current, projects: [created, ...current.projects] }
        : current,
    )
    await refresh()
    return created
  }, [api, refresh])

  const updateProjectStatus = useCallback(async (id: string, status: Project['status']) => {
    const updated = await api.updateProjectStatus(id, status)
    setWorkspace((current) =>
      current
        ? {
            ...current,
            projects: current.projects.map((project) =>
              project.id === id ? updated : project,
            ),
          }
        : current,
    )
    await refresh()
    return updated
  }, [api, refresh])

  const updateProfile = useCallback(async (patch: { name?: string; email?: string; role?: string }) => {
    const updated = await api.updateProfile(patch)
    setWorkspace((current) =>
      current
        ? {
            ...current,
            members: current.members.map((member) =>
              member.id === updated.id ? updated : member,
            ),
            currentUserId: current.currentUserId,
          }
        : current,
    )
    await refresh()
    return updated
  }, [api, refresh])

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspace,
      tasks: workspace?.tasks ?? [],
      projects: workspace?.projects ?? [],
      members: workspace?.members ?? [],
      activities: workspace?.activities ?? [],
      currentUser: workspace?.members.find((m) => m.id === workspace.currentUserId) ?? null,
      currentUserId: workspace?.currentUserId ?? '',
      demoEnabled: workspace?.demoEnabled ?? false,
      loading,
      error,
      refresh,
      createTask,
      updateTask,
      deleteTask,
      moveTask,
      toggleSubtask,
      addComment,
      createProject,
      updateProjectStatus,
      updateProfile,
      refreshActivities,
      resetWorkspace,
    }),
    [
      workspace,
      loading,
      error,
      refresh,
      refreshActivities,
      resetWorkspace,
      createTask,
      updateTask,
      deleteTask,
      moveTask,
      toggleSubtask,
      addComment,
      createProject,
      updateProjectStatus,
      updateProfile,
    ],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return context
}
