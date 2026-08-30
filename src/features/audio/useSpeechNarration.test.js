import { describe, expect, it } from 'vitest'
import { chunkNarrationText, speechNarrationSupported } from './useSpeechNarration'

describe('device narration helpers', () => {
  it('splits long narration into bounded chunks without dropping words', () => {
    const text = 'Uma frase curta. ' + 'palavra '.repeat(80) + 'Fim.'
    const chunks = chunkNarrationText(text, 90)

    expect(chunks.length).toBeGreaterThan(2)
    expect(chunks.every((chunk) => chunk.length <= 90 || !chunk.includes(' '))).toBe(true)
    expect(chunks.join(' ')).toContain('Uma frase curta.')
    expect(chunks.join(' ')).toContain('Fim.')
  })

  it('returns no chunks for empty narration', () => {
    expect(chunkNarrationText('   ')).toEqual([])
  })

  it('fails closed outside a browser with speech synthesis support', () => {
    expect(speechNarrationSupported()).toBe(false)
  })
})
