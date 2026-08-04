import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { HASH_ALGORITHMS, canonicalJsonSha256, canonicalJsonSha256FromValue } from './hash_utils.mjs'
export const readJson = async (p) => JSON.parse(await readFile(p, 'utf8'))
export const summarize = (p) => Object.fromEntries(['reviewed_count','unresolved_count','pending_count','public_decision_count','completed_packet_count','pending_packet_count'].map((k)=>[k,p.totals[k]]))
export const validateProgressIntegration = async ({ currentPath='content/migration/reading-segment-source-review-progress-current.json', decisionsPath='content/migration/reading-segment-remaining-no-anchor-backlog-adjudication-decisions.json', evidencePath='content/migration/reading-segment-remaining-no-anchor-backlog-progress-integration-evidence.json' } = {}) => {
 const [policy, decisions, _pr46Policy, plan, _historical, current, pr44, corpus, evidence] = await Promise.all([
  readJson('content/migration/reading-segment-remaining-no-anchor-backlog-progress-integration-policy.json'), readJson(decisionsPath), readJson('content/migration/reading-segment-remaining-no-anchor-backlog-adjudication-policy.json'), readJson('content/migration/reading-segment-remaining-no-anchor-backlog-integration-plan.json'), readJson('content/migration/reading-segment-source-review-progress.json'), readJson(currentPath), readJson('content/migration/reading-segment-no-anchor-ambiguous-adjudication-decisions.json'), readJson('content/migration/reading-segment-no-anchor-discovery-corpus.json'), readJson(evidencePath)])
 const errors=[]; const add=(m)=>errors.push(m)
 if(policy.rights_status!=='credited-source-edition'||current.status!=='remaining-no-anchor-backlog-progress-integrated-not-applied'||evidence.status!==current.status) add('policy/current/evidence identity differs')
 if(evidence.hash_algorithm!==HASH_ALGORITHMS.canonicalJsonSha256) add('wrong hash algorithm')
 const ds=decisions.decisions||[]; if(ds.length!==63) add('missing or extra PR-0046 decisions')
 if(decisions.rights_status!=='credited-source-edition'||decisions.contains_full_text!==false||decisions.contains_source_excerpt!==false||evidence.contains_private_evidence!==false) add('rights or source/private evidence flags differ')
 const corpusById=new Map((corpus.items||[]).map((i)=>[i.discovery_item_id,i]));
 const ids=new Set(), segs=new Set(), ident=new Set(); const byPacket=new Map(), outcomes={}, conf={}, books={}
 for(const d of ds){ ids.add(d.decision_id); segs.add(d.segment_key); ident.add(`${d.packet_id}::${d.segment_key}`); byPacket.set(d.packet_id,(byPacket.get(d.packet_id)||0)+1); outcomes[d.selected_outcome]=(outcomes[d.selected_outcome]||0)+1; conf[d.reviewer_confidence]=(conf[d.reviewer_confidence]||0)+1; books[String(d.book_id)]=(books[String(d.book_id)]||0)+1
  if(d.source_text_included!==false||d.source_excerpt_included!==false||d.private_evidence_included!==false) add(`${d.decision_id}: source/private evidence leaked`)
  if(d.boundary_approved!==false||d.database_change_applied!==false||d.content_loaded!==false||d.cutover_enabled!==false) add(`${d.decision_id}: boundary violation`)
  const item=corpusById.get(d.discovery_item_id); const scores=(item?.pair_candidates||[]).map((x)=>x.pair_score); if(!scores.length || scores.filter((x)=>x===Math.max(...scores)).length!==1 || d.selected_pair?.pair_score!==Math.max(...scores)) add(`${d.decision_id}: top-score tie or missing score`)
 }
 if(ids.size!==ds.length||segs.size!==ds.length||ident.size!==ds.length) add('duplicate decisions or segment identities')
 const pr44Segs=new Set((pr44.decisions||[]).map((d)=>d.segment_key)); if(ds.some((d)=>pr44Segs.has(d.segment_key))) add('PR-0044 overlap detected')
 const input=evidence.input_state; if(JSON.stringify(input)!==JSON.stringify(plan.current_state)) add('wrong pre-integration state')
 const pendingBeforeByPacket=Object.fromEntries(evidence.packet_status_changes.map((c)=>[c.packet_id,c.before.pending_count]));
 if(byPacket.size!==8) add('wrong represented packet count')
 for(const [pid,count] of byPacket) if(pendingBeforeByPacket[pid]!==count) add(`${pid}: decision count did not equal pre-integration pending count`)
 const resolved=ds.filter((d)=>d.selected_outcome!=='unresolved').length, unresolved=ds.length-resolved
 const expectedDelta={reviewed_count:resolved, unresolved_count:unresolved, pending_count:-ds.length, public_decision_count:ds.length, completed_packet_count:8, pending_packet_count:-8}
 for(const [k,v] of Object.entries(expectedDelta)) if(evidence.derived_delta?.[k]!==v) add(`${k}: wrong delta`)
 for(const [k,v] of Object.entries(plan.projected_state)) if(current.totals[k]!==v || evidence.output_state?.[k]!==v) add(`${k}: wrong post-integration state`)
 if(current.totals.public_decision_count!==144 || current.totals.public_decision_count!==current.totals.reviewed_count+current.totals.unresolved_count) add('incorrect public decision count')
 if(evidence.public_decisions_added?.length!==63 || new Set(evidence.public_decisions_added.map((d)=>d.decision_id)).size!==63) add('duplicate or missing added public decisions')
 if(evidence.preservation_assertions?.prior_public_decision_count_preserved!==true || evidence.preservation_assertions?.total_public_decision_count!==144) add('dropped historical decisions')
 const completed=current.packets.filter((p)=>p.pending_count===0).length, pending=current.packets.filter((p)=>p.pending_count>0).length
 if(completed!==16||pending!==0||current.totals.completed_packet_count!==completed||current.totals.pending_packet_count!==pending) add('wrong packet completion')
 for(const p of current.packets){ if(p.pending_count+p.reviewed_count+p.unresolved_count!==p.item_count) add(`${p.packet_id}: packet structure mismatch`); if(p.pending_count===0 && !p.status.startsWith('review-completed')) add(`${p.packet_id}: complete packet has wrong status`) }
 const hashes=evidence.input_hashes||{}; if(hashes.historical_progress_sha256!==await canonicalJsonSha256('content/migration/reading-segment-source-review-progress.json')) add('historical hash mismatch')
 if(hashes.pr0046_adjudication_decisions_sha256!==await canonicalJsonSha256(decisionsPath)) add('decision hash mismatch')
 if(hashes.pr0046_adjudication_policy_sha256!==await canonicalJsonSha256('content/migration/reading-segment-remaining-no-anchor-backlog-adjudication-policy.json')) add('policy hash mismatch')
 if(hashes.pr0046_integration_plan_sha256!==await canonicalJsonSha256('content/migration/reading-segment-remaining-no-anchor-backlog-integration-plan.json')) add('plan hash mismatch')
 if(hashes.pr0047_integration_policy_sha256!==await canonicalJsonSha256('content/migration/reading-segment-remaining-no-anchor-backlog-progress-integration-policy.json')) add('PR-0047 policy hash mismatch')
 if(evidence.post_integration_current_progress_sha256!==await canonicalJsonSha256(currentPath)) add('post current hash mismatch')
 const semanticHash=canonicalJsonSha256FromValue(current); if(semanticHash!==evidence.post_integration_current_progress_sha256) add('canonical current hash mismatch')
 for(const [k,v] of Object.entries(policy.integration_boundary||{})){ if(['cumulative_progress_updated'].includes(k)){ if(v!==true) add(`${k}: must be true`) } else if(v!==false) add(`${k}: boundary must be false`) }
 if(errors.length){ const e=new Error(errors.join('\n')); e.errors=errors; throw e }
 return { decisionCount:ds.length, resolved, unresolved, outcomes, conf, books, packets:Object.fromEntries(byPacket), state:summarize(current) }
}
export const validate = async()=>{ try{ const r=await validateProgressIntegration(); console.log('Validated remaining no-anchor backlog progress integration.'); console.log(JSON.stringify(r, null, 2)) } catch(e){ console.error('Remaining no-anchor backlog progress integration validation failed:'); for(const m of e.errors||[e.message]) console.error(`- ${m}`); process.exit(1) } }
if(import.meta.url===pathToFileURL(process.argv[1]).href) await validate()
