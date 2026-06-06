/**
 * storage.js - 数据存储管理
 * 所有本地数据的增删改查
 */

const STORAGE_KEYS = {
  BOOKS: 'journal_books',
  PAGES: 'journal_pages',
  STICKERS: 'sticker_assets',
  THEMES: 'journal_themes',
  SETTINGS: 'app_settings'
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
    theme: data.theme || 'cream',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pages: []
  }
  books.push(newBook)
  saveBooks(books)
  return newBook
}

function updateBook(bookId, data) {
  const books = getBooks()
  const index = books.findIndex(b => b.id === bookId)
  if (index === -1) return null
  books[index] = { ...books[index], ...data, updatedAt: Date.now() }
  saveBooks(books)
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
  return bookId ? allPages.filter(p => p.bookId === bookId) : allPages
}

function savePages(pages) {
  wx.setStorageSync(STORAGE_KEYS.PAGES, pages)
}

function getPageById(pageId) {
  const allPages = wx.getStorageSync(STORAGE_KEYS.PAGES) || []
  return allPages.find(p => p.id === pageId) || null
}

function createPage(bookId, data = {}) {
  const allPages = wx.getStorageSync(STORAGE_KEYS.PAGES) || []
  const newPage = {
    id: generateId(),
    bookId: bookId,
    width: data.width || 690,
    height: data.height || 920,
    background: data.background || '#FFFFFF',
    elements: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  allPages.push(newPage)
  savePages(allPages)

  // 更新手账本的页面列表
  const books = getBooks()
  const book = books.find(b => b.id === bookId)
  if (book) {
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
      book.pages = book.pages.filter(id => id !== pageId)
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
    extractResultId: sticker.extractResultId || '',
    createdAt: Date.now()
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

// ========== 工具函数 ==========

function generateId() {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9)
}

function clearAll() {
  wx.clearStorageSync()
}

module.exports = {
  STORAGE_KEYS,
  getBooks, saveBooks, getBookById, createBook, updateBook, deleteBook,
  getPages, savePages, getPageById, createPage, updatePage, deletePage,
  getStickers, saveSticker, updateSticker, deleteSticker, toggleFavorite,
  clearAll
}
