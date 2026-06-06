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

module.exports = { persistFile }
