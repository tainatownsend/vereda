export const STUDY_PLAN_METADATA_KEY = 'vereda_study_plan'

export const SESSION_LENGTH_OPTIONS = [
  { id: 'short', label: '5–10 min', minutes: 10 },
  { id: 'medium', label: '15–20 min', minutes: 20 },
  { id: 'long', label: '30+ min', minutes: 30 },
  { id: 'open', label: 'Prefiro não definir', minutes: null },
]

export const WEEKLY_FREQUENCY_OPTIONS = [
  { id: 'once', label: '1 vez por semana', sessions: 1 },
  { id: 'twice', label: '2 vezes por semana', sessions: 2 },
  { id: 'three', label: '3 vezes por semana', sessions: 3 },
  { id: 'open', label: 'Sem frequência definida', sessions: null },
]

export function getStudyPlan(user) {
  const value = user?.user_metadata?.[STUDY_PLAN_METADATA_KEY]
  if (!value || typeof value !== 'object') return null
  return value
}

export function buildStudyPlan(sessionLengthId, weeklyFrequencyId) {
  const session = SESSION_LENGTH_OPTIONS.find((item) => item.id === sessionLengthId)
  const frequency = WEEKLY_FREQUENCY_OPTIONS.find((item) => item.id === weeklyFrequencyId)

  if (!session || !frequency) return null

  return {
    session_length: session.id,
    session_minutes: session.minutes,
    weekly_frequency: frequency.id,
    weekly_sessions: frequency.sessions,
    updated_at: new Date().toISOString(),
  }
}

export function getSessionEstimate(plan) {
  if (!plan?.session_minutes) return 'No seu ritmo'
  return `Cerca de ${plan.session_minutes} min`
}

export function getWeeklyProgressLabel(plan, sessionsThisWeek = 0) {
  if (!plan?.weekly_sessions) return 'Sem meta semanal definida'
  const target = Number(plan.weekly_sessions)
  const done = Math.min(Math.max(Number(sessionsThisWeek) || 0, 0), target)
  return `${done} de ${target} ${target === 1 ? 'sessão' : 'sessões'} nesta semana`
}

export function getGentleReturnCopy(daysSinceLastRead) {
  if (!Number.isFinite(daysSinceLastRead) || daysSinceLastRead < 2) return 'Continue exatamente de onde você parou.'
  if (daysSinceLastRead < 7) return 'Seu estudo está aqui, pronto para continuar quando fizer sentido.'
  return 'Faz alguns dias desde sua última leitura. Seu lugar está salvo — retome sem precisar recuperar o ritmo de uma vez.'
}
