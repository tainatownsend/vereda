import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { canonicalJsonSha256, canonicalJsonSha256FromValue } from './hash_utils.mjs'
import { paths, sources, artifactOrder } from './reviewed_boundary_content_integrity_constants.mjs'
import { CONTENT_NORMALIZATION_ALGORITHM } from './reviewed_boundary_content_normalization.mjs'

const readJson = async path => JSON.parse(await readFile(path, 'utf8'))
const identityHash = ({ run_id, book_id, segment_key }) => canonicalJsonSha256FromValue({ run_id, book_id, segment_key })
const eventKeyAlgorithm = 'sha256-v1-length-delimited-reviewed-boundary-event-key'
const eventKey = (record, action) => {
  const values = [
    ['package_id', 'reading-segment-reviewed-boundary-execution'], ['event_action', action],
    ['run_id', record.run_id], ['decision_id', record.decision_id], ['book_id', String(record.book_id)],
    ['segment_key', record.segment_key], ['event_version', '1'],
  ]
  const material = eventKeyAlgorithm + values.map(([key, value]) => `|${key}=${value.length}:${value}`).join('')
  return createHash('sha256').update(material, 'utf8').digest('hex')
}
const uniqueMap = (records, label) => {
  const map = new Map()
  for (const record of records) {
    assert.equal(typeof record.decision_id, 'string', `${label}: invalid decision_id`)
    assert(!map.has(record.decision_id), `${label}: duplicate decision_id ${record.decision_id}`)
    map.set(record.decision_id, record)
  }
  return map
}
const sameKeys = (expected, actual, label) => assert.deepEqual([...actual.keys()].sort(), [...expected.keys()].sort(), `${label}: closed-world decision set mismatch`)

export async function validate(options = {}) {
  const actual = {}
  for (const key of artifactOrder) actual[key] = options.artifacts?.[key] ?? await readJson(paths[key])
  const manifest = options.artifacts?.manifest ?? await readJson(paths.manifest)
  const [plan, decisions] = await Promise.all([readJson(sources.authorized), readJson(sources.decisions)])
  assert.equal(plan.authorized_decision_count, 74)
  assert.equal(plan.application_records.length, 74)
  assert.equal(decisions.totals.public_decision_count, 144)

  const sourceHashes = {}
  for (const [name, path] of Object.entries(sources)) sourceHashes[name] = path.endsWith('.json')
    ? await canonicalJsonSha256(path)
    : createHash('sha256').update((await readFile(path, 'utf8')).replace(/\r\n?/g, '\n')).digest('hex')
  assert.deepEqual(manifest.source_hashes, sourceHashes, 'stale source hash')

  const expectedRecords = plan.application_records.map(record => {
    assert.deepEqual(record.changed_columns, ['approval_status'])
    assert.match(record.final_outcome, /^(confirm-successor-start|retain-intro-segment)$/)
    assert.equal(record.application_ready, true)
    assert.equal(record.expected_current_approval_status, 'boundary-review')
    assert.equal(record.authorized_replacement_approval_status, 'content-review')
    const expected = {
      decision_id: record.decision_id, run_id: record.expected_run_id, book_id: record.book_id,
      segment_key: record.segment_key, segment_order: record.segment_order,
      current_approval_status: record.expected_current_approval_status,
      intended_resulting_approval_status: record.authorized_replacement_approval_status,
      action_classification: record.final_outcome, status_only_eligible: true,
      source_artifact_references: [sources.authorized, sources.schema],
      source_artifact_hashes: { authorized: sourceHashes.authorized, schema: sourceHashes.schema },
    }
    return expected
  })
  const expectedMap = uniqueMap(expectedRecords, 'authoritative plan')
  assert.equal(expectedMap.size, 74)

  const targetMap = uniqueMap(actual.targets.records, 'targets')
  const snapshotMap = uniqueMap(actual.snapshot.records, 'snapshot')
  const rollbackMap = uniqueMap(actual.rollback.records, 'rollback')
  const compatibilityMap = uniqueMap(actual.compatibility.records, 'audit compatibility')
  for (const [label, map] of [['targets', targetMap], ['snapshot', snapshotMap], ['rollback', rollbackMap], ['audit compatibility', compatibilityMap]]) {
    assert.equal(map.size, 74, `${label}: expected 74 records`)
    sameKeys(expectedMap, map, label)
  }

  for (const [decisionId, expected] of expectedMap) {
    const target = targetMap.get(decisionId)
    for (const [field, value] of Object.entries(expected)) assert.deepEqual(target[field], value, `targets.${decisionId}.${field} authority mismatch`)
    assert.deepEqual(snapshotMap.get(decisionId), target, `snapshot.${decisionId} disagrees with targets`)
    const rollback = rollbackMap.get(decisionId)
    assert.deepEqual({decision_id:rollback.decision_id,run_id:rollback.run_id,book_id:rollback.book_id,segment_key:rollback.segment_key,original_approval_status:rollback.original_approval_status,intended_applied_approval_status:rollback.intended_applied_approval_status,identity_sha256:rollback.identity_sha256},{decision_id:expected.decision_id,run_id:expected.run_id,book_id:expected.book_id,segment_key:expected.segment_key,original_approval_status:expected.current_approval_status,intended_applied_approval_status:expected.intended_resulting_approval_status,identity_sha256:identityHash(expected)},`rollback.${decisionId} authority mismatch`)
    const compatibility = compatibilityMap.get(decisionId)
    assert.deepEqual(compatibility,{decision_id:expected.decision_id,application_event_key:eventKey(expected,'status-advanced'),rollback_event_key:eventKey(expected,'status-rollback')},`audit compatibility.${decisionId} authority mismatch`)
    assert.equal(target.identity_sha256, identityHash(expected))
    assert.equal(target.recomputed_normalized_content_sha256, null)
    assert.equal(target.stored_digest_matches_recomputed, null)
    assert.equal(target.baseline_complete, false)
    assert.equal(Object.hasOwn(target, 'content'), false, 'full content leakage')
  }

  for (const [label, records] of [['targets', actual.targets.records], ['snapshot', actual.snapshot.records], ['rollback', actual.rollback.records], ['audit compatibility', actual.compatibility.records]]) {
    assert.deepEqual(records.map(record => record.decision_id), [...records].map(record => record.decision_id).sort(), `${label}: noncanonical ordering`)
  }
  assert.equal(actual.projection.content_normalization.algorithm, CONTENT_NORMALIZATION_ALGORITHM)
  assert(actual.drift.classifications.STORED_CONTENT_DIGEST_MISMATCH.blocks_execution)
  assert(actual.drift.classifications.STORED_CONTENT_DIGEST_MISMATCH.blocks_rollback)
  assert.equal(actual.evidence.content_integrity_authority_approved, false)
  assert.equal(actual.evidence.application_preflight_ready, false)
  assert.equal(actual.evidence.rollback_baseline_ready, false)
  for (const key of artifactOrder) assert.equal(manifest.artifact_hashes[`${key}_sha256`], canonicalJsonSha256FromValue(actual[key]), `stale ${key} manifest hash`)
  assert.deepEqual(manifest.source_hashes, actual.evidence.source_hashes)
  const scan = JSON.stringify({ actual, manifest }).toLowerCase()
  assert.doesNotMatch(scan, /https?:\/\//)
  assert.doesNotMatch(scan, /(service_role_key|password|bearer\s+[a-z0-9])/)
  assert.doesNotMatch(scan, /\b(update|delete from|insert into)\s+content_staging\.reading_segments/)
  return { valid: true, target_count: 74, complete_baseline_count: 0, validator_imports_builder_functions: false }
}
if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(await validate(), null, 2))
