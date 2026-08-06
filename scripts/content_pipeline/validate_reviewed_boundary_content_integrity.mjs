import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { canonicalJsonSha256, canonicalJsonSha256FromValue } from './hash_utils.mjs'
import { paths, sources, artifactOrder } from './reviewed_boundary_content_integrity_constants.mjs'
const readJson=async p=>JSON.parse(await readFile(p,'utf8'))
export async function validate(){
 const actual={};for(const k of artifactOrder)actual[k]=await readJson(paths[k])
 const manifest=await readJson(paths.manifest);assert.equal(actual.targets.records.length,74);assert.equal(new Set(actual.targets.records.map(r=>r.decision_id)).size,74);assert.equal(new Set(actual.targets.records.map(r=>`${r.run_id}:${r.book_id}:${r.segment_key}`)).size,74)
 const [plan,decisions]=await Promise.all([readJson(sources.authorized),readJson(sources.decisions)]);assert.equal(plan.authorized_decision_count,74);assert.equal(plan.application_records.length,74);assert.equal(decisions.totals.public_decision_count,144)
 for(const r of plan.application_records){assert.deepEqual(r.changed_columns,['approval_status']);assert.match(r.final_outcome,/^(confirm-successor-start|retain-intro-segment)$/);assert.equal(r.expected_current_approval_status,'boundary-review');assert.equal(r.authorized_replacement_approval_status,'content-review')}
 const sourceHashes={};for(const [name,p] of Object.entries(sources))sourceHashes[name]=p.endsWith('.json')?await canonicalJsonSha256(p):createHash('sha256').update((await readFile(p,'utf8')).replace(/\r\n?/g,'\n')).digest('hex');assert.deepEqual(manifest.source_hashes,sourceHashes,'stale source hash')
 assert.deepEqual(actual.targets.records,[...actual.targets.records].sort((a,b)=>a.decision_id.localeCompare(b.decision_id)))
 for(const r of actual.targets.records){assert.equal(r.identity_sha256,canonicalJsonSha256FromValue(r.identity_projection));assert.equal(r.boundary_sha256,null);assert.equal(r.content_sha256,null);assert.equal(r.full_pre_application_sha256,null);assert.equal(Object.hasOwn(r,'content'),false,'full content leakage')}
 assert.equal(actual.compatibility.application_event_keys_unique,true);assert.equal(actual.compatibility.application_rollback_keys_distinct,true);assert.equal(actual.evidence.content_integrity_authority_approved,false);assert.equal(actual.evidence.application_preflight_ready,false);assert.equal(actual.evidence.rollback_baseline_ready,false)
 for(const k of artifactOrder)assert.equal(manifest.artifact_hashes[`${k}_sha256`],canonicalJsonSha256FromValue(actual[k]),`stale ${k} manifest hash`)
 assert.deepEqual(manifest.source_hashes,actual.evidence.source_hashes)
 const scan=JSON.stringify({actual,manifest}).toLowerCase();assert.doesNotMatch(scan,/https?:\/\//);assert.doesNotMatch(scan,/(service_role_key|password|bearer\s+[a-z0-9])/);assert.doesNotMatch(scan,/\b(update|delete from|insert into)\s+content_staging\.reading_segments/)
 const schema=await readFile(sources.schema,'utf8');for(const c of ['run_id','book_id','segment_key','source_key','segment_order','segment_index','segment_count','boundary_version','start_locator','end_locator','display_title','content','word_count','normalized_content_sha256','approval_status','created_at','updated_at'])assert.match(schema,new RegExp(`\\b${c}\\b`))
 return {valid:true,target_count:74,complete_baseline_count:0}
}
if(import.meta.url===`file://${process.argv[1]}`)console.log(JSON.stringify(await validate(),null,2))
