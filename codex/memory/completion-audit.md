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
