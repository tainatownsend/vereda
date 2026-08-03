# Canonical and current structure comparison

## Purpose

PR-0012 compares the canonical editorial maps from PR-0011 with the structural
metadata currently stored in Supabase.

The comparison is diagnostic. It does not alter production data.

## Export boundary

The Supabase export includes:

- book and section identifiers;
- canonical position;
- section kind;
- part, chapter, and section titles;
- word and character counts;
- paragraph-block counts;
- normalized content checksum.

It excludes:

- complete book text;
- content previews;
- user identifiers;
- user progress;
- reading sessions;
- authentication data.

## Matching strategy

### Chapters

Current chapter groups are matched to canonical chapters using:

- normalized chapter title;
- chapter label;
- major-division title.

The assignment is one-to-one and confidence-scored.

### Sections

Current sections are compared with canonical groups and sections inside the
matched chapter.

Possible classifications include:

- exact match;
- fuzzy title match;
- chapter-level aggregate;
- standalone front or back matter;
- unmatched.

## Recommended actions

### `keep`

The current row aligns with a canonical editorial node.

### `relabel-review`

The row likely represents the correct node but the title requires review.

### `reclassify`

The row likely represents front matter, back matter, or a division but is stored
as regular content.

### `split`

A current row represents a chapter or another large editorial unit that should
be divided into canonical reading units.

### `review`

No reliable structural match was found.

## Progress-mapping boundary

The generated candidate mapping links current section IDs to deterministic
canonical source keys.

These candidates are not a migration.

Before production use, mappings must be reviewed against:

- current content boundaries;
- source paragraph or page ranges;
- active user progress;
- reading-session references;
- split and merge decisions.

## Reproducibility

The comparison records checksums for:

- the current Supabase structure snapshot;
- each canonical structure map.

This makes the generated reports traceable to exact inputs.
