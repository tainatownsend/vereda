import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { GUIDED_STUDY_PATHS } from '../../src/features/guidedStudy/catalog.js'
import { GUIDED_INTEGRATION_PROMPTS } from '../../src/features/guidedStudy/integrationPrompts.js'
import { GUIDED_SOURCE_MAP } from '../../src/features/guidedStudy/sourceMap.js'

const app = readFileSync('src/App.jsx', 'utf8')
const home = readFileSync('src/pages/HomePage.jsx', 'utf8')
const bookDetail = readFileSync('src/pages/BookDetailPage.jsx', 'utf8')
const hub = readFileSync('src/pages/GuidedStudyPage.jsx', 'utf8')
const pathPage = readFileSync('src/pages/GuidedStudyPathPage.jsx', 'utf8')
const sessionPage = readFileSync('src/pages/GuidedStudySessionPage.jsx', 'utf8')
const sourceService = readFileSync('src/features/guidedStudy/sourceService.js', 'utf8')
const sourceMap = readFileSync('src/features/guidedStudy/sourceMap.js', 'utf8')
const progress = readFileSync('src/features/guidedStudy/progress.js', 'utf8')
const journal = readFileSync('src/features/studyJournal/studyJournal.js', 'utf8')
const passage = readFileSync('src/pages/PassagePage.jsx', 'utf8')

describe('Vereda 1.2 guided study', () => {
  it('ships a complete eight-session journey for each of the five foundational works', () => {
    expect(GUIDED_STUDY_PATHS).toHaveLength(5)
    expect(GUIDED_STUDY_PATHS.map((path) => path.title)).toEqual([
      'O Livro dos Espíritos',
      'O Livro dos Médiuns',
      'O Evangelho segundo o Espiritismo',
      'O Céu e o Inferno',
      'A Gênese',
    ])

    const sessions = GUIDED_STUDY_PATHS.flatMap((path) => path.sessions)
    expect(sessions).toHaveLength(40)
    expect(new Set(sessions.map((session) => session.id)).size).toBe(40)

    for (const path of GUIDED_STUDY_PATHS) {
      expect(path.sessions).toHaveLength(8)
      for (const session of path.sessions) {
        expect(session.minutes).toBeGreaterThanOrEqual(10)
        expect(session.beforeReading.length).toBeGreaterThan(30)
        expect(session.understand.length).toBeGreaterThan(30)
        expect(session.reflectionPrompt.length).toBeGreaterThan(20)
        expect(session.connection.work).toBeTruthy()
        expect(session.connection.theme).toBeTruthy()
        expect(session.concepts.length).toBeGreaterThan(0)
      }
    }
  })

  it('pins every encounter to explicit Reader sections instead of searching for an approximate passage', () => {
    const sessionIds = GUIDED_STUDY_PATHS.flatMap((path) => path.sessions.map((session) => session.id))
    expect(Object.keys(GUIDED_SOURCE_MAP).sort()).toEqual([...sessionIds].sort())
    for (const sessionId of sessionIds) {
      expect(GUIDED_SOURCE_MAP[sessionId].length).toBeGreaterThan(0)
      for (const sectionId of GUIDED_SOURCE_MAP[sessionId]) expect(sectionId).toBeTypeOf('number')
    }

    expect(sourceService).toContain(".in('id', pinnedIds)")
    expect(sourceService).toContain("matchedBy: 'pinned'")
    expect(sourceService).toContain('ordered.length !== pinnedIds.length')
    expect(sourceService).not.toContain('.ilike(')
    expect(sourceService).not.toContain("'content'")
    expect(sourceMap).toContain('sec_position` is deliberately NOT used as a canonical item number')
  })

  it('gives every encounter its own integration exercise', () => {
    const sessionIds = GUIDED_STUDY_PATHS.flatMap((path) => path.sessions.map((session) => session.id))
    expect(Object.keys(GUIDED_INTEGRATION_PROMPTS).sort()).toEqual([...sessionIds].sort())
    for (const sessionId of sessionIds) {
      expect(GUIDED_INTEGRATION_PROMPTS[sessionId].length).toBeGreaterThan(60)
    }
    expect(new Set(Object.values(GUIDED_INTEGRATION_PROMPTS)).size).toBe(40)
  })

  it('presents each encounter as a read-comprehend-reflect-integrate path without reproducing the book', () => {
    for (const [number, label] of [['1', 'Prepare-se'], ['2', 'Leia'], ['3', 'Compreenda'], ['4', 'Reflita'], ['5', 'Integre'], ['6', 'Continue']]) {
      expect(sessionPage).toContain(`<StudyStep number="${number}" label="${label}"`)
    }
    expect(sessionPage).toContain('Abrir esta leitura')
    expect(sessionPage).toContain('o texto integral continua no Reader, sem ser reproduzido aqui')
    expect(sessionPage).toContain('Orientação de estudo · Vereda')
    expect(sessionPage).toContain('Esta orientação é editorial')
    expect(sessionPage).toContain('getGuidedIntegrationPrompt(session.id)')
    expect(sessionPage).toContain('A ideia não é acertar de primeira')
    expect(sessionPage).not.toContain('section.content')
    expect(sessionPage).not.toContain('Texto original no corpus do Vereda')
    expect(sessionPage).not.toContain('Trecho ${section?.sec_position')
  })

  it('makes guided study discoverable without replacing normal reading', () => {
    expect(app).toContain('path="/estudo-guiado"')
    expect(app).toContain('path="/estudo-guiado/:pathKey"')
    expect(app).toContain('path="/estudo-guiado/:pathKey/:sessionId"')
    expect(home).toContain('Abrir Estudo Guiado')
    expect(home).toContain("navigate('/estudo-guiado')")
    expect(bookDetail).toContain('Estudar esta obra com orientação')
    expect(bookDetail).toContain('matchGuidedPath(book)')
    expect(bookDetail).toContain('Começar esta leitura')
    expect(hub).toContain('Cinco obras fundamentais')
    expect(pathPage).toContain('Você pode abrir qualquer etapa e voltar quando quiser')
  })

  it('syncs guided completion in account metadata and reflections in the study journal', () => {
    expect(progress).toContain("GUIDED_STUDY_PROGRESS_KEY = 'vereda_guided_study_v1'")
    expect(readFileSync('src/store/index.js', 'utf8')).toContain('completeGuidedStudySession')
    expect(readFileSync('src/store/index.js', 'utf8')).toContain('[GUIDED_STUDY_PROGRESS_KEY]: nextProgress')
    expect(journal).toContain('saveGuidedReflection')
    expect(journal).toContain('reflection:guided:${pathKey}:${sessionId}')
    expect(sessionPage).toContain('A reflexão é opcional')
  })

  it('opens the exact source passage and returns to the same guided encounter', () => {
    expect(sessionPage).toContain('Abrir esta leitura')
    expect(sessionPage).toContain('?from=estudo-guiado&path=')
    expect(passage).toContain("source === 'estudo-guiado'")
    expect(passage).toContain('Voltar ao encontro')
    expect(passage).toContain('safeSlug')
  })

  it('does not introduce competitive or school-like mechanics into guided study', () => {
    const productCopy = `${hub}\n${pathPage}\n${sessionPage}`.toLocaleLowerCase('pt-BR')
    for (const term of ['ranking', 'pontuação', 'liga', 'quiz', 'perdeu sua sequência']) expect(productCopy).not.toContain(term)
  })

  it('uses only palette families and shades available to the North Star guided-study UI', () => {
    const guidedPages = `${hub}\n${pathPage}\n${sessionPage}`
    for (const unsupportedToken of ['terracotta-', 'gold-50', 'gold-200', 'gold-300', 'gold-500', 'gold-800', 'gold-900', 'gold-950']) {
      expect(guidedPages).not.toContain(unsupportedToken)
    }
  })
})