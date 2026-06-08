// utils/ai.js - AI tag generation

const CONFIG = {
  // MiMo 标签配置（MaxPlan / MiMo v2）
  MIMO_API_KEY: 'tp-ctf32lvhik73nbcwdgcyn83hfntz437uihs6jubwudfe59fu',
  MIMO_URL: 'https://api.mimo-v2.com/v1/chat/completions',
  MIMO_MODEL: 'mimo-v2-omni'
}

// 保留兼容占位（移除 remove.bg 后不再追踪使用次数）
function checkUsageLimit() {
  return { allowed: true, remaining: 0 }
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
        tags.push('素材')
        resolve(Array.from(new Set(tags)))
      },
      fail: () => resolve(['素材'])
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
  generateAutoTags,
  generateMiMoTags,
  applyStyle,
  testMiMoVision
}
