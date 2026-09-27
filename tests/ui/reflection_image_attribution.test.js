// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { renderReflectionCard } from '@/features/share/reflectionCard'
import { getDailyReflection, getNextReflection } from '@/features/reflections/dailyReflections'

afterEach(() => vi.restoreAllMocks())
it('renders each quotation with its original author and source above the brand, without clipping', async () => {
  const drawn = []
  const gradient = { addColorStop: () => {} }
  const context = new Proxy({
    fillText: (text, x, y) => drawn.push({ text, x, y }),
    measureText: text => ({ width: text.length * 16 }),
    createLinearGradient: () => gradient, createRadialGradient: () => gradient,
  }, { get: (target, key) => target[key] || (() => {}) })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(new Blob(['png'])))
  vi.spyOn(window, 'Image').mockImplementation(function () {
    Object.defineProperty(this, 'src', { set: () => queueMicrotask(() => this.onerror(new Error('offline'))) })
  })
  let reflection = getDailyReflection()
  for (let index = 0; index < 7; index++) {
    drawn.length = 0
    await renderReflectionCard(reflection)
    const words = drawn.map(item => item.text).join(' ')
    expect(words).toContain(`— ${reflection.author}`)
    expect(words).toContain(reflection.source)
    expect(words).not.toContain('— Vereda')
    expect(drawn.filter(item => item.y < 1738).every(item => item.y < 1560)).toBe(true)
    reflection = getNextReflection(reflection.id)
  }
})
