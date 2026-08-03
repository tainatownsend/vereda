# Canonical editorial schema

## Purpose

The canonical editorial schema describes the printed organization of each work
without storing its complete text.

It becomes the reference layer between:

- the printed source edition;
- the current Supabase `sections` records;
- a future corrected content model;
- user-progress migration.

## Node types

### `front_matter`

Material before the principal body, such as:

- publisher note;
- explanation;
- preface;
- introduction;
- prolegomena.

### `division`

A major editorial division, including numbered parts and named divisions.

Examples include:

- `Parte Primeira`;
- `Primeira Parte`;
- `A Gênese segundo o Espiritismo`;
- `Os milagres segundo o Espiritismo`.

### `chapter`

A printed chapter with its Roman-numeral label, title, and initial printed page.

### `group`

An intermediate grouping explicitly represented in the table of contents.

This is used for structures such as:

- numbered prayer groups;
- major subsections inside a chapter;
- grouped phenomena or thematic blocks.

### `section`

A table-of-contents entry below a chapter or group.

Its locator may represent:

- a printed page;
- a paragraph or item range;
- no explicit locator when the printed table of contents provides only a
  descriptive chapter summary.

### `back_matter`

Material after the main body, including:

- conclusion;
- explanatory note;
- general index.

## Stable identity

Every node receives:

- a deterministic `source_key`;
- a deterministic `id`;
- a parent reference;
- global order;
- hierarchy depth;
- source PDF page;
- printed page or internal locator when available.

The identity is based on editorial metadata rather than current Supabase
section IDs.

## Rights boundary

The generated maps contain only structural metadata extracted from the printed
tables of contents.

They do not contain:

- complete chapters;
- complete sections;
- full paragraphs;
- production book content.

## Migration boundary

This schema does not yet decide how many Reader sections each editorial unit
will produce.

A later migration may divide a large editorial unit into multiple reading
segments, but those segments must retain a stable reference to the canonical
editorial node.
