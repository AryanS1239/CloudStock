import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Spinner } from './ui'

export function RequireAuth() {
  const { session, profile, loading } = useAuth()
  if (loading) return <Spinner label="Checking your session" />
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <Spinner label="Loading your profile" />
  return <Outlet />
}

export function RequireAdmin() {
  const { isAdmin } = useAuth()
  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-line bg-white p-8 text-center">
        <h1 className="text-lg font-semibold">Administrators only</h1>
        <p className="mt-1 text-sm text-ink/60">Ask an administrator if you need access to this page.</p>
      </div>
    )
  }
  return <Outlet />
}
