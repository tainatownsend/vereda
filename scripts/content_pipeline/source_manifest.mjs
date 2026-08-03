import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const MANIFEST_PATH = path.resolve(
  'content/sources/manifest.json',
)

export const LOCAL_SOURCES_PATH = path.resolve(
  'content/sources/local-sources.json',
)

export async function readJson(filePath) {
  const raw = await readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

export async function writeJson(filePath, value) {
  await writeFile(
    filePath,
    `${JSON.stringify(value, null, 2)}\n`,
    'utf8',
  )
}

export async function readManifest() {
  return readJson(MANIFEST_PATH)
}

export async function writeManifest(manifest) {
  await writeJson(MANIFEST_PATH, manifest)
}

export async function sha256File(filePath) {
  const buffer = await readFile(filePath)
  return createHash('sha256').update(buffer).digest('hex')
}

export function validateManifest(manifest) {
  const errors = []

  if (manifest.schema_version !== 2) {
    errors.push('schema_version must be 2')
  }

  if (!Array.isArray(manifest.works) || manifest.works.length !== 5) {
    errors.push('manifest must contain exactly five works')
  }

  const ids = new Set()
  const slugs = new Set()
  const files = new Set()
  const hashes = new Set()

  for (const work of manifest.works || []) {
    if (!Number.isInteger(work.book_id)) {
      errors.push(`invalid book_id for ${work.title || 'unknown work'}`)
    }

    if (ids.has(work.book_id)) {
      errors.push(`duplicate book_id: ${work.book_id}`)
    }

    if (!work.slug) {
      errors.push(`missing slug for book_id ${work.book_id}`)
    }

    if (slugs.has(work.slug)) {
      errors.push(`duplicate slug: ${work.slug}`)
    }

    if (!work.title) {
      errors.push(`missing title for book_id ${work.book_id}`)
    }

    if (!work.source_file) {
      errors.push(`missing source_file for ${work.slug}`)
    }

    if (files.has(work.source_file)) {
      errors.push(`duplicate source_file: ${work.source_file}`)
    }

    if (!/^[a-f0-9]{64}$/.test(work.source_sha256 || '')) {
      errors.push(`invalid source_sha256 for ${work.slug}`)
    }

    if (hashes.has(work.source_sha256)) {
      errors.push(`duplicate source_sha256: ${work.source_sha256}`)
    }

    if (!Number.isInteger(work.pdf_page_count)) {
      errors.push(`invalid pdf_page_count for ${work.slug}`)
    }

    ids.add(work.book_id)
    slugs.add(work.slug)
    files.add(work.source_file)
    hashes.add(work.source_sha256)
  }

  return errors
}
