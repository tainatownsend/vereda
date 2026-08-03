# Reading Segment Staging Application

- Status: `reading-segments-staged-and-verified`
- Captured at: `2026-08-03T05:11:57.503Z`
- Design version: `2026-08-03-reading-segment-boundaries-v1`
- Run ID: `adcff561-8f92-545c-a219-615818a454f4`
- Source CSV SHA-256: `4f13991060a11aab83d5c7c7dc7959196f8f9922e1f430f2720f96be4bd36c1f`
- Reading segments: `812`
- Books: `5`
- Boundary-review rows: `812`
- Rows containing content: `0`
- Successor mappings: `0`
- Dependency snapshots: `0`
- Production sections: `908`
- Rights status: `blocked`
- Blocking failures: `0`
- Cutover enabled: `false`

| Check | Passed | Actual value |
| --- | --- | --- |
| application-roles-denied | true | false |
| audit-event-count | true | 1 |
| book-1-segment-count | true | 200 |
| book-2-segment-count | true | 135 |
| book-3-segment-count | true | 230 |
| book-4-segment-count | true | 110 |
| book-5-segment-count | true | 137 |
| boundary-review-only | true | 0 |
| boundary-version-one | true | 0 |
| content-remains-null | true | 0 |
| dependency-snapshot-count | true | 0 |
| dry-run-result-count | true | 0 |
| editorial-node-references-valid | true | 0 |
| end-locators-present | true | 0 |
| migration-run-status | true | reviewing |
| production-section-count | true | 908 |
| reading-segment-total | true | 812 |
| rights-status | true | blocked |
| segment-index-count-one | true | 0 |
| segment-key-uniqueness | true | 0 |
| segment-order-contiguous | true | 0 |
| start-locators-present | true | 0 |
| successor-mapping-count | true | 0 |

## Decision

The content-free reading-segment boundary metadata was applied and verified in the private staging schema.

All rows remain in boundary review. Content, mappings, dependency snapshots, production data, progress, sessions, rights approval, and cutover remain unchanged.

