import {
  readFileSync,
} from 'node:fs'

import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  canonicalJsonSha256FromValue,
  sha256LegacyCrlf,
  sha256LegacyCrlfFromText,
} from '../../scripts/content_pipeline/hash_utils.mjs'

const readJson = (path) =>
  JSON.parse(
    readFileSync(path, 'utf8'),
  )

const historicalInputs = [
  ...Object.entries({
    worklist_sha256:
      'content/migration/reading-segment-source-review-worklist.json',
    inspection_packets_sha256:
      'content/migration/reading-segment-source-inspection-packets.json',
    pending_audit_sha256:
      'content/migration/reading-segment-pending-source-review-audit.json',
  }).map(([field, path]) => ({
    stage: 'same-page corpus',
    field,
    path,
    recorded:
      readJson(
        'content/migration/reading-segment-same-page-review-corpus.json',
      ).input_hashes[field],
  })),
  {
    stage: 'PR-0041',
    field: 'decision_artifact_sha256',
    path: 'content/migration/reading-segment-same-page-review-decisions.json',
    recorded:
      readJson(
        'content/migration/reading-segment-same-page-progress-integration-evidence.json',
      ).input_hashes.decision_artifact_sha256,
  },
  {
    stage: 'PR-0041',
    field: 'integration_plan_sha256',
    path: 'content/migration/reading-segment-same-page-review-integration-plan.json',
    recorded:
      readJson(
        'content/migration/reading-segment-same-page-progress-integration-evidence.json',
      ).input_hashes.integration_plan_sha256,
  },
  ...Object.entries({
    worklist_sha256:
      'content/migration/reading-segment-source-review-worklist.json',
    inspection_packets_sha256:
      'content/migration/reading-segment-source-inspection-packets.json',
    pending_audit_sha256:
      'content/migration/reading-segment-pending-source-review-audit.json',
    progress_sha256:
      'content/migration/reading-segment-source-review-progress.json',
    pr0041_integration_sha256:
      'content/migration/reading-segment-same-page-progress-integration-evidence.json',
  }).map(([field, path]) => ({
    stage: 'PR-0042',
    field,
    path,
    recorded:
      readJson(
        'content/migration/reading-segment-no-anchor-discovery-corpus.json',
      ).input_hashes[field],
  })),
  {
    stage: 'PR-0043',
    field: 'discovery_corpus_sha256',
    path: 'content/migration/reading-segment-no-anchor-discovery-corpus.json',
    recorded:
      readJson(
        'content/migration/reading-segment-no-anchor-ambiguous-review-packet.json',
      ).input_hashes.discovery_corpus_sha256,
  },
  {
    stage: 'PR-0043',
    field: 'progress_sha256',
    path: 'content/migration/reading-segment-source-review-progress.json',
    recorded:
      readJson(
        'content/migration/reading-segment-no-anchor-ambiguous-review-packet.json',
      ).input_hashes.progress_sha256,
  },
  ...Object.entries({
    review_packet_sha256:
      'content/migration/reading-segment-no-anchor-ambiguous-review-packet.json',
    discovery_corpus_sha256:
      'content/migration/reading-segment-no-anchor-discovery-corpus.json',
    progress_sha256:
      'content/migration/reading-segment-source-review-progress.json',
  }).map(([field, path]) => ({
    stage: 'PR-0044',
    field,
    path,
    recorded:
      readJson(
        'content/migration/reading-segment-no-anchor-ambiguous-adjudication-decisions.json',
      ).input_hashes[field],
  })),
]

describe(
  'content-pipeline hash utilities',
  () => {
    it(
      'normalizes LF, CRLF, and standalone CR under the legacy CRLF contract',
      () => {
        const lf = 'alpha\nbeta\ngamma\n'
        const crlf = 'alpha\r\nbeta\r\ngamma\r\n'
        const cr = 'alpha\rbeta\rgamma\r'

        expect(
          sha256LegacyCrlfFromText(lf),
        ).toBe(sha256LegacyCrlfFromText(crlf))
        expect(
          sha256LegacyCrlfFromText(lf),
        ).toBe(sha256LegacyCrlfFromText(cr))
      },
    )

    it(
      'keeps non-line-ending byte changes significant under the legacy contract',
      () => {
        expect(
          sha256LegacyCrlfFromText(
            'alpha\nbeta\n',
          ),
        ).not.toBe(
          sha256LegacyCrlfFromText(
            'alpha\nbeta!\n',
          ),
        )
      },
    )

    it.each(historicalInputs)(
      'reproduces $stage $field with sha256-legacy-crlf-v1',
      async ({
        path,
        recorded,
      }) => {
        await expect(
          sha256LegacyCrlf(path),
        ).resolves.toBe(recorded)
      },
    )

    it(
      'hashes canonical JSON independent of line endings, indentation, and key ordering',
      () => {
        const lf = '{\n  "b": [true, null, "é"],\n  "a": {"d": 2, "c": 1.5}\n}\n'
        const crlf = lf.replaceAll(
          '\n',
          '\r\n',
        )
        const reordered = '{"a":{"c":1.5,"d":2},"b":[true,null,"é"]}'

        expect(
          canonicalJsonSha256FromValue(
            JSON.parse(lf),
          ),
        ).toBe(
          canonicalJsonSha256FromValue(
            JSON.parse(crlf),
          ),
        )
        expect(
          canonicalJsonSha256FromValue(
            JSON.parse(lf),
          ),
        ).toBe(
          canonicalJsonSha256FromValue(
            JSON.parse(reordered),
          ),
        )
      },
    )

    it(
      'keeps semantic JSON changes significant under the canonical contract',
      () => {
        expect(
          canonicalJsonSha256FromValue({
            a: 1,
            b: [
              true,
              null,
            ],
          }),
        ).not.toBe(
          canonicalJsonSha256FromValue({
            a: 1,
            b: [
              false,
              null,
            ],
          }),
        )
      },
    )
  },
)
