const ROMAN_ONLY = /^[ivxlcdm]+$/i
const LEADING_ROMAN = /^(\s*)([ivxlcdm]+)(?=\s*(?:[—–\-.:)]|$))/i
const PREFIXED_ROMAN = /\b(cap[ií]tulo|parte|livro|se[cç][aã]o|trecho|item)\s+([ivxlcdm]+)\b/gi

/**
 * Uppercase Roman numerals only when they are being used as structural labels.
 * This deliberately avoids uppercasing ordinary words such as "civil".
 */
export function normalizeStructuralRomanNumerals(value) {
  if (value === null || value === undefined) return value

  const text = String(value)
  const trimmed = text.trim()

  if (ROMAN_ONLY.test(trimmed)) {
    return text.replace(trimmed, trimmed.toUpperCase())
  }

  return text
    .replace(PREFIXED_ROMAN, (_, prefix, numeral) => `${prefix} ${numeral.toUpperCase()}`)
    .replace(LEADING_ROMAN, (_, whitespace, numeral) => `${whitespace}${numeral.toUpperCase()}`)
}
