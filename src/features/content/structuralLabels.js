const ROMAN_TOKEN = /[ivxlcdm]+/i
const ROMAN_CANONICAL = /^(?=[mdclxvi]+$)m{0,3}(?:cm|cd|d?c{0,3})(?:xc|xl|l?x{0,3})(?:ix|iv|v?i{0,3})$/i
const LEADING_ROMAN = /^(\s*)([ivxlcdm]+)(?=\s*(?:[—–\-.:)]|$))/i
const PREFIXED_ROMAN = /\b(cap[ií]tulo|parte|livro|se[cç][aã]o|trecho|item)\s+([ivxlcdm]+)\b/gi

function isCanonicalRomanNumeral(value) {
  return ROMAN_TOKEN.test(value) && ROMAN_CANONICAL.test(value)
}

/**
 * Uppercase Roman numerals only when they are being used as structural labels.
 * Canonical validation prevents ordinary words made only of Roman-numeral
 * letters (for example "civil") from being changed accidentally.
 */
export function normalizeStructuralRomanNumerals(value) {
  if (value === null || value === undefined) return value

  const text = String(value)
  const trimmed = text.trim()

  if (isCanonicalRomanNumeral(trimmed)) {
    return text.replace(trimmed, trimmed.toUpperCase())
  }

  return text
    .replace(PREFIXED_ROMAN, (match, prefix, numeral) => (
      isCanonicalRomanNumeral(numeral)
        ? `${prefix} ${numeral.toUpperCase()}`
        : match
    ))
    .replace(LEADING_ROMAN, (match, whitespace, numeral) => (
      isCanonicalRomanNumeral(numeral)
        ? `${whitespace}${numeral.toUpperCase()}`
        : match
    ))
}
