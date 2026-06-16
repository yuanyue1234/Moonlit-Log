// utils/pdf.js - 手帐本 PDF 导出（重写版）
// 逐页渲染为 JPEG，手动构建 PDF 二进制

const storage = require('./storage')

const PDF_PAGE_W = 595
const PDF_PAGE_H = 842

/**
 * 导出手帐本为 PDF
 */
function exportBookToPdf(bookId, onProgress) {
  return new Promise(async (resolve, reject) => {
    try {
      const book = storage.getBookById(bookId)
      if (!book) return reject(new Error('手帐本不存在'))

      const pages = storage.getPages(bookId)
      if (!pages || pages.length === 0) return reject(new Error('手帐本没有页面'))

      onProgress && onProgress({ stage: 'start', current: 0, total: pages.length, bookName: book.name })

      // 逐页渲染为 JPEG
      const images = []
      for (let i = 0; i < pages.length; i++) {
        onProgress && onProgress({ stage: 'rendering', current: i + 1, total: pages.length, bookName: book.name })
        const jpegBase64 = await renderPageToJpeg(pages[i])
        if (jpegBase64 && jpegBase64.length > 0) {
          var dim = getJpegDimensions(jpegBase64)
          images.push({ data: jpegBase64, width: dim.width, height: dim.height })
        }
      }

      if (images.length === 0) return reject(new Error('无法渲染页面'))

      onProgress && onProgress({ stage: 'building', current: images.length, total: pages.length, bookName: book.name })

      // 构建 PDF
      var pdfBase64 = buildPdf(images)
      var pdfPath = savePdf(pdfBase64, book.name || 'journal')

      onProgress && onProgress({ stage: 'done', current: images.length, total: pages.length, bookName: book.name, pdfPath: pdfPath })

      resolve({ pdfPath: pdfPath, pageCount: images.length, bookName: book.name })
    } catch (e) {
      reject(e)
    }
  })
}

// ============ 页面渲染 ============

function renderPageToJpeg(page) {
  return new Promise(function (resolve) {
    try {
      var canvas = wx.createOffscreenCanvas({
        type: '2d',
        width: page.width || 690,
        height: page.height || 920
      })
      var ctx = canvas.getContext('2d')
      var W = canvas.width
      var H = canvas.height

      // 背景
      ctx.fillStyle = page.background || '#FFFFFF'
      ctx.fillRect(0, 0, W, H)

      var elements = (page.elements || [])
      if (elements.length === 0) {
        resolve(canvasToJpeg(canvas))
        return
      }

      var sorted = elements.slice().sort(function (a, b) {
        return (a.zIndex || 0) - (b.zIndex || 0)
      })

      // 先收集图片加载任务
      var imageTasks = []
      var nonImageEls = []

      sorted.forEach(function (el) {
        if (el.type === 'image' && el.src) {
          imageTasks.push({ el: el, task: loadCanvasImage(canvas, el.src) })
        } else {
          nonImageEls.push(el)
        }
      })

      // 先绘制非图片元素（它们不需要异步加载）
      nonImageEls.forEach(function (el) { drawNonImageElement(ctx, el) })

      // 等待所有图片加载
      if (imageTasks.length > 0) {
        var promises = imageTasks.map(function (item) {
          return item.task.then(function (img) {
            if (img) drawImageElement(ctx, item.el, img)
          })
        })
        Promise.all(promises).then(function () {
          resolve(canvasToJpeg(canvas))
        }).catch(function () {
          resolve(canvasToJpeg(canvas))
        })
      } else {
        resolve(canvasToJpeg(canvas))
      }
    } catch (e) {
      console.error('[pdf] render failed:', e)
      resolve('')
    }
  })
}

function loadCanvasImage(canvas, src) {
  return new Promise(function (resolve) {
    try {
      var img = canvas.createImage()
      img.onload = function () { resolve(img) }
      img.onerror = function () {
        // 回退：fs 读取为 base64
        try {
          var fs = wx.getFileSystemManager()
          var data = fs.readFileSync(src, 'base64')
          var ext = (src.split('.').pop() || 'png').toLowerCase()
          var mime = (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : 'image/png'
          img.src = 'data:' + mime + ';base64,' + data
        } catch (e2) {
          resolve(null)
        }
      }
      img.src = src
    } catch (e) {
      resolve(null)
    }
  })
}

function drawImageElement(ctx, el, img) {
  ctx.save()
  var dx = el.x || 345
  var dy = el.y || 460
  var dw = el.width || 200
  var dh = el.height || 200
  var rot = el.rotation || 0
  var effect = el.effect || 'none'

  if (rot !== 0) {
    ctx.translate(dx, dy)
    ctx.rotate(rot * Math.PI / 180)
    if (effect === 'photo-frame') {
      drawPhotoFrameImage(ctx, img, -dw / 2, -dh / 2, dw, dh)
    } else {
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh)
    }
  } else {
    if (effect === 'photo-frame') {
      drawPhotoFrameImage(ctx, img, dx - dw / 2, dy - dh / 2, dw, dh)
    } else {
      ctx.drawImage(img, dx - dw / 2, dy - dh / 2, dw, dh)
    }
  }
  ctx.restore()
}

function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r || 0, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function drawPhotoFrameImage(ctx, img, x, y, w, h) {
  var pad = Math.max(8, Math.min(w, h) * 0.07)
  var bottom = Math.max(18, Math.min(w, h) * 0.16)
  var cardX = x - pad
  var cardY = y - pad
  var cardW = w + pad * 2
  var cardH = h + pad + bottom
  var radius = Math.max(10, pad * 1.1)

  ctx.save()
  ctx.shadowColor = 'rgba(122,86,58,0.16)'
  ctx.shadowBlur = Math.max(10, pad * 1.6)
  ctx.shadowOffsetY = Math.max(6, pad * 0.8)
  ctx.fillStyle = '#fffdf8'
  roundRectPath(ctx, cardX, cardY, cardW, cardH, radius)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = 'rgba(168,143,128,0.35)'
  ctx.lineWidth = Math.max(1, pad * 0.08)
  roundRectPath(ctx, cardX, cardY, cardW, cardH, radius)
  ctx.stroke()
  ctx.restore()

  ctx.save()
  roundRectPath(ctx, x, y, w, h, Math.max(8, pad * 0.6))
  ctx.clip()
  ctx.drawImage(img, x, y, w, h)
  ctx.restore()
}

function drawNonImageElement(ctx, el) {
  ctx.save()
  var x = el.x || 345
  var y = el.y || 600
  var rot = el.rotation || 0

  if (rot !== 0) {
    ctx.translate(x, y)
    ctx.rotate(rot * Math.PI / 180)
  }

  if (el.type === 'text') {
    var fs = el.fontSize || 28
    ctx.font = fs + 'px sans-serif'
    ctx.fillStyle = el.color || '#333333'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    var tx = rot !== 0 ? 0 : x
    var ty = rot !== 0 ? 0 : y
    ctx.fillText(el.text || '', tx, ty)
  } else if (el.type === 'decoration') {
    drawDecoration(ctx, el, rot, x, y)
  }

  ctx.restore()
}

function drawDecoration(ctx, el, rot, x, y) {
  var sub = el.subType
  var color = el.color || el.strokeColor || '#CCCCCC'
  var w = el.width || 100
  var h = el.height || 2

  if (sub === 'line') {
    ctx.strokeStyle = color
    ctx.lineWidth = h
    ctx.beginPath()
    if (rot !== 0) {
      ctx.moveTo(-w / 2, 0)
      ctx.lineTo(w / 2, 0)
    } else {
      ctx.moveTo(x - w / 2, y)
      ctx.lineTo(x + w / 2, y)
    }
    ctx.stroke()
  } else if (sub === 'rect' || sub === 'roundRect') {
    var fill = el.fillColor || el.fill || 'transparent'
    var lw = el.strokeWidth !== undefined ? el.strokeWidth : 2
    ctx.fillStyle = fill
    ctx.strokeStyle = color
    ctx.lineWidth = lw

    var rx, ry, rw, rh, rr
    if (rot !== 0) {
      rx = -w / 2; ry = -h / 2; rw = w; rh = h
    } else {
      rx = x - w / 2; ry = y - h / 2; rw = w; rh = h
    }
    rr = el.borderRadius || 0
    if (rr > 0) {
      rr = Math.min(rr, rw / 2, rh / 2)
    }

    if (rr > 0) {
      ctx.beginPath()
      ctx.moveTo(rx + rr, ry)
      ctx.lineTo(rx + rw - rr, ry)
      ctx.arcTo(rx + rw, ry, rx + rw, ry + rr, rr)
      ctx.lineTo(rx + rw, ry + rh - rr)
      ctx.arcTo(rx + rw, ry + rh, rx + rw - rr, ry + rh, rr)
      ctx.lineTo(rx + rr, ry + rh)
      ctx.arcTo(rx, ry + rh, rx, ry + rh - rr, rr)
      ctx.lineTo(rx, ry + rr)
      ctx.arcTo(rx, ry, rx + rr, ry, rr)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    } else {
      ctx.fillRect(rx, ry, rw, rh)
      ctx.strokeRect(rx, ry, rw, rh)
    }
  } else if (sub === 'circle') {
    ctx.fillStyle = color
    ctx.beginPath()
    if (rot !== 0) {
      ctx.arc(0, 0, (w + h) / 4, 0, Math.PI * 2)
    } else {
      ctx.arc(x, y, (w + h) / 4, 0, Math.PI * 2)
    }
    ctx.fill()
  }
}

function canvasToJpeg(canvas) {
  try {
    var dataUrl = canvas.toDataURL('image/jpeg', 0.6)
    return dataUrl.split(',')[1] || ''
  } catch (e) {
    return ''
  }
}

// ============ JPEG 尺寸解析 ============

function getJpegDimensions(base64) {
  try {
    // 支持 SOF0 (baseline) 和 SOF2 (progressive)
    var bin = base64ToStr(base64)
    var offset = 0
    while (offset < bin.length - 9) {
      if (bin.charCodeAt(offset) === 0xFF) {
        var marker = bin.charCodeAt(offset + 1)
        if (marker === 0xC0 || marker === 0xC2) {
          var h = (bin.charCodeAt(offset + 5) << 8) | bin.charCodeAt(offset + 6)
          var w = (bin.charCodeAt(offset + 7) << 8) | bin.charCodeAt(offset + 8)
          return { width: w, height: h }
        }
      }
      offset++
    }
  } catch (e) {}
  return { width: PDF_PAGE_W, height: PDF_PAGE_H }
}

// ============ PDF 构建（重写，正确 xref） ============

function buildPdf(images) {
  // 对象编号:
  //   0 = 默认空闲
  //   1 = Catalog
  //   2 = Pages
  //   针对每张图片 i (0-indexed):
  //     pageObj    = 3 + i*3
  //     contentObj = 4 + i*3
  //     xobjObj    = 5 + i*3
  var objCount = 3 + images.length * 3      // 1,2,3,4,5,...
  var parts = []
  var offsets = new Array(objCount + 1)
  for (var ii = 0; ii < offsets.length; ii++) offsets[ii] = 0

  function pos() {
    var s = 0
    for (var j = 0; j < parts.length; j++) s += parts[j].length
    return s
  }

  function write(data) {
    var bytes
    if (typeof data === 'string') {
      bytes = strToBytes(data)
    } else {
      bytes = data
    }
    parts.push(bytes)
    return bytes.length
  }

  // Header
  write('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')

  // Object 1: Catalog
  offsets[1] = pos()
  write('1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n')

  // Object 2: Pages
  var kids = []
  for (var i = 0; i < images.length; i++) {
    kids.push((3 + i * 3) + ' 0 R')
  }
  offsets[2] = pos()
  write('2 0 obj\n<</Type/Pages/Kids[' + kids.join(' ') + ']/Count ' + images.length + '>>\nendobj\n')

  // 每张图片: Page + Content + XObject
  for (var i2 = 0; i2 < images.length; i2++) {
    var img = images[i2]
    var pn = 3 + i2 * 3
    var cn = pn + 1
    var xn = pn + 2
    var w = img.width || PDF_PAGE_W
    var h = img.height || PDF_PAGE_H

    // Page
    offsets[pn] = pos()
    write(pn + ' 0 obj\n<</Type/Page/Parent 2 0 R/MediaBox[0 0 ' + w + ' ' + h + ']/Contents ' + cn + ' 0 R/Resources<</XObject<</Im0 ' + xn + ' 0 R>>>>>>\nendobj\n')

    // Content stream
    var stream = 'q\n' + w + ' 0 0 ' + h + ' 0 0 cm\n/Im0 Do\nQ'
    offsets[cn] = pos()
    write(cn + ' 0 obj\n<</Length ' + stream.length + '>>\nstream\n' + stream + '\nendstream\nendobj\n')

    // Image XObject (JPEG / DCTDecode)
    var jpegBytes = base64ToUint8Array(img.data)
    offsets[xn] = pos()
    write(xn + ' 0 obj\n<</Type/XObject/Subtype/Image/Width ' + w + '/Height ' + h + '/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ' + jpegBytes.length + '>>\nstream\n')
    write(jpegBytes)
    write('\nendstream\nendobj\n')
  }

  // Cross-reference table
  var xrefOffset = pos()
  write('xref\n')
  write('0 ' + (objCount + 1) + '\n')
  write('0000000000 65535 f \n')
  for (var i3 = 1; i3 <= objCount; i3++) {
    write(('0000000000' + offsets[i3]).slice(-10) + ' 00000 n \n')
  }

  // Trailer
  write('trailer\n<</Size ' + (objCount + 1) + '/Root 1 0 R>>\n')
  write('startxref\n' + xrefOffset + '\n')
  write('%%EOF\n')

  // 拼接所有字节并返回 base64
  var totalLen = pos()
  var result = new Uint8Array(totalLen)
  var off = 0
  for (var k = 0; k < parts.length; k++) {
    result.set(parts[k], off)
    off += parts[k].length
  }
  return uint8ArrayToBase64(result)
}

// ============ 工具函数 ============

function strToBytes(str) {
  var bytes = new Uint8Array(str.length)
  for (var i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i) & 0xFF
  }
  return bytes
}

function base64ToStr(base64) {
  try {
    var buf = wx.base64ToArrayBuffer(base64)
    var arr = new Uint8Array(buf)
    var str = ''
    for (var i = 0; i < arr.length; i++) {
      str += String.fromCharCode(arr[i])
    }
    return str
  } catch (e) {
    return ''
  }
}

function base64ToUint8Array(base64) {
  try {
    var buf = wx.base64ToArrayBuffer(base64)
    return new Uint8Array(buf)
  } catch (e) {
    return new Uint8Array(0)
  }
}

function uint8ArrayToBase64(arr) {
  try {
    return wx.arrayBufferToBase64(arr.buffer)
  } catch (e) {
    return ''
  }
}

function savePdf(pdfBase64, bookName) {
  var fs = wx.getFileSystemManager()
  var safeName = (bookName || 'journal').replace(/[<>:"/\\|?*]/g, '_')

  // 清理所有临时/旧文件，释放 USER_DATA_PATH 存储空间
  // PC 端微信有 10MB 总上限，旧文件堆积会导致 writeFileSync 报 storage limit exceeded
  try {
    var files = fs.readdirSync(wx.env.USER_DATA_PATH)
    for (var i = 0; i < files.length; i++) {
      var name = files[i]
      if (name.endsWith('.pdf')) {
        try { fs.unlinkSync(wx.env.USER_DATA_PATH + '/' + name) } catch (e2) {}
      }
    }
  } catch (e) {}

  var pdfPath = wx.env.USER_DATA_PATH + '/' + safeName + '_' + Date.now() + '.pdf'

  // 转为 ArrayBuffer 二进制写入，比 base64 字符串写入小约 25%
  var arrayBuffer = wx.base64ToArrayBuffer(pdfBase64)
  fs.writeFileSync(pdfPath, arrayBuffer)

  // 验证文件大小
  try {
    var stat = fs.statSync(pdfPath, false)
    if (stat.size < 100) throw new Error('PDF too small')
  } catch (e) {
    throw new Error('PDF 写入失败: ' + (e.message || '文件过小'))
  }

  return pdfPath
}

module.exports = { exportBookToPdf }
