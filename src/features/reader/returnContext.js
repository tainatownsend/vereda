export function getReaderReturnPath(value) {
  if (typeof value !== 'string') return '/home'
  // Only local product destinations. Reject external URLs, encoded routes and auth paths.
  if (/^\/(home|biblioteca|notas|salvos|favoritos|reflexoes|mais|descobrir)$/.test(value)) return value
  if (/^\/trecho\/[a-zA-Z0-9-]+(?:\?[^#]*)?$/.test(value)) return value
  if (/^\/estudo-guiado\/[a-z0-9-]+\/[a-z0-9-]+$/.test(value)) return value
  return '/home'
}
