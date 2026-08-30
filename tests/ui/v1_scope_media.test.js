import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const home = readFileSync('src/pages/HomePage.jsx', 'utf8')
const app = readFileSync('src/App.jsx', 'utf8')

describe('v1 scope: future media experiences', () => {
  it('keeps Resumos and Audiobooks out of the first-version Home actions', () => {
    expect(home).not.toContain('Resumos')
    expect(home).not.toContain('Audiobooks')
    expect(home).not.toContain('Em breve')
    expect(home).toContain('label="Livros"')
    expect(home).toContain('label="Reflexões"')
  })

  it('does not expose summary or audiobook routes in v1', () => {
    expect(app).not.toContain('path="/resumos')
    expect(app).not.toContain('path="/audiobooks')
  })
})
