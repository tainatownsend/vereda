import { createHash } from 'node:crypto'

export const CONTENT_NORMALIZATION_ALGORITHM = 'reviewed-boundary-content-normalization-v1'

// This package is the first repository contract that independently hashes
// reading_segments.content. Keep the algorithm centralized for generators,
// validators, and future runtime collectors.
export function normalizeReviewedBoundaryContent(content) {
  if (typeof content !== 'string') throw new TypeError('content must be a string')
  const lines = content
    .replace(/\r\n?/g, '\n')
    .normalize('NFC')
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map(line => line.replace(/[\t\v\f ]+/g, ' ').trim())

  while (lines[0] === '') lines.shift()
  while (lines.at(-1) === '') lines.pop()

  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n')}\n`
}

export function recomputeNormalizedContentSha256(content) {
  return createHash('sha256')
    .update(normalizeReviewedBoundaryContent(content), 'utf8')
    .digest('hex')
}

export function measureReviewedBoundaryContent(content, storedDigest = null) {
  if (content === null || content === undefined) return {
    recomputed_normalized_content_sha256: null,
    stored_normalized_content_sha256: storedDigest,
    stored_digest_matches_recomputed: null,
    content_byte_length: null,
    normalized_content_length: null,
    word_count: null,
  }
  const normalized = normalizeReviewedBoundaryContent(content)
  const recomputed = recomputeNormalizedContentSha256(content)
  return {
    recomputed_normalized_content_sha256: recomputed,
    stored_normalized_content_sha256: storedDigest,
    stored_digest_matches_recomputed: storedDigest === null ? null : storedDigest === recomputed,
    content_byte_length: Buffer.byteLength(content, 'utf8'),
    normalized_content_length: normalized.length,
    word_count: normalized.trim() === '' ? 0 : normalized.trim().split(/\s+/u).length,
  }
}
