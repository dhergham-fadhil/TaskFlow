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
let refreshInFlight: Promise<string | null> | null = null

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

export function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken')
}

export function setRefreshToken(token: string): void {
  localStorage.setItem('refreshToken', token)
}

export function clearRefreshToken(): void {
  localStorage.removeItem('refreshToken')
}

export function clearAuth(): void {
  clearToken()
  clearRefreshToken()
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
    throw new ApiError(401, 'Unauthorized')
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

  // On 401, attempt to refresh the access token once, then retry.
  if (response.status === 401) {
    const refreshToken = getRefreshToken()
    if (refreshToken) {
      const refreshed = await refreshAuth(refreshToken)
      if (refreshed) {
        const newToken = getToken()
        const retryHeaders = new Headers({
          'Content-Type': 'application/json',
          ...(newToken && { Authorization: `Bearer ${newToken}` }),
          ...options.headers,
        })
        const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers: retryHeaders,
        })
        return handleResponse(retryResponse)
      }
    }
    // No refresh token or refresh failed — signal unauthorized.
    onUnauthorized?.()
    return handleResponse(response)
  }

  return handleResponse(response)
}

/**
 * Rotate the refresh token and store the new access + refresh tokens.
 * Returns true on success, false on failure.
 */
export async function refreshAuth(refreshToken: string): Promise<boolean> {
  // Prevent multiple concurrent refreshes for the same token.
  if (refreshInFlight) return refreshInFlight.then(Boolean)

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!response.ok) {
        clearAuth()
        return false
      }
      const data = (await response.json()) as { token?: string; refreshToken?: string }
      if (!data.token || !data.refreshToken) {
        clearAuth()
        return false
      }
      setToken(data.token)
      setRefreshToken(data.refreshToken)
      return true
    } catch {
      clearAuth()
      return false
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

export interface UserResponse {
  id: number
  name: string
  email: string
  role: string
}

export interface AuthResponse {
  token: string
  refreshToken: string
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
