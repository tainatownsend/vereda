import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import {canonicalJsonSha256} from './hash_utils.mjs'
import {paths,evidencePath,classes,evidenceFields,evidenceHashContract} from './reviewed_boundary_runtime_integrity_constants.mjs'
import {containsForbidden,identityKey} from './reviewed_boundary_runtime_integrity.mjs'

// Independent implementation of reviewed-boundary-runtime-evidence-hash-v1.
// It intentionally imports neither finalizeEvidence nor evidenceHash.
const canonicalize=value=>Array.isArray(value)?value.map(canonicalize):value!==null&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonicalize(value[key])])):value
export const recomputeEvidenceHash=e=>{const projection=Object.fromEntries(Object.entries(e).filter(([key])=>key!=='evidence_sha256'));return createHash('sha256').update(JSON.stringify(canonicalize(projection)),'utf8').digest('hex')}
const exactKeys=(value,keys,label)=>assert.deepEqual(Object.keys(value).sort(),[...keys].sort(),`${label} must be a closed world`)

export async function validateEvidence(e,_path=evidencePath){
 const manifest=JSON.parse(await readFile(paths.manifest,'utf8'))
 exactKeys(e,evidenceFields,'evidence')
 assert.equal(e.evidence_hash_contract,evidenceHashContract)
 assert.match(e.evidence_sha256,/^[a-f0-9]{64}$/,'evidence_sha256 must be lowercase SHA-256')
 assert.equal(e.evidence_schema_version,'pr0058-runtime-evidence-v1');assert.equal(e.expected_target_count,74);assert.notEqual(e.collector_mode,'blocked');assert.notEqual(e.collector_mode,'production-readonly');assert.ok(['fixture','staging-readonly'].includes(e.collector_mode));assert.equal(e.package_manifest_hash,await canonicalJsonSha256(paths.manifest));assert.deepEqual(e.source_input_hashes,manifest.source_hashes)
 exactKeys(e.redacted_database_identity,['fingerprint_sha256','database_name_sha256'],'redacted database identity')
 assert.equal(e.application_mutation_count,0);assert.equal(e.rollback_mutation_count,0);assert.equal(e.audit_insertion_count,0);assert.equal(e.unauthorized_mutation_count,0);assert.equal(e.full_content_persisted,false);assert.match(e.read_only_transaction_result,/^READ_ONLY_/);assert.equal(e.targets.length,74);assert.equal(new Set(e.targets.map(identityKey)).size,74);assert.equal(e.observed_target_count+e.missing_target_count,74);assert.equal(Object.values(e.classification_counts).reduce((a,b)=>a+b,0),74);assert.deepEqual(Object.keys(e.classification_counts),classes);assert.equal(e.digest_match_count+e.digest_mismatch_count+e.missing_target_count,74);assert.equal(containsForbidden(e),false,'secret or full content found')
 const success=['STAGING_PREFLIGHT_MATCHED','STAGING_PREFLIGHT_ALREADY_APPLIED'].includes(e.package_preflight_result);if(success){assert.equal(e.observed_target_count,74);assert.equal(e.complete_integrity_baseline_count,74);assert.equal(e.digest_match_count,74);assert.equal(e.missing_target_count+e.duplicate_target_count+e.unauthorized_target_count,0)}
 assert.equal(e.evidence_sha256,recomputeEvidenceHash(e),'canonical evidence digest mismatch');return true
}
if(import.meta.url===`file://${process.argv[1]}`){const p=process.argv[2]??evidencePath;await validateEvidence(JSON.parse(await readFile(p,'utf8')),p);console.log(`runtime evidence valid: ${p}`)}
