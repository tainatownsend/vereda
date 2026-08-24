import { describe, expect, it } from 'vitest'

import {
  getSignupEmailRedirect,
  getSignupOutcome,
} from '@/features/auth/signupConfirmation'

describe('signup confirmation contract', () => {
  it('builds confirmation redirect on the current app origin', () => {
    expect(getSignupEmailRedirect('https://vereda.example.com/preview')).toBe(
      'https://vereda.example.com/',
    )
  })

  it('detects when Supabase requires email confirmation', () => {
    expect(
      getSignupOutcome({ user: { id: 'user-1' }, session: null }),
    ).toMatchObject({ requiresEmailConfirmation: true })
  })

  it('detects immediate-session signup when confirmations are disabled', () => {
    expect(
      getSignupOutcome({
        user: { id: 'user-1' },
        session: { user: { id: 'user-1' } },
      }),
    ).toMatchObject({ requiresEmailConfirmation: false })
  })

  it('does not claim confirmation for an empty signup result', () => {
    expect(getSignupOutcome(null)).toEqual({
      user: null,
      session: null,
      requiresEmailConfirmation: false,
    })
  })
})
