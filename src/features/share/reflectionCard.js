import northStarLandscape from '@/assets/northstar-landscape.svg'

const CANVAS_WIDTH = 1080
const CANVAS_HEIGHT = 1920

export async function shareReflectionAsImage({ text, author = '' }) {
  const value = String(text || '').trim()
  if (!value) throw new Error('empty-reflection')

  const attribution = String(author || '').trim()
  const blob = await renderReflectionCard({ text: value, author: attribution })
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

async function renderReflectionCard({ text, author }) {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT

  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas-unavailable')

  await drawBackground(context)

  const centerX = CANVAS_WIDTH / 2
  const panelWidth = 820
  const panelX = (CANVAS_WIDTH - panelWidth) / 2
  const maxTextWidth = 610
  const maxTextHeight = 650
  const font = fitText(context, text, maxTextWidth, maxTextHeight)

  context.font = `500 ${font}px Georgia, 'Times New Roman', serif`
  const lines = wrapText(context, text, maxTextWidth)
  const lineHeight = font * 1.4
  const textHeight = Math.max(lineHeight, lines.length * lineHeight)

  const authorBlock = author ? 88 : 28
  const decorationBlock = 196
  const ornamentBlock = 62
  const verticalPadding = 184
  const contentHeight = decorationBlock + textHeight + authorBlock + ornamentBlock
  const panelHeight = clamp(contentHeight + verticalPadding, 760, 1120)
  const panelY = clamp((CANVAS_HEIGHT - panelHeight) * 0.31, 300, 360)

  drawQuotePanel(context, panelX, panelY, panelWidth, panelHeight)
  drawQuoteMark(context, centerX, panelY + 102)
  drawDivider(context, centerX - 67, panelY + 168, 134)

  let y = panelY + 238

  context.save()
  context.fillStyle = '#2D3A32'
  context.textAlign = 'center'
  context.textBaseline = 'top'
  context.font = `500 ${font}px Georgia, 'Times New Roman', serif`

  lines.forEach((line) => {
    context.fillText(line, centerX, y)
    y += lineHeight
  })
  context.restore()

  if (author) {
    y += 30
    drawAttribution(context, centerX, y, author)
    y += 66
  } else {
    y += 42
  }

  drawBotanicalOrnament(context, centerX, y)
  drawBrandLockup(context)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('image-export-failed'))
    }, 'image/png', 0.95)
  })
}

async function drawBackground(context) {
  const sky = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
  sky.addColorStop(0, '#F4EEE5')
  sky.addColorStop(0.32, '#ECE4D8')
  sky.addColorStop(0.7, '#D3D0C3')
  sky.addColorStop(1, '#8E9687')
  context.fillStyle = sky
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  drawSunGlow(context)
  drawMountainLayers(context)
  drawMist(context)

  try {
    const image = await loadImage(northStarLandscape)
    context.save()
    context.globalAlpha = 0.16
    context.drawImage(image, 0, CANVAS_HEIGHT - 720, CANVAS_WIDTH, 720)
    context.restore()
  } catch {
    // The procedural background is the fallback if the landscape asset cannot load.
  }

  drawTopFoliage(context)
  drawLowerForeground(context)
}

function drawSunGlow(context) {
  const glow = context.createRadialGradient(890, 300, 14, 890, 300, 260)
  glow.addColorStop(0, 'rgba(255, 232, 188, 0.96)')
  glow.addColorStop(0.34, 'rgba(255, 226, 177, 0.40)')
  glow.addColorStop(1, 'rgba(255, 226, 177, 0)')
  context.fillStyle = glow
  context.fillRect(610, 20, 470, 510)

  context.fillStyle = 'rgba(255, 239, 207, 0.75)'
  context.beginPath()
  context.arc(890, 300, 28, 0, Math.PI * 2)
  context.fill()
}

function drawMountainLayers(context) {
  const layers = [
    { y: 500, color: 'rgba(137, 142, 130, 0.14)' },
    { y: 650, color: 'rgba(120, 127, 114, 0.20)' },
    { y: 830, color: 'rgba(101, 110, 97, 0.26)' },
    { y: 1080, color: 'rgba(80, 90, 77, 0.34)' },
  ]

  layers.forEach(({ y, color }, index) => {
    context.beginPath()
    context.moveTo(-80, y + 55)
    context.bezierCurveTo(135, y - 75, 315, y + 16, 525, y - 38)
    context.bezierCurveTo(735, y - 95, 910, y - 24, 1160, y - 12)
    context.lineTo(1160, CANVAS_HEIGHT)
    context.lineTo(-80, CANVAS_HEIGHT)
    context.closePath()
    context.fillStyle = color
    context.fill()

    if (index === layers.length - 1) {
      const haze = context.createLinearGradient(0, y, 0, y + 330)
      haze.addColorStop(0, 'rgba(247, 242, 232, 0.10)')
      haze.addColorStop(1, 'rgba(247, 242, 232, 0)')
      context.fillStyle = haze
      context.fillRect(0, y, CANVAS_WIDTH, 350)
    }
  })
}

function drawMist(context) {
  for (let index = 0; index < 6; index += 1) {
    const y = 550 + (index * 170)
    const mist = context.createLinearGradient(0, y, 0, y + 135)
    mist.addColorStop(0, 'rgba(255, 248, 239, 0)')
    mist.addColorStop(0.46, 'rgba(255, 248, 239, 0.17)')
    mist.addColorStop(1, 'rgba(255, 248, 239, 0)')
    context.fillStyle = mist
    context.fillRect(0, y, CANVAS_WIDTH, 140)
  }
}

function drawTopFoliage(context) {
  context.save()
  context.strokeStyle = 'rgba(65, 77, 57, 0.62)'
  context.fillStyle = 'rgba(72, 86, 63, 0.74)'
  context.lineWidth = 4.5
  context.lineCap = 'round'

  context.beginPath()
  context.moveTo(-15, 12)
  context.bezierCurveTo(74, 36, 123, 91, 190, 170)
  context.stroke()

  const leaves = [
    [58, 45, 62, 28, -0.86],
    [108, 83, 67, 30, -0.48],
    [160, 132, 74, 31, -0.14],
    [116, 27, 58, 26, -1.12],
    [180, 73, 68, 30, -0.62],
    [232, 122, 62, 28, -0.26],
  ]

  leaves.forEach(([x, y, width, height, angle]) => {
    drawLeaf(context, x, y, width, height, angle)
  })

  context.restore()
}

function drawLeaf(context, x, y, width, height, angle) {
  context.save()
  context.translate(x, y)
  context.rotate(angle)
  context.beginPath()
  context.moveTo(0, 0)
  context.bezierCurveTo(
    width * 0.36,
    -height,
    width * 0.82,
    -height * 0.72,
    width,
    0,
  )
  context.bezierCurveTo(
    width * 0.8,
    height * 0.76,
    width * 0.34,
    height,
    0,
    0,
  )
  context.closePath()
  context.fill()
  context.restore()
}

function drawLowerForeground(context) {
  const gradient = context.createLinearGradient(0, 1320, 0, CANVAS_HEIGHT)
  gradient.addColorStop(0, 'rgba(62, 72, 60, 0)')
  gradient.addColorStop(0.6, 'rgba(55, 66, 54, 0.28)')
  gradient.addColorStop(1, 'rgba(42, 51, 43, 0.58)')
  context.fillStyle = gradient
  context.fillRect(0, 1320, CANVAS_WIDTH, 600)

  context.save()
  context.globalAlpha = 0.24
  context.fillStyle = '#344238'
  for (let index = 0; index < 7; index += 1) {
    drawLeaf(
      context,
      36 + (index * 42),
      1680 + ((index % 3) * 34),
      82,
      34,
      -0.74 + (index * 0.12),
    )
  }
  context.restore()
}

function drawQuotePanel(context, x, y, width, height) {
  context.save()
  context.shadowColor = 'rgba(46, 50, 43, 0.11)'
  context.shadowBlur = 34
  context.shadowOffsetY = 9

  const paper = context.createLinearGradient(x, y, x, y + height)
  paper.addColorStop(0, 'rgba(252, 249, 242, 0.965)')
  paper.addColorStop(1, 'rgba(246, 241, 232, 0.95)')
  context.fillStyle = paper
  roundRect(context, x, y, width, height, 46)
  context.fill()

  context.shadowColor = 'transparent'
  context.strokeStyle = 'rgba(171, 164, 151, 0.19)'
  context.lineWidth = 1.2
  roundRect(context, x + 0.6, y + 0.6, width - 1.2, height - 1.2, 45)
  context.stroke()

  addPaperTexture(context, x, y, width, height)
  context.restore()
}

function addPaperTexture(context, x, y, width, height) {
  context.save()
  context.beginPath()
  roundRect(context, x, y, width, height, 46)
  context.clip()

  for (let index = 0; index < 120; index += 1) {
    const px = x + ((index * 83) % Math.floor(width))
    const py = y + ((index * 137) % Math.floor(height))
    const alpha = 0.008 + ((index % 5) * 0.002)
    context.fillStyle = `rgba(105, 99, 87, ${alpha})`
    context.fillRect(px, py, 1.15, 1.15)
  }

  context.restore()
}

function drawQuoteMark(context, centerX, centerY) {
  context.save()
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = '#949A87'
  context.font = "600 94px Georgia, 'Times New Roman', serif"
  context.fillText('“', centerX, centerY)
  context.restore()
}

function drawDivider(context, x, y, width) {
  context.save()
  context.strokeStyle = 'rgba(145, 151, 134, 0.42)'
  context.lineWidth = 1.5
  context.beginPath()
  context.moveTo(x, y)
  context.lineTo(x + width, y)
  context.stroke()
  context.restore()
}

function drawAttribution(context, x, y, author) {
  context.save()
  context.fillStyle = '#5D685E'
  context.textAlign = 'center'
  context.textBaseline = 'top'
  context.font = "italic 500 31px Georgia, 'Times New Roman', serif"
  context.fillText(`— ${author}`, x, y)
  context.restore()
}

function drawBotanicalOrnament(context, x, y) {
  context.save()
  context.translate(x, y)
  context.strokeStyle = 'rgba(134, 145, 128, 0.70)'
  context.lineWidth = 2
  context.lineCap = 'round'

  context.beginPath()
  context.moveTo(0, 30)
  context.bezierCurveTo(-4, 10, 6, -9, 21, -27)
  context.stroke()

  drawOutlineLeaf(context, 4, 4, 27, 12, -0.5)
  drawOutlineLeaf(context, 16, -12, 29, 12, -0.96)
  drawOutlineLeaf(context, -7, 18, 26, 11, 0.36)

  context.restore()
}

function drawOutlineLeaf(context, x, y, width, height, angle) {
  context.save()
  context.translate(x, y)
  context.rotate(angle)
  context.beginPath()
  context.moveTo(0, 0)
  context.bezierCurveTo(
    width * 0.38,
    -height,
    width * 0.84,
    -height * 0.72,
    width,
    0,
  )
  context.bezierCurveTo(
    width * 0.82,
    height * 0.72,
    width * 0.38,
    height,
    0,
    0,
  )
  context.stroke()
  context.restore()
}

function drawBrandLockup(context) {
  const centerX = CANVAS_WIDTH / 2

  context.save()
  context.textAlign = 'center'
  context.textBaseline = 'middle'

  context.fillStyle = 'rgba(248, 244, 238, 0.91)'
  context.font = "500 40px Georgia, 'Times New Roman', serif"
  context.fillText('vereda', centerX, 1738)

  context.fillStyle = 'rgba(248, 244, 238, 0.80)'
  context.font = '500 16px Arial, sans-serif'
  context.fillText('seu caminho de estudo espírita', centerX, 1792)

  context.strokeStyle = 'rgba(248, 244, 238, 0.52)'
  context.lineWidth = 1.4
  context.beginPath()
  context.moveTo(centerX - 38, 1836)
  context.lineTo(centerX + 38, 1836)
  context.stroke()

  context.restore()
}

function fitText(context, text, maxWidth, maxHeight) {
  const preferredMax = (
    text.length < 110 ? 74
      : text.length < 180 ? 64
        : text.length < 260 ? 56
          : text.length < 360 ? 50
            : 44
  )

  for (let font = preferredMax; font >= 32; font -= 2) {
    context.font = `500 ${font}px Georgia, 'Times New Roman', serif`
    const lines = wrapText(context, text, maxWidth)
    if (lines.length * font * 1.4 <= maxHeight) return font
  }

  return 32
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
      if (context.measureText(candidate).width <= maxWidth) {
        line = candidate
      } else {
        lines.push(line)
        line = words[index]
      }
    }

    lines.push(line)
    if (paragraphIndex < paragraphs.length - 1) lines.push('')
  })

  return lines
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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}
