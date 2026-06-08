# 抠图（Remove Background）功能恢复指南

> **创建日期**: 2026-06-08  
> **适用版本**: 当前代码库（抠图已完全删除后的状态）

---

## 一、概述

2026年6月，抠图功能（remove.bg 去背景）因以下原因被完全删除：

1. **微信PC端 storage limit 不可靠** — USER_DATA_PATH 有 10MB 总上限，无法稳定存储抠图结果
2. **remove.bg API 返回 PNG 体积过大** — 典型 2-3MB，超出存储限制
3. **错误处理链复杂** — 多级压缩/清理/重试逻辑脆弱

如果将来微信提升 PC 端存储限制，或改用云端存储方案，可参照本文档恢复功能。

---

## 二、受影响文件清单

| 文件 | 删除内容 | 行数估计 |
|------|---------|---------|
| `utils/ai.js` | 15 个函数 + CONFIG 字段 | ~350 行 |
| `pages/editor/editor.js` | `_removeImageBackground()` 方法 + 菜单项 | ~60 行 |
| `pages/extract/extract.js` | aiUtil 导入 + 状态字段 + 抠图逻辑 | ~80 行 |
| `pages/extract/extract.wxml` | remove.bg 错误提示区域 | ~10 行 |
| `pages/extract/extract.wxss` | `.removebg-*` 样式 | ~80 行 |
| `app.js` | `_cleanupTempFiles` 中 `cutout_` 清理项 | 1 行 |
| `utils/pdf.js` | `savePdf` 清理范围扩展 | 1 行 |

### 当前残留问题（需顺手修复）

- `pages/extract/extract.wxml` 第 12 行引用了 `{{monthlyRemaining}}`，但 `extract.js` 的 `data` 中未定义该字段。恢复时一并修复。

---

## 三、恢复步骤

### 步骤 1：恢复 `utils/ai.js`

#### 1.1 在 CONFIG 中添加 remove.bg 配置

在现有 `CONFIG` 对象中添加两个字段：

```javascript
const CONFIG = {
  // remove.bg 去背景配置
  REMOVE_BG_API_KEY: 'YOUR_API_KEY',           // ← 替换为你的 API Key
  REMOVE_BG_URL: 'https://api.remove.bg/v1.0/removebg',

  // MiMo 标签配置（已存在，无需修改）
  MIMO_API_KEY: 'tp-ctf32lvhik73nbcwdgcyn83hfntz437uihs6jubwudfe59fu',
  MIMO_URL: 'https://api.mimo-v2.com/v1/chat/completions',
  MIMO_MODEL: 'mimo-v2-omni'
}
```

#### 1.2 替换 `checkUsageLimit` 函数

当前占位代码：
```javascript
function checkUsageLimit() {
  return { allowed: true, remaining: 0 }
}
```

替换为真实逻辑：
```javascript
function checkUsageLimit() {
  const now = new Date()
  const monthKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
  const key = `removebg_usage_${monthKey}`

  const current = wx.getStorageSync(key) || 0
  const monthlyLimit = 50
  const remaining = Math.max(0, monthlyLimit - current)

  return {
    allowed: remaining > 0,
    remaining,
    used: current,
    monthlyLimit
  }
}

function recordUsage() {
  const now = new Date()
  const monthKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
  const key = `removebg_usage_${monthKey}`
  const current = wx.getStorageSync(key) || 0
  wx.setStorageSync(key, current + 1)
}
```

#### 1.3 添加以下函数到 `ai.js`

在 `generateAutoTags` 函数之前插入以下所有函数：

```javascript
// ========== remove.bg 去背景 ==========

/**
 * 图片预处理：压缩到 2MB 以下
 */
function prepareImage(imagePath) {
  return new Promise((resolve, reject) => {
    wx.getFileInfo({
      filePath: imagePath,
      success: (fileInfo) => {
        if (fileInfo.size < 2 * 1024 * 1024) {
          resolve({ path: imagePath, alreadyOk: true })
          return
        }

        // 需要压缩
        wx.getImageInfo({
          src: imagePath,
          success: (info) => {
            const maxDim = 2048
            let targetW = info.width
            let targetH = info.height
            if (targetW > maxDim || targetH > maxDim) {
              const scale = maxDim / Math.max(targetW, targetH)
              targetW = Math.round(targetW * scale)
              targetH = Math.round(targetH * scale)
            }

            const quality = 60  // JPEG 压缩质量

            // 使用 canvas 压缩
            const query = wx.createSelectorQuery ? null : null  // 非页面上下文
            // 注意：此函数在 extract 页面调用，需要传入页面 canvas context
            // 这里使用 OffscreenCanvas 方式
            try {
              const offCanvas = wx.createOffscreenCanvas({
                type: '2d',
                width: targetW,
                height: targetH
              })
              const ctx = offCanvas.getContext('2d')
              const img = offCanvas.createImage()
              img.onload = () => {
                ctx.drawImage(img, 0, 0, targetW, targetH)
                wx.canvasToTempFilePath({
                  canvas: offCanvas,
                  fileType: 'jpg',
                  quality: quality / 100,
                  success: (res) => {
                    resolve({ path: res.tempFilePath, alreadyOk: false })
                  },
                  fail: (err) => reject(new Error('压缩失败: ' + (err.errMsg || 'unknown')))
                })
              }
              img.onerror = () => reject(new Error('图片加载失败'))
              img.src = imagePath
            } catch (e) {
              reject(new Error('压缩失败: ' + (e.message || e)))
            }
          },
          fail: (err) => reject(new Error('获取图片信息失败'))
        })
      },
      fail: (err) => reject(new Error('获取文件信息失败'))
    })
  })
}

/**
 * 缩放 PNG 图片（纯内存方案，不写磁盘）
 * @param {ArrayBuffer} arrayBuffer - PNG 二进制数据
 * @param {number} maxDim - 最大尺寸，默认 1024
 * @returns {Promise<ArrayBuffer>} 缩放后的 PNG 数据
 */
function downscalePng(arrayBuffer, maxDim) {
  maxDim = maxDim || 1024
  return new Promise((resolve, reject) => {
    // 将 ArrayBuffer 转为 base64 以创建 Image
    const base64 = arrayBufferToBase64(arrayBuffer)
    const img = wx.createImage ? wx.createImage() : null
    if (!img) {
      // 降级：直接返回原数据
      console.warn('[downscale] wx.createImage 不可用，跳过缩放')
      resolve(arrayBuffer)
      return
    }

    img.onload = () => {
      if (img.width <= maxDim && img.height <= maxDim) {
        resolve(arrayBuffer)
        return
      }

      const scale = maxDim / Math.max(img.width, img.height)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)

      try {
        const offCanvas = wx.createOffscreenCanvas({ type: '2d', width: w, height: h })
        const ctx = offCanvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)

        wx.canvasToTempFilePath({
          canvas: offCanvas,
          fileType: 'png',
          success: (res) => {
            try {
              const fs = wx.getFileSystemManager()
              const buf = fs.readFileSync(res.tempFilePath)
              resolve(buf)
            } catch (e) {
              resolve(arrayBuffer)  // 读失败则返回原数据
            }
          },
          fail: () => resolve(arrayBuffer)
        })
      } catch (e) {
        resolve(arrayBuffer)
      }
    }
    img.onerror = () => resolve(arrayBuffer)
    img.src = 'data:image/png;base64,' + base64
  })
}

/**
 * 将 ArrayBuffer 转为 base64 字符串
 */
function arrayBufferToBase64(arrayBuffer) {
  if (!arrayBuffer || !arrayBuffer.byteLength) return ''
  try {
    const bytes = new Uint8Array(arrayBuffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    // 使用 wx.arrayBufferToBase64 如果可用
    if (typeof wx.arrayBufferToBase64 === 'function') {
      return wx.arrayBufferToBase64(arrayBuffer)
    }
    return btoa(binary)
  } catch (e) {
    return ''
  }
}

/**
 * 保存 ArrayBuffer 为 PNG 文件（带清理和重试）
 */
function saveArrayBufferPng(arrayBuffer, prefix) {
  prefix = prefix || 'cutout'
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager()
    const userPath = wx.env.USER_DATA_PATH
    const fileName = `${prefix}_${Date.now()}.png`
    const fullPath = `${userPath}/${fileName}`

    function attemptWrite() {
      fs.writeFile({
        filePath: fullPath,
        data: arrayBuffer,
        success: () => resolve(fullPath),
        fail: (err) => {
          if (err.errMsg && err.errMsg.indexOf('storage limit') !== -1) {
            // 二次深度清理后重试
            deepCleanupUserDataTemp()
            fs.writeFile({
              filePath: fullPath,
              data: arrayBuffer,
              success: () => resolve(fullPath),
              fail: () => reject(new Error('存储空间不足，请清理后重试'))
            })
          } else {
            reject(new Error('保存失败: ' + (err.errMsg || 'unknown')))
          }
        }
      })
    }

    // 先清理再写入
    cleanupUserDataTemp()
    attemptWrite()
  })
}

/**
 * 清理临时文件（cutout_/resize_/compress_ 前缀）
 */
function cleanupUserDataTemp() {
  try {
    const fs = wx.getFileSystemManager()
    const files = fs.readdirSync(wx.env.USER_DATA_PATH)
    for (let i = 0; i < files.length; i++) {
      const name = files[i]
      if (
        name.indexOf('cutout_') === 0 ||
        name.indexOf('resize_') === 0 ||
        name.indexOf('compress_') === 0
      ) {
        try { fs.unlinkSync(wx.env.USER_DATA_PATH + '/' + name) } catch (e2) {}
      }
    }
  } catch (e) {}
}

/**
 * 深度清理所有非 persist_ 临时文件
 */
function deepCleanupUserDataTemp() {
  try {
    const fs = wx.getFileSystemManager()
    const files = fs.readdirSync(wx.env.USER_DATA_PATH)
    for (let i = 0; i < files.length; i++) {
      const name = files[i]
      if (name.indexOf('persist_') !== 0 && name !== '__diff__') {
        try { fs.unlinkSync(wx.env.USER_DATA_PATH + '/' + name) } catch (e2) {}
      }
    }
  } catch (e) {}
}

/**
 * 清理所有 USER_DATA_PATH 中的文件（危险操作，仅用于紧急情况）
 */
function cleanupAllUserData() {
  try {
    const fs = wx.getFileSystemManager()
    const files = fs.readdirSync(wx.env.USER_DATA_PATH)
    for (let i = 0; i < files.length; i++) {
      try {
        fs.unlinkSync(wx.env.USER_DATA_PATH + '/' + files[i])
      } catch (e2) {}
    }
  } catch (e) {}
}

/**
 * 调用 remove.bg API 去除背景
 * @param {string} imagePath - 图片路径
 * @param {Function} onProgress - 进度回调 (stage, progress)
 * @returns {Promise<{resultPath: string}>}
 */
function removeBackground(imagePath, onProgress) {
  return new Promise((resolve, reject) => {
    // 1. 预处理（压缩）
    if (onProgress) onProgress('compressing', 10)
    prepareImage(imagePath).then(({ path }) => {
      // 2. 读取图片为 base64
      if (onProgress) onProgress('uploading', 20)
      let imageBase64
      try {
        imageBase64 = wx.getFileSystemManager().readFileSync(path, 'base64')
      } catch (e) {
        reject({ code: 'READ_FAIL', message: '读取图片失败' })
        return
      }

      // 3. 调用 remove.bg API
      if (onProgress) onProgress('processing', 50)
      const startTime = Date.now()
      console.log('[remove.bg] 开始请求...')

      wx.request({
        url: CONFIG.REMOVE_BG_URL,
        method: 'POST',
        header: {
          'X-Api-Key': CONFIG.REMOVE_BG_API_KEY
        },
        data: {
          image_file_b64: imageBase64,
          size: 'auto'
        },
        responseType: 'arraybuffer',
        timeout: 120000,
        success: (res) => {
          const elapsed = Date.now() - startTime
          console.log('[remove.bg] 状态码:', res.statusCode, '耗时:', elapsed, 'ms')

          if (res.statusCode === 200) {
            // 4. 缩放到 1024px 后保存
            if (onProgress) onProgress('saving', 80)
            const pngBuf = res.data
            const shrunkBuf = downscalePng(pngBuf, 1024)

            shrunkBuf.then(finalBuf => {
              return saveArrayBufferPng(finalBuf, 'cutout')
            }).then(resultPath => {
              console.log('[remove.bg] 保存成功:', resultPath)
              resolve({ resultPath })
            }).catch(err => {
              reject({ code: 'SAVE_FAIL', message: err.message || '保存失败' })
            })

          } else if (res.statusCode === 402) {
            reject({ code: 'API_QUOTA', message: 'remove.bg API 额度已用完' })
          } else if (res.statusCode === 400) {
            reject({ code: 'API_BAD_REQUEST', message: '图片格式不支持或文件过大' })
          } else if (res.statusCode === 403) {
            reject({ code: 'API_AUTH_ERROR', message: 'remove.bg API Key 无效' })
          } else if (res.statusCode === 429) {
            reject({ code: 'API_RATE_LIMIT', message: 'remove.bg 请求频率超限，请稍后重试' })
          } else {
            reject({
              code: 'API_ERROR',
              message: `remove.bg 返回错误 (${res.statusCode})`
            })
          }
        },
        fail: (err) => {
          console.error('[remove.bg] 请求失败:', err.errMsg)
          if (err.errMsg && err.errMsg.indexOf('timeout') !== -1) {
            reject({ code: 'TIMEOUT', message: '去除背景超时，请重试' })
          } else if (err.errMsg && (
            err.errMsg.indexOf('ERR_NAME_NOT_RESOLVED') !== -1 ||
            err.errMsg.indexOf('domain') !== -1
          )) {
            reject({
              code: 'DOMAIN_ERROR',
              message: '无法连接 remove.bg 服务，请确认已配置合法域名:\nhttps://api.remove.bg'
            })
          } else {
            reject({ code: 'NETWORK_ERROR', message: err.errMsg || '网络请求失败' })
          }
        }
      })
    }).catch(err => {
      reject(err)
    })
  })
}

/**
 * 完整的提取流程：压缩 → 去背景 → 保存
 */
async function extractSubject(imagePath, onProgress) {
  // 检查使用次数
  const usage = checkUsageLimit()
  if (!usage.allowed) {
    throw { code: 'USAGE_LIMIT', message: '本月去背景次数已用完（50次/月）' }
  }

  // 调用 remove.bg
  const result = await removeBackground(imagePath, onProgress)

  // 记录使用次数
  recordUsage()

  return result
}
```

#### 1.4 更新 `module.exports`

在文件末尾的 `module.exports` 中添加新导出的函数：

```javascript
module.exports = {
  CONFIG,
  checkUsageLimit,
  generateAutoTags,
  generateMiMoTags,
  applyStyle,
  testMiMoVision,
  // ↓ 新增
  removeBackground,
  extractSubject,
  prepareImage,
  downscalePng,
  saveArrayBufferPng,
  cleanupUserDataTemp,
  cleanupAllUserData,
  recordUsage
}
```

---

### 步骤 2：恢复 `pages/extract/extract.js`

#### 2.1 添加 aiUtil 导入

在文件顶部（第 3 行之后）添加：

```javascript
const aiUtil = require('../../utils/ai')
```

#### 2.2 添加状态字段

在 `Page({ data: { ...` 中添加以下字段：

```javascript
// 在 step: 'idle' 之后添加:
removeBgResult: '',
removeBgApplied: false,
isRemovingBg: false,
monthlyRemaining: 50,   // 默认值，onShow 时更新
```

并在 `onShow()` 中更新月度次数：

```javascript
onShow() {
  this.loadRecent()
  this.loadGroups()
  // 更新月度剩余次数
  const usage = aiUtil.checkUsageLimit()
  this.setData({ monthlyRemaining: usage.remaining })
},
```

#### 2.3 恢复抠图处理逻辑

将 `startProcessing` 方法中的简化逻辑替换为包含 remove.bg 的版本：

```javascript
async startProcessing(imagePath) {
  // 检查月度次数
  const usage = aiUtil.checkUsageLimit()
  if (!usage.allowed) {
    this.setData({
      step: 'error',
      errorMessage: '本月去背景次数已用完（50次/月），下月自动重置',
      errorCode: 'USAGE_LIMIT',
      lastImagePath: imagePath
    })
    return
  }

  this.setData({
    step: 'processing',
    originalImage: imagePath,
    progress: 10,
    stageText: '正在压缩图片...',
    uploadPercent: 0,
    errorMessage: '',
    errorCode: '',
    lastImagePath: imagePath,
    autoTags: ['素材'],
    labels: null,
    debugInfo: null,
    removeBgResult: '',
    removeBgApplied: false,
    isRemovingBg: true,
    extractResultId: '',
    savedStickerId: '',
    isSaving: false,
    monthlyRemaining: usage.remaining
  })

  try {
    const result = await aiUtil.extractSubject(imagePath, (stage, progress) => {
      this.setData({
        progress,
        stageText: STAGE_TEXT[stage] || '处理中...',
        uploadPercent: progress
      })
    })

    this.setData({
      step: 'done',
      processedImage: result.resultPath,
      originalUploadImage: imagePath,
      progress: 100,
      stageText: '去除背景完成',
      uploadPercent: 100,
      removeBgResult: result.resultPath,
      removeBgApplied: true,
      isRemovingBg: false,
      autoTags: ['素材'],
      labels: null,
      debugInfo: null,
      extractResultId: 'extract_' + Date.now(),
      savedStickerId: '',
      isSaving: false,
      postProcessEffect: 'none'
    })

    // 异步启动 MiMo 标签识别
    this._tryGenerateTags(result.resultPath)

    // 更新剩余次数
    const updatedUsage = aiUtil.checkUsageLimit()
    this.setData({ monthlyRemaining: updatedUsage.remaining })

  } catch (err) {
    console.error('[extract] remove.bg failed:', err)
    this.setData({
      step: 'error',
      isRemovingBg: false,
      errorMessage: err.message || '去除背景失败，请重试',
      errorCode: err.code || 'UNKNOWN_ERROR',
      lastImagePath: imagePath
    })
  }
},
```

#### 2.4 添加 MiMo 标签异步识别方法

```javascript
async _tryGenerateTags(imagePath) {
  try {
    const labels = await aiUtil.generateMiMoTags(imagePath)
    if (labels && labels.tags) {
      const allTags = [...labels.tags]
      if (labels.mainObject) allTags.unshift(labels.mainObject)
      this.setData({
        autoTags: allTags.slice(0, 12),
        labels,
        debugInfo: labels._mimoMs ? `MiMo 识别: ${labels._mimoMs}ms` : null
      })
    }
  } catch (err) {
    console.warn('[extract] MiMo 标签生成失败:', err.code || err)
    // 标签失败不影响主流程
  }
},
```

---

### 步骤 3：恢复 `pages/editor/editor.js`

#### 3.1 添加 aiUtil 导入

在第 6 行（imageEffect 导入之后）添加：

```javascript
const aiUtil = require('../../utils/ai')
```

#### 3.2 添加 `_removeImageBackground` 方法

在合适位置（建议在 `_buildSelectedMoreActions` 附近）添加：

```javascript
/**
 * 对选中的图片元素去除背景
 */
async _removeImageBackground() {
  const el = this._getSelectedElement()
  if (!el || el.type !== 'image') {
    wx.showToast({ title: '请先选中一张图片', icon: 'none' })
    return
  }

  // 检查月度次数
  const usage = aiUtil.checkUsageLimit()
  if (!usage.allowed) {
    wx.showToast({ title: '本月去背景次数已用完', icon: 'none' })
    return
  }

  wx.showLoading({ title: '去除背景中...', mask: true })

  try {
    const { resultPath } = await aiUtil.removeBackground(el.src)
    // 持久化结果
    const savedPath = await fileUtil.persistFile(resultPath)
    // 更新元素图片
    this.updateElement(el.id, { src: savedPath })
    // 清除旧图片缓存
    imageCache.delete(el.src)
    wx.hideLoading()
    wx.showToast({ title: '背景已去除', icon: 'success' })
    this.renderCanvas()
  } catch (err) {
    wx.hideLoading()
    console.error('[editor] remove.bg failed:', err)
    wx.showToast({
      title: err.message || '去除背景失败',
      icon: 'none',
      duration: 2500
    })
  }
},
```

#### 3.3 在图片菜单中添加"去除背景"选项

在 `_buildSelectedMoreActions` 方法中，`el.type === 'image'` 分支的开头添加：

```javascript
_buildSelectedMoreActions(el) {
  if (el.type === 'image') {
    return [
      { key: 'remove-bg', label: '去除背景', icon: '/assets/icons/scissors.svg' },  // ← 新增
      { key: 'effect-none', label: '无效果', icon: '/assets/icons/x.svg' },
      { key: 'effect-white-border', label: '白边', icon: '/assets/icons/sticker.svg' },
      // ... 其余不变
    ]
  }
  // ... 其余不变
},
```

#### 3.4 在 `onSelectedMoreAction` switch 中添加处理

```javascript
switch (action) {
  case 'remove-bg':                         // ← 新增
    this._removeImageBackground()           // ← 新增
    return                                   // ← 新增
  // ... 其他 case 不变
}
```

---

### 步骤 4：恢复 `pages/extract/extract.wxml`

#### 4.1 在错误视图前添加 remove.bg 错误提示

在 `<view class="error-view" wx:if="{{step === 'error'}}">` 之前插入：

```xml
<!-- remove.bg 专用错误提示 -->
<view class="removebg-error-banner" wx:if="{{step === 'error' && errorCode === 'TIMEOUT'}}">
  <view class="removebg-error-hint">💡 去除背景超时，可能是图片过大。建议裁剪主体区域后重试。</view>
</view>
<view class="removebg-error-banner" wx:if="{{step === 'error' && errorCode === 'DOMAIN_ERROR'}}">
  <view class="removebg-error-hint">💡 请在小程序后台「开发管理 → 开发设置 → 服务器域名」中添加 request 合法域名：https://api.remove.bg</view>
</view>
```

---

### 步骤 5：恢复 `pages/extract/extract.wxss`

在文件末尾添加 remove.bg 相关样式：

```css
/* ========== remove.bg 错误提示 ========== */
.removebg-error-banner {
  margin: 24rpx 32rpx;
  padding: 20rpx 24rpx;
  background: rgba(193, 53, 53, 0.1);
  border: 1rpx solid rgba(193, 53, 53, 0.3);
  border-radius: 12rpx;
}
.removebg-error-hint {
  font-size: 24rpx;
  color: #f2a5a5;
  line-height: 1.6;
}

/* remove.bg 操作提示 */
.removebg-stage {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 12rpx;
}
.removebg-stage-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: #00d992;
}
.removebg-stage-dot.active {
  animation: removebgPulse 1s ease-in-out infinite;
}
@keyframes removebgPulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}
.removebg-stage-text {
  font-size: 22rpx;
  color: #8b949e;
}
.removebg-stage-text.active {
  color: #00d992;
}

/* 抠图预览特殊样式 */
.result-image-wrapper.is-removebg {
  background-image:
    linear-gradient(45deg, #2a2a2a 25%, transparent 25%),
    linear-gradient(-45deg, #2a2a2a 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #2a2a2a 75%),
    linear-gradient(-45deg, transparent 75%, #2a2a2a 75%);
  background-size: 20rpx 20rpx;
  background-position: 0 0, 0 10rpx, 10rpx -10rpx, -10rpx 0;
}
```

---

### 步骤 6：恢复 `app.js`

在 `_cleanupTempFiles` 中添加 `cutout_` 清理：

```javascript
_cleanupTempFiles() {
  try {
    var fs = wx.getFileSystemManager()
    var files = fs.readdirSync(wx.env.USER_DATA_PATH)
    for (var i = 0; i < files.length; i++) {
      var name = files[i]
      if (
        name.indexOf('resize_') === 0 ||
        name.indexOf('compress_') === 0 ||
        name.indexOf('cutout_') === 0 ||       // ← 恢复此行
        name.endsWith('.pdf')
      ) {
        try { fs.unlinkSync(wx.env.USER_DATA_PATH + '/' + name) } catch (e2) {}
      }
    }
  } catch (e) {}
},
```

---

### 步骤 7：恢复 `utils/pdf.js`（可选）

如果之前在 `savePdf` 的清理范围中扩展了 `cutout_` 前缀，恢复对应的清理行：

```javascript
// 在 savePdf 清理旧 PDF 的逻辑中恢复对 cutout_ 的处理
if (
  name.endsWith('.pdf') ||
  name.indexOf('cutout_') === 0     // ← 恢复
) {
  try { fs.unlinkSync(userPath + '/' + name) } catch (e2) {}
}
```

---

## 四、API 配置

### 4.1 remove.bg API

| 项目 | 值 |
|------|-----|
| API 地址 | `https://api.remove.bg/v1.0/removebg` |
| 认证方式 | Header: `X-Api-Key` |
| 请求格式 | POST, JSON body: `{ image_file_b64, size }` |
| 响应格式 | `arraybuffer` (PNG) |
| 免费额度 | 50 次/月（需注册） |
| 获取 Key | https://www.remove.bg/api |

### 4.2 微信小程序后台配置

在小程序后台「开发 → 开发管理 → 开发设置 → 服务器域名」中：

- **request 合法域名**: 添加 `https://api.remove.bg`
- **downloadFile 合法域名**: 无需额外配置

### 4.3 需要添加的图标

```bash
# 如果在编辑器菜单中使用 scissors 图标，确保存在:
assets/icons/scissors.svg
```

如果该图标不存在，可以改用现有的任意图标（如 `/assets/icons/image-plus.svg`）。

---

## 五、已知问题和注意事项

### 5.1 PC 端 storage 限制（根本原因）

微信 PC 端 `USER_DATA_PATH` 有 **10MB 硬上限**。remove.bg 返回的 PNG 图片即使经过 1024px 缩放，仍可能达到 200-400KB，配合素材库持久化文件很容易超过限制。

**恢复前的替代方案建议**：
1. 限制抠图功能仅在小程序手机端使用
2. 或将抠图结果上传到云端存储（如云开发存储）
3. 或在调用前检测剩余空间并警告用户

### 5.2 OffscreenCanvas 兼容性

`downscalePng` 使用 `wx.createOffscreenCanvas`，该 API 需要基础库 2.16.1+（当前项目基础库 3.3.4，满足条件）。

### 5.3 MiMo 标签识别

抠图成功后异步调用 MiMo 标签识别。MiMo API 需要：
- request 合法域名: `https://api.mimo-v2.com`
- API Key 已在 CONFIG 中配置

### 5.4 使用次数追踪

使用次数按月存储（key: `removebg_usage_2026-06`），存在 `wx.Storage` 中（非文件系统），不受 storage limit 影响。

### 5.5 残留的 monthlyRemaining 引用

当前 `extract.wxml` 第 12 行引用了 `{{monthlyRemaining}}`，但 `extract.js` 的 `data` 中未定义。恢复时需确保：
- `data` 中声明 `monthlyRemaining: 50`
- `onShow` 中调用 `aiUtil.checkUsageLimit()` 更新

---

## 六、快速验证清单

恢复完成后，按以下步骤验证：

- [ ] `ai.js` 新增函数无语法错误
- [ ] `extract.js` 导入 `aiUtil` 无报错
- [ ] 提取页 idle 状态显示"本月剩余 XX 次"
- [ ] 选择图片后成功调用 remove.bg 并显示结果
- [ ] 编辑器选中图片后出现"去除背景"菜单项
- [ ] 编辑器抠图功能正常工作
- [ ] 月度次数正确追踪（重启小程序后次数不重置）
- [ ] 手机端和 PC 端均测试通过（PC 端注意 storage 限制）

---

## 七、相关文件索引

| 文件 | 用途 |
|------|------|
| `docs/restore-remove-bg.md` | 本文档 |
| `utils/ai.js` | remove.bg/MiMo API 调用 |
| `utils/file.js` | 文件持久化 |
| `utils/storage.js` | 贴纸/页面存储 |
| `pages/extract/extract.*` | AI 提取页 |
| `pages/editor/editor.js` | 编辑器（抠图菜单） |
| `app.js` | 启动清理逻辑 |
