const assert = require('assert')
const {
  EDITOR_CANVAS_WIDTH,
  EDITOR_CANVAS_HEIGHT,
  calculateCanvasDisplaySize
} = require('../utils/editorLayout')

const viewports = [
  { name: 'compact phone edit', windowWidth: 375, windowHeight: 667, safeAreaBottom: 667, topBarBottomPx: 48, mode: 'edit' },
  { name: 'tall phone edit', windowWidth: 390, windowHeight: 844, safeAreaBottom: 810, topBarBottomPx: 48, mode: 'edit' },
  { name: 'tall phone preview', windowWidth: 390, windowHeight: 844, safeAreaBottom: 810, topBarBottomPx: 48, mode: 'preview' },
  { name: 'tablet edit', windowWidth: 768, windowHeight: 1024, safeAreaBottom: 1004, topBarBottomPx: 64, mode: 'edit' }
]

viewports.forEach((viewport) => {
  const result = calculateCanvasDisplaySize(viewport)
  const widthRatio = result.pageDisplayWidth / EDITOR_CANVAS_WIDTH
  const heightRatio = result.pageDisplayHeight / EDITOR_CANVAS_HEIGHT

  assert(result.pageDisplayWidth <= result.availableWidthRpx, `${viewport.name}: width exceeds workspace`)
  assert(result.pageDisplayHeight <= result.availableHeightRpx, `${viewport.name}: height exceeds workspace`)
  assert(Math.abs(widthRatio - heightRatio) < 0.003, `${viewport.name}: canvas is stretched`)
  assert(result.pageDisplayWidth >= 280, `${viewport.name}: canvas becomes too narrow`)
  assert(result.pageDisplayHeight >= 454, `${viewport.name}: canvas becomes too short`)
})

const compact = calculateCanvasDisplaySize(viewports[0])
assert(compact.pageDisplayHeight / compact.availableHeightRpx > 0.97, 'compact phone: canvas should use the available height')

const tall = calculateCanvasDisplaySize(viewports[1])
assert(tall.pageDisplayWidth / tall.availableWidthRpx > 0.97, 'tall phone: canvas should use the available width')

console.log(`verify-editor-layout passed (${viewports.length} viewports)`)
