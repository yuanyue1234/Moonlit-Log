// pages/stickers/stickers.js - sticker library
const storage = require('../../utils/storage')
const fileUtil = require('../../utils/file')

Page({
  data: {
    categories: [
      { key: 'all', name: '全部' },
      { key: 'favorite', name: '收藏' }
    ],
    activeCategory: 'all',
    sortBy: 'newest', // newest, oldest, name
    searchKeyword: '',
    isSearching: false,
    stickers: [],
    filteredStickers: [],
    colLeft: [],
    colRight: [],
    isEmpty: true,
    isEditing: false,
    showPreview: false,
    previewSticker: null,
    showTagEditor: false,
    previewTagInput: '',
    selectedStickerId: null,
    showBookPicker: false,
    books: []
  },

  onShow() {
    this.loadStickers()
  },

  loadCategories(stickers) {
    // 从storage分组设置 + 贴纸实际group字段 合并，确保所有分组都显示
    // 接受外部传入的stickers，避免依赖setData的异步更新
    const list = stickers || this.data.stickers || []
    const savedGroups = storage.getGroups()
    const stickerGroups = [...new Set(list.map(s => s.group).filter(g => g && g.trim()))]
    // 合并去重
    const allGroups = [...new Set([...savedGroups, ...stickerGroups])]
    const categories = [
      { key: 'all', name: '全部' },
      ...allGroups.map(g => ({ key: g, name: g })),
      { key: 'favorite', name: '收藏' }
    ]
    this.setData({ categories })
  },

  loadStickers() {
    try {
      const stickers = storage.getStickers()
      // 先同步调 loadCategories 传入最新stickers，再统一 setData 避免异步竞争
      this.loadCategories(stickers)
      this.setData({ stickers })
      this.filterStickers()
    } catch (err) {
      console.error('[stickers] loadStickers error:', err)
      this.setData({ stickers: [], isEmpty: true })
      wx.showToast({ title: '加载贴纸失败', icon: 'none' })
    }
  },

  filterStickers() {
    const { stickers, activeCategory, sortBy, searchKeyword } = this.data
    let filtered = stickers

    // 搜索优先
    if (searchKeyword && searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase()
      filtered = stickers.filter(s => {
        if (s.tags && s.tags.some(t => t.toLowerCase().indexOf(kw) >= 0)) return true
        if (s.group && s.group.toLowerCase().indexOf(kw) >= 0) return true
        if (s.labels) {
          if (s.labels.mainObject && s.labels.mainObject.toLowerCase().indexOf(kw) >= 0) return true
          if (s.labels.materialType && s.labels.materialType.toLowerCase().indexOf(kw) >= 0) return true
          if (s.labels.tags && s.labels.tags.some(t => t.toLowerCase().indexOf(kw) >= 0)) return true
          if (s.labels.scene && s.labels.scene.toLowerCase().indexOf(kw) >= 0) return true
        }
        if (s.activityName && s.activityName.toLowerCase().indexOf(kw) >= 0) return true
        return false
      })
    } else if (activeCategory === 'favorite') {
      filtered = stickers.filter(s => s.isFavorite)
    } else if (activeCategory !== 'all') {
      filtered = stickers.filter(s => s.group === activeCategory)
    }

    // 排序保持不变
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

  // 搜索方法
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
    this.filterStickers()
  },
  onClearSearch() {
    this.setData({ searchKeyword: '', isSearching: false })
    this.filterStickers()
  },
  onFocusSearch() {
    this.setData({ isSearching: true })
  },
  onBlurSearch() {
    if (!this.data.searchKeyword) {
      this.setData({ isSearching: false })
    }
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

  onAddGroup() {
    wx.showModal({
      title: '添加分组',
      placeholderText: '输入分组名称',
      editable: true,
      success: (res) => {
        if (!res.confirm || !res.content || !res.content.trim()) return
        const name = res.content.trim()
        storage.addGroup(name)
        this.loadStickers()
      }
    })
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
      this.setData({ showPreview: true, previewSticker: sticker, showTagEditor: false, previewTagInput: '' })
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

  quickMoveGroup(e) {
    const id = e.currentTarget.dataset.id
    const sticker = this.data.stickers.find(s => s.id === id)
    if (!sticker) return

    const groups = storage.getGroups()
    if (groups.length === 0) {
      wx.showToast({ title: '还没有分组，请先创建', icon: 'none' })
      return
    }
    // 过滤掉当前所在分组
    const otherGroups = groups.filter(g => g !== sticker.group)
    const itemList = otherGroups.length > 0 ? otherGroups : groups

    wx.showActionSheet({
      itemList,
      success: (res) => {
        const targetGroup = itemList[res.tapIndex]
        storage.updateSticker(id, { group: targetGroup })
        this.loadStickers()
        this.setData({ selectedStickerId: null })
        wx.showToast({ title: '已移动到「' + targetGroup + '」', icon: 'none' })
      }
    })
  },

  closeBookPicker() {
    this.setData({ showBookPicker: false })
  },

  quickMakeJournal(e) {
    const id = e.currentTarget.dataset.id
    const sticker = this.data.stickers.find(s => s.id === id)
    if (!sticker) return

    const books = storage.getBooks()
    if (books.length === 0) {
      wx.showToast({ title: '还没有手帐本', icon: 'none' })
      return
    }
    if (books.length === 1) {
      this._makeJournal(id, books[0].id)
      return
    }
    this.setData({ showBookPicker: true, books, selectedStickerId: id })
  },

  _makeJournal(stickerId, bookId) {
    wx.navigateTo({
      url: `/pages/editor/editor?bookId=${bookId}&stickerId=${encodeURIComponent(stickerId)}&fromCollect=1`
    })
    this.setData({ selectedStickerId: null })
  },

  closePreview() {
    this.setData({ showPreview: false, previewSticker: null, showTagEditor: false, previewTagInput: '' })
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

  previewMakeJournal() {
    const { previewSticker } = this.data
    if (!previewSticker) return
    const books = storage.getBooks()
    if (books.length === 0) {
      wx.showToast({ title: '还没有手帐本', icon: 'none' })
      return
    }
    if (books.length === 1) {
      this.closePreview()
      this._makeJournal(previewSticker.id, books[0].id)
      return
    }
    this.setData({ showBookPicker: true, books, selectedStickerId: previewSticker.id })
  },

  onTapEdit() {
    const next = !this.data.isEditing
    this.setData({
      isEditing: next,
      selectedStickerId: null  // 进出编辑模式清除选中
    })
  },

  onPickBook(e) {
    const bookId = e.currentTarget.dataset.bookId
    const stickerId = this.data.selectedStickerId
    this.setData({ showBookPicker: false })
    if (stickerId && bookId) {
      this._makeJournal(stickerId, bookId)
    }
  },

  // 编辑模式下删除分组（无需确认）
  onDeleteGroup(e) {
    const name = e.currentTarget.dataset.name
    if (!name) return
    storage.deleteGroup(name)
    this.loadStickers()
  },

  // 编辑模式下删除贴纸（无需确认，立即删除）
  editDeleteSticker(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    storage.deleteSticker(id)
    this.loadStickers()
    wx.showToast({ title: '已删除', icon: 'none' })
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

  previewAddTag() {
    const { previewSticker, showTagEditor } = this.data
    if (!previewSticker) return
    this.setData({ showTagEditor: !showTagEditor, previewTagInput: '' })
  },

  onPreviewTagInput(e) {
    this.setData({ previewTagInput: e.detail.value })
  },

  confirmPreviewAddTag() {
    const { previewSticker, previewTagInput } = this.data
    if (!previewSticker) return
    const tag = (previewTagInput || '').trim()
    if (!tag) {
      wx.showToast({ title: '请输入标签', icon: 'none' })
      return
    }

    const tags = previewSticker.tags || []
    if (tags.includes(tag)) {
      wx.showToast({ title: '标签已存在', icon: 'none' })
      return
    }

    const updated = storage.updateSticker(previewSticker.id, {
      tags: [...tags, tag]
    })
    if (!updated) {
      wx.showToast({ title: '添加失败', icon: 'none' })
      return
    }

    this.setData({ previewSticker: updated, previewTagInput: '', showTagEditor: false })
    this.loadStickers()
    wx.showToast({ title: '已添加标签', icon: 'none' })
  },

  onTapAdd() {
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        if (!res.tempFiles || res.tempFiles.length === 0) {
          wx.showToast({ title: '未选择图片', icon: 'none' })
          return
        }

        wx.showLoading({ title: '保存中...' })
        let savedCount = 0

        const activeCategory = this.data.activeCategory
        const targetGroup = (activeCategory !== 'all' && activeCategory !== 'favorite') ? activeCategory : ''

        for (let i = 0; i < res.tempFiles.length; i++) {
          const file = res.tempFiles[i]
          try {
            const savedPath = await fileUtil.persistFile(file.tempFilePath, i)
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
              tags: [],
              originalWidth,
              originalHeight,
              group: targetGroup
            })
            savedCount++
          } catch (err) {
            console.error('[stickers] save failed:', err)
          }
        }

        wx.hideLoading()
        this.loadStickers()
        wx.showToast({ title: `已添加 ${savedCount} 张`, icon: 'none' })
      },
      fail: (err) => {
        console.log('[stickers] chooseMedia cancelled or failed:', err)
      }
    })
  },

  stopPropagation() {}
})
