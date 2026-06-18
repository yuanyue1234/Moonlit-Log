# 目标完成审计

## 已有代码证据覆盖
- 图片更多菜单：已改为编辑器自定义底部菜单，不依赖 `wx.showActionSheet`；入口在 `pages/editor/editor.wxml`，逻辑在 `openSelectedMoreMenu()` / `onSelectedMoreAction()`。
- 矩形添加文字：矩形更多菜单包含 `rect-text`，保存后写入矩形元素的 `text/textColor/textFontSize/textFontFamily`。
- 模板占位文字：主要图片占位和清单模板文字已放入矩形元素自身，图片替换矩形时文字会一并消失。
- 矩形样式复制/粘贴：`_getElementStylePayload()` 包含颜色、填充、描边、边框、圆角、文本样式。
- 手写体：`app.js` 优先加载 LXGW Yozai GitHub release，失败后降级备用源/系统字体。
- 贴纸详情：贴纸页上方已显示“标签分类”，详情操作为“添加标签”。
- 手账封面体系：`storage.createBook()` / `ensureCoverPage()` 会生成封面页，编辑器阻止封面删除和套模板。
- 主题固定元素：`buildThemePageElements()` 按主题生成普通页固定元素。
- 描边/纸贴/阴影：`utils/imageEffect.js` 使用 alpha mask、膨胀、Canvas shadow 参数，而不是矩形背景。
- 纸面材质：编辑器 canvas 端生成颗粒、纤维、布纹、牛皮纸、水彩纹理，并缓存到 OffscreenCanvas。

## 仍需运行时验证
- 微信开发者工具中选中图片后，自定义更多菜单是否正常覆盖、点击、关闭。
- 矩形文字编辑后，Canvas 显示、保存、切页再回来是否保持。
- 模板替换矩形为图片后，原矩形提示文字是否完全消失。
- 提取页保存的 `effect` 是否在贴纸库和编辑器中一致显示。
- 字体 URL 是否被小程序合法域名策略允许；失败时是否安静降级。
- 纸面材质和 alpha 描边的实际视觉效果是否达到用户预期。

## 外部参考
- Canvas 像素读取：MDN `CanvasRenderingContext2D.getImageData()` https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData
- Canvas 阴影：MDN `CanvasRenderingContext2D.shadowBlur` https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/shadowBlur
- Canvas 阴影案例：Konva Shadow https://konvajs.org/docs/styling/Shadow.html
- 图像模糊思路：Konva Blur filter https://konvajs.org/docs/filters/Blur.html
- 纸面噪声纹理：MDN SVG `feTurbulence` https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feTurbulence

## 2026-06-17 UI/手绘目标完成度审计

### 已被当前证据证明
- 编辑页暖纸色线条风覆盖仍在 `pages/editor/editor.wxss` 末尾保留，`soft-hover`/`soft-hover-scale` 覆盖顶部按钮、工具栏、选中菜单、弹层关闭、手绘工具按钮等 WXML 入口。
- `assets/icons` 中不再含 `currentColor`，图标本体使用固定暖棕色；`currentColor` 仅剩于 WXSS 的画笔粗细预览条，不影响 `<image>` 图标可见性。
- `app.json` TabBar 使用暖纸色背景、暖棕未选中和玫瑰粉选中；`images/tab-*.png` 六个线条图标文件存在。
- 手绘工作台为全屏结构：顶部关闭/标题/撤销/重做/完成，下方四项工具为选择贴纸、画笔颜色、画笔粗细、工具；`draw-board` 内 canvas 以真实容器尺寸初始化并绝对铺满。
- 历史审计曾证明“编辑态隐藏页码、预览态显示”的旧结构；该结构现已废弃，不再作为当前完成证据。
- 图片更多菜单含“裁切”，裁切后替换图片、生成唯一贴纸并清理旧贴纸；删页/删元素/清空页会回收页面独有贴纸，封面图删除会清掉 `book.coverImage`。
- 静态验证已通过：`node --check` 覆盖 `editor.js`/`storage.js`；微信开发者工具 `wcc`/`wcsc -lc` 编译当前 WXML/WXSS；编辑页 35 个直接本地静态资源引用均存在；9 个 JSON 文件可解析；storage mock 证明删页会清理图片贴纸记录。
- 新增 `scripts/verify-editor-ui.js` 将上述 UI/手绘/贴纸约束固化为 41 项自动检查，当前 `node scripts/verify-editor-ui.js` 通过。
- 新增 `scripts/verify-sticker-lifecycle.js` 将删页清理唯一贴纸、保留仍被其他页面引用的文件、封面 `coverImage` 清空后回收贴纸固化为 9 项自动检查，当前 `node scripts/verify-sticker-lifecycle.js` 通过。
- 新增 `docs/编辑页运行回归清单.md`，运行时待验证步骤已经整理为可执行清单。

### 尚未被当前证据证明
- 微信开发者工具 GUI/真机中，编辑页实际视觉是否完全符合参考图，包括弹层背景、hover/触摸态观感、移动端图标清晰度。
- 真机/模拟器中手绘下半部分是否可持续绘制，颜色/粗细弹层、橡皮切换、贴纸盖章、撤销/重做、完成保存是否全部可交互。
- `wx.cropImage` 在当前目标基础库/真机中是否可打开裁切界面并返回结果；当前代码有不支持时的 toast fallback。
- 删除封面图后回到首页再重新进入手账本、添加图片后删页再查看贴纸库等完整用户流程仍需 GUI/真机回归确认。
- 正常用户环境下微信开发者工具 CLI 帮助可用，但 `preview --project ... --port 9421` 180 秒未返回且未生成二维码/信息文件；`auto --project ... --port 9421 --trust-project` 60 秒未返回且端口无监听；两次残留进程均已清理。CLI preview/auto 仍不能提供完成证据。

## 2026-06-17 v1.1.0 完成度审计

### 已被当前证据证明
- 编辑模式底部页面管理条已显示在 `editorMode === 'edit'` 下，包含上一页、当前页/总页数、下一页、添加页、删除页；WXML 中不再有页码圆点循环。
- 此项是 2026-06-17 阶段证据，已被 2026-06-18 用户要求推翻；当前预览必须显示独立小圆点页码。
- 删除页按钮使用禁用占位逻辑：`bookPages.length <= 1 || isCoverPage`，避免封面页和普通页按钮位置不一致。
- 图片裁切不再调用 `wx.cropImage`，而是打开 `_openImageCropPanel()`，确认后保存 `cropMode: 'cover'`、`cropOffsetX`、`cropOffsetY`；裁切后的图片不会生成额外贴纸文件。
- “复制样式/粘贴样式”入口及 JS 操作函数已移除。
- 手绘底部工具栏已移除贴纸选择，保留颜色、粗细、工具三项；`draw-board` 真实尺寸初始化和 canvas 铺满仍保留。
- 贴纸详情预览已加入 `.preview-image-stage` 格纹底；模板页为三列紧凑布局。
- `clearBookCoverImage()` 会同步删除封面页中对应的系统封面图片元素。
- 静态验证已通过：`node scripts/verify-editor-ui.js` 49 项、`node scripts/verify-sticker-lifecycle.js` 9 项、相关 `node --check`、`git diff --check`、微信开发者工具 `wcc`/`wcsc` 编译改动文件。

### 尚未被当前证据证明
- 微信开发者工具 GUI/真机中，编辑底部页面管理条和工具 dock 是否遮挡页面或影响触摸。
- 可逆裁切面板的真实拖动手感、撤销/重做和再次调整体验。
- 手绘下半区连续绘制、底部三工具弹层、完成保存的真实触摸表现。
- 删除封面图后重进手账本、添加图片后删页再看贴纸库等完整用户路径仍需 GUI/真机确认。

## 2026-06-18 编辑/预览布局修正完成度审计

### 已被当前证据证明
- `editor.wxml` 同时存在两个互斥组件：编辑态 `edit-page-nav` 包含页数、左右翻页、加页和删页；预览态 `preview-page-nav` 循环 `bookPages` 生成可点击页码圆点，并绑定 `onTapPageDot`。
- 预览圆点组件不包含 `addNewPage` 或 `deleteCurrentPage`，编辑页管理条不包含小圆点循环。
- 画布逻辑高度已从 `920` 增至 `1200`；显示尺寸由 `_fitCanvasToViewport()` 按窗口、安全区、顶部栏、纸张外壳和底部控件保留空间等比计算，紧凑屏不再因漏算外壳而发生边缘裁切。
- 工具面板最终样式为 `bottom: calc(220rpx + env(safe-area-inset-bottom))`、`z-index: 29`；主工具栏固定高 `104rpx`、`z-index: 31`，页面管理条固定高 `82rpx`、`z-index: 30`，几何间距分别为 `12rpx` 和 `4rpx`。
- `node scripts/verify-editor-ui.js` 通过 59 项检查，`node scripts/verify-editor-layout.js` 通过 4 组视口与面板间距检查，`node scripts/verify-sticker-lifecycle.js` 通过 9 项检查；相关 `node --check` 与 `git diff --check` 均通过。

### 尚未被当前证据证明
- 用户手动 GUI/真机中，`690×1200` 长页在不同屏幕比例下的最终视觉占用是否完全符合主观预期。
- 工具面板打开后切换另一工具、滚动长内容、唤起文字键盘时的真实触摸和遮挡表现。
- 预览圆点在很多页面时的横向滚动、当前页高亮和点击跳转触感。
