import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const onboarding = readFileSync('src/pages/GettingStartedPage.jsx', 'utf8')
const bookDetail = readFileSync('src/pages/BookDetailPage.jsx', 'utf8')
const discover = readFileSync('src/pages/DiscoverPage.jsx', 'utf8')
const passage = readFileSync('src/pages/PassagePage.jsx', 'utf8')
const reader = readFileSync('src/pages/ReaderPage.jsx', 'utf8')
const library = readFileSync('src/pages/LibraryPage.jsx', 'utf8')
const auth = readFileSync('src/pages/AuthPage.jsx', 'utf8')
const routes = readFileSync('src/App.jsx', 'utf8')

describe('low-tech usability polish', () => {
  it('keeps the second onboarding choice to three human options', () => {
    expect(onboarding).toContain('Quero começar do início')
    expect(onboarding).toContain('Tenho uma dúvida específica')
    expect(onboarding).toContain('Quero escolher uma obra')
    expect(onboarding).not.toContain('Quero compreender melhor a vida')
    expect(onboarding).not.toContain('Quero entender mediunidade')
  })

  it('offers immediate reading before optional pace configuration', () => {
    const startIndex = bookDetail.indexOf('Começar esta leitura')
    const paceIndex = bookDetail.indexOf('Quero combinar um ritmo de estudo')

    expect(startIndex).toBeGreaterThan(-1)
    expect(paceIndex).toBeGreaterThan(startIndex)
    expect(bookDetail).toContain('Opcional')
  })

  it('opens discovery results as passages without forcing a book start', () => {
    expect(discover).toContain("onOpen={(sectionId) => navigate(`/trecho/${sectionId}`)}")
    expect(discover).toContain('onClick={() => onOpen(section.id)}')
    expect(discover).toContain('Ler este trecho')
    expect(discover).toContain('content')
    expect(passage).toContain('Ler um resultado de busca não muda sua leitura atual')
    expect(routes).toContain('path="/trecho/:sectionId"')
  })

  it('provides a visible saved-passage path from reading to library', () => {
    expect(reader).toContain('Salvar este trecho')
    expect(reader).toContain('Trecho salvo para consultar depois.')
    expect(library).toContain('Trechos salvos')
    expect(library).toContain("navigate('/salvos')")
    expect(routes).toContain('path="/salvos"')
  })

  it('lets people recover from a missing confirmation email', () => {
    expect(auth).toContain('Reenviar e-mail de confirmação')
    expect(auth).toContain('Usei outro e-mail')
    expect(auth).toContain('resendSignupConfirmation')
  })
})
