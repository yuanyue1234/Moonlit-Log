/**
 * theme.js - 主题管理系统
 * 每个主题包含：背景、字体色、强调色、贴纸包、胶带、封面模板
 */

const THEMES = {
  none: {
    name: '无风格',
    bg: '#FFFFFF',
    cardBg: '#FFFFFF',
    primary: '#555555',
    secondary: '#999999',
    accent: '#CCCCCC',
    text: '#333333',
    textLight: '#999999',
    pageBackgrounds: ['#FFFFFF'],
    patterns: ['blank'],
    fonts: ['手写', '简约', '可爱'],
    stickers: [],
    tapes: []
  },
  cream: {
    name: '奶油风',
    bg: '#FFFAF5',
    cardBg: '#FFFFFF',
    primary: '#FF8BA7',
    secondary: '#A8D8EA',
    accent: '#FFD93D',
    text: '#4A3728',
    textLight: '#8B7B6B',
    pageBackgrounds: [
      '#FFFFFF', '#FFFAF5', '#FFF5F0', '#FFF8E7',
      '#F5F0FF', '#F0F5FF', '#FFF0F5', '#FFFFF0'
    ],
    patterns: ['dots', 'lines', 'grid', 'blank'],
    fonts: ['可爱', '手写', '简约'],
    stickers: ['star', 'heart', 'flower', 'cloud', 'rainbow', 'butterfly'],
    tapes: ['pink', 'blue', 'yellow', 'mint', 'lavender']
  },
  vintage: {
    name: '复古拼贴',
    bg: '#F5EDE3',
    cardBg: '#FFFBF5',
    primary: '#C4956A',
    secondary: '#8B7355',
    accent: '#D4A574',
    text: '#3D2E1F',
    textLight: '#7A6B5A',
    pageBackgrounds: [
      '#F5EDE3', '#FFFBF5', '#EDE3D5', '#F0E6D8',
      '#E8DDD0', '#FFF5E6', '#F5EFE5', '#EDE5D8'
    ],
    patterns: ['dots', 'lines', 'grid', 'blank'],
    fonts: ['手写', '打字机', '报纸'],
    stickers: ['stamp', 'postcard', 'camera', 'map', 'compass', 'key'],
    tapes: ['brown', 'olive', 'rust', 'cream', 'navy']
  },
  korean: {
    name: '韩系清透',
    bg: '#F8F4FF',
    cardBg: '#FFFFFF',
    primary: '#B388FF',
    secondary: '#80D8FF',
    accent: '#FFD180',
    text: '#2D2D3F',
    textLight: '#7B7B8F',
    pageBackgrounds: [
      '#FFFFFF', '#F8F4FF', '#F0F4FF', '#FFF4F8',
      '#F4FFF8', '#FFFFF4', '#F4F8FF', '#FFF8F4'
    ],
    patterns: ['dots', 'lines', 'grid', 'blank'],
    fonts: ['简约', '可爱', '手写'],
    stickers: ['daisy', 'cherry', 'ribbon', 'moon', 'star', 'cat'],
    tapes: ['lavender', 'skyblue', 'peach', 'mint', 'pink']
  },
  japanese: {
    name: '日系杂志',
    bg: '#FAFAFA',
    cardBg: '#FFFFFF',
    primary: '#E85D75',
    secondary: '#5B8C5A',
    accent: '#F4A460',
    text: '#1A1A1A',
    textLight: '#666666',
    pageBackgrounds: [
      '#FFFFFF', '#FAFAFA', '#F5F5F0', '#FFF8F0',
      '#F0F5F0', '#FFF5F5', '#F5F0F5', '#F0F0F5'
    ],
    patterns: ['dots', 'lines', 'grid', 'blank'],
    fonts: ['简约', '报纸', '手写'],
    stickers: ['sakura', 'bamboo', 'fan', 'wave', 'mountain', 'tea'],
    tapes: ['red', 'green', 'black', 'white', 'gold']
  },
  pink: {
    name: '少女粉',
    bg: '#FFF0F5',
    cardBg: '#FFFFFF',
    primary: '#FF69B4',
    secondary: '#FFB6C1',
    accent: '#FF1493',
    text: '#4A2040',
    textLight: '#8B5A6B',
    pageBackgrounds: [
      '#FFFFFF', '#FFF0F5', '#FFE4E9', '#FFF5F8',
      '#FFE8F0', '#FFF0F0', '#FFE0F0', '#FFF8FA'
    ],
    patterns: ['dots', 'lines', 'grid', 'blank'],
    fonts: ['可爱', '手写', '简约'],
    stickers: ['heart', 'lipstick', 'crown', 'diamond', 'bow', 'rose'],
    tapes: ['hotpink', 'lightpink', 'rose', 'coral', 'blush']
  },
  ocean: {
    name: '蓝白海盐',
    bg: '#F0F8FF',
    cardBg: '#FFFFFF',
    primary: '#4A90D9',
    secondary: '#87CEEB',
    accent: '#F0C050',
    text: '#1A3A5C',
    textLight: '#5A7A9C',
    pageBackgrounds: [
      '#FFFFFF', '#F0F8FF', '#E8F4FD', '#F5FBFF',
      '#E0F0FF', '#F0FAFF', '#E8F0F8', '#F8FCFF'
    ],
    patterns: ['dots', 'lines', 'grid', 'blank'],
    fonts: ['简约', '手写', '可爱'],
    stickers: ['shell', 'fish', 'anchor', 'boat', 'seagull', 'starfish'],
    tapes: ['navy', 'sky', 'aqua', 'sand', 'coral']
  },
  coffee: {
    name: '咖啡手帐',
    bg: '#F5EDE3',
    cardBg: '#FFFBF5',
    primary: '#8B6914',
    secondary: '#D2691E',
    accent: '#CD853F',
    text: '#3E2723',
    textLight: '#795548',
    pageBackgrounds: [
      '#FFFBF5', '#F5EDE3', '#FFF8F0', '#F0E6D8',
      '#FFF5E6', '#EDE3D5', '#FFF0E0', '#F5EFE5'
    ],
    patterns: ['dots', 'lines', 'grid', 'blank'],
    fonts: ['手写', '简约', '报纸'],
    stickers: ['coffee', 'cake', 'cookie', 'book', 'plant', 'candle'],
    tapes: ['brown', 'beige', 'mocha', 'caramel', 'espresso']
  },
  film: {
    name: '胶片旅行',
    bg: '#F0EDE8',
    cardBg: '#FAFAF5',
    primary: '#6B7B3A',
    secondary: '#8B7355',
    accent: '#B8860B',
    text: '#2D2D2D',
    textLight: '#666666',
    pageBackgrounds: [
      '#FAFAF5', '#F0EDE8', '#F5F0E8', '#EDE8E0',
      '#F8F5F0', '#F0ECE5', '#E8E3DB', '#F5F2ED'
    ],
    patterns: ['dots', 'lines', 'grid', 'blank'],
    fonts: ['报纸', '手写', '简约'],
    stickers: ['plane', 'ticket', 'passport', 'landmark', 'suitcase', 'globe'],
    tapes: ['olive', 'khaki', 'tan', 'brown', 'forest']
  }
}

function getTheme(themeKey) {
  return THEMES[themeKey] || THEMES.cream
}

function getAllThemes() {
  return Object.keys(THEMES).map(key => ({
    key,
    ...THEMES[key]
  }))
}

function getThemeList() {
  return Object.keys(THEMES).map(key => ({
    key,
    name: THEMES[key].name,
    primary: THEMES[key].primary,
    secondary: THEMES[key].secondary
  }))
}

module.exports = {
  THEMES,
  getTheme,
  getAllThemes,
  getThemeList
}
