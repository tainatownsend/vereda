# Reading Segment Design Summary

- Status: `designed-not-applied`
- Design version: `2026-08-03-reading-segment-boundaries-v1`
- Migration run ID: `adcff561-8f92-545c-a219-615818a454f4`
- Editorial nodes reviewed: `826`
- Segment proposals: `812`
- Leaf-node proposals: `698`
- Container-intro proposals: `114`
- Structural containers excluded: `14`
- Manual-review proposals: `455`
- Full source text included: `false`
- SQL applied: `false`
- Reading segments loaded: `false`
- Successor mappings loaded: `false`
- Dependency snapshots captured: `false`
- Production modified: `false`
- Cutover enabled: `false`

## Per-work design

| Work | Editorial nodes | Proposals | Leaf | Intro review | Excluded containers | Manual review |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| O Livro dos Espíritos | 200 | 200 | 169 | 31 | 0 | 50 |
| O Livro dos Médiuns | 135 | 135 | 109 | 26 | 0 | 128 |
| O Evangelho Segundo o Espiritismo | 235 | 230 | 202 | 28 | 5 | 207 |
| O Céu e o Inferno | 110 | 110 | 95 | 15 | 0 | 30 |
| A Gênese | 146 | 137 | 123 | 14 | 9 | 40 |

## Estimated size bands

| Size band | Proposals |
| --- | ---: |
| brief | 263 |
| long | 100 |
| oversized | 49 |
| standard | 268 |
| unknown | 132 |

## Review reasons

| Reason | Proposals |
| --- | ---: |
| container-intro-boundary | 114 |
| legacy-word-count-oversized | 49 |
| manual-reconstruction-review | 85 |
| no-legacy-word-count-estimate | 131 |
| same-page-successor-boundary | 308 |
| split-required-by-reconstruction-plan | 78 |

## Decision

PR-0018 prepares deterministic boundary proposals and a review backlog.

The generated SQL remains unapplied. No complete source text, approved Reader segment, legacy successor mapping, dependency snapshot, progress migration, or production cutover is included.

