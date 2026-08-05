import { readFile, access } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { canonicalJsonSha256FromValue, canonicalJsonSha256 } from './hash_utils.mjs'
import { derivePackage, paths, normalizedTextSha256, authoritativeSchema } from './build_reviewed_boundary_consolidated_application_package.mjs'
const readJson = async p => JSON.parse(await readFile(p,'utf8'))
const fail = (e,m)=>e.push(m)
const ids = xs => xs.map(x=>x.decision_id).sort()
const names = xs => xs.map(x=>x.name)
const eq = (a,b)=>JSON.stringify(a)===JSON.stringify(b)
const forbidden = /\b(update|insert\s+into|delete\s+from|merge\s+into|truncate|create\s+function|do\s+\$\$|commit;|rollback;|psql|createClient|supabase\.co|service_role|postgres:\/\/|password|anon_key)\b/i
const forbiddenColumns = ['source_locator','source_title','source_path','section_id','subsection_id','source_paragraph_index','source_hash']

export const deriveAuthoritativeSchemaFromMigrations = async () => {
  const inspected = ['supabase/migrations/20260803033000_content_staging_foundation.sql']
  const allSql = await Promise.all(inspected.map(p => readFile(p,'utf8')))
  const sql = allSql.join('\n')
  for (const col of ['source_key','segment_index','segment_count','boundary_version','display_title','word_count','normalized_content_sha256']) {
    if (!new RegExp(`\\b${col}\\b`).test(sql)) throw new Error(`schema migration missing ${col}`)
  }
  const tableBlock = sql.slice(sql.indexOf('create table if not exists content_staging.reading_segments'), sql.indexOf('comment on table content_staging.reading_segments'))
  for (const col of forbiddenColumns) if (new RegExp(`\\b${col}\\b`).test(tableBlock)) throw new Error(`unexpected invented column in schema: ${col}`)
  if (/create\s+trigger[\s\S]*reading_segments/i.test(sql)) throw new Error('unexpected reading_segments trigger detected')
  return authoritativeSchema
}

const validateColumnClassification = (errors, artifact, schema) => {
  const actual = names(schema.columns).sort()
  const c = artifact.column_classification
  const groups = [c.explicitly_changed, c.explicitly_preserved, c.database_managed, c.unavailable_for_comparison, c.blocking_authority_missing]
  const flat = groups.flat()
  for (const col of flat) if (!actual.includes(col)) fail(errors, `unknown classified column ${col}`)
  for (const col of actual) if (!flat.includes(col)) fail(errors, `actual schema column omitted from classification: ${col}`)
  for (const col of flat) if (flat.filter(x=>x===col).length !== 1) fail(errors, `column classified multiple times: ${col}`)
  if (!eq([...flat].sort(), actual)) fail(errors, 'column classification must equal authoritative schema columns exactly')
  if (!eq(c.explicitly_changed, ['approval_status'])) fail(errors, 'changed columns must be approval_status only')
  if (!eq(c.database_managed, [])) fail(errors, 'database-managed column set must be empty')
  if (!c.explicitly_preserved.includes('updated_at')) fail(errors, 'updated_at must be explicitly preserved')
  if (c.explicitly_changed.includes('updated_at')) fail(errors, 'updated_at must not be changed')
  for (const required of ['source_key','segment_index','segment_count','boundary_version','display_title','word_count','normalized_content_sha256']) if (!c.explicitly_preserved.includes(required)) fail(errors, `preserved schema column missing: ${required}`)
}

export const validateHypotheticalApplicationSqlSafety = (sql) => {
  const errors = []
  for (const col of forbiddenColumns) if (new RegExp(`\\b${col}\\b`).test(sql)) fail(errors, `application SQL references unknown column ${col}`)
  if (/updated_at\s*=/.test(sql)) fail(errors, 'application SQL must not assign updated_at')
  if (/set\s+[^;]*updated_at/i.test(sql)) fail(errors, 'application SQL SET list must not include updated_at')
  if (errors.length) { const err = new Error(errors.join('\n')); err.errors = errors; throw err }
  return true
}

export const validateArtifacts = async () => {
  const errors=[]; const d=await derivePackage(); const schema=await deriveAuthoritativeSchemaFromMigrations()
  const [schemaModel,policy,plan,exclusions,manifest,evidence,preflight,postflight,idempotency,audit,rollback,missing]=await Promise.all([paths.schemaModel,paths.policy,paths.plan,paths.exclusions,paths.manifest,paths.evidence,paths.preflight,paths.postflight,paths.idempotency,paths.audit,paths.rollback,paths.missingAuthority].map(readJson))
  if (!eq(schemaModel.columns, schema.columns)) fail(errors,'schema model columns drift from migration-derived schema')
  if (schema.table !== 'content_staging.reading_segments') fail(errors,'unknown target table')
  if (!eq(schema.primary_key, ['run_id','book_id','segment_key'])) fail(errors,'wrong primary key columns')
  if (!schema.unique_constraints.some(u=>eq(u,['run_id','book_id','segment_order']))) fail(errors,'wrong unique order constraint')
  if (schema.triggers.length !== 0) fail(errors,'unsupported trigger claim: no reading_segments trigger is authorized')
  if (schema.columns.find(c=>c.name==='updated_at')?.default !== 'now()') fail(errors,'updated_at default must be now()')
  if (!/INSERT only/.test(schema.updated_at_behavior)) fail(errors,'updated_at default interpretation must state insert-time behavior')
  if (/automatically changes|automatically updates|database-managed/.test(schema.updated_at_behavior)) fail(errors,'updated_at behavior must not claim automatic update behavior')
  validateColumnClassification(errors, schemaModel, schema); validateColumnClassification(errors, policy, schema); validateColumnClassification(errors, plan, schema)
  if (d.all.length!==144) fail(errors,'wrong public decision count')
  if (d.authorized.length!==74) fail(errors,'wrong authorized count')
  if (d.excluded.length!==70) fail(errors,'wrong excluded count')
  if (d.outcomeDistribution['confirm-successor-start']!==73 || d.outcomeDistribution['retain-intro-segment']!==1) fail(errors,'wrong authorized distribution')
  if (d.exclusionDistribution['adjust-successor-start']!==6 || d.exclusionDistribution['exclude-structural-heading']!==53 || d.exclusionDistribution.unresolved!==11) fail(errors,'wrong exclusion distribution')
  if (!eq(ids(d.authorized), ids(plan.application_records))) fail(errors,'application plan decision set mismatch')
  if (!eq(ids(d.excluded), ids(exclusions.exclusions))) fail(errors,'exclusion decision set mismatch')
  const allIds=ids(d.all), partIds=ids([...plan.application_records,...exclusions.exclusions]); if(!eq(allIds,partIds)) fail(errors,'authorized/excluded union does not equal all decisions')
  const overlap=ids(plan.application_records).filter(id=>ids(exclusions.exclusions).includes(id)); if(overlap.length) fail(errors,`authorized/excluded overlap: ${overlap.join(',')}`)
  const dupIds = arr => ids(arr).filter((id,i,a)=>a.indexOf(id)!==i); if(dupIds(plan.application_records).length) fail(errors,'duplicate authorized decision IDs')
  const targetKeys=plan.application_records.map(r=>`${r.expected_run_id}:${r.book_id}:${r.segment_key}`); if(new Set(targetKeys).size!==74) fail(errors,'duplicate target rows')
  for (const r of plan.application_records) {
    const exp=d.authorized.find(x=>x.decision_id===r.decision_id); if(!exp) continue
    for (const k of ['book_id','book_slug','packet_id','final_outcome','segment_key','segment_order','target_table','expected_run_id','expected_current_approval_status','authorized_replacement_approval_status']) if(JSON.stringify(r[k])!==JSON.stringify(exp[k])) fail(errors,`${r.decision_id}: ${k} drift`)
    if(!eq(r.changed_columns,['approval_status'])) fail(errors,`${r.decision_id}: changed field drift`)
    for (const col of schemaModel.column_classification.explicitly_preserved) if(!r.unchanged_columns.includes(col)) fail(errors,`${r.decision_id}: missing unchanged ${col}`)
  }
  const statusValues = schema.columns.find(c=>c.name==='approval_status')?.checks?.join(' ') ?? ''
  for (const v of ['draft','boundary-review','content-review','approved','blocked']) if (!statusValues.includes(v)) fail(errors,`unsupported approval status set omits ${v}`)
  if(policy.package_approved!==false || manifest.package_approved!==false || evidence.package_approved!==false) fail(errors,'package approval must be false')
  if(policy.executable_application_sql_generated!==false || policy.executable_rollback_sql_generated!==false) fail(errors,'executable SQL flags must be false')
  try { await access('supabase/migrations/reading_segment_reviewed_boundary_consolidated_apply.sql'); fail(errors,'blocked package must not create application SQL') } catch {}
  try { await access('supabase/migrations/reading_segment_reviewed_boundary_consolidated_rollback.sql'); fail(errors,'blocked package must not create rollback SQL') } catch {}
  if(audit.audit_required!==true || audit.audit_complete!==false) fail(errors,'audit incompleteness not recorded')
  if(idempotency.idempotency_complete!==false) fail(errors,'idempotency must remain incomplete')
  if(rollback.rollback_sql_generated!==false || rollback.rollback_authority_complete!==false) fail(errors,'rollback must remain blocked')
  if((missing.missing_authority??[]).length<3) fail(errors,'missing authority register incomplete')
  if(!missing.missing_authority.some(x=>/normalized_content_sha256/.test(x.blocking_reason) && /hash of content/.test(x.blocking_reason))) fail(errors,'content-hash authority must mention normalized_content_sha256 and content hash')
  for (const required of ['schema objects and constraints exist','exactly 74 target rows exist once by run_id/book_id/segment_key','each target has expected segment_order and boundary-review approval_status']) if(!preflight.checks.includes(required)) fail(errors,`preflight omission: ${required}`)
  for (const required of ['exactly 74 authorized rows have content-review','zero authorized rows remain boundary-review','all 70 excluded decisions are absent from application SQL and unchanged']) if(!postflight.checks.includes(required)) fail(errors,`postflight omission: ${required}`)
  const preSql=await readFile(paths.preflightSql,'utf8'), postSql=await readFile(paths.postflightSql,'utf8')
  if(forbidden.test(preSql) || forbidden.test(postSql)) fail(errors,'SELECT-only SQL contains forbidden mutation/credential text')
  for (const col of forbiddenColumns) if (new RegExp(`\\b${col}\\b`).test(preSql) || new RegExp(`\\b${col}\\b`).test(postSql)) fail(errors,`SELECT SQL references unknown column ${col}`)
  if(/updated_at\s*=/.test(preSql) || /updated_at\s*=/.test(postSql)) fail(errors,'SELECT-only SQL or hypothetical SQL must not assign updated_at')
  if((preSql.match(/values \('/g)??[]).length!==1 || (preSql.match(/^  , \('/gm)??[]).length!==73 || (postSql.match(/values \('/g)??[]).length!==1 || (postSql.match(/^  , \('/gm)??[]).length!==73) fail(errors,'SELECT SQL does not enumerate exactly 74 target tuples')
  if(!/content_staging\.reading_segments/.test(preSql) || !/approval_status/.test(preSql)) fail(errors,'preflight SQL missing target table/status column')
  const targetTupleHash=canonicalJsonSha256FromValue(plan.application_records.map(r=>r.target_row_identity)); if(manifest.target_tuple_hash!==targetTupleHash || evidence.target_tuple_hash!==targetTupleHash) fail(errors,'target tuple hash mismatch')
  const exclHash=canonicalJsonSha256FromValue(exclusions.exclusions.map(r=>({decision_id:r.decision_id,lane:r.exclusion_lane}))); if(manifest.exclusion_tuple_hash!==exclHash || evidence.exclusion_tuple_hash!==exclHash) fail(errors,'exclusion tuple hash mismatch')
  const hashChecks={schema_model_sha256:[paths.schemaModel,schemaModel],policy_sha256:[paths.policy,policy],plan_sha256:[paths.plan,plan],exclusions_sha256:[paths.exclusions,exclusions],evidence_sha256:[paths.evidence,evidence],preflight_sha256:[paths.preflight,preflight],postflight_sha256:[paths.postflight,postflight],idempotency_sha256:[paths.idempotency,idempotency],audit_sha256:[paths.audit,audit],rollback_sha256:[paths.rollback,rollback],missing_authority_sha256:[paths.missingAuthority,missing]}
  for(const [k,[,v]] of Object.entries(hashChecks)) if(manifest.artifact_hashes[k]!==canonicalJsonSha256FromValue(v)) fail(errors,`${k} stale`)
  if(manifest.sql_artifact_hashes.preflight_select_sql_sha256!==await normalizedTextSha256(paths.preflightSql)) fail(errors,'preflight SQL hash stale')
  if(manifest.sql_artifact_hashes.postflight_select_sql_sha256!==await normalizedTextSha256(paths.postflightSql)) fail(errors,'postflight SQL hash stale')
  for(const [k,v] of Object.entries(policy.safety_assertions)) if(v!==false) fail(errors,`${k} safety must be false`)
  if(evidence.input_hashes.status_plan_sha256!==await canonicalJsonSha256(paths.statusPlan)) fail(errors,'historical status plan hash drift')
  const artifactText = JSON.stringify([schemaModel,policy,plan,exclusions,manifest,evidence,preflight,postflight,idempotency,audit,rollback,missing])
  for (const col of forbiddenColumns) if (artifactText.includes(col)) fail(errors,`artifact references invented reading_segments column ${col}`)
  if(errors.length){const err=new Error(errors.join('\n')); err.errors=errors; throw err}
  return { package_approved:false, authorized_decisions:74, excluded_decisions:70, executable_application_sql_generated:false, executable_rollback_sql_generated:false, sql_static_validation:'passed-select-only-blocked-package', schema_columns:schema.columns.length }
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){try{console.log('Validated PR-0053 consolidated reviewed-boundary application package.'); console.log(JSON.stringify(await validateArtifacts(),null,2))}catch(e){console.error('PR-0053 validation failed:'); for(const m of e.errors??[e.message]) console.error(`- ${m}`); process.exit(1)}}
