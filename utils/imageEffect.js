// utils/imageEffect.js - alpha-mask based sticker effects for canvas

const maskCache = new Map()

function canUseOffscreenCanvas() {
  return typeof wx !== 'undefined' && typeof wx.createOffscreenCanvas === 'function'
}

function getMaskCanvas(src, image, width, height, color) {
  if (!canUseOffscreenCanvas()) return null

  const w = Math.max(1, Math.ceil(width))
  const h = Math.max(1, Math.ceil(height))
  const key = `${src || 'image'}:${w}x${h}:${color}`
  if (maskCache.has(key)) return maskCache.get(key)

  try {
    const canvas = wx.createOffscreenCanvas({ type: '2d', width: w, height: h })
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(image, 0, 0, w, h)
    ctx.globalCompositeOperation = 'source-in'
    ctx.fillStyle = color
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'source-over'
    const entry = { canvas, width: w, height: h }
    maskCache.set(key, entry)
    return entry
  } catch (err) {
    return null
  }
}

function drawOutline(ctx, src, image, x, y, width, height, options) {
  const mask = getMaskCanvas(src, image, width, height, options.color)
  if (!mask) return false

  const radius = options.radius || 10
  const step = options.step || 3
  ctx.save()
  if (options.shadow) {
    ctx.shadowColor = options.shadow.color
    ctx.shadowBlur = options.shadow.blur
    ctx.shadowOffsetX = options.shadow.offsetX || 0
    ctx.shadowOffsetY = options.shadow.offsetY || 0
  }

  for (let dx = -radius; dx <= radius; dx += step) {
    for (let dy = -radius; dy <= radius; dy += step) {
      if (dx * dx + dy * dy > radius * radius) continue
      ctx.drawImage(mask.canvas, x + dx, y + dy, width, height)
    }
  }
  ctx.restore()
  return true
}

function drawSubjectShadow(ctx, image, x, y, width, height) {
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.34)'
  ctx.shadowBlur = 22
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 10
  ctx.globalAlpha = 0.92
  ctx.drawImage(image, x, y, width, height)
  ctx.restore()
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

function drawImageEffect(ctx, src, image, x, y, width, height, effect) {
  if (!effect || effect === 'none') return false

  if (effect === 'shadow') {
    drawSubjectShadow(ctx, image, x, y, width, height)
    return true
  }

  if (effect === 'white-border') {
    const ok = drawOutline(ctx, src, image, x, y, width, height, {
      color: '#ffffff',
      radius: 10,
      step: 3,
      shadow: { color: 'rgba(0,0,0,0.16)', blur: 8, offsetY: 3 }
    })
    if (!ok) {
      drawAlphaGlow(ctx, image, x, y, width, height, '#ffffff', 12)
      return true
    }
    return false
  }

  if (effect === 'paper') {
    const ok = drawOutline(ctx, src, image, x, y, width, height, {
      color: '#fffaf0',
      radius: 16,
      step: 4,
      shadow: { color: 'rgba(0,0,0,0.24)', blur: 16, offsetY: 8 }
    })
    if (!ok) {
      drawAlphaGlow(ctx, image, x, y, width, height, '#fffaf0', 18)
      return true
    }
    return false
  }

  return false
}

function clearEffectCache() {
  maskCache.clear()
}

module.exports = {
  drawImageEffect,
  clearEffectCache
}
