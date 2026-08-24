import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const app = readFileSync('src/App.jsx', 'utf8')
const reader = readFileSync('src/pages/ReaderPage.jsx', 'utf8')
const settings = readFileSync('src/pages/SettingsPage.jsx', 'utf8')
const auth = readFileSync('src/pages/AuthPage.jsx', 'utf8')
const library = readFileSync('src/pages/LibraryPage.jsx', 'utf8')
const hooks = readFileSync('src/hooks/index.js', 'utf8')
const styles = readFileSync('src/index.css', 'utf8')
const ui = readFileSync('src/components/ui/index.jsx', 'utf8')

describe('navigation and visual polish from authenticated smoke review', () => {
  it('opens routes and reading sections at the top instead of restoring stale scroll', () => {
    expect(app).toContain('function ScrollToTop()')
    expect(app).toContain('useLayoutEffect')
    expect(app).toContain("window.scrollTo({ top: 0, left: 0, behavior: 'auto' })")
    expect(reader).toContain('currentSection?.section_id')
    expect(reader).not.toContain('vereda-reader-scroll')
    expect(styles).not.toContain('scroll-behavior: smooth;')
  })

  it('reuses reading data between route mounts and deduplicates book loading', () => {
    expect(hooks).toContain('const loadedUserData = new Set()')
    expect(hooks).toContain('const userDataRequests = new Map()')
    expect(hooks).toContain('let booksRequest = null')
    expect(hooks).toContain('loadedUserData.has(userId)')
  })

  it('keeps the desktop login composition compact enough for common laptop heights', () => {
    expect(auth).toContain('mt-12 max-w-[32rem] pb-36')
    expect(auth).toContain('text-[3.15rem]')
    expect(auth).toContain('lg:py-8')
    expect(auth).not.toContain('lg:justify-between')
  })

  it('aligns the settings header with its content column', () => {
    expect(settings).toContain('<header className="ves-container max-w-2xl pb-7 pt-8">')
    expect(settings).toContain('<div className="ves-container max-w-2xl space-y-5 pb-10">')
  })

  it('uses Vereda brand accents for book markers instead of legacy cover colors', () => {
    expect(library).toContain('BOOK_ACCENT_COLORS')
    expect(library).toContain("2: '#AB6D50'")
    expect(library).toContain("3: '#B9A46E'")
    expect(library).not.toContain('book.cover_color')
  })

  it('puts sequence guidance before the library list and numbers each work', () => {
    const guidanceIndex = library.indexOf('Uma sequência sugerida, não uma obrigação')
    const booksSectionIndex = library.indexOf('aria-labelledby="all-books-heading"')

    expect(guidanceIndex).toBeGreaterThan(-1)
    expect(booksSectionIndex).toBeGreaterThan(guidanceIndex)
    expect(library).toContain('getBookSequence(book)')
    expect(library).toContain('Sequência sugerida das obras')
    expect(library).toContain('Não sei por onde começar')
    expect(library).toContain('Quero explorar um tema')
  })

  it('uses a larger animated Vereda mark for page loading', () => {
    expect(ui).toContain('<VeredaLogo size={82}')
    expect(ui).toContain('motion-safe:animate-spin')
    expect(ui).toContain('motion-safe:animate-pulse')
    expect(ui).toContain('min-h-[60vh]')
  })
})
