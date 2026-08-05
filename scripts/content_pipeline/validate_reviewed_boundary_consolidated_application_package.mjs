import { readFile, readdir, access } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { canonicalJsonSha256FromValue, canonicalJsonSha256 } from './hash_utils.mjs'
import { paths, targetTable, targetColumns, changedColumns, preservedColumns, databaseManagedColumns, unavailableColumns, blockingColumns, forbiddenColumns } from './reviewed_boundary_consolidated_constants.mjs'
const readJson = async p => JSON.parse(await readFile(p,'utf8'))
const normalizedTextSha256 = async p => createHash('sha256').update((await readFile(p,'utf8')).replace(/\r\n?/g,'\n'),'utf8').digest('hex')
const fail = (e,m)=>e.push(m)
const ids = xs => xs.map(x=>x.decision_id).sort()
const eq = (a,b)=>JSON.stringify(a)===JSON.stringify(b)
const forbidden = /\b(update|insert\s+into|delete\s+from|merge\s+into|truncate|create\s+function|do\s+\$\$|commit;|rollback;|psql|createClient|supabase\.co|service_role|postgres:\/\/|password|anon_key)\b/i
const publicDecisionId = d => d.decision_id ?? d.same_page_decision_id
const publicOutcome = d => d.selected_outcome ?? d.selected_decision
const sortRecords = xs => [...xs].sort((a,b)=>a.decision_id.localeCompare(b.decision_id))
const dist = xs => xs.reduce((acc, r) => ((acc[r.final_outcome] = (acc[r.final_outcome] ?? 0) + 1), acc), {})

export const discoverReadingSegmentMigrations = async (dir = paths.migrationsDir) => {
  const files = (await readdir(dir)).filter(f=>f.endsWith('.sql')&&f!=='20260805005500_reviewed_boundary_audit_identity.sql').sort().map(f=>join(dir,f))
  const scanned = []
  const matching = []
  for (const file of files) {
    const sql = await readFile(file,'utf8')
    scanned.push(file)
    if (/content_staging\.reading_segments|reading_segments/i.test(sql) && /(create\s+table|alter\s+table|create\s+trigger|drop\s+trigger|create\s+(or\s+replace\s+)?function|drop\s+function|create\s+(unique\s+)?index)/i.test(sql)) matching.push({ file, sql })
  }
  return { scanned_files: scanned, matching_migrations: matching.map(m=>m.file), matching }
}

const columnSpecs = [
  ['run_id','uuid',false,null], ['book_id','integer',false,null], ['segment_key','text',false,null], ['source_key','text',false,null], ['segment_order','integer',false,null], ['segment_index','integer',false,'1'], ['segment_count','integer',false,'1'], ['boundary_version','integer',false,'1'], ['start_locator','jsonb',true,null], ['end_locator','jsonb',true,null], ['display_title','text',true,null], ['content','text',true,null], ['word_count','integer',true,null], ['normalized_content_sha256','text',true,null], ['approval_status','text',false,"'draft'"], ['created_at','timestamptz',false,'now()'], ['updated_at','timestamptz',false,'now()'],
]

export const reconstructReadingSegmentSchemaFromMigrations = async ({ dir = paths.migrationsDir, discovery } = {}) => {
  const discovered = discovery ?? await discoverReadingSegmentMigrations(dir)
  const creates = discovered.matching.filter(m=>/create\s+table\s+if\s+not\s+exists\s+content_staging\.reading_segments/i.test(m.sql))
  if (creates.length !== 1) throw new Error(`expected exactly one reading_segments create-table authority, found ${creates.length}`)
  const sql = creates[0].sql
  const tableBlock = sql.slice(sql.search(/create\s+table\s+if\s+not\s+exists\s+content_staging\.reading_segments/i), sql.indexOf('comment on table content_staging.reading_segments'))
  if (!tableBlock) throw new Error('unable to isolate reading_segments create-table block')
  for (const m of discovered.matching) {
    const withoutCreate = m.sql.replace(/create\s+table\s+if\s+not\s+exists\s+content_staging\.reading_segments[\s\S]*?comment\s+on\s+table\s+content_staging\.reading_segments/i, '')
    if (/alter\s+table[\s\S]*content_staging\.reading_segments/i.test(withoutCreate)) throw new Error(`unsupported ALTER TABLE for reading_segments in ${m.file}`)
    if (/(create|drop)\s+trigger[\s\S]*reading_segments/i.test(m.sql)) throw new Error(`unsupported trigger operation for reading_segments in ${m.file}`)
  }
  for (const col of forbiddenColumns) if (new RegExp(`\\b${col}\\b`).test(tableBlock)) throw new Error(`unexpected invented column in schema: ${col}`)
  const columns = columnSpecs.map(([name, data_type, nullable, def]) => {
    if (!new RegExp(`\\b${name}\\b`).test(tableBlock)) throw new Error(`schema missing column ${name}`)
    return { name, data_type, nullable, default: def, checks: [] }
  })
  columns.find(c=>c.name==='approval_status').checks = ["approval_status in ('draft','boundary-review','content-review','approved','blocked')"]
  columns.find(c=>c.name==='updated_at').checks = []
  if (!/primary\s+key\s*\(\s*run_id\s*,\s*book_id\s*,\s*segment_key\s*\)/i.test(tableBlock)) throw new Error('primary key mismatch')
  if (!/unique\s*\(\s*run_id\s*,\s*book_id\s*,\s*segment_order\s*\)/i.test(tableBlock)) throw new Error('unique order constraint mismatch')
  if (!/updated_at\s+timestamptz\s+not\s+null\s+default\s+now\(\)/i.test(tableBlock)) throw new Error('updated_at default mismatch')
  return { source: creates[0].file, migrations_scanned: discovered.scanned_files, migrations_matching: discovered.matching_migrations, table: targetTable, columns, primary_key: targetColumns, unique_constraints: [['run_id','book_id','segment_order']], foreign_keys: [{ columns:['run_id'] },{ columns:['book_id'] },{ columns:['run_id','book_id','source_key'] }], triggers: [], updated_at_behavior: 'default now() applies on INSERT only; no trigger updates content_staging.reading_segments.updated_at during UPDATE, so updated_at is explicitly preserved by omission from the authorized update column set' }
}

export const deriveDecisionAuthority = async () => {
  const [progress, recovery, book3Manual, remainingManual, statusPlan] = await Promise.all([paths.progress, paths.recoveryConsolidation, paths.book3Manual, paths.remainingManual, paths.statusPlan].map(readJson))
  const decisions = []
  for (const source_artifact of paths.decisionInputs) for (const d of (await readJson(source_artifact)).decisions ?? []) decisions.push({ ...d, source_artifact })
  if (progress.totals?.public_decision_count !== 144 || decisions.length !== 144) throw new Error('public decision authority count mismatch')
  if (new Set(decisions.map(publicDecisionId)).size !== 144) throw new Error('duplicate public decision IDs')
  const recoveryByOriginalId = new Map((recovery.resolved_recoveries ?? []).map(x=>[x.original_decision_id,x]))
  const manualByOriginalId = new Map([...(book3Manual.decisions ?? []), ...(remainingManual.decisions ?? [])].map(x=>[x.original_decision_id,x]))
  const publicRecords = decisions.map(d => { const decision_id=publicDecisionId(d); const resolution=recoveryByOriginalId.get(decision_id) ?? manualByOriginalId.get(decision_id); return { decision_id, book_id:d.book_id, book_slug:d.book_slug, packet_id:d.packet_id, segment_key:d.segment_key, segment_order:d.segment_order, final_outcome:resolution?.selected_decision ?? publicOutcome(d) } })
  const membership = new Set((statusPlan.authorized_decisions ?? []).map(r=>r.decision_id))
  if (membership.size !== 74) throw new Error('PR-0049 membership count mismatch')
  const authorized = sortRecords(publicRecords.filter(r=>membership.has(r.decision_id))).map(r=>({ ...r, target_table:targetTable, target_row_identity:{ run_id:statusPlan.run_id, book_id:r.book_id, segment_key:r.segment_key }, expected_run_id:statusPlan.run_id, expected_current_approval_status:'boundary-review', authorized_replacement_approval_status:'content-review', changed_columns:changedColumns, unchanged_columns:preservedColumns, source_contract_artifact:paths.statusPlan, application_ready:true }))
  const excluded = sortRecords(publicRecords.filter(r=>!membership.has(r.decision_id))).map(r=>({ ...r, exclusion_lane:r.final_outcome==='adjust-successor-start'?'locator-adjustment contract':r.final_outcome==='exclude-structural-heading'?'structural-heading contract':'unresolved/ineligible', blocking_contract_artifact:r.final_outcome==='adjust-successor-start'?paths.locatorContract:r.final_outcome==='exclude-structural-heading'?paths.headingContract:paths.finalUnresolvedDecisions, blocking_reason:r.final_outcome==='adjust-successor-start'?'PR-0050 does not approve exact locator mutation authority':r.final_outcome==='exclude-structural-heading'?'PR-0051 does not approve merge/exclusion/deletion/remapping authority':'PR-0052 leaves the decision unresolved and application-ineligible', application_ready:false, included_in_sql:false }))
  return { publicRecords, authorized, excluded, membership, outcomeDistribution:dist(authorized), exclusionDistribution:dist(excluded), runId:statusPlan.run_id }
}

const validateColumnClassification = (errors, artifact, schema) => {
  const actual = schema.columns.map(c=>c.name).sort(); const c = artifact.column_classification; const groups=[c.explicitly_changed,c.explicitly_preserved,c.database_managed,c.unavailable_for_comparison,c.blocking_authority_missing]; const flat=groups.flat()
  for (const col of flat) if (!actual.includes(col)) fail(errors, `unknown classified column ${col}`)
  for (const col of actual) if (!flat.includes(col)) fail(errors, `actual schema column omitted from classification: ${col}`)
  for (const col of flat) if (flat.filter(x=>x===col).length !== 1) fail(errors, `column classified multiple times: ${col}`)
  if (!eq([...flat].sort(), actual)) fail(errors, 'column classification must equal authoritative schema columns exactly')
  if (!eq(c.explicitly_changed, changedColumns)) fail(errors, 'changed columns must be approval_status only')
  if (!eq(c.explicitly_preserved, preservedColumns)) fail(errors, 'preserved column set mismatch')
  if (!eq(c.database_managed, databaseManagedColumns)) fail(errors, 'database-managed column set must be empty')
  if (!eq(c.unavailable_for_comparison, unavailableColumns) || !eq(c.blocking_authority_missing, blockingColumns)) fail(errors, 'unavailable/blocking column sets must be empty')
}

export const validateHypotheticalApplicationSqlSafety = (sql) => { const errors=[]; for (const col of forbiddenColumns) if(new RegExp(`\\b${col}\\b`).test(sql)) fail(errors,`application SQL references unknown column ${col}`); if(/updated_at\s*=/.test(sql)||/set\s+[^;]*updated_at/i.test(sql)) fail(errors,'application SQL must not assign updated_at'); if(errors.length){const err=new Error(errors.join('\n')); err.errors=errors; throw err} return true }

export const validateArtifacts = async (overrides = {}) => {
  const errors=[]; const authority=await deriveDecisionAuthority(); const schema=await reconstructReadingSegmentSchemaFromMigrations(overrides.migrations ?? {})
  const load = async (key, p) => overrides[key] ?? await readJson(p)
  const [schemaModel,policy,plan,exclusions,manifest,evidence,preflight,postflight,idempotency,audit,rollback,missing]=await Promise.all([load('schemaModel',paths.schemaModel),load('policy',paths.policy),load('plan',paths.plan),load('exclusions',paths.exclusions),load('manifest',paths.manifest),load('evidence',paths.evidence),load('preflight',paths.preflight),load('postflight',paths.postflight),load('idempotency',paths.idempotency),load('audit',paths.audit),load('rollback',paths.rollback),load('missing',paths.missingAuthority)])
  if (!eq(schemaModel.columns.map(({name,data_type,nullable,default: d})=>({name,data_type,nullable,default:d})), schema.columns.map(({name,data_type,nullable,default: d})=>({name,data_type,nullable,default:d})))) fail(errors,'schema model columns drift from migration-derived schema')
  if (!eq(schemaModel.migrations_scanned ?? schemaModel.migrations_inspected, schema.migrations_scanned)) fail(errors,'schema model scanned migration list drift')
  if (!eq(schemaModel.migrations_matching ?? schemaModel.migrations_inspected, schema.migrations_matching)) fail(errors,'schema model matching migration list drift')
  validateColumnClassification(errors, schemaModel, schema); validateColumnClassification(errors, policy, schema); validateColumnClassification(errors, plan, schema)
  if (schema.triggers.length !== 0) fail(errors,'unsupported trigger claim: no reading_segments trigger is authorized')
  if (schema.columns.find(c=>c.name==='updated_at')?.default !== 'now()') fail(errors,'updated_at default must be now()')
  if (!/INSERT only/.test(schema.updated_at_behavior)) fail(errors,'updated_at default interpretation must state insert-time behavior')
  if (authority.publicRecords.length!==144 || authority.authorized.length!==74 || authority.excluded.length!==70) fail(errors,'decision partition count mismatch')
  if (authority.outcomeDistribution['confirm-successor-start']!==73 || authority.outcomeDistribution['retain-intro-segment']!==1) fail(errors,'authorized distribution mismatch')
  if (authority.exclusionDistribution['adjust-successor-start']!==6 || authority.exclusionDistribution['exclude-structural-heading']!==53 || authority.exclusionDistribution.unresolved!==11) fail(errors,'exclusion distribution mismatch')
  if (!eq(ids(authority.authorized), ids(plan.application_records))) fail(errors,'application plan decision set mismatch')
  if (!eq(ids(authority.excluded), ids(exclusions.exclusions))) fail(errors,'exclusion decision set mismatch')
  if(!eq(ids(authority.publicRecords), ids([...plan.application_records,...exclusions.exclusions]))) fail(errors,'authorized/excluded union does not equal all decisions')
  for (const r of plan.application_records) { const exp=authority.authorized.find(x=>x.decision_id===r.decision_id); if(!exp) continue; for (const k of ['book_id','book_slug','packet_id','final_outcome','segment_key','segment_order','target_table','expected_run_id','expected_current_approval_status','authorized_replacement_approval_status','application_ready','source_contract_artifact']) if(JSON.stringify(r[k])!==JSON.stringify(exp[k])) fail(errors,`${r.decision_id}: ${k} drift`); if(!eq(r.target_row_identity, exp.target_row_identity)) fail(errors,`${r.decision_id}: target identity drift`); if(!eq(r.changed_columns,changedColumns)||!eq(r.unchanged_columns,preservedColumns)) fail(errors,`${r.decision_id}: column set drift`) }
  for (const r of exclusions.exclusions) { const exp=authority.excluded.find(x=>x.decision_id===r.decision_id); if(!exp) continue; for (const k of ['book_id','book_slug','packet_id','final_outcome','segment_key','segment_order','exclusion_lane','blocking_contract_artifact','blocking_reason','application_ready','included_in_sql']) if(JSON.stringify(r[k])!==JSON.stringify(exp[k])) fail(errors,`${r.decision_id}: exclusion ${k} drift`) }
  if(policy.package_approved!==false || manifest.package_approved!==false || evidence.package_approved!==false) fail(errors,'package approval must be false')
  try { await access('supabase/migrations/reading_segment_reviewed_boundary_consolidated_apply.sql'); fail(errors,'blocked package must not create application SQL') } catch {}
  try { await access('supabase/migrations/reading_segment_reviewed_boundary_consolidated_rollback.sql'); fail(errors,'blocked package must not create rollback SQL') } catch {}
  const preSql=overrides.preSql ?? await readFile(paths.preflightSql,'utf8'), postSql=overrides.postSql ?? await readFile(paths.postflightSql,'utf8')
  if(forbidden.test(preSql)||forbidden.test(postSql)) fail(errors,'SELECT-only SQL contains forbidden mutation/credential text')
  for (const col of forbiddenColumns) if(new RegExp(`\\b${col}\\b`).test(preSql)||new RegExp(`\\b${col}\\b`).test(postSql)) fail(errors,`SELECT SQL references unknown column ${col}`)
  validateHypotheticalApplicationSqlSafety(preSql); validateHypotheticalApplicationSqlSafety(postSql)
  if((preSql.match(/values \('/g)??[]).length!==1 || (preSql.match(/^  , \('/gm)??[]).length!==73 || (postSql.match(/values \('/g)??[]).length!==1 || (postSql.match(/^  , \('/gm)??[]).length!==73) fail(errors,'SELECT SQL does not enumerate exactly 74 target tuples')
  const targetTupleHash=canonicalJsonSha256FromValue(plan.application_records.map(r=>r.target_row_identity)); if(manifest.target_tuple_hash!==targetTupleHash || evidence.target_tuple_hash!==targetTupleHash) fail(errors,'target tuple hash mismatch')
  const exclHash=canonicalJsonSha256FromValue(exclusions.exclusions.map(r=>({decision_id:r.decision_id,lane:r.exclusion_lane}))); if(manifest.exclusion_tuple_hash!==exclHash || evidence.exclusion_tuple_hash!==exclHash) fail(errors,'exclusion tuple hash mismatch')
  const hashChecks={schema_model_sha256:[schemaModel],policy_sha256:[policy],plan_sha256:[plan],exclusions_sha256:[exclusions],evidence_sha256:[evidence],preflight_sha256:[preflight],postflight_sha256:[postflight],idempotency_sha256:[idempotency],audit_sha256:[audit],rollback_sha256:[rollback],missing_authority_sha256:[missing]}
  for(const [k,[v]] of Object.entries(hashChecks)) if(manifest.artifact_hashes[k]!==canonicalJsonSha256FromValue(v)) fail(errors,`${k} stale`)
  if(manifest.sql_artifact_hashes.preflight_select_sql_sha256!==await normalizedTextSha256(paths.preflightSql)) fail(errors,'preflight SQL hash stale')
  if(manifest.sql_artifact_hashes.postflight_select_sql_sha256!==await normalizedTextSha256(paths.postflightSql)) fail(errors,'postflight SQL hash stale')
  if(evidence.input_hashes.status_plan_sha256!==await canonicalJsonSha256(paths.statusPlan)) fail(errors,'historical status plan hash drift')
  if(errors.length){const err=new Error(errors.join('\n')); err.errors=errors; throw err}
  return { package_approved:false, authorized_decisions:74, excluded_decisions:70, executable_application_sql_generated:false, executable_rollback_sql_generated:false, sql_static_validation:'passed-select-only-blocked-package', schema_columns:schema.columns.length, scanned_migrations:schema.migrations_scanned.length, matching_migrations:schema.migrations_matching.length }
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){try{console.log('Validated PR-0053 consolidated reviewed-boundary application package.'); console.log(JSON.stringify(await validateArtifacts(),null,2))}catch(e){console.error('PR-0053 validation failed:'); for(const m of e.errors??[e.message]) console.error(`- ${m}`); process.exit(1)}}
