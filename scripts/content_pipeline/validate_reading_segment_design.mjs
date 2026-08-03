import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const manifest = JSON.parse(
  await readFile(
    'content/migration/reading-segment-design-manifest.json',
    'utf8',
  ),
)
const reviewQueue = JSON.parse(
  await readFile(
    'content/migration/reading-segment-review-queue.json',
    'utf8',
  ),
)
const contract = JSON.parse(
  await readFile(
    'content/migration/reading-segment-design-contract.json',
    'utf8',
  ),
)

const loadSql = await readFile(
  path.resolve(
    manifest.artifacts.draft_load_sql,
  ),
  'utf8',
)
const verificationSql = await readFile(
  path.resolve(
    manifest.artifacts.future_verification_sql,
  ),
  'utf8',
)

const sha256 = (value) =>
  createHash('sha256').update(value).digest('hex')

const errors = []

if (manifest.schema_version !== 1) {
  errors.push('schema_version must be 1')
}

if (manifest.status !== 'designed-not-applied') {
  errors.push(
    'status must be designed-not-applied',
  )
}

if (
  manifest.design_version !==
  contract.design_version
) {
  errors.push(
    'manifest and contract design versions differ',
  )
}

if (manifest.rights_status !== 'blocked') {
  errors.push('rights_status must remain blocked')
}

if (manifest.contains_full_text !== false) {
  errors.push('complete source text must be absent')
}

if (manifest.sql_applied !== false) {
  errors.push('SQL must remain unapplied in PR-0018')
}

if (
  manifest.production_mutation_allowed !== false
) {
  errors.push(
    'production mutation must remain disabled',
  )
}

if (manifest.cutover_allowed !== false) {
  errors.push('cutover must remain disabled')
}

if (
  manifest.totals?.editorial_node_count !== 826
) {
  errors.push(
    'design must reference 826 editorial nodes',
  )
}

if (
  manifest.totals?.segment_proposal_count <= 0
) {
  errors.push(
    'design must contain segment proposals',
  )
}

if (
  manifest.totals?.segment_proposal_count !==
  manifest.proposals?.length
) {
  errors.push(
    'proposal count does not match proposals array',
  )
}

if (
  manifest.totals?.manual_review_count !==
  reviewQueue.proposal_count
) {
  errors.push(
    'review queue count differs from manifest',
  )
}

const keys = new Set()
const ordersByBook = new Map()

for (const proposal of manifest.proposals || []) {
  if (!/^[a-f0-9]{24}$/.test(
    proposal.segment_key,
  )) {
    errors.push(
      `invalid segment key: ${proposal.segment_key}`,
    )
  }

  if (keys.has(proposal.segment_key)) {
    errors.push(
      `duplicate segment key: ${proposal.segment_key}`,
    )
  }

  keys.add(proposal.segment_key)

  if (
    proposal.approval_status !==
    'boundary-review'
  ) {
    errors.push(
      `${proposal.segment_key}: approval status must be boundary-review`,
    )
  }

  if (proposal.content_included !== false) {
    errors.push(
      `${proposal.segment_key}: content must be absent`,
    )
  }

  const orders =
    ordersByBook.get(proposal.book_id) || []
  orders.push(proposal.segment_order)
  ordersByBook.set(proposal.book_id, orders)

  for (const forbidden of [
    'content',
    'raw_text',
    'full_text',
    'excerpt',
    'normalized_content_sha256',
  ]) {
    if (Object.hasOwn(proposal, forbidden)) {
      errors.push(
        `${proposal.segment_key}: forbidden key ${forbidden}`,
      )
    }
  }
}

for (const [bookId, orders] of ordersByBook) {
  const sorted = [...orders].sort(
    (left, right) => left - right,
  )
  const expected = Array.from(
    { length: sorted.length },
    (_, index) => index + 1,
  )

  if (
    JSON.stringify(sorted) !==
    JSON.stringify(expected)
  ) {
    errors.push(
      `book ${bookId}: segment order is not contiguous`,
    )
  }
}

const leafProposalCount = (
  manifest.proposals || []
).filter(
  (proposal) =>
    proposal.proposal_kind === 'leaf-node',
).length

if (
  leafProposalCount !==
  manifest.totals.leaf_node_proposal_count
) {
  errors.push(
    'leaf proposal count does not match total',
  )
}

if (
  sha256(loadSql) !==
  manifest.artifacts.draft_load_sql_sha256
) {
  errors.push('draft load SQL checksum mismatch')
}

if (
  sha256(verificationSql) !==
  manifest.artifacts
    .future_verification_sql_sha256
) {
  errors.push(
    'verification SQL checksum mismatch',
  )
}

for (const marker of [
  'begin;',
  'insert into content_staging.reading_segments',
  "approval_status",
  "boundary-review",
  'commit;',
]) {
  if (!loadSql.toLowerCase().includes(
    marker.toLowerCase(),
  )) {
    errors.push(
      `draft load SQL missing marker: ${marker}`,
    )
  }
}

const productionMutation =
  /\b(?:insert\s+into|update|delete\s+from|truncate|alter\s+table|drop\s+table)\s+public\./i

if (productionMutation.test(loadSql)) {
  errors.push(
    'draft load SQL contains a production mutation',
  )
}

for (const table of [
  'current_successor_mappings',
  'dependency_snapshots',
  'dry_run_results',
]) {
  if (
    new RegExp(
      `insert\\s+into\\s+content_staging\\.${table}\\b`,
      'i',
    ).test(loadSql)
  ) {
    errors.push(
      `draft load SQL cannot insert into ${table}`,
    )
  }
}

if (
  !loadSql.includes(
    '  null,\n  null,\n  null,\n  payload.approval_status',
  )
) {
  errors.push(
    'draft load SQL must insert null content, word count, and content checksum',
  )
}

if (
  !verificationSql.includes(
    'from (\n',
  ) ||
  !verificationSql.includes(
    ') checks\norder by checks.check_key;',
  )
) {
  errors.push(
    'verification SQL must order an outer UNION result',
  )
}

if (errors.length) {
  console.error(
    'Reading-segment design validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  `Validated ${manifest.totals.segment_proposal_count} deterministic segment proposals.`,
)
console.log(
  `Manual review queue: ${manifest.totals.manual_review_count}.`,
)
console.log(
  'No complete source text, database application, production mutation, mapping, dependency snapshot, or cutover is included.',
)
