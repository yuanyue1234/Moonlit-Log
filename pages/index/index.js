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
    newTagInput: '',
    // 新建手帐本 - 封面和标签
    creatingCoverImage: '',
    creatingTags: [],
    newCreateTagInput: '',
    // 导出状态
    exporting: false,
    exportStatus: '',
    exportProgress: 0,
    exportTotal: 0
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
    // 批量获取所有手账本的页数，避免N+1查询
    const pageCounts = storage.getBookPageCounts()
    const enrichedBooks = books.map(book => {
      const themeInfo = theme.getTheme(book.theme)
      return {
        ...book,
        themeInfo,
        pageCount: pageCounts[book.id] || 0,
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

  // 点击手账本 - 打开封面页（第一页）
  onTapBook(e) {
    const bookId = e.currentTarget.dataset.id

    // 获取该手账本的所有页面，打开封面页（第一页）
    const pages = storage.getPages(bookId)
    if (pages.length > 0) {
      const coverPage = pages[0]
      wx.navigateTo({ url: `/pages/editor/editor?bookId=${bookId}&pageId=${coverPage.id}` })
    } else {
      // 没有页面时先补封面页
      const newPage = storage.ensureCoverPage(bookId)
      wx.navigateTo({ url: `/pages/editor/editor?bookId=${bookId}&pageId=${newPage.id}` })
    }
  },

  // 创建手账本
  onTapCreate() {
    this.setData({ showCreateModal: true, newBookName: '', selectedTheme: 'cream', creatingCoverImage: '', creatingTags: [], newCreateTagInput: '' })
  },

  onInputName(e) {
    this.setData({ newBookName: e.detail.value })
  },

  onSelectTheme(e) {
    this.setData({ selectedTheme: e.currentTarget.dataset.key })
  },

  onConfirmCreate() {
    const { creatingCoverImage, creatingTags } = this.data
    const name = this.data.newBookName.trim() || '新手账本'
    storage.createBook({ name, theme: this.data.selectedTheme, cover: 'default', coverImage: creatingCoverImage, tags: creatingTags })
    this.setData({ showCreateModal: false })
    this.loadBooks()
    wx.showToast({ title: '创建成功', icon: 'none' })
  },

  onCancelCreate() {
    this.setData({ showCreateModal: false, creatingCoverImage: '', creatingTags: [], newCreateTagInput: '' })
  },

  // 新建 - 选择封面图片
  onCreateChooseCover() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath
        const fileUtil = require('../../utils/file')
        fileUtil.persistFile(tempPath).then(savedSrc => {
          this.setData({ creatingCoverImage: savedSrc })
        }).catch(() => {
          this.setData({ creatingCoverImage: tempPath })
        })
      }
    })
  },

  onCreateTagInput(e) {
    this.setData({ newCreateTagInput: e.detail.value })
  },

  onCreateAddTag() {
    const tag = this.data.newCreateTagInput.trim()
    if (!tag) return
    const tags = [...this.data.creatingTags]
    if (tags.includes(tag)) {
      wx.showToast({ title: '标签已存在', icon: 'none' })
      return
    }
    if (tags.length >= 5) {
      wx.showToast({ title: '最多5个标签', icon: 'none' })
      return
    }
    tags.push(tag)
    this.setData({ creatingTags: tags, newCreateTagInput: '' })
  },

  onCreateRemoveTag(e) {
    const index = e.currentTarget.dataset.index
    const tags = [...this.data.creatingTags]
    tags.splice(index, 1)
    this.setData({ creatingTags: tags })
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
      itemList: ['编辑', '导出PDF', '删除'],
      success: (res) => {
        if (res.tapIndex === 0) this.onTapEditBook({ currentTarget: { dataset: { id: bookId } } })
        else if (res.tapIndex === 1) this.onExportPdf(bookId)
        else if (res.tapIndex === 2) this.onTapDeleteBook({ currentTarget: { dataset: { id: bookId } } })
      }
    })
  },

  async onExportPdf(bookId) {
    // 防止重复导出
    if (this.data.exporting) return
    this.setData({ exporting: true, exportStatus: '', exportProgress: 0, exportTotal: 0 })

    try {
      const pdfUtil = require('../../utils/pdf')
      const result = await pdfUtil.exportBookToPdf(bookId, (info) => {
        // 后台静默更新进度
        if (info.stage === 'rendering') {
          this.setData({
            exportStatus: `正在导出「${info.bookName}」`,
            exportProgress: info.current,
            exportTotal: info.total
          })
        } else if (info.stage === 'done') {
          this.setData({ exportStatus: '', exportProgress: 0, exportTotal: 0, exporting: false })
          // 导出成功弹窗
          wx.showModal({
            title: '导出成功',
            content: `「${info.bookName}」已导出为 PDF（${info.total} 页）`,
            confirmText: '打开查看',
            cancelText: '关闭',
            success: (modalRes) => {
              if (modalRes.confirm && info.pdfPath) {
                wx.openDocument({ filePath: info.pdfPath, showMenu: true })
              }
            }
          })
        }
      })

      // 这里 done 回调已经在上面处理了，但防止 done 没触发
      if (result && result.pdfPath) {
        this.setData({ exporting: false, exportStatus: '', exportProgress: 0, exportTotal: 0 })
      }
    } catch (err) {
      console.error('[index] export pdf failed:', err)
      this.setData({ exporting: false, exportStatus: '', exportProgress: 0, exportTotal: 0 })
      wx.showToast({ title: '导出失败: ' + (err.message || '未知错误'), icon: 'none' })
    }
  },

  stopPropagation() {}
})
