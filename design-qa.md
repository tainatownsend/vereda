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

## 2026-10-20: integrated Reflections controls and rebalanced medium Reader typography

The founder's approved marketing mockup shows the quote and its Salvar / Compartilhar actions within a coherent illustrated card. The previous PR #125 implementation rendered them in a detached flex row **outside** the bordered card. Corrected by moving the action row inside the labeled `reflection-composition` section and giving it an accessible `role="group"` labeled `Ações da reflexão`. Added a subtle divider, surface-continuous background, and maintained >=44px touch targets. The source/author remain unchanged. An interaction test checks that both actions are descendants of the same labeled Reflection region.

The iPhone screenshot submitted by the founder earlier showed the Reader set to **Média**, not an enlarged preference. The default Medium body is now 19px instead of 20px, with 1.72 line height instead of 1.82; mobile section heading is 1.7rem instead of 1.85rem. Pequena, Grande and Extra remain user-selectable. These typographic revisions require a real physical-device usability check; smaller letters cannot be called an unconditional accessibility improvement.

**New render evidence is still required for these two changes.** Prior Chromium montage documents the preceding branch state only. Lint/unit/build/CI may pass without proving visual fidelity. Keep V1 **NO-GO** until a same-viewport iPhone screenshot confirms the one-card quote composition, safe-area, reader readability at Medium and Extra, authenticated persisted progress/notes, and founder approval.

## Oct 21 2026 | Reproducible fixture and true browser QA (NO-GO visual)
- Added `qa.visual.html`, `vite.config.visual-qa.js` and `qa/visual` as a **dev-only isolated fixture**. Uses exactly the real React screen implementations with mock account `fixture@example.invalid` and fake progress; does not call hosted Supabase, and is not a production Vite build entry. Documentation in `qa/visual/README.md`.
- Corrected brand/tab fidelity: Início's active icon is gold, Estudos and Reflexões' active icon are olive; Home greeting now transitions smoothly into the valley artwork rather than a hard-edged opaque overlay. The centered mark remains zero-offset.
- Playwright/Chromium test matrix on PR #125 with the fixture: 4 surfaces (Home, Estudos, Reflexões, Leitor) x 320/390/430/800 light = **16**, plus 4 surfaces x 320/390/430 dark = **12**. All HTTP 200, no horizontal overflow, no reported page JavaScript errors, illustrated covers loaded, quote actions inside the same card. Home logo centered (0px offset), route-specific active SVG colors verified in computed CSS; Aa opened and the general menu closed the typography controls. Dark Reader at Extra was actually 28px; no overflow at 320px.
- Evidence screenshot (light-mode desktop Chromium with 390px mobile viewport) archived at [qa-fixture-oct21-light-four-screens.jpg](docs/qa/north-star/qa-fixture-oct21-light-four-screens.jpg). User identity and study data **simulated**, not from production. The screenshot is a 4-up reduced-resolution overview, not a pixel-perfect comparison to the marketing mockup.
- Frontend quality and staging integrity workflow results **SUCCESS** for the code commit `83b9e7027cd2856ccd3073637cf97b0c82499d78`. The documentation/image commit(s) require separate check. No merge, OAuth changes, Supabase changes or deployment to custom domain.
- **V1 remains VISUAL NO-GO**: composition/images still require artistic 1:1 approval, real iPhone Safari comparison, real Google OAuth in the relevant Preview, notes/progress/favorites persistence and large-text UX. Chromium mock fixtures do not prove those gates. No release without founder acceptance.

## 2026-10-21: editorial tabs touch-target regression fixed, WebKit blocked

**Actual regression:** the last North Star CSS override had `min-height:2.3rem` for the `Estudos`/`Reflexões` filter chips, silently overriding the earlier `min-h-11` 44px baseline. On a 16px root this was **36.8px**, below the 44px touch target threshold. The final override is now `min-height:2.75rem` = **44px**. Added `tests/ui/northstar_touch_targets.test.js` to guard that final CSS override.

**Browser evidence:** Chromium with the same deterministic visual fixture, at 320px, 390px, and 430px, in **light and dark** for Studies and Reflections = 12 renderings. Computed chip heights were 44px in all 12, and `Salvar`/`Compartilhar` action heights were also 44px on all 6 Reflections cases. HTTP 200, no horizontal overflow and no captured JS errors for these fixture screens. Browser logs and computed metrics taken against commit `fffee1b50b3f3416995d48931eb80a545cf150f7`.

**Technical gates:** GitHub Actions Frontend quality SUCCESS on `d381a049967f40494e73bc4e1ed4284c0c61fac5`: 102 files / 653 tests passed, Vite build passed. Reviewed Boundary staging preflight SUCCESS. Vercel preview `https://vereda-qbck9tb7j-ttownsend.vercel.app` READY for that same SHA.

**Safari/WebKit NOT validated:** attempted the Playwright WebKit binary in a Vercel Linux sandbox; it cannot start on Amazon Linux 2023 because the required GTK4, ICU 74, GStreamer, flite and related runtime libraries are absent. This is an **environment blocker**, NOT an app pass/failure; no WebKit or iOS Safari rendering evidence was produced. Use macOS/iOS real Safari or a supported Playwright-WebKit host for the remaining browser gate.

**Status: V1 VISUAL NO-GO.** The iPhone-authenticated visual comparison, source mockup fidelity, real Google OAuth, actual notes/progress persistence and founder sign-off are still open. All edits remain in PR #125 draft, not main or production.

## October 21 2026: restored *original North Star* atmospheric scenery

**Problem demonstrated:** even after the initial vector-art reconstruction, the Home and Reflections screenshots were dominated by a flat green vector valley, unlike the founder-approved golden photographic illustration. Earlier CSS-only passes did not repair this major art-direction discrepancy.

**Implemented in the draft PR #125 (no main/production changes):**
- Recovered the original gold/sunrise landscape *from the already-committed atlas derived from the founder's approved North Star mockup*, cropped scenic-only, resized to 960×338 and optimized to ~5 KB as `public/art/vereda-valley-northstar.webp`. This is explicitly a source-derived image, NOT a stock image or a newly invented quotation.
- Both Home and Reflections now render the recovered image first, with the earlier custom vector `vereda-valley.svg` as a fallback. The ornament `botanical-sprig.svg` remains along the edges; the dark theme gently subdues the background without hiding text.
- `tests/ui/northstar_vector_assets.test.js` verifies that the WebP has the expected RIFF/WEBP signature, is under 100 KB, and is wired through CSS while retaining the vector fallback.
- Browser screenshot from the 390px light fixture: [qa-oct21-golden-valley-four-screens.jpg](docs/qa/north-star/qa-oct21-golden-valley-four-screens.jpg). This is a new capture reflecting the actual new asset, rather than a mocked presentation poster or the previous flat-vector screenshots.

**Automated verification:** Chromium on the isolated visual fixture: four surfaces × 320, 390, 430, 800 CSS px × light/dark = **32 renderings**. All 200, zero horizontal overflows, zero captured JS errors, all expected cover images loaded, recovered scene used on both relevant surfaces, Home brand exactly centered. Tests use fictional content and an isolated Vite environment, no user data and no hosted Supabase.

**Limitations / release blockers:** the scene is a resized extraction from an illustration in the original concept board rather than the complete original landscape master artwork. Although closer in color, motif and atmosphere, it needs retina/real-device visual acceptance. The screenshot combines screens at reduced scale, not a pixel-level 1:1 Photoshop comparison. WebKit/Safari physical devices, authenticated preview Google OAuth, reliable persistence of notes/favorites/progress after reload, focus/contrast at large text, and explicit founder approval remain open. A green CI alone does NOT constitute visual sign-off. **V1 remains NO-GO**.

## 2026-10-21 | Reader persistence hardening after successful Google Preview login

The founder confirmed that Google sign-in now reaches Vereda as expected in the Preview. That confirmation **only** closes the observed login/redirect journey, not the cross-device data gate.

**Code risks discovered and corrected in PR #125:**
- `useReadingSession.load()` previously always preferred a value in `sessionStorage`, even if Supabase's `get_reader_state` returned a later completed checkpoint. A stale browser tab could therefore reopen an older part of a work after the person advanced on another device. It now calls `resolveReaderStartPosition` and chooses the most advanced valid position. Explicit completed-book revisit mode still starts at the first position; invalid local values are ignored.
- `completeCurrentSection` writes to the durable Supabase RPC but did **not** update the shared Zustand progress used on Home/Studies. After successful `complete_reading_section`, it now invokes `recordConfirmedReaderProgress` to update the in-memory checkpoint and last read timestamp immediately. No optimistic update occurs before RPC success. A completed book updates its `completed_at` marker even if the RPC does not return a successor position.
- Added regression tests `tests/ui/reader_cross_device_persistence.test.js` for remote-vs-local checkpoint precedence, explicit revisit, bounds, successful completion, nonregression, and absent successor.

**Evidence:** GitHub Frontend quality SUCCESS on commit `cdb6822347dc495f482021dd7b2850739a6de15e`, 104 test files and **665 tests**, Vite build passed. Reviewed Boundary Runtime Integrity Staging Preflight SUCCESS. Preview deployed separately from main (latest Preview should be checked against the matching SHA). 

**Remaining release gates / no premature acceptance:** authenticated end-to-end proof with two real devices after saving a passage, refreshing Home/Studies, reopening Reader, and checking notes/favorite persistence. Same-state real iPhone Safari visual comparison with original North Star poster and founder approval. No changes to the Supabase schema, production deployment or main. **V1 remains NO-GO.**
