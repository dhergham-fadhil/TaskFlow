import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthProvider'

/**
 * Route guard backed by real authentication state:
 * - shows nothing while the session is being restored
 * - redirects to /login when there is no verified session
 * - preserves the attempted URL for post-login redirect
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="skeleton h-10 w-40 animate-pulse rounded-xl" aria-label="Loading session" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
