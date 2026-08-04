# No-Anchor Discovery Corpus

- Status: `no-anchor-discovery-corpus-prepared-not-reviewed`
- Policy version: `2026-08-03-no-anchor-discovery-v1`
- Migration run ID: `adcff561-8f92-545c-a219-615818a454f4`
- Target packets: `8`
- Target items: `88`
- Evidence prepared: `63`
- Evidence ambiguous: `25`
- Evidence incomplete: `0`
- Items with current-anchor candidates: `88`
- Items with successor-anchor candidates: `88`
- Items with pair candidates: `88`
- Items without pair candidates: `0`
- Manual reviews completed: `0`
- Review decisions recorded: `0`
- Cumulative progress changes: `0`
- Boundary approvals: `0`
- Database changes: `0`
- Source text committed: `false`
- Cutover enabled: `false`

## Counts by book

| Book ID | Items |
| ---: | ---: |
| 1 | 6 |
| 2 | 70 |
| 3 | 1 |
| 4 | 1 |
| 5 | 10 |

## Counts by packet

| Packet | Items |
| --- | ---: |
| same-page-no-semantic-anchor-book-1-packet-01 | 6 |
| same-page-no-semantic-anchor-book-2-packet-01 | 20 |
| same-page-no-semantic-anchor-book-2-packet-02 | 20 |
| same-page-no-semantic-anchor-book-2-packet-03 | 20 |
| same-page-no-semantic-anchor-book-2-packet-04 | 10 |
| same-page-no-semantic-anchor-book-3-packet-01 | 1 |
| same-page-no-semantic-anchor-book-4-packet-01 | 1 |
| same-page-no-semantic-anchor-book-5-packet-01 | 10 |

## Discovery method

The corpus ranks semantic anchor blocks from canonical local PDFs using title-token coverage, ordered-token similarity, paragraph numbering, heading signals, printed-page proximity, and front-matter penalties.

Matched source text remains only in ignored private evidence.

## Workflow boundary

This PR prepares evidence only. It records no editorial decision and leaves cumulative progress at 54 reviewed, 2 unresolved, and 88 pending.

