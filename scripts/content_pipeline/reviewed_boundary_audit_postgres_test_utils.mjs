export const sqlLiteral = (value, type) => {
  if (value === null || value === undefined) return 'NULL'
  if (type === 'jsonb') return `${sqlLiteral(JSON.stringify(value))}::jsonb`
  if (type === 'uuid') return `${sqlLiteral(value)}::uuid`
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('SQL numeric values must be finite')
    return String(value)
  }
  if (typeof value !== 'string') throw new TypeError(`Unsupported SQL literal type: ${typeof value}`)
  return `'${value.replaceAll("'", "''")}'`
}

export const parsePostgresError = (error) => {
  const stderr = String(error?.stderr || error?.message || '')
  return {
    sqlstate: /ERROR:\s+([0-9A-Z]{5}):/m.exec(stderr)?.[1] ?? null,
    constraint: /CONSTRAINT NAME:\s+([^\n\r]+)/m.exec(stderr)?.[1]?.trim() ?? null,
    summary: stderr.split(/\r?\n/).find(line => /ERROR:/.test(line))?.slice(0, 300) ?? 'psql command failed',
  }
}

export const transactionalSql = (statement) => `begin;\n${statement}\nrollback;`

const payloadIdentityFields = new Set(['event_version', 'decision_id', 'book_id', 'segment_key', 'event_action'])

export const missingIdentityFixture = (canonicalPayload, field) => {
  const payload = structuredClone(canonicalPayload)
  // PostgreSQL CHECK accepts TRUE or NULL. Matching JSON nulls make scalar
  // comparisons UNKNOWN; nested target_identity must also match exactly so the
  // details check is never FALSE and identity completeness is the sole failure.
  if (payloadIdentityFields.has(field)) payload[field] = null
  if (field === 'book_id' || field === 'segment_key') payload.target_identity[field] = null
  return {
    structured: { [field]: null },
    payload,
    expectedSqlstate: '23514',
    expectedConstraint: 'migration_audit_events_reviewed_boundary_identity_complete_chk',
  }
}
