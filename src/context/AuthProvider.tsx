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
import { authApi, clearToken, getToken, setToken, setUnauthorizedHandler, type UserResponse } from '../api/client'

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
      .catch(() => {
        clearToken()
        setUser(null)
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
