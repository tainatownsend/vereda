# Staging Application Preflight

- Status: `preflight-passed`
- Captured at: `2026-08-03T04:15:14.622Z`
- Source CSV SHA-256: `8a5231be82b972f0cf3ef759b1ece303ef26a628c77111d66d624155258f0856`
- Expected production sections: `908`
- Actual production sections: `908`
- Blocking failures: `0`
- Contains user identifiers: `false`

| Check | Severity | Passed | Actual value |
| --- | --- | --- | --- |
| duplicate-section-positions | blocking | true | 0 |
| orphan-reading-sessions | blocking | true | 0 |
| progress-position-out-of-range | blocking | true | 0 |
| reading-session-book-mismatches | blocking | true | 0 |
| aggregate-dependencies | info | true | 3 |
| section-total | info | true | 908 |

## Decision

The read-only production preflight passed.

This evidence does not apply the staging migration. Database application remains a separate explicit step.

