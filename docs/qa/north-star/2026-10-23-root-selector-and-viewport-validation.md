# Vereda North Star: Home scope fix and mobile visual checks

**Date:** 2026-10-23. **Target:** PR #128, branch `design/vereda-northstar-visual-parity-20261021`; commit `9dd81d35cdb02f8a3137200221f5cfa65b08f181`.

## Verified defect and source-level correction

The Home JSX has `<main className="northstar-page northstar-home pb-28">` with **both** classes on **one element**. Twelve later overrides accidentally used descendant selector `.northstar-page .northstar-home ...`, which requires a second, nested element and never matched the actual root. This silently disabled the approved illustrated Home adjustments (scenic height, greeting overlay, logo detail, jasmine floral accent, quote width).

- All 12 incorrect descendant selectors in `src/index.css` were replaced with the joint-root selector `.northstar-page.northstar-home ...`.
- Added `tests/ui/northstar_home_selector_scope.test.js` (two checks) confirming class structure and binding of source illustrations. Future edits should preserve this root matching.

## Build and browser evidence

- GitHub `Frontend quality` on commit `9dd81d35...`: **109 test files / 682 tests passed**, Vite build successful.
- `Reviewed Boundary Runtime Integrity Staging Preflight Validation`: **SUCCESS**.
- Vercel Preview of matching commit: `https://vereda-ho7dnhwqk-ttownsend.vercel.app`, status READY.
- Chromium in isolated fixture `qa.visual.html`: **32 renderings** = Home, Estudos, Reflexões and Leitor × 320/390/430/800 CSS px × light/dark.
- All 32 returned HTTP 200. Zero page exceptions, broken `/art/` resources, or horizontal page overflows.
- At 390 px, Home welcome hero measured **342×211.2 CSS px** and greeting **335.6×85 CSS px**, indicating the formerly inactive height/style rules are now applied. Vereda logo and floral accent were visible DOM elements and covers loaded.
- Reader unified menu bounds at 320 px **left 12 / right 308 CSS px**; no clipping and its three preference groups (font size, app theme, reader theme) were present. Bottom reading navigation computed position: **fixed**.
- Browser evidence is from **fictional isolated QA data**, **not a real Google session or a Safari device**.

## Evidence limitations and release gate

The QA captured screenshots, but the Vercel sandbox expired before contact-sheet bytes could be archived to the repository. **No screenshot link should be claimed** for this pass.

The founder's original illustrated five-phone board remains the design source of truth. Visual parity of artwork, alignment, chapter hierarchy, menu polish, iPhone Safari rendering, text enlargement and final founder signoff **has not yet been established**. This pass verifies a real defect and safe rendering, not pixel equality. Production `main` and Supabase were not modified. Keep PR #128 DRAFT.
