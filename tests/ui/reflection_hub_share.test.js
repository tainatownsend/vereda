import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  getDailyReflection,
  getReflectionsByIds,
  getNextReflection,
  getPreviousDailyReflections,
} from '../../src/features/reflections/dailyReflections.js'

const home = readFileSync('src/pages/HomePage.jsx', 'utf8')
const reflection = readFileSync('src/pages/ReflectionPage.jsx', 'utf8')
const shareCard = readFileSync('src/features/share/reflectionCard.js', 'utf8')

describe('reflection discovery and social sharing', () => {
  it('links the daily Home reflection to the hub where sharing lives', () => {
    expect(home).toContain('Reflexão do dia')
    expect(home).toContain("navigate('/reflexoes')")
    expect(reflection).toContain('shareImage')
    expect(reflection).toContain('shareReflectionAsImage')
    expect(home).not.toContain('Outros caminhos')
  })

  it('offers a reflection hub with today, another reflection, history, and personal journal', () => {
    expect(reflection).toContain('Reflexão de hoje')
    expect(reflection).toContain('Ler outra reflexão')
    expect(reflection).toContain('Reflexões anteriores')
    expect(reflection).toContain('Minha reflexão')
    expect(reflection).toContain('Minhas reflexões')
  })

  it('keeps a deterministic daily reflection and seven prior reflections', () => {
    const today = new Date(2026, 8, 11, 12)
    const daily = getDailyReflection(today)
    const history = getPreviousDailyReflections(7, today)

    expect(daily.text.length).toBeGreaterThan(20)
    expect(daily.author).not.toContain('Vereda')
    expect(history).toHaveLength(7)
    expect(history.every((item) => item.author && item.source && item.sourceUrl.startsWith('https://') && item.kind === 'quotation')).toBe(true)
    expect(new Set(history.map((item) => item.dateKey)).size).toBe(7)
    expect(getNextReflection(daily.id).id).not.toBe(daily.id)
  })

  it('preserves old editorial favorites without inventing a historical author', () => {
    const [legacy] = getReflectionsByIds(['understand-today', 'missing-id'])
    expect(legacy.author).toBe('Vereda · texto editorial')
    expect(legacy.kind).toBe('editorial')
    expect(legacy.text).toBe('Aquilo que você compreende hoje pode transformar o modo como escolhe amanhã.')
    const current = getDailyReflection()
    expect(getReflectionsByIds([current.id])[0].source).toBe(current.source)
  })

  it('shares a pure image first and keeps the Vereda origin subtle and non-repetitive', () => {
    expect(shareCard).toContain('await navigator.share({ files: [file] })')
    expect(shareCard).not.toContain("title: 'Reflexão")
    expect(shareCard).not.toContain('VEREDA APP')
    expect(shareCard).not.toContain("fillText('VEREDA'")
    expect(shareCard).toContain("context.fillText('vereda', centerX, 1738)")
    expect(shareCard).toContain("context.fillText('App de estudo guiado da doutrina espírita', centerX, 1792)")
    expect(shareCard).toContain('— ${author}')
    expect(shareCard).toContain('navigator.clipboard?.write')
  })

  it('shows original authorship across the home, reflection hub, and share image', () => {
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
