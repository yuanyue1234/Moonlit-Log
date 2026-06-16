// utils/imageEffect.js - alpha-mask based sticker effects for canvas

const effectCache = new Map()

function canUseOffscreenCanvas() {
  return typeof wx !== 'undefined' && typeof wx.createOffscreenCanvas === 'function'
}

function parseColor(color) {
  const value = String(color || '#ffffff').trim()
  const hexMatch = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hexMatch) {
    let hex = hexMatch[1]
    if (hex.length === 3) hex = hex.split('').map(ch => ch + ch).join('')
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1
    }
  }

  const rgbaMatch = value.match(/^rgba?\(([^)]+)\)$/i)
  if (rgbaMatch) {
    const parts = rgbaMatch[1].split(',').map(item => item.trim())
    return {
      r: parseInt(parts[0], 10) || 0,
      g: parseInt(parts[1], 10) || 0,
      b: parseInt(parts[2], 10) || 0,
      a: parts[3] === undefined ? 1 : Math.max(0, Math.min(1, parseFloat(parts[3]) || 0))
    }
  }

  return { r: 255, g: 255, b: 255, a: 1 }
}

function buildAlphaMask(src, image, width, height, options = {}) {
  if (!canUseOffscreenCanvas()) return null

  const imageW = Math.max(1, Math.ceil(width))
  const imageH = Math.max(1, Math.ceil(height))
  const radius = Math.max(0, Math.round(options.radius || 0))
  const blurPad = Math.ceil((options.shadowBlur || 0) / 2)
  const offsetPad = Math.max(Math.abs(options.shadowOffsetX || 0), Math.abs(options.shadowOffsetY || 0))
  const margin = Math.max(2, radius + blurPad + offsetPad + 4)
  const canvasW = imageW + margin * 2
  const canvasH = imageH + margin * 2
  const color = parseColor(options.color)
  const opacity = options.opacity === undefined ? 1 : Math.max(0, Math.min(1, options.opacity))
  const threshold = options.threshold === undefined ? 8 : options.threshold
  const cacheKey = [
    src || 'image',
    imageW,
    imageH,
    radius,
    margin,
    options.color,
    opacity,
    threshold,
    options.paperNoise ? 'paper' : ''
  ].join(':')

  if (effectCache.has(cacheKey)) return effectCache.get(cacheKey)

  try {
    const canvas = wx.createOffscreenCanvas({ type: '2d', width: canvasW, height: canvasH })
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvasW, canvasH)
    ctx.drawImage(image, margin, margin, imageW, imageH)

    const source = ctx.getImageData(0, 0, canvasW, canvasH)
    const output = ctx.getImageData(0, 0, canvasW, canvasH)
    const sourceData = source.data
    const outputData = output.data
    outputData.fill(0)

    const sourceAlpha = new Uint8ClampedArray(canvasW * canvasH)
    for (let i = 0; i < sourceAlpha.length; i++) {
      const alpha = sourceData[i * 4 + 3]
      sourceAlpha[i] = alpha > threshold ? Math.min(255, Math.round(alpha * opacity * color.a)) : 0
    }

    const expandedAlpha = expandAlpha(sourceAlpha, canvasW, canvasH, radius)
    for (let y = 0; y < canvasH; y++) {
      for (let x = 0; x < canvasW; x++) {
        const alpha = expandedAlpha[y * canvasW + x]
        if (alpha <= 0) continue

        const index = (y * canvasW + x) * 4
        let r = color.r
        let g = color.g
        let b = color.b
        if (options.paperNoise) {
          const grain = ((x * 13 + y * 7) % 17) - 8
          r = Math.max(0, Math.min(255, r + grain))
          g = Math.max(0, Math.min(255, g + grain))
          b = Math.max(0, Math.min(255, b + grain))
        }

        outputData[index] = r
        outputData[index + 1] = g
        outputData[index + 2] = b
        outputData[index + 3] = alpha
      }
    }

    ctx.clearRect(0, 0, canvasW, canvasH)
    ctx.putImageData(output, 0, 0)

    const entry = { canvas, margin, width: canvasW, height: canvasH }
    effectCache.set(cacheKey, entry)
    return entry
  } catch (err) {
    return null
  }
}

function expandAlpha(sourceAlpha, width, height, radius) {
  const r = Math.max(0, Math.round(radius || 0))
  if (r === 0) return sourceAlpha

  const horizontal = new Uint8ClampedArray(width * height)
  const expanded = new Uint8ClampedArray(width * height)

  for (let y = 0; y < height; y++) {
    const row = y * width
    for (let x = 0; x < width; x++) {
      let maxAlpha = 0
      const from = Math.max(0, x - r)
      const to = Math.min(width - 1, x + r)
      for (let sx = from; sx <= to; sx++) {
        const alpha = sourceAlpha[row + sx]
        if (alpha > maxAlpha) maxAlpha = alpha
      }
      horizontal[row + x] = maxAlpha
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let maxAlpha = 0
      const from = Math.max(0, y - r)
      const to = Math.min(height - 1, y + r)
      for (let sy = from; sy <= to; sy++) {
        const alpha = horizontal[sy * width + x]
        if (alpha > maxAlpha) maxAlpha = alpha
      }
      expanded[y * width + x] = maxAlpha
    }
  }

  return expanded
}

function drawAlphaGlow(ctx, image, x, y, width, height, color, blur) {
  ctx.save()
  ctx.shadowColor = color
  ctx.shadowBlur = blur
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
  ctx.drawImage(image, x, y, width, height)
  ctx.restore()
}

function drawMask(ctx, mask, x, y) {
  ctx.drawImage(mask.canvas, x - mask.margin, y - mask.margin, mask.width, mask.height)
}

function drawRoundRect(ctx, x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius || 0, width / 2, height / 2))
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.arcTo(x + width, y, x + width, y + r, r)
  ctx.lineTo(x + width, y + height - r)
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r)
  ctx.lineTo(x + r, y + height)
  ctx.arcTo(x, y + height, x, y + height - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function drawPhotoFrame(ctx, image, x, y, width, height) {
  const pad = Math.max(8, Math.min(width, height) * 0.07)
  const bottom = Math.max(18, Math.min(width, height) * 0.16)
  const cardX = x - pad
  const cardY = y - pad
  const cardW = width + pad * 2
  const cardH = height + pad + bottom
  const radius = Math.max(10, pad * 1.1)

  ctx.save()
  ctx.shadowColor = 'rgba(122,86,58,0.18)'
  ctx.shadowBlur = Math.max(10, pad * 1.6)
  ctx.shadowOffsetY = Math.max(6, pad * 0.8)
  ctx.fillStyle = '#fffdf8'
  drawRoundRect(ctx, cardX, cardY, cardW, cardH, radius)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = 'rgba(168,143,128,0.35)'
  ctx.lineWidth = Math.max(1, pad * 0.08)
  drawRoundRect(ctx, cardX, cardY, cardW, cardH, radius)
  ctx.stroke()
  ctx.restore()

  ctx.save()
  ctx.fillStyle = 'rgba(216,182,165,0.28)'
  drawRoundRect(ctx, x - pad * 0.4, y - pad * 1.45, width * 0.35, pad * 1.3, pad * 0.35)
  ctx.fill()
  ctx.restore()

  ctx.save()
  drawRoundRect(ctx, x, y, width, height, Math.max(8, pad * 0.6))
  ctx.clip()
  ctx.drawImage(image, x, y, width, height)
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = 'rgba(168,143,128,0.22)'
  ctx.lineWidth = Math.max(1, pad * 0.08)
  drawRoundRect(ctx, x, y, width, height, Math.max(8, pad * 0.6))
  ctx.stroke()
  ctx.restore()
}

function drawSubjectShadow(ctx, src, image, x, y, width, height, options = {}) {
  const mask = buildAlphaMask(src, image, width, height, {
    color: options.color || 'rgba(0,0,0,0.45)',
    radius: 1,
    opacity: options.opacity || 0.55,
    shadowBlur: options.blur || 18,
    shadowOffsetX: options.offsetX || 0,
    shadowOffsetY: options.offsetY || 8
  })

  if (!mask) {
    ctx.save()
    ctx.shadowColor = options.color || 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = options.blur || 18
    ctx.shadowOffsetX = options.offsetX || 0
    ctx.shadowOffsetY = options.offsetY || 8
    ctx.globalAlpha = options.opacity || 0.55
    ctx.drawImage(image, x, y, width, height)
    ctx.restore()
    return false
  }

  ctx.save()
  ctx.shadowColor = options.color || 'rgba(0,0,0,0.35)'
  ctx.shadowBlur = options.blur || 18
  ctx.shadowOffsetX = options.offsetX || 0
  ctx.shadowOffsetY = options.offsetY || 8
  drawMask(ctx, mask, x, y)
  ctx.restore()
  return true
}

function drawOutline(ctx, src, image, x, y, width, height, options) {
  const mask = buildAlphaMask(src, image, width, height, options)
  if (!mask) {
    drawAlphaGlow(ctx, image, x, y, width, height, options.color, options.fallbackBlur || options.radius)
    return false
  }

  drawMask(ctx, mask, x, y)
  return true
}

function drawImageEffect(ctx, src, image, x, y, width, height, effect) {
  if (!effect || effect === 'none') return false

  if (effect === 'photo-frame') {
    drawPhotoFrame(ctx, image, x, y, width, height)
    return true
  }

  if (effect === 'shadow') {
    drawSubjectShadow(ctx, src, image, x, y, width, height, {
      color: 'rgba(0,0,0,0.32)',
      blur: 22,
      offsetY: 10,
      opacity: 0.5
    })
    return false
  }

  if (effect === 'white-border') {
    drawSubjectShadow(ctx, src, image, x, y, width, height, {
      color: 'rgba(0,0,0,0.18)',
      blur: 8,
      offsetY: 4,
      opacity: 0.38
    })
    drawOutline(ctx, src, image, x, y, width, height, {
      color: '#ffffff',
      radius: 10,
      opacity: 1,
      fallbackBlur: 12
    })
    return false
  }

  if (effect === 'paper') {
    drawSubjectShadow(ctx, src, image, x, y, width, height, {
      color: 'rgba(44,35,25,0.26)',
      blur: 18,
      offsetY: 9,
      opacity: 0.48
    })
    drawOutline(ctx, src, image, x, y, width, height, {
      color: '#fff7e8',
      radius: 16,
      opacity: 1,
      paperNoise: true,
      fallbackBlur: 18
    })
    return false
  }

  return false
}

function clearEffectCache() {
  effectCache.clear()
}

module.exports = {
  drawImageEffect,
  clearEffectCache
}
