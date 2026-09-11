import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const home = readFileSync('src/pages/HomePage.jsx', 'utf8')
const planPage = readFileSync('src/pages/StudyPlanPage.jsx', 'utf8')
const studyPlan = readFileSync('src/features/studyPlan/studyPlan.js', 'utf8')
const landing = readFileSync('src/pages/LandingPage.jsx', 'utf8')
const app = readFileSync('src/App.jsx', 'utf8')

describe('Vereda 1.1 continuity foundation', () => {
  it('makes the next study step primary on Home', () => {
    expect(home).toContain('Seu próximo passo, com calma e clareza.')
    expect(home).toContain('Continue seu estudo')
    expect(home).toContain('Prefere definir um plano de leitura?')
    expect(home).toContain("navigate('/plano-de-estudo')")
    expect(home).toContain('getWeeklyProgressLabel')
  })

  it('lets the user choose a gentle rhythm without streak pressure', () => {
    expect(planPage).toContain('Quanto estudo cabe na sua rotina?')
    expect(planPage).toContain('Uma semana mais cheia não apaga seu caminho')
    expect(planPage).toContain('nunca transforma frequência em punição, ranking ou cobrança')
    expect(studyPlan).toContain('1 vez por semana')
    expect(studyPlan).toContain('3 vezes por semana')
    expect(studyPlan).toContain('Prefiro não definir')
  })

  it('routes the personal study plan as a protected experience', () => {
    expect(app).toContain('path="/plano-de-estudo"')
    expect(app).toContain('<ProtectedRoute><StudyPlanPage /></ProtectedRoute>')
  })

  it('uses a constrained laptop/desktop landing shell', () => {
    expect(landing).toContain('max-w-[1180px]')
    expect(landing).toContain('Navegação da apresentação')
    expect(landing).toContain('lg:min-h-[650px]')
    expect(landing).toContain('lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]')
  })
})
