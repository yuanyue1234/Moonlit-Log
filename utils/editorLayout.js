const EDITOR_CANVAS_WIDTH = 690
const EDITOR_CANVAS_HEIGHT = 1120

function calculateCanvasDisplaySize(options = {}) {
  const windowWidth = Math.max(1, Number(options.windowWidth) || 375)
  const windowHeight = Math.max(1, Number(options.windowHeight) || 667)
  const topBarBottomPx = Math.max(0, Number(options.topBarBottomPx) || 0)
  const safeAreaBottom = Number.isFinite(options.safeAreaBottom)
    ? options.safeAreaBottom
    : windowHeight
  const safeBottomPx = Math.max(0, windowHeight - safeAreaBottom)
  const mode = options.mode === 'preview' ? 'preview' : 'edit'
  const rpxPerPx = 750 / windowWidth
  const bottomReservedRpx = mode === 'preview' ? 104 : 214
  const horizontalReservedRpx = mode === 'preview' ? 40 : 32
  const availableWidthRpx = Math.max(280, 750 - horizontalReservedRpx)
  const availableHeightRpx = Math.max(
    420,
    (windowHeight - topBarBottomPx - safeBottomPx) * rpxPerPx - bottomReservedRpx
  )
  const displayScale = Math.min(
    availableWidthRpx / EDITOR_CANVAS_WIDTH,
    availableHeightRpx / EDITOR_CANVAS_HEIGHT
  )

  return {
    pageDisplayWidth: Math.max(280, Math.floor(EDITOR_CANVAS_WIDTH * displayScale)),
    pageDisplayHeight: Math.max(454, Math.floor(EDITOR_CANVAS_HEIGHT * displayScale)),
    availableWidthRpx,
    availableHeightRpx,
    displayScale
  }
}

module.exports = {
  EDITOR_CANVAS_WIDTH,
  EDITOR_CANVAS_HEIGHT,
  calculateCanvasDisplaySize
}
