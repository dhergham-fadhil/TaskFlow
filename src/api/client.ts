export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5187/api'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

export function getToken(): string | null {
  return localStorage.getItem('token')
}

export function setToken(token: string): void {
  localStorage.setItem('token', token)
}

export function clearToken(): void {
  localStorage.removeItem('token')
}

/**
 * Shared response handler for every API call.
 * - 401 triggers the global unauthorized flow (auth provider signs out).
 * - Non-OK responses throw ApiError with the server's message when present.
 * - 204 and empty bodies resolve to null; JSON is parsed only when present.
 */
export async function handleResponse(response: Response) {
  if (response.status === 401) {
    onUnauthorized?.()
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => null)
    let message = `API Error: ${response.status}`
    if (errorBody) {
      try {
        const parsed = JSON.parse(errorBody)
        message = parsed.error || parsed.detail || parsed.title || message
      } catch {
        message = errorBody
      }
    }
    throw new ApiError(response.status, message)
  }

  if (response.status === 204) return null

  const contentType = response.headers.get('content-type')
  const hasJsonContentType = contentType != null && contentType.includes('application/json')
  if (!hasJsonContentType) return null

  const body = await response.text()
  if (!body || !body.trim()) return null

  try {
    return JSON.parse(body)
  } catch {
    return null
  }
}

export async function request(endpoint: string, options: RequestInit = {}) {
  const token = getToken()
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  })

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  return handleResponse(response)
}

export interface UserResponse {
  id: number
  name: string
  email: string
  role: string
}

export interface AuthResponse {
  token: string
}

export const authApi = {
  login: (email: string, password: string): Promise<AuthResponse> =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string): Promise<AuthResponse> =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  getProfile: (): Promise<UserResponse> => request('/users/me'),
  updateProfile: (patch: { name?: string; email?: string; role?: string }): Promise<UserResponse> =>
    request('/users/me', { method: 'PUT', body: JSON.stringify(patch) }),
}

// Workspace
export const fetchWorkspace = () => request('/workspace')

// Projects
export const createProject = (data: any) => request('/projects', { method: 'POST', body: JSON.stringify(data) })
export const updateProject = (id: number, data: any) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const setProjectStatus = (id: number, status: string) => request(`/projects/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) })
export const deleteProject = (id: number) => request(`/projects/${id}`, { method: 'DELETE' })

// Tasks
export const createTask = (data: any) => request('/tasks', { method: 'POST', body: JSON.stringify(data) })
export const updateTask = (id: number, data: any) => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteTask = (id: number) => request(`/tasks/${id}`, { method: 'DELETE' })
export const moveTask = (id: number, status: string, index: number) => request(`/tasks/${id}/move`, { method: 'POST', body: JSON.stringify({ status, index }) })
export const toggleSubtask = (taskId: number, subtaskId: number) => request(`/tasks/${taskId}/subtasks/${subtaskId}/toggle`, { method: 'POST' })
export const addComment = (taskId: number, body: string) => request(`/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ body }) })

// Activity feed
export const fetchActivities = (page = 1, pageSize = 50) =>
  request(`/activities?page=${page}&pageSize=${pageSize}`)

// Demo reset: admin-only and gated behind Demo:Enabled on the server.
export const resetWorkspace = () => request('/workspace/reset', { method: 'POST' })
