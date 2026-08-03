# Reading Segment Review Triage

- Status: `triaged-not-applied`
- Policy version: `2026-08-03-reading-segment-review-triage-v1`
- Migration run ID: `adcff561-8f92-545c-a219-615818a454f4`
- Original review queue: `455`
- Active manual review queue: `405`
- Metadata-only items deferred: `50`
- Review batches: `25`
- Boundary approvals: `0`
- Content approvals: `0`
- Database changes: `0`
- Production changes: `0`
- Cutover enabled: `false`

## Dispositions

| Disposition | Items |
| --- | ---: |
| defer-metadata-only | 50 |
| manual-boundary-review | 310 |
| manual-size-review | 10 |
| manual-structural-review | 85 |

## Priorities

| Priority | Items |
| --- | ---: |
| P0 | 0 |
| P1 | 85 |
| P2 | 310 |
| P3 | 10 |

## Active queue by work

| Work | Active reviews | Deferred metadata |
| --- | ---: | ---: |
| O Livro dos Espíritos | 41 | 9 |
| O Livro dos Médiuns | 108 | 20 |
| O Evangelho Segundo o Espiritismo | 197 | 10 |
| O Céu e o Inferno | 27 | 3 |
| A Gênese | 32 | 8 |

## Decision

Metadata-only missing-size diagnostics may leave the active boundary-review workload because they do not independently invalidate canonical start or end boundaries.

All structural, same-page, container-introduction, missing-locator, split, and oversized-unit concerns remain in explicit manual review.

No staged database row is updated by PR-0020. All 812 rows remain in `boundary-review` until a later controlled application gate.

