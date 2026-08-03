# Reader navigation language

## Purpose

The Reader should describe the reader's intention, not the storage operation
performed by the application.

The current database continues to use `public.sections` during migration, but
that legacy term is no longer exposed as the primary Reader unit.

## Visible actions

### Previous item

- Label: `Voltar`
- Accessible name: `Voltar na leitura`
- Behavior: opens the previous loaded legacy record without changing official
  progress.

### Normal continuation

- Label: `Continuar`
- Accessible name: `Continuar a leitura`
- Behavior: completes the current legacy record and advances using the existing
  Reader controller.

### Chapter opening

- Label: `Começar capítulo`
- Accessible name: `Começar este capítulo`
- Behavior: completes the chapter-introduction record and advances to the first
  reading content.

### Final item

- Label: `Concluir obra`
- Accessible name: `Concluir a obra`
- Condition: the current position equals the final known position of the work.
- Behavior: uses the existing completion RPC and book-completion phase.

## Reader noun

When a noun is necessary, use:

```text
trecho
```

Examples:

- `Trecho 12`
- `Trecho atual`
- `O trecho escolhido não pôde ser carregado.`

## Index

The index keeps the source-facing concepts:

- part;
- chapter;
- named subsection title.

When no editorial title exists, the fallback label is `Trecho N`.

Opening an index item continues to be revisit navigation and does not update
official progress.

## Persistence boundary

PR-0015 does not rename or modify:

- `public.sections`;
- `section_id`;
- `sec_position`;
- `current_section`;
- Reader RPCs;
- progress rows;
- reading sessions.

The change is limited to Reader-facing language, accessibility labels, and
deterministic copy selection.
