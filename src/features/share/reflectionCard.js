import northStarLandscape from '@/assets/northstar-landscape.svg'

const CANVAS_WIDTH = 1080
const CANVAS_HEIGHT = 1920

export async function shareReflectionAsImage({ text }) {
  const value = String(text || '').trim()
  if (!value) throw new Error('empty-reflection')

  const blob = await renderReflectionCard({ text: value })
  const file = new File([blob], 'vereda-reflexao.png', { type: 'image/png' })

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] })
    return 'shared'
  }

  if (await copyImageToClipboard(blob)) return 'copied'

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'vereda-reflexao.png'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
  return 'downloaded'
}

async function copyImageToClipboard(blob) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') return false

  try {
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ])
    return true
  } catch {
    return false
  }
}

async function renderReflectionCard({ text }) {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas-unavailable')

  await drawLandscape(context)

  const maxTextWidth = 820
  const availableTextHeight = 1010
  const font = fitText(context, text, maxTextWidth, availableTextHeight)
  context.font = `500 ${font}px Georgia, serif`
  context.letterSpacing = '0px'

  const lines = wrapText(context, text, maxTextWidth)
  const lineHeight = font * 1.42
  const textHeight = Math.max(lineHeight, lines.length * lineHeight)
  const panelPadding = text.length < 180 ? 104 : 78
  const panelHeight = clamp(textHeight + (panelPadding * 2), 470, 1160)
  const panelTop = clamp((CANVAS_HEIGHT - panelHeight) * 0.39, 230, 500)
  const textStart = panelTop + ((panelHeight - textHeight) / 2)
  const textX = 130

  context.fillStyle = 'rgba(255, 252, 245, 0.91)'
  roundRect(context, 75, panelTop, 930, panelHeight, 44)
  context.fill()

  context.fillStyle = '#283128'
  context.font = `500 ${font}px Georgia, serif`
  let y = textStart
  lines.forEach((line) => {
    context.fillText(line, textX, y)
    y += lineHeight
  })

  drawSignature(context)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('image-export-failed'))
    }, 'image/png', 0.95)
  })
}

function drawSignature(context) {
  const label = 'vereda · seu caminho de estudo espírita'
  context.fillStyle = 'rgba(255, 252, 245, 0.9)'
  roundRect(context, 236, 1710, 608, 92, 32)
  context.fill()

  context.fillStyle = '#30452F'
  context.font = '600 24px Arial, sans-serif'
  context.letterSpacing = '0.6px'
  const width = context.measureText(label).width
  context.fillText(label, (CANVAS_WIDTH - width) / 2, 1767)
}

async function drawLandscape(context) {
  context.fillStyle = '#F7F2E8'
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  const image = await loadImage(northStarLandscape)
  const landscapeHeight = 690
  const landscapeTop = CANVAS_HEIGHT - landscapeHeight
  context.drawImage(image, 0, landscapeTop, CANVAS_WIDTH, landscapeHeight)

  const wash = context.createLinearGradient(0, 0, 0, 920)
  wash.addColorStop(0, 'rgba(247, 242, 232, 0.98)')
  wash.addColorStop(0.72, 'rgba(247, 242, 232, 0.9)')
  wash.addColorStop(1, 'rgba(247, 242, 232, 0.18)')
  context.fillStyle = wash
  context.fillRect(0, 0, CANVAS_WIDTH, 1040)
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

function roundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + r, y)
  context.arcTo(x + width, y, x + width, y + height, r)
  context.arcTo(x + width, y + height, x, y + height, r)
  context.arcTo(x, y + height, x, y, r)
  context.arcTo(x, y, x + width, y, r)
  context.closePath()
}

function fitText(context, text, maxWidth, maxHeight) {
  const preferredMax = text.length < 120 ? 78 : text.length < 240 ? 68 : 60

  for (let font = preferredMax; font >= 34; font -= 2) {
    context.font = `500 ${font}px Georgia, serif`
    const lines = wrapText(context, text, maxWidth)
    if (lines.length * font * 1.42 <= maxHeight) return font
  }
  return 34
}

function wrapText(context, text, maxWidth) {
  const paragraphs = String(text).split(/\n+/)
  const lines = []

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean)
    if (!words.length) return
    let line = words[0]

    for (let index = 1; index < words.length; index += 1) {
      const candidate = `${line} ${words[index]}`
      if (context.measureText(candidate).width <= maxWidth) line = candidate
      else {
        lines.push(line)
        line = words[index]
      }
    }
    lines.push(line)
    if (paragraphIndex < paragraphs.length - 1) lines.push('')
  })

  return lines
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}
