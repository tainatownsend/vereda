export const GUIDED_STUDY_PROGRESS_KEY = 'vereda_guided_study_v1'

function sanitizeProgress(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const safe = {}
  for (const [pathKey, sessions] of Object.entries(value)) {
    if (!Array.isArray(sessions)) continue
    safe[pathKey] = Array.from(new Set(sessions.map(String).filter(Boolean))).slice(0, 100)
  }
  return safe
}

export function getGuidedStudyProgress(user) {
  return sanitizeProgress(user?.user_metadata?.[GUIDED_STUDY_PROGRESS_KEY])
}

export function getCompletedGuidedSessions(user, pathKey) {
  return getGuidedStudyProgress(user)[pathKey] || []
}

export function isGuidedSessionComplete(user, pathKey, sessionId) {
  return getCompletedGuidedSessions(user, pathKey).includes(String(sessionId))
}

export function withGuidedSessionComplete(user, pathKey, sessionId) {
  const current = getGuidedStudyProgress(user)
  const completed = new Set(current[pathKey] || [])
  completed.add(String(sessionId))
  return {
    ...current,
    [pathKey]: Array.from(completed),
  }
}

export function guidedPathProgress(user, path) {
  const completed = new Set(getCompletedGuidedSessions(user, path.key))
  const total = path.sessions.length
  const complete = path.sessions.filter((session) => completed.has(session.id)).length
  const percent = total ? Math.round((complete / total) * 100) : 0
  const nextSession = path.sessions.find((session) => !completed.has(session.id)) || null

  return { complete, total, percent, nextSession, finished: total > 0 && complete === total }
}
