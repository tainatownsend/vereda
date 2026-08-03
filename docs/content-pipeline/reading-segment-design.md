# Reading-segment design layer

## Purpose

PR-0018 defines deterministic proposals for future Reader delivery units
without loading complete source text or modifying Supabase.

The design is generated from:

- the five canonical source maps;
- the five reconstruction plans;
- the verified PR-0017 editorial-node run.

## Candidate rules

### Canonical leaf nodes

Every canonical leaf node receives one segment proposal.

A leaf node is an editorial node without canonical children.

### Container introductions

A non-leaf editorial node receives a separate intro-boundary proposal only when
the reconstruction plan contains a direct legacy `chapter_intro` or
`part_intro` signal for that node.

### Structural containers

Divisions, chapters, and groups without a direct intro signal remain structural
containers only.

They do not automatically become Reader screens.

## Identity

Each proposal receives a deterministic 24-character hexadecimal key generated
from:

- migration run ID;
- book ID;
- canonical source key;
- proposal kind;
- boundary version.

Regenerating the same design from unchanged inputs produces the same keys.

## Boundary metadata

A proposal contains:

- canonical source key;
- proposed segment order;
- start locator;
- provisional exclusive end locator;
- display title;
- boundary version;
- review reasons;
- legacy word-count estimate when available.

The end locator points to the next proposal start. The last proposal ends at
the end of the work.

These locators are proposals, not approved extraction boundaries.

## Size estimates

Word counts come only from aggregate legacy `stored_word_count` values already
present in reconstruction plans.

They are diagnostic estimates and are not treated as canonical source counts.

The size bands are:

- brief: 1–450;
- standard: 451–1,200;
- long: 1,201–2,500;
- oversized: 2,501 or more;
- unknown: no reliable legacy estimate.

## Manual review reasons

The generated queue may include:

- container introduction boundaries;
- missing start locators;
- same-page successor boundaries;
- reconstruction decisions requiring manual review;
- split decisions;
- oversized legacy estimates;
- missing legacy estimates.

## Rights boundary

PR-0018 does not load:

- complete book text;
- excerpts;
- normalized content;
- source-text hashes;
- approved Reader content.

Rights status remains blocked.

## Database boundary

PR-0018 generates a draft SQL file for later review but does not apply it.

The draft would insert only:

- boundary-review segment metadata;
- null content;
- null word count;
- null normalized-content checksum;
- one audit event.

It would not insert:

- successor mappings;
- dependency snapshots;
- dry-run results.

## Production boundary

PR-0018 does not modify:

- `public.books`;
- `public.sections`;
- `public.user_progress`;
- `public.reading_sessions`;
- Reader RPCs;
- frontend code.

## Next gate

A later PR may apply the content-free segment design to private staging only
after the generated counts and review queue are accepted.

Application remains separate from:

- source-text extraction;
- content approval;
- progress mapping;
- dependency capture;
- dry-run approval;
- production cutover.
