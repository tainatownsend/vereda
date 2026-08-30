const AUDIO_POSITION_PREFIX = 'vereda-audio-position:'

export function getAudioPosition(bookId, fallback = 1) {
  if (typeof window === 'undefined') return fallback
  const value = Number(window.localStorage.getItem(`${AUDIO_POSITION_PREFIX}${bookId}`))
  return Number.isFinite(value) && value > 0 ? value : fallback
}

export function saveAudioPosition(bookId, position) {
  if (typeof window === 'undefined') return
  const normalized = Number(position)
  if (!Number.isFinite(normalized) || normalized < 1) return
  window.localStorage.setItem(`${AUDIO_POSITION_PREFIX}${bookId}`, String(normalized))
}

export function clearAudioPosition(bookId) {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(`${AUDIO_POSITION_PREFIX}${bookId}`)
}
