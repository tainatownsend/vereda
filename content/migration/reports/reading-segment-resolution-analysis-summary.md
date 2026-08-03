# Reading Segment Resolution Analysis

- Status: `analyzed-not-applied`
- Policy version: `2026-08-03-reading-segment-resolution-analysis-v1`
- Migration run ID: `adcff561-8f92-545c-a219-615818a454f4`
- Active items analyzed: `405`
- Mechanical anchor candidates: `166`
- Source inspection required: `144`
- Structural review required: `85`
- Delivery-size review required: `10`
- Resolution batches: `26`
- Boundaries approved: `0`
- Content approved or loaded: `0`
- Database changes: `0`
- Production changes: `0`
- Cutover enabled: `false`

## Resolution paths

| Resolution path | Items |
| --- | ---: |
| mechanical-anchor-candidate | 166 |
| source-inspection-required | 144 |
| structural-review-required | 85 |
| delivery-size-review-required | 10 |

## Analysis by work

| Work | Mechanical | Source inspection | Structural | Size |
| --- | ---: | ---: | ---: | ---: |
| O Livro dos Espíritos | 0 | 33 | 7 | 1 |
| O Livro dos Médiuns | 0 | 79 | 29 | 0 |
| O Evangelho Segundo o Espiritismo | 166 | 4 | 27 | 0 |
| O Céu e o Inferno | 0 | 8 | 14 | 5 |
| A Gênese | 0 | 20 | 8 | 4 |

## Decision

Mechanical candidates have distinct non-page canonical locator anchors for the current and successor proposals. They are candidates for a future deterministic resolution, not approved boundaries.

Cases without sufficient structural anchor evidence remain in source inspection. Split and reconstruction cases remain in structural review. Oversized-only cases remain in delivery-size review.

PR-0021 does not update any of the 812 staged rows. Every row remains in `boundary-review`.

