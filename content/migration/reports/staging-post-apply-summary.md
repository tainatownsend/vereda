# Private Staging Post-Application Verification

- Status: `staging-foundation-verified`
- Captured at: `2026-08-03T04:23:21.704Z`
- Source CSV SHA-256: `6d44c176600fd294f5b9bb083c3cb797f595e1c090a38a1bdc4a63f780313b2b`
- Production sections: `908`
- Staging rows: `0`
- Application roles denied: `true`
- Service role has usage: `true`
- Blocking failures: `0`

| Check | Passed | Actual value |
| --- | --- | --- |
| application-roles-denied | true | false |
| production-section-count | true | 908 |
| service-role-has-usage | true | true |
| staging-function-count | true | 2 |
| staging-is-empty | true | 0 |
| staging-schema-exists | true | present |
| staging-table-count | true | 7 |
| staging-view-count | true | 1 |

## Decision

The private `content_staging` foundation was applied and verified.

The schema is empty, application roles are denied, production still contains 908 sections, and no cutover is enabled.

