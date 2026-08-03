# Content Staging Foundation

PR-0014 defines a private, non-production database workspace.

- Status: `blocked-not-applied`
- Production mutation allowed: `False`
- Cutover allowed: `False`
- Current structural snapshot rows: `908`
- Section decisions represented: `908`
- Manual-review decisions: `229`
- Blocked progress mappings: `46`

## Per-work staging strategy

| Work | Strategy | Decisions | Manual review | Blocked progress |
| --- | --- | ---: | ---: | ---: |
| O Livro dos Espíritos | full-staging-reconstruction | 228 | 38 | 21 |
| O Livro dos Médiuns | full-staging-reconstruction | 147 | 79 | 13 |
| O Evangelho Segundo o Espiritismo | full-staging-reconstruction | 241 | 56 | 4 |
| O Céu e o Inferno | full-staging-reconstruction | 146 | 40 | 2 |
| A Gênese | targeted-staging-reconstruction | 146 | 16 | 6 |

## Reader terminology decision

- `section`: legacy database record during migration.
- `editorial_node`: canonical source structure.
- `reading_segment`: future technical Reader unit.
- `trecho`: user-facing noun only when a noun is necessary.
- Primary visible navigation action: `Continuar`.

## Safety boundary

- The generated migration creates only `content_staging` objects.
- Application roles receive no staging access.
- Production content tables are referenced but not modified.
- Dependency snapshots store aggregate counts only.
- No cutover function is included.
- No destructive rollback command is included.

