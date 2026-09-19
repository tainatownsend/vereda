export async function readInitialSession(auth, timeoutMs = 12000) {
  let timer
  try {
    const result = await Promise.race([
      auth.getSession(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('session_timeout')), timeoutMs)
      }),
    ])
    if (result.error) throw result.error
    return result.data?.session || null
  } finally {
    clearTimeout(timer)
  }
}
