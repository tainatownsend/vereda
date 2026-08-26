import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const app = readFileSync('src/App.jsx', 'utf8')
const reader = readFileSync('src/pages/ReaderPage.jsx', 'utf8')
const settings = readFileSync('src/pages/SettingsPage.jsx', 'utf8')
const auth = readFileSync('src/pages/AuthPage.jsx', 'utf8')
const library = readFileSync('src/pages/LibraryPage.jsx', 'utf8')
const hooks = readFileSync('src/hooks/index.js', 'utf8')
const store = readFileSync('src/store/index.js', 'utf8')
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

  it('reuses reading data and avoids duplicate auth/profile loading', () => {
    expect(hooks).toContain('const loadedUserData = new Set()')
    expect(hooks).toContain('const userDataRequests = new Map()')
    expect(hooks).toContain('let booksRequest = null')
    expect(hooks).toContain('loadedUserData.has(userId)')
    expect(store).toContain('let authInitPromise = null')
    expect(store).toContain('const profileRequests = new Map()')
    expect(store).toContain("set({ user: session.user, loading: false })")
    expect(store).toContain('void get().fetchProfile(session.user.id)')
  })

  it('keeps the desktop login composition compact enough for common laptop heights', () => {
    expect(auth).toContain('mt-12 max-w-[32rem] pb-36')
    expect(auth).toContain('text-[3.15rem]')
    expect(auth).toContain('lg:py-8')
    expect(auth).not.toContain('lg:justify-between')
  })

  it('aligns the settings header with its content column and primary-tab navigation', () => {
    expect(settings).toContain('<header className="ves-container max-w-2xl pb-7 pt-10">')
    expect(settings).toContain('<div className="ves-container max-w-2xl space-y-5 pb-10">')
    expect(settings).not.toContain('ArrowLeft')
    expect(settings).not.toContain('navigate(-1)')
  })

  it('uses Vereda brand accents for book markers instead of legacy cover colors', () => {
    expect(library).toContain('BOOK_ACCENT_COLORS')
    expect(library).toContain("2: '#AB6D50'")
    expect(library).toContain("3: '#B9A46E'")
    expect(library).not.toContain('book.cover_color')
  })

  it('makes the Library self-explanatory without duplicating Home discovery actions', () => {
    const guidanceIndex = library.indexOf('Ordem sugerida')
    const booksSectionIndex = library.indexOf('aria-labelledby="all-books-heading"')

    expect(guidanceIndex).toBeGreaterThan(-1)
    expect(booksSectionIndex).toBeGreaterThan(guidanceIndex)
    expect(library).toContain('getBookSequence(book)')
    expect(library).toContain('Preciso de ajuda para escolher')
    expect(library).toContain('Trechos salvos')
    expect(library).not.toContain('Quero explorar um tema')
    expect(library).not.toContain('ves-warm-panel')
    expect(library).not.toContain('min-h-28')
  })

  it('keeps reader controls compact so the text remains the visual focus', () => {
    expect(reader).toContain('aria-label="Ferramentas de leitura"')
    expect(reader).toContain("canSavePassage ? 'grid-cols-4' : 'grid-cols-3'")
    expect(reader).toContain('min-h-10')
    expect(reader).toContain('pb-24 pt-6')
    expect(reader).toContain('variant="ghost"')
    expect(reader).toContain('size="sm"')
    expect(reader).not.toContain('mt-3 grid grid-cols-3 gap-2')
    expect(reader).not.toContain('Salvar este trecho')
    expect(reader).not.toContain('pb-36 pt-9')
  })

  it('uses a larger animated Vereda mark for page loading', () => {
    expect(ui).toContain('<VeredaLogo size={82}')
    expect(ui).toContain('motion-safe:animate-spin')
    expect(ui).toContain('motion-safe:animate-pulse')
    expect(ui).toContain('min-h-[60vh]')
  })
})