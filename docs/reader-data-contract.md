# Reader Data Contract

## Purpose

The Reader must distinguish three different concepts:

1. **Reading progress** — the next section the reader should open.
2. **Reading time** — every real study session recorded by the application.
3. **Daily goal** — whether accumulated reading time reached the configured daily duration.

These concepts must not be inferred from one another.

## Sources of truth

### `user_progress`

One row per user and book.

- `current_section`: next persisted section position.
- `pace_mode`: reading-plan mode.
- `pace_minutes`: daily duration when using minute-based pacing.
- `pace_deadline`: optional target date.
- `last_read_at`: last successful section completion.
- `completed_at`: true completion of the entire work.

### `reading_sessions`

One row per completed or persisted reading session.

Multiple rows for the same user and section are valid. Re-reading must not erase previous study time.

- `read_at`: the reader's explicit local calendar date.
- `duration_s`: duration attributable to that session.
- `created_at`: immutable server timestamp.

### `sections`

Canonical ordering is `(book_id, sec_position)`. Positions must be unique inside each book.

## RPC contract

### `get_reader_state`

Initializes the Reader from one persisted state response.

The client supplies the reader's local date.

### `get_todays_sections`

Returns a content window from `current_section`. Despite its legacy name, it no longer decides whether a daily goal has been completed.

### `complete_reading_section`

Atomically:

1. validates ownership and section/book relationship;
2. inserts a reading-session row;
3. advances progress without regression;
4. marks the work completed when no later section exists;
5. returns the updated position, completion state, and daily minutes.

The UI must not advance optimistically unless this operation succeeds.

### `get_minutes_read_on_date`

Returns session time for an explicit local date. New code should prefer this over `get_minutes_read_today`.

## Invariants

- Re-reading a section never deletes or overwrites prior sessions.
- Progress never moves backward.
- A daily goal never determines book progress.
- Book completion occurs only when there is no later section.
- UI state cannot be the sole source of persisted progress.
- Supabase errors must be surfaced to the Reader controller.
- A date sent to reading RPCs represents the user's local calendar date.

## Frontend implications for PR-0007

The Reader controller will use explicit states:

- `loading`
- `reading`
- `daily-goal-reached`
- `daily-goal-complete`
- `continuing`
- `book-complete`
- `error`

The visual Reader remains presentational. It must not issue direct Supabase queries.
