# Optimization Log

## 2026-06-07 Codex 收尾修复

### 已完成
- 全量 JS 语法检查：12 个 JS 文件通过。
- WXML 事件绑定静态检查：通过。
- `git diff --check`：仅 LF/CRLF 换行提示，无实际 diff 错误。
- 编辑器页面角色修复：`bookPages` 增加 `role`，同步 `isCoverPage`。
- 封面页保护：隐藏删除按钮，模板应用和删除逻辑阻止封面页。
- 提取到手帐链路：`putInJournal()` 传递 `stickerId`，编辑器初始化后自动放置贴纸且只执行一次。
- 矩形文字功能收口：更多菜单动态显示添加/编辑文字，锁定状态阻止修改。
- 手写字体加载：多源兜底，加载失败不影响小程序启动。
- 图片/矩形更多菜单：从 `wx.showActionSheet` 改为自定义底部菜单，规避原生弹窗上限和平台差异。
- 自定义更多菜单支持：图片效果切换、矩形添加/编辑文字、矩形添加图片、复制/粘贴样式、边框、置顶/置底。
- 模板占位文字继续收口：清单模板的待办文字和底部统计已移入矩形元素自身。
- 纸面材质补丁：编辑器 `_isLightColor()` 现在支持 `rgb/rgba/#rgb/#rrggbb`，避免浅色透明背景被误判为暗色纸面。
- 纸面材质 UI 预览增强：背景面板的纸纹/画布/牛皮纸/亚麻/水彩预览改为多层 CSS 纹理，和 Canvas 端真实纸纹方向保持一致。

### 待完成
- 在微信开发者工具中做完整手动回归。
- 继续优化纸面材质的视觉强度和真实感。
- 继续打磨 alpha-mask 贴纸描边效果，尤其是复杂透明边缘、细发丝边缘。
- 梳理 `editor.js` 大文件，后续建议拆分渲染、元素操作、页面导航、面板状态四类模块。

### Git 状态
- 当前分支：`feature/editor-enhancements`。
- 本轮未提交。
- 工作区存在其他程序员/历史改动：包括多个页面和工具文件修改、一个本地字体文件删除、`.workbuddy/memory/MEMORY.md` 未跟踪。

## 2026-06-10 知识库 QA 与作者文档整理

### 已完成
- [x] 阅读项目资料：`设计.md`、产品升级方案、最小成功案例技术文档、近期改动、v1.0.1 更新日志、备案说明、既有 memory。
- [x] 对照当前页面与工具实现：首页、编辑器、素材库、保存收藏物、主题系统、模板系统、本地存储。
- [x] 新增 `docs/知识库QA问题整理.md`，整理 30 条可用于知识库 QA 的用户疑问与回答。
- [x] 新增 `docs/关于作者.md`，整理作者小晴、创作初衷、审美方向、产品原则和 QA 关键词。
- [x] 在 `codex/memory/project-memory.md` 记录本轮知识库整理结果和当前口径。

### 待完成
- [ ] 若后续重新启用 MiMo/remove.bg，需要同步更新 QA 文档中的「当前实现」和「隐私/上传」口径。
- [ ] 若产品正式名称从「月照雪」切换为「我的手帐」，需要检查备案说明、项目配置、页面标题是否完全一致。
- [ ] AI QA 对接前建议把问答按「基础定位/编辑器/素材库/导出隐私」切分入库，并设置当前实现优先级。

### Git 提交记录
- (待提交)

## 2026-06-16 v1.0.1 正式发布、分支整理与计划性更新调研

### 已完成
- [x] 读取项目根目录 `memory/optimization-log.md` 与 `codex/memory/*`，确认当前项目记忆、待验收事项和历史优化记录。
- [x] 确认仓库远端为 `git@github.com:yuanyue1234/Moonlit-Log.git`，当前本地 `master` 跟踪 `origin/main`。
- [x] 确认旧本地分支 `feature/editor-enhancements` 已并入当前主线，无 `master..feature/editor-enhancements` 未合并提交。
- [x] 调研同类手帐/日记/网页与小程序方向：时光手帐、微手帐、Goodnotes、Zinnia、Day One、Journey、Diarium、Grid Diary/格志日记、Apple Journal、LemonJournal、Canva。
- [x] 新增 `docs/计划性更新路线图.md`，整理 v1.0.2-v1.5 推荐节奏和待决策更新菜单。
- [x] 更新 `codex/memory/project-memory.md`，记录本次发布目标、分支口径和后续计划方向。

### 待完成
- [x] 将本地 `master` 规范为 `main`。
- [x] 清理旧本地分支 `feature/editor-enhancements`。
- [x] 提交本轮文档与 memory 更新，创建 `v1.0.1` tag 并推送到 GitHub。
- [x] 从正式版创建并推送 `dev` 分支，后续计划性更新从 `dev` 开始。
- [ ] 因本机未安装 GitHub CLI `gh`，本轮不创建 GitHub PR；如后续需要 PR，需要先安装并登录 `gh`。
- [ ] v1.0.2 前仍需在微信开发者工具中做完整手动回归。

### Git 提交记录
- `f4cd0c0` - `v1.0.1: 正式发布手帐文档与更新路线图`，已推送到 `origin/main`。
- `v1.0.1` - 正式版本 tag，已推送到 GitHub。
- `dev` - 后续冒险分支，已推送并跟踪 `origin/dev`。
