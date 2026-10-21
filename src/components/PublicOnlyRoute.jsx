import { Navigate } from 'react-router-dom'
import { PageLoader } from '@/components/ui'

/**
 * All public entry points should take signed-in readers straight into the app.
 * This also recovers from an OAuth provider returning to the configured Site URL
 * (/) instead of the requested /home callback.
 *
 * Do not route while the session is still being recovered from the OAuth URL.
 */
export default function PublicOnlyRoute({ loading, user, children }) {
  if (loading) return <PageLoader />
  if (user) return <Navigate to="/home" replace />
  return children
}
