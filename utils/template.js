/**
 * template.js - 模板系统
 * 提供预设的手账页模板
 */

const TEMPLATES = [
  {
    id: 'daily',
    name: '今日手帐',
    category: '日常',
    description: '记录今天的小确幸',
    background: '#FFFFFF',
    elements: [
      { type: 'decoration', subType: 'title', x: 345, y: 60, text: '今日手帐', fontSize: 48, color: '#4A3728', fontFamily: 'handwriting' },
      { type: 'decoration', subType: 'line', x: 345, y: 120, width: 500, color: '#FFD1DC' },
      { type: 'decoration', subType: 'date', x: 345, y: 160, fontSize: 28, color: '#8B7B6B' },
      { type: 'decoration', subType: 'box', x: 345, y: 460, width: 600, height: 600, color: '#FFF5F0', borderRadius: 20 },
      { type: 'decoration', subType: 'text', x: 345, y: 460, text: '今天的心情...', fontSize: 28, color: '#C4B5A6' }
    ]
  },
  {
    id: 'weekly',
    name: '一周碎片',
    category: '日常',
    description: '一周七天的美好瞬间',
    background: '#FFFAF5',
    elements: [
      { type: 'decoration', subType: 'title', x: 345, y: 60, text: '一周碎片', fontSize: 44, color: '#4A3728' },
      { type: 'decoration', subType: 'line', x: 345, y: 110, width: 400, color: '#A8D8EA' },
      // 7个小格子
      ...Array.from({length: 7}, (_, i) => ({
        type: 'decoration', subType: 'box',
        x: i < 4 ? 100 + (i % 4) * 160 : 100 + (i % 4) * 160,
        y: i < 4 ? 200 : 420,
        width: 140, height: 180,
        color: '#FFFFFF', borderRadius: 16
      }))
    ]
  },
  {
    id: 'photo_grid',
    name: '照片墙',
    category: '旅行',
    description: '展示你的精彩照片',
    background: '#F5F5F5',
    elements: [
      { type: 'decoration', subType: 'title', x: 345, y: 50, text: '照片记录', fontSize: 40, color: '#2D2D2D' },
      // 4个照片占位框
      { type: 'decoration', subType: 'photoFrame', x: 185, y: 260, width: 300, height: 300 },
      { type: 'decoration', subType: 'photoFrame', x: 505, y: 260, width: 300, height: 300 },
      { type: 'decoration', subType: 'photoFrame', x: 185, y: 600, width: 300, height: 300 },
      { type: 'decoration', subType: 'photoFrame', x: 505, y: 600, width: 300, height: 300 }
    ]
  },
  {
    id: 'collection',
    name: '小卡收藏',
    category: '追星',
    description: '展示你的小卡收藏',
    background: '#FFF0F5',
    elements: [
      { type: 'decoration', subType: 'title', x: 345, y: 60, text: '我的小卡收藏', fontSize: 40, color: '#FF69B4' },
      { type: 'decoration', subType: 'line', x: 345, y: 110, width: 300, color: '#FFB6C1' },
      // 小卡展示区
      { type: 'decoration', subType: 'box', x: 345, y: 460, width: 620, height: 700, color: '#FFFFFF', borderRadius: 20 }
    ]
  },
  {
    id: 'travel_ticket',
    name: '旅行票根',
    category: '旅行',
    description: '收集旅途中的票据',
    background: '#F0EDE8',
    elements: [
      { type: 'decoration', subType: 'title', x: 345, y: 60, text: '旅行记忆', fontSize: 44, color: '#3D2E1F' },
      { type: 'decoration', subType: 'line', x: 345, y: 110, width: 350, color: '#C4956A' },
      // 票根展示区
      { type: 'decoration', subType: 'ticketFrame', x: 345, y: 350, width: 580, height: 200 },
      { type: 'decoration', subType: 'ticketFrame', x: 345, y: 600, width: 580, height: 200 },
      { type: 'decoration', subType: 'text', x: 345, y: 820, text: '目的地：', fontSize: 28, color: '#7A6B5A' }
    ]
  },
  {
    id: 'fridge_magnet',
    name: '冰箱贴收藏',
    category: '周边',
    description: '展示你的冰箱贴',
    background: '#F5FBFF',
    elements: [
      { type: 'decoration', subType: 'title', x: 345, y: 60, text: '冰箱贴博物馆', fontSize: 40, color: '#1A3A5C' },
      // 冰箱贴展示网格
      ...Array.from({length: 9}, (_, i) => ({
        type: 'decoration', subType: 'circle',
        x: 130 + (i % 3) * 220,
        y: 200 + Math.floor(i / 3) * 250,
        radius: 80,
        color: '#FFFFFF',
        borderColor: '#87CEEB'
      }))
    ]
  },
  {
    id: 'mood_diary',
    name: '情绪日记',
    category: '日常',
    description: '记录今天的心情',
    background: '#FFF8F0',
    elements: [
      { type: 'decoration', subType: 'title', x: 345, y: 60, text: '今日心情', fontSize: 44, color: '#FF8BA7' },
      { type: 'decoration', subType: 'text', x: 345, y: 180, text: '心情记录', fontSize: 34, color: '#FF8BA7' },
      { type: 'decoration', subType: 'line', x: 345, y: 260, width: 400, color: '#FFD1DC' },
      { type: 'decoration', subType: 'box', x: 345, y: 520, width: 600, height: 440, color: '#FFFFFF', borderRadius: 20 },
      { type: 'decoration', subType: 'text', x: 345, y: 520, text: '今天想说...', fontSize: 28, color: '#C4B5A6' }
    ]
  },
  {
    id: 'coffee打卡',
    name: '咖啡店打卡',
    category: '生活',
    description: '记录喝过的咖啡',
    background: '#F5EDE3',
    elements: [
      { type: 'decoration', subType: 'title', x: 345, y: 60, text: '咖啡日记', fontSize: 40, color: '#8B6914' },
      { type: 'decoration', subType: 'line', x: 345, y: 110, width: 300, color: '#D2691E' },
      { type: 'decoration', subType: 'photoFrame', x: 345, y: 350, width: 500, height: 400 },
      { type: 'decoration', subType: 'text', x: 150, y: 600, text: '店名：', fontSize: 28, color: '#795548' },
      { type: 'decoration', subType: 'text', x: 150, y: 650, text: '饮品：', fontSize: 28, color: '#795548' },
      { type: 'decoration', subType: 'text', x: 150, y: 700, text: '评分：五分制', fontSize: 28, color: '#795548' }
    ]
  }
]

const TEMPLATE_CATEGORIES = ['全部', '日常', '旅行', '追星', '周边', '生活']

function getTemplates(category) {
  if (!category || category === '全部') return TEMPLATES
  return TEMPLATES.filter(t => t.category === category)
}

function getTemplateById(id) {
  return TEMPLATES.find(t => t.id === id) || null
}

module.exports = {
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  getTemplates,
  getTemplateById
}
