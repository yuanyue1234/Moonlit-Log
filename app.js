// app.js - 我的手帐小程序
const fileUtil = require('./utils/file')
const storage = require('./utils/storage')

App({
  onLaunch() {
    this.initStorage()
    this.loadFonts()
    this.scheduleCleanup()
  },

  // 定期清理未使用的文件（每天最多一次）
  scheduleCleanup() {
    const lastCleanup = wx.getStorageSync('last_file_cleanup') || 0
    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000

    if (now - lastCleanup > oneDay) {
      fileUtil.cleanupUnusedFiles().then(result => {
        wx.setStorageSync('last_file_cleanup', now)
        if (result.deleted > 0) {
          console.log(`[cleanup] 清理了 ${result.deleted} 个未使用文件`)
        }
      }).catch(err => {
        console.warn('[cleanup] 清理文件失败:', err)
        // 失败时也更新时间戳，避免每次启动都重试
        wx.setStorageSync('last_file_cleanup', now)
      })
    }
  },

  loadFonts() {
    const fontSources = [
      'https://github.com/lxgw/yozai-font/releases/latest/download/Yozai-Regular.ttf',
      'https://repo.huaweicloud.com/CTAN/fonts/lxgw-fonts/LXGWYozai-Regular.ttf'
    ]
    this.globalData.fontsReady = false

    if (!wx.loadFontFace) {
      console.warn('[font] 当前基础库不支持 wx.loadFontFace')
      return
    }

    const tryLoad = (index = 0) => {
      const url = fontSources[index]
      if (!url) {
        this.globalData.fontsReady = false
        console.warn('[font] LXGW Yozai load failed, fallback to system fonts')
        return
      }

      wx.loadFontFace({
        family: 'LXGW Yozai',
        source: `url("${url}")`,
        global: true,
        success: () => {
          this.globalData.fontsReady = true
          console.log('[font] LXGW Yozai loaded:', url)
        },
        fail: () => {
          tryLoad(index + 1)
        }
      })
    }

    tryLoad()
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
