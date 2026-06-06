// pages/editor/editor.js - 手账页编辑器（完全重写 - 修复所有 bug）
const storage = require('../../utils/storage')
const themeUtil = require('../../utils/theme')
const templateUtil = require('../../utils/template')
const fileUtil = require('../../utils/file')
const imageEffect = require('../../utils/imageEffect')

// ========== Canvas 全局状态 ==========
let canvasCtx = null
let canvasNode = null
let canvasWidth = 690   // canvas 逻辑宽度 (rpx)
let canvasHeight = 920  // canvas 逻辑高度 (rpx)
let pxRatio = 1
let canvasPxW = 0       // canvas 物理像素宽
let canvasPxH = 0       // canvas 物理像素高
let canvasRect = null   // canvas 在屏幕上的 rect (px)
let renderScheduled = false

// ========== 图片缓存 ==========
// 解决 Bug: 图片异步加载导致绘制失败
const imageCache = new Map() // src -> { img, loaded, width, height }

function loadImage(src, canvas) {
  return new Promise((resolve, reject) => {
    if (imageCache.has(src) && imageCache.get(src).loaded) {
      resolve(imageCache.get(src))
      return
    }
    const img = canvas.createImage()
    const entry = { img, loaded: false, width: 0, height: 0 }
    imageCache.set(src, entry)
    img.onload = () => {
      entry.loaded = true
      entry.width = img.width
      entry.height = img.height
      resolve(entry)
    }
    img.onerror = () => {
      entry.loaded = false
      reject(new Error('Image load failed: ' + src))
    }
    img.src = src
  })
}

// ========== 触摸状态 ==========
let touchState = {
  type: null,        // 'move' | 'scale' | null
  startX: 0,         // 触摸起始 canvas-local rpx X
  startY: 0,         // 触摸起始 canvas-local rpx Y
  elementStartX: 0,
  elementStartY: 0,
  elementStartW: 0,
  elementStartH: 0,
  elementStartR: 0,
  startDist: 0,
  startAngle: 0,
  isMoved: false,
  touchStartTime: 0
}

Page({
  data: {
    bookId: '',
    pageId: '',
    bookName: '',
    currentTheme: null,
    elements: [],
    selectedId: null,
    selectedElement: null,
    copiedStyleType: '',
    background: '#FFFFFF',
    bgPattern: 'blank',
    showBgPanel: false,
    showStickerPanel: false,
    showTextPanel: false,
    showTemplatePanel: false,
    showDecorationPanel: false,
    stickers: [],
    templates: [],
    templateCategories: [],
    activeTemplateCategory: '全部',
    canUndo: false,
    canRedo: false,
    isSaving: false,
    pageWidth: 690,
    pageHeight: 920,
    // 文字
    textInput: '',
    textSize: 32,
    textColor: '#f2f2f2',
    textColors: ['#f2f2f2', '#ffffff', '#00d992', '#ff8ba7', '#a8d8ea', '#ffd93d', '#ff69b4', '#4a90d9', '#bdbdbd', '#8b949e'],
    textSizes: [24, 28, 32, 36, 40, 48, 56, 64, 72, 80],
    textFontFamily: 'handwriting',
    editingTextId: '',
    textPanelMode: 'add',
    textFonts: [
      { key: 'handwriting', name: '手写体', family: '"LXGW Yozai", "STKaiti", cursive' },
      { key: 'serif', name: '宋体', family: '"Noto Serif SC", "Source Han Serif SC", "SimSun", serif' },
      { key: 'sans', name: '黑体', family: '"Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif' }
    ],
    editorMode: 'edit',
    flipClass: '',
    flipState: 'idle',
    flipDirection: 'next',
    flipProgress: 0,
    flipTransform: 'perspective(1200rpx) rotateY(0deg) skewY(0deg)',
    flipShadowOpacity: 0,
    // 系统贴纸已移除，只保留用户上传和提取生成的贴纸。
    systemStickers: [],
    // 装饰面板已下线，素材入口只保留用户贴纸。
    decorations: [],
    // 背景选项
    bgColors: ['#FFFFFF', '#FFF8F0', '#FFF5F5', '#F5F0FF', '#F0F5FF', '#F0FFF5', '#FFFFF0', '#F5EDE3', '#1a1a1a', '#1a1520', '#15201a', '#201a15'],
    bgPatterns: ['blank', 'dots', 'lines', 'grid'],
    // 是否有未保存的图片需要异步加载
    _pendingImageRenders: false,
    // 输入法高度适配
    keyboardHeight: 0
  },

  // 历史记录
  history: [],
  historyIndex: -1,
  maxHistory: 50,

  onLoad(options) {
    const { bookId, pageId, templateId, mode } = options
    const book = storage.getBookById(bookId)
    if (!book) {
      wx.showToast({ title: '手账本不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    const themeInfo = themeUtil.getTheme(book.theme)
    let page = null

    if (pageId) {
      page = storage.getPageById(pageId)
    }

    if (!page) {
      page = storage.createPage(bookId, {
        background: themeInfo.pageBackgrounds[0]
      })
    }

    // 应用模板
    if (templateId) {
      const tmpl = templateUtil.getTemplateById(templateId)
      if (tmpl) {
        page.elements = (tmpl.elements || []).map((el, i) => ({
          ...el,
          id: 'el_' + Date.now() + '_' + i,
          width: el.width || 100,
          height: el.height || 100,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: i
        }))
        page.background = tmpl.background || page.background
        storage.updatePage(page.id, { elements: page.elements, background: page.background })
      }
    }

    // 加载同手账本的所有页面（用于底部小圆点导航）
    const allPages = storage.getPages(bookId)
    const currentPageIndex = allPages.findIndex(p => p.id === page.id)

    this.setData({
      bookId,
      pageId: page.id,
      bookName: book.name,
      currentTheme: themeInfo,
      elements: page.elements || [],
      background: page.background || '#FFFFFF',
      bgPattern: page.bgPattern || 'blank',
      stickers: storage.getStickers(),
      templates: templateUtil.getTemplates(),
      templateCategories: templateUtil.TEMPLATE_CATEGORIES,
      // 页面导航
      bookPages: allPages.map((p, i) => ({ id: p.id, index: i })),
      currentPageIndex: currentPageIndex >= 0 ? currentPageIndex : 0,
      editorMode: mode === 'preview' ? 'preview' : 'edit',
      flipClass: ''
    })

    // 初始化历史
    this.history = [JSON.parse(JSON.stringify(page.elements || []))]
    this.historyIndex = 0
    this.updateHistoryState()
  },

  onReady() {
    this.initCanvas()
    // 监听输入法高度变化
    this._keyboardHandler = (res) => {
      this.setData({ keyboardHeight: res.height > 0 ? res.height : 0 })
    }
    wx.onKeyboardHeightChange(this._keyboardHandler)
  },

  onShow() {
    // 刷新贴纸列表
    this.setData({ stickers: storage.getStickers() })
  },

  onHide() {
    // 页面隐藏时自动保存（比 onUnload 更可靠）
    this.savePage()
  },

  onUnload() {
    // 清理键盘监听器
    if (this._keyboardHandler) {
      wx.offKeyboardHeightChange(this._keyboardHandler)
    }
    // 立即保存（不用防抖）
    if (this._saveTimer) clearTimeout(this._saveTimer)
    const { pageId, elements, background, bgPattern } = this.data
    if (pageId) storage.updatePage(pageId, { elements, background, bgPattern })
    // 清理图片缓存
    imageCache.clear()
  },

  // ==================== Canvas 初始化 ====================
  initCanvas() {
    const query = wx.createSelectorQuery()
    query.select('#editorCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) {
          console.error('Canvas 节点未找到')
          return
        }
        const canvas = res[0].node
        canvasNode = canvas
        canvasCtx = canvas.getContext('2d')

        const windowInfo = wx.getWindowInfo()
        pxRatio = windowInfo.pixelRatio || 2

        // canvas 逻辑尺寸 (px)
        canvasPxW = Math.round(canvasWidth * windowInfo.windowWidth / 750)
        canvasPxH = Math.round(canvasHeight * windowInfo.windowWidth / 750)

        // 设置 canvas 物理尺寸
        canvas.width = canvasPxW * pxRatio
        canvas.height = canvasPxH * pxRatio
        canvasCtx.scale(pxRatio, pxRatio)

        // 获取 canvas 在屏幕上的位置
        this.refreshCanvasRect()
        this.renderCanvas()
      })
  },

  refreshCanvasRect() {
    wx.createSelectorQuery()
      .select('#editorCanvas')
      .boundingClientRect(rect => {
        if (rect) canvasRect = rect
      })
      .exec()
  },

  // ==================== Canvas 渲染 ====================
  renderCanvas() {
    if (!canvasCtx || !canvasNode) return
    if (renderScheduled) return
    renderScheduled = true

    // 使用 requestAnimationFrame 确保渲染同步
    canvasNode.requestAnimationFrame(() => {
      renderScheduled = false
      this._doRender()
    })
  },

  _doRender() {
    const ctx = canvasCtx
    const { elements, background, bgPattern, selectedId } = this.data

    // 清空
    ctx.clearRect(0, 0, canvasPxW, canvasPxH)

    // 绘制背景
    this._drawBackground(ctx, background, bgPattern)

    // 按 zIndex 排序绘制元素
    const sorted = [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
    let hasPendingImages = false

    sorted.forEach(el => {
      const result = this._drawElement(ctx, el, el.id === selectedId)
      if (result === 'pending') hasPendingImages = true
    })

    // 如果有未加载的图片，加载后重绘
    if (hasPendingImages) {
      this._loadPendingImages()
    }
  },

  _drawBackground(ctx, color, pattern) {
    ctx.fillStyle = color
    ctx.fillRect(0, 0, canvasPxW, canvasPxH)

    ctx.save()
    const spacing = 20
    const isLight = this._isLightColor(color)
    const paperInk = isLight ? '80, 64, 42' : '255, 255, 255'
    ctx.strokeStyle = `rgba(${paperInk}, ${isLight ? 0.18 : 0.1})`
    ctx.fillStyle = `rgba(${paperInk}, ${isLight ? 0.22 : 0.12})`
    ctx.lineWidth = isLight ? 1 : 0.8

    if (pattern === 'dots') {
      for (let x = spacing; x < canvasPxW; x += spacing) {
        for (let y = spacing; y < canvasPxH; y += spacing) {
          ctx.beginPath()
          ctx.arc(x, y, 1, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    } else if (pattern === 'lines') {
      for (let y = spacing; y < canvasPxH; y += spacing) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvasPxW, y)
        ctx.stroke()
      }
    } else if (pattern === 'grid') {
      for (let x = spacing; x < canvasPxW; x += spacing) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvasPxH)
        ctx.stroke()
      }
      for (let y = spacing; y < canvasPxH; y += spacing) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvasPxW, y)
        ctx.stroke()
      }
    }
    ctx.restore()
  },

  _isLightColor(color = '#FFFFFF') {
    const hex = String(color).replace('#', '')
    if (hex.length !== 6) return true
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    return (r * 0.299 + g * 0.587 + b * 0.114) > 180
  },

  // 绘制单个元素 - 返回 'pending' 如果图片未加载
  _drawElement(ctx, el, isSelected) {
    ctx.save()

    // rpx -> canvas px 坐标转换
    const scaleX = canvasPxW / canvasWidth
    const scaleY = canvasPxH / canvasHeight
    const x = el.x * scaleX
    const y = el.y * scaleY
    const w = (el.width || 100) * scaleX
    const h = (el.height || 100) * scaleY

    ctx.translate(x, y)
    ctx.rotate((el.rotation || 0) * Math.PI / 180)
    ctx.scale(el.scaleX || 1, el.scaleY || 1)

    let result = 'ok'

    if (el.type === 'sticker') {
      this._drawSticker(ctx, el, w, h)
    } else if (el.type === 'image') {
      result = this._drawImage(ctx, el, w, h)
    } else if (el.type === 'text') {
      this._drawText(ctx, el, w, h)
    } else if (el.type === 'decoration') {
      this._drawDecoration(ctx, el, w, h, scaleX, scaleY)
    }

    // 选中框
    if (isSelected) {
      this._drawSelectionHandles(ctx, w, h, !!el.locked)
    }

    ctx.restore()
    return result
  },

  // 绘制旧版贴纸占位
  _drawSticker(ctx, el, w, h) {
    ctx.strokeStyle = '#8b949e'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    this._roundRect(ctx, -w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 12)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#8b949e'
    ctx.font = `${Math.max(16, Math.min(w, h) * 0.22)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('贴纸', 0, 0)
  },

  // 绘制图片 - 修复异步加载 bug
  _drawImage(ctx, el, w, h) {
    const src = el.src
    if (!src) {
      this._drawPlaceholder(ctx, w, h, 'IMAGE')
      return 'ok'
    }

    // 检查缓存
    const cached = imageCache.get(src)
    if (cached && cached.loaded) {
      // 图片已加载，直接绘制
      try {
        // 保持宽高比绘制
        const imgRatio = cached.width / cached.height
        const boxRatio = w / h
        let drawW = w, drawH = h
        if (imgRatio > boxRatio) {
          drawH = w / imgRatio
        } else {
          drawW = h * imgRatio
        }
        imageEffect.drawImageEffect(ctx, el.src, cached.img, -drawW / 2, -drawH / 2, drawW, drawH, el.effect || 'none')
        ctx.drawImage(cached.img, -drawW/2, -drawH/2, drawW, drawH)
      } catch (e) {
        this._drawPlaceholder(ctx, w, h, 'IMAGE')
      }
      return 'ok'
    }

    // 图片未加载，显示占位符并返回 pending
    this._drawPlaceholder(ctx, w, h, 'WAIT')
    return 'pending'
  },

  _drawPlaceholder(ctx, w, h, icon) {
    ctx.fillStyle = 'rgba(61, 58, 57, 0.5)'
    const r = 8
    this._roundRect(ctx, -w/2, -h/2, w, h, r)
    ctx.fill()
    ctx.strokeStyle = 'rgba(61, 58, 57, 0.8)'
    ctx.lineWidth = 1
    this._roundRect(ctx, -w/2, -h/2, w, h, r)
    ctx.stroke()
    ctx.fillStyle = '#8b949e'
    ctx.font = `${Math.min(w, h) * 0.3}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(icon, 0, 0)
  },

  // 异步加载未缓存的图片
  _loadPendingImages() {
    const { elements } = this.data
    const promises = []

    elements.forEach(el => {
      if (el.type === 'image' && el.src && !imageCache.has(el.src)) {
        promises.push(
          loadImage(el.src, canvasNode).catch(() => {})
        )
      }
    })

    if (promises.length > 0) {
      Promise.all(promises).then(() => {
        // 图片加载完成后重绘
        this.renderCanvas()
      })
    }
  },

  // 绘制文字
  _drawText(ctx, el, w, h) {
    const scaleRatio = canvasPxW / canvasWidth
    const fontSize = (el.fontSize || 32) * scaleRatio
    ctx.font = `${fontSize}px ${this._getFontFamily(el.fontFamily || 'sans')}`
    ctx.fillStyle = el.color || '#f2f2f2'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const maxWidth = w * 0.9
    const text = el.text || ''
    const lines = this._wrapText(ctx, text, maxWidth)
    const lineHeight = fontSize * 1.4
    const startY = -(lines.length - 1) * lineHeight / 2
    lines.forEach((line, i) => {
      ctx.fillText(line, 0, startY + i * lineHeight)
    })
  },

  _getFontFamily(fontKey) {
    const font = this.data.textFonts.find(item => item.key === fontKey)
    return font ? font.family : '"PingFang SC", "Microsoft YaHei", sans-serif'
  },

  // 绘制装饰元素 - 新增胶带、便签、边框等
  _drawDecoration(ctx, el, w, h, scaleX, scaleY) {
    const subType = el.subType

    if (subType === 'title') {
      const fontSize = (el.fontSize || 40) * (canvasPxW / canvasWidth)
      ctx.font = `bold ${fontSize}px -apple-system, 'PingFang SC', sans-serif`
      ctx.fillStyle = el.color || '#f2f2f2'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(el.text || '', 0, 0)
    }
    else if (subType === 'line') {
      ctx.strokeStyle = el.color || '#3d3a39'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-w/2, 0)
      ctx.lineTo(w/2, 0)
      ctx.stroke()
    }
    else if (subType === 'box') {
      ctx.fillStyle = el.color || 'rgba(26, 26, 26, 0.8)'
      const r = (el.borderRadius || 8) * (canvasPxW / canvasWidth)
      this._roundRect(ctx, -w/2, -h/2, w, h, r)
      ctx.fill()
      ctx.strokeStyle = 'rgba(61, 58, 57, 0.6)'
      ctx.lineWidth = 1
      this._roundRect(ctx, -w/2, -h/2, w, h, r)
      ctx.stroke()
    }
    else if (subType === 'text') {
      const fontSize = (el.fontSize || 28) * (canvasPxW / canvasWidth)
      ctx.font = `${fontSize}px -apple-system, 'PingFang SC', sans-serif`
      ctx.fillStyle = el.color || '#8b949e'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(el.text || '', -w/2, -h/2)
    }
    else if (subType === 'date') {
      const fontSize = (el.fontSize || 28) * (canvasPxW / canvasWidth)
      const today = new Date()
      const dateStr = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,'0')}.${String(today.getDate()).padStart(2,'0')}`
      ctx.font = `${fontSize}px 'SF Mono', 'Menlo', monospace`
      ctx.fillStyle = el.color || '#8b949e'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(dateStr, 0, 0)
    }
    else if (subType === 'symbol') {
      const fontSize = (el.fontSize || 60) * (canvasPxW / canvasWidth)
      ctx.font = `${fontSize}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('装饰', 0, 0)
    }
    else if (subType === 'photoFrame' || subType === 'ticketFrame') {
      ctx.strokeStyle = '#3d3a39'
      ctx.lineWidth = 2
      ctx.setLineDash([8, 4])
      const r = subType === 'photoFrame' ? 8 : 4
      this._roundRect(ctx, -w/2, -h/2, w, h, r)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#8b949e'
      ctx.font = '16px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(subType === 'photoFrame' ? 'PHOTO' : 'TICKET', 0, 0)
    }
    else if (subType === 'circle') {
      const r = (el.radius || 40) * (canvasPxW / canvasWidth)
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.fillStyle = el.color || '#1a1a1a'
      ctx.fill()
      ctx.strokeStyle = el.borderColor || '#3d3a39'
      ctx.lineWidth = 2
      ctx.stroke()
    }
    // ===== 新增装饰类型 =====
    else if (subType === 'tape') {
      this._drawTape(ctx, el, w, h)
    }
    else if (subType === 'stickyNote') {
      this._drawStickyNote(ctx, el, w, h)
    }
    else if (subType === 'framePolaroid') {
      this._drawPolaroidFrame(ctx, el, w, h)
    }
    else if (subType === 'frameTorn') {
      this._drawTornFrame(ctx, el, w, h)
    }
    else if (subType === 'frameRounded') {
      this._drawRoundedFrame(ctx, el, w, h)
    }
    else if (subType === 'frameDashed') {
      this._drawDashedFrame(ctx, el, w, h)
    }
    else if (subType === 'dateStamp') {
      this._drawDateStamp(ctx, el, w, h)
    }
    else if (subType === 'dividerLine') {
      this._drawDividerLine(ctx, el, w, h)
    }
    else if (subType === 'dividerWave') {
      this._drawDividerWave(ctx, el, w, h)
    }
    else if (subType === 'borderStars' || subType === 'borderHearts') {
      this._drawPatternBorder(ctx, el, w, h, subType === 'borderStars' ? '*' : '+')
    }
  },

  // ---- 新增装饰绘制方法 ----
  _drawTape(ctx, el, w, h) {
    const color = el.color || '#ff8ba7'
    ctx.fillStyle = color
    ctx.globalAlpha = 0.6
    this._roundRect(ctx, -w/2, -h/2, w, h, 4)
    ctx.fill()
    ctx.globalAlpha = 1
    // 胶带纹理
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 1
    for (let i = -w/2; i < w/2; i += 6) {
      ctx.beginPath()
      ctx.moveTo(i, -h/2)
      ctx.lineTo(i + h, h/2)
      ctx.stroke()
    }
    // 边缘锯齿
    ctx.fillStyle = color
    ctx.globalAlpha = 0.4
    for (let i = -w/2; i < w/2; i += 8) {
      ctx.fillRect(i, -h/2 - 3, 4, 3)
      ctx.fillRect(i, h/2, 4, 3)
    }
    ctx.globalAlpha = 1
  },

  _drawStickyNote(ctx, el, w, h) {
    const bgColor = el.bgColor || '#2a2510'
    const cornerSize = 16
    // 便签主体
    ctx.fillStyle = bgColor
    ctx.beginPath()
    ctx.moveTo(-w/2, -h/2)
    ctx.lineTo(w/2 - cornerSize, -h/2)
    ctx.lineTo(w/2, -h/2 + cornerSize)
    ctx.lineTo(w/2, h/2)
    ctx.lineTo(-w/2, h/2)
    ctx.closePath()
    ctx.fill()
    // 折角
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.beginPath()
    ctx.moveTo(w/2 - cornerSize, -h/2)
    ctx.lineTo(w/2 - cornerSize, -h/2 + cornerSize)
    ctx.lineTo(w/2, -h/2 + cornerSize)
    ctx.closePath()
    ctx.fill()
    // 边框
    ctx.strokeStyle = 'rgba(61, 58, 57, 0.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-w/2, -h/2)
    ctx.lineTo(w/2 - cornerSize, -h/2)
    ctx.lineTo(w/2, -h/2 + cornerSize)
    ctx.lineTo(w/2, h/2)
    ctx.lineTo(-w/2, h/2)
    ctx.closePath()
    ctx.stroke()
    // 文字提示
    ctx.fillStyle = '#8b949e'
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('NOTE', 0, 0)
  },

  _drawPolaroidFrame(ctx, el, w, h) {
    const bottomPad = h * 0.15
    // 白色边框（暗色主题下用深色）
    ctx.fillStyle = '#1a1a1a'
    this._roundRect(ctx, -w/2, -h/2, w, h, 4)
    ctx.fill()
    ctx.strokeStyle = '#3d3a39'
    ctx.lineWidth = 2
    this._roundRect(ctx, -w/2, -h/2, w, h, 4)
    ctx.stroke()
    // 图片区域虚线
    ctx.strokeStyle = 'rgba(61, 58, 57, 0.5)'
    ctx.lineWidth = 1
    ctx.setLineDash([6, 4])
    ctx.strokeRect(-w/2 + 10, -h/2 + 10, w - 20, h - 20 - bottomPad)
    ctx.setLineDash([])
    // 底部文字
    ctx.fillStyle = '#8b949e'
    ctx.font = '16px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('PHOTO', 0, h/2 - bottomPad/2)
  },

  _drawTornFrame(ctx, el, w, h) {
    ctx.strokeStyle = '#3d3a39'
    ctx.lineWidth = 2
    ctx.beginPath()
    const steps = 20
    // 使用确定性伪随机（基于元素ID的hash），避免每次渲染抖动
    const seed = (el.id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    const pseudoRandom = (i) => Math.sin(seed * 9301 + i * 49297) * 0.5 + 0.5
    // 上边撕纸效果
    for (let i = 0; i <= steps; i++) {
      const px = -w/2 + (w / steps) * i
      const py = -h/2 + (pseudoRandom(i) - 0.5) * 8
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    // 右边
    for (let i = 0; i <= steps; i++) {
      const px = w/2 + (pseudoRandom(i + steps) - 0.5) * 8
      const py = -h/2 + (h / steps) * i
      ctx.lineTo(px, py)
    }
    // 下边
    for (let i = steps; i >= 0; i--) {
      const px = -w/2 + (w / steps) * i
      const py = h/2 + (pseudoRandom(i + steps * 2) - 0.5) * 8
      ctx.lineTo(px, py)
    }
    // 左边
    for (let i = steps; i >= 0; i--) {
      const px = -w/2 + (pseudoRandom(i + steps * 3) - 0.5) * 8
      const py = -h/2 + (h / steps) * i
      ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fillStyle = 'rgba(26, 26, 26, 0.3)'
    ctx.fill()
    ctx.stroke()
  },

  _drawRoundedFrame(ctx, el, w, h) {
    ctx.strokeStyle = '#3d3a39'
    ctx.lineWidth = 3
    const r = Math.min(w, h) * 0.1
    this._roundRect(ctx, -w/2, -h/2, w, h, r)
    ctx.stroke()
  },

  _drawDashedFrame(ctx, el, w, h) {
    ctx.strokeStyle = '#3d3a39'
    ctx.lineWidth = 2
    ctx.setLineDash([8, 6])
    this._roundRect(ctx, -w/2, -h/2, w, h, 8)
    ctx.stroke()
    ctx.setLineDash([])
  },

  _drawDateStamp(ctx, el, w, h) {
    const today = new Date()
    const dateStr = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,'0')}.${String(today.getDate()).padStart(2,'0')}`
    // 圆形戳章
    const r = Math.min(w, h) / 2
    ctx.strokeStyle = '#00d992'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, r - 4, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(0, 0, r - 8, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#00d992'
    ctx.font = 'bold 14px SF Mono, Menlo, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(dateStr, 0, 0)
  },

  _drawDividerLine(ctx, el, w, h) {
    ctx.strokeStyle = el.color || '#3d3a39'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-w/2, 0)
    ctx.lineTo(w/2, 0)
    ctx.stroke()
    // 装饰点
    ctx.fillStyle = el.color || '#00d992'
    ctx.beginPath()
    ctx.arc(-w/2, 0, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(w/2, 0, 4, 0, Math.PI * 2)
    ctx.fill()
  },

  _drawDividerWave(ctx, el, w, h) {
    ctx.strokeStyle = el.color || '#3d3a39'
    ctx.lineWidth = 2
    ctx.beginPath()
    const amp = 8
    const freq = 20
    for (let i = -w/2; i <= w/2; i += 2) {
      const yy = Math.sin(i / freq * Math.PI) * amp
      if (i === -w/2) ctx.moveTo(i, yy)
      else ctx.lineTo(i, yy)
    }
    ctx.stroke()
  },

  _drawPatternBorder(ctx, el, w, h, mark) {
    const spacing = 30
    ctx.font = '16px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // 上边
    for (let x = -w/2 + spacing/2; x < w/2; x += spacing) {
      ctx.fillText(mark, x, -h/2)
    }
    // 下边
    for (let x = -w/2 + spacing/2; x < w/2; x += spacing) {
      ctx.fillText(mark, x, h/2)
    }
    // 左边
    for (let y = -h/2 + spacing/2; y < h/2; y += spacing) {
      ctx.fillText(mark, -w/2, y)
    }
    // 右边
    for (let y = -h/2 + spacing/2; y < h/2; y += spacing) {
      ctx.fillText(mark, w/2, y)
    }
  },

  // 绘制选中手柄
  _drawSelectionHandles(ctx, w, h, locked = false) {
    const color = locked ? '#8b949e' : '#00d992'
    // 虚线边框
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    ctx.strokeRect(-w/2 - 4, -h/2 - 4, w + 8, h + 8)
    ctx.setLineDash([])

    if (locked) {
      ctx.fillStyle = 'rgba(16, 16, 16, 0.72)'
      this._roundRect(ctx, -28, -h / 2 - 34, 56, 20, 10)
      ctx.fill()
      ctx.fillStyle = '#f2f2f2'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('已锁定', 0, -h / 2 - 24)
      return
    }

    // 角落手柄
    const hs = 8
    ctx.fillStyle = color
    const corners = [[-w/2-4, -h/2-4], [w/2+4, -h/2-4], [-w/2-4, h/2+4], [w/2+4, h/2+4]]
    corners.forEach(([cx, cy]) => {
      ctx.beginPath()
      ctx.arc(cx, cy, hs, 0, Math.PI * 2)
      ctx.fill()
    })

    // 旋转手柄连线
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, -h/2 - 4)
    ctx.lineTo(0, -h/2 - 24)
    ctx.stroke()
    // 旋转手柄圆点
    ctx.beginPath()
    ctx.arc(0, -h/2 - 28, 6, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  },

  // ==================== 工具方法 ====================
  _roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w/2, h/2)
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  },

  _wrapText(ctx, text, maxWidth) {
    const lines = []
    const paragraphs = text.split('\n')
    paragraphs.forEach(para => {
      let line = ''
      for (let i = 0; i < para.length; i++) {
        const testLine = line + para[i]
        const metrics = ctx.measureText(testLine)
        if (metrics.width > maxWidth && line) {
          lines.push(line)
          line = para[i]
        } else {
          line = testLine
        }
      }
      if (line) lines.push(line)
    })
    return lines
  },

  // ==================== 触摸处理 (修复拖拽 bug) ====================
  // 关键修复: 统一使用 canvas-local rpx 坐标系
  _touchToCanvasRpx(touch) {
    if (!canvasRect) {
      this.refreshCanvasRect()
      return null
    }
    // 触摸点相对于 canvas 左上角的 px 偏移
    const localPxX = touch.clientX - canvasRect.left
    const localPxY = touch.clientY - canvasRect.top
    // 转换为 canvas 逻辑 rpx 坐标
    const rpxX = localPxX / canvasRect.width * canvasWidth
    const rpxY = localPxY / canvasRect.height * canvasHeight
    return { x: rpxX, y: rpxY }
  },

  // 命中测试 - 使用 rpx 坐标 (与元素坐标系一致)
  _hitTest(tx, ty) {
    const { elements } = this.data
    // 从上层到下层检测
    const sorted = [...elements].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
    const hitPadding = 15 // rpx 点击容差

    for (const el of sorted) {
      const ex = el.x
      const ey = el.y
      const ew = (el.width || 100)
      const eh = (el.height || 100)
      const rot = (el.rotation || 0) * Math.PI / 180

      // 将触摸点变换到元素的局部坐标系（考虑旋转）
      const cos = Math.cos(-rot)
      const sin = Math.sin(-rot)
      const dx = tx - ex
      const dy = ty - ey
      const lx = dx * cos - dy * sin
      const ly = dx * sin + dy * cos

      if (Math.abs(lx) <= ew/2 + hitPadding && Math.abs(ly) <= eh/2 + hitPadding) {
        return el
      }
    }
    return null
  },

  onTouchStart(e) {
    if (this.data.editorMode !== 'edit') return
    if (e.touches.length === 1) {
      const pos = this._touchToCanvasRpx(e.touches[0])
      if (!pos) return

      touchState.startX = pos.x
      touchState.startY = pos.y
      touchState.touchStartTime = Date.now()
      touchState.isMoved = false

      // 命中测试
      const hitEl = this._hitTest(pos.x, pos.y)
      if (hitEl) {
        this.setData({ selectedId: hitEl.id, selectedElement: hitEl })
        if (hitEl.locked) {
          touchState.type = null
          this.renderCanvas()
          return
        }
        touchState.type = 'move'
        touchState.elementStartX = hitEl.x
        touchState.elementStartY = hitEl.y
        touchState.elementStartW = hitEl.width || 100
        touchState.elementStartH = hitEl.height || 100
        touchState.elementStartR = hitEl.rotation || 0
      } else {
        this.setData({ selectedId: null, selectedElement: null })
        touchState.type = null
      }
      this.renderCanvas()
    } else if (e.touches.length === 2) {
      const t1 = this._touchToCanvasRpx(e.touches[0])
      const t2 = this._touchToCanvasRpx(e.touches[1])
      if (!t1 || !t2) return

      touchState.startDist = Math.hypot(t2.x - t1.x, t2.y - t1.y)
      touchState.startAngle = Math.atan2(t2.y - t1.y, t2.x - t1.x)
      touchState.type = 'scale'

      const el = this._getSelectedElement()
      if (el && el.locked) {
        touchState.type = null
        this.renderCanvas()
        return
      }
      if (el) {
        touchState.elementStartW = el.width || 100
        touchState.elementStartH = el.height || 100
        touchState.elementStartR = el.rotation || 0
      }
    }
  },

  onTouchMove(e) {
    if (this.data.editorMode !== 'edit') return
    touchState.isMoved = true

    if (e.touches.length === 1 && touchState.type === 'move') {
      const pos = this._touchToCanvasRpx(e.touches[0])
      if (!pos) return

      const dx = pos.x - touchState.startX
      const dy = pos.y - touchState.startY

      const el = this._getSelectedElement()
      if (el && !el.locked) {
        const newX = touchState.elementStartX + dx
        const newY = touchState.elementStartY + dy
        this._updateElement(el.id, { x: newX, y: newY })
        this.renderCanvas()
      }
    } else if (e.touches.length === 2 && touchState.type === 'scale') {
      const t1 = this._touchToCanvasRpx(e.touches[0])
      const t2 = this._touchToCanvasRpx(e.touches[1])
      if (!t1 || !t2) return

      const dist = Math.hypot(t2.x - t1.x, t2.y - t1.y)
      const angle = Math.atan2(t2.y - t1.y, t2.x - t1.x)

      const el = this._getSelectedElement()
      if (el && !el.locked) {
        const scale = dist / touchState.startDist
        const newW = Math.max(30, Math.min(canvasWidth, touchState.elementStartW * scale))
        const newH = Math.max(30, Math.min(canvasHeight, touchState.elementStartH * scale))
        const angleDelta = (angle - touchState.startAngle) * 180 / Math.PI
        const newR = touchState.elementStartR + angleDelta

        this._updateElement(el.id, { width: newW, height: newH, rotation: newR })
        this.renderCanvas()
      }
    }
  },

  onTouchEnd(e) {
    if (this.data.editorMode !== 'edit') return
    if (touchState.isMoved && touchState.type) {
      this.pushHistory()
    }
    touchState.type = null
    touchState.isMoved = false
  },

  // ==================== 元素操作 ====================
  _getSelectedElement() {
    return this.data.elements.find(el => el.id === this.data.selectedId) || null
  },

  _updateElement(id, updates) {
    let selectedElement = this.data.selectedElement
    const elements = this.data.elements.map(el => {
      if (el.id !== id) return el
      const next = { ...el, ...updates }
      if (id === this.data.selectedId) selectedElement = next
      return next
    })
    this.setData({ elements, selectedElement })
  },

  _getMaxZIndex() {
    return Math.max(0, ...this.data.elements.map(el => el.zIndex || 0))
  },

  addSticker(e) {
    const symbol = e.currentTarget.dataset.symbol
    if (!symbol) return
    const maxZ = this._getMaxZIndex()
    const newEl = {
      id: 'el_' + Date.now(),
      type: 'sticker',
      src: symbol,
      x: canvasWidth / 2 + (Math.random() - 0.5) * 60,
      y: canvasHeight / 2 + (Math.random() - 0.5) * 60,
      width: 120,
      height: 120,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: maxZ + 1
    }
    const elements = [...this.data.elements, newEl]
    this.setData({ elements, selectedId: newEl.id, selectedElement: newEl })
    this.pushHistory()
    this.renderCanvas()
    wx.showToast({ title: '已添加', icon: 'none', duration: 800 })
  },

  addUserSticker(e) {
    const src = e.currentTarget.dataset.src
    if (!src) return
    const stickerId = e.currentTarget.dataset.id
    const sticker = this.data.stickers.find(item => item.id === stickerId || item.src === src) || {}
    const maxZ = this._getMaxZIndex()
    const newEl = {
      id: 'el_' + Date.now(),
      type: 'image',
      src: src,
      x: canvasWidth / 2,
      y: canvasHeight / 2,
      width: 200,
      height: 200,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      effect: sticker.effect || 'none',
      zIndex: maxZ + 1
    }
    const elements = [...this.data.elements, newEl]
    this.setData({ elements, selectedId: newEl.id, selectedElement: newEl, showStickerPanel: false })
    this.pushHistory()
    this.renderCanvas()
  },

  addDecoration(e) {
    const { type, color, style, bgColor } = e.currentTarget.dataset
    if (!type) return
    const maxZ = this._getMaxZIndex()
    const id = 'el_' + Date.now()

    let subType = type
    let w = 200, h = 60
    let extra = {}

    if (type === 'tape') {
      subType = 'tape'
      w = 300; h = 40
      extra = { color: color || '#ff8ba7' }
    } else if (type === 'stickyNote') {
      subType = 'stickyNote'
      w = 200; h = 200
      extra = { bgColor: bgColor || '#2a2510' }
    } else if (type === 'framePolaroid') {
      subType = 'framePolaroid'
      w = 250; h = 300
    } else if (type === 'frameTorn') {
      subType = 'frameTorn'
      w = 250; h = 200
    } else if (type === 'frameRounded') {
      subType = 'frameRounded'
      w = 250; h = 200
    } else if (type === 'frameDashed') {
      subType = 'frameDashed'
      w = 250; h = 200
    } else if (type === 'dateStamp') {
      subType = 'dateStamp'
      w = 120; h = 120
    } else if (type === 'dividerLine') {
      subType = 'dividerLine'
      w = 400; h = 20
    } else if (type === 'dividerWave') {
      subType = 'dividerWave'
      w = 400; h = 30
    } else if (type === 'borderStars' || type === 'borderHearts') {
      subType = type
      w = 400; h = 500
    }

    const newEl = {
      id,
      type: 'decoration',
      subType,
      x: canvasWidth / 2,
      y: canvasHeight / 2,
      width: w,
      height: h,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: maxZ + 1,
      ...extra
    }

    const elements = [...this.data.elements, newEl]
    this.setData({ elements, selectedId: id, selectedElement: newEl, showDecorationPanel: false })
    this.pushHistory()
    this.renderCanvas()
    wx.showToast({ title: '已添加', icon: 'none', duration: 800 })
  },

  addText() {
    const text = this.data.textInput.trim()
    if (!text) {
      wx.showToast({ title: '请输入文字', icon: 'none' })
      return
    }

    if (this.data.textPanelMode === 'edit' && this.data.editingTextId) {
      const id = this.data.editingTextId
      const elements = this.data.elements.map(el => {
        if (el.id !== id) return el
        return {
          ...el,
          text,
          color: this.data.textColor,
          fontSize: this.data.textSize,
          fontFamily: this.data.textFontFamily,
          height: Math.max(el.height || 0, this.data.textSize * 2)
        }
      })
      const selectedElement = elements.find(el => el.id === id) || null
      this.setData({
        elements,
        selectedId: id,
        selectedElement,
        showTextPanel: false,
        textInput: '',
        editingTextId: '',
        textPanelMode: 'add'
      })
      this.pushHistory()
      this.renderCanvas()
      return
    }

    const maxZ = this._getMaxZIndex()
    const newEl = {
      id: 'el_' + Date.now(),
      type: 'text',
      text: text,
      color: this.data.textColor,
      fontSize: this.data.textSize,
      fontFamily: this.data.textFontFamily,
      x: canvasWidth / 2,
      y: canvasHeight / 2,
      width: 300,
      height: this.data.textSize * 2,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: maxZ + 1
    }
    const elements = [...this.data.elements, newEl]
    this.setData({ elements, selectedId: newEl.id, selectedElement: newEl, showTextPanel: false, textInput: '', editingTextId: '', textPanelMode: 'add' })
    this.pushHistory()
    this.renderCanvas()
  },

  deleteSelected() {
    const { selectedId, elements } = this.data
    if (!selectedId) return
    const el = this._getSelectedElement()
    if (el && el.locked) {
      wx.showToast({ title: '已锁定，先解锁再删除', icon: 'none', duration: 1000 })
      return
    }
    const newElements = elements.filter(el => el.id !== selectedId)
    this.setData({ elements: newElements, selectedId: null, selectedElement: null })
    this.pushHistory()
    this.renderCanvas()
    wx.showToast({ title: '已删除', icon: 'none', duration: 800 })
  },

  duplicateSelected() {
    const el = this._getSelectedElement()
    if (!el) return
    const maxZ = this._getMaxZIndex()
    const newEl = {
      ...JSON.parse(JSON.stringify(el)),
      id: 'el_' + Date.now(),
      x: el.x + 30,
      y: el.y + 30,
      zIndex: maxZ + 1
    }
    const elements = [...this.data.elements, newEl]
    this.setData({ elements, selectedId: newEl.id, selectedElement: newEl })
    this.pushHistory()
    this.renderCanvas()
    wx.showToast({ title: '已复制', icon: 'none', duration: 800 })
  },

  bringToFront() {
    const el = this._getSelectedElement()
    if (!el) return
    const maxZ = this._getMaxZIndex()
    this._updateElement(el.id, { zIndex: maxZ + 1 })
    this.pushHistory()
    this.renderCanvas()
  },

  sendToBack() {
    const el = this._getSelectedElement()
    if (!el) return
    const minZ = Math.min(0, ...this.data.elements.map(e => e.zIndex || 0))
    this._updateElement(el.id, { zIndex: minZ - 1 })
    this.pushHistory()
    this.renderCanvas()
  },

  toggleSelectedLock() {
    const el = this._getSelectedElement()
    if (!el) return
    this._updateElement(el.id, { locked: !el.locked })
    this.pushHistory()
    this.renderCanvas()
    wx.showToast({ title: el.locked ? '已解锁' : '已锁定', icon: 'none', duration: 800 })
  },

  setSelectedEffect(e) {
    const el = this._getSelectedElement()
    if (!el || el.type !== 'image') return
    if (el.locked) {
      wx.showToast({ title: '已锁定，先解锁再修改', icon: 'none', duration: 1000 })
      return
    }
    const effect = e.currentTarget.dataset.effect || 'none'
    this._updateElement(el.id, { effect })
    this.pushHistory()
    this.renderCanvas()
  },

  openSelectedTextEditor() {
    const el = this._getSelectedElement()
    if (!el || el.type !== 'text') return
    this.setData({
      showTextPanel: true,
      showBgPanel: false,
      showStickerPanel: false,
      showTemplatePanel: false,
      showDecorationPanel: false,
      textPanelMode: 'edit',
      editingTextId: el.id,
      textInput: el.text || '',
      textColor: el.color || this.data.textColor,
      textSize: el.fontSize || this.data.textSize,
      textFontFamily: el.fontFamily || this.data.textFontFamily
    })
  },

  _getElementStylePayload(el) {
    if (!el) return null
    if (el.type === 'image') {
      return { type: 'image', style: { effect: el.effect || 'none' } }
    }
    if (el.type === 'text') {
      return {
        type: 'text',
        style: {
          color: el.color || this.data.textColor,
          fontSize: el.fontSize || this.data.textSize,
          fontFamily: el.fontFamily || this.data.textFontFamily
        }
      }
    }
    if (el.type === 'decoration') {
      const style = {}
      ;['color', 'bgColor', 'borderColor', 'style'].forEach(key => {
        if (el[key] !== undefined) style[key] = el[key]
      })
      return { type: 'decoration', style }
    }
    return null
  },

  copySelectedStyle() {
    const el = this._getSelectedElement()
    const payload = this._getElementStylePayload(el)
    if (!payload) {
      wx.showToast({ title: '当前元素没有可复制样式', icon: 'none', duration: 1000 })
      return
    }
    this.copiedElementStyle = payload
    this.setData({ copiedStyleType: payload.type })
    wx.showToast({ title: '已复制样式', icon: 'none', duration: 800 })
  },

  pasteSelectedStyle() {
    const el = this._getSelectedElement()
    const payload = this.copiedElementStyle
    if (!el || !payload) {
      wx.showToast({ title: '暂无可粘贴样式', icon: 'none', duration: 1000 })
      return
    }
    if (el.locked) {
      wx.showToast({ title: '已锁定，先解锁再粘贴', icon: 'none', duration: 1000 })
      return
    }
    if (payload.type !== el.type) {
      wx.showToast({ title: '样式类型不匹配', icon: 'none', duration: 1000 })
      return
    }
    this._updateElement(el.id, payload.style)
    this.pushHistory()
    this.renderCanvas()
    wx.showToast({ title: '已粘贴样式', icon: 'none', duration: 800 })
  },

  openSelectedMoreMenu() {
    const el = this._getSelectedElement()
    if (!el) return
    const actions = [
      { label: '复制样式', fn: () => this.copySelectedStyle() },
      { label: '粘贴样式', fn: () => this.pasteSelectedStyle() }
    ]
    if (el.type === 'image') {
      actions.push(
        { label: '无效果', fn: () => this.setSelectedEffect({ currentTarget: { dataset: { effect: 'none' } } }) },
        { label: '白边', fn: () => this.setSelectedEffect({ currentTarget: { dataset: { effect: 'white-border' } } }) },
        { label: '纸贴', fn: () => this.setSelectedEffect({ currentTarget: { dataset: { effect: 'paper' } } }) },
        { label: '阴影', fn: () => this.setSelectedEffect({ currentTarget: { dataset: { effect: 'shadow' } } }) }
      )
    }
    wx.showActionSheet({
      itemList: actions.map(item => item.label),
      success: (res) => {
        const action = actions[res.tapIndex]
        if (action) action.fn()
      }
    })
  },

  // ==================== 历史记录 ====================
  pushHistory() {
    const state = JSON.parse(JSON.stringify(this.data.elements))
    this.history = this.history.slice(0, this.historyIndex + 1)
    this.history.push(state)
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }
    this.historyIndex = this.history.length - 1
    this.updateHistoryState()
    // 每次操作后自动保存到本地存储
    this.savePage()
  },

  undo() {
    if (this.historyIndex <= 0) return
    this.historyIndex--
    const elements = JSON.parse(JSON.stringify(this.history[this.historyIndex]))
    this.setData({ elements, selectedId: null, selectedElement: null })
    this.updateHistoryState()
    this.savePage()
    this.renderCanvas()
  },

  redo() {
    if (this.historyIndex >= this.history.length - 1) return
    this.historyIndex++
    const elements = JSON.parse(JSON.stringify(this.history[this.historyIndex]))
    this.setData({ elements, selectedId: null, selectedElement: null })
    this.updateHistoryState()
    this.savePage()
    this.renderCanvas()
  },

  updateHistoryState() {
    this.setData({
      canUndo: this.historyIndex > 0,
      canRedo: this.historyIndex < this.history.length - 1
    })
  },

  // ==================== 背景 ====================
  onChangeBackground(e) {
    const color = e.currentTarget.dataset.color
    this.setData({ background: color })
    this.savePage()
    this.renderCanvas()
  },

  onChangePattern(e) {
    const pattern = e.currentTarget.dataset.pattern
    this.setData({ bgPattern: pattern })
    this.savePage()
    this.renderCanvas()
  },

  // ==================== 模板 ====================
  onTapTemplate(e) {
    const templateId = e.currentTarget.dataset.id
    const tmpl = templateUtil.getTemplateById(templateId)
    if (!tmpl) return

    wx.showModal({
      title: '应用模板',
      content: '使用模板会替换当前页面内容，确定吗？',
      success: (res) => {
        if (res.confirm) {
          const elements = (tmpl.elements || []).map((el, i) => ({
            ...el,
            id: 'el_' + Date.now() + '_' + i,
            width: el.width || 100,
            height: el.height || 100,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            zIndex: i
          }))
          this.setData({
            elements,
            background: tmpl.background || '#FFFFFF',
            selectedId: null,
            selectedElement: null,
            showTemplatePanel: false
          })
          this.pushHistory()
          this.renderCanvas()
          wx.showToast({ title: '已应用模板', icon: 'none' })
        }
      }
    })
  },

  onTemplateCategory(e) {
    const cat = e.currentTarget.dataset.category
    this.setData({
      activeTemplateCategory: cat,
      templates: templateUtil.getTemplates(cat)
    })
  },

  // ==================== 保存与导出 ====================
  _saveTimer: null,
  savePage() {
    // 防抖：500ms 内多次保存只执行最后一次
    if (this._saveTimer) clearTimeout(this._saveTimer)
    this._saveTimer = setTimeout(() => {
      const { pageId, elements, background, bgPattern } = this.data
      if (pageId) {
        storage.updatePage(pageId, { elements, background, bgPattern })
        this.setData({ isSaving: true })
        setTimeout(() => this.setData({ isSaving: false }), 800)
      }
    }, 500)
  },

  onTapAction(e) {
    const action = e.currentTarget.dataset.action
    switch (action) {
      case 'undo': this.undo(); break
      case 'redo': this.redo(); break
      case 'save':
        this._syncSave()
        wx.showToast({ title: '已保存', icon: 'none' })
        break
      case 'export': this.exportImage(); break
      case 'layers': this.showLayerPanel(); break
    }
  },

  exportImage() {
    // 取消选中以获得干净的导出
    this.setData({ selectedId: null, selectedElement: null })
    this._syncSave()
    this.renderCanvas()

    // 等待渲染完成（使用双帧确保绘制完成）
    setTimeout(() => {
      if (!canvasNode) return
      wx.canvasToTempFilePath({
        canvas: canvasNode,
        success: (res) => {
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.showToast({ title: '已保存到相册', icon: 'none' })
            },
            fail: (err) => {
              if (err.errMsg && err.errMsg.indexOf('auth deny') !== -1) {
                wx.showModal({
                  title: '需要授权',
                  content: '请在设置中允许保存到相册',
                  success: (res) => {
                    if (res.confirm) wx.openSetting()
                  }
                })
              } else {
                wx.showToast({ title: '保存失败', icon: 'none' })
              }
            }
          })
        },
        fail: (err) => {
          console.error('导出失败', err)
          wx.showToast({ title: '导出失败', icon: 'none' })
        }
      })
    }, 500)
  },

  showLayerPanel() {
    const { elements } = this.data
    if (elements.length === 0) {
      wx.showToast({ title: '还没有元素哦', icon: 'none' })
      return
    }
    const sorted = [...elements].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
    const names = sorted.map(el => {
      if (el.type === 'text') return `文字 ${el.text.substring(0, 8)}`
      if (el.type === 'sticker') return el.src
      if (el.type === 'decoration') return '装饰'
      return '素材'
    })
    wx.showActionSheet({
      itemList: names,
      success: (res) => {
        const el = sorted[res.tapIndex]
        if (el) {
          this.setData({ selectedId: el.id, selectedElement: el })
          this.renderCanvas()
        }
      }
    })
  },

  // ==================== 面板切换 ====================
  toggleBgPanel() {
    this.setData({ showBgPanel: !this.data.showBgPanel, showStickerPanel: false, showTextPanel: false, showTemplatePanel: false, showDecorationPanel: false })
  },
  toggleStickerPanel() {
    this.setData({ showStickerPanel: !this.data.showStickerPanel, showBgPanel: false, showTextPanel: false, showTemplatePanel: false, showDecorationPanel: false })
  },
  toggleTextPanel() {
    const opening = !this.data.showTextPanel
    const selectedText = opening && this.data.selectedElement && this.data.selectedElement.type === 'text'
      ? this.data.selectedElement
      : null
    this.setData({
      showTextPanel: opening,
      showBgPanel: false,
      showStickerPanel: false,
      showTemplatePanel: false,
      showDecorationPanel: false,
      textPanelMode: selectedText ? 'edit' : 'add',
      editingTextId: selectedText ? selectedText.id : '',
      textInput: selectedText ? selectedText.text || '' : '',
      textColor: selectedText ? selectedText.color || this.data.textColor : this.data.textColor,
      textSize: selectedText ? selectedText.fontSize || this.data.textSize : this.data.textSize,
      textFontFamily: selectedText ? selectedText.fontFamily || this.data.textFontFamily : this.data.textFontFamily
    })
  },
  toggleTemplatePanel() {
    this.setData({ showTemplatePanel: !this.data.showTemplatePanel, showBgPanel: false, showStickerPanel: false, showTextPanel: false, showDecorationPanel: false })
  },
  toggleDecorationPanel() {
    this.setData({ showDecorationPanel: !this.data.showDecorationPanel, showBgPanel: false, showStickerPanel: false, showTextPanel: false, showTemplatePanel: false })
  },
  closeAllPanels() {
    this.setData({ showBgPanel: false, showStickerPanel: false, showTextPanel: false, showTemplatePanel: false, showDecorationPanel: false, editingTextId: '', textPanelMode: 'add' })
  },

  onTextInput(e) { this.setData({ textInput: e.detail.value }) },
  onTextColor(e) { this.setData({ textColor: e.currentTarget.dataset.color }) },
  onTextSize(e) { this.setData({ textSize: parseInt(e.currentTarget.dataset.size) }) },
  onTextFont(e) { this.setData({ textFontFamily: e.currentTarget.dataset.font }) },

  // ==================== 图片操作 ====================
  addFromAlbum() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath
        this._addImageElement(tempPath)
      }
    })
  },

  addFromCamera() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath
        this._addImageElement(tempPath)
      }
    })
  },

  _addImageElement(src) {
    fileUtil.persistFile(src).then(savedSrc => {
      this._addSavedImageElement(savedSrc)
    }).catch(err => {
      console.error('保存图片失败', err)
      wx.showToast({ title: '保存图片失败', icon: 'none' })
    })
  },

  _addSavedImageElement(src) {
    // 预加载图片以获取尺寸
    if (canvasNode) {
      loadImage(src, canvasNode).then(entry => {
        const maxZ = this._getMaxZIndex()
        // 根据图片宽高比调整元素大小
        let w = 250, h = 250
        if (entry.width && entry.height) {
          const ratio = entry.width / entry.height
          if (ratio > 1) {
            w = 300; h = 300 / ratio
          } else {
            w = 300 * ratio; h = 300
          }
        }
        w = Math.max(80, Math.min(500, w))
        h = Math.max(80, Math.min(700, h))

        const newEl = {
          id: 'el_' + Date.now(),
          type: 'image',
          src: src,
          x: canvasWidth / 2,
          y: canvasHeight / 2,
          width: w,
          height: h,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: maxZ + 1
        }
        const elements = [...this.data.elements, newEl]
        this.setData({ elements, selectedId: newEl.id, selectedElement: newEl })
        this.pushHistory()
        this.renderCanvas()
      }).catch(() => {
        // 加载失败时使用默认尺寸
        const maxZ = this._getMaxZIndex()
        const newEl = {
          id: 'el_' + Date.now(),
          type: 'image',
          src: src,
          x: canvasWidth / 2,
          y: canvasHeight / 2,
          width: 250,
          height: 250,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: maxZ + 1
        }
        const elements = [...this.data.elements, newEl]
        this.setData({ elements, selectedId: newEl.id, selectedElement: newEl })
        this.pushHistory()
        this.renderCanvas()
      })
    }
  },

  stopPropagation() {},

  onTapBack() {
    this.savePage()
    wx.navigateBack()
  },

  // ========== 页面导航（小圆点） ==========
  onTapPageDot(e) {
    const targetIndex = parseInt(e.currentTarget.dataset.index)
    const { bookPages, currentPageIndex, bookId } = this.data
    if (targetIndex === currentPageIndex || !bookPages[targetIndex]) return

    // 同步保存（不用防抖），避免页面销毁后定时器触发
    this._syncSave()

    const targetPageId = bookPages[targetIndex].id
    const modeParam = this.data.editorMode === 'preview' ? '&mode=preview' : ''
    wx.redirectTo({
      url: `/pages/editor/editor?bookId=${bookId}&pageId=${targetPageId}${modeParam}`
    })
  },

  addNewPage() {
    this._syncSave()
    const { bookId } = this.data
    const newPage = storage.createPage(bookId)
    wx.redirectTo({
      url: `/pages/editor/editor?bookId=${bookId}&pageId=${newPage.id}`
    })
  },

  toggleEditorMode() {
    const nextMode = this.data.editorMode === 'edit' ? 'preview' : 'edit'
    this.closeAllPanels()
    if (nextMode === 'preview') {
      this._syncSave()
      this.setData({ selectedId: null, selectedElement: null })
    }
    this.setData({ editorMode: nextMode, flipClass: '' })
    this._resetPreviewFlip()
    this.renderCanvas()
  },

  onPreviewTouchStart(e) {
    if (this.data.editorMode !== 'preview') return
    this._previewTouchX = e.touches && e.touches[0] ? e.touches[0].clientX : 0
    this._previewTouchY = e.touches && e.touches[0] ? e.touches[0].clientY : 0
    this._resetPreviewFlip()
  },

  onPreviewTouchMove(e) {
    if (this.data.editorMode !== 'preview') return
    const touch = e.touches && e.touches[0]
    if (!touch) return
    const dx = touch.clientX - (this._previewTouchX || touch.clientX)
    const dy = touch.clientY - (this._previewTouchY || touch.clientY)
    if (Math.abs(dy) > Math.abs(dx) * 1.2) return

    const direction = dx < 0 ? 'next' : 'prev'
    const targetIndex = direction === 'next' ? this.data.currentPageIndex + 1 : this.data.currentPageIndex - 1
    if (!this.data.bookPages[targetIndex]) {
      this._resetPreviewFlip()
      return
    }

    const progress = Math.min(0.96, Math.max(0.02, Math.abs(dx) / 240))
    this._setPreviewFlip(progress, direction, 'dragging')
  },

  onPreviewTouchEnd(e) {
    if (this.data.editorMode !== 'preview') return
    const endX = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : 0
    const dx = endX - (this._previewTouchX || endX)
    if (Math.abs(dx) < 50 || this.data.flipProgress < 0.18) {
      this._resetPreviewFlip()
      return
    }

    const { bookPages, currentPageIndex, bookId } = this.data
    const targetIndex = dx < 0 ? currentPageIndex + 1 : currentPageIndex - 1
    if (!bookPages[targetIndex]) {
      this._resetPreviewFlip()
      return
    }

    this._syncSave()
    const direction = dx < 0 ? 'next' : 'prev'
    this._setPreviewFlip(1, direction, 'flipping')
    setTimeout(() => {
      wx.redirectTo({
        url: `/pages/editor/editor?bookId=${bookId}&pageId=${bookPages[targetIndex].id}&mode=preview`
      })
    }, 360)
  },

  _setPreviewFlip(progress, direction, state) {
    const signed = direction === 'next' ? -1 : 1
    const rotate = signed * (12 + 152 * progress)
    const skew = signed * (4 + 8 * progress)
    const translate = signed * (8 + 24 * progress)
    const shadow = Math.min(0.62, 0.14 + progress * 0.5)
    this.setData({
      flipState: state,
      flipDirection: direction,
      flipProgress: progress,
      flipTransform: `perspective(1200rpx) translateX(${translate}rpx) rotateY(${rotate}deg) skewY(${skew}deg)`,
      flipShadowOpacity: shadow
    })
  },

  _resetPreviewFlip() {
    this.setData({
      flipState: 'idle',
      flipProgress: 0,
      flipTransform: 'perspective(1200rpx) rotateY(0deg) skewY(0deg)',
      flipShadowOpacity: 0
    })
  },

  // 同步保存（无防抖），用于页面跳转前
  _syncSave() {
    if (this._saveTimer) clearTimeout(this._saveTimer)
    const { pageId, elements, background, bgPattern } = this.data
    if (pageId) storage.updatePage(pageId, { elements, background, bgPattern })
  }
})
