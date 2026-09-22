export const REFLECTION_FAVORITES_KEY = 'vereda_reflection_favorites_v1'
export function getFavoriteReflectionIds(user) {
  const ids = user?.user_metadata?.[REFLECTION_FAVORITES_KEY]
  return Array.isArray(ids) ? [...new Set(ids.filter(id => typeof id === 'string'))] : []
}
export function withReflectionFavorite(user, id, saved) {
  const ids = new Set(getFavoriteReflectionIds(user))
  if (saved) ids.add(id)
  else ids.delete(id)
  return [...ids]
}
