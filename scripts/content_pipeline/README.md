# Content extraction pipeline

## PR-0010 scope

PR-0010 establishes:

- canonical-source metadata;
- reproducible source checksums;
- machine-local source registration;
- PDF extraction-quality inspection;
- staging boundaries;
- rights boundaries.

It does not:

- commit source PDFs;
- commit extracted full text;
- alter Supabase;
- replace current sections;
- migrate user progress.

## Source files

Place the five approved PDFs in the local Downloads folder.

The tracked manifest stores:

- filename;
- checksum;
- edition;
- translator;
- page count;
- ISBN;
- rights status.

Absolute paths are stored only in:

```text
content/sources/local-sources.json
```

That file is ignored by Git.

## Commands

```bash
npm run content:manifest:validate
npm run content:sources:report
npm run content:sources:inspect
```

## Inspection output

The inspection creates:

```text
content/staging/reports/source-inspection.json
content/staging/reports/source-inspection.md
```

The reports contain diagnostics only. They do not contain the complete texts.

## Rights boundary

The supplied FEB editions state that reproduction requires authorization.

They may be used locally to:

- validate table-of-contents structure;
- compare parts, chapters, and subsections;
- diagnose current database segmentation;
- design the deterministic parser.

They must not be used as production redistribution sources until rights
clearance is documented.

## Next stage

After source inspection, the next stage will:

1. define the canonical editorial schema;
2. parse the tables of contents;
3. create structural maps;
4. compare the maps with current Supabase sections;
5. identify a legally reusable production-text source;
6. design progress migration.
