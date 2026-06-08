/**
 * storage.js - 数据存储管理
 * 所有本地数据的增删改查
 */

const themeUtil = require('./theme')

const STORAGE_KEYS = {
  BOOKS: 'journal_books',
  PAGES: 'journal_pages',
  STICKERS: 'sticker_assets',
  THEMES: 'journal_themes',
  SETTINGS: 'app_settings',
  GROUPS: 'collectible_groups'
}

// ========== 分组管理 ==========

function getGroups() {
  return wx.getStorageSync(STORAGE_KEYS.GROUPS) || []
}

function saveGroups(groups) {
  wx.setStorageSync(STORAGE_KEYS.GROUPS, groups)
}

function addGroup(name) {
  if (!name || !name.trim()) return null
  const groups = getGroups()
  const trimmed = name.trim()
  if (groups.includes(trimmed)) return trimmed
  const updated = [...groups, trimmed]
  saveGroups(updated)
  return trimmed
}

function deleteGroup(name) {
  const groups = getGroups()
  saveGroups(groups.filter(g => g !== name))
}

// ========== 手账本管理 ==========

function getBooks() {
  return wx.getStorageSync(STORAGE_KEYS.BOOKS) || []
}

function saveBooks(books) {
  wx.setStorageSync(STORAGE_KEYS.BOOKS, books)
}

function getBookById(bookId) {
  const books = getBooks()
  return books.find(b => b.id === bookId) || null
}

function createBook(data) {
  const books = getBooks()
  const newBook = {
    id: generateId(),
    name: data.name || '新手账本',
    cover: data.cover || 'default',
    coverImage: data.coverImage || '',
    theme: data.theme || 'cream',
    tags: data.tags || [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pages: []
  }
  books.push(newBook)
  saveBooks(books)

  const coverPage = ensureCoverPage(newBook.id)
  newBook.pages = [coverPage.id]
  return newBook
}

function updateBook(bookId, data) {
  const books = getBooks()
  const index = books.findIndex(b => b.id === bookId)
  if (index === -1) return null
  books[index] = { ...books[index], ...data, updatedAt: Date.now() }
  saveBooks(books)
  if (['name', 'theme', 'tags'].some(key => Object.prototype.hasOwnProperty.call(data, key))) {
    refreshCoverPage(bookId)
    return getBookById(bookId)
  }
  return books[index]
}

function deleteBook(bookId) {
  let books = getBooks()
  books = books.filter(b => b.id !== bookId)
  saveBooks(books)
  // 同时删除该手账本的所有页面
  deletePagesByBookId(bookId)
}

// ========== 手账页管理 ==========

function getPages(bookId) {
  const allPages = wx.getStorageSync(STORAGE_KEYS.PAGES) || []
  if (!bookId) return allPages

  const book = getBookById(bookId)
  const pages = allPages.filter(p => p.bookId === bookId)
  if (!book || !Array.isArray(book.pages) || book.pages.length === 0) return pages

  const pageMap = new Map(pages.map(page => [page.id, page]))
  const ordered = book.pages.map(id => pageMap.get(id)).filter(Boolean)
  const knownIds = new Set(ordered.map(page => page.id))
  const strayPages = pages.filter(page => !knownIds.has(page.id))
  return [...ordered, ...strayPages]
}

// 批量获取所有手账本的页数（优化N+1查询）
function getBookPageCounts() {
  const allPages = wx.getStorageSync(STORAGE_KEYS.PAGES) || []
  const counts = {}
  allPages.forEach(page => {
    counts[page.bookId] = (counts[page.bookId] || 0) + 1
  })
  return counts
}

function savePages(pages) {
  wx.setStorageSync(STORAGE_KEYS.PAGES, pages)
}

function getPageById(pageId) {
  const allPages = wx.getStorageSync(STORAGE_KEYS.PAGES) || []
  return allPages.find(p => p.id === pageId) || null
}

function withAlpha(hex, alpha) {
  const value = String(hex || '#000000').replace('#', '')
  if (value.length !== 6) return hex || '#000000'
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function getCoverProfile(themeKey) {
  const profiles = {
    cream: { texture: 'watercolor', pattern: 'dots', pageTextures: ['grain', 'watercolor', 'linen'], pagePatterns: ['blank', 'dots', 'lines'], titleY: 230 },
    vintage: { texture: 'kraft', pattern: 'lines', pageTextures: ['kraft', 'grain', 'linen'], pagePatterns: ['lines', 'blank', 'grid'], titleY: 240 },
    korean: { texture: 'grain', pattern: 'dots', pageTextures: ['grain', 'canvas', 'watercolor'], pagePatterns: ['dots', 'blank', 'grid'], titleY: 220 },
    japanese: { texture: 'linen', pattern: 'grid', pageTextures: ['linen', 'grain', 'canvas'], pagePatterns: ['grid', 'blank', 'lines'], titleY: 235 },
    pink: { texture: 'watercolor', pattern: 'dots', pageTextures: ['watercolor', 'grain', 'linen'], pagePatterns: ['dots', 'blank', 'lines'], titleY: 220 },
    ocean: { texture: 'canvas', pattern: 'lines', pageTextures: ['canvas', 'grain', 'watercolor'], pagePatterns: ['lines', 'blank', 'grid'], titleY: 230 },
    coffee: { texture: 'kraft', pattern: 'blank', pageTextures: ['kraft', 'linen', 'grain'], pagePatterns: ['blank', 'lines', 'dots'], titleY: 240 },
    film: { texture: 'linen', pattern: 'grid', pageTextures: ['linen', 'kraft', 'grain'], pagePatterns: ['grid', 'blank', 'lines'], titleY: 235 }
  }
  return profiles[themeKey] || profiles.cream
}

function buildCoverPageElements(book, themeInfo) {
  const tags = (book.tags && book.tags.length > 0 ? book.tags : ['封面', themeInfo.name]).slice(0, 4)
  const profile = getCoverProfile(book.theme)
  const tagStartX = 345 - (tags.length - 1) * 78
  const tagElements = tags.map((tag, i) => ({
    systemRole: 'cover-fixed',
    type: 'decoration',
    subType: 'rect',
    shapeType: 'roundRect',
    x: tagStartX + i * 156,
    y: 640,
    width: 132,
    height: 50,
    fillColor: withAlpha(themeInfo.primary, 0.14),
    strokeColor: themeInfo.primary,
    strokeWidth: 1,
    lineStyle: 'solid',
    borderRadius: 25,
    text: tag,
    textColor: themeInfo.text,
    textFontSize: 20,
    zIndex: 6 + i
  }))

  return [
    {
      systemRole: 'cover-fixed',
      type: 'decoration',
      subType: 'rect',
      shapeType: 'roundRect',
      x: 345,
      y: 460,
      width: 560,
      height: 720,
      fillColor: themeInfo.cardBg,
      strokeColor: themeInfo.primary,
      strokeWidth: 2,
      lineStyle: 'solid',
      borderRadius: 36,
      zIndex: 0
    },
    {
      systemRole: 'cover-fixed',
      type: 'decoration',
      subType: 'rect',
      shapeType: 'roundRect',
      x: 345,
      y: 145,
      width: 420,
      height: 54,
      fillColor: withAlpha(themeInfo.secondary, 0.14),
      strokeColor: themeInfo.secondary,
      strokeWidth: 1,
      lineStyle: 'solid',
      borderRadius: 27,
      text: `主题风格 · ${themeInfo.name}`,
      textColor: themeInfo.text,
      textFontSize: 22,
      zIndex: 2
    },
    {
      systemRole: 'cover-fixed',
      type: 'text',
      x: 345,
      y: profile.titleY,
      width: 470,
      height: 160,
      text: book.name || '新手账本',
      color: themeInfo.text,
      fontSize: 48,
      fontFamily: 'handwriting',
      zIndex: 3
    },
    {
      systemRole: 'cover-fixed',
      type: 'decoration',
      subType: 'line',
      x: 345,
      y: 360,
      width: 380,
      color: themeInfo.primary,
      zIndex: 3
    },
    {
      systemRole: 'cover-fixed',
      type: 'decoration',
      subType: 'rect',
      shapeType: 'roundRect',
      x: 345,
      y: 475,
      width: 430,
      height: 150,
      fillColor: withAlpha(themeInfo.accent, 0.1),
      strokeColor: themeInfo.accent,
      strokeWidth: 1,
      lineStyle: 'dashed',
      borderRadius: 24,
      text: '封面\n标签 + 主题风格',
      textColor: themeInfo.textLight,
      textFontSize: 24,
      zIndex: 4
    },
    {
      systemRole: 'cover-fixed',
      type: 'decoration',
      subType: 'circle',
      x: 145,
      y: 165,
      radius: 30,
      color: themeInfo.primary,
      borderColor: themeInfo.cardBg,
      zIndex: 4
    },
    {
      systemRole: 'cover-fixed',
      type: 'decoration',
      subType: 'circle',
      x: 560,
      y: 760,
      radius: 40,
      color: themeInfo.secondary,
      borderColor: themeInfo.cardBg,
      zIndex: 4
    },
    ...tagElements
  ]
}

function buildThemePageElements(book, themeInfo, pageNumber) {
  const variant = Math.max(0, pageNumber - 2) % 3
  const pageLabel = `P.${String(Math.max(1, pageNumber)).padStart(2, '0')}`
  const shared = [
    {
      systemRole: 'theme-fixed',
      type: 'decoration',
      subType: 'rect',
      shapeType: 'roundRect',
      x: 345,
      y: 78,
      width: 560,
      height: 58,
      fillColor: withAlpha(themeInfo.cardBg, 0.72),
      strokeColor: withAlpha(themeInfo.primary, 0.55),
      strokeWidth: 1,
      lineStyle: 'solid',
      borderRadius: 29,
      text: book.name || '手账',
      textColor: themeInfo.textLight,
      textFontSize: 20,
      zIndex: 0
    },
    {
      systemRole: 'theme-fixed',
      type: 'decoration',
      subType: 'rect',
      shapeType: 'roundRect',
      x: 570,
      y: 850,
      width: 110,
      height: 42,
      fillColor: withAlpha(themeInfo.primary, 0.12),
      strokeColor: themeInfo.primary,
      strokeWidth: 1,
      lineStyle: 'solid',
      borderRadius: 21,
      text: pageLabel,
      textColor: themeInfo.text,
      textFontSize: 18,
      zIndex: 0
    }
  ]

  if (variant === 0) {
    return [
      ...shared,
      { systemRole: 'theme-fixed', type: 'decoration', subType: 'line', x: 345, y: 135, width: 520, color: themeInfo.primary, zIndex: 0 },
      { systemRole: 'theme-fixed', type: 'decoration', subType: 'circle', x: 95, y: 130, radius: 16, color: themeInfo.secondary, borderColor: themeInfo.cardBg, zIndex: 0 },
      { systemRole: 'theme-fixed', type: 'decoration', subType: 'circle', x: 625, y: 820, radius: 22, color: themeInfo.accent, borderColor: themeInfo.cardBg, zIndex: 0 }
    ]
  }

  if (variant === 1) {
    return [
      ...shared,
      {
        systemRole: 'theme-fixed',
        type: 'decoration',
        subType: 'rect',
        shapeType: 'roundRect',
        x: 68,
        y: 460,
        width: 26,
        height: 620,
        fillColor: withAlpha(themeInfo.secondary, 0.28),
        strokeColor: 'transparent',
        strokeWidth: 0,
        lineStyle: 'solid',
        borderRadius: 13,
        zIndex: 0
      },
      { systemRole: 'theme-fixed', type: 'decoration', subType: 'circle', x: 622, y: 175, radius: 14, color: themeInfo.primary, borderColor: themeInfo.cardBg, zIndex: 0 },
      { systemRole: 'theme-fixed', type: 'decoration', subType: 'circle', x: 622, y: 225, radius: 10, color: themeInfo.accent, borderColor: themeInfo.cardBg, zIndex: 0 }
    ]
  }

  return [
    ...shared,
    {
      systemRole: 'theme-fixed',
      type: 'decoration',
      subType: 'rect',
      shapeType: 'roundRect',
      x: 345,
      y: 830,
      width: 460,
      height: 34,
      fillColor: withAlpha(themeInfo.accent, 0.14),
      strokeColor: 'transparent',
      strokeWidth: 0,
      lineStyle: 'solid',
      borderRadius: 17,
      zIndex: 0
    },
    { systemRole: 'theme-fixed', type: 'decoration', subType: 'line', x: 345, y: 150, width: 430, color: themeInfo.secondary, zIndex: 0 },
    { systemRole: 'theme-fixed', type: 'decoration', subType: 'circle', x: 120, y: 792, radius: 18, color: themeInfo.primary, borderColor: themeInfo.cardBg, zIndex: 0 }
  ]
}

function normalizePageElements(elements = []) {
  return elements.map((el, index) => {
    const next = { ...el }
    if (!next.id) next.id = `el_${generateId()}_${index}`
    if (next.width === undefined) {
      if (next.type === 'text') next.width = 300
      else if (next.subType === 'line') next.width = next.width || 300
      else if (next.subType === 'circle') next.width = (next.radius || 40) * 2
      else next.width = 100
    }
    if (next.height === undefined) {
      if (next.type === 'text') next.height = (next.fontSize || next.textFontSize || 28) * 2
      else if (next.subType === 'line') next.height = 20
      else if (next.subType === 'circle') next.height = (next.radius || 40) * 2
      else next.height = 100
    }
    if (next.rotation === undefined) next.rotation = 0
    if (next.scaleX === undefined) next.scaleX = 1
    if (next.scaleY === undefined) next.scaleY = 1
    if (next.zIndex === undefined) next.zIndex = index
    return next
  })
}

function buildDefaultPage(book, data = {}) {
  const themeInfo = themeUtil.getTheme(book.theme)
  const profile = getCoverProfile(book.theme)
  const pageNumber = (book.pages || []).length + 1
  const bgList = themeInfo.pageBackgrounds || ['#FFFFFF']
  const textures = profile.pageTextures || ['grain']
  const patterns = profile.pagePatterns || ['blank']

  return {
    background: data.background || bgList[(pageNumber - 1) % bgList.length],
    bgPattern: data.bgPattern || patterns[(pageNumber - 1) % patterns.length],
    bgTexture: data.bgTexture || textures[(pageNumber - 1) % textures.length],
    elements: data.elements || buildThemePageElements(book, themeInfo, pageNumber)
  }
}

function ensureCoverPage(bookId) {
  const pages = getPages(bookId)
  const existingCover = pages.find(page => page.role === 'cover')
  if (existingCover) {
    const books = getBooks()
    const book = books.find(item => item.id === bookId)
    if (book) {
      const mergedIds = [existingCover.id, ...(book.pages || []), ...pages.map(page => page.id)]
      const uniqueIds = Array.from(new Set(mergedIds))
      book.pages = [existingCover.id, ...uniqueIds.filter(id => id !== existingCover.id)]
      saveBooks(books)
    }
    return existingCover
  }

  const coverPage = createPage(bookId, { role: 'cover' })
  const books = getBooks()
  const book = books.find(item => item.id === bookId)
  if (book) {
    const ids = Array.from(new Set([...(book.pages || []), ...pages.map(page => page.id)]))
      .filter(id => id !== coverPage.id)
    book.pages = [coverPage.id, ...ids]
    book.updatedAt = Date.now()
    saveBooks(books)
  }
  return coverPage
}

function refreshCoverPage(bookId) {
  const book = getBookById(bookId)
  if (!book) return null

  const coverPage = ensureCoverPage(bookId)
  const themeInfo = themeUtil.getTheme(book.theme)
  const profile = getCoverProfile(book.theme)
  return updatePage(coverPage.id, {
    role: 'cover',
    background: themeInfo.bg,
    bgPattern: profile.pattern,
    bgTexture: profile.texture,
    elements: normalizePageElements(buildCoverPageElements(book, themeInfo))
  })
}

function createPage(bookId, data = {}) {
  const allPages = wx.getStorageSync(STORAGE_KEYS.PAGES) || []
  const books = getBooks()
  const book = books.find(b => b.id === bookId)
  const shouldBuildCover = data.role === 'cover' && book
  const themeInfo = shouldBuildCover ? themeUtil.getTheme(book.theme) : null
  const coverProfile = shouldBuildCover ? getCoverProfile(book.theme) : null
  const defaultPage = !shouldBuildCover && book ? buildDefaultPage(book, data) : null
  const newPage = {
    id: generateId(),
    bookId: bookId,
    width: data.width || 690,
    height: data.height || 920,
    background: data.background || (themeInfo ? themeInfo.bg : defaultPage ? defaultPage.background : '#FFFFFF'),
    bgPattern: data.bgPattern || (coverProfile ? coverProfile.pattern : defaultPage ? defaultPage.bgPattern : 'blank'),
    bgTexture: data.bgTexture || (coverProfile ? coverProfile.texture : defaultPage ? defaultPage.bgTexture : 'none'),
    role: data.role || (shouldBuildCover ? 'cover' : 'page'),
    elements: normalizePageElements(data.elements || (shouldBuildCover ? buildCoverPageElements(book, themeInfo) : defaultPage ? defaultPage.elements : [])),
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  allPages.push(newPage)
  savePages(allPages)

  // 更新手账本的页面列表
  if (book) {
    const existingIds = getPages(bookId).map(page => page.id).filter(id => id !== newPage.id)
    book.pages = Array.from(new Set([...(book.pages || []), ...existingIds]))
    book.pages.push(newPage.id)
    book.updatedAt = Date.now()
    saveBooks(books)
  }

  return newPage
}

function updatePage(pageId, data) {
  const allPages = wx.getStorageSync(STORAGE_KEYS.PAGES) || []
  const index = allPages.findIndex(p => p.id === pageId)
  if (index === -1) return null
  allPages[index] = { ...allPages[index], ...data, updatedAt: Date.now() }
  savePages(allPages)
  return allPages[index]
}

function deletePage(pageId) {
  let allPages = wx.getStorageSync(STORAGE_KEYS.PAGES) || []
  const page = allPages.find(p => p.id === pageId)
  if (page) {
    allPages = allPages.filter(p => p.id !== pageId)
    savePages(allPages)
    // 从手账本中移除
    const books = getBooks()
    const book = books.find(b => b.id === page.bookId)
    if (book) {
      book.pages = (book.pages || []).filter(id => id !== pageId)
      book.updatedAt = Date.now()
      saveBooks(books)
    }
  }
}

function deletePagesByBookId(bookId) {
  let allPages = wx.getStorageSync(STORAGE_KEYS.PAGES) || []
  allPages = allPages.filter(p => p.bookId !== bookId)
  savePages(allPages)
}

// ========== 贴纸素材管理 ==========

function getStickers(category) {
  const stickers = wx.getStorageSync(STORAGE_KEYS.STICKERS) || []
  if (category && category !== 'all') {
    return stickers.filter(s => s.category === category)
  }
  return stickers
}

function saveSticker(sticker) {
  const stickers = wx.getStorageSync(STORAGE_KEYS.STICKERS) || []
  const newSticker = {
    id: generateId(),
    src: sticker.src,
    thumb: sticker.thumb || sticker.src,
    category: sticker.category || 'upload',
    tags: sticker.tags || [],
    isFavorite: false,
    source: sticker.source || 'upload',
    style: sticker.style || 'none',
    effect: sticker.effect || 'none',
    labels: sticker.labels || null,
    group: sticker.group || '',
    extractResultId: sticker.extractResultId || '',
    originalWidth: sticker.originalWidth || 0,
    originalHeight: sticker.originalHeight || 0,
    createdAt: Date.now(),
    kind: sticker.kind || 'other',
    activityName: sticker.activityName || '',
    location: sticker.location || '',
    createdAtDate: sticker.createdAtDate || new Date().toISOString().slice(0, 10)
  }
  stickers.unshift(newSticker)
  wx.setStorageSync(STORAGE_KEYS.STICKERS, stickers)
  return newSticker
}

function updateSticker(stickerId, data) {
  const stickers = wx.getStorageSync(STORAGE_KEYS.STICKERS) || []
  const index = stickers.findIndex(s => s.id === stickerId)
  if (index === -1) return null
  stickers[index] = { ...stickers[index], ...data }
  wx.setStorageSync(STORAGE_KEYS.STICKERS, stickers)
  return stickers[index]
}

function deleteSticker(stickerId) {
  let stickers = wx.getStorageSync(STORAGE_KEYS.STICKERS) || []
  const sticker = stickers.find(s => s.id === stickerId)

  // 删除关联的文件
  if (sticker && sticker.src && sticker.src.indexOf(wx.env.USER_DATA_PATH) === 0) {
    try {
      const fs = wx.getFileSystemManager()
      fs.unlinkSync(sticker.src)
    } catch (e) {
      console.warn('删除贴纸文件失败:', sticker.src, e)
    }
  }

  stickers = stickers.filter(s => s.id !== stickerId)
  wx.setStorageSync(STORAGE_KEYS.STICKERS, stickers)
}

function toggleFavorite(stickerId) {
  const stickers = wx.getStorageSync(STORAGE_KEYS.STICKERS) || []
  const sticker = stickers.find(s => s.id === stickerId)
  if (sticker) {
    sticker.isFavorite = !sticker.isFavorite
    wx.setStorageSync(STORAGE_KEYS.STICKERS, stickers)
    return sticker.isFavorite
  }
  return false
}

// ========== 最近手帐本 ==========

function getMostRecentBook() {
  const books = getBooks()
  if (books.length === 0) return null
  return books.reduce((latest, b) => (!latest || (b.updatedAt || 0) > (latest.updatedAt || 0)) ? b : latest, null)
}

// ========== 工具函数 ==========

let _idCounter = 0
function generateId() {
  _idCounter++
  return 'id_' + Date.now().toString(36) + '_' + _idCounter.toString(36) + '_' + Math.random().toString(36).substr(2, 6)
}

function clearAll() {
  wx.clearStorageSync()
}

module.exports = {
  STORAGE_KEYS,
  generateId,
  getBooks, saveBooks, getBookById, createBook, updateBook, deleteBook, getMostRecentBook,
  getPages, savePages, getPageById, createPage, ensureCoverPage, refreshCoverPage, updatePage, deletePage, normalizePageElements,
  getBookPageCounts,
  getStickers, saveSticker, updateSticker, deleteSticker, toggleFavorite,
  getGroups, saveGroups, addGroup, deleteGroup,
  clearAll
}


