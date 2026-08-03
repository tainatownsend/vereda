# Content staging

This directory contains generated artifacts used to reconstruct the five works.

## Directories

- `raw`: immutable source copies or source metadata;
- `extracted`: page-oriented text extracted from each source;
- `normalized`: normalized text and editorial units;
- `reports`: validation and comparison reports.

Generated book contents must not be committed until their source rights and
repository-storage strategy have been approved.

The pipeline must never write directly to production tables.
