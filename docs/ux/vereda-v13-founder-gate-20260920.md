# Vereda v1.3 — incremental North Star implementation gate

**Production V1.2 remains unchanged. This branch is not a full four-screen approval.**

## Current app routes (verified against source)
- Início: `/home`, preserves auth and reading progress.
- Estudos: `/estudo-guiado`, uses existing book/catalog/progress.
- Leitura guiada: `/ler/:id`, preserves section position, notes and reader text-size controls.
- Reflexões: `/reflexoes`, preserves local/cloud journal behavior.

## Implemented on this branch
- An application-level error boundary prevents React render exceptions from leaving an entirely blank app shell.
- The existing load indicator displays a Portuguese recovery action after 12 seconds without hiding its original state.
- Neither feature resets Supabase data, reading progress, notes, saved passages, font size or theme.

## Real-device acceptance before any merge/deploy
1. On an authenticated iPhone, navigate Início → Estudos → Leitura → Reflexões; verify bottom nav, readable copy, and no horizontal scroll at 320/360/390/430 px.
2. Return to a previously opened reading section; the section position, saved passage and any notes must remain unchanged.
3. Switch to larger reading text and verify the preference persists after a refresh.
4. Simulate app startup with Supabase unavailable in a preview environment; the user sees a visible loading status followed by a recovery action, not a white screen. Do not simulate by deleting production data.
5. Confirm error boundary recovery via a test-only route or component in a preview, never by forcing a production failure.
6. Compare each of the four target screens visually with the approved North Star screenshot, recording gap and impact. This branch hardens recovery but does NOT claim pixel fidelity.

**Release gate**: CI green, independent mobile/light/dark visual comparison, founder approval. No production deployment before acceptance.