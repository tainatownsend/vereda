import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  getDailyReflection,
  getNextReflection,
  getPreviousDailyReflections,
} from '../../src/features/reflections/dailyReflections.js'

const home = readFileSync('src/pages/HomePage.jsx', 'utf8')
const reflection = readFileSync('src/pages/ReflectionPage.jsx', 'utf8')
const shareCard = readFileSync('src/features/share/reflectionCard.js', 'utf8')

describe('reflection discovery and social sharing', () => {
  it('surfaces reflection sharing directly from Home without duplicating primary navigation', () => {
    expect(home).toContain('Para refletir')
    expect(home).toContain('Ver outras reflexões')
    expect(home).toContain('shareDailyReflection')
    expect(home).toContain('shareReflectionAsImage')
    expect(home).not.toContain('Outros caminhos')
  })

  it('offers a reflection hub with today, another reflection, history, and personal journal', () => {
    expect(reflection).toContain('Reflexão de hoje')
    expect(reflection).toContain('Gerar outra reflexão')
    expect(reflection).toContain('Reflexões anteriores')
    expect(reflection).toContain('Minha reflexão')
    expect(reflection).toContain('Minhas reflexões')
  })

  it('keeps a deterministic daily reflection and seven prior reflections', () => {
    const today = new Date(2026, 8, 11, 12)
    const daily = getDailyReflection(today)
    const history = getPreviousDailyReflections(7, today)

    expect(daily.text.length).toBeGreaterThan(40)
    expect(daily.author).toBe('Vereda')
    expect(history).toHaveLength(7)
    expect(history.every((item) => item.author === 'Vereda')).toBe(true)
    expect(new Set(history.map((item) => item.dateKey)).size).toBe(7)
    expect(getNextReflection(daily.id).id).not.toBe(daily.id)
  })

  it('shares a pure image first and keeps the Vereda origin subtle and non-repetitive', () => {
    expect(shareCard).toContain('await navigator.share({ files: [file] })')
    expect(shareCard).not.toContain("title: 'Reflexão")
    expect(shareCard).not.toContain('VEREDA APP')
    expect(shareCard).not.toContain("fillText('VEREDA'")
    expect(shareCard).toContain("context.fillText('vereda', centerX, 1738)")
    expect(shareCard).toContain("context.fillText('seu caminho de estudo espírita', centerX, 1792)")
    expect(shareCard).toContain('— ${author}')
    expect(shareCard).toContain('navigator.clipboard?.write')
  })

  it('shows editorial authorship across the home, reflection hub, and share image', () => {
    expect(home).toContain('dailyReflection.author')
    expect(reflection).toContain('featuredReflection.author')
    expect(reflection).toContain('reflection.author')
    expect(shareCard).toContain("author = ''")
  })

  it('adapts whitespace and typography to the length of the message', () => {
    expect(shareCard).toContain('text.length < 110 ? 74')
    expect(shareCard).toContain('text.length < 360 ? 50')
    expect(shareCard).toContain('const panelHeight = clamp(')
    expect(shareCard).toContain('const panelY = clamp(')
  })

  it('renders the refined editorial share composition', () => {
    expect(shareCard).toContain('drawQuotePanel')
    expect(shareCard).toContain('drawQuoteMark')
    expect(shareCard).toContain('drawBotanicalOrnament')
    expect(shareCard).toContain('drawBrandLockup')
    expect(shareCard).toContain('drawMountainLayers')
    expect(shareCard).toContain('drawSunGlow')
  })
})
