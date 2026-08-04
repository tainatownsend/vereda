#!/usr/bin/env python3
from __future__ import annotations
import copy,json
from collections import Counter,defaultdict
from datetime import datetime,timezone
from pathlib import Path
from typing import Any
from hash_utils import canonical_json_sha256
ROOT=Path.cwd()
P={
 'policy':ROOT/'content/migration/reading-segment-remaining-no-anchor-backlog-progress-integration-policy.json',
 'decisions':ROOT/'content/migration/reading-segment-remaining-no-anchor-backlog-adjudication-decisions.json',
 'pr46_policy':ROOT/'content/migration/reading-segment-remaining-no-anchor-backlog-adjudication-policy.json',
 'plan':ROOT/'content/migration/reading-segment-remaining-no-anchor-backlog-integration-plan.json',
 'historical':ROOT/'content/migration/reading-segment-source-review-progress.json',
 'current':ROOT/'content/migration/reading-segment-source-review-progress-current.json',
 'pr44':ROOT/'content/migration/reading-segment-no-anchor-ambiguous-adjudication-decisions.json',
 'corpus':ROOT/'content/migration/reading-segment-no-anchor-discovery-corpus.json',
 'evidence':ROOT/'content/migration/reading-segment-remaining-no-anchor-backlog-progress-integration-evidence.json',
 'report':ROOT/'content/migration/reports/reading-segment-remaining-no-anchor-backlog-progress-integration-summary.md'}
def r(p:Path): return json.loads(p.read_text(encoding='utf-8'))
def w(p:Path,v:Any): p.parent.mkdir(parents=True,exist_ok=True); p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
def identity(d): return f"{d['packet_id']}::{d['segment_key']}"
def ensure(c,msg):
 if not c: raise RuntimeError(msg)
def summarize(progress):
 t=progress['totals']; return {k:t[k] for k in ['reviewed_count','unresolved_count','pending_count','public_decision_count','completed_packet_count','pending_packet_count']}
def integrate(current,decisions):
 out=copy.deepcopy(current); packet_d=defaultdict(Counter); pub=[]
 for d in decisions:
  is_unresolved=d['selected_outcome']=='unresolved'
  packet_d[d['packet_id']]['item_count']+=1; packet_d[d['packet_id']]['unresolved_count' if is_unresolved else 'reviewed_count']+=1
  pub.append({'decision_id':d['decision_id'],'adjudication_id':d['adjudication_id'],'discovery_item_id':d['discovery_item_id'],'packet_id':d['packet_id'],'book_id':d['book_id'],'book_slug':d['book_slug'],'segment_key':d['segment_key'],'segment_order':d['segment_order'],'selected_outcome':d['selected_outcome'],'reviewer_confidence':d['reviewer_confidence'],'source_artifact':'content/migration/reading-segment-remaining-no-anchor-backlog-adjudication-decisions.json','review_status':d['review_status']})
 reviewed=sum(v['reviewed_count'] for v in packet_d.values()); unresolved=sum(v['unresolved_count'] for v in packet_d.values()); count=len(decisions)
 out['status']='remaining-no-anchor-backlog-progress-integrated-not-applied'; out['policy_version']='pr-0047-remaining-no-anchor-backlog-progress-integration-v1'
 out['totals']['reviewed_count']+=reviewed; out['totals']['unresolved_count']+=unresolved; out['totals']['pending_count']-=count; out['totals']['public_decision_count']+=count
 out['totals']['no_anchor_prepared_pending_count']=0; out['totals']['remaining_no_anchor_backlog_item_count']=count; out['totals']['remaining_no_anchor_backlog_reviewed_count']=reviewed; out['totals']['remaining_no_anchor_backlog_unresolved_count']=unresolved
 out['totals']['remaining_no_anchor_backlog_confirm_successor_start_count']=sum(1 for d in decisions if d['selected_outcome']=='confirm-successor-start')
 out['totals']['remaining_no_anchor_backlog_adjust_successor_start_count']=sum(1 for d in decisions if d['selected_outcome']=='adjust-successor-start')
 out['totals']['remaining_no_anchor_backlog_merge_with_successor_count']=sum(1 for d in decisions if d['selected_outcome']=='merge-with-successor')
 changes=[]
 for p in out['packets']:
  d=packet_d.get(p['packet_id'])
  before={k:p[k] for k in ['pending_count','reviewed_count','unresolved_count','status']}
  if d:
   ensure(p['pending_count']>=d['item_count'],f"{p['packet_id']}: decision count exceeds pending count")
   p['pending_count']-=d['item_count']; p['reviewed_count']+=d['reviewed_count']; p['unresolved_count']+=d['unresolved_count']; p['in_review_count']=0
  if p['pending_count']==0: p['status']='review-completed-with-unresolved' if p['unresolved_count'] else 'review-completed'
  else: p['status']='review-in-progress-not-applied'
  if d: changes.append({'packet_id':p['packet_id'],'book_id':p['book_id'],'before':before,'applied_delta':{'pending_count':-d['item_count'],'reviewed_count':d['reviewed_count'],'unresolved_count':d['unresolved_count']},'after':{k:p[k] for k in ['pending_count','reviewed_count','unresolved_count','status']}})
 ensure(all(p['pending_count']+p['reviewed_count']+p['unresolved_count']==p['item_count'] for p in out['packets']),'packet totals do not balance')
 out['totals']['completed_packet_count']=sum(1 for p in out['packets'] if p['pending_count']==0)
 out['totals']['pending_packet_count']=sum(1 for p in out['packets'] if p['pending_count']>0)
 return out, sorted(changes,key=lambda x:x['packet_id']), pub
def validate_inputs(policy,decisions,plan,historical,current,pr44,corpus):
 ds=decisions['decisions']; ensure(len(ds)==63,'expected exactly 63 PR-0046 decisions')
 ensure(decisions['rights_status']=='credited-source-edition' and not decisions['contains_full_text'] and not decisions['contains_source_excerpt'],'PR-0046 rights/text flags differ')
 ensure(summarize(current)==plan['current_state']=={'reviewed_count':70,'unresolved_count':11,'pending_count':63,'public_decision_count':81,'completed_packet_count':8,'pending_packet_count':8},'pre-integration current state differs')
 ensure(policy['rights_status']=='credited-source-edition','PR-0047 rights status differs')
 ids=[d['decision_id'] for d in ds]; segs=[d['segment_key'] for d in ds]; idents=[identity(d) for d in ds]
 ensure(len(set(ids))==63 and len(set(segs))==63 and len(set(idents))==63,'decision identities are not unique')
 pr44segs={d['segment_key'] for d in pr44['decisions']}; ensure(not pr44segs.intersection(segs),'PR-0046 overlaps PR-0044')
 pending={p['packet_id']:p['pending_count'] for p in current['packets'] if p['pending_count']>0}
 byp=Counter(d['packet_id'] for d in ds); ensure(len(byp)==8 and set(byp)==set(pending),'not all pending no-anchor packets represented')
 for pid,c in byp.items(): ensure(pending[pid]==c,f'{pid}: decisions do not match pending count')
 corpus_by_id={i['discovery_item_id']:i for i in corpus['items']}
 for d in ds:
  ensure(d['review_status']=='reviewed' and d['manual_review_completed'] is True and d['boundary_approved'] is False and d['database_change_applied'] is False and d['content_loaded'] is False and d['cutover_enabled'] is False, f"{d['decision_id']}: boundary flags differ")
  ensure(d['source_text_included'] is False and d['source_excerpt_included'] is False and d['private_evidence_included'] is False, f"{d['decision_id']}: private/source evidence leaked")
  item=corpus_by_id.get(d['discovery_item_id']); ensure(item is not None, f"{d['decision_id']}: missing corpus item")
  scores=[p['pair_score'] for p in item.get('pair_candidates',[])]
  ensure(scores and scores.count(max(scores))==1, f"{d['decision_id']}: missing unique max score")
  ensure(d['selected_pair']['pair_score']==max(scores), f"{d['decision_id']}: selected pair is not top public score")
 ensure(decisions['totals']['decision_count']==63 and decisions['totals']['resolved_count']+decisions['totals']['unresolved_count']==63,'PR-0046 totals differ')
def main():
 policy,decisions,pr46_policy,plan,historical,current,pr44,corpus=map(r,[P['policy'],P['decisions'],P['pr46_policy'],P['plan'],P['historical'],P['current'],P['pr44'],P['corpus']])
 validate_inputs(policy,decisions,plan,historical,current,pr44,corpus)
 before_hash=canonical_json_sha256(P['current']); hist_hash=canonical_json_sha256(P['historical'])
 out,packet_changes,pub=integrate(current,decisions['decisions']); after_state=summarize(out); delta={k:after_state[k]-summarize(current)[k] for k in after_state}
 ensure(after_state==plan['projected_state'],'post-integration state differs from plan')
 w(P['current'],out); after_hash=canonical_json_sha256(P['current'])
 evidence={'schema_version':1,'status':'remaining-no-anchor-backlog-progress-integrated-not-applied','policy_version':policy['policy_version'],'run_id':decisions['run_id'],'rights_status':'credited-source-edition','contains_full_text':False,'contains_source_excerpt':False,'contains_private_evidence':False,'generated_at':datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00','Z'),'hash_algorithm':'sha256-canonical-json-v1','input_hashes':{'historical_progress_sha256':hist_hash,'pre_integration_current_progress_sha256':before_hash,'pr0046_adjudication_decisions_sha256':canonical_json_sha256(P['decisions']),'pr0046_adjudication_policy_sha256':canonical_json_sha256(P['pr46_policy']),'pr0046_integration_plan_sha256':canonical_json_sha256(P['plan']),'pr0047_integration_policy_sha256':canonical_json_sha256(P['policy'])},'post_integration_current_progress_sha256':after_hash,'input_state':summarize(current),'derived_delta':delta,'output_state':after_state,'decision_totals':{'decision_count':len(pub),'resolved_count':sum(1 for d in decisions['decisions'] if d['selected_outcome']!='unresolved'),'unresolved_count':sum(1 for d in decisions['decisions'] if d['selected_outcome']=='unresolved')},'outcome_totals':dict(Counter(d['selected_outcome'] for d in decisions['decisions'])),'confidence_totals':dict(Counter(d['reviewer_confidence'] for d in decisions['decisions'])),'book_distribution':dict(Counter(str(d['book_id']) for d in decisions['decisions'])),'packet_distribution':dict(Counter(d['packet_id'] for d in decisions['decisions'])),'packet_status_changes':packet_changes,'public_decisions_added':pub,'preservation_assertions':{'historical_progress_byte_for_byte_unchanged':canonical_json_sha256(P['historical'])==hist_hash,'prior_public_decision_count_preserved':current['totals']['public_decision_count']==81,'new_public_decision_identities_unique':len({x['decision_id'] for x in pub})==len(pub),'total_public_decision_count':after_state['public_decision_count']},'integration_boundary_assertions':policy['integration_boundary']}
 w(P['evidence'],evidence)
 lines=['# Remaining No-Anchor Backlog Progress Integration','',f"- Status: `{evidence['status']}`",f"- Policy version: `{policy['policy_version']}`",'- Integrated PR-0046 decisions: `63`',f"- Resolved: `{evidence['decision_totals']['resolved_count']}`",f"- Unresolved: `{evidence['decision_totals']['unresolved_count']}`",f"- Outcome distribution: `{json.dumps(evidence['outcome_totals'],sort_keys=True)}`",f"- Confidence distribution: `{json.dumps(evidence['confidence_totals'],sort_keys=True)}`",f"- Pre-integration state: `{json.dumps(evidence['input_state'],sort_keys=True)}`",f"- Derived delta: `{json.dumps(delta,sort_keys=True)}`",f"- Post-integration state: `{json.dumps(after_state,sort_keys=True)}`",'- Historical progress modified: `false`','- Database/Supabase/production/UI/cutover changes: `0`','']
 P['report'].write_text('\n'.join(lines),encoding='utf-8',newline='\n')
 print('Integrated 63 remaining no-anchor backlog decisions into current progress.')
 print(json.dumps({'input_state':summarize(current),'delta':delta,'output_state':after_state},sort_keys=True))
if __name__=='__main__': main()
