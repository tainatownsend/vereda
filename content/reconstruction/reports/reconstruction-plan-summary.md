# Book Reconstruction Plan

This plan is diagnostic and does not modify production data.

| Work | Strategy | Current sections | Manual review | Split | Review | Missing canonical units | Provisional direct mappings |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| O Livro dos Espíritos | full-staging-reconstruction | 228 | 38 | 16 | 21 | 9 | 191 |
| O Livro dos Médiuns | full-staging-reconstruction | 147 | 79 | 66 | 13 | 67 | 68 |
| O Evangelho Segundo o Espiritismo | full-staging-reconstruction | 241 | 56 | 50 | 4 | 48 | 187 |
| O Céu e o Inferno | full-staging-reconstruction | 146 | 40 | 38 | 2 | 4 | 106 |
| A Gênese | targeted-staging-reconstruction | 146 | 16 | 10 | 6 | 16 | 130 |

## Strategy meanings

- `metadata-alignment`: boundaries appear aligned; metadata review remains.
- `targeted-staging-reconstruction`: selected units require reconstruction.
- `full-staging-reconstruction`: the work should be rebuilt in staging and compared as a complete ordered set.

## Progress-preservation position

- Current production section IDs remain authoritative until cutover.
- Canonical source keys identify editorial units, not final reading segments.
- Provisional segment keys are not production identifiers.
- Split and unmatched records block automatic migration.
- Historical reading sessions remain immutable.
- Every migration requires a reversible current-to-successor mapping.

## Production blockers

- source redistribution rights;
- verified content boundaries;
- content-level checksums;
- active progress dependency joins;
- approved split and merge rules;
- rollback and cutover transactions.

