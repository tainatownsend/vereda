const CANVAS_WIDTH = 1080
const CANVAS_HEIGHT = 1920

export async function shareReflectionAsImage({ text, title = 'Reflexão', attribution = '' }) {
  const value = String(text || '').trim()
  if (!value) throw new Error('empty-reflection')

  const blob = await renderReflectionCard({ text: value, title, attribution })
  const file = new File([blob], 'vereda-reflexao.png', { type: 'image/png' })

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: 'Reflexão · Vereda',
      text: 'Uma reflexão que guardei no Vereda.',
      files: [file],
    })
    return 'shared'
  }

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

async function renderReflectionCard({ text, title, attribution }) {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas-unavailable')

  const gradient = context.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  gradient.addColorStop(0, '#F7F2E8')
  gradient.addColorStop(0.55, '#F1EEE4')
  gradient.addColorStop(1, '#E6EBDD')
  context.fillStyle = gradient
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  context.fillStyle = 'rgba(76, 99, 72, 0.08)'
  context.beginPath()
  context.arc(900, 250, 310, 0, Math.PI * 2)
  context.fill()
  context.beginPath()
  context.arc(150, 1670, 360, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = '#30452F'
  context.font = '600 44px Georgia, serif'
  context.letterSpacing = '4px'
  context.fillText('VEREDA', 110, 150)

  context.fillStyle = '#6B7568'
  context.font = '600 25px Arial, sans-serif'
  context.letterSpacing = '1.5px'
  context.fillText(String(title || 'Reflexão').toUpperCase(), 110, 235)

  const maxTextWidth = 820
  const maxTextHeight = 1080
  const startY = 450
  const font = fitText(context, text, maxTextWidth, maxTextHeight)
  context.font = `500 ${font}px Georgia, serif`
  context.fillStyle = '#283128'
  context.letterSpacing = '0px'

  const lines = wrapText(context, text, maxTextWidth)
  const lineHeight = font * 1.42
  const totalHeight = lines.length * lineHeight
  let y = startY + Math.max(0, (maxTextHeight - totalHeight) / 2)

  lines.forEach((line) => {
    context.fillText(line, 110, y)
    y += lineHeight
  })

  if (attribution) {
    context.fillStyle = '#667064'
    context.font = '400 28px Arial, sans-serif'
    context.fillText(String(attribution), 110, Math.min(1580, y + 45))
  }

  context.strokeStyle = 'rgba(48, 69, 47, 0.22)'
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(110, 1710)
  context.lineTo(970, 1710)
  context.stroke()

  context.fillStyle = '#30452F'
  context.font = '600 31px Georgia, serif'
  context.letterSpacing = '2px'
  context.fillText('VEREDA', 110, 1785)

  context.fillStyle = '#6B7568'
  context.font = '400 24px Arial, sans-serif'
  context.letterSpacing = '0px'
  context.fillText('leitura · compreensão · reflexão', 110, 1835)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('image-export-failed'))
    }, 'image/png', 0.95)
  })
}

function fitText(context, text, maxWidth, maxHeight) {
  for (let font = 66; font >= 34; font -= 2) {
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
