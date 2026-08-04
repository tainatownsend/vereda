import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { sha256LegacyCrlfFromText } from '../../scripts/content_pipeline/hash_utils.mjs'

const evidence = JSON.parse(readFileSync('content/migration/reading-segment-mechanical-application-evidence.json', 'utf8'))
const inputs = {
  application_plan_sha256: 'content/migration/reading-segment-mechanical-application-plan.json',
  preflight_csv_sha256: 'content/migration/evidence/mechanical-boundary-application-preflight.csv',
  verification_csv_sha256: 'content/migration/evidence/mechanical-boundary-application-verification.csv',
}
const rawSha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex')

describe('mechanical application evidence legacy hashes', () => {
  it('preserves PR-0024/PR-0025 CRLF-normalized historical checksum evidence without rewriting it', () => {
    for (const [field, path] of Object.entries(inputs)) {
      const text = readFileSync(path, 'utf8')
      expect(evidence.checksums[field]).toBe(sha256LegacyCrlfFromText(text))
      expect(evidence.checksums[field]).not.toBe(rawSha256(text))
    }
  })
})
