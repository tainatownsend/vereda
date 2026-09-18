import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const home = readFileSync('src/pages/HomePage.jsx', 'utf8')
const library = readFileSync('src/pages/LibraryPage.jsx', 'utf8')
const reader = readFileSync('src/pages/ReaderPage.jsx', 'utf8')
const reflection = readFileSync('src/pages/ReflectionPage.jsx', 'utf8')
const favorites = readFileSync('src/pages/FavoritesPage.jsx', 'utf8')
const discover = readFileSync('src/pages/DiscoverPage.jsx', 'utf8')
const community = readFileSync('src/pages/CommunityPage.jsx', 'utf8')
const settings = readFileSync('src/pages/SettingsPage.jsx', 'utf8')
const more = readFileSync('src/pages/MorePage.jsx', 'utf8')
const bottomNav = readFileSync('src/components/ui/BottomNav.jsx', 'utf8')

describe('Vereda approved North Star canonical screens', () => {
  it('keeps Home focused on welcome, continuation, and one daily reflection', () => {
    expect(home).toContain('Que a paz do bem te acompanhe nesta jornada.')
    expect(home).toContain('getGreeting(profile?.name)')
    expect(home).toContain('Continuar estudo')
    expect(home).toContain('Reflexão do dia')
    expect(home).toContain('northStarLandscape')
    expect(home).toContain("navigate('/reflexoes')")
    expect(home).toContain("linear-gradient(135deg, #596A55 0%, #4D5E49 100%)")
    expect(home).not.toContain('Outros caminhos')
    expect(home).not.toContain('Resumos')
    expect(home).not.toContain('Audiobooks')
    expect(home).not.toContain('Comunidade Vereda')
  })

  it('presents Estudos as a compact editorial collection with useful progress filters', () => {
    expect(library).toContain('Estudos')
    expect(library).toContain("label: 'Todos'")
    expect(library).toContain("label: 'Em andamento'")
    expect(library).toContain("label: 'Concluídos'")
    expect(library).toContain('Estudo guiado')
    expect(library).toContain('Sugerir uma obra complementar')
    expect(library).toContain('ProgressLine')
    expect(library).toContain('BookCover')
    expect(library).toContain("navigate('/descobrir')")
    expect(library).not.toContain('Atalhos de estudo')
  })

  it('keeps book suggestions out of profile and available from Studies', () => {
    expect(library).toContain('Sugerir uma obra complementar')
    expect(settings).not.toContain('Sugerir uma obra')
    expect(settings).not.toContain("navigate('/sugerir-obra')")
    expect(settings).toContain('Refazer orientação')
  })

  it('keeps Reader editorial and adds a clearly separated Vereda reflection prompt', () => {
    expect(reader).toContain("[currentSection.part_title, currentSection.chapter_label]")
    expect(reader).toContain('Nesta parte')
    expect(reader).toContain('extractChapterOverview')
    expect(reader).toContain('Ajustar texto e abrir opções')
    expect(reader).toContain('Anterior')
    expect(reader).toContain('Próximo')
    expect(reader).toContain('Salvar este trecho')
    expect(reader).toContain('Minha nota neste trecho')
    expect(reader).toContain('BookIndexPanel')
    expect(reader).toContain('Para refletir')
    expect(reader).toContain('O que este trecho desperta em você?')
    expect(reader).toContain('Registrar uma reflexão')
  })

  it('makes Reflections a primary destination with Today, Favorites, and Mine', () => {
    expect(reflection).toContain('Reflexões')
    expect(reflection).toContain('Hoje')
    expect(reflection).toContain('Favoritas')
    expect(reflection).toContain('Minhas')
    expect(reflection).toContain('Reflexão de hoje')
    expect(reflection).toContain('Outra')
    expect(reflection).toContain('Minha reflexão')
    expect(reflection).toContain('Salvar minha reflexão')
    expect(reflection).toContain('Minhas reflexões')
    expect(reflection).toContain('Vinculada à sua conta')
  })

  it('keeps Favorites as one collection view for existing saved content', () => {
    expect(favorites).toContain('Favoritos')
    expect(favorites).toContain('Trechos das obras')
    expect(favorites).toContain('Notas de estudo')
    expect(favorites).toContain('Minhas reflexões')
  })

  it('keeps Discover available contextually rather than in primary navigation', () => {
    expect(discover).toContain('O que você quer compreender hoje?')
    expect(discover).toContain('Pesquisar')
    expect(discover).toContain('Explorar temas')
    expect(bottomNav).not.toContain("label: 'Descobrir'")
  })

  it('keeps deferred Community code available without exposing it as primary navigation', () => {
    expect(community).toContain('Comunidade')
    expect(bottomNav).not.toContain("label: 'Comunidade'")
  })

  it('uses only the four primary destinations from the approved mockup', () => {
    expect(bottomNav).toContain("label: 'Início'")
    expect(bottomNav).toContain("label: 'Estudos'")
    expect(bottomNav).toContain("label: 'Reflexões'")
    expect(bottomNav).toContain("label: 'Mais'")
    expect(bottomNav).toContain("path: '/biblioteca'")
    expect(bottomNav).toContain("path: '/reflexoes'")
    expect(bottomNav).toContain("path: '/mais'")
    expect(bottomNav).not.toContain("label: 'Biblioteca'")
    expect(bottomNav).not.toContain("label: 'Jornada'")
    expect(bottomNav).not.toContain("label: 'Notas'")
    expect(bottomNav).not.toContain("label: 'Perfil'")
  })

  it('moves secondary destinations into Mais without deleting their routes', () => {
    expect(more).toContain('Minha jornada')
    expect(more).toContain('Notas de estudo')
    expect(more).toContain('Trechos salvos')
    expect(more).toContain('Estudo guiado')
    expect(more).toContain('Plano de estudo')
    expect(more).toContain('Perfil e preferências')
  })
})
