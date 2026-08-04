import {
  createHash,
} from 'node:crypto'
import {
  readFile,
} from 'node:fs/promises'

export const HASH_ALGORITHMS = {
  rawSha256: 'sha256-raw-v1',
  legacyCrlfSha256: 'sha256-legacy-crlf-v1',
  canonicalJsonSha256: 'sha256-canonical-json-v1',
}

export const sha256Bytes = (bytes) =>
  createHash('sha256')
    .update(bytes)
    .digest('hex')

export const sha256Raw = async (filePath) =>
  sha256Bytes(await readFile(filePath))

export const normalizeLegacyCrlfText = (text) =>
  text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n/g, '\r\n')

// Immutable PR-0041 through PR-0044 evidence was recorded from CRLF-normalized
// working-tree bytes. Keep this compatibility helper scoped to those historical
// evidence fields instead of rewriting their substantive artifacts.
export const sha256LegacyCrlfFromText = (text) =>
  sha256Bytes(
    Buffer.from(
      normalizeLegacyCrlfText(text),
      'utf8',
    ),
  )

export const sha256LegacyCrlf = async (filePath) =>
  sha256LegacyCrlfFromText(
    await readFile(filePath, 'utf8'),
  )

export const canonicalizeJson = (value) => {
  if (Array.isArray(value)) {
    return value.map(canonicalizeJson)
  }

  if (
    value !== null &&
    typeof value === 'object'
  ) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [
          key,
          canonicalizeJson(value[key]),
        ]),
    )
  }

  return value
}

export const canonicalJsonString = (value) =>
  JSON.stringify(canonicalizeJson(value))

export const canonicalJsonSha256FromValue = (value) =>
  createHash('sha256')
    .update(canonicalJsonString(value), 'utf8')
    .digest('hex')

export const canonicalJsonSha256 = async (filePath) =>
  canonicalJsonSha256FromValue(
    JSON.parse(
      await readFile(filePath, 'utf8'),
    ),
  )
