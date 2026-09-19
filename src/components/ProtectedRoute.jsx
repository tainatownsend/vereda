import { RecoveryScreen } from '@/components/RecoveryScreen'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { PageLoader } from '@/components/ui'
import { needsFirstTimeOnboarding } from '@/features/auth/firstTimeOnboarding'

export default function ProtectedRoute({ children }) {
  const { user, loading, sessionError } = useAuthStore()
  const location = useLocation()

  if (sessionError) return <RecoveryScreen />

  if (loading) return <PageLoader />

  if (!user) {
    return <Navigate to="/entrar" state={{ from: location }} replace />
  }

  if (needsFirstTimeOnboarding(user) && location.pathname !== '/comecar') {
    return <Navigate to="/comecar?novo=1" replace />
  }

  return children
}
