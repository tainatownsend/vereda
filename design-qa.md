# Vereda North Star — reconstructive visual QA (19 October 2026)
**final result: blocked**

## Source and implementation
- **Visual source of truth:** Founder-approved marketing mockup, `https://drive.google.com/file/d/1kMw5NdFB7hQHeAAJLpLcV5_FjbsjZnig/view`, original local source `42CB5ADF-BC42-4F6D-9334-044434026594.png` (1672×941 pixels). Four phone frames on the source are marketing presentation. Do not reproduce the phone hardware, date and browser chrome as app UI.
- **Previous implementation evidence:** Real iPhone Safari screenshots shared October 19 (Início, Estudos, Reflexões, Leitor, including expanded Aa); founder explicitly rejected its fidelity. Previous QA screenshots in `docs/qa/north-star` are not proof of the new branch.
- **Current implementation:** `feat/vereda-v1-northstar-art-rebuild` based on PR #122, independent of experimental rejected PR #123. Vercel Preview from branch, when available.
- **New render/screenshot:** NOT YET CAPTURED on the build in the same auth state as approved mockup. Browser comparison remains blocked. A green build or Vercel READY does not satisfy visual QA.

## Changes already implemented
- Extracted the three-part Vereda **sun + leaf icon** silhouette from the founder's original mockup and installed it as `public/vereda-logo-mark.svg` (vector tracing of actual concept mark, not the old landscape mark).
- Added `public/northstar-atlas.webp` (480×346, source-derived) with the real reference's golden misty landscape, four illustrated book covers, a placeholder fifth recolored cover, and botanical branch. Crop fidelity is stronger than unrelated stock photos, but raster resolution is too low for production high-DPI screens.
- Wired illustrated covers into `BookCover` without changing book IDs, progress, source text or backend.
- Rebuilt Home centered botanical header, scenic greeting, illustrated continuation button and gold/cream reflection composition.
- Rebuilt Studies' pill filters, compact cover-and-progress rows and circular green affordances.
- Rebuilt Reflections' scene and typography proportions while retaining authenticated source and author, save and share actions.
- Kept Reader's original authenticated text, context and navigation; refined title hierarchy and isolated Aa controls from general menu.
- Added smoke/regression tests for art components and separate Aa behavior.

## Blocking visual QA findings — unverified new rendering
**P1 identity and artwork:** Logo is reference-derived but the existing PWA icon + masking assets may still show the old emblem. The atlas is a small crop from the marketing concept and is *not* a full-resolution asset pack. Book #2 uses a provisional recolor; replace it with distinct custom cover.
**P1 proportions:** New layout must be compared with four flat phone-specific reference crops at 390 CSS px, with the same scroll position and auth state. Need side-by-side visual evidence, not a static screenshot of the cover page.
**P1 reflections:** authentic daily quote length varies; ensure author and bibliography remain readable with Save/Share in reach, without clipping long quotations.
**P1 reader:** check actual iPhone fontSize=Média baseline, 320px narrow viewport, 430px wide viewport, large text and dark mode; safe-area and screen-reader focus.
**P2 dynamic personalization:** labels/counts use real trechos not fictional capítulos; screenshots must reflect that intentional product truth.

## Evidence to collect next
- Source design 1672×941 marketing board cropped to four app-owned phone content areas.
- New same-state screenshots: `Início`, `Estudos`, `Leitor`, `Reflexões` at CSS 390×844, density 1 and 2; keep source/implementation normalization documented.
- Screenshots of the exact authenticated render, including iPhone Safari, plus test of quote Save/Share, reading progress, notes, back navigation, A/a, light/dark, Google auth in Preview.
- CI frontend test (all tests), lint, build and PWA. Tests cannot certify art fidelity.
- Compare pixel and compositional differences, fix P0/P1/P2, capture again; only then change this file to `final result: passed`.

**Production remains NO-GO.** Do not merge into PR #122 or deploy to `vereda.tayua.space` without visual acceptance.
