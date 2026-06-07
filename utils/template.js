/**
 * template.js - 模板系统
 * 提供预设的手账页模板（包含文字、矩形、图片占位）
 */

const TEMPLATES = [
  {
    id: 'daily',
    name: '今日手帐',
    category: '日常',
    description: '记录今天的小确幸',
    background: '#FFFFFF',
    elements: [
      // 标题
      { type: 'decoration', subType: 'title', x: 345, y: 60, text: '今日手帐', fontSize: 48, color: '#4A3728', fontFamily: 'handwriting' },
      // 装饰线
      { type: 'decoration', subType: 'line', x: 345, y: 120, width: 500, color: '#FFD1DC' },
      // 日期
      { type: 'decoration', subType: 'date', x: 600, y: 60, fontSize: 24, color: '#8B7B6B' },
      // 图片占位框
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 300, width: 400, height: 250, fillColor: '#FFF5F0', strokeColor: '#E8DDD4', strokeWidth: 2, lineStyle: 'dashed', borderRadius: 16, text: '点击添加图片', textColor: '#C4B5A6', textFontSize: 24, zIndex: 1 },
      // 内容矩形框
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 600, width: 600, height: 400, fillColor: '#FFFFFF', strokeColor: '#E8DDD4', strokeWidth: 1, lineStyle: 'solid', borderRadius: 20, text: '今天的心情...', textColor: '#C4B5A6', textFontSize: 28, textAlign: 'left', textVertical: 'top', zIndex: 0 }
    ]
  },
  {
    id: 'weekly',
    name: '一周碎片',
    category: '日常',
    description: '一周七天的美好瞬间',
    background: '#FFFAF5',
    elements: [
      // 标题
      { type: 'decoration', subType: 'title', x: 345, y: 60, text: '一周碎片', fontSize: 44, color: '#4A3728' },
      // 装饰线
      { type: 'decoration', subType: 'line', x: 345, y: 110, width: 400, color: '#A8D8EA' },
      // 7个小格子 - 第一行4个
      ...Array.from({length: 4}, (_, i) => ({
        type: 'decoration', subType: 'rect', shapeType: 'roundRect',
        x: 100 + i * 160, y: 230,
        width: 140, height: 160,
        fillColor: '#FFFFFF', strokeColor: '#E8DDD4', strokeWidth: 1, lineStyle: 'solid', borderRadius: 12,
        text: ['周一', '周二', '周三', '周四'][i], textColor: '#8B7B6B', textFontSize: 22,
        zIndex: 1
      })),
      // 7个小格子 - 第二行3个
      ...Array.from({length: 3}, (_, i) => ({
        type: 'decoration', subType: 'rect', shapeType: 'roundRect',
        x: 180 + i * 160, y: 430,
        width: 140, height: 160,
        fillColor: '#FFFFFF', strokeColor: '#E8DDD4', strokeWidth: 1, lineStyle: 'solid', borderRadius: 12,
        text: ['周五', '周六', '周日'][i], textColor: '#8B7B6B', textFontSize: 22,
        zIndex: 1
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
      // 标题
      { type: 'decoration', subType: 'title', x: 345, y: 50, text: '照片记录', fontSize: 40, color: '#2D2D2D' },
      // 装饰线
      { type: 'decoration', subType: 'line', x: 345, y: 100, width: 300, color: '#DDDDDD' },
      // 4个照片占位框（2x2网格）
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 185, y: 260, width: 280, height: 280, fillColor: '#FFFFFF', strokeColor: '#CCCCCC', strokeWidth: 2, lineStyle: 'dashed', borderRadius: 12, text: '点击添加', textColor: '#CCCCCC', textFontSize: 20, zIndex: 1 },
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 505, y: 260, width: 280, height: 280, fillColor: '#FFFFFF', strokeColor: '#CCCCCC', strokeWidth: 2, lineStyle: 'dashed', borderRadius: 12, text: '点击添加', textColor: '#CCCCCC', textFontSize: 20, zIndex: 1 },
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 185, y: 580, width: 280, height: 280, fillColor: '#FFFFFF', strokeColor: '#CCCCCC', strokeWidth: 2, lineStyle: 'dashed', borderRadius: 12, text: '点击添加', textColor: '#CCCCCC', textFontSize: 20, zIndex: 1 },
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 505, y: 580, width: 280, height: 280, fillColor: '#FFFFFF', strokeColor: '#CCCCCC', strokeWidth: 2, lineStyle: 'dashed', borderRadius: 12, text: '点击添加', textColor: '#CCCCCC', textFontSize: 20, zIndex: 1 }
    ]
  },
  {
    id: 'travel',
    name: '旅行记忆',
    category: '旅行',
    description: '记录旅途中的风景',
    background: '#F0EDE8',
    elements: [
      // 标题
      { type: 'decoration', subType: 'title', x: 345, y: 60, text: '旅行记忆', fontSize: 44, color: '#3D2E1F' },
      // 装饰线
      { type: 'decoration', subType: 'line', x: 345, y: 110, width: 350, color: '#C4956A' },
      // 大图片占位框
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 300, width: 580, height: 300, fillColor: '#FFFFFF', strokeColor: '#C4956A', strokeWidth: 2, lineStyle: 'dashed', borderRadius: 16, text: '点击添加图片', textColor: '#B99A7A', textFontSize: 24, zIndex: 1 },
      // 信息卡片
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 550, width: 580, height: 200, fillColor: '#FFFFFF', strokeColor: '#E8DDD4', strokeWidth: 1, lineStyle: 'solid', borderRadius: 12, text: '目的地：\n日期：\n同行人：', textColor: '#7A6B5A', textFontSize: 26, textAlign: 'left', textVertical: 'middle', zIndex: 1 },
      // 底部装饰矩形
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 750, width: 200, height: 60, fillColor: '#C4956A', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 30, text: '添加标签', textColor: '#FFFFFF', textFontSize: 22, zIndex: 1 }
    ]
  },
  {
    id: 'food',
    name: '美食日记',
    category: '生活',
    description: '记录美味时刻',
    background: '#FFF8F0',
    elements: [
      // 标题
      { type: 'decoration', subType: 'title', x: 345, y: 60, text: '美食日记', fontSize: 40, color: '#8B6914' },
      // 装饰线
      { type: 'decoration', subType: 'line', x: 345, y: 110, width: 300, color: '#D2691E' },
      // 图片占位框
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 300, width: 400, height: 300, fillColor: '#FFFFFF', strokeColor: '#D2691E', strokeWidth: 2, lineStyle: 'dashed', borderRadius: 16, text: '点击添加图片', textColor: '#C69B77', textFontSize: 22, zIndex: 1 },
      // 评分卡
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 530, width: 400, height: 110, fillColor: '#FFF0E0', strokeColor: '#D2691E', strokeWidth: 1, lineStyle: 'solid', borderRadius: 12, text: '店名：\n菜品：\n评分：', textColor: '#795548', textFontSize: 24, textAlign: 'left', textVertical: 'middle', zIndex: 1 },
      // 底部备注区
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 700, width: 580, height: 150, fillColor: '#FFFFFF', strokeColor: '#E8DDD4', strokeWidth: 1, lineStyle: 'solid', borderRadius: 12, text: '备注：', textColor: '#C4B5A6', textFontSize: 24, textAlign: 'left', textVertical: 'top', zIndex: 0 }
    ]
  },
  {
    id: 'study',
    name: '学习笔记',
    category: '日常',
    description: '记录学习心得',
    background: '#F5F8FF',
    elements: [
      // 标题
      { type: 'decoration', subType: 'title', x: 345, y: 60, text: '学习笔记', fontSize: 40, color: '#2D5F8A' },
      // 装饰线
      { type: 'decoration', subType: 'line', x: 345, y: 110, width: 300, color: '#A8D8EA' },
      // 重点标记框
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 200, width: 600, height: 80, fillColor: '#E8F4FD', strokeColor: '#A8D8EA', strokeWidth: 2, lineStyle: 'solid', borderRadius: 12, text: '今日重点', textColor: '#2D5F8A', textFontSize: 26, textAlign: 'left', zIndex: 1 },
      // 内容区
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 480, width: 600, height: 400, fillColor: '#FFFFFF', strokeColor: '#E8DDD4', strokeWidth: 1, lineStyle: 'solid', borderRadius: 16, text: '笔记内容...', textColor: '#C4B5A6', textFontSize: 26, textAlign: 'left', textVertical: 'top', zIndex: 0 },
      // 底部统计区
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 750, width: 600, height: 60, fillColor: '#F0F5FF', strokeColor: '#A8D8EA', strokeWidth: 1, lineStyle: 'solid', borderRadius: 30, text: '学习时长：___分钟', textColor: '#7A8B9A', textFontSize: 22, zIndex: 1 }
    ]
  },
  {
    id: 'mood',
    name: '心情日记',
    category: '日常',
    description: '记录今天的心情',
    background: '#FFF0F5',
    elements: [
      // 标题
      { type: 'decoration', subType: 'title', x: 345, y: 60, text: '今日心情', fontSize: 44, color: '#FF8BA7' },
      // 装饰线
      { type: 'decoration', subType: 'line', x: 345, y: 110, width: 400, color: '#FFD1DC' },
      // 心情选择区
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 200, width: 600, height: 100, fillColor: '#FFFFFF', strokeColor: '#FFD1DC', strokeWidth: 1, lineStyle: 'solid', borderRadius: 50, text: '开心 / 平静 / 低落 / 疲惫', textColor: '#666666', textFontSize: 26, zIndex: 1 },
      // 内容区
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 480, width: 600, height: 350, fillColor: '#FFFFFF', strokeColor: '#FFD1DC', strokeWidth: 1, lineStyle: 'solid', borderRadius: 20, text: '今天想说...', textColor: '#C4B5A6', textFontSize: 28, textAlign: 'left', textVertical: 'top', zIndex: 0 },
      // 底部装饰
      { type: 'decoration', subType: 'rect', shapeType: 'circle', x: 345, y: 750, width: 80, height: 80, fillColor: '#FFD1DC', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 40, zIndex: 1 },
      { type: 'text', x: 345, y: 750, text: '♡', fontSize: 36, color: '#FF8BA7', zIndex: 2 }
    ]
  },
  {
    id: 'checklist',
    name: '清单打卡',
    category: '日常',
    description: '今日待办事项',
    background: '#F5FFF5',
    elements: [
      // 标题
      { type: 'decoration', subType: 'title', x: 345, y: 60, text: '今日清单', fontSize: 40, color: '#2D8A4E' },
      // 装饰线
      { type: 'decoration', subType: 'line', x: 345, y: 110, width: 300, color: '#A8D8B8' },
      // 待办行：文字放进矩形本身，方便整体替换/复制样式。
      ...Array.from({length: 8}, (_, i) => ({
        type: 'decoration', subType: 'rect', shapeType: 'roundRect',
        x: 380, y: 180 + i * 70,
        width: 460, height: 48,
        fillColor: 'transparent', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 12,
        text: `待办事项 ${i + 1}`, textColor: '#7A8B7A', textFontSize: 26, textAlign: 'left', textVertical: 'middle',
        zIndex: 1
      })),
      // 复选框
      ...Array.from({length: 8}, (_, i) => ({
        type: 'decoration', subType: 'rect', shapeType: 'roundRect',
        x: 160, y: 180 + i * 70,
        width: 40, height: 40,
        fillColor: '#FFFFFF', strokeColor: '#A8D8B8', strokeWidth: 2, lineStyle: 'solid', borderRadius: 8,
        zIndex: 2
      })),
      // 底部统计
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 780, width: 300, height: 60, fillColor: '#E8FFE8', strokeColor: '#A8D8B8', strokeWidth: 1, lineStyle: 'solid', borderRadius: 30, text: '完成：0/8', textColor: '#2D8A4E', textFontSize: 24, zIndex: 1 }
    ]
  }
]

const TEMPLATE_CATEGORIES = ['全部', '日常', '旅行', '生活']

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
