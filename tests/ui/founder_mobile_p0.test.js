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
const styles = readFileSync('src/index.css', 'utf8')
const tailwind = readFileSync('tailwind.config.js', 'utf8')

describe('founder mobile P0 safeguards', () => {
  it('keeps Home focused by leaving reminders inside Perfil', () => {
    expect(home).not.toContain('Bell')
    expect(home).not.toContain('Abrir lembretes e notificações')
    expect(home).not.toContain("navigate('/configuracoes')")
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

  it('treats Discovery as a primary destination with an explicit light/dark page surface', () => {
    expect(discover).toContain('>Descobrir</p>')
    expect(discover).toContain('O que você quer compreender hoje?')
    expect(discover).not.toContain('Voltar para Estudos')
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

  it('keeps the in-app Library journey visual but removes redundant explanatory blocks', () => {
    expect(library).toContain('Caminho pelas obras básicas')
    expect(library).toContain('Seu progresso')
    expect(library).toContain('bottom-[-0.9rem]')
    expect(library).toContain('Sugerir uma obra complementar')
    expect(library).not.toContain('Uma jornada pelas obras básicas')
    expect(library).not.toContain('A ordem abaixo é apenas uma sugestão')
    expect(library).not.toContain('Atalhos de estudo')
    expect(library).not.toContain('Trechos salvos')
  })

  it('keeps the public Landing journey visually distinct from the Library progress path', () => {
    expect(landing).toContain('LandingJourneyCard')
    expect(landing).toContain('Sequência visual das cinco obras fundamentais')
    expect(landing).toContain("String(sequence).padStart(2, '0')")
    expect(landing).not.toContain('bottom-[-0.9rem]')
  })

  it('uses a softer dusk palette instead of near-black dark surfaces', () => {
    expect(styles).toContain('--ves-canvas: #2C352F')
    expect(styles).toContain('--ves-surface: #354039')
    expect(styles).toContain('--ves-surface-soft: #3D4941')
    expect(tailwind).toContain("DEFAULT: '#2C352F'")
    expect(tailwind).toContain("surface: '#354039'")
    expect(tailwind).not.toContain("DEFAULT: '#182019'")
  })

  it('uppercases structural Roman numerals without uppercasing ordinary words', () => {
    expect(normalizeStructuralRomanNumerals('ii')).toBe('II')
    expect(normalizeStructuralRomanNumerals('Ii')).toBe('II')
    expect(normalizeStructuralRomanNumerals('Capítulo iv')).toBe('Capítulo IV')
    expect(normalizeStructuralRomanNumerals('iii — Introdução')).toBe('III — Introdução')
    expect(normalizeStructuralRomanNumerals('civil')).toBe('civil')
  })

  it('uses the shared Roman-numeral normalizer across reading surfaces', () => {
    expect(readerService).toContain('normalizeStructuralRomanNumerals(cleanReaderStructuralTitle(section.section_title))')
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
