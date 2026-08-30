import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const app = readFileSync('src/App.jsx', 'utf8')
const home = readFileSync('src/pages/HomePage.jsx', 'utf8')
const summaries = readFileSync('src/pages/SummariesPage.jsx', 'utf8')
const summaryDetail = readFileSync('src/pages/SummaryDetailPage.jsx', 'utf8')
const audiobooks = readFileSync('src/pages/AudiobooksPage.jsx', 'utf8')
const player = readFileSync('src/pages/AudiobookPlayerPage.jsx', 'utf8')
const bottomNav = readFileSync('src/components/ui/BottomNav.jsx', 'utf8')

describe('Resumos and Audiobooks v1', () => {
  it('turns both Home launchers into real destinations', () => {
    expect(home).toContain("label=\"Resumos\" onClick={() => navigate('/resumos')}")
    expect(home).toContain("label=\"Audiobooks\" onClick={() => navigate('/audiobooks')}")
    expect(home).not.toContain('<QuickAction icon={FileText} label="Resumos" disabled />')
    expect(home).not.toContain('<QuickAction icon={Headphones} label="Audiobooks" disabled />')
  })

  it('registers protected hub and detail routes', () => {
    expect(app).toContain('path="/resumos"')
    expect(app).toContain('path="/resumos/:id"')
    expect(app).toContain('path="/audiobooks"')
    expect(app).toContain('path="/audiobooks/:id"')
  })

  it('frames summaries as study guidance that returns people to the sources', () => {
    expect(summaries).toContain('Os resumos orientam, mas não substituem a leitura das obras.')
    expect(summaryDetail).toContain('Perguntas para levar à obra')
    expect(summaryDetail).toContain('Abrir a obra')
    expect(summaryDetail).toContain('Explorar um tema')
    expect(summaryDetail).toContain('prevalece sempre o texto integral da obra')
  })

  it('keeps audiobook listening independent from reading progress in v1', () => {
    expect(audiobooks).toContain('ouvir não altera seu ponto salvo de leitura')
    expect(player).toContain('Ponto de áudio independente da sua leitura')
    expect(player).toContain('saveAudioPosition')
    expect(player).not.toContain('completeSection(')
    expect(player).not.toContain('markSectionRead(')
  })

  it('reuses cleaned Reader sections and offers explicit playback controls', () => {
    expect(player).toContain('getSectionsFromPosition')
    expect(player).toContain('getPreviousSection')
    expect(player).toContain('getNextSection')
    expect(player).toContain('Pausar narração')
    expect(player).toContain('Parar narração')
    expect(player).toContain('Trecho anterior')
    expect(player).toContain('Próximo trecho')
  })

  it('keeps the audiobook player immersive by hiding global navigation there', () => {
    expect(bottomNav).toContain("pathname.startsWith('/audiobooks/')")
  })
})
