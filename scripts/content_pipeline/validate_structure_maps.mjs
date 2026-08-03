import { readFile } from 'node:fs/promises'
import path from 'node:path'

import {
  validateStructureMap,
} from './structure_map.mjs'

const config = JSON.parse(
  await readFile(
    path.resolve(
      'scripts/content_pipeline/toc_config.json',
    ),
    'utf8',
  ),
)

const errors = []

for (const work of config.works) {
  const mapPath = path.resolve(
    'content/structure/source-maps',
    `${work.slug}.json`,
  )
  const structureMap = JSON.parse(
    await readFile(mapPath, 'utf8'),
  )
  const mapErrors = validateStructureMap(
    structureMap,
    {
      chapters: work.expected_chapters,
      divisions: work.expected_divisions,
    },
  )

  if (mapErrors.length) {
    errors.push(
      ...mapErrors.map(
        (error) => `${work.slug}: ${error}`,
      ),
    )
  } else {
    console.log(
      `Validated ${work.slug}: ` +
        `${structureMap.counts.total_nodes} nodes.`,
    )
  }
}

if (errors.length) {
  console.error(
    'Structure-map validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  'All five structure maps are valid.',
)
