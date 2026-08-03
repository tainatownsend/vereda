# Editorial Node Staging Load Verification

- Status: `editorial-nodes-verified`
- Captured at: `2026-08-03T04:36:50.967Z`
- Migration version: `2026-08-03-editorial-structure-v1`
- Run ID: `adcff561-8f92-545c-a219-615818a454f4`
- Source CSV SHA-256: `6e546e35287641543f69b282b81118ce61425b227761599d9f27886300b2b2d8`
- Editorial nodes: `826`
- Books: `5`
- Reading segments: `0`
- Successor mappings: `0`
- Dependency snapshots: `0`
- Production sections: `908`
- Blocking failures: `0`

| Check | Passed | Actual value |
| --- | --- | --- |
| application-roles-denied | true | false |
| audit-event-count | true | 1 |
| book-1-node-count | true | 200 |
| book-2-node-count | true | 135 |
| book-3-node-count | true | 235 |
| book-4-node-count | true | 110 |
| book-5-node-count | true | 146 |
| dependency-snapshot-count | true | 0 |
| dry-run-result-count | true | 0 |
| editorial-node-total | true | 826 |
| editorial-parent-orphans | true | 0 |
| forbidden-locator-keys | true | 0 |
| migration-run-count | true | 1 |
| migration-run-id | true | adcff561-8f92-545c-a219-615818a454f4 |
| migration-run-status | true | loaded |
| migration-version | true | 2026-08-03-editorial-structure-v1 |
| production-section-count | true | 908 |
| reading-segment-count | true | 0 |
| reconstruction-plan-checksum | true | 659c8691129a7fb1739994a9969228e268440cb025178d1636542fae333bc215 |
| rights-status | true | blocked |
| source-map-checksums | true | {"a-genese": "b98a04efdda049015dac10e3c2d6b0ab5ab7b5b9487867c19478ed3c48151de6", "o-ceu-e-o-inferno": "a11cb7e2872a7915d412b951fbec6ee2017fd5b6fae5f6434081f36a3e0e3c1b", "o-livro-dos-mediuns": "569d70fe853607cd8f9408578312b376554b1397454ccf9b1e4d8fdeba214a29", "o-livro-dos-espiritos": "0e8735ac7581eb21af09842c2a96f0774622868fae329bb76e0f70a079e0e839", "o-evangelho-segundo-o-espiritismo": "a2c35f092ec351caefa9860837f77619453e8669c3732fd857fe78b6a94f2f6e"} |
| successor-mapping-count | true | 0 |

## Decision

The canonical editorial-node metadata load was verified.

Reading segments, successor mappings, dependency snapshots, production content, progress, sessions, and cutover remain unchanged.

