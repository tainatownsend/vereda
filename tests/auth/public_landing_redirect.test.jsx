import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const publicGuard = readFileSync('src/components/PublicOnlyRoute.jsx', 'utf8')
const app = readFileSync('src/App.jsx', 'utf8')

describe('Google sign-in fallback to the public landing route', () => {
  it('keeps the public landing route available for anonymous visitors', () => {
    expect(app).toContain('<LandingPage /></PublicOnlyRoute>')
    expect(publicGuard).toContain('return children')
  })

  it('resolves the session before routing authenticated users to Home', () => {
    const restorePosition = publicGuard.indexOf('if (loading) return <PageLoader />')
    const redirectPosition = publicGuard.indexOf('if (user) return <Navigate to="/home" replace />')
    expect(restorePosition).toBeGreaterThan(-1)
    expect(redirectPosition).toBeGreaterThan(restorePosition)
  })

  it('guards both public entry and login routes against redundant visits', () => {
    expect(app).toContain('<Route path="/" element={<PublicOnlyRoute loading={loading} user={user}>')
    expect(app.match(/<PublicOnlyRoute loading={loading} user={user}>/g)).toHaveLength(3)
  })
})
