const template = require('../utils/template')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const templates = template.getTemplates()
const elements = templates.flatMap((item) => item.elements || [])
const maxBottom = Math.max(...elements.map((element) => (element.y || 0) + (element.height || 0) / 2))
const summary = {
  templates: templates.length,
  imageSlots: elements.filter((element) => element.templateAction === 'image').length,
  editableText: elements.filter((element) => element.templateAction === 'text').length,
  todos: elements.filter((element) => element.subType === 'todo').length,
  progressBars: elements.filter((element) => element.subType === 'progress').length,
  groupedDecorations: elements.filter((element) => element.groupId).length,
  maxBottom: Math.round(maxBottom)
}

assert(summary.templates === 8, `expected 8 templates, got ${summary.templates}`)
assert(summary.imageSlots > 0, 'templates need image slots')
assert(summary.editableText > 0, 'templates need editable text')
assert(summary.todos > 0, 'templates need a Todo component')
assert(summary.progressBars >= 2, 'templates need progress components')
assert(summary.groupedDecorations > 0, 'templates need grouped decorations')
assert(maxBottom <= template.TEMPLATE_CANVAS_HEIGHT, `template content exceeds canvas: ${maxBottom}`)

global.wx = {
  createOffscreenCanvas() { throw new Error('unused in this audit') },
  showToast() {},
  vibrateShort() {}
}
let editor
global.Page = (definition) => { editor = definition }
require('../pages/editor/editor.js')
editor.setData = (updates, callback) => {
  Object.assign(editor.data, updates)
  if (callback) callback()
}

editor.data.elements = [
  { id: 'group_a', groupId: 'decor_group', x: 10, y: 10 },
  { id: 'group_b', groupId: 'decor_group', x: 20, y: 20 }
]
editor.data.selectedId = 'group_a'
editor.data.selectedElement = editor.data.elements[0]
editor._updateElement('group_a', { x: 35, locked: true })
assert(editor.data.elements[1].x === 45, 'grouped decoration did not move as one component')
assert(editor.data.elements[1].locked === true, 'grouped decoration did not lock as one component')

const pixels = new Uint8ClampedArray(5 * 5 * 4)
for (let y = 0; y < 5; y += 1) {
  const index = (y * 5 + 2) * 4
  pixels[index + 3] = 255
}
const imageData = { data: pixels }
const context = {
  clearRect() {},
  getImageData() { return imageData },
  putImageData() {}
}
const rgbaAt = (x, y) => Array.from(pixels.slice((y * 5 + x) * 4, (y * 5 + x) * 4 + 4))

editor._drawStickerCanvas = { width: 5, height: 5 }
editor._drawStickerSize = { width: 5, height: 5 }
editor._drawStickerDpr = 1
editor._applyDrawFill(context, { point: { x: 0, y: 0 }, color: '#ff0000', opacity: 100 })
assert(rgbaAt(0, 0)[0] === 255, 'paint bucket did not fill the selected region')
assert(rgbaAt(4, 0)[3] === 0, 'paint bucket crossed a closed boundary')
assert(rgbaAt(2, 0)[3] === 255, 'paint bucket changed the boundary')

editor.data.drawLayers = [{ id: 'bottom', visible: true }, { id: 'top', visible: true }]
editor._drawStickerCtx = context
editor._drawStickerStrokes = [
  { id: 'a', layerId: 'top' },
  { id: 'b', layerId: 'bottom' },
  { id: 'c', layerId: 'top' }
]
const order = []
editor._drawDrawAction = (_, action) => order.push(action.id)
editor._redrawDrawStickerCanvas()
assert(order.join(',') === 'b,a,c', `layer order is incorrect: ${order.join(',')}`)

console.log('verify-template-components passed', summary)
