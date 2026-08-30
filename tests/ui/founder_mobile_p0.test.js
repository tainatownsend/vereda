import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { normalizeStructuralRomanNumerals } from '../../src/features/content/structuralLabels.js'

const home = readFileSync('src/pages/HomePage.jsx', 'utf8')
const push = readFileSync('src/hooks/usePushNotifications.js', 'utf8')
const discover = readFileSync('src/pages/DiscoverPage.jsx', 'utf8')
const landing = readFileSync('src/pages/LandingPage.jsx', 'utf8')
const library = readFileSync('src/pages/LibraryPage.jsx', 'utf8')
const settings = readFileSync('src/pages/SettingsPage.jsx', 'utf8')
const readerService = readFileSync('src/features/reader/readerService.js', 'utf8')
const readingSession = readFileSync('src/features/reader/useReadingSession.js', 'utf8')
const savedPassages = readFileSync('src/pages/SavedPassagesPage.jsx', 'utf8')
const passage = readFileSync('src/pages/PassagePage.jsx', 'utf8')

describe('founder mobile P0 safeguards', () => {
  it('keeps the Home bell as a real action instead of a dead affordance', () => {
    expect(home).toContain('aria-label="Abrir lembretes e notificações"')
    expect(home).toContain("onClick={() => navigate('/configuracoes')}")
  })

  it('does not read Notification.permission unless notifications are supported', () => {
    expect(push).toContain("'Notification' in window")
    expect(push).toContain("'serviceWorker' in navigator")
    expect(push).toContain("'PushManager' in window")
    expect(push).toContain('useState(getInitialPermission)')
    expect(push).not.toContain('useState(Notification.permission)')
  })

  it('fails closed when push prerequisites are unavailable', () => {
    expect(push).toContain("return notificationsSupported() ? window.Notification.permission : 'denied'")
    expect(push).toContain('!notificationsSupported() || !VAPID_PUBLIC_KEY')
  })

  it('gives Discovery an explicit route back and an explicit light/dark page surface', () => {
    expect(discover).toContain("onClick={() => navigate('/biblioteca')}")
    expect(discover).toContain('Voltar para Estudos')
    expect(discover).toContain('bg-canvas')
    expect(discover).toContain('dark:bg-night')
  })

  it('separates search from topic exploration and makes search completion explicit', () => {
    expect(discover).toContain('aria-label="Como descobrir trechos"')
    expect(discover).toContain('Pesquisar')
    expect(discover).toContain('Explorar temas')
    expect(discover).toContain("resultsRef.current?.scrollIntoView")
    expect(discover).toContain('trechos encontrados')
    expect(discover).toContain('Procurando trechos nas obras…')
  })

  it('uses the simplest signup and profile language', () => {
    expect(landing).toContain("const primaryLabel = user ? 'Abrir o Vereda' : 'Criar conta'")
    expect(landing).not.toContain("'Criar minha conta'")
    expect(settings).toContain('>Perfil</h1>')
    expect(settings).not.toContain('>Ajustes</h1>')
  })

  it('keeps the suggested order beside the books instead of hiding it in the overflow menu', () => {
    expect(library).toContain('Ordem sugerida · opcional')
    expect(library).toContain('Ordem sugerida · {sequence} de {totalBooks}')
    expect(library).not.toContain('Sequência sugerida das obras')
    expect(library).toContain('aria-label="Opções da biblioteca"')
  })

  it('uppercases structural Roman numerals without uppercasing ordinary words', () => {
    expect(normalizeStructuralRomanNumerals('ii')).toBe('II')
    expect(normalizeStructuralRomanNumerals('Ii')).toBe('II')
    expect(normalizeStructuralRomanNumerals('Capítulo iv')).toBe('Capítulo IV')
    expect(normalizeStructuralRomanNumerals('iii — Introdução')).toBe('III — Introdução')
    expect(normalizeStructuralRomanNumerals('civil')).toBe('civil')
  })

  it('uses the shared Roman-numeral normalizer across reading surfaces', () => {
    expect(readerService).toContain('normalizeStructuralRomanNumerals(section.section_title)')
    expect(readerService).toContain('normalizeStructuralRomanNumerals(rawChapterLabel)')
    expect(savedPassages).toContain('normalizeStructuralRomanNumerals(')
    expect(passage).toContain('normalizeStructuralRomanNumerals(')
    expect(discover).toContain('normalizeStructuralRomanNumerals(')
  })

  it('keeps raw chapter labels for database filters while exposing formatted labels to the UI', () => {
    expect(readerService).toContain('raw_chapter_label: rawChapterLabel')
    expect(readerService).toContain('raw_part_title: rawPartTitle')
    expect(readingSession).toContain('currentSection?.raw_chapter_label ?? currentSection?.chapter_label')
    expect(readingSession).toContain('currentSection?.raw_part_title ?? currentSection?.part_title')
    expect(readingSession).toContain('chapterLabel: rawChapterLabel')
    expect(readingSession).toContain('partTitle: rawPartTitle')
  })
})
