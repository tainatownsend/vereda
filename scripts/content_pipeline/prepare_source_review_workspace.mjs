import {
  mkdir,
  readFile,
  writeFile,
} from 'node:fs/promises'

const worklist = JSON.parse(
  await readFile(
    'content/migration/reading-segment-source-review-worklist.json',
    'utf8',
  ),
)

const root =
  '.vereda-private/source-review'

await mkdir(root, {
  recursive: true,
})

const localWorkspace = {
  schema_version: 1,
  status: 'private-review-workspace',
  policy_version:
    worklist.policy_version,
  run_id: worklist.run_id,
  warning:
    'PRIVATE LOCAL FILE. Never commit this directory. Public decision records must not contain source text, excerpts, quotations, OCR output, or private notes.',
  items: worklist.items.map(
    (item) => ({
      ...item,
      local_review: {
        private_notes: '',
        temporary_source_excerpt:
          '',
        source_edition_checked:
          false,
        review_complete:
          false,
      },
    }),
  ),
}

const readme = `# Private source-review workspace

This directory is intentionally ignored by Git.

Use it while inspecting the locally held source editions.

It may contain temporary private notes or short source references needed during
review. None of that material may be copied into the public repository.

The public record may contain only:

- structured decision options;
- page numbers;
- structural locator types and values;
- confidence level;
- completion timestamp.

Do not remove \`.vereda-private/\` from \`.gitignore\`.
`

await Promise.all([
  writeFile(
    `${root}/source-review-decisions.local.json`,
    `${JSON.stringify(
      localWorkspace,
      null,
      2,
    )}\n`,
    'utf8',
  ),
  writeFile(
    `${root}/README.md`,
    `${readme}\n`,
    'utf8',
  ),
])

console.log(
  `Private workspace prepared at ${root}.`,
)
console.log(
  'The directory is ignored by Git.',
)
