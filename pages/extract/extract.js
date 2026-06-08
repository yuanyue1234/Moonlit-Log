// pages/extract/extract.js - AI material extraction
const storage = require('../../utils/storage')
const aiUtil = require('../../utils/ai')
const fileUtil = require('../../utils/file')

const STAGE_TEXT = {
  compressing: '正在压缩图片...',
  ready: '准备上传...',
  uploading: '正在上传到 remove.bg...',
  processing: 'remove.bg 正在去背景...',
  saving: '正在保存结果...'
}

Page({
  data: {
    step: 'idle',
    originalImage: '',
    processedImage: '',
    progress: 0,
    stageText: '',
    uploadPercent: 0,
    autoTags: [],
    labels: null,
    debugInfo: null,
    errorMessage: '',
    errorCode: '',
    lastImagePath: '',
    monthlyRemaining: 50,
    currentStyle: 'none',
    showStylePicker: false,
    postProcessEffect: 'white-border',
    postProcessOptions: [
      { key: 'none', name: '无效果', desc: '保留透明 PNG 原样', icon: '/assets/icons/x.svg' },
      { key: 'white-border', name: '白边', desc: '主体轮廓描边', icon: '/assets/icons/sticker.svg' },
      { key: 'paper', name: '纸贴', desc: '贴合主体轮廓的纸边', icon: '/assets/icons/file-text.svg' },
      { key: 'shadow', name: '阴影', desc: '主体轮廓阴影', icon: '/assets/icons/layers.svg' }
    ],
    recentExtracts: [],
    extractResultId: '',
    savedStickerId: '',
    isSaving: false,
    selectedGroup: '',
    collectGroups: [],
  },

  onShow() {
    this.loadRecent()
    this.loadGroups()
    const usage = aiUtil.checkUsageLimit()
    this.setData({ monthlyRemaining: usage.remaining })
  },

  loadGroups() {
    const groups = storage.getGroups()
    this.setData({ collectGroups: groups })
  },

  loadRecent() {
    const stickers = storage.getStickers()
    this.setData({
      recentExtracts: stickers.filter(s => s.source === 'ai_extract').slice(0, 20)
    })
  },

  chooseFromAlbum() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => this.startProcessing(res.tempFiles[0].tempFilePath)
    })
  },

  takePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: (res) => this.startProcessing(res.tempFiles[0].tempFilePath)
    })
  },

  async startProcessing(imagePath) {
    const usage = aiUtil.checkUsageLimit()
    if (!usage.allowed) {
      this.setData({
        step: 'error',
        errorMessage: '本月可用次数已用完',
        errorCode: 'LIMIT',
        lastImagePath: imagePath
      })
      return
    }

    this.setData({
      step: 'processing',
      originalImage: imagePath,
      progress: 5,
      stageText: '正在准备图片...',
      uploadPercent: 0,
      errorMessage: '',
      errorCode: '',
      lastImagePath: imagePath,
      autoTags: [],
      labels: null,
      debugInfo: null,
      extractResultId: '',
      savedStickerId: '',
      isSaving: false
    })

    try {
      const result = await aiUtil.extractSubject(imagePath, (info = {}) => {
        this.setData({
          progress: info.progress || this.data.progress,
          uploadPercent: info.uploadPercent || this.data.uploadPercent,
          stageText: STAGE_TEXT[info.stage] || this.data.stageText || '正在处理...'
        })
      })

      let savedPath = result.resultPath
      try {
        savedPath = await fileUtil.persistFile(result.resultPath)
      } catch (err) {
        console.warn('[extract] persist skipped:', err)
      }

      this.setData({
        step: 'done',
        processedImage: savedPath,
        progress: 100,
        stageText: '处理完成',
        uploadPercent: 100,
        autoTags: result.tags || ['素材', '去背景'],
        labels: result.labels || null,
        debugInfo: result.debug || null,
        monthlyRemaining: aiUtil.checkUsageLimit().remaining,
        extractResultId: 'extract_' + Date.now(),
        savedStickerId: '',
        isSaving: false,
        postProcessEffect: 'white-border'
      })
    } catch (err) {
      console.error('[extract] failed:', err)
      this.setData({
        step: 'error',
        errorMessage: err.message || '处理失败，请重试',
        errorCode: err.code || 'UNKNOWN_ERROR',
        lastImagePath: imagePath
      })
    }
  },

  ensureSavedSticker() {
    const { processedImage, autoTags, labels, extractResultId, savedStickerId, postProcessEffect } = this.data
    if (!processedImage) return null
    if (savedStickerId) {
      storage.updateSticker(savedStickerId, { effect: postProcessEffect, tags: autoTags, labels })
      return savedStickerId
    }

    const stickers = storage.getStickers()
    const existing = stickers.find(s => s.extractResultId === extractResultId)
    if (existing) {
      if (existing.effect !== postProcessEffect) {
        storage.updateSticker(existing.id, { effect: postProcessEffect, tags: autoTags, labels })
      }
      this.setData({ savedStickerId: existing.id })
      return existing.id
    }

    const sticker = storage.saveSticker({
      src: processedImage,
      category: 'ai_extract',
      source: 'ai_extract',
      tags: autoTags,
      style: 'none',
      effect: postProcessEffect,
      labels,
      extractResultId,
      group: this.data.selectedGroup
    })
    this.setData({ savedStickerId: sticker.id })
    return sticker.id
  },

  saveToLibrary() {
    if (this.data.isSaving) return
    this.setData({ isSaving: true })
    const stickerId = this.ensureSavedSticker()
    this.setData({ isSaving: false })

    if (stickerId) {
      wx.showToast({ title: '已保存到素材库', icon: 'none' })
      this.loadRecent()
    }
  },

  putInJournal() {
    const stickerId = this.ensureSavedSticker()
    if (!stickerId) return

    const books = storage.getBooks()
    if (books.length === 0) {
      wx.showToast({ title: '请先新建手帐本', icon: 'none' })
      return
    }

    wx.navigateTo({
      url: `/pages/editor/editor?bookId=${books[0].id}&stickerId=${encodeURIComponent(stickerId)}`
    })
  },

  makeIntoJournal() {
    const stickerId = this.ensureSavedSticker()
    if (!stickerId) return

    const books = storage.getBooks()
    if (books.length === 0) {
      wx.showToast({ title: '请先新建手帐本', icon: 'none' })
      return
    }

    wx.navigateTo({
      url: `/pages/editor/editor?bookId=${books[0].id}&stickerId=${encodeURIComponent(stickerId)}&fromCollect=1`
    })
  },

  onSelectGroup(e) {
    const key = e.currentTarget.dataset.key
    // 点击已选中的分组则取消选中
    this.setData({ selectedGroup: this.data.selectedGroup === key ? '' : key })
  },

  onAddGroup() {
    wx.showModal({
      title: '添加分组',
      placeholderText: '输入分组名称',
      editable: true,
      success: (res) => {
        if (!res.confirm || !res.content || !res.content.trim()) return
        const name = res.content.trim()
        const added = storage.addGroup(name)
        if (added) {
          this.loadGroups()
          this.setData({ selectedGroup: added })
        }
      }
    })
  },

  reset() {
    this.setData({
      step: 'idle',
      originalImage: '',
      processedImage: '',
      progress: 0,
      stageText: '',
      uploadPercent: 0,
      errorMessage: '',
      errorCode: '',
      autoTags: [],
      labels: null,
      debugInfo: null,
      lastImagePath: '',
      extractResultId: '',
      savedStickerId: '',
      isSaving: false,
      postProcessEffect: 'white-border'
    })
  },

  onSelectPostProcess(e) {
    const effect = e.currentTarget.dataset.effect
    if (!effect) return
    this.setData({ postProcessEffect: effect })
  },

  retryFromLast() {
    if (this.data.lastImagePath) {
      this.startProcessing(this.data.lastImagePath)
      return
    }
    this.reset()
  },

  previewImage() {
    const url = this.data.processedImage || this.data.originalImage
    if (url) wx.previewImage({ urls: [url] })
  },

  testMiMoFromLastImage() {
    const imagePath = this.data.lastImagePath || this.data.originalImage || this.data.processedImage
    if (!imagePath) {
      console.warn('[mimo:test] no image available')
      return Promise.reject({ code: 'NO_IMAGE', message: '没有可测试的图片' })
    }
    return aiUtil.testMiMoVision(imagePath)
  },

  stopPropagation() {}
})
