const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const failures = []
let passes = 0

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8')
}

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath))
}

function expect(name, condition, detail = '') {
  if (condition) {
    passes += 1
    return
  }
  failures.push(detail ? `${name}: ${detail}` : name)
}

function blockBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle)
  if (start === -1) return ''
  const end = source.indexOf(endNeedle, start)
  return source.slice(start, end === -1 ? source.length : end)
}

const appJson = JSON.parse(read('app.json'))
const editorWxml = read('pages/editor/editor.wxml')
const editorWxss = read('pages/editor/editor.wxss')
const editorJs = read('pages/editor/editor.js')
const storageJs = read('utils/storage.js')

expect('tabBar uses warm paper background', appJson.tabBar && appJson.tabBar.backgroundColor === '#FFFDF8')
expect('tabBar uses warm inactive color', appJson.tabBar && appJson.tabBar.color === '#9A8678')
expect('tabBar uses rose active color', appJson.tabBar && appJson.tabBar.selectedColor === '#C87596')
;(appJson.tabBar.list || []).forEach((item) => {
  expect(`tab icon exists: ${item.iconPath}`, exists(item.iconPath))
  expect(`tab active icon exists: ${item.selectedIconPath}`, exists(item.selectedIconPath))
})

const svgIconDir = path.join(root, 'assets/icons')
const svgIcons = fs.readdirSync(svgIconDir).filter((name) => name.endsWith('.svg'))
const currentColorIcons = svgIcons.filter((name) => fs.readFileSync(path.join(svgIconDir, name), 'utf8').includes('currentColor'))
expect('SVG icons do not depend on currentColor', currentColorIcons.length === 0, currentColorIcons.join(', '))

const directRefs = Array.from(editorWxml.matchAll(/src="(\/(?:assets|images)\/[^"{]+)"/g)).map((match) => match[1])
const missingRefs = directRefs.filter((ref) => !exists(ref.slice(1)))
expect('editor direct local image/icon refs exist', missingRefs.length === 0, missingRefs.join(', '))

const hoverCount = (editorWxml.match(/hover-class="soft-hover"/g) || []).length
expect('editor has broad soft-hover coverage', hoverCount >= 40, `found ${hoverCount}`)
expect('editor has soft-hover-scale color dots', editorWxml.includes('hover-class="soft-hover-scale"'))
expect('soft-hover style exists', editorWxss.includes('.soft-hover {'))
expect('soft-hover recolors icons', editorWxss.includes('.soft-hover .ui-icon'))
expect('custom picker plus is visually enlarged', /\.picker-icon\s*\{[\s\S]*scale\(1\.1\)/.test(editorWxss))

const pageDots = blockBetween(editorWxml, '<view class="page-dots-bar"', '<view class="floating-tool-dock"')
expect('page dots are preview-only', pageDots.includes("editorMode === 'preview'"))
expect('page dots do not contain add page action', !pageDots.includes('addNewPage'))
expect('page dots do not contain delete page action', !pageDots.includes('deleteCurrentPage'))
expect('edit more menu can add pages', editorJs.includes("label: '添加下一页'") && editorJs.includes('this.addNewPage()'))

const drawWorkspace = blockBetween(editorWxml, '<view class="draw-workspace', '<view class="panel {{showTextPanel')
const drawToolbar = blockBetween(drawWorkspace, '<view class="draw-bottom-toolbar">', '</view>\n  </view>')
expect('draw workspace has top action group', drawWorkspace.includes('draw-top-actions'))
expect('draw undo is next to draw save group', drawWorkspace.indexOf('undoDrawSticker') > drawWorkspace.indexOf('draw-top-actions'))
expect('draw redo is next to draw save group', drawWorkspace.indexOf('redoDrawSticker') > drawWorkspace.indexOf('draw-top-actions'))
expect('draw save button remains in top actions', drawWorkspace.indexOf('saveDrawSticker') > drawWorkspace.indexOf('draw-top-actions'))
const drawOrder = ['toggleDrawStickerShelf', 'toggleDrawColorPanel', 'toggleDrawWidthPanel', 'toggleDrawTool']
const drawOrderIndexes = drawOrder.map((needle) => drawToolbar.indexOf(needle))
expect('draw bottom toolbar has all four expected tools', drawOrderIndexes.every((index) => index >= 0), drawOrderIndexes.join(', '))
expect('draw bottom toolbar order is sticker/color/width/tool', drawOrderIndexes.every((index, i, arr) => i === 0 || arr[i - 1] < index))
expect('draw board size drives canvas init', editorJs.includes("query.select('.draw-board').boundingClientRect()"))
expect('draw canvas uses board rect width', editorJs.includes('boardRect.width || canvasInfo.width'))
expect('draw board canvas final guard exists', /\.draw-board \.draw-sticker-canvas\s*\{[\s\S]*height:\s*100%/.test(editorWxss))
expect('legacy fixed draw canvas height is scoped', !/(^|\n)\.draw-sticker-canvas\s*\{[^}]*height:\s*360rpx/.test(editorWxss))

expect('image more menu exposes crop', editorJs.includes("{ key: 'crop-image', label: '裁切'"))
expect('crop action calls wx.cropImage', editorJs.includes('wx.cropImage({'))
expect('crop creates a unique sticker', /cropSelectedImage[\s\S]*uniqueAsset:\s*true/.test(editorJs))

;['ownerBookId', 'ownerPageId', 'ownerElementId', 'linkedPageId', 'linkedElementId', 'uniqueAsset'].forEach((field) => {
  expect(`storage sticker field exists: ${field}`, storageJs.includes(field))
})
expect('page deletion cleans sticker assets', /function deletePage[\s\S]*deleteStickersForElements/.test(storageJs))
expect('book deletion cleans sticker assets', /function deletePagesByBookId[\s\S]*deleteStickersForElements/.test(storageJs))
expect('cover image can be cleared', storageJs.includes('function clearBookCoverImage'))
expect('editor clears cover image before sticker cleanup', editorJs.includes('storage.clearBookCoverImage(this.data.bookId, el.src)'))

if (failures.length > 0) {
  console.error(`verify-editor-ui failed (${failures.length} failures):`)
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(`verify-editor-ui passed (${passes} checks)`)
