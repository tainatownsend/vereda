export const ONBOARDING_METADATA_KEY = 'vereda_onboarding_complete'

export function needsFirstTimeOnboarding(user) {
  return user?.user_metadata?.[ONBOARDING_METADATA_KEY] === false
}

export function onboardingMetadata(completed) {
  return { [ONBOARDING_METADATA_KEY]: Boolean(completed) }
}
