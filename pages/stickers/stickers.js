// pages/stickers/stickers.js - sticker library
const storage = require('../../utils/storage')
const fileUtil = require('../../utils/file')

Page({
  data: {
    categories: [
      { key: 'all', name: '全部' },
      { key: 'upload', name: '我的上传' },
      { key: 'ai_extract', name: 'AI 提取' },
      { key: 'favorite', name: '收藏' }
    ],
    activeCategory: 'all',
    sortBy: 'newest', // newest, oldest, name
    stickers: [],
    filteredStickers: [],
    colLeft: [],
    colRight: [],
    isEmpty: true,
    isEditing: false,
    showPreview: false,
    previewSticker: null,
    selectedStickerId: null,
    showBookPicker: false,
    books: []
  },

  onShow() {
    this.loadStickers()
  },

  loadStickers() {
    const stickers = storage.getStickers()
    this.setData({ stickers })
    this.filterStickers()
  },

  filterStickers() {
    const { stickers, activeCategory, sortBy } = this.data
    let filtered = stickers
    if (activeCategory === 'favorite') {
      filtered = stickers.filter(s => s.isFavorite)
    } else if (activeCategory !== 'all') {
      filtered = stickers.filter(s => s.category === activeCategory)
    }

    // 排序
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'newest') return (b.createdAt || 0) - (a.createdAt || 0)
      if (sortBy === 'oldest') return (a.createdAt || 0) - (b.createdAt || 0)
      if (sortBy === 'name') return (a.src || '').localeCompare(b.src || '')
      return 0
    })

    // 瀑布流分列：奇数左列，偶数右列
    const colLeft = filtered.filter((_, i) => i % 2 === 0)
    const colRight = filtered.filter((_, i) => i % 2 === 1)

    this.setData({
      filteredStickers: filtered,
      colLeft,
      colRight,
      isEmpty: filtered.length === 0
    })
  },

  onTapSort() {
    const sortOptions = ['newest', 'oldest', 'name']
    const sortLabels = ['最新上传', '最早上传', '按名称']
    const currentIndex = sortOptions.indexOf(this.data.sortBy)

    wx.showActionSheet({
      itemList: sortLabels,
      success: (res) => {
        this.setData({ sortBy: sortOptions[res.tapIndex] })
        this.filterStickers()
      }
    })
  },

  onTapCategory(e) {
    this.setData({ activeCategory: e.currentTarget.dataset.key })
    this.filterStickers()
  },

  onTapSticker(e) {
    const id = e.currentTarget.dataset.id
    // 点击已选中的贴纸取消选中
    if (this.data.selectedStickerId === id) {
      this.setData({ selectedStickerId: null })
      return
    }
    this.setData({ selectedStickerId: id })
  },

  onTapStickerPreview(e) {
    const id = e.currentTarget.dataset.id
    const sticker = this.data.stickers.find(s => s.id === id)
    if (sticker) {
      this.setData({ showPreview: true, previewSticker: sticker })
    }
  },

  // 快速操作
  quickDelete(e) {
    const id = e.currentTarget.dataset.id
    this.deleteSticker(id, () => this.setData({ selectedStickerId: null }))
  },

  quickToggleFavorite(e) {
    const id = e.currentTarget.dataset.id
    storage.toggleFavorite(id)
    this.loadStickers()
  },

  quickAddToBook(e) {
    const id = e.currentTarget.dataset.id
    const books = storage.getBooks()
    if (books.length === 0) {
      wx.showToast({ title: '还没有手账本', icon: 'none' })
      return
    }
    if (books.length === 1) {
      this._addStickerToBook(id, books[0].id)
      return
    }
    this.setData({ showBookPicker: true, books, selectedStickerId: id })
  },

  onPickBook(e) {
    const bookId = e.currentTarget.dataset.bookId
    const stickerId = this.data.selectedStickerId
    this.setData({ showBookPicker: false })
    if (stickerId && bookId) {
      this._addStickerToBook(stickerId, bookId)
    }
  },

  closeBookPicker() {
    this.setData({ showBookPicker: false })
  },

  _addStickerToBook(stickerId, bookId) {
    const sticker = this.data.stickers.find(s => s.id === stickerId)
    if (!sticker) return

    const pages = storage.getPages(bookId)
    let targetPage
    if (pages.length > 0) {
      targetPage = pages[pages.length - 1]
    } else {
      targetPage = storage.createPage(bookId)
    }

    // 在目标页添加贴纸元素
    const page = storage.getPageById(targetPage.id)
    if (!page) return

    const maxZ = Math.max(0, ...(page.elements || []).map(el => el.zIndex || 0))
    const newEl = {
      id: 'el_' + Date.now(),
      type: 'image',
      src: sticker.src,
      x: 345,
      y: 460,
      width: 200,
      height: 200,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      effect: sticker.effect || 'none',
      zIndex: maxZ + 1
    }

    const elements = [...(page.elements || []), newEl]
    storage.updatePage(targetPage.id, { elements })

    wx.showToast({ title: '已添加到手账本', icon: 'none' })
    this.setData({ selectedStickerId: null })
  },

  closePreview() {
    this.setData({ showPreview: false, previewSticker: null })
  },

  refreshPreview(stickerId) {
    const stickers = storage.getStickers()
    const previewSticker = stickers.find(s => s.id === stickerId) || null
    this.setData({ stickers, previewSticker })
    this.filterStickers()
  },

  toggleFavorite(e) {
    const id = typeof e === 'string' ? e : e.currentTarget.dataset.id
    storage.toggleFavorite(id)
    this.loadStickers()
  },

  previewToggleFavorite() {
    const { previewSticker } = this.data
    if (!previewSticker) return
    storage.toggleFavorite(previewSticker.id)
    this.refreshPreview(previewSticker.id)
  },

  onTapEdit() {
    this.setData({ isEditing: !this.data.isEditing })
  },

  deleteSticker(id, afterDelete) {
    wx.showModal({
      title: '删除贴纸',
      content: '确定要删除这张贴纸吗？',
      confirmText: '删除',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (!res.confirm) return
        storage.deleteSticker(id)
        this.loadStickers()
        afterDelete && afterDelete()
        wx.showToast({ title: '已删除', icon: 'none' })
      }
    })
  },

  onTapDelete(e) {
    this.deleteSticker(e.currentTarget.dataset.id)
  },

  previewDelete() {
    const { previewSticker } = this.data
    if (!previewSticker) return
    this.deleteSticker(previewSticker.id, () => this.closePreview())
  },

  previewCopyTags() {
    const { previewSticker } = this.data
    const tags = previewSticker && previewSticker.tags ? previewSticker.tags : []
    if (tags.length === 0) {
      wx.showToast({ title: '没有标签', icon: 'none' })
      return
    }

    wx.setClipboardData({
      data: tags.join(', '),
      success: () => wx.showToast({ title: '已复制标签', icon: 'none' })
    })
  },

  onTapAdd() {
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        wx.showLoading({ title: '保存中...' })
        let savedCount = 0

        for (const file of res.tempFiles) {
          try {
            const savedPath = await fileUtil.persistFile(file.tempFilePath)
            // 获取图片真实尺寸
            let originalWidth = 0, originalHeight = 0
            try {
              const info = await new Promise((resolve, reject) => {
                wx.getImageInfo({
                  src: file.tempFilePath,
                  success: resolve,
                  fail: reject
                })
              })
              originalWidth = info.width
              originalHeight = info.height
            } catch (e) {
              // 获取尺寸失败，使用默认值
            }

            storage.saveSticker({
              src: savedPath,
              category: 'upload',
              source: 'upload',
              tags: ['上传', '贴纸'],
              originalWidth,
              originalHeight
            })
            savedCount++
          } catch (err) {
            console.error('[stickers] save failed:', err)
          }
        }

        wx.hideLoading()
        this.loadStickers()
        wx.showToast({ title: `已添加 ${savedCount} 张`, icon: 'none' })
      }
    })
  },

  stopPropagation() {}
})
