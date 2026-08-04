# No-Anchor Ambiguous Progress Integration

## Scope

PR-0045 integrates the 25 structured adjudication outcomes recorded by
PR-0044.

The result contains:

- 16 reviewed outcomes;
- 9 unresolved outcomes;
- 25 new public decision identities;
- six partially reviewed no-anchor packets;
- 63 prepared items preserved as pending.

## Immutable progress model

Historical stage validators must validate the files that existed at their
stage. They must not be rewritten whenever later cumulative progress changes.

PR-0045 therefore preserves:

```text
content/migration/reading-segment-source-review-progress.json
```

as the immutable historical baseline.

The current cumulative source-review state is stored in:

```text
content/migration/reading-segment-source-review-progress-current.json
```

Later source-review PRs must read and update the current file.

## Input integrity hashes

PR-0045A corrects content-pipeline input-integrity validation without changing
historical decisions, discovery corpus membership, review outcomes, or either
progress snapshot. Immutable PR-0041 through PR-0044 evidence keeps its recorded
hash values and validates those historical fields with `sha256-legacy-crlf-v1`:
read text, normalize `CRLF -> LF`, `CR -> LF`, then `LF -> CRLF`, and hash the
resulting UTF-8 bytes with SHA-256. That legacy contract exists only to validate
representation-level historical evidence generated from CRLF working-tree bytes.

PR-0045 integration evidence records `sha256-canonical-json-v1` hashes for JSON
inputs. The canonicalization contract is:

1. parse JSON;
2. recursively sort object keys;
3. preserve array ordering;
4. serialize as compact UTF-8 JSON with no insignificant whitespace;
5. normalize integer-valued JSON numbers without a fractional suffix;
6. hash the resulting UTF-8 bytes with SHA-256.

This makes validation independent of LF versus CRLF working-tree line endings
while still detecting semantic JSON changes.

## State

| Metric | Historical baseline | Current |
| --- | ---: | ---: |
| Reviewed | 54 | 70 |
| Unresolved | 2 | 11 |
| Pending | 88 | 63 |
| Public decisions | 56 | 81 |
| Completed packets | 8 | 8 |
| Pending packets | 8 | 8 |

## Boundary

This PR does not modify historical validators, historical tests, database
state, production state, user progress, reading sessions, or cutover.
