# Canonical and Current Structure Comparison

This report compares structural metadata only.
No complete book text or user data is included.

| Work | Current records | Matched chapters | Canonical-only units | Database-only rows | Split candidates | Review rows |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| O Livro dos Espíritos | 228 | 29/29 | 4 | 21 | 16 | 21 |
| O Livro dos Médiuns | 147 | 36/36 | 63 | 2 | 66 | 13 |
| O Evangelho Segundo o Espiritismo | 241 | 28/28 | 44 | 4 | 50 | 4 |
| O Céu e o Inferno | 146 | 19/19 | 2 | 2 | 38 | 2 |
| A Gênese | 146 | 18/18 | 9 | 6 | 10 | 6 |

## Interpretation

- `keep`: structurally aligned with a canonical node.
- `relabel-review`: likely match with title normalization differences.
- `reclassify`: likely front matter, back matter, or division stored as content.
- `split`: one current record appears to represent a larger editorial unit.
- `review`: no reliable structural match was found.

## Safety boundary

- Supabase was queried in read-only mode.
- No user-progress rows or reading sessions were exported.
- No full book text was exported.
- No database table was modified.
- Candidate mappings are diagnostic and must not be used as a production migration without manual review.

