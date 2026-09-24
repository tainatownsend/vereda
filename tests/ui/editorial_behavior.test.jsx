// @vitest-environment jsdom
import React from 'react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Home from '@/pages/HomePage'
import Library from '@/pages/LibraryPage'
import Reflections from '@/pages/ReflectionPage'
import Reader from '@/pages/ReaderPage'
import More from '@/pages/MorePage'
import BottomNav from '@/components/ui/BottomNav'
import { getBookProgress } from '@/features/home/bookProgress'
import { getGreeting } from '@/features/home/greeting'
import { getReaderReturnPath } from '@/features/reader/returnContext'
import { getActiveDestination } from '@/features/ui/navigation'
import { getFavoriteReflectionIds, withReflectionFavorite } from '@/features/reflections/favorites'
const mocks = vi.hoisted(() => ({ progress: {}, user: { id: 'test', user_metadata: {} }, setFavorite: vi.fn(), share: vi.fn(), save: vi.fn(), next: vi.fn(), previous: vi.fn(), note: vi.fn(), journal: [], phase: 'reading' }))
const books = [
  { id: 1, title: 'O Livro dos Espíritos', author: 'Allan Kardec', total_sections: 12 },
  { id: 2, title: 'O Livro dos Médiuns', author: 'Allan Kardec', total_sections: 10 },
  { id: 3, title: 'A Gênese', author: 'Allan Kardec', total_sections: 1000 },
]
vi.mock('@/hooks', () => ({ useBooks: () => books, useUserData: () => ({ progress: mocks.progress, dataLoading: false }) }))
vi.mock('@/store', () => ({ useAuthStore: () => ({ user: mocks.user, profile: { name: 'TAINÁ Townsend' }, setReflectionFavorite: mocks.setFavorite, savePassage: mocks.save, removeSavedPassage: vi.fn(), signOut: vi.fn() }), useUIStore: () => ({ fontSize: 'md', setFontSize: vi.fn() }), useReadingStore: () => ({ booksStatus: 'ready' }) }))
vi.mock('@/features/share/reflectionCard', () => ({ shareReflectionAsImage: mocks.share }))
vi.mock('@/features/studyJournal/studyJournal', () => ({ listStudyJournalEntries: async () => mocks.journal, getLocalDateKey: () => '2026-09-18', formatJournalDate: date => date, saveDailyReflection: mocks.note, getSectionNote: async () => null, saveSectionNote: vi.fn() }))
vi.mock('@/features/reader/useReadingSession', () => ({ useReadingSession: () => ({ phase: mocks.phase, currentSection: { section_id: 4, sec_position: 4, kind: 'content', part_title: 'Parte I', chapter_label: 'Capítulo 3', chapter_title: 'Da criação', content: 'Texto original preservado.\n\nSegundo parágrafo.' }, readerState: { current_section: 4 }, bookIndexSections: [], lastPosition: 12, canGoPrevious: true, completeCurrentSection: mocks.next, goToPrevious: mocks.previous }) }))
function Location() { const value = useLocation(); return <output aria-label="Rota atual">{value.pathname}{value.search}</output> }
function mount(ui, path = '/home') { return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/ler/:id" element={ui} /><Route path="*" element={ui} /></Routes><Location /></MemoryRouter>) }
beforeEach(() => {
  vi.clearAllMocks()
  mocks.progress = { 1: { current_section: 4, last_read_at: '2026-09-18' }, 2: { current_section: 10, completed_at: '2026-09-17' } }
  mocks.user = { id: 'test', user_metadata: {} }
  mocks.journal = []
  mocks.share.mockResolvedValue('shared')
  mocks.setFavorite.mockResolvedValue()
  window.scrollTo = vi.fn()
})
afterEach(cleanup)

describe('editorial product interactions', () => {
  it('offers the most recent study as the primary action, then the attributed daily reflection', async () => {
    mount(<Home />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/, Tainá/)
    expect(screen.getByRole('heading', { name: 'Continuar estudo' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Reflexão do dia' })).toBeTruthy()
    expect(screen.getByText('3 de 12 trechos lidos')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: /O Livro dos Espíritos/ }))
    expect(screen.getByLabelText('Rota atual').textContent).toBe('/ler/1')
  })
  it('resumes guided-only progress without presenting first-time onboarding', async () => {
    mocks.progress = {}
    mocks.user.user_metadata = { vereda_guided_study_v1: { 'livro-dos-espiritos': ['le-01'] } }
    mount(<Home />)
    expect(screen.getByRole('heading', { name: 'Continuar estudo' })).toBeTruthy()
    expect(screen.getByText('1 de 8 encontros concluídos')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: /O Livro dos Espíritos/ }))
    expect(screen.getByLabelText('Rota atual').textContent).toBe('/estudo-guiado/livro-dos-espiritos/le-02')
  })
  it('provides a first step instead of false progress to a new reader', async () => {
    mocks.progress = {}
    mount(<Home />)
    await userEvent.click(screen.getByRole('button', { name: 'Começar estudo' }))
    expect(screen.getByLabelText('Rota atual').textContent).toBe('/comecar')
  })
  it('filters started and completed works and reopens completed works in revisit mode', async () => {
    mount(<Library />, '/biblioteca')
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    await userEvent.click(screen.getByRole('button', { name: 'Em andamento' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByRole('heading', { name: books[0].title })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Concluídos' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    await userEvent.click(screen.getByRole('button', { name: /O Livro dos Médiuns/ }))
    expect(screen.getByLabelText('Rota atual').textContent).toBe('/ler/2?revisit=1')
  })
  it('keeps guided study and source search reachable from Studies', async () => {
    mount(<Library />, '/biblioteca')
    await userEvent.click(screen.getByRole('button', { name: /Estudo guiado/ }))
    expect(screen.getByLabelText('Rota atual').textContent).toBe('/estudo-guiado')
    await userEvent.click(screen.getByRole('button', { name: 'Pesquisar nas obras' }))
    expect(screen.getByLabelText('Rota atual').textContent).toBe('/descobrir')
  })
  it('keeps all four destinations including reflections and marks secondary routes as Mais', async () => {
    mount(<BottomNav />, '/notas')
    const nav = screen.getByRole('navigation')
    expect(within(nav).getAllByRole('button').map(b => b.textContent)).toEqual(['Início', 'Estudos', 'Reflexões', 'Mais'])
    expect(screen.getByRole('button', { name: 'Mais' }).getAttribute('aria-current')).toBe('page')
    await userEvent.click(screen.getByRole('button', { name: 'Reflexões' }))
    expect(screen.getByRole('navigation')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reflexões' }).getAttribute('aria-current')).toBe('page')
  })
  it('hides bottom navigation in the immersive reader', () => {
    mount(<BottomNav />, '/ler/1')
    expect(screen.queryByRole('navigation')).toBeNull()
  })
  it('preserves attributed sharing and saves curated favorites using the account action', async () => {
    mount(<Reflections />, '/reflexoes')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar', exact: true }))
    expect(mocks.setFavorite).toHaveBeenCalledWith(expect.any(String), true)
    await userEvent.click(screen.getByRole('button', { name: 'Compartilhar esta reflexão' }))
    expect(mocks.share).toHaveBeenCalledWith({ text: expect.any(String), author: expect.any(String), source: expect.any(String) })
    await userEvent.click(screen.getByRole('button', { name: 'Favoritas' }))
    expect(screen.getByText(/Salve uma reflexão em Hoje/)).toBeTruthy()
  })
  it('changes reflection tabs without trapping Back in tab history', async () => {
    function Back() { const navigate = useNavigate(); return <button onClick={() => navigate(-1)}>Voltar de teste</button> }
    render(<MemoryRouter initialEntries={['/home', '/reflexoes']} initialIndex={1}><Routes>
      <Route path="/home" element={<h1>Início</h1>} />
      <Route path="/reflexoes" element={<><Reflections /><Back /></>} />
    </Routes></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: 'Favoritas' }))
    await userEvent.click(screen.getByRole('button', { name: 'Minhas' }))
    await userEvent.click(screen.getByRole('button', { name: 'Voltar de teste' }))
    expect(screen.getByRole('heading', { name: 'Início' })).toBeTruthy()
  })
  it('does not report success when favorite persistence fails', async () => {
    mocks.setFavorite.mockRejectedValue(new Error('offline'))
    mount(<Reflections />, '/reflexoes')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar', exact: true }))
    expect(await screen.findByText('Não foi possível salvar agora. Tente novamente.')).toBeTruthy()
  })
  it('preserves personal journal history under Minhas and saves through the existing service', async () => {
    mocks.journal = [{ entryType: 'reflection', entryKey: 'old', text: 'Minha reflexão anterior', entryDate: '2026-09-17' }]
    mocks.note.mockResolvedValue({ synced: true })
    mount(<Reflections />, '/reflexoes?tab=mine')
    expect(await screen.findByText('Minha reflexão anterior')).toBeTruthy()
    await userEvent.type(screen.getByRole('textbox', { name: 'Minha reflexão' }), 'Uma nova reflexão pessoal.')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar minha reflexão' }))
    expect(mocks.note).toHaveBeenCalledWith('test', 'Uma nova reflexão pessoal.')
    expect(await screen.findByText('Reflexão salva na sua conta.')).toBeTruthy()
  })
  it('keeps reader text, reflection distinction, semantic actions and return context', async () => {
    mount(<Reader />, '/ler/1?returnTo=%2Fnotas')
    expect(screen.getByText('Texto original preservado.')).toBeTruthy()
    expect(screen.getByText('Convite à reflexão · Vereda')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Continuar a leitura' }))
    expect(mocks.next).toHaveBeenCalledOnce()
    await userEvent.click(screen.getByRole('button', { name: 'Voltar na leitura' }))
    expect(mocks.previous).toHaveBeenCalledOnce()
    await userEvent.click(screen.getByRole('button', { name: 'Salvar este trecho' }))
    expect(mocks.save).toHaveBeenCalledWith(4)
    await userEvent.click(screen.getByRole('button', { name: 'Voltar à página anterior' }))
    expect(screen.getByLabelText('Rota atual').textContent).toBe('/notas')
  })
  it('keeps all secondary collections accessible', () => {
    mount(<More />, '/mais')
    for (const name of ['Minha jornada', 'Notas de estudo', 'Trechos salvos', 'Favoritos', 'Plano de estudo', 'Perfil', 'Sair']) expect(screen.getByRole('button', { name, exact: true })).toBeTruthy()
  })
})

describe('honest progress and safe context', () => {
  it('uses 100 percent only when completion is confirmed', () => {
    expect(getBookProgress({ current_section: 1000 }, 1000).percent).toBe(99)
    expect(getBookProgress({ current_section: 1000, completed_at: '2026-09-18' }, 1000)).toMatchObject({ percent: 100, read: 1000, completed: true })
    expect(getBookProgress({ book_completed: true }, 12).percent).toBe(100)
    expect(getBookProgress({ current_section: -5 }, 12).read).toBe(0)
    expect(getBookProgress(null, 0).percent).toBe(0)
  })
  it('greetings follow local time and use only the first name', () => {
    expect(getGreeting('TAINÁ Townsend', new Date(2026, 8, 18, 9))).toBe('Bom dia, Tainá')
    expect(getGreeting('Tainá', new Date(2026, 8, 18, 15))).toBe('Boa tarde, Tainá')
    expect(getGreeting('', new Date(2026, 8, 18, 21))).toBe('Boa noite')
  })
  it('rejects external return paths and keeps saved/note/guided context', () => {
    for (const route of ['/notas', '/salvos', '/estudo-guiado/livro-dos-espiritos/le-01']) expect(getReaderReturnPath(route)).toBe(route)
    for (const route of ['//example.com', 'https://example.com', '/entrar', '/%2Fexample.com']) expect(getReaderReturnPath(route)).toBe('/home')
    expect(getActiveDestination('/estudo-guiado/livro-dos-espiritos')).toBe('/biblioteca')
  })
  it('keeps curated favorites separate from personal reflections and deduplicates ids', () => {
    const user = { user_metadata: { vereda_reflection_favorites_v1: ['a', 'a', null] } }
    expect(getFavoriteReflectionIds(user)).toEqual(['a'])
    expect(withReflectionFavorite(user, 'a', false)).toEqual([])
    expect(withReflectionFavorite(user, 'b', true)).toEqual(['a', 'b'])
  })
})
