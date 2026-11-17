import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi, ApiError, clearToken, getToken, setToken, setUnauthorizedHandler, type UserResponse } from '../api/client'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  updateProfile: (patch: { name?: string; email?: string; role?: string }) => Promise<AuthUser>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Decode the JWT payload without verifying it (verification happens server-side). */
function readTokenExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null
  } catch {
    return null
  }
}

function mapUser(dto: UserResponse): AuthUser {
  return {
    id: dto.id.toString(),
    name: dto.name,
    email: dto.email,
    role: dto.role,
  }
}

/**
 * Display-only identity from the JWT claims, used when the API cannot be
 * reached. Nothing here is trusted for authorization — the server remains the
 * only authority, and the token itself is still verified on every request.
 */
function readUserFromToken(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
    ) as Record<string, unknown>
    const id = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']
    if (id === undefined) return null
    return {
      id: String(id),
      name: String(payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ?? ''),
      email: String(
        payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ?? '',
      ),
      role: String(
        payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? '',
      ),
    }
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
    navigate('/login', { replace: true })
  }, [navigate])

  // Restore session on mount: token must exist, be unexpired, and be accepted
  // by the backend (GET /users/me). A localStorage value alone is not proof.
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setIsLoading(false)
      return
    }

    const expiry = readTokenExpiry(token)
    if (expiry !== null && expiry < Date.now()) {
      clearToken()
      setIsLoading(false)
      return
    }

    authApi
      .getProfile()
      .then((profile) => setUser(mapUser(profile)))
      .catch((error) => {
        // A rejected token is a real sign-out. A network/5xx failure is not:
        // keeping the token lets the shell render its error state with retry
        // instead of silently throwing the user back to the login screen.
        if (error instanceof ApiError && error.status === 401) {
          clearToken()
          setUser(null)
          return
        }
        setUser(readUserFromToken(token))
      })
      .finally(() => setIsLoading(false))
  }, [])

  // Global 401 handling: any endpoint rejecting the token signs the user out.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken()
      setUser(null)
      navigate('/login', { replace: true })
    })
    return () => setUnauthorizedHandler(null)
  }, [navigate])

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login(email, password)
      setToken(result.token)
      const profile = await authApi.getProfile()
      setUser(mapUser(profile))
    },
    [],
  )

  const register = useCallback(async (name: string, email: string, password: string) => {
    const result = await authApi.register(name, email, password)
    setToken(result.token)
    const profile = await authApi.getProfile()
    setUser(mapUser(profile))
  }, [])

  const updateProfile = useCallback(
    async (patch: { name?: string; email?: string; role?: string }) => {
      const updated = await authApi.updateProfile(patch)
      setUser(mapUser(updated))
      return mapUser(updated)
    },
    [],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      register,
      logout,
      updateProfile,
    }),
    [user, isLoading, login, register, logout, updateProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
