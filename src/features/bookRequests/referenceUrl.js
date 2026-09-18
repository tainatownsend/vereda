export const MAX_BOOK_REFERENCE_URL_LENGTH = 2048

const TOO_LONG_ERROR = 'Use um link de referência com até 2.048 caracteres.'

export function normalizeBookReferenceUrl(value) {
  const trimmed = String(value || '').trim()

  if (!trimmed) {
    return { value: null, error: '' }
  }

  if (trimmed.length > MAX_BOOK_REFERENCE_URL_LENGTH) {
    return { value: null, error: TOO_LONG_ERROR }
  }

  let parsed
  try {
    parsed = new URL(trimmed)
  } catch {
    return {
      value: null,
      error: 'Digite um link completo, começando com https://.',
    }
  }

  if (parsed.protocol !== 'https:') {
    return {
      value: null,
      error: 'Por segurança, o link de referência precisa usar https://.',
    }
  }

  if (!parsed.hostname || parsed.username || parsed.password) {
    return {
      value: null,
      error: 'Este link de referência não pode ser usado. Confira o endereço e tente novamente.',
    }
  }

  const canonicalUrl = parsed.toString()
  if (canonicalUrl.length > MAX_BOOK_REFERENCE_URL_LENGTH) {
    return { value: null, error: TOO_LONG_ERROR }
  }

  return {
    value: canonicalUrl,
    error: '',
  }
}

export function getBookReferenceHostname(value) {
  try {
    return new URL(value).hostname.replace(/^www\./i, '')
  } catch {
    return ''
  }
}
