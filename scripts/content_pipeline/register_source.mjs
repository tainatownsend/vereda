import { access } from 'node:fs/promises'
import path from 'node:path'

import {
  LOCAL_SOURCES_PATH,
  readJson,
  readManifest,
  sha256File,
  validateManifest,
  writeJson,
} from './source_manifest.mjs'

const [slug, inputPath] = process.argv.slice(2)

if (!slug || !inputPath) {
  console.error(
    'Usage: node scripts/content_pipeline/register_source.mjs <slug> <pdf-path>',
  )
  process.exit(1)
}

const absolutePath = path.resolve(inputPath)
await access(absolutePath)

if (path.extname(absolutePath).toLowerCase() !== '.pdf') {
  console.error('Source file must be a PDF.')
  process.exit(1)
}

const manifest = await readManifest()
const errors = validateManifest(manifest)

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}

const work = manifest.works.find((item) => item.slug === slug)

if (!work) {
  console.error(`Unknown work slug: ${slug}`)
  process.exit(1)
}

const actualHash = await sha256File(absolutePath)

if (actualHash !== work.source_sha256) {
  console.error(`Checksum mismatch for ${work.title}`)
  console.error(`Expected: ${work.source_sha256}`)
  console.error(`Actual:   ${actualHash}`)
  process.exit(1)
}

let localSources = {}

try {
  localSources = await readJson(LOCAL_SOURCES_PATH)
} catch {
  localSources = {}
}

localSources[slug] = absolutePath
await writeJson(LOCAL_SOURCES_PATH, localSources)

console.log(`Registered locally: ${work.title}`)
console.log(`File: ${path.basename(absolutePath)}`)
console.log(`SHA-256 verified: ${actualHash}`)
