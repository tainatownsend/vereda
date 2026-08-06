begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- PR-0055: deterministic reviewed-boundary audit identity only.
-- This migration preserves legacy content_staging.migration_audit_events rows and
-- legacy insert producers by adding nullable compatibility columns. It does not
-- insert audit events, mutate reading-segment rows, execute application SQL, or
-- authorize rollback execution.

alter table content_staging.migration_audit_events
  add column if not exists package_id text,
  add column if not exists event_version integer,
  add column if not exists decision_id text,
  add column if not exists book_id integer,
  add column if not exists segment_key text,
  add column if not exists event_action text,
  add column if not exists event_key text;

alter table content_staging.migration_audit_events
  add constraint migration_audit_events_reviewed_boundary_identity_complete_chk
  check (
    package_id is null
    or package_id <> 'reading-segment-reviewed-boundary-execution'
    or (
      event_version is not null
      and decision_id is not null
      and book_id is not null
      and segment_key is not null
      and event_action is not null
      and event_key is not null
    )
  ),
  add constraint migration_audit_events_reviewed_boundary_action_chk
  check (
    package_id is null
    or package_id <> 'reading-segment-reviewed-boundary-execution'
    or event_action in ('status-advanced', 'status-rollback')
  ),
  add constraint migration_audit_events_reviewed_boundary_event_type_chk
  check (
    package_id is null
    or package_id <> 'reading-segment-reviewed-boundary-execution'
    or event_type = 'reading-segment-reviewed-boundary.' || event_action
  ),
  add constraint migration_audit_events_reviewed_boundary_version_chk
  check (
    package_id is null
    or package_id <> 'reading-segment-reviewed-boundary-execution'
    or event_version = 1
  ),
  add constraint migration_audit_events_reviewed_boundary_segment_key_chk
  check (
    package_id is null
    or package_id <> 'reading-segment-reviewed-boundary-execution'
    or segment_key ~ '^[a-f0-9]{20,64}$'
  ),
  add constraint migration_audit_events_reviewed_boundary_event_key_chk
  check (
    package_id is null
    or package_id <> 'reading-segment-reviewed-boundary-execution'
    or event_key = encode(extensions.digest(
      'sha256-v1-length-delimited-reviewed-boundary-event-key'
      || '|package_id=' || length(package_id)::text || ':' || package_id
      || '|event_action=' || length(event_action)::text || ':' || event_action
      || '|run_id=' || length(run_id::text)::text || ':' || run_id::text
      || '|decision_id=' || length(decision_id)::text || ':' || decision_id
      || '|book_id=' || length(book_id::text)::text || ':' || book_id::text
      || '|segment_key=' || length(segment_key)::text || ':' || segment_key
      || '|event_version=' || length(event_version::text)::text || ':' || event_version::text,
      'sha256'
    ), 'hex')
  ),
  add constraint migration_audit_events_reviewed_boundary_details_chk
  check (
    package_id is null
    or package_id <> 'reading-segment-reviewed-boundary-execution'
    or (
      details ? 'package_id'
      and details ? 'package_version'
      and details ? 'event_version'
      and details ? 'event_action'
      and details ? 'decision_id'
      and details ? 'run_id'
      and details ? 'book_id'
      and details ? 'segment_key'
      and details ? 'previous_approval_status'
      and details ? 'resulting_approval_status'
      and details ? 'target_table'
      and details ? 'target_identity'
      and details ? 'authority_manifest_hash'
      and details ? 'package_hash'
      and details->>'package_id' = package_id
      and details->>'package_version' = '1.0.0'
      and (details->>'event_version')::integer = event_version
      and details->>'event_action' = event_action
      and details->>'decision_id' = decision_id
      and details->>'run_id' = run_id::text
      and (details->>'book_id')::integer = book_id
      and details->>'segment_key' = segment_key
      and details->>'target_table' = 'content_staging.reading_segments'
      and details->'target_identity' = jsonb_build_object('run_id', run_id::text, 'book_id', book_id, 'segment_key', segment_key)
      and details->>'authority_manifest_hash' ~ '^[a-f0-9]{64}$'
      and details->>'package_hash' ~ '^[a-f0-9]{64}$'
      and (
        (event_action = 'status-advanced' and details->>'previous_approval_status' = 'boundary-review' and details->>'resulting_approval_status' = 'content-review')
        or
        (event_action = 'status-rollback' and details->>'previous_approval_status' = 'content-review' and details->>'resulting_approval_status' = 'boundary-review')
      )
    )
  );

create unique index if not exists migration_audit_events_reviewed_boundary_event_key_uidx
  on content_staging.migration_audit_events (event_key)
  where package_id = 'reading-segment-reviewed-boundary-execution'
    and event_version = 1
    and decision_id is not null
    and book_id is not null
    and segment_key is not null
    and event_action in ('status-advanced', 'status-rollback')
    and event_key is not null;

commit;
