// app.js - 我的手帐小程序
const fileUtil = require('./utils/file')
const storage = require('./utils/storage')

App({
  onLaunch() {
    this.initStorage()
    this.loadFonts()
    // 延迟清理，避免阻塞启动
    setTimeout(() => this.scheduleCleanup(), 3000)
  },

  // 定期清理未使用的文件（每天最多一次）
  scheduleCleanup() {
    const lastCleanup = wx.getStorageSync('last_file_cleanup') || 0
    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000

    if (now - lastCleanup > oneDay) {
      // 先清理临时/导出文件（pdf 等）
      this._cleanupTempFiles()
      // 再清理未引用的持久化文件
      fileUtil.cleanupUnusedFiles().then(result => {
        wx.setStorageSync('last_file_cleanup', now)
        if (result.deleted > 0) {
          console.log('[cleanup] 清理了 ' + result.deleted + ' 个未使用文件')
        }
      }).catch(err => {
        console.warn('[cleanup] 清理文件失败:', err)
        wx.setStorageSync('last_file_cleanup', now)
      })
    }
  },

  _cleanupTempFiles() {
    try {
      var fs = wx.getFileSystemManager()
      var files = fs.readdirSync(wx.env.USER_DATA_PATH)
      for (var i = 0; i < files.length; i++) {
        var name = files[i]
        if (
          name.indexOf('resize_') === 0 ||
          name.indexOf('compress_') === 0 ||
          name.endsWith('.pdf')
        ) {
          try { fs.unlinkSync(wx.env.USER_DATA_PATH + '/' + name) } catch (e2) {}
        }
      }
    } catch (e) {}
  },

  loadFonts() {
    // 字体从华为云镜像加载（GitHub CDN 已受限，直接使用稳定源）
    const fontUrl = 'https://repo.huaweicloud.com/CTAN/fonts/lxgw-fonts/LXGWYozai-Regular.ttf'
    this.globalData.fontsReady = false

    if (!wx.loadFontFace) {
      console.warn('[font] 当前基础库不支持 wx.loadFontFace')
      return
    }

    wx.loadFontFace({
      family: 'LXGW Yozai',
      source: `url("${fontUrl}")`,
      global: true,
      success: () => {
        this.globalData.fontsReady = true
        console.log('[font] LXGW Yozai loaded from Huawei mirror')
      },
      fail: () => {
        this.globalData.fontsReady = false
        console.warn('[font] LXGW Yozai load failed, fallback to system fonts')
      }
    })
  },

  initStorage() {
    let books = wx.getStorageSync('journal_books') || []
    if (books.length === 0) {
      storage.createBook({
        name: '默认手帐本',
        cover: 'default',
        theme: 'cream'
      })
      books = storage.getBooks()
    }

    const stickers = wx.getStorageSync('sticker_assets') || []
    if (stickers.length === 0) {
      wx.setStorageSync('sticker_assets', [])
    }
  },

  globalData: {
    pageSizes: {
      '3:4': { width: 690, height: 920 },
      A5: { width: 690, height: 976 },
      square: { width: 690, height: 690 }
    },
    currentTheme: 'cream',
    fontsReady: false
  }
})
