const CANVAS_WIDTH = 1080
const CANVAS_HEIGHT = 1920

export async function shareReflectionAsImage({ text, title = 'Reflexão', attribution = '' }) {
  const value = String(text || '').trim()
  if (!value) throw new Error('empty-reflection')

  const blob = await renderReflectionCard({ text: value, title, attribution })
  const file = new File([blob], 'vereda-reflexao.png', { type: 'image/png' })

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: `${title || 'Reflexão'} · Vereda`,
      files: [file],
    })
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

async function renderReflectionCard({ text, title, attribution }) {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas-unavailable')

  drawLandscape(context)

  context.fillStyle = '#30452F'
  context.font = '600 30px Arial, sans-serif'
  context.letterSpacing = '3px'
  context.fillText(String(title || 'Reflexão').toUpperCase(), 110, 190)

  context.fillStyle = '#283128'
  context.font = '600 38px Georgia, serif'
  context.letterSpacing = '4px'
  context.fillText('VEREDA', 110, 255)

  const maxTextWidth = 820
  const maxTextHeight = 790
  const startY = 540
  const font = fitText(context, text, maxTextWidth, maxTextHeight)
  context.font = `500 ${font}px Georgia, serif`
  context.fillStyle = '#283128'
  context.letterSpacing = '0px'

  const lines = wrapText(context, text, maxTextWidth)
  const lineHeight = font * 1.42
  const totalHeight = lines.length * lineHeight
  let y = startY + Math.max(0, (maxTextHeight - totalHeight) / 2)

  context.fillStyle = 'rgba(255, 252, 245, 0.88)'
  roundRect(context, 75, 430, 930, 970, 42)
  context.fill()

  context.fillStyle = '#283128'
  context.font = `500 ${font}px Georgia, serif`
  lines.forEach((line) => {
    context.fillText(line, 130, y)
    y += lineHeight
  })

  if (attribution) {
    context.fillStyle = '#667064'
    context.font = '400 28px Arial, sans-serif'
    context.fillText(String(attribution), 130, Math.min(1335, y + 45))
  }

  context.fillStyle = 'rgba(255, 252, 245, 0.9)'
  roundRect(context, 75, 1635, 930, 150, 34)
  context.fill()

  context.fillStyle = '#30452F'
  context.font = '600 30px Georgia, serif'
  context.letterSpacing = '2px'
  context.fillText('VEREDA APP', 120, 1705)

  context.fillStyle = '#6B7568'
  context.font = '400 23px Arial, sans-serif'
  context.letterSpacing = '0px'
  context.fillText('Seu caminho de estudo espírita', 120, 1750)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('image-export-failed'))
    }, 'image/png', 0.95)
  })
}

function drawLandscape(context) {
  const gradient = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
  gradient.addColorStop(0, '#F7F2E8')
  gradient.addColorStop(0.55, '#F3EFE6')
  gradient.addColorStop(1, '#E5EBDD')
  context.fillStyle = gradient
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  context.fillStyle = '#E7B977'
  context.globalAlpha = 0.78
  context.beginPath()
  context.arc(875, 250, 112, 0, Math.PI * 2)
  context.fill()
  context.globalAlpha = 1

  context.fillStyle = '#D8E2D3'
  context.beginPath()
  context.moveTo(0, 1410)
  context.bezierCurveTo(170, 1320, 330, 1345, 475, 1425)
  context.bezierCurveTo(650, 1525, 820, 1450, 1080, 1320)
  context.lineTo(1080, 1920)
  context.lineTo(0, 1920)
  context.closePath()
  context.fill()

  context.fillStyle = '#AFC2AC'
  context.beginPath()
  context.moveTo(0, 1510)
  context.bezierCurveTo(180, 1425, 355, 1450, 505, 1535)
  context.bezierCurveTo(690, 1640, 865, 1545, 1080, 1445)
  context.lineTo(1080, 1920)
  context.lineTo(0, 1920)
  context.closePath()
  context.fill()

  context.fillStyle = '#6F8B72'
  context.beginPath()
  context.moveTo(0, 1640)
  context.bezierCurveTo(190, 1540, 370, 1580, 535, 1665)
  context.bezierCurveTo(720, 1760, 875, 1665, 1080, 1580)
  context.lineTo(1080, 1920)
  context.lineTo(0, 1920)
  context.closePath()
  context.fill()

  context.strokeStyle = '#FFF9F1'
  context.lineWidth = 64
  context.lineCap = 'round'
  context.beginPath()
  context.moveTo(520, 1920)
  context.bezierCurveTo(520, 1780, 610, 1700, 600, 1600)
  context.bezierCurveTo(590, 1510, 510, 1470, 540, 1390)
  context.stroke()

  context.strokeStyle = '#D8BFA9'
  context.lineWidth = 5
  context.beginPath()
  context.moveTo(520, 1920)
  context.bezierCurveTo(520, 1785, 606, 1700, 596, 1600)
  context.stroke()
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
  for (let font = 64; font >= 34; font -= 2) {
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
