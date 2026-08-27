import { describe, expect, it } from 'vitest'

import {
  getSignupEmailRedirect,
  getSignupOutcome,
} from '@/features/auth/signupConfirmation'
import {
  needsFirstTimeOnboarding,
  onboardingMetadata,
} from '@/features/auth/firstTimeOnboarding'

describe('signup confirmation contract', () => {
  it('sends confirmed signups into the guided first-time flow on the current origin', () => {
    expect(getSignupEmailRedirect('https://vereda.example.com/preview')).toBe(
      'https://vereda.example.com/comecar?novo=1',
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

  it('only forces onboarding for accounts explicitly marked incomplete', () => {
    expect(needsFirstTimeOnboarding({ user_metadata: { vereda_onboarding_complete: false } })).toBe(true)
    expect(needsFirstTimeOnboarding({ user_metadata: { vereda_onboarding_complete: true } })).toBe(false)
    expect(needsFirstTimeOnboarding({ user_metadata: {} })).toBe(false)
    expect(onboardingMetadata(true)).toEqual({ vereda_onboarding_complete: true })
  })
})
