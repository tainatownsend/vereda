import { describe, expect, it } from 'vitest'

import {
  validateReaderLanguageContract,
  validateStagingMigration,
} from '../../scripts/content_pipeline/staging_sql_validation.mjs'

const safeSql = `
create schema if not exists content_staging;

create table if not exists content_staging.migration_runs ();
create table if not exists content_staging.editorial_nodes ();
create table if not exists content_staging.reading_segments (
  segment_key text
);
create table if not exists content_staging.current_successor_mappings (
  current_section_id integer not null
    references public.sections(id)
);
create table if not exists content_staging.dependency_snapshots ();
create table if not exists content_staging.dry_run_results ();
create table if not exists content_staging.migration_audit_events ();

create or replace function content_staging.capture_dependency_snapshot()
returns void language sql as $$ select; $$;

create or replace function content_staging.evaluate_dry_run()
returns void language sql as $$ select; $$;

revoke all on schema content_staging from authenticated;
`

describe('staging SQL validation', () => {
  it('accepts an isolated staging foundation', () => {
    expect(
      validateStagingMigration(safeSql),
    ).toEqual([])
  })

  it('rejects production section updates', () => {
    expect(
      validateStagingMigration(
        `${safeSql}
         update public.sections set title = 'x';`,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'forbidden production mutation',
        ),
      ]),
    )
  })

  it('rejects app-role access', () => {
    expect(
      validateStagingMigration(
        `${safeSql}
         grant select on content_staging.reading_segments
         to authenticated;`,
      ),
    ).toContain(
      'staging access cannot be granted to app roles',
    )
  })
})

describe('Reader language contract', () => {
  it('accepts calm navigation language', () => {
    expect(
      validateReaderLanguageContract({
        schema_version: 1,
        internal_terms: {
          reading_segment: {
            meaning: 'Reader unit',
          },
          editorial_node: {
            meaning: 'Source unit',
          },
        },
        user_facing_language: {
          primary_navigation_action: 'Continuar',
          previous_navigation_action: 'Voltar',
          unit_noun_when_required: 'trecho',
        },
      }),
    ).toEqual([])
  })

  it('rejects section as the user-facing unit', () => {
    expect(
      validateReaderLanguageContract({
        schema_version: 1,
        internal_terms: {
          reading_segment: {
            meaning: 'Reader unit',
          },
          editorial_node: {
            meaning: 'Source unit',
          },
        },
        user_facing_language: {
          primary_navigation_action: 'Próxima seção',
          previous_navigation_action: 'Voltar',
          unit_noun_when_required: 'seção',
        },
      }),
    ).toEqual(
      expect.arrayContaining([
        'primary action must be Continuar',
        'user-facing unit noun must be trecho',
      ]),
    )
  })
})

describe('real staging migration safeguards', () => {
  it('counts invalid split groups through a scalar subquery', async () => {
    const { readFile } = await import('node:fs/promises')
    const sql = await readFile(
      'supabase/migrations/20260803033000_content_staging_foundation.sql',
      'utf8',
    )

    expect(sql).toMatch(
      /from\s*\(\s*select csm\.current_section_id[\s\S]*\)\s+invalid_splits;/,
    )
  })

  it('does not model missing canonical units as legacy mappings', async () => {
    const { readFile } = await import('node:fs/promises')
    const sql = await readFile(
      'supabase/migrations/20260803033000_content_staging_foundation.sql',
      'utf8',
    )

    expect(sql).not.toContain("'missing-current-unit'")
  })

  it('does not report dry-run success before checks exist', async () => {
    const { readFile } = await import('node:fs/promises')
    const sql = await readFile(
      'supabase/migrations/20260803033000_content_staging_foundation.sql',
      'utf8',
    )

    expect(sql).toContain(
      'when count(dr.check_key) = 0 then false',
    )
  })
})
