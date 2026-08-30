import { describe, expect, it } from 'vitest'

import {
  getBookReferenceHostname,
  MAX_BOOK_REFERENCE_URL_LENGTH,
  normalizeBookReferenceUrl,
} from '@/features/bookRequests/referenceUrl'

describe('book request reference URLs', () => {
  it('keeps the field optional', () => {
    expect(normalizeBookReferenceUrl('   ')).toEqual({ value: null, error: '' })
  })

  it('normalizes a valid HTTPS reference and exposes a compact hostname', () => {
    const result = normalizeBookReferenceUrl('  https://www.example.com/books/obra?ref=vereda  ')

    expect(result.error).toBe('')
    expect(result.value).toBe('https://www.example.com/books/obra?ref=vereda')
    expect(getBookReferenceHostname(result.value)).toBe('example.com')
  })

  it('rejects non-HTTPS, credential-bearing and malformed links', () => {
    expect(normalizeBookReferenceUrl('http://example.com/book').error).toContain('https://')
    expect(normalizeBookReferenceUrl('https://user:secret@example.com/book').error).toBeTruthy()
    expect(normalizeBookReferenceUrl('javascript:alert(1)').error).toContain('https://')
    expect(normalizeBookReferenceUrl('not a url').error).toContain('https://')
  })

  it('rejects links beyond the storage boundary', () => {
    const tooLong = `https://example.com/${'a'.repeat(MAX_BOOK_REFERENCE_URL_LENGTH)}`
    expect(normalizeBookReferenceUrl(tooLong).error).toContain('2.048')
  })
})
