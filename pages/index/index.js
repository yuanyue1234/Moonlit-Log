// pages/index/index.js - 手账本列表页 (暗色主题)
const storage = require('../../utils/storage')
const theme = require('../../utils/theme')

Page({
  data: {
    books: [],
    showCreateModal: false,
    showEditModal: false,
    editingBook: null,
    newBookName: '',
    selectedTheme: 'cream',
    themeList: [],
    pageReady: false,
    flippedBookId: null,
    keyboardHeight: 0,
    lastEditedBook: null,
    // 封面和标签
    editingCoverImage: '',
    editingTags: [],
    newTagInput: ''
  },

  onLoad() {
    this.setData({ themeList: theme.getThemeList() })
    // 监听输入法高度
    this._keyboardHandler = (res) => {
      this.setData({ keyboardHeight: res.height > 0 ? res.height : 0 })
    }
    wx.onKeyboardHeightChange(this._keyboardHandler)
  },

  onUnload() {
    if (this._keyboardHandler) {
      wx.offKeyboardHeightChange(this._keyboardHandler)
    }
  },

  onShow() {
    this.loadBooks()
  },

  loadBooks() {
    const books = storage.getBooks()
    const enrichedBooks = books.map(book => {
      const themeInfo = theme.getTheme(book.theme)
      const pages = storage.getPages(book.id)
      return {
        ...book,
        themeInfo,
        pageCount: pages.length,
        timeAgo: this.getTimeAgo(book.updatedAt)
      }
    })
    // 找到最近编辑的手账本
    const sorted = [...enrichedBooks].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    const lastEditedBook = sorted.length > 0 ? sorted[0] : null
    this.setData({ books: enrichedBooks, pageReady: true, lastEditedBook })
  },

  getTimeAgo(timestamp) {
    if (!timestamp) return ''
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes} 分钟前`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} 小时前`
    const days = Math.floor(hours / 24)
    return `${days} 天前`
  },

  onTapContinue() {
    const { lastEditedBook } = this.data
    if (!lastEditedBook) return
    this.onTapBook({ currentTarget: { dataset: { id: lastEditedBook.id } } })
  },

  // 点击手账本 - 打开最后一页（无动画）
  onTapBook(e) {
    const bookId = e.currentTarget.dataset.id

    // 获取该手账本的所有页面，打开最后一页
    const pages = storage.getPages(bookId)
    if (pages.length > 0) {
      const lastPage = pages[pages.length - 1]
      wx.navigateTo({ url: `/pages/editor/editor?bookId=${bookId}&pageId=${lastPage.id}` })
    } else {
      // 没有页面时创建新页面再打开
      const newPage = storage.createPage(bookId)
      wx.navigateTo({ url: `/pages/editor/editor?bookId=${bookId}&pageId=${newPage.id}` })
    }
  },

  // 创建手账本
  onTapCreate() {
    this.setData({ showCreateModal: true, newBookName: '', selectedTheme: 'cream' })
  },

  onInputName(e) {
    this.setData({ newBookName: e.detail.value })
  },

  onSelectTheme(e) {
    this.setData({ selectedTheme: e.currentTarget.dataset.key })
  },

  onConfirmCreate() {
    const name = this.data.newBookName.trim() || '新手账本'
    storage.createBook({ name, theme: this.data.selectedTheme, cover: 'default' })
    this.setData({ showCreateModal: false })
    this.loadBooks()
    wx.showToast({ title: '创建成功', icon: 'none' })
  },

  onCancelCreate() {
    this.setData({ showCreateModal: false })
  },

  // 编辑
  onTapEditBook(e) {
    const bookId = e.currentTarget.dataset.id
    const book = this.data.books.find(b => b.id === bookId)
    if (book) {
      this.setData({
        showEditModal: true, editingBook: book,
        newBookName: book.name, selectedTheme: book.theme,
        editingCoverImage: book.coverImage || '',
        editingTags: book.tags ? [...book.tags] : [],
        newTagInput: ''
      })
    }
  },

  onChooseCover() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath
        // 持久化文件
        const fileUtil = require('../../utils/file')
        fileUtil.persistFile(tempPath).then(savedSrc => {
          this.setData({ editingCoverImage: savedSrc })
        }).catch(() => {
          this.setData({ editingCoverImage: tempPath })
        })
      }
    })
  },

  onTagInput(e) {
    this.setData({ newTagInput: e.detail.value })
  },

  onAddTag() {
    const tag = this.data.newTagInput.trim()
    if (!tag) return
    const tags = [...this.data.editingTags]
    if (tags.includes(tag)) {
      wx.showToast({ title: '标签已存在', icon: 'none' })
      return
    }
    if (tags.length >= 5) {
      wx.showToast({ title: '最多5个标签', icon: 'none' })
      return
    }
    tags.push(tag)
    this.setData({ editingTags: tags, newTagInput: '' })
  },

  onRemoveTag(e) {
    const index = e.currentTarget.dataset.index
    const tags = [...this.data.editingTags]
    tags.splice(index, 1)
    this.setData({ editingTags: tags })
  },

  onConfirmEdit() {
    const { editingBook, newBookName, selectedTheme, editingCoverImage, editingTags } = this.data
    if (editingBook) {
      storage.updateBook(editingBook.id, {
        name: newBookName.trim() || editingBook.name,
        theme: selectedTheme,
        coverImage: editingCoverImage,
        tags: editingTags
      })
      this.setData({ showEditModal: false, editingBook: null })
      this.loadBooks()
      wx.showToast({ title: '已更新', icon: 'none' })
    }
  },

  onCancelEdit() {
    this.setData({ showEditModal: false, editingBook: null })
  },

  // 删除
  onTapDeleteBook(e) {
    const bookId = e.currentTarget.dataset.id
    const book = this.data.books.find(b => b.id === bookId)
    if (!book) return
    wx.showModal({
      title: '删除确认',
      content: `确定要删除「${book.name}」吗？里面的所有页面也会被删除。`,
      confirmText: '删除', confirmColor: '#ff6b6b',
      success: (res) => {
        if (res.confirm) {
          storage.deleteBook(bookId)
          this.loadBooks()
          wx.showToast({ title: '已删除', icon: 'none' })
        }
      }
    })
  },

  onLongPressBook(e) {
    const bookId = e.currentTarget.dataset.id
    wx.showActionSheet({
      itemList: ['编辑', '删除'],
      success: (res) => {
        if (res.tapIndex === 0) this.onTapEditBook({ currentTarget: { dataset: { id: bookId } } })
        else if (res.tapIndex === 1) this.onTapDeleteBook({ currentTarget: { dataset: { id: bookId } } })
      }
    })
  },

  stopPropagation() {}
})
