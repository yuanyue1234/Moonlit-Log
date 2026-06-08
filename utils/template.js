/**
 * template.js - 模板系统
 * 提供预设的手帐页模板（包含文字、矩形、装饰）
 */

const TEMPLATES = [
  {
    id: 'daily',
    name: '今日手帐',
    category: '日常',
    description: '记录今天的小确幸',
    background: '#FFFFFE',
    elements: [
      // 顶部装饰色块
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 345, y: 0, width: 750, height: 16, fillColor: '#FF6B6B', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', zIndex: 10 },
      // 日期标签 - 圆角药丸
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 560, y: 48, width: 160, height: 44, fillColor: '#FFF0F0', strokeColor: '#FF6B6B', strokeWidth: 1, lineStyle: 'solid', borderRadius: 22, text: '', textColor: '#FF6B6B', textFontSize: 20, zIndex: 5 },
      { type: 'decoration', subType: 'date', x: 560, y: 48, fontSize: 20, color: '#FF6B6B' },
      // 标题
      { type: 'decoration', subType: 'title', x: 220, y: 48, text: '今日手帐', fontSize: 48, color: '#2D2D2D', fontFamily: 'handwriting', textAlign: 'left' },
      // 标题下方装饰星星
      { type: 'decoration', subType: 'rect', shapeType: 'star', x: 100, y: 52, width: 20, height: 20, fillColor: '#FFD93D', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', zIndex: 5 },
      // 装饰分割线
      { type: 'decoration', subType: 'line', x: 345, y: 110, width: 520, color: '#E8E8E8', strokeWidth: 2 },
      // 圆形装饰点
      { type: 'decoration', subType: 'rect', shapeType: 'circle', x: 80, y: 160, width: 12, height: 12, fillColor: '#FF6B6B', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', zIndex: 5 },
      { type: 'decoration', subType: 'rect', shapeType: 'circle', x: 660, y: 160, width: 12, height: 12, fillColor: '#FFD93D', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', zIndex: 5 },
      // 主图片区 - 拍立得风格（白边框+阴影感）
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 345, y: 300, width: 480, height: 340, fillColor: '#FFFFFF', strokeColor: '#EFEFEF', strokeWidth: 1, lineStyle: 'solid', zIndex: 0 },
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 300, width: 420, height: 280, fillColor: '#FFF5F0', strokeColor: '#E8DDD4', strokeWidth: 2, lineStyle: 'dashed', borderRadius: 12, text: '点击添加图片', textColor: '#C4B5A6', textFontSize: 24, zIndex: 1 },
      // 拍立得底部手写文字位
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 488, width: 320, height: 36, fillColor: 'transparent', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 8, text: '', textColor: '#B0A090', textFontSize: 22, zIndex: 2 },
      // 纸胶带装饰
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 100, y: 290, width: 80, height: 30, fillColor: 'rgba(255, 107, 107, 0.3)', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', zIndex: 5 },
      // 内容区
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 620, width: 620, height: 280, fillColor: '#FAFAFA', strokeColor: '#E8E8E8', strokeWidth: 1, lineStyle: 'solid', borderRadius: 16, text: '今天的心情...', textColor: '#C4B5A6', textFontSize: 28, textAlign: 'left', textVertical: 'top', zIndex: 0 },
      // 左侧彩色标签条
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 60, y: 620, width: 6, height: 280, fillColor: '#FF6B6B', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 3, zIndex: 1 },
      // 底部小标签
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 180, y: 780, width: 130, height: 40, fillColor: '#FFF0F0', strokeColor: '#FF6B6B', strokeWidth: 1, lineStyle: 'solid', borderRadius: 20, text: '#日常', textColor: '#FF6B6B', textFontSize: 20, zIndex: 5 },
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 330, y: 780, width: 130, height: 40, fillColor: '#F0F8FF', strokeColor: '#4ECDC4', strokeWidth: 1, lineStyle: 'solid', borderRadius: 20, text: '#心情', textColor: '#4ECDC4', textFontSize: 20, zIndex: 5 }
    ]
  },
  {
    id: 'weekly',
    name: '一周碎片',
    category: '日常',
    description: '一周七天的美好瞬间',
    background: '#FFFFFE',
    elements: [
      // 顶部渐变装饰条
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 345, y: 0, width: 750, height: 12, fillColor: '#A8D8EA', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', zIndex: 10 },
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 345, y: 12, width: 750, height: 4, fillColor: '#AA96DA', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', zIndex: 10 },
      // 标题
      { type: 'decoration', subType: 'title', x: 200, y: 52, text: '一周碎片', fontSize: 46, color: '#2D2D2D', fontFamily: 'handwriting', textAlign: 'left' },
      // 副标题
      { type: 'decoration', subType: 'title', x: 200, y: 90, text: 'WEEKLY FRAGMENTS', fontSize: 18, color: '#A8A8A8' },
      // 装饰圆点连线
      { type: 'decoration', subType: 'line', x: 345, y: 130, width: 550, color: '#E8E8E8', strokeWidth: 1 },
      // 日期范围标签
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 158, width: 280, height: 40, fillColor: '#F5F0FF', strokeColor: '#AA96DA', strokeWidth: 1, lineStyle: 'solid', borderRadius: 20, text: '', textColor: '#AA96DA', textFontSize: 20, zIndex: 5 },
      { type: 'decoration', subType: 'date', x: 345, y: 158, fontSize: 20, color: '#AA96DA' },
      // 7 个日卡片 - 2 行: 4+3
      ...Array.from({ length: 7 }, (_, i) => {
        const row = i < 4 ? 0 : 1
        const col = i < 4 ? i : i - 4
        const x = 100 + col * 145 + (row === 1 ? 72 : 0)
        const y = 210 + row * 230
        const colors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#AA96DA', '#FF8BA7', '#FFB347']
        const days = ['一', '二', '三', '四', '五', '六', '日']
        const isWeekend = i >= 5
        return [
          // 日卡片背景 - 周末用特殊颜色
          { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x, y, width: 125, height: 165, fillColor: isWeekend ? '#FFF5F5' : '#FFFFFF', strokeColor: isWeekend ? '#FF8BA7' : '#E8E8E8', strokeWidth: isWeekend ? 2 : 1, lineStyle: isWeekend ? 'solid' : 'solid', borderRadius: 14, zIndex: 0 },
          // 彩色顶部条
          { type: 'decoration', subType: 'rect', shapeType: 'rect', x, y: y - 82 + 3, width: 125, height: 6, fillColor: colors[i], strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 3, zIndex: 1 },
          // 星期标签
          { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x, y: y + 2, width: 40, height: 28, fillColor: colors[i], strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 14, text: days[i], textColor: '#FFFFFF', textFontSize: 18, zIndex: 2 },
          // 内容占位
          { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x, y: y + 48, width: 105, height: 90, fillColor: '#F8F8F8', strokeColor: '#E8E8E8', strokeWidth: 1, lineStyle: 'dashed', borderRadius: 8, text: '', textColor: '#C4C4C4', textFontSize: 16, zIndex: 1 }
        ]
      }).flat(),
      // 底部总结区
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 700, width: 560, height: 70, fillColor: '#F8F8F8', strokeColor: '#E8E8E8', strokeWidth: 1, lineStyle: 'solid', borderRadius: 35, text: '本周小结：————', textColor: '#999', textFontSize: 24, zIndex: 0 }
    ]
  },
  {
    id: 'photo_grid',
    name: '照片墙',
    category: '旅行',
    description: '展示你的精彩照片',
    background: '#F8F6F0',
    elements: [
      // 顶部胶片条装饰
      ...Array.from({ length: 8 }, (_, i) => ({
        type: 'decoration', subType: 'rect', shapeType: 'rect', x: 45 + i * 95, y: 0, width: 85, height: 10, fillColor: i % 2 === 0 ? '#4A3728' : '#C4956A', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', zIndex: 10
      })),
      // 标题
      { type: 'decoration', subType: 'title', x: 200, y: 48, text: '照片墙', fontSize: 44, color: '#3D2E1F', fontFamily: 'handwriting', textAlign: 'left' },
      { type: 'decoration', subType: 'title', x: 200, y: 82, text: 'PHOTO ALBUM', fontSize: 16, color: '#B99A7A' },
      // 装饰线
      { type: 'decoration', subType: 'line', x: 80, y: 105, width: 160, color: '#C4956A', strokeWidth: 2 },
      // 胶片齿孔装饰
      ...Array.from({ length: 5 }, (_, i) => ({
        type: 'decoration', subType: 'rect', shapeType: 'circle', x: 630, y: 20 + i * 30, width: 8, height: 8, fillColor: '#E8DDD4', strokeColor: '#D4C4B4', strokeWidth: 1, lineStyle: 'solid', zIndex: 5
      })),
      // 日期角标
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 580, y: 115, width: 130, height: 38, fillColor: '#4A3728', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 19, text: '', textColor: '#FFFFFF', textFontSize: 20, zIndex: 5 },
      { type: 'decoration', subType: 'date', x: 580, y: 115, fontSize: 20, color: '#FFFFFF' },
      // 4 照片胶片框 - 2x2 但不规则偏移
      // 左上
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 170, y: 210, width: 260, height: 280, fillColor: '#FFFFFF', strokeColor: '#D4C4B4', strokeWidth: 1, lineStyle: 'solid', zIndex: 0 },
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 170, y: 210, width: 240, height: 260, fillColor: '#FFF8F0', strokeColor: '#E8DDD4', strokeWidth: 2, lineStyle: 'dashed', borderRadius: 4, text: '📷', textColor: '#D4C4B4', textFontSize: 32, zIndex: 1 },
      // 右上
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 520, y: 190, width: 260, height: 280, fillColor: '#FFFFFF', strokeColor: '#D4C4B4', strokeWidth: 1, lineStyle: 'solid', zIndex: 0 },
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 520, y: 190, width: 240, height: 260, fillColor: '#FFF8F0', strokeColor: '#E8DDD4', strokeWidth: 2, lineStyle: 'dashed', borderRadius: 4, text: '📷', textColor: '#D4C4B4', textFontSize: 32, zIndex: 1 },
      // 左下（偏移）
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 350, y: 530, width: 260, height: 280, fillColor: '#FFFFFF', strokeColor: '#D4C4B4', strokeWidth: 1, lineStyle: 'solid', zIndex: 0 },
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 350, y: 530, width: 240, height: 260, fillColor: '#FFF8F0', strokeColor: '#E8DDD4', strokeWidth: 2, lineStyle: 'dashed', borderRadius: 4, text: '📷', textColor: '#D4C4B4', textFontSize: 32, zIndex: 1 },
      // 右下
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 160, y: 510, width: 260, height: 280, fillColor: '#FFFFFF', strokeColor: '#D4C4B4', strokeWidth: 1, lineStyle: 'solid', zIndex: 0 },
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 160, y: 510, width: 240, height: 260, fillColor: '#FFF8F0', strokeColor: '#E8DDD4', strokeWidth: 2, lineStyle: 'dashed', borderRadius: 4, text: '📷', textColor: '#D4C4B4', textFontSize: 32, zIndex: 1 },
      // 纸胶带装饰（连接两张照片）
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 440, y: 205, width: 80, height: 28, fillColor: 'rgba(196, 149, 106, 0.25)', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 4, zIndex: 5 },
      // 底部备注区
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 520, y: 555, width: 260, height: 55, fillColor: '#4A3728', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 12, text: '更多照片 →', textColor: '#FFFFFF', textFontSize: 22, zIndex: 3 }
    ]
  },
  {
    id: 'travel',
    name: '旅行记忆',
    category: '旅行',
    description: '记录旅途中的风景',
    background: '#FDFBF7',
    elements: [
      // 顶部装饰条 - 世界地图风格
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 345, y: 0, width: 750, height: 8, fillColor: '#2D5F8A', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', zIndex: 10 },
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 345, y: 8, width: 750, height: 2, fillColor: '#C4956A', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', zIndex: 10 },
      // 护照风格印章
      { type: 'decoration', subType: 'rect', shapeType: 'circle', x: 630, y: 55, width: 56, height: 56, fillColor: 'transparent', strokeColor: '#8B0000', strokeWidth: 2, lineStyle: 'dashed', borderRadius: 28, zIndex: 5, text: 'PASS', textColor: '#8B0000', textFontSize: 18 },
      // 标题
      { type: 'decoration', subType: 'title', x: 200, y: 48, text: '旅行记忆', fontSize: 48, color: '#3D2E1F', fontFamily: 'handwriting', textAlign: 'left' },
      { type: 'decoration', subType: 'title', x: 200, y: 84, text: 'TRAVEL MEMORIES', fontSize: 16, color: '#8B7B6B' },
      // 装饰线
      { type: 'decoration', subType: 'line', x: 80, y: 108, width: 200, color: '#C4956A', strokeWidth: 2 },
      // 装饰图钉
      { type: 'decoration', subType: 'rect', shapeType: 'circle', x: 80, y: 165, width: 16, height: 16, fillColor: '#FF6B6B', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 8, zIndex: 5 },
      { type: 'decoration', subType: 'rect', shapeType: 'circle', x: 80, y: 172, width: 4, height: 12, fillColor: '#FF6B6B', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 2, zIndex: 5 },
      // 大图占位 - 旅行照片
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 270, width: 560, height: 320, fillColor: '#FFF8F0', strokeColor: '#C4956A', strokeWidth: 2, lineStyle: 'dashed', borderRadius: 16, text: '点击添加旅行照片', textColor: '#B99A7A', textFontSize: 24, zIndex: 1 },
      // 照片角标装饰
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 80, y: 240, width: 70, height: 28, fillColor: 'rgba(196, 149, 106, 0.2)', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 4, zIndex: 5 },
      // 目的地信息卡
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 520, width: 600, height: 160, fillColor: '#FFFFFF', strokeColor: '#E8DDD4', strokeWidth: 1, lineStyle: 'solid', borderRadius: 14, zIndex: 0 },
      // 信息卡左侧彩色条
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 75, y: 520, width: 6, height: 160, fillColor: '#2D5F8A', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 3, zIndex: 1 },
      // 信息文字
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 220, y: 535, width: 250, height: 130, fillColor: 'transparent', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 8, text: '目的地\n日期\n同行人', textColor: '#8B7B6B', textFontSize: 24, textAlign: 'left', textVertical: 'middle', zIndex: 2 },
      // 地图小图标装饰
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 530, y: 545, width: 100, height: 100, fillColor: '#F0F5FF', strokeColor: '#2D5F8A', strokeWidth: 1, lineStyle: 'dashed', borderRadius: 12, text: '🧭', textColor: '#2D5F8A', textFontSize: 36, zIndex: 2 },
      // 底部标签
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 180, y: 750, width: 160, height: 42, fillColor: '#2D5F8A', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 21, text: '#旅行2024', textColor: '#FFFFFF', textFontSize: 20, zIndex: 5 },
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 370, y: 750, width: 140, height: 42, fillColor: '#C4956A', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 21, text: '#风景', textColor: '#FFFFFF', textFontSize: 20, zIndex: 5 },
      // 底部装饰小飞机
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 600, y: 750, width: 80, height: 42, fillColor: 'transparent', strokeColor: '#E8DDD4', strokeWidth: 1, lineStyle: 'solid', borderRadius: 21, text: '✈️', textColor: '#8B7B6B', textFontSize: 24, zIndex: 5 }
    ]
  },
  {
    id: 'food',
    name: '美食日记',
    category: '生活',
    description: '记录美味时刻',
    background: '#FFFFFE',
    elements: [
      // 顶部装饰
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 345, y: 0, width: 750, height: 10, fillColor: '#FF8BA7', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', zIndex: 10 },
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 345, y: 10, width: 750, height: 3, fillColor: '#FFD93D', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', zIndex: 10 },
      // 标题
      { type: 'decoration', subType: 'title', x: 200, y: 46, text: '美食日记', fontSize: 46, color: '#3D2E1F', fontFamily: 'handwriting', textAlign: 'left' },
      { type: 'decoration', subType: 'title', x: 200, y: 80, text: 'FOOD JOURNAL', fontSize: 16, color: '#FF8BA7' },
      // 装饰叉勺
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 640, y: 45, width: 44, height: 44, fillColor: '#FFF0F5', strokeColor: '#FF8BA7', strokeWidth: 1, lineStyle: 'solid', borderRadius: 22, text: '🍽', textColor: '#FF8BA7', textFontSize: 24, zIndex: 5 },
      // 分割线
      { type: 'decoration', subType: 'line', x: 80, y: 108, width: 160, color: '#FFD1DC', strokeWidth: 2 },
      // 美食照片 - 偏左
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 220, y: 260, width: 380, height: 320, fillColor: '#FFF8F0', strokeColor: '#FF8BA7', strokeWidth: 2, lineStyle: 'dashed', borderRadius: 16, text: '点击添加美食照片', textColor: '#C69B77', textFontSize: 22, zIndex: 1 },
      // 右侧评分区
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 560, y: 260, width: 160, height: 200, fillColor: '#FFF0F5', strokeColor: '#FF8BA7', strokeWidth: 1, lineStyle: 'solid', borderRadius: 14, zIndex: 0 },
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 560, y: 270, width: 60, height: 28, fillColor: '#FF8BA7', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 14, text: '评分', textColor: '#FFFFFF', textFontSize: 18, zIndex: 2 },
      // 星星
      { type: 'decoration', subType: 'rect', shapeType: 'star', x: 535, y: 340, width: 18, height: 18, fillColor: '#FFD93D', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', zIndex: 2 },
      { type: 'decoration', subType: 'rect', shapeType: 'star', x: 560, y: 340, width: 18, height: 18, fillColor: '#FFD93D', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', zIndex: 2 },
      { type: 'decoration', subType: 'rect', shapeType: 'star', x: 585, y: 340, width: 18, height: 18, fillColor: '#FFD93D', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', zIndex: 2 },
      { type: 'decoration', subType: 'rect', shapeType: 'star', x: 535, y: 365, width: 18, height: 18, fillColor: '#FFD93D', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', zIndex: 2 },
      { type: 'decoration', subType: 'rect', shapeType: 'star', x: 560, y: 365, width: 18, height: 18, fillColor: '#E8E8E8', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', zIndex: 2 },
      // 价格标签
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 560, y: 390, width: 100, height: 32, fillColor: '#F8F8F8', strokeColor: '#E8E8E8', strokeWidth: 1, lineStyle: 'solid', borderRadius: 16, text: '¥___', textColor: '#FF8BA7', textFontSize: 20, zIndex: 2 },
      // 餐厅信息
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 550, width: 580, height: 100, fillColor: '#FFFFFF', strokeColor: '#E8E8E8', strokeWidth: 1, lineStyle: 'solid', borderRadius: 14, zIndex: 0 },
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 200, y: 565, width: 260, height: 70, fillColor: 'transparent', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 8, text: '店名\n菜品', textColor: '#8B7B6B', textFontSize: 24, textAlign: 'left', textVertical: 'middle', zIndex: 2 },
      // 味觉笔记
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 690, width: 580, height: 130, fillColor: '#FFF8F5', strokeColor: '#FFD1DC', strokeWidth: 1, lineStyle: 'solid', borderRadius: 14, text: '味觉笔记...', textColor: '#C69B77', textFontSize: 26, textAlign: 'left', textVertical: 'top', zIndex: 0 },
      // 左侧彩色条
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 75, y: 690, width: 6, height: 130, fillColor: '#FF8BA7', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 3, zIndex: 1 }
    ]
  },
  {
    id: 'study',
    name: '学习笔记',
    category: '日常',
    description: '记录学习心得',
    background: '#FFFFFE',
    elements: [
      // 顶部装饰
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 345, y: 0, width: 750, height: 8, fillColor: '#2D5F8A', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', zIndex: 10 },
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 345, y: 8, width: 750, height: 2, fillColor: '#A8D8EA', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', zIndex: 10 },
      // 标题
      { type: 'decoration', subType: 'title', x: 200, y: 46, text: '学习笔记', fontSize: 46, color: '#2D5F8A', fontFamily: 'handwriting', textAlign: 'left' },
      { type: 'decoration', subType: 'title', x: 200, y: 80, text: 'STUDY NOTES', fontSize: 16, color: '#7A9BB5' },
      // 书签装饰
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 645, y: 30, width: 40, height: 70, fillColor: '#A8D8EA', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 4, zIndex: 5 },
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 655, y: 30, width: 4, height: 70, fillColor: '#2D5F8A', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 2, zIndex: 6 },
      // 分割线
      { type: 'decoration', subType: 'line', x: 80, y: 108, width: 160, color: '#A8D8EA', strokeWidth: 2 },
      // 日期
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 600, y: 40, width: 130, height: 38, fillColor: '#E8F4FD', strokeColor: '#A8D8EA', strokeWidth: 1, lineStyle: 'solid', borderRadius: 19, text: '', textColor: '#2D5F8A', textFontSize: 20, zIndex: 5 },
      { type: 'decoration', subType: 'date', x: 600, y: 40, fontSize: 20, color: '#2D5F8A' },
      // 重点标记区
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 155, width: 600, height: 70, fillColor: '#FFF8E1', strokeColor: '#FFD93D', strokeWidth: 2, lineStyle: 'solid', borderRadius: 12, zIndex: 0 },
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 80, y: 155, width: 6, height: 70, fillColor: '#FFD93D', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 3, zIndex: 1 },
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 220, y: 160, width: 200, height: 28, fillColor: '#FFD93D', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 14, text: '📌 今日重点', textColor: '#5D4E37', textFontSize: 20, zIndex: 2 },
      // 知识点框
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 270, width: 600, height: 200, fillColor: '#F8FBFE', strokeColor: '#A8D8EA', strokeWidth: 1, lineStyle: 'solid', borderRadius: 14, zIndex: 0 },
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 80, y: 270, width: 4, height: 200, fillColor: '#A8D8EA', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 2, zIndex: 1 },
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 220, y: 285, width: 350, height: 170, fillColor: 'transparent', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 8, text: '知识点：\n\n1.\n2.\n3.', textColor: '#4A6A8A', textFontSize: 24, textAlign: 'left', textVertical: 'top', zIndex: 2 },
      // 笔记区
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 520, width: 600, height: 280, fillColor: '#FFFFFF', strokeColor: '#E8E8E8', strokeWidth: 1, lineStyle: 'solid', borderRadius: 14, text: '笔记内容...', textColor: '#C4C4C4', textFontSize: 26, textAlign: 'left', textVertical: 'top', zIndex: 0 },
      // 笔记区彩色边条
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 80, y: 520, width: 6, height: 280, fillColor: '#2D5F8A', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 3, zIndex: 1 },
      // 底部进度
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 770, width: 500, height: 44, fillColor: '#F5F5F5', strokeColor: '#E8E8E8', strokeWidth: 1, lineStyle: 'solid', borderRadius: 22, zIndex: 0 },
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 170, y: 770, width: 150, height: 44, fillColor: '#2D5F8A', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 22, text: '30%', textColor: '#FFFFFF', textFontSize: 20, zIndex: 2 }
    ]
  },
  {
    id: 'mood',
    name: '心情日记',
    category: '日常',
    description: '记录今天的心情',
    background: '#FFFFFE',
    elements: [
      // 顶部柔和装饰
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 345, y: 0, width: 750, height: 14, fillColor: '#FFD1DC', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', zIndex: 10 },
      // 标题
      { type: 'decoration', subType: 'title', x: 200, y: 48, text: '心情日记', fontSize: 46, color: '#3D2E1F', fontFamily: 'handwriting', textAlign: 'left' },
      { type: 'decoration', subType: 'title', x: 200, y: 82, text: 'MOOD JOURNAL', fontSize: 16, color: '#FF8BA7' },
      // 装饰心形
      { type: 'decoration', subType: 'rect', shapeType: 'heart', x: 80, y: 55, width: 24, height: 24, fillColor: '#FF8BA7', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', zIndex: 5 },
      // 分割线
      { type: 'decoration', subType: 'line', x: 130, y: 108, width: 180, color: '#FFD1DC', strokeWidth: 2 },
      // 心情选择区 - 4 个心情药丸
      ...['😊 开心', '😌 平静', '😢 低落', '😫 疲惫'].map((mood, i) => ({
        type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 100 + i * 138, y: 155, width: 120, height: 52, fillColor: i === 0 ? '#FFF0F5' : '#FFFFFF', strokeColor: i === 0 ? '#FF8BA7' : '#E8E8E8', strokeWidth: i === 0 ? 2 : 1, lineStyle: 'solid', borderRadius: 26, text: mood, textColor: i === 0 ? '#FF8BA7' : '#999', textFontSize: 22, zIndex: i === 0 ? 2 : 0
      })),
      // 情绪天气图标装饰
      { type: 'decoration', subType: 'rect', shapeType: 'circle', x: 620, y: 155, width: 52, height: 52, fillColor: '#FFD93D', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 26, text: '☀️', textColor: '#FFFFFF', textFontSize: 28, zIndex: 2 },
      // 日记主内容区
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 350, width: 600, height: 380, fillColor: '#FFFAFC', strokeColor: '#FFD1DC', strokeWidth: 1, lineStyle: 'solid', borderRadius: 18, text: '今天想说...', textColor: '#D4A0B0', textFontSize: 28, textAlign: 'left', textVertical: 'top', zIndex: 0 },
      // 左侧彩色装饰条
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 80, y: 350, width: 6, height: 380, fillColor: '#FF8BA7', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 3, zIndex: 1 },
      // 装饰小星星
      { type: 'decoration', subType: 'rect', shapeType: 'star', x: 600, y: 370, width: 16, height: 16, fillColor: '#FFD93D', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', zIndex: 3 },
      { type: 'decoration', subType: 'rect', shapeType: 'star', x: 580, y: 395, width: 12, height: 12, fillColor: '#FFD1DC', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', zIndex: 3 },
      // 纸胶带装饰
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 345, y: 330, width: 100, height: 24, fillColor: 'rgba(255, 139, 167, 0.25)', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 4, zIndex: 5 },
      // 底部名言区
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 760, width: 520, height: 48, fillColor: '#FFF5F8', strokeColor: '#FFD1DC', strokeWidth: 1, lineStyle: 'dashed', borderRadius: 24, text: '"每一天都值得被记录"', textColor: '#FF8BA7', textFontSize: 22, zIndex: 0 }
    ]
  },
  {
    id: 'checklist',
    name: '清单打卡',
    category: '日常',
    description: '今日待办事项',
    background: '#FFFFFE',
    elements: [
      // 顶部装饰
      { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 345, y: 0, width: 750, height: 10, fillColor: '#6BCB77', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', zIndex: 10 },
      // 标题
      { type: 'decoration', subType: 'title', x: 200, y: 46, text: '今日清单', fontSize: 44, color: '#2D5F2D', fontFamily: 'handwriting', textAlign: 'left' },
      { type: 'decoration', subType: 'title', x: 200, y: 80, text: 'TO-DO LIST', fontSize: 16, color: '#7A9B7A' },
      // 装饰对勾
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 640, y: 42, width: 44, height: 44, fillColor: '#E8FFE8', strokeColor: '#6BCB77', strokeWidth: 2, lineStyle: 'solid', borderRadius: 22, text: '✓', textColor: '#6BCB77', textFontSize: 28, zIndex: 5 },
      // 分割线
      { type: 'decoration', subType: 'line', x: 80, y: 105, width: 160, color: '#A8D8B8', strokeWidth: 2 },
      // 日期
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 580, y: 40, width: 130, height: 38, fillColor: '#F0FFF0', strokeColor: '#A8D8B8', strokeWidth: 1, lineStyle: 'solid', borderRadius: 19, text: '', textColor: '#2D8A4E', textFontSize: 20, zIndex: 5 },
      { type: 'decoration', subType: 'date', x: 580, y: 40, fontSize: 20, color: '#2D8A4E' },
      // 8 个待办项
      ...Array.from({ length: 6 }, (_, i) => {
        const y = 155 + i * 72
        return [
          // 复选框
          { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 120, y, width: 42, height: 42, fillColor: '#FFFFFF', strokeColor: '#A8D8B8', strokeWidth: 2, lineStyle: 'solid', borderRadius: 10, zIndex: 2 },
          // 点击效果提示
          { type: 'decoration', subType: 'rect', shapeType: 'rect', x: 120, y, width: 16, height: 16, fillColor: i === 0 ? '#6BCB77' : 'transparent', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 4, zIndex: 3 },
          // 待办文字
          { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 380, y, width: 440, height: 42, fillColor: 'transparent', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 8, text: `待办事项 ${i + 1}`, textColor: i === 0 ? '#6BCB77' : '#7A8B7A', textFontSize: 26, textAlign: 'left', textVertical: 'middle', zIndex: 1 },
          // 分割线
          { type: 'decoration', subType: 'line', x: 400, y: y + 32, width: 400, color: '#F0F0F0', strokeWidth: 1 }
        ]
      }).flat(),
      // 进度条 - 底部
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 620, width: 560, height: 48, fillColor: '#F5F5F5', strokeColor: '#E8E8E8', strokeWidth: 1, lineStyle: 'solid', borderRadius: 24, zIndex: 0 },
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 125, y: 620, width: 120, height: 48, fillColor: '#6BCB77', strokeColor: 'transparent', strokeWidth: 0, lineStyle: 'solid', borderRadius: 24, text: '1/6', textColor: '#FFFFFF', textFontSize: 22, zIndex: 2 },
      // 底部鼓励语
      { type: 'decoration', subType: 'rect', shapeType: 'roundRect', x: 345, y: 700, width: 350, height: 40, fillColor: '#F8FFF8', strokeColor: '#A8D8B8', strokeWidth: 1, lineStyle: 'dashed', borderRadius: 20, text: '💪 加油！今日可期', textColor: '#6BCB77', textFontSize: 22, zIndex: 0 }
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
