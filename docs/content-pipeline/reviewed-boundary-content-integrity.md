# PR-0056 reviewed-boundary content integrity

This package inventories the 74 status-only targets from PR-0053 and defines the immutable baseline required before application or rollback. It generates no mutation SQL and changes no application data.

## Authority and snapshot model

The consolidated evidence represents 144 public decisions: 74 authorized status-only targets and 70 exclusions. The application plan supplies target identity, `segment_order`, and the `boundary-review` to `content-review` transition. The repository does **not** contain authoritative values for the other fields of the actual 74 `reading_segments` rows. This is consequently a partial expected repository snapshot, not runtime database evidence.

Each target inventories decision and row identity, both statuses, all boundary/content baseline fields, optional `updated_at`, source references and hashes, and projection hashes. Missing row values are explicit JSON `null`; full content is never stored.

## Projections and canonical hashing

Identity hashes cover `run_id`, `book_id`, and `segment_key`. Boundary hashes cover `source_key`, ordering/index/count/version, locators, and display title. Content hashes cover the normalized-content digest, word count, normalized length, and byte length. A complete pre-application hash will cover the three hashes and previous status. Timestamps are excluded.

Hashes use `sha256-canonical-json-v1`: recursively lexicographically sorted object keys, preserved array order, whitespace-free `JSON.stringify`, UTF-8 bytes, and lowercase SHA-256. Boundary, content, and full hashes remain null rather than hashing an insufficient baseline.

Actual content is normalized by the centralized `reviewed-boundary-content-normalization-v1` implementation in `scripts/content_pipeline/reviewed_boundary_content_normalization.mjs`: CRLF and CR become LF, text becomes Unicode NFC, non-breaking spaces become ASCII spaces, horizontal whitespace runs collapse to one space, each line is trimmed, outer blank lines are removed, three or more line breaks collapse to two, and exactly one final LF is added. The normalized UTF-8 bytes are independently SHA-256 hashed. Runtime collection must retain both `stored_normalized_content_sha256` and `recomputed_normalized_content_sha256`, record `stored_digest_matches_recomputed`, and derive byte length, normalized length, and word count from actual content. Full content is never committed.

## Drift, rollback, and PR-0055

Future classifications are `MATCH`, `STATUS_ALREADY_APPLIED`, `STATUS_UNEXPECTED`, `IDENTITY_MISSING`, `BOUNDARY_DRIFT`, `CONTENT_DRIFT`, `STORED_CONTENT_DIGEST_MISMATCH`, `METADATA_DRIFT`, `SOURCE_HASH_DRIFT`, `DUPLICATE_TARGET`, `UNAUTHORIZED_TARGET`, and `INSUFFICIENT_BASELINE`. Boundary drift, content drift, and a stored-versus-recomputed digest mismatch always block application and rollback.

Rollback requires matching identity, boundary, and content hashes; expected applied status; known original status; a matching PR-0055 application event; and no unresolved audit conflict. This PR does not execute rollback. All 74 targets supply PR-0055 identity inputs, application keys are unique, and rollback keys are distinct. Future integrity hashes belong in audit details and do not alter event identity.

## Readiness and database-validation decision

`source_snapshot_available` is true for partial package reconstruction. `source_snapshot_complete`, `source_snapshot_verified`, `application_preflight_ready`, `rollback_baseline_ready`, and `content_integrity_authority_approved` are false. With content unavailable, the recomputed digest and comparison result remain null and no stored digest alone can make a target complete. A future snapshot of actual rows must read `content`, independently normalize and hash it, compare the result with the stored digest, be written under `tmp/`, and match unchanged source hashes. An artificial PostgreSQL fixture would not prove missing actual values, and no SQL is introduced, so static independent validation is appropriate. Execution authority remains false.
