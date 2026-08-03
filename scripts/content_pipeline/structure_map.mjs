const ALLOWED_NODE_TYPES = new Set([
  'front_matter',
  'division',
  'chapter',
  'group',
  'section',
  'back_matter',
])

const FORBIDDEN_FULL_TEXT_KEYS = new Set([
  'content',
  'raw_text',
  'full_text',
  'excerpt',
])

export function validateStructureMap(
  structureMap,
  expected = {},
) {
  const errors = []

  if (structureMap.schema_version !== 1) {
    errors.push('schema_version must be 1')
  }

  const nodes = structureMap.nodes || []
  const ids = new Set()

  nodes.forEach((node, index) => {
    if (!node.id) {
      errors.push(`node ${index + 1} has no id`)
    }

    if (ids.has(node.id)) {
      errors.push(`duplicate node id: ${node.id}`)
    }

    ids.add(node.id)

    if (node.order !== index + 1) {
      errors.push(
        `node order mismatch at ${index + 1}`,
      )
    }

    if (!ALLOWED_NODE_TYPES.has(node.type)) {
      errors.push(
        `invalid node type: ${node.type}`,
      )
    }

    for (const key of Object.keys(node)) {
      if (FORBIDDEN_FULL_TEXT_KEYS.has(key)) {
        errors.push(
          `forbidden full-text key: ${key}`,
        )
      }
    }
  })

  for (const node of nodes) {
    if (
      node.parent_id &&
      !ids.has(node.parent_id)
    ) {
      errors.push(
        `missing parent: ${node.parent_id}`,
      )
    }
  }

  if (
    expected.chapters !== undefined &&
    structureMap.counts?.chapters !==
      expected.chapters
  ) {
    errors.push(
      `expected ${expected.chapters} chapters`,
    )
  }

  if (
    expected.divisions !== undefined &&
    structureMap.counts?.divisions !==
      expected.divisions
  ) {
    errors.push(
      `expected ${expected.divisions} divisions`,
    )
  }

  if (structureMap.review_flags?.length) {
    errors.push(
      `${structureMap.review_flags.length} review flags remain`,
    )
  }

  return errors
}
