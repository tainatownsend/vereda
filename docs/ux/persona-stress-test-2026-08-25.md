# Vereda persona stress test — 2026-08-25

## Method and limits

This is a structured heuristic walkthrough using the two personas defined in issue #69. It is not a substitute for observed usability testing with real people. Findings are based on the current stacked implementation through `feat/settings-hub` and are intended to decide what deserves implementation or real-device validation next.

## Personas

### Persona A — first-time, low-tech learner

- Curious about Spiritism but does not know the foundational works.
- Uses a smartphone for basic tasks and is uncomfortable with unfamiliar app conventions.
- Wants to know what to do next without feeling tested or rushed.
- May interpret hidden controls, long pages or technical wording as evidence that they are “doing it wrong”.

### Persona B — returning learner

- Knows some Spiritist concepts but has not necessarily read Kardec systematically.
- Wants to search by topic, save useful passages and build a coherent reading path.
- Values freedom and source access more than streaks, productivity or rigid plans.

## Scenario walkthrough

| Scenario | Persona reaction | Risk | Current / planned response |
| --- | --- | --- | --- |
| Arrives without an account | “Why should I create an account before I know what this is?” | High | Public landing page is required (#68). |
| Creates an account | Form is understandable, but account creation alone is not enough orientation. | Medium | #66 adds confirmation-first journey and introduction. |
| Confirms email | Needs a clear sense that confirmation succeeded and what happens next. | High | #66 redirects into `/comecar?novo=1` and marks new accounts incomplete until onboarding finishes. |
| Reads study introduction | Long doctrinal text would be intimidating; one idea per screen is easier. | High | Four-step onboarding uses two short orientation steps before questions. Normal page scroll remains available. |
| Does not know book titles | Needs human choices rather than bibliographic knowledge. | Low | Start from fundamentals / ask a question / choose a work. |
| Encounters content taller than the screen | Must never wonder whether content is clipped. | Medium | Use document scrolling; avoid inner scroll containers and viewport-based text truncation for onboarding. |
| Returns after days away | Wants recognition of where to continue, not a progress penalty. | Low | Home prioritizes the most recent active reading and uses welcoming return language. |
| Searches a natural-language question | Needs to understand that results are passages, not an AI doctrinal answer. | Low | Discovery explicitly says it searches the works and opens exact passages. |
| Opens a search result | Must not accidentally start a new reading plan. | Low | Direct passage reading remains separate from active progress. |
| Saves a passage | Needs to know where it went. | Medium | Saved passages are reachable from Library; real-device smoke must validate discoverability. |
| Changes settings | A generic save button creates uncertainty about what it saves. | High | #65 places save actions next to name/reminder and keeps display preferences immediate. |
| Needs help later | May not remember onboarding decisions or navigation model. | Medium | #65 adds “Refazer a introdução”. A future FAQ/help surface should be validated. |
| Wants another book | Needs to express demand without understanding editorial pipeline. | Medium | Candidate request + voting flow is planned in #67. |
| Mistypes an existing candidate title | Duplicate candidate creation would fragment votes. | High | #67 requires normalized + fuzzy candidate matching before creation. |
| Forgets password | Recovery should visually feel like the same product and not a suspicious generic email. | Medium | #66 versions branded recovery email and clear reset route. |
| Network is slow or unavailable | Blank loaders can feel like the app is broken. | Medium | Branded loader is improved; explicit offline/retry behavior remains a follow-up. |

## Release blockers

### 1. Hosted email-confirmation policy must match the repository

The product decision is now confirmation-required. Local `supabase/config.toml`, confirmation routing and templates express that decision, but the hosted Supabase project still needs to be verified and configured to match. This must be confirmed before release because a mismatch changes the first-time journey materially.

### 2. Real-device first-time smoke after the stacked onboarding/settings changes

Automated contracts can verify routes and copy, but the following must be observed on a real 320–390px device:

- confirmation link → introduction;
- no clipped content or hidden primary CTA;
- keyboard does not trap signup/onboarding actions;
- route transitions start at the top;
- Settings section scanning remains calm rather than feeling like a long form.

### 3. Public explanation before signup

A first-time visitor currently reaches authentication before a proper public product explanation. For Persona A this creates avoidable uncertainty and weakens trust. #68 should be completed before treating acquisition/onboarding as finished.

## High-value next improvements

### Public landing page (#68)

Problem solved: “What is this, why should I trust it, and why create an account?”

The page should explain the source-oriented reading model, current library, optional sequence, free/no-ads positioning, and what an account preserves.

### Community book requests and voting (#67)

Problem solved: “The book I want is not here; how do I tell the project?”

The strongest version is calm demand signaling, not a leaderboard. Existing-candidate detection is essential so users do not split votes across spelling variants.

### Clear help / FAQ entry point

Problem solved: a low-tech learner may forget what a feature means after onboarding. A short help surface reachable from Settings could answer:

- Do I have to follow the suggested order?
- Does search answer questions or find passages?
- What happens when I start another book?
- Where are saved passages?
- How is my progress stored?

This should be validated after landing-page copy is written so content is not duplicated unnecessarily.

## Useful follow-ups

### Source / edition provenance

Trust increases if a learner can see which edition/source underlies a passage. This should not be fabricated: implementation depends on reliable provenance metadata in the content model.

### Offline resilience for recently opened reading

Problem solved: a learner on unstable mobile internet can continue a passage already opened. This is especially relevant for a PWA, but should be scoped carefully because authenticated progress syncing introduces conflict behavior.

### Better explicit retry states

Where a network call fails, prefer an actionable “Tentar novamente” control over error text alone. Discovery already gives an error message; the next step is a consistent retry pattern across user data, saved passages and book loading.

## Feature ideas needing validation

### Share a passage

Potential problem solved: learners often want to discuss or revisit a meaningful excerpt elsewhere. Before implementation, decide whether sharing should include only a citation/title + deep link or any excerpt text, because content rights and source fidelity matter.

### Lightweight reading notes

Potential problem solved: saved passages identify what mattered, but not why it mattered. Notes could add study value, yet they also create a much larger privacy/data model than the current saved-ID approach. Do not add without user evidence.

### Optional study-plan views

Some returning learners may want a more structured route. This should remain opt-in and never replace the current “no pressure” default.

## Persona-driven product rules confirmed by this pass

1. Explain the product before asking for commitment.
2. Treat confirmation, onboarding and first reading as one continuous journey.
3. Never require knowledge of book titles to take the next step.
4. Prefer normal document scrolling over nested scrolling or height-dependent text splitting.
5. Put save/apply actions next to the setting they affect.
6. Distinguish source retrieval from interpretation at every search entry point.
7. Never create reading progress as a side effect of browsing a passage.
8. Make optionality explicit when presenting sequence, reminders or pace.
9. Preserve a visible recovery path: resend, retry, replay onboarding, reset password.
10. New features should solve a learner problem, not merely expose technical capability.

## Recommended sequence after this report

1. Finish #68 public landing page.
2. Finish #67 community book requests/voting.
3. Apply/verify hosted Auth confirmation + branded templates.
4. Run the full real-device UX-17 smoke across the stacked branch.
5. Only then decide whether FAQ, offline reading, provenance and sharing need their own implementation issues before release.
