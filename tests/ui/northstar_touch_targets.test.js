import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('src/index.css', 'utf8')

function finalEditorialTabHeightPx(source) {
  // The final North Star override takes precedence over Tailwind's min-h-11 base rule.
  const block = source.slice(source.lastIndexOf('/* Founder-approved North Star'))
  const rule = block.match(/\.editorial-tabs button,\s*\.editorial-tabs button:nth-child\(2\)\s*\{([^}]*)\}/)
  expect(rule, 'final editorial tabs override').not.toBeNull()
  const declaration = rule[1].match(/min-height:\s*([\d.]+)(px|rem)/)
  expect(declaration, 'explicit mobile touch target minimum').not.toBeNull()
  return Number(declaration[1]) * (declaration[2] === 'rem' ? 16 : 1)
}

describe('North Star mobile touch targets', () => {
  it('preserves at least a 44px tap target for both editorial filter tabs', () => {
    expect(finalEditorialTabHeightPx(css)).toBeGreaterThanOrEqual(44)
  })
})
