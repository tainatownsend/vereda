# ADR-0001: Reader units and navigation language

- Status: Accepted
- Decision date: 2026-08-02
- Implementation: PR-0014 contract; PR-0015 interface

## Context

The current implementation uses `section` for several different concepts:

1. a record in `public.sections`;
2. an editorial subsection in the printed work;
3. a unit displayed by the Reader;
4. a unit completed for progress;
5. a term shown in navigation copy.

These concepts are not equivalent.

The canonical-source work showed that one editorial unit may require multiple
Reader units, while several small editorial units may occasionally belong in
one calm reading experience.

Using `section` for all of them makes the data model unclear and exposes an
implementation detail to the reader.

## Decision

### Legacy database concept

`section` means a current record in `public.sections`.

This term is retained temporarily for:

- compatibility;
- current progress references;
- reading-session references;
- rollback mappings.

### Canonical source concept

`editorial_node` means a source-structure unit, including:

- front matter;
- division;
- chapter;
- group;
- subsection;
- back matter.

An editorial node is not automatically one Reader screen.

### Future Reader concept

`reading_segment` means one ordered unit delivered by the Reader.

A reading segment has:

- an approved start and end boundary;
- stable identity;
- ordering;
- content checksum;
- progress behavior.

### User-facing language

The interface does not normally name the technical unit.

Preferred actions:

- `Voltar`
- `Continuar`
- `Começar capítulo`
- `Concluir obra`

When a noun is required, use `trecho`.

Examples:

- `Voltar para o trecho anterior`
- `Não encontramos a continuação desta leitura`
- `Você pode concluir esta leitura e decidir se deseja continuar`

## Consequences

### Positive

- Source structure and Reader pacing can evolve independently.
- Buttons describe the reader's intention rather than the database operation.
- The interface becomes calmer and less technical.
- Progress migrations can distinguish legacy records from future segments.

### Cost

- Compatibility code must retain `section_id` during migration.
- Reader services will eventually transition toward segment terminology.
- Tests and accessibility labels require an explicit copy update.

## Scope

PR-0014 records the contract and uses `reading_segments` in staging.

PR-0015 will implement the Reader copy and navigation changes without changing
progress persistence.
