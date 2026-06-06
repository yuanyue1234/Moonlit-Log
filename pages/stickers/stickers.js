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
    stickers: [],
    filteredStickers: [],
    isEmpty: true,
    isEditing: false,
    showPreview: false,
    previewSticker: null
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
    const { stickers, activeCategory } = this.data
    let filtered = stickers
    if (activeCategory === 'favorite') {
      filtered = stickers.filter(s => s.isFavorite)
    } else if (activeCategory !== 'all') {
      filtered = stickers.filter(s => s.category === activeCategory)
    }

    this.setData({
      filteredStickers: filtered,
      isEmpty: filtered.length === 0
    })
  },

  onTapCategory(e) {
    this.setData({ activeCategory: e.currentTarget.dataset.key })
    this.filterStickers()
  },

  onTapSticker(e) {
    const id = e.currentTarget.dataset.id
    if (this.data.isEditing) {
      this.toggleFavorite(id)
      return
    }

    const sticker = this.data.stickers.find(s => s.id === id)
    if (sticker) {
      this.setData({ showPreview: true, previewSticker: sticker })
    }
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
            storage.saveSticker({
              src: savedPath,
              category: 'upload',
              source: 'upload',
              tags: ['上传', '贴纸']
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
