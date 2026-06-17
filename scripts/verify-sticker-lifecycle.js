const path = require('path')

const unlinked = []

global.wx = {
  _storage: {},
  env: { USER_DATA_PATH: 'usr' },
  getStorageSync(key) {
    return this._storage[key]
  },
  setStorageSync(key, value) {
    this._storage[key] = value
  },
  clearStorageSync() {
    this._storage = {}
  },
  getFileSystemManager() {
    return {
      unlinkSync(filePath) {
        unlinked.push(filePath)
      }
    }
  }
}

const storagePath = path.join(__dirname, '..', 'utils', 'storage.js')
delete require.cache[require.resolve(storagePath)]
const storage = require(storagePath)

const failures = []
let passes = 0

function expect(name, condition, detail = '') {
  if (condition) {
    passes += 1
    return
  }
  failures.push(detail ? `${name}: ${detail}` : name)
}

function reset() {
  wx.clearStorageSync()
  unlinked.length = 0
}

function createImagePageFixture() {
  const book = storage.createBook({ name: '验证手帐' })
  const page = storage.createPage(book.id)
  const sticker = storage.saveSticker({
    src: 'usr/page-photo.png',
    source: 'journal-photo',
    uniqueAsset: true,
    ownerBookId: book.id,
    ownerPageId: page.id,
    ownerElementId: 'el_photo'
  })
  storage.updatePage(page.id, {
    elements: [{
      id: 'el_photo',
      type: 'image',
      src: sticker.src,
      stickerAssetId: sticker.id
    }]
  })
  return { book, page, sticker }
}

reset()
{
  const { book, page, sticker } = createImagePageFixture()
  storage.deletePage(page.id)
  expect('deletePage removes the target page', storage.getPageById(page.id) === null)
  expect('deletePage removes unique page-owned sticker', storage.getStickers().every(item => item.id !== sticker.id))
  expect('deletePage keeps the cover page', storage.getPages(book.id).some(item => item.role === 'cover'))
  expect('deletePage unlinks orphaned local file', unlinked.includes('usr/page-photo.png'))
}

reset()
{
  const { book, page, sticker } = createImagePageFixture()
  const otherPage = storage.createPage(book.id)
  storage.updatePage(otherPage.id, {
    elements: [{
      id: 'el_reuse',
      type: 'image',
      src: sticker.src,
      stickerAssetId: sticker.id
    }]
  })
  storage.deletePage(page.id)
  expect('deletePage removes sticker record even when cleaning deleted page', storage.getStickers().every(item => item.id !== sticker.id))
  expect('deletePage does not unlink file still used by another page', !unlinked.includes('usr/page-photo.png'))
}

reset()
{
  const book = storage.createBook({
    name: '封面验证',
    coverImage: 'usr/cover.png'
  })
  const cover = storage.ensureCoverPage(book.id)
  const sticker = storage.saveSticker({
    src: 'usr/cover.png',
    source: 'journal-photo',
    uniqueAsset: true,
    ownerBookId: book.id,
    ownerPageId: cover.id,
    ownerElementId: 'cover_image'
  })
  storage.updatePage(cover.id, {
    elements: [{
      id: 'cover_image',
      type: 'image',
      src: 'usr/cover.png',
      stickerAssetId: sticker.id
    }]
  })
  storage.clearBookCoverImage(book.id, 'usr/cover.png')
  storage.deleteStickersForElements([{ id: 'cover_image', type: 'image', src: 'usr/cover.png', stickerAssetId: sticker.id }], {
    id: cover.id,
    bookId: book.id
  })
  expect('clearBookCoverImage clears book coverImage', storage.getBookById(book.id).coverImage === '')
  expect('cover sticker cleanup removes the sticker record', storage.getStickers().every(item => item.id !== sticker.id))
  expect('cover sticker cleanup can unlink former cover file', unlinked.includes('usr/cover.png'))
}

if (failures.length > 0) {
  console.error(`verify-sticker-lifecycle failed (${failures.length} failures):`)
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(`verify-sticker-lifecycle passed (${passes} checks)`)
