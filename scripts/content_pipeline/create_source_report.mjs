import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { readManifest } from './source_manifest.mjs'

const manifest = await readManifest()
const reportPath = path.resolve(
  'content/staging/reports/source-registration.md',
)

await mkdir(path.dirname(reportPath), { recursive: true })

const lines = [
  '# Source Registration Report',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '| Book | Translator | Edition | PDF pages | Source | Rights |',
  '| --- | --- | --- | ---: | --- | --- |',
]

for (const work of manifest.works) {
  lines.push(
    `| ${work.title} | ${work.translator} | ${work.edition} | ${work.pdf_page_count} | ${work.source_file} | ${work.rights_status} |`,
  )
}

lines.push(
  '',
  'Source files are referenced by filename and checksum only.',
  'Local absolute paths are stored in an ignored configuration file.',
  '',
  'These PDFs are approved for local structural analysis only.',
  'Production redistribution remains pending rights clearance.',
  '',
)

await writeFile(reportPath, lines.join('\n'), 'utf8')
console.log(`Created ${reportPath}`)
