// templates page
const templateUtil = require('../../utils/template')
const storageUtil = require('../../utils/storage')

Page({
  data: {
    categories: templateUtil.TEMPLATE_CATEGORIES,
    activeCategory: '鍏ㄩ儴',
    templates: [],
    bookId: ''
  },

  onLoad(options) {
    this.setData({
      bookId: options.bookId || '',
      templates: templateUtil.getTemplates('鍏ㄩ儴')
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
      const page = storageUtil.createPage(bookId)
      wx.redirectTo({
        url: `/pages/editor/editor?bookId=${bookId}&pageId=${page.id}&templateId=${templateId}`
      })
      return
    }

    const books = storageUtil.getBooks()
    if (books.length === 1) {
      const page = storageUtil.createPage(books[0].id)
      wx.redirectTo({
        url: `/pages/editor/editor?bookId=${books[0].id}&pageId=${page.id}&templateId=${templateId}`
      })
      return
    }

    const names = books.map(b => b.name)
    wx.showActionSheet({
      itemList: names,
      success: (res) => {
        const book = books[res.tapIndex]
        const page = storageUtil.createPage(book.id)
        wx.redirectTo({
          url: `/pages/editor/editor?bookId=${book.id}&pageId=${page.id}&templateId=${templateId}`
        })
      }
    })
  }
})
