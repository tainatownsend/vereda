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


## 2026-10-19 browser-rendered fixture evidence (isolated; real browser)
- **Capture:** [four screens in Chromium, fixture data](docs/qa/north-star/browser-fixture-2026-10-19-four-screens.jpg), SHA-anchored in PR #125, image 756×410. Each component was rendered at 390×844 CSS pixels, DPR 1. Montage was downsampled to approximately 189×410 per screen; **this composite is layout overview only, NOT a 1:1 pixel-fidelity pass**. Source remains the founder's approved 1672×941 four-phone mockup.
- **Fixture:** Vite/React from the exact branch in a short-lived isolated Vercel Sandbox, with local fake user, mocked study progress, book titles and reading session. No production user data, tokens, or Supabase modifications. Capture used Chromium headless; actual iPhone Safari is NOT covered.
- **Viewport matrix:** 320 / 390 / 430 / 800 px × Home, Studies, Reflections, Reader = **16 browser renderings**.
- **Measured:** document scroll width equaled viewport width for all 16 cases; no captured page JS errors in the fixture. Studies rendered 5 illustrated book sprites at all widths. Aa opened its independent \"Tamanho do texto\" group in the Reader at 390 px. Vertical scrolling remains expected for Studies and Reader (at 390px: body height about 1025px and 1287px respectively).
- **CI on parent art rebuild:** GitHub frontend quality and infra preflight succeeded before the QA screenshot commit. Check the new HEAD again before claiming pass.
- **Remaining objective P1:** comic-scale source sprite is only 480×346 and cannot faithfully reproduce high-DPI art. The Med iuns cover is a stylistic adaptation rather than a literal crop of the founder's original mockup. Home/Reflections feature real quoted text, not the illustrative invented copy in the marketing mockup; preserve author/source and accept natural wrapping. Need final high-resolution licensed illustrations, same-state 1:1 crops/spacing checks, iPhone Safari, dark/large-text, authenticated OAuth in preview, and progress/bookmark/notes persistence.
- **Verdict:** browser render smoke PASSED for the isolated fixture, visual fidelity FINAL RESULT REMAINS **BLOCKED**. Do not merge or publish.


## 2026-10-20 V1 vector artwork and four-screen browser QA
**Visual release gate: STILL NO-GO; founder visual sign-off not received.**
- **Art upgrade:** Five distinct, resolution-independent cover SVG files now live at `public/art/covers/kardec-1.svg` ... `kardec-5.svg`; covers have their own palette and botanical/celestial details. The illustrated covers are **new interpretations** of the founder-approved direction, not copies of the tiny embedded paintings in the original concept artwork.
- The Home and Reflections render a standalone `public/art/vereda-valley.svg` (1600×680 viewBox); Home daily reflection decor uses `public/art/botanical-sprig.svg` (260×410 viewBox). `BookCover` renders each unique SVG as `img` rather than CSS atlas crops; dark-mode/readability checks remain necessary. `public/northstar-atlas.webp` is legacy and no longer referenced by the primary artwork CSS or BookCover.
- **Verified visual bug fixed:** Home header included utility `justify-between` that overrode brand centering. Removed it; measured the wordmark center at 195px vs the 390px viewport midpoint of 195px (offset 0px) in an isolated Chromium run.
- **Visual evidence:** [Five covers and scenic artwork, browser screenshot](docs/qa/north-star/vector-cover-collection-2026-10-20.jpg); [Home, Estudos, Reflexões, Leitor, 390px Chromium fixture montage](docs/qa/north-star/vector-four-screens-2026-10-20.jpg). Captures use mocked, non-user data, not production authentication. A 4-screen overview compressed to 800px total width is for layout review only, not high-DPI pixel matching.
- **Browser matrix:** 16 combinations = four screens × 320,390,430,800 CSS pixels, Chromium. HTTP200 throughout; document scrollWidth equals viewportWidth throughout, **no horizontal overflow**; no reported page/asset errors, all five book cover images loaded successfully and Reader Aa opened a standalone typography group at 390px. Vertical scrolling remains normal for long works. Safari/iPhone and authentic OAuth persistency not tested in this fixture.
- **Code CI on pre-evidence parent commit dc2f43ea:** `Frontend quality` SUCCESS, 101 test files and 651 tests passed; build SUCCESS; reviewed boundary preflight SUCCESS. The screenshot/documentation commit requires its own final CI check.
- **Remaining V1 blockers:** founder judges 1:1 component proportions/art direction against her actual approved mockup; pixel-scale comparison in identical screen state; real iPhone Safari 320/390/430, Aa zoom, contrast, dark mode, browser safe areas; Google OAuth on this preview and persisted favorites/notes/progress across reload and device. Preserve genuine citations/authors and real section counts, not invented text/metrics in illustrative mockup.
- **Safety:** No modification to `main`, production Vercel domain, Supabase or customer data. PR #125 remains DRAFT. No merge or launch without express acceptance.
