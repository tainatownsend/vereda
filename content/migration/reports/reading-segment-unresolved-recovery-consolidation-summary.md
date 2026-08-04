# Unresolved Recovery Consolidation

- Status: `unresolved-recovery-outcomes-consolidated-not-applied`
- Policy version: `2026-08-03-unresolved-recovery-consolidation-v1`
- Migration run ID: `adcff561-8f92-545c-a219-615818a454f4`
- Recovery attempts: `14`
- Resolved recovery outcomes: `7`
- Still unresolved: `7`
- Manual-adjudication batches: `4`
- Source files read: `0`
- Source text read: `0`
- New review decisions: `0`
- Boundary approvals: `0`
- Database changes: `0`
- Cutover enabled: `false`

## Recovery source summary

| Recovery source | Attempts | Resolved | Still unresolved |
| --- | ---: | ---: | ---: |
| pr-0031-title-window | 3 | 0 | 3 |
| pr-0032-non-contents | 1 | 0 | 1 |
| pr-0033-book-3-successor-anchor | 3 | 1 | 2 |
| pr-0034-book-2-successor-anchor | 7 | 6 | 1 |

## Preserved resolved recoveries

| Work | Segment | Decision | Confidence |
| --- | --- | --- | --- |
| o-livro-dos-mediuns | Da natureza das comunicações | exclude-structural-heading | high |
| o-livro-dos-mediuns | Da identidade dos Espíritos | exclude-structural-heading | medium |
| o-livro-dos-mediuns | Das evocações | exclude-structural-heading | medium |
| o-livro-dos-mediuns | Das perguntas que se podem fazer aos Espíritos | exclude-structural-heading | medium |
| o-livro-dos-mediuns | Do charlatanismo e do embuste | exclude-structural-heading | medium |
| o-livro-dos-mediuns | Das reuniões e das Sociedades Espíritas | exclude-structural-heading | medium |
| o-evangelho-segundo-o-espiritismo | Não separeis o que Deus juntou | exclude-structural-heading | high |

## Manual-adjudication queue

| Batch | Work | Lane | Items |
| --- | --- | --- | ---: |
| manual-current-title-adjudication-book-1-batch-01 | o-livro-dos-espiritos | manual-current-title-adjudication | 2 |
| manual-current-title-adjudication-book-2-batch-01 | o-livro-dos-mediuns | manual-current-title-adjudication | 2 |
| manual-source-opening-adjudication-book-1-batch-01 | o-livro-dos-espiritos | manual-source-opening-adjudication | 1 |
| manual-successor-anchor-adjudication-book-3-batch-01 | o-evangelho-segundo-o-espiritismo | manual-successor-anchor-adjudication | 2 |

## Remaining unresolved items

| Work | Segment | Final reason | Manual lane |
| --- | --- | --- | --- |
| o-livro-dos-espiritos | PARTE PRIMEIRA — Das causas primárias | current-title-window-still-not-found | manual-current-title-adjudication |
| o-livro-dos-espiritos | PARTE SEGUNDA — Do mundo espírita ou mundo dos Espíritos | current-title-window-still-not-found | manual-current-title-adjudication |
| o-livro-dos-espiritos | PARTE TERCEIRA — Das leis morais | non-contents-current-occurrence-not-found | manual-source-opening-adjudication |
| o-livro-dos-mediuns | PRIMEIRA PARTE — Noções preliminares | current-title-window-still-not-found | manual-current-title-adjudication |
| o-livro-dos-mediuns | SEGUNDA PARTE — Das manifestações espíritas | current-title-not-confirmed | manual-current-title-adjudication |
| o-evangelho-segundo-o-espiritismo | Buscai e achareis | successor-anchor-not-found-within-expanded-window | manual-successor-anchor-adjudication |
| o-evangelho-segundo-o-espiritismo | Dai gratuitamente o que gratuitamente recebestes | successor-anchor-not-found-within-expanded-window | manual-successor-anchor-adjudication |

## Cumulative review progress

- Reviewed items: `11`
- Unresolved items: `7`
- Pending items: `126`
- Public decisions: `18`
- Completed packets: `4`
- Pending packets: `12`

## Application boundary

This consolidation does not read source files, create review decisions, approve boundaries, or modify staging or production.

