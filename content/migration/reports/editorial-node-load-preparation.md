# Editorial Node Staging Load Preparation

- Status: `prepared-not-applied`
- Migration version: `2026-08-03-editorial-structure-v1`
- Run ID: `adcff561-8f92-545c-a219-615818a454f4`
- Production snapshot rows: `908`
- Editorial nodes prepared: `826`
- Works represented: `5`
- Full book text included: `false`
- Reading segments prepared: `0`
- Successor mappings prepared: `0`
- Dependency snapshots prepared: `0`
- Production mutation allowed: `false`
- Cutover allowed: `false`

| Work | Editorial nodes | Source-map SHA-256 |
| --- | ---: | --- |
| O Livro dos Espíritos | 200 | `0e8735ac7581eb21af09842c2a96f0774622868fae329bb76e0f70a079e0e839` |
| O Livro dos Médiuns | 135 | `569d70fe853607cd8f9408578312b376554b1397454ccf9b1e4d8fdeba214a29` |
| O Evangelho Segundo o Espiritismo | 235 | `a2c35f092ec351caefa9860837f77619453e8669c3732fd857fe78b6a94f2f6e` |
| O Céu e o Inferno | 110 | `a11cb7e2872a7915d412b951fbec6ee2017fd5b6fae5f6434081f36a3e0e3c1b` |
| A Gênese | 146 | `b98a04efdda049015dac10e3c2d6b0ab5ab7b5b9487867c19478ed3c48151de6` |

## Application boundary

The generated SQL may insert only:

- one `content_staging.migration_runs` row;
- canonical metadata into `content_staging.editorial_nodes`;
- one staging audit event.

It must keep the following empty:

- `content_staging.reading_segments`;
- `content_staging.current_successor_mappings`;
- `content_staging.dependency_snapshots`;
- `content_staging.dry_run_results`.

Production content, progress, reading sessions, and Reader behavior remain unchanged.

