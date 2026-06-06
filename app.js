// app.js - 我的手帐小程序
App({
  onLaunch() {
    this.initStorage()
    this.loadFonts()
  },

  loadFonts() {
    wx.loadFontFace({
      family: 'LXGW Yozai',
      source: 'url("https://repo.huaweicloud.com/CTAN/fonts/lxgw-fonts/LXGWYozai-Regular.ttf")',
      global: true
    })
  },

  initStorage() {
    let books = wx.getStorageSync('journal_books') || []
    if (books.length === 0) {
      const defaultBook = {
        id: this.generateId(),
        name: '默认手帐本',
        cover: 'default',
        theme: 'cream',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        pages: []
      }
      books = [defaultBook]
      wx.setStorageSync('journal_books', books)
    }

    const stickers = wx.getStorageSync('sticker_assets') || []
    if (stickers.length === 0) {
      wx.setStorageSync('sticker_assets', [])
    }
  },

  generateId() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9)
  },

  globalData: {
    pageSizes: {
      '3:4': { width: 690, height: 920 },
      A5: { width: 690, height: 976 },
      square: { width: 690, height: 690 }
    },
    currentTheme: 'cream'
  }
})
