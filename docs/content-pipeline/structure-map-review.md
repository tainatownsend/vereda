# Source structure-map review

## Automated validation

The extraction must confirm the printed chapter and major-division counts:

| Work | Divisions | Chapters |
| --- | ---: | ---: |
| O Livro dos Espíritos | 4 | 29 |
| O Livro dos Médiuns | 2 | 36 |
| O Evangelho Segundo o Espiritismo | 0 | 28 |
| O Céu e o Inferno | 2 | 19 |
| A Gênese | 3 | 18 |

## Manual review checklist

For each generated JSON map, verify:

- front matter appears before the first chapter;
- divisions are in the printed order;
- every printed chapter is present;
- chapter Roman numerals and titles are correct;
- subsection page references are plausible;
- paragraph ranges are preserved for `O Evangelho Segundo o Espiritismo`;
- grouped prayers are nested correctly;
- named divisions in `A Gênese` are present;
- conclusion and explanatory notes appear as back matter;
- no full book text appears in the generated files.

## Scope boundary

The maps document source structure only.

They do not:

- alter Supabase;
- correct current Reader content;
- define final reading-segment sizes;
- migrate user progress;
- authorize redistribution of the supplied translations.
