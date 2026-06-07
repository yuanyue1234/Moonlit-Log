// templates page
const templateUtil = require('../../utils/template')
const storageUtil = require('../../utils/storage')

Page({
  data: {
    categories: templateUtil.TEMPLATE_CATEGORIES,
    activeCategory: '全部',
    templates: [],
    bookId: ''
  },

  onLoad(options) {
    this.setData({
      bookId: options.bookId || '',
      templates: templateUtil.getTemplates('全部')
    })
  },

  onTapCategory(e) {
    const cat = e.currentTarget.dataset.category
    this.setData({
      activeCategory: cat,
      templates: templateUtil.getTemplates(cat)
    })
  },

  onTapTemplate(e) {
    const templateId = e.currentTarget.dataset.id
    const bookId = this.data.bookId

    if (bookId) {
      storageUtil.ensureCoverPage(bookId)
      const page = storageUtil.createPage(bookId)
      wx.redirectTo({
        url: `/pages/editor/editor?bookId=${bookId}&pageId=${page.id}&templateId=${templateId}`
      })
      return
    }

    const books = storageUtil.getBooks()
    if (books.length === 0) {
      wx.showToast({ title: '请先创建手账本', icon: 'none' })
      return
    }

    if (books.length === 1) {
      storageUtil.ensureCoverPage(books[0].id)
      const page = storageUtil.createPage(books[0].id)
      wx.redirectTo({
        url: `/pages/editor/editor?bookId=${books[0].id}&pageId=${page.id}&templateId=${templateId}`
      })
      return
    }

    this.showBookPickerForTemplate(books, templateId, 0)
  },

  showBookPickerForTemplate(books, templateId, startIndex) {
    const pageSize = 5
    const safeStart = Math.max(0, Math.min(startIndex, Math.max(0, books.length - 1)))
    const pageBooks = books.slice(safeStart, safeStart + pageSize)
    const actions = pageBooks.map((book, i) => ({
      label: `${safeStart + i + 1}. ${book.name || '未命名手账'}`.slice(0, 18),
      fn: () => {
        storageUtil.ensureCoverPage(book.id)
        const page = storageUtil.createPage(book.id)
        wx.redirectTo({
          url: `/pages/editor/editor?bookId=${book.id}&pageId=${page.id}&templateId=${templateId}`
        })
      }
    }))

    if (safeStart + pageSize < books.length) {
      actions.push({ label: '下一组', fn: () => this.showBookPickerForTemplate(books, templateId, safeStart + pageSize) })
    } else if (safeStart > 0) {
      actions.push({ label: '上一组', fn: () => this.showBookPickerForTemplate(books, templateId, Math.max(0, safeStart - pageSize)) })
    }

    wx.showActionSheet({
      itemList: actions.map(item => item.label),
      success: (res) => {
        const action = actions[res.tapIndex]
        if (action) action.fn()
      },
      fail: (err) => {
        if (err && err.errMsg && err.errMsg.indexOf('cancel') !== -1) return
        console.warn('[templates] show book picker failed:', err)
      }
    })
  }
})
