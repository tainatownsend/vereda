/**
 * Choose the most recently confirmed reading position.
 *
 * The database is the cross-device source of truth. An older tab-specific
 * sessionStorage position must not move a returning reader backward. A later
 * local position remains useful when a reader browsed forward in this tab
 * without marking additional sections as read.
 */
export function resolveReaderStartPosition({
  serverPosition,
  storedPosition,
  lastPosition,
  bookCompleted = false,
  revisitMode = false,
}) {
  const last = Math.max(0, Math.floor(Number(lastPosition) || 0))
  const server = Math.floor(Number(serverPosition) || 0)
  const stored = Math.floor(Number(storedPosition) || 0)
  const validServer = server >= 1 && server <= last
  const validStored = stored >= 1 && stored <= last

  if (bookCompleted && revisitMode) return 1
  if (validServer && validStored) return Math.max(server, stored)
  if (validServer) return server
  if (validStored) return stored
  return 1
}

/**
 * Reflect an RPC-confirmed reading completion in the shared Home/Library store.
 * No optimistic writes: callers invoke this only *after* Supabase responds.
 */
export function mergeConfirmedReaderProgress(previous, {
  nextPosition,
  bookCompleted = false,
  completedAt = new Date().toISOString(),
}) {
  const oldPosition = Math.max(1, Math.floor(Number(previous?.current_section) || 1))
  const next = Math.floor(Number(nextPosition) || 0)
  // Some completion RPCs can omit a successor when the final unit ends.
  // Completion itself remains durable and must still appear as 100% on Home.
  if (next < 1 && !bookCompleted) return previous || null

  return {
    ...(previous || {}),
    current_section: Math.max(oldPosition, next),
    last_read_at: completedAt,
    ...(bookCompleted ? { completed_at: previous?.completed_at || completedAt } : {}),
  }
}
