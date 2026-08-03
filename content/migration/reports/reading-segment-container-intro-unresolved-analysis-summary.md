# Unresolved Container-Intro Analysis

- Status: `container-intro-unresolved-analyzed-not-resolved`
- Policy version: `2026-08-03-container-intro-unresolved-analysis-v1`
- Migration run ID: `adcff561-8f92-545c-a219-615818a454f4`
- Unresolved cases analyzed: `14`
- Resolution lanes: `3`
- Resolution batches: `5`
- Reviewed outcomes preserved: `4`
- Pending items preserved: `126`
- Public decisions preserved: `18`
- Source files read: `0`
- Review decisions changed: `0`
- Database changes: `0`
- Cutover enabled: `false`

## Unresolved reasons

| Reason | Cases | Resolution lane |
| --- | ---: | --- |
| current-title-window-not-found | 3 | current-title-window-recovery |
| selected-page-has-contents-signals | 1 | non-contents-occurrence-recovery |
| successor-title-not-found | 10 | successor-anchor-recovery |

## Resolution batches

| Batch | Work | Cases | Recommended method |
| --- | --- | ---: | --- |
| current-title-window-recovery-book-1-batch-01 | O Livro dos Espíritos | 2 | Test normalized token windows, punctuation-insensitive joins, and multi-line title reconstruction against locally held private evidence. |
| current-title-window-recovery-book-2-batch-01 | O Livro dos Médiuns | 1 | Test normalized token windows, punctuation-insensitive joins, and multi-line title reconstruction against locally held private evidence. |
| non-contents-occurrence-recovery-book-1-batch-01 | O Livro dos Espíritos | 1 | Use canonical structure-map locators and a page-range search beyond the contents section to recover a non-contents occurrence. |
| successor-anchor-recovery-book-2-batch-01 | O Livro dos Médiuns | 7 | Generate successor-title variants from canonical metadata and test a wider anchor-only search without classifying prose or changing decisions. |
| successor-anchor-recovery-book-3-batch-01 | O Evangelho Segundo o Espiritismo | 3 | Generate successor-title variants from canonical metadata and test a wider anchor-only search without classifying prose or changing decisions. |

## Decision

PR-0030 analyzes and groups the unresolved outcomes but does not reread the source editions or change any review decision.

All 14 records remain unresolved and unapplied.

