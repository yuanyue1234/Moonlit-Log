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
const indexWxml = read('pages/index/index.wxml')
const stickersWxml = read('pages/stickers/stickers.wxml')
const stickersWxss = read('pages/stickers/stickers.wxss')
const templatesWxss = read('pages/templates/templates.wxss')
const editorLayoutJs = read('utils/editorLayout.js')

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

const editPageNav = blockBetween(editorWxml, '<view class="page-dots-bar edit-page-nav', '<view class="page-dots-bar preview-page-nav')
const previewPageNav = blockBetween(editorWxml, '<view class="page-dots-bar preview-page-nav', '<view class="floating-tool-dock"')
expect('home title is renamed', indexWxml.includes('<view class="page-title">月亮手杖</view>'))
expect('edit page nav is edit-only', editPageNav.includes("editorMode === 'edit'"))
expect('edit page nav has no dot scroll row', !editPageNav.includes('dots-scroll') && !editPageNav.includes('wx:for="{{bookPages}}"'))
expect('edit page nav contains add page action', editPageNav.includes('addNewPage'))
expect('edit page nav contains fixed delete page action', editPageNav.includes('deleteCurrentPage') && editPageNav.includes('isCoverPage'))
expect('preview page nav is preview-only', previewPageNav.includes("editorMode === 'preview'"))
expect('preview page nav restores tappable numbered dots', previewPageNav.includes('dots-scroll') && previewPageNav.includes('wx:for="{{bookPages}}"') && previewPageNav.includes('onTapPageDot'))
expect('preview page nav has no edit actions', !previewPageNav.includes('addNewPage') && !previewPageNav.includes('deleteCurrentPage'))
expect('editor uses responsive canvas display size', editorWxml.includes('pageDisplayWidth') && editorWxml.includes('pageDisplayHeight') && editorJs.includes('_fitCanvasToViewport'))
expect('editor canvas uses long page height', editorLayoutJs.includes('EDITOR_CANVAS_HEIGHT = 1120') && editorJs.includes('editorLayout.EDITOR_CANVAS_HEIGHT'))
expect('responsive canvas sizing is shared and testable', editorJs.includes('editorLayout.calculateCanvasDisplaySize') && exists('scripts/verify-editor-layout.js'))
expect('tool panels open above bottom toolbars', /\.edit-mode \.panel\s*\{[\s\S]*bottom:\s*calc\(202rpx/.test(editorWxss))
expect('tool dock stays above open panels', /\.floating-tool-dock\s*\{[\s\S]*z-index:\s*31/.test(editorWxss) && /\.edit-mode \.panel\s*\{[\s\S]*z-index:\s*29/.test(editorWxss))
expect('edit more menu can add pages', editorJs.includes("label: '添加下一页'") && editorJs.includes('this.addNewPage()'))

const drawWorkspace = blockBetween(editorWxml, '<view class="draw-workspace', '<view class="panel {{showTextPanel')
const drawToolbar = blockBetween(drawWorkspace, '<view class="draw-bottom-toolbar">', '</view>\n  </view>')
expect('draw workspace has top action group', drawWorkspace.includes('draw-top-actions'))
expect('draw undo is next to draw save group', drawWorkspace.indexOf('undoDrawSticker') > drawWorkspace.indexOf('draw-top-actions'))
expect('draw redo is next to draw save group', drawWorkspace.indexOf('redoDrawSticker') > drawWorkspace.indexOf('draw-top-actions'))
expect('draw save button remains in top actions', drawWorkspace.indexOf('saveDrawSticker') > drawWorkspace.indexOf('draw-top-actions'))
const drawOrder = ['toggleDrawColorPanel', 'toggleDrawWidthPanel', 'toggleDrawTool']
const drawOrderIndexes = drawOrder.map((needle) => drawToolbar.indexOf(needle))
expect('draw bottom toolbar has color/width/tool only', drawOrderIndexes.every((index) => index >= 0), drawOrderIndexes.join(', '))
expect('draw bottom toolbar removed sticker picker', !drawToolbar.includes('toggleDrawStickerShelf') && !drawWorkspace.includes('draw-sticker-popover'))
expect('draw bottom toolbar order is color/width/tool', drawOrderIndexes.every((index, i, arr) => i === 0 || arr[i - 1] < index))
expect('draw board size drives canvas init', editorJs.includes("query.select('.draw-board').boundingClientRect()"))
expect('draw canvas uses board rect width', editorJs.includes('boardRect.width || canvasInfo.width'))
expect('draw board canvas final guard exists', /\.draw-board \.draw-sticker-canvas\s*\{[\s\S]*height:\s*100%/.test(editorWxss))
expect('legacy fixed draw canvas height is scoped', !/(^|\n)\.draw-sticker-canvas\s*\{[^}]*height:\s*360rpx/.test(editorWxss))

expect('image more menu exposes crop', editorJs.includes("{ key: 'crop-image', label: '裁切'"))
expect('crop action uses reversible crop panel', editorJs.includes('_openImageCropPanel') && editorJs.includes("cropMode: 'cover'"))
expect('crop action does not call native destructive crop', !editorJs.includes('wx.cropImage({'))
expect('crop stores offsets on image element', editorJs.includes('cropOffsetX') && editorJs.includes('cropOffsetY'))
expect('copy/paste style actions removed', !editorWxml.includes('copy-style') && !editorJs.includes("key: 'copy-style'") && !editorJs.includes("key: 'paste-style'"))
expect('sticker preview uses checker stage', stickersWxml.includes('preview-image-stage') && stickersWxss.includes('.preview-image-stage'))
expect('template browser is compact three-column', /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/.test(templatesWxss))

;['ownerBookId', 'ownerPageId', 'ownerElementId', 'linkedPageId', 'linkedElementId', 'uniqueAsset'].forEach((field) => {
  expect(`storage sticker field exists: ${field}`, storageJs.includes(field))
})
expect('page deletion cleans sticker assets', /function deletePage[\s\S]*deleteStickersForElements/.test(storageJs))
expect('book deletion cleans sticker assets', /function deletePagesByBookId[\s\S]*deleteStickersForElements/.test(storageJs))
expect('cover image can be cleared', storageJs.includes('function clearBookCoverImage'))
expect('editor clears cover image before sticker cleanup', editorJs.includes('storage.clearBookCoverImage(this.data.bookId, el.src)'))
expect('clearBookCoverImage removes cover page image element', /function clearBookCoverImage[\s\S]*systemRole !== 'cover-fixed'/.test(storageJs))

if (failures.length > 0) {
  console.error(`verify-editor-ui failed (${failures.length} failures):`)
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(`verify-editor-ui passed (${passes} checks)`)
