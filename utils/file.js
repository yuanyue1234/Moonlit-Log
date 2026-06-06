/**
 * file.js - 文件工具
 * 将临时文件持久化到用户目录
 */

function persistFile(tempPath) {
  return new Promise((resolve, reject) => {
    // 如果已经是持久路径，直接返回
    if (tempPath.indexOf(wx.env.USER_DATA_PATH) === 0) {
      resolve(tempPath)
      return
    }

    const fs = wx.getFileSystemManager()
    const ext = tempPath.split('.').pop() || 'png'
    const destPath = `${wx.env.USER_DATA_PATH}/persist_${Date.now()}.${ext}`

    fs.copyFile({
      srcPath: tempPath,
      destPath: destPath,
      success: () => resolve(destPath),
      fail: () => reject(new Error('持久化文件失败'))
    })
  })
}

/**
 * 清理未使用的持久化文件
 * 收集所有引用的文件路径，删除未被引用的 persist_* 文件
 */
function cleanupUnusedFiles() {
  return new Promise((resolve) => {
    try {
      const fs = wx.getFileSystemManager()
      const userPath = wx.env.USER_DATA_PATH

      // 收集所有引用的文件路径
      const referencedFiles = new Set()

      // 从 storage 获取所有引用的文件
      const storage = require('./storage')

      // 收集贴纸文件
      const stickers = storage.getStickers()
      stickers.forEach(s => {
        if (s.src && s.src.indexOf(userPath) === 0) {
          referencedFiles.add(s.src)
        }
      })

      // 收集手账本封面文件
      const books = storage.getBooks()
      books.forEach(b => {
        if (b.coverImage && b.coverImage.indexOf(userPath) === 0) {
          referencedFiles.add(b.coverImage)
        }
      })

      // 收集页面元素中的图片文件
      books.forEach(b => {
        const pages = storage.getPages(b.id)
        pages.forEach(p => {
          (p.elements || []).forEach(el => {
            if (el.src && el.src.indexOf(userPath) === 0) {
              referencedFiles.add(el.src)
            }
          })
        })
      })

      // 列出所有 persist_ 开头的文件
      let files = []
      try {
        files = fs.readdirSync(userPath).filter(f => f.startsWith('persist_'))
      } catch (e) {
        resolve({ deleted: 0, kept: 0 })
        return
      }

      // 删除未引用的文件
      let deletedCount = 0
      let keptCount = 0

      for (const file of files) {
        const fullPath = `${userPath}/${file}`
        if (!referencedFiles.has(fullPath)) {
          try {
            fs.unlinkSync(fullPath)
            deletedCount++
          } catch (e) {
            // 文件可能正在使用，忽略错误
          }
        } else {
          keptCount++
        }
      }

      resolve({ deleted: deletedCount, kept: keptCount })
    } catch (e) {
      resolve({ deleted: 0, kept: 0, error: e.message })
    }
  })
}

/**
 * 获取存储空间使用情况
 */
function getStorageInfo() {
  return new Promise((resolve) => {
    try {
      const fs = wx.getFileSystemManager()
      const userPath = wx.env.USER_DATA_PATH

      let files = []
      try {
        files = fs.readdirSync(userPath).filter(f => f.startsWith('persist_'))
      } catch (e) {
        resolve({ fileCount: 0, totalSize: 0 })
        return
      }

      let totalSize = 0
      for (const file of files) {
        try {
          const stat = fs.statSync(`${userPath}/${file}`, false)
          totalSize += stat.size || 0
        } catch (e) {
          // 忽略错误
        }
      }

      resolve({ fileCount: files.length, totalSize })
    } catch (e) {
      resolve({ fileCount: 0, totalSize: 0 })
    }
  })
}

module.exports = { persistFile, cleanupUnusedFiles, getStorageInfo }
