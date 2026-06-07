# 手帐小程序 - 项目知识库

## 项目概述
「我的手帐」微信小程序 - 电子手帐编辑器，AppID: wx230e08081e9ddc80
- 基础库: 3.3.4 / 3.16.1
- 零第三方依赖，全部原生微信小程序 API 实现
- Canvas 2D 全自绘编辑引擎

## 核心架构
- **5个页面**: index(手帐本列表) / editor(画布编辑器) / stickers(贴纸库) / extract(AI提取) / templates(模板选择)
- **6个工具模块**: storage.js / theme.js / template.js / file.js / ai.js / imageEffect.js
- **TabBar**: 2个tab - 手帐(首页) + 贴纸库（提取页已从tabBar移除，通过首页进入）

## 关键技术点

### Canvas 编辑器 (editor.js ~2000行)
- 坐标系: canvas-local rpx（非全局px）
- 渲染链: 清空 → 背景色 → 材质遮罩 → 纹路 → 参考线 → 元素(按zIndex)
- imageCache(Map) 异步图片加载 + 加载后自动重绘
- textureCache(Map) OffscreenCanvas 纹理缓存
- 元素操作: 拖拽/四角缩放(保持宽高比)/旋转/复制/删除/置顶置底/锁定
- 对齐参考线: 6rpx 吸附阈值
- 撤销/重做: 最多50步，每页独立历史
- 自动保存: onHide + 500ms防抖 + _syncSave同步保存

### 数据存储 (storage.js)
- 三键: journal_books / journal_pages / sticker_assets
- 手帐本字段: id, name, cover, coverImage, theme, tags[], pages[], createdAt, updatedAt
- 页面字段: id, bookId, width, height, background, bgPattern, bgTexture, role(cover/page), elements[]
- 贴纸字段: id, src, thumb, category, tags[], isFavorite, source, style, effect, labels[]

### AI 提取 (ai.js)
- remove.bg 去背景: 压缩2MB内 → base64 → API → PNG
- MiMo-V2-Omni 智能标签: mainObject/materialType/scene/tags/styleTags/colors/shape/confidence
- 月度限额: 50次/月，本地storage记录
- OffscreenCanvas限制: createImage()无法加载http://usr/虚拟路径，效果处理移至编辑器Canvas

### 主题系统 (theme.js)
- 8种主题: 奶油风/复古拼贴/韩系清透/日系杂志/少女粉/蓝白海盐/咖啡手帐/胶片旅行
- 每种包含: bg, cardBg, primary, secondary, accent, text, textLight, pageBackgrounds[8], patterns[4], fonts[3], stickers[6], tapes[5]

### 图片特效 (imageEffect.js)
- alpha-mask 方式实现: 白边/纸贴/阴影
- 使用 OffscreenCanvas + expandAlpha() 算法

## 外部依赖
- remove.bg API: 图片去背景
- MiMo-V2-Omni API: 视觉智能标签
- LXGW Yozai 字体: GitHub CDN 在线加载
- 王漢宗粗楷體簡.ttf: 本地繁体楷书字体

## 文件资源
- assets/icons/: 30个 SVG 图标(Lucide风格)
- assets/textures/: 5个 SVG 纹理(grain/canvas/kraft/linen/watercolor)
- images/: 6个 TabBar PNG图标
- 字体/: 1个 TTF 字体文件

## 已知限制/注意事项
- components/ 目录为空，逻辑全在页面内
- editor.js 最大单文件(~2000行)，可考虑拆分
- CSS 三层样式叠加(editor.wxss ~1333行)可精简
- clipboard.svg 存在但未使用
- 更多菜单使用原生 wx.showActionSheet
