// utils/ai.js - remove.bg official API extraction

const CONFIG = {
  REMOVE_BG_API_KEY: 'cV66fEfX4vNQpGNYL6bjrDT5',
  REMOVE_BG_URL: 'https://api.remove.bg/v1.0/removebg',
  // MiMo 标签配置（MaxPlan / MiMo v2）
  MIMO_API_KEY: 'tp-ctf32lvhik73nbcwdgcyn83hfntz437uihs6jubwudfe59fu',
  MIMO_URL: 'https://api.mimo-v2.com/v1/chat/completions',
  MIMO_MODEL: 'mimo-v2-omni',
  MONTHLY_FREE_LIMIT: 50,
  MAX_IMAGE_SIZE: 2 * 1024 * 1024,
  REQUEST_TIMEOUT: 90000,
  COMPRESS_QUALITIES: [80, 60, 40, 25]
}

function checkUsageLimit() {
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const usage = wx.getStorageSync('ai_usage') || {}
  if (usage.month !== month) {
    wx.setStorageSync('ai_usage', { month, count: 0 })
    return { allowed: true, remaining: CONFIG.MONTHLY_FREE_LIMIT }
  }

  const count = Number(usage.count) || 0
  return {
    allowed: count < CONFIG.MONTHLY_FREE_LIMIT,
    remaining: Math.max(0, CONFIG.MONTHLY_FREE_LIMIT - count)
  }
}

function incrementUsage() {
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const usage = wx.getStorageSync('ai_usage') || { month, count: 0 }
  if (usage.month !== month) {
    usage.month = month
    usage.count = 0
  }
  usage.count = (Number(usage.count) || 0) + 1
  wx.setStorageSync('ai_usage', usage)
}

function getFileSize(filePath) {
  return new Promise((resolve) => {
    wx.getFileSystemManager().getFileInfo({
      filePath,
      success: (res) => resolve(res.size || 0),
      fail: () => resolve(0)
    })
  })
}

function compressImage(imagePath, quality) {
  return new Promise((resolve) => {
    wx.compressImage({
      src: imagePath,
      quality,
      success: (res) => resolve(res.tempFilePath || imagePath),
      fail: () => resolve(imagePath)
    })
  })
}

async function prepareImage(imagePath, onProgress) {
  let path = imagePath
  let size = await getFileSize(path)
  console.log('[extract] original:', Math.round(size / 1024), 'KB')

  if (size > 0 && size <= CONFIG.MAX_IMAGE_SIZE) {
    onProgress && onProgress({ stage: 'ready', progress: 8, size })
    return { path, size, compressed: false }
  }

  for (let i = 0; i < CONFIG.COMPRESS_QUALITIES.length; i++) {
    const quality = CONFIG.COMPRESS_QUALITIES[i]
    onProgress && onProgress({ stage: 'compressing', progress: 8 + i * 6, quality })

    path = await compressImage(i === 0 ? imagePath : path, quality)
    size = await getFileSize(path)
    console.log('[extract] compressed q=' + quality + ':', Math.round(size / 1024), 'KB')

    if (size > 0 && size <= CONFIG.MAX_IMAGE_SIZE) {
      return { path, size, compressed: true }
    }
  }

  return { path, size, compressed: true }
}

function readFileBase64(filePath) {
  try {
    return wx.getFileSystemManager().readFileSync(filePath, 'base64')
  } catch (err) {
    console.error('[extract] read failed:', err)
    throw { code: 'READ_FAIL', message: '读取图片失败' }
  }
}

function saveArrayBufferPng(arrayBuffer) {
  return new Promise((resolve, reject) => {
    if (!arrayBuffer || !arrayBuffer.byteLength || arrayBuffer.byteLength < 32) {
      reject({ code: 'PARSE_FAIL', message: 'remove.bg 返回图片为空' })
      return
    }

    const filePath = `${wx.env.USER_DATA_PATH}/cutout_${Date.now()}.png`
    wx.getFileSystemManager().writeFile({
      filePath,
      data: arrayBuffer,
      success: () => resolve(filePath),
      fail: (err) => {
        console.error('[remove.bg] save failed:', err)
        reject({ code: 'SAVE_FAIL', message: '保存去背景图片失败' })
      }
    })
  })
}

function arrayBufferToString(arrayBuffer) {
  if (!arrayBuffer || !arrayBuffer.byteLength) return ''

  try {
    const bytes = new Uint8Array(arrayBuffer)
    let text = ''
    for (let i = 0; i < bytes.length; i++) {
      text += String.fromCharCode(bytes[i])
    }
    return decodeURIComponent(escape(text))
  } catch (err) {
    return ''
  }
}

function encodeFormData(data) {
  return Object.keys(data)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
    .join('&')
}

function parseRemoveBgError(res) {
  const fallback = `remove.bg request failed (${res.statusCode})`
  const text = typeof res.data === 'string' ? res.data : arrayBufferToString(res.data)
  if (!text) return fallback

  try {
    const json = JSON.parse(text)
    return json.errors && json.errors[0] && json.errors[0].title
      ? json.errors[0].title
      : fallback
  } catch (err) {
    return fallback
  }
}

// ========== 本地简单标签（兜底） ==========
function generateAutoTags(imagePath) {
  return new Promise((resolve) => {
    wx.getImageInfo({
      src: imagePath,
      success: (info) => {
        const tags = []
        const ratio = info.width && info.height ? info.width / info.height : 1
        if (ratio > 0.85 && ratio < 1.15) tags.push('方图', '贴纸')
        else if (ratio < 0.7) tags.push('竖图', '照片')
        else if (ratio > 1.4) tags.push('横图', '票根')
        tags.push('素材', '去背景')
        resolve(Array.from(new Set(tags)))
      },
      fail: () => resolve(['素材', '去背景'])
    })
  })
}

// ========== MiMo 智能标签 ==========
const MIMO_PROMPT = `你是电子手帐素材标签助手。请分析图片并返回严格 JSON，不要 Markdown，不要解释。

返回格式（严格 JSON）：
{
  "mainObject": "主要物体，中文短词",
  "materialType": "从 贴纸素材/小卡/票根/照片/文具/食物/饮品/人物/宠物/装饰物/其他 中选一个",
  "scene": "场景，中文短词，没有则填 无明显场景",
  "tags": ["8到12个中文搜索标签"],
  "styleTags": ["3到6个风格标签"],
  "colors": ["最多5个主要颜色"],
  "shape": "从 方图/竖图/横图/细长/不规则 中选一个",
  "confidence": 0.85
}`

function generateMiMoTags(imagePath) {
  return new Promise((resolve, reject) => {
    if (!CONFIG.MIMO_API_KEY) {
      reject({ code: 'NO_MIMO_KEY', message: '未配置 MiMo API Key' })
      return
    }

    // 读取图片为 base64
    let imageBase64
    try {
      imageBase64 = wx.getFileSystemManager().readFileSync(imagePath, 'base64')
    } catch (e) {
      reject({ code: 'READ_FAIL', message: '读取图片失败' })
      return
    }

    // 获取 mime 类型
    const ext = imagePath.split('.').pop().toLowerCase()
    const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }
    const mimeType = mimeMap[ext] || 'image/jpeg'

    const startTime = Date.now()
    console.log('[mimo] 开始识别...')

    wx.request({
      url: CONFIG.MIMO_URL,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${CONFIG.MIMO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: CONFIG.MIMO_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: MIMO_PROMPT },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 800
      },
      timeout: 60000,
      success: (res) => {
        const elapsed = Date.now() - startTime
        console.log('[mimo] 状态码:', res.statusCode, '耗时:', elapsed, 'ms')

        if (res.statusCode === 200) {
          try {
            const json = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
            const content = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content
            if (content) {
              // 解析 JSON（可能被 markdown 包裹）
              let cleanContent = content.trim()
              if (cleanContent.startsWith('```')) {
                cleanContent = cleanContent.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
              }
              const labels = JSON.parse(cleanContent)
              labels._mimoMs = elapsed
              console.log('[mimo] 识别成功:', labels.mainObject, labels.tags)
              resolve(labels)
            } else {
              reject({ code: 'MIMO_FAILED', message: 'MiMo 返回内容为空' })
            }
          } catch (e) {
            console.error('[mimo] 解析失败:', e)
            reject({ code: 'MIMO_FAILED', message: 'MiMo 返回数据解析失败' })
          }
        } else if (res.statusCode === 401) {
          reject({ code: 'MIMO_AUTH_ERROR', message: 'MiMo API Key 无效' })
        } else if (res.statusCode === 429) {
          reject({ code: 'MIMO_RATE_LIMIT', message: 'MiMo 请求频率超限' })
        } else {
          reject({ code: 'MIMO_FAILED', message: `MiMo 请求失败 (${res.statusCode})` })
        }
      },
      fail: (err) => {
        const elapsed = Date.now() - startTime
        console.error('[mimo] 请求失败:', err.errMsg, '耗时:', elapsed, 'ms')
        if (err.errMsg && err.errMsg.indexOf('timeout') !== -1) {
          reject({ code: 'MIMO_TIMEOUT', message: 'MiMo 识别超时' })
        } else if (err.errMsg && (err.errMsg.indexOf('ERR_NAME_NOT_RESOLVED') !== -1 || err.errMsg.indexOf('domain') !== -1)) {
          reject({ code: 'MIMO_DOMAIN_ERROR', message: 'MiMo 域名不可达，请确认 request 合法域名包含 https://api.mimo-v2.com' })
        } else {
          reject({ code: 'NETWORK_ERROR', message: err.errMsg || 'MiMo 网络请求失败' })
        }
      }
    })
  })
}

// MiMo 兜底标签
function getDefaultLabels(tags) {
  return {
    mainObject: '未知物体',
    materialType: '其他',
    scene: '无明显场景',
    tags: tags || ['素材', '贴纸', '未识别'],
    styleTags: ['日常'],
    colors: [],
    shape: '方图',
    confidence: 0
  }
}

async function removeBackground(imagePath, onProgress) {
  if (!CONFIG.REMOVE_BG_API_KEY) {
    throw { code: 'NO_KEY', message: '缺少 remove.bg API Key' }
  }

  const usage = checkUsageLimit()
  if (!usage.allowed) {
    throw { code: 'LIMIT', message: `本月次数已用完（${CONFIG.MONTHLY_FREE_LIMIT} 次/月）` }
  }

  const prepared = await prepareImage(imagePath, onProgress)
  if (prepared.size > CONFIG.MAX_IMAGE_SIZE) {
    throw {
      code: 'IMAGE_TOO_LARGE',
      message: `图片压缩后仍有 ${(prepared.size / 1024 / 1024).toFixed(1)}MB，请裁剪后重试`
    }
  }

  onProgress && onProgress({ stage: 'uploading', progress: 24, size: prepared.size })

  const imageBase64 = readFileBase64(prepared.path)

  return new Promise((resolve, reject) => {
    const startedAt = Date.now()
    console.log('[remove.bg] request:', Math.round(prepared.size / 1024), 'KB')

    wx.request({
      url: CONFIG.REMOVE_BG_URL,
      method: 'POST',
      header: {
        'X-Api-Key': CONFIG.REMOVE_BG_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: encodeFormData({
        image_file_b64: imageBase64,
        size: 'auto',
        format: 'png'
      }),
      responseType: 'arraybuffer',
      timeout: CONFIG.REQUEST_TIMEOUT,
      success: async (res) => {
        const elapsed = Date.now() - startedAt
        console.log('[remove.bg] status:', res.statusCode, 'elapsed:', elapsed, 'ms')

        if (res.statusCode !== 200) {
          const codeMap = {
            400: 'REMOVE_BG_BAD_IMAGE',
            402: 'REMOVE_BG_QUOTA_ERROR',
            403: 'REMOVE_BG_AUTH_ERROR',
            429: 'REMOVE_BG_RATE_LIMIT'
          }
          reject({
            code: codeMap[res.statusCode] || 'REMOVE_BG_FAILED',
            message: parseRemoveBgError(res)
          })
          return
        }

        try {
          onProgress && onProgress({ stage: 'saving', progress: 95 })
          const filePath = await saveArrayBufferPng(res.data)
          incrementUsage()
          resolve({
            resultPath: filePath,
            debug: {
              removeBgMs: elapsed,
              inputSizeKB: Math.round(prepared.size / 1024),
              compressed: prepared.compressed
            }
          })
        } catch (err) {
          reject(err)
        }
      },
      fail: (err) => {
        const errMsg = err && err.errMsg ? err.errMsg : ''
        console.error('[remove.bg] failed:', errMsg)

        if (errMsg.indexOf('timeout') !== -1) {
          reject({ code: 'REMOVE_BG_TIMEOUT', message: 'remove.bg 处理超时，请换小图或稍后重试' })
          return
        }

        reject({ code: 'NETWORK_ERROR', message: `网络请求失败：${errMsg || '未知错误'}` })
      }
    })
  })
}

async function extractSubject(imagePath, onProgress) {
  // 并行：remove.bg 去背景 + MiMo 打标签
  const cutoutPromise = removeBackground(imagePath, onProgress)
  const labelsPromise = generateMiMoTags(imagePath).catch((err) => {
    // MiMo 失败不影响去背景，使用兜底标签
    console.warn('[mimo] 失败，使用兜底标签:', err.message)
    return getDefaultLabels()
  })

  const [cutoutResult, labels] = await Promise.all([cutoutPromise, labelsPromise])

  // 从 labels 提取标签数组
  const tags = (labels && labels.tags && labels.tags.length > 0)
    ? labels.tags
    : await generateAutoTags(imagePath)

  return {
    resultPath: cutoutResult.resultPath,
    tags,
    labels: labels || getDefaultLabels(tags),
    debug: {
      ...cutoutResult.debug,
      mimoMs: labels && labels._mimoMs ? labels._mimoMs : 0
    }
  }
}

function applyStyle(imagePath) {
  return Promise.resolve(imagePath)
}

async function testMiMoVision(imagePath) {
  try {
    const labels = await generateMiMoTags(imagePath)
    console.log('[mimo:test]', labels)
    return labels
  } catch (err) {
    console.error('[mimo:test] failed:', err.code || 'UNKNOWN_ERROR', err.message || err)
    throw err
  }
}

module.exports = {
  CONFIG,
  checkUsageLimit,
  removeBackground,
  generateAutoTags,
  generateMiMoTags,
  getDefaultLabels,
  extractSubject,
  applyStyle,
  testMiMoVision
}
