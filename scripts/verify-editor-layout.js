const assert = require('assert')
const {
  EDITOR_CANVAS_WIDTH,
  EDITOR_CANVAS_HEIGHT,
  MODE_LAYOUT_RESERVES,
  calculateCanvasDisplaySize
} = require('../utils/editorLayout')

const CONTROL_BOXES = {
  dockBottom: 104,
  dockHeight: 104,
  pageNavBottom: 18,
  pageNavHeight: 82,
  panelBottom: 220
}

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
  assert.strictEqual(result.verticalReservedRpx, MODE_LAYOUT_RESERVES[viewport.mode].verticalRpx, `${viewport.name}: vertical reserve drifted`)
})

const compact = calculateCanvasDisplaySize(viewports[0])
assert(compact.pageDisplayHeight / compact.availableHeightRpx > 0.97, 'compact phone: canvas should use the available height')

const tall = calculateCanvasDisplaySize(viewports[1])
assert(tall.pageDisplayWidth / tall.availableWidthRpx > 0.97, 'tall phone: canvas should use the available width')
assert(tall.pageDisplayHeight / tall.availableHeightRpx > 0.98, 'tall phone: canvas should use almost all available height')

const tallPreview = calculateCanvasDisplaySize(viewports[2])
assert(tallPreview.pageDisplayWidth / tallPreview.availableWidthRpx > 0.97, 'preview: canvas should use the available width')

const panelDockGap = CONTROL_BOXES.panelBottom - (CONTROL_BOXES.dockBottom + CONTROL_BOXES.dockHeight)
const dockPageNavGap = CONTROL_BOXES.dockBottom - (CONTROL_BOXES.pageNavBottom + CONTROL_BOXES.pageNavHeight)
assert(panelDockGap >= 8, 'tool panel must keep a visible gap above the dock')
assert(dockPageNavGap >= 4, 'tool dock must not overlap the page navigation')

console.log(`verify-editor-layout passed (${viewports.length} viewports, panel gap ${panelDockGap}rpx)`)
