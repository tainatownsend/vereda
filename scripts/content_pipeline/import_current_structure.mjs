import { createHash } from 'node:crypto'
import {
  access,
  copyFile,
  mkdir,
  readFile,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'

const REQUIRED_HEADERS = [
  'book_id',
  'book_title',
  'section_id',
  'sec_position',
  'kind',
  'part_title',
  'chapter_label',
  'chapter_title',
  'section_title',
  'record_title',
  'stored_word_count',
  'calculated_word_count',
  'content_character_count',
  'paragraph_block_count',
  'normalized_content_md5',
]

const inputArgument = process.argv[2]

if (!inputArgument) {
  console.error(
    'Usage: npm run content:comparison:import -- <csv-path>',
  )
  process.exit(1)
}

const inputPath = path.resolve(inputArgument)
const outputDirectory = path.resolve(
  'content/structure/current',
)
const outputPath = path.join(
  outputDirectory,
  'current-section-structure.csv',
)
const metadataPath = path.join(
  outputDirectory,
  'snapshot-metadata.json',
)

await access(inputPath)

if (path.extname(inputPath).toLowerCase() !== '.csv') {
  console.error('The exported file must be a CSV.')
  process.exit(1)
}

const buffer = await readFile(inputPath)
const raw = buffer.toString('utf8').replace(/^\uFEFF/, '')
const firstLine = raw.split(/\r?\n/, 1)[0]
const headers = firstLine
  .split(',')
  .map((header) => header.trim().replace(/^"|"$/g, ''))

const missingHeaders = REQUIRED_HEADERS.filter(
  (header) => !headers.includes(header),
)

if (missingHeaders.length) {
  console.error(
    `Missing CSV headers: ${missingHeaders.join(', ')}`,
  )
  process.exit(1)
}

const dataRows = raw
  .split(/\r?\n/)
  .slice(1)
  .filter((line) => line.trim()).length

if (!dataRows) {
  console.error('The CSV does not contain data rows.')
  process.exit(1)
}

await mkdir(outputDirectory, { recursive: true })
await copyFile(inputPath, outputPath)

const sha256 = createHash('sha256')
  .update(buffer)
  .digest('hex')

await writeFile(
  metadataPath,
  `${JSON.stringify(
    {
      schema_version: 1,
      source_filename: path.basename(inputPath),
      imported_at: new Date().toISOString(),
      row_count: dataRows,
      sha256,
      contains_full_text: false,
      contains_user_data: false,
    },
    null,
    2,
  )}\n`,
  'utf8',
)

console.log(`Imported ${dataRows} section rows.`)
console.log(`Snapshot: ${outputPath}`)
console.log(`SHA-256: ${sha256}`)
