import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const scriptArgs = process.argv.slice(2)

if (!scriptArgs.length) {
  console.error('A Python script path is required.')
  process.exit(1)
}

const candidates = process.platform === 'win32'
  ? [
      path.resolve('.venv-content/Scripts/python.exe'),
      'py',
      'python',
    ]
  : [
      path.resolve('.venv-content/bin/python'),
      'python3',
      'python',
    ]

for (const candidate of candidates) {
  if (
    candidate.includes(path.sep) &&
    !existsSync(candidate)
  ) {
    continue
  }

  const args =
    candidate === 'py'
      ? ['-3', ...scriptArgs]
      : scriptArgs

  const result = spawnSync(candidate, args, {
    stdio: 'inherit',
  })

  if (!result.error) {
    process.exit(result.status ?? 1)
  }

  if (result.error.code !== 'ENOENT') {
    console.error(result.error.message)
    process.exit(1)
  }
}

console.error(
  'Python 3 was not found. Install Python 3.9 or newer.',
)
process.exit(1)
