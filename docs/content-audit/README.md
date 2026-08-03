# Book Content Structure Audit

## Purpose

This audit evaluates whether the current `sections` records preserve the real
editorial structure of each work.

The audit does not modify content. It collects evidence needed to choose between:

1. correcting the existing records with deterministic migrations; or
2. extracting and importing the works again from validated source texts.

## Questions

For every work, determine:

- whether `sec_position` follows the real reading order;
- whether parts and chapters match the source index;
- whether section boundaries represent real editorial units;
- whether text was divided mainly by reading duration or block size;
- whether paragraphs were flattened into continuous text;
- whether duplicated or missing passages exist;
- whether titles, notes, questions, answers, and introductions were classified
  correctly;
- whether existing user progress can be mapped safely to a corrected structure.

## Evidence produced

The SQL audit reports:

- work-level section and word counts;
- position gaps and duplicate positions;
- distribution of section sizes;
- suspiciously uniform section lengths;
- very short and very long sections;
- missing structural metadata;
- paragraph-break patterns;
- likely continuous-text blocks;
- repeated content hashes;
- repeated beginnings and endings;
- chapter and part summaries;
- reading-session and progress dependencies.

## Decision criteria

### Correct the existing database

Prefer correction when:

- all source content appears to be present;
- ordering is reliable;
- structural fields can be reconstructed;
- paragraph defects are limited and deterministic;
- progress can be mapped to stable editorial references.

### Re-extract and reimport

Prefer reimport when:

- text is missing, duplicated, or out of order;
- boundaries were created mostly by size or reading time;
- chapter and part hierarchy is broadly unreliable;
- repeated manual patches have made provenance uncertain;
- there is no stable mapping between current records and source units.

## Safety principles

Before any replacement:

1. export the current `books`, `sections`, `user_progress`, and
   `reading_sessions` data;
2. preserve immutable source files and checksums;
3. import corrected content into staging tables;
4. validate order, counts, hashes, and references;
5. create a progress-mapping table;
6. perform a dry run;
7. replace production data only after validation succeeds.
