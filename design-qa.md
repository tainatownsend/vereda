# Vereda editorial North Star — design QA

Date: 2026-09-22. Branch: `feat/vereda-editorial-north-star`.

## Result

Visual implementation: **passed** against the functional, accessible interpretation of the supplied four-phone North Star. Exact image parity and live authenticated acceptance remain **blocked** pending the qualifications below. This is not a claim of complete production acceptance.

## Audit and implementation

The baseline had five primary navigation destinations, a Home containing competing shortcuts, generic collection cards, and reflections distributed across journal/share controls. Literata already provided the appropriate editorial character, so it was retained. Existing canonical content, data services and routes remain in place.

Implemented cream/olive/gold tokens, readable controls, four destinations (Início, Estudos, Reflexões, Mais), a personalized Home with dominant study continuation, compact book collection with progress filters, book-like reading with clearly attributed Vereda reflection prompts, and Hoje/Favoritas/Minhas in Reflexões. Secondary utilities remain reachable through Mais. The reader uses the actual source reading-unit semantics rather than fabricated chapter counts.

## Visual comparison evidence

The uploaded four-phone reference and rendered screenshots were inspected together in the same comparison input. Captures are local production components with explicitly fictional QA data, not screenshots of an authenticated production account.

- `docs/qa/north-star/home-390.jpg`: brand, greeting, landscape, olive primary continuation, secondary reflection, four navigation items.
- `docs/qa/north-star/studies-390.jpg`: three filters and compact title/author/progress collection rows.
- `docs/qa/north-star/reader-390.jpg`: centered book/part/chapter hierarchy, serif text, integrated reflection, immersive navigation.
- `docs/qa/north-star/reflections-390.jpg`: landscape, editorial quotation, true author and save/share actions.
- `docs/qa/north-star/studies-dark-extra-320.jpg`: dark palette and enlarged text at the narrowest target.

Remaining visual differences: existing Vereda logo and actual book cover editions are retained; they differ from the mockup's leaf mark and illustrated covers. Scenic artwork is newly generated rather than the identical mockup landscape. Text and navigation are larger, and long authentic quotations require scrolling. Decorative botanical branches are restrained to line marks. The mockup's unverified Chico Xavier quotations were not copied or falsely attributed. Desktop uses a centered constrained product shell.

## Verification

- `npm ci`: passed.
- `npm run test:run`: 98 files, 640 tests passed, including interaction tests for navigation, filters, reflection save/share, reader return context, progress edge cases and render/auth recovery.
- `npm run lint`: passed with two existing unused-variable warnings in content-pipeline scripts; no errors.
- `npm run build`: passed; PWA service worker generated.
- Browser: six screens at 320, 360, 375, 390, 414, 430, 768, 1024 and 1280 px; 54 checks, no horizontal overflow or broken images. See `viewport-checks.json`.
- Browser: six screens at 320 px with dark mode and enlarged text; no overflow after correcting wrapping of reflection actions. See `dark-extra-320-checks.json`.
- Navigation labels: 14 px default / 15.75 px enlarged; tap height 64 / 72 px. Reader hides global navigation.
- No application runtime errors observed in the local fixture; browser-extension telemetry errors are outside the app.

## Bugs fixed

- Invalid book identifiers and failed book loading now provide actionable error states.
- Rendering failures and missing/malformed Supabase configuration render recovery instead of a blank root; rejected/errored session lookup exits the loading state.
- Progress is bounded and does not show 100% before explicit completion; completed books open in revisit mode.
- Reader back navigation preserves safe passage/notes/guided contexts.
- Reader display controls no longer close from their own pointer interaction.
- Reflection actions wrap at 320 px with enlarged text.
- Existing content-pipeline suites rebuild shared JSON artifacts. Running test files serially prevents intermittent partial-file reads without removing assertions.
- Public presentation and login brand descriptors now use the approved positioning and readable supporting text.
- Consistent PWA theme colors and image precaching; visible button focus and labeled journal/notes inputs.

## Acceptance limits

No canonical text, database schema or account data was modified. QA fixtures are dev/test-only and excluded from production entry points. Live Google/email authentication, account synchronization, real saved-passage data, iOS safe-area behavior, native sharing and PWA upgrades still need an authenticated device acceptance pass. This environment has no signed-in Vereda test account. Root recovery cannot catch a JavaScript bundle that never downloads; normal browser/network recovery still applies.

Preview and PR verification are recorded in the pull request after publication. Do not merge with failing Frontend Quality.
