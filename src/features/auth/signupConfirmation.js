export function getSignupEmailRedirect(origin) {
  return new URL('/', origin).toString()
}

export function getSignupOutcome(data) {
  const user = data?.user || null
  const session = data?.session || null

  return {
    user,
    session,
    requiresEmailConfirmation: Boolean(user && !session),
  }
}
