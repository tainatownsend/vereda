import {
  readManifest,
  validateManifest,
} from './source_manifest.mjs'

const manifest = await readManifest()
const errors = validateManifest(manifest)

if (errors.length) {
  console.error('Source manifest validation failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(
  `Source manifest valid: ${manifest.works.length} works registered.`,
)
