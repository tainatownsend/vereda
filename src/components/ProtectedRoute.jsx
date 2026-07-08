import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { PageLoader } from '@/components/ui'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore()
  const location          = useLocation()

  if (loading) return <PageLoader />

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  return children
}