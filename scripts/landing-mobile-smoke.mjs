import { chromium } from 'playwright'

const url = process.env.VEREDA_SMOKE_URL
const waitForDeployment = process.env.VEREDA_SMOKE_WAIT_FOR_DEPLOYMENT === 'true'
const focusColor = 'rgb(109, 139, 116)'

if (!url) throw new Error('VEREDA_SMOKE_URL is required')

const viewports = [
  { width: 320, height: 568, name: '320x568' },
  { width: 390, height: 844, name: '390x844' },
]

const browser = await chromium.launch({ headless: true })

async function openLanding(page, viewportName) {
  const maxAttempts = waitForDeployment ? 8 : 1
  let lastError

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
      await page.getByRole('heading', { level: 1 }).waitFor({ state: 'visible', timeout: 10_000 })
      console.log(`${viewportName}: landing ready on attempt ${attempt}`)
      return
    } catch (error) {
      lastError = error
      if (attempt < maxAttempts) {
        console.log(`${viewportName}: landing not ready yet (attempt ${attempt}/${maxAttempts})`)
        await new Promise((resolve) => setTimeout(resolve, 15_000))
      }
    }
  }

  throw lastError
}

function hasVisibleFocus(style) {
  const outlineVisible = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth || '0') >= 2
  const haloVisible = style.boxShadow !== 'none' && style.boxShadow.includes(focusColor)
  return outlineVisible || haloVisible
}

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport })
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await openLanding(page, viewport.name)

    const title = await page.title()
    if (!title.includes('Vereda')) throw new Error(`${viewport.name}: missing Vereda document title`)

    const snapshot = await page.evaluate(() => {
      const width = window.innerWidth
      const offenders = [...document.body.querySelectorAll('*')]
        .filter((element) => {
          const style = getComputedStyle(element)
          if (style.display === 'none' || style.visibility === 'hidden') return false
          const rect = element.getBoundingClientRect()
          return rect.width > 1 && (rect.left < -1 || rect.right > width + 1)
        })
        .slice(0, 8)
        .map((element) => {
          const rect = element.getBoundingClientRect()
          return {
            tag: element.tagName,
            text: (element.textContent || '').trim().slice(0, 60),
            left: rect.left,
            right: rect.right,
          }
        })

      return {
        metadata: {
          description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
          ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '',
          ogDescription: document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '',
        },
        h1: document.querySelectorAll('h1').length,
        h2: document.querySelectorAll('h2').length,
        login: Boolean(document.querySelector('a[href="/entrar"]')),
        signup: Boolean(document.querySelector('a[href="/criar-conta"]')),
        htmlScrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        offenders,
      }
    })

    if (!snapshot.metadata.description || !snapshot.metadata.ogTitle || !snapshot.metadata.ogDescription) {
      throw new Error(`${viewport.name}: incomplete description/social metadata`)
    }

    if (snapshot.h1 !== 1 || snapshot.h2 < 1 || !snapshot.login || !snapshot.signup) {
      throw new Error(`${viewport.name}: semantic/routing gate failed ${JSON.stringify(snapshot)}`)
    }

    if (
      snapshot.htmlScrollWidth > viewport.width + 1 ||
      snapshot.bodyScrollWidth > viewport.width + 1 ||
      snapshot.offenders.length > 0
    ) {
      throw new Error(`${viewport.name}: horizontal overflow ${JSON.stringify(snapshot)}`)
    }

    const signupLinks = page.locator('a[href="/criar-conta"]')
    let signupAboveFold = false
    for (let index = 0; index < await signupLinks.count(); index += 1) {
      const box = await signupLinks.nth(index).boundingBox()
      if (
        box &&
        box.y >= 0 &&
        box.y + box.height <= viewport.height &&
        box.x >= 0 &&
        box.x + box.width <= viewport.width
      ) {
        signupAboveFold = true
        break
      }
    }
    if (!signupAboveFold) throw new Error(`${viewport.name}: signup CTA is not fully visible above the fold`)

    let focusGate = null
    for (let index = 0; index < 6; index += 1) {
      await page.keyboard.press('Tab')
      focusGate = await page.evaluate(() => {
        const active = document.activeElement
        if (!active || active === document.body) return null
        const style = getComputedStyle(active)
        return {
          tag: active.tagName,
          href: active.getAttribute('href'),
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          outlineColor: style.outlineColor,
          boxShadow: style.boxShadow,
        }
      })
      if (focusGate && hasVisibleFocus(focusGate)) break
    }

    if (!focusGate || !hasVisibleFocus(focusGate)) {
      throw new Error(`${viewport.name}: visible focus gate failed ${JSON.stringify(focusGate)}`)
    }

    if (pageErrors.length > 0) {
      throw new Error(`${viewport.name}: page errors: ${pageErrors.join(' | ')}`)
    }

    console.log(`${viewport.name}: PASS`)
    await page.close()
  }
} finally {
  await browser.close()
}
