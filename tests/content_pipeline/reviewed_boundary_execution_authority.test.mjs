import { describe, it, expect } from 'vitest'
import { build } from '../../scripts/content_pipeline/build_reviewed_boundary_execution_authority.mjs'
import { validate } from '../../scripts/content_pipeline/validate_reviewed_boundary_execution_authority.mjs'
import { readFile } from 'node:fs/promises'
import { paths } from '../../scripts/content_pipeline/build_reviewed_boundary_execution_authority.mjs'
const load=async k=>JSON.parse(await readFile(paths[k],'utf8'))

describe('PR-0054 reviewed-boundary execution authority',()=>{
 it('builds and validates deterministic blocked authority',async()=>{const a=await build(); const b=await build(); expect(a).toEqual(b); await expect(validate()).resolves.toMatchObject({execution_authority_approved:false,authorized_targets:74,missing_authority:4})})
 it('rejects decision/target drift',async()=>{const p=await load('policy'); p.authorized_target_count=73; await expect(validate({policy:p})).rejects.toThrow(/policy artifact drift/)})
 it('rejects audit authority drift and invented uniqueness',async()=>{const s=await load('schema'); s.unique_constraints.push(['run_id','event_type']); await expect(validate({schema:s})).rejects.toThrow(/schema artifact drift|audit uniqueness drift/)})
 it('rejects timestamp/conflict/payload drift through audit artifact equality',async()=>{const a=await load('audit'); a.timestamp_behavior='caller supplied'; await expect(validate({audit:a})).rejects.toThrow(/audit artifact drift/)})
 it('rejects state-machine and idempotency drift',async()=>{const s=await load('state'); s.states.state_C_partial_prior_application='apply remaining'; await expect(validate({state:s})).rejects.toThrow(/state artifact drift/)})
 it('rejects rollback gate/no-rollback invention',async()=>{const g=await load('gate'); g.repository_mechanism_found=true; await expect(validate({gate:g})).rejects.toThrow(/gate artifact drift|rollback gate invented/)})
 it('rejects missing content baselines, mismatches, fabricated hashes, and duplicates',async()=>{const b=await load('baselinePlan'); b.records[0].independent_content_hash='0'.repeat(64); await expect(validate({baselinePlan:b})).rejects.toThrow(/baselinePlan artifact drift|fabricated/); const c=await load('baselinePlan'); c.records.push(c.records[0]); await expect(validate({baselinePlan:c})).rejects.toThrow(/baseline/)})
 it('rejects missing-authority and approval defects',async()=>{const m=await load('missing'); m.missing_authority=[]; await expect(validate({missing:m})).rejects.toThrow(/missing artifact drift/); const p=await load('policy'); p.execution_authority_approved=true; await expect(validate({policy:p})).rejects.toThrow(/approval|policy artifact drift/)})
 it('rejects altered manifest hashes and forbidden leakage',async()=>{const m=await load('manifest'); m.artifact_hashes.policy_sha256='x'; await expect(validate({manifest:m})).rejects.toThrow(/manifest hashes drift/); const e=await load('evidence'); e.leak='postgres://secret'; await expect(validate({evidence:e})).rejects.toThrow(/evidence artifact drift|forbidden/)})
 it('records migration discovery and ignores unrelated migrations',async()=>{const s=await load('schema'); expect(s.migrations_scanned).toEqual([...s.migrations_scanned].sort()); expect(s.migrations_relevant).toContain('supabase/migrations/20260803033000_content_staging_foundation.sql'); expect(s.unsupported_later_schema_changes).toBe(false)})
})
