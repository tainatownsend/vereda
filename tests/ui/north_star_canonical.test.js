import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
const read = path => readFileSync(path, 'utf8')
const home = read('src/pages/HomePage.jsx')
const library = read('src/pages/LibraryPage.jsx')
const reader = read('src/pages/ReaderPage.jsx')
const reflection = read('src/pages/ReflectionPage.jsx')
const nav = read('src/components/ui/BottomNav.jsx')
const more = read('src/pages/MorePage.jsx')
const app = read('src/App.jsx')

describe('approved photographic/editorial North Star — September 18', () => {
  it('puts a personal welcome, atmosphere and continuation before one daily reflection', () => {
    for (const value of ['getGreeting(profile?.name', 'Abrir meu perfil', 'home-landscape', 'Continuar estudo', 'Reflexão do dia', 'dailyReflection.author']) expect(home).toContain(value)
    expect(home.indexOf('home-continue')).toBeLessThan(home.indexOf('home-reflection'))
    for (const clutter of ['QuickActions', 'Outros caminhos', 'grid-cols-', 'streak', 'sessionsThisWeek']) expect(home).not.toContain(clutter)
  })
  it('shows a scannable collection with actual unit progress and guided study access', () => {
    for (const value of ['>Estudos</h1>', 'Todos', 'Em andamento', 'Concluídos', 'BookCover', 'book.title', 'book.author', 'ProgressLine', 'getBookProgress', "navigate('/estudo-guiado')"]) expect(library).toContain(value)
    expect(library).not.toContain('getBookSequence')
    expect(library).not.toContain('capítulos`')
  })
  it('exposes four destinations, safe areas and no truncated nav labels', () => {
    for (const label of ['Início', 'Estudos', 'Reflexões', 'Mais']) expect(nav).toContain(`label: '${label}'`)
    expect(nav.match(/label: '/g)).toHaveLength(4)
    expect(nav).toContain('pb-safe')
    expect(nav).not.toContain('truncate')
    expect(nav).not.toContain("pathname === '/reflexoes'\n")
    expect(read('src/index.css')).toContain('.northstar-nav-item')
  })
  it('retains deep links and makes secondary features reachable in Mais', () => {
    for (const path of ['/notas', '/salvos', '/favoritos', '/evolucao', '/plano-de-estudo', '/configuracoes']) {
      expect(app).toContain(`path="${path}"`)
      expect(more).toContain(`'${path}'`)
    }
    expect(more).toContain('signOut()')
    expect(app).toContain('<ProtectedRoute><MorePage /></ProtectedRoute>')
  })
  it('keeps source structure, text controls, reflection authorship and semantic reading navigation', () => {
    for (const value of ['currentSection.part_title', 'currentSection.chapter_label', 'book.title', 'BookIndexPanel', 'Preferências de texto', 'Salvar este trecho', 'Para refletir', 'Convite à reflexão · Vereda', 'Trecho anterior', 'Próximo trecho', 'session.completeCurrentSection', 'getReaderReturnPath']) expect(reader).toContain(value)
    expect(reader).not.toContain('grid-cols-[2.75rem_1fr_2.75rem]')
    expect(read('src/pages/PassagePage.jsx')).toContain('encodeURIComponent(returnContext.path)')
  })
  it('separates curated favorites and the personal journal without removing history or sharing', () => {
    for (const value of ['Hoje', 'Favoritas', 'Minhas', 'featuredReflection.author', 'Salvar', 'Compartilhar', 'Reflexões anteriores', 'saveDailyReflection', 'shareReflectionAsImage', 'setReflectionFavorite', 'aria-label="Minha reflexão"']) expect(reflection).toContain(value)
  })
})
