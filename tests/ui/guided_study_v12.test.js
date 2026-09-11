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
const reflection = readFileSync('src/pages/ReflectionPage.jsx', 'utf8')
const reflectionCard = readFileSync('src/features/share/reflectionCard.js', 'utf8')
const auth = readFileSync('src/pages/AuthPage.jsx', 'utf8')

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
    for (const [number, label] of [['1', 'Orientação'], ['2', 'Leitura'], ['3', 'Assimile'], ['4', 'Reflexão'], ['5', 'Integração'], ['6', 'Fechamento']]) {
      expect(sessionPage).toContain(`<StepPanel number="${number}" label="${label}"`)
    }
    expect(sessionPage).toContain('Abrir esta leitura')
    expect(sessionPage).toContain('Abra a referência, leia com calma e volte para cá.')
    expect(sessionPage).toContain('Antes de começar, saiba o que observar')
    expect(sessionPage).toContain('Durante a leitura, observe também')
    expect(sessionPage).toContain('O que ficou da leitura?')
    expect(sessionPage).toContain('getGuidedIntegrationPrompt(session.id)')
    expect(sessionPage).toContain('Não é uma prova: perceber o que ainda ficou nebuloso também é aprender.')
    expect(sessionPage).not.toContain('section.content')
    expect(sessionPage).not.toContain('Texto original no corpus do Vereda')
    expect(sessionPage).not.toContain('Trecho ${section?.sec_position')
  })

  it('makes guided study discoverable without replacing normal reading', () => {
    expect(app).toContain('path="/estudo-guiado"')
    expect(app).toContain('path="/estudo-guiado/:pathKey"')
    expect(app).toContain('path="/estudo-guiado/:pathKey/:sessionId"')
    expect(home).not.toContain('Continuar no Estudo Guiado')
    expect(home).not.toContain('Outros caminhos')
    expect(home).toContain('Prefere definir um plano de leitura?')
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
    expect(sessionPage).toContain('Você não precisa responder às três perguntas.')
  })

  it('opens the exact source passage and returns to the same guided encounter', () => {
    expect(sessionPage).toContain('Abrir esta leitura')
    expect(sessionPage).toContain('?from=estudo-guiado&path=')
    expect(passage).toContain("source === 'estudo-guiado'")
    expect(passage).toContain('Concluir leitura e voltar ao encontro')
    expect(passage).toContain('vereda:guided-read:')
    expect(passage).toContain('function Paragraph')
    expect(sessionPage).toContain('Já concluí a leitura')
    expect(sessionPage).toContain('readingComplete')
    expect(sessionPage).toContain('Conclua a leitura para continuar')
    expect(passage).toContain('safeSlug')
  })

  it('keeps auth, guided steps, reading return and reflection sharing aligned with founder QA', () => {
    expect(auth).toContain('lg:justify-center')
    expect(sessionPage).toContain("STEP_LABELS = ['Orientação', 'Leitura', 'Assimile', 'Reflexão', 'Integração', 'Fechamento']")
    expect(sessionPage).toContain('getNextStepActionLabel')
    expect(reflectionCard).toContain('vereda · seu caminho de estudo espírita')
    expect(reflectionCard).not.toContain('VEREDA APP')
    expect(reflectionCard).toContain('await navigator.share({ files: [file] })')
    expect(reflectionCard).toContain('navigator.clipboard?.write')
    expect(reflection).toContain('Gerar outra reflexão')
    expect(reflection).toContain('Reflexões anteriores')
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