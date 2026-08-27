export const SAVED_PASSAGE_METADATA_KEY = 'saved_passage_ids'
export const MAX_SAVED_PASSAGES = 200

export function normalizeSavedPassageIds(value) {
  if (!Array.isArray(value)) return []

  const unique = []
  const seen = new Set()

  for (const candidate of value) {
    const id = Number(candidate)
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue
    seen.add(id)
    unique.push(id)
    if (unique.length >= MAX_SAVED_PASSAGES) break
  }

  return unique
}

export function getSavedPassageIds(user) {
  return normalizeSavedPassageIds(
    user?.user_metadata?.[SAVED_PASSAGE_METADATA_KEY],
  )
}

export function addSavedPassageId(ids, sectionId) {
  const normalized = normalizeSavedPassageIds(ids)
  const id = Number(sectionId)

  if (!Number.isInteger(id) || id <= 0) return normalized

  return [id, ...normalized.filter((savedId) => savedId !== id)].slice(
    0,
    MAX_SAVED_PASSAGES,
  )
}

export function removeSavedPassageId(ids, sectionId) {
  const id = Number(sectionId)
  return normalizeSavedPassageIds(ids).filter((savedId) => savedId !== id)
}

export function isPassageSaved(user, sectionId) {
  const id = Number(sectionId)
  return getSavedPassageIds(user).includes(id)
}
