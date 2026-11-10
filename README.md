# 通用画布 · UniCanvas

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

一个面向 AI 的通用画布面板（英文名 **UniCanvas**），可作为 DeepSeek Harness 的 bundle 插件运行（Host + Web Client 同一个包），也可作为独立桌面窗口运行。

> **UniCanvas** — an AI-native infinite canvas: notes, text, shapes, frames, images, pen and connectors; multi-board, snapshots, minimap and zoom. Agent cards, projects and parent/child delegation let AI build on the board via any OpenAI-compatible API. Plus a Markdown vault, timelines, force graph, skins and a standalone desktop app; data stays local.

## 功能

- **通用画布**：便签、文本、形状、画框、图片、画笔、连线，缩放/平移/框选/撤销重做
- **多画布**：工具栏「画布」切换 / 新建 / 重命名 / 删除；每块画布独立内容与视口，全部保存在本机
- **历史快照**：工具栏「历史」保存 / 恢复 / 删除快照；恢复前自动备份当前状态；每块画布最多 20 个快照
- **小地图**：右下角缩略图显示全部节点与当前视野，点击 / 拖动快速定位，可收起且记住开关状态
- **Agent 卡**：任务 / 角色 / 产出方式；三击打开独立大编辑面板；点「开工」在画板上产出
- **项目工作区**：一键新建项目画框 + 负责人 Agent；项目列表跳转；关联本地路径（📂 资源管理器打开）
- **父/子 Agent 派活**：父卡「派活」拆分子项目（每个项目一个画框 + 子 Agent，最多 6 个、最多两层）；父卡「跑子任务」逐个执行并汇总
- **AI 生成**：工具栏「生成」直接让 Agent 在画板上创建/修改内容；模型选择只影响本画板
- **自定义 AI 接口（多套）**：顶部「API 接口」→「添加接口」可接入任意 OpenAI 兼容 API（DeepSeek / OpenAI / Kimi / 智谱 / 本地 Ollama、vLLM…）；支持多接口管理、Key 只存本机、一键测试连接、按接口设置默认模型/温度/超时；生成、Agent 开工、派活都按所选接口调用（插件与独立版同一套）
- **图片 / GIF**：本地程序化生成 SVG 图片或 GIF 动图
- **提示词库 / 皮肤 / 赛博朋克视觉**：本机保存；世界线变动率仪表、扫描线、霓虹选中框
- **装饰系统（v1.7）**：皮肤决定背景，「装饰」独立叠加、可多选并与皮肤同时生效——鲸鱼（从左往右横渡）、彩虹猫（从上往下飘落）两套 0/1 粒子生物，鼠标碰到时粒子炸成彩色 0/1 + 白色方块（并带视差）；另有赛博极光、命运石之门（世界线变动率仪表，右上角）；皮肤含星空 / 赛博朋克 / 极光 / 蓝图 / 碳纤维 / 纯黑与自定义背景图
- **左侧知识栏（Obsidian 式）**：本地 Markdown 笔记库浏览并导入 `.md` / `.canvas` / 图片；`#标签` 过滤高亮；`[[链接]]` 反链面板；全文搜索 + `Ctrl/⌘+O` 快速切换；卡片编辑自动写回绑定的 `.md`
- **数轴 / 时间线（左侧栏）**：左侧栏「数轴」插入横向 / 纵向数轴卡，标题 / 起点 / 终点 / 步长 / 单位可配置；点刻度即可在轴下新建卡片；左侧栏列表可定位、编辑画布上的数轴
- **关系图（左侧栏，力导向）**：左侧栏「关系图」打开全屏力导向网络视图，范围可切当前画布 / 全部画布 / 笔记库；节点=卡片、`.md` 文件、`#标签`，边=画布连线、`[[链接]]`、同标签、同源文件；支持搜索过滤、标签/孤立节点开关、斥力/连线距离/向心力调节、拖拽/缩放、双击跳转，布局本地记住
- **长文本卡片**：长便签自动按 Markdown 排版、卡内滚动、双击开大编辑器；选择条可一键「转为文档卡」；笔记库里的长 `.md` 直接导入为文档卡（宽版 + 自动高度）
- **缩放联动**：卡片缩放时文字、图标、按钮同步等比缩放

## 独立桌面窗口

不想开 DeepSeek Harness 时，可以从桌面直接打开画板：

- 双击 `desktop/launcher.vbs`（静默启动）或 `desktop/launcher-debug.cmd`（带日志窗口，需 Node.js；也可给它们建桌面快捷方式）；
- 窗口用 Chrome/Edge 的 app 模式打开（无地址栏/标签页），后台是 `desktop/server.mjs`
  的本地服务；UI 复用插件里同一个 `client.js` 面板；
- 首次启动自动从 DeepSeek Harness 导入画布；数据保存在 `desktop/data/library.json`，
  左下角「导入画板」可重新同步；
- 独立版支持在顶部「API 接口」（或「⚙ 设置 → API 接口」）填任意 OpenAI 兼容接口（地址 / 模型 / Key），
  配置后「生成」与 Agent「开工」可用；派活仍请回 DSH 使用。

详见 [desktop/README.md](./desktop/README.md)。

## 目录结构

```
packages/infinite-canvas/
  index.js      # Host 半：文档存储、browser API (/api/canvas.doc)、Agent tools、AI 生成
  client.js     # Web Client 半：画板面板、工具栏、编辑面板、Agent/项目/媒体/设置界面
  model.js      # 纯数据模型：op 应用、item 归一化、frameId 规则、summarize
  store.js      # 持久化：storageDomain → $DSH_HOME/storages/infinite_canvas.json
scripts/
  verify.mjs    # 离线验收（语法、模型、存储、Host 端到端、客户端渲染冒烟）
  bump-build.mjs # 更新客户端构建号（写入 client.js 的 CLIENT_BUILD）
desktop/        # 独立桌面窗口（本地 Node 服务 + app 模式窗口 + 启动脚本）
docs/           # 协议 / 存储 / Host / Client 开发说明
```

## 开发与验证

需要 Node.js。

```bash
# 语法 + 模型 + Host + 客户端渲染 全量离线验收
node scripts/verify.mjs
# 更新客户端构建号（写入 client.js 的 CLIENT_BUILD）
node scripts/bump-build.mjs
```

## 安装（DeepSeek Harness 插件）

克隆本仓库后，把它作为 DeepSeek Harness 的 bundle 插件安装：本项目是「本地 link 插件」，把 `packages/infinite-canvas`
链接到 profile 的 `node_modules/@local/infinite-canvas`（或用插件管理器的「安装本地目录」指向该目录），
在 profile 配置中启用后，侧边栏出现「通用画布」入口。

- Host 代码改动：需要重新加载/重载插件（或重启 Host）；
- Client 代码改动：需要完全退出并重开 DeepSeek Harness（重新快照客户端产物）；
- 画板数据保存在 `$DSH_HOME/storages/infinite_canvas.json`，重启不丢。

## License

MIT © 2026 zerotsl — 见 [LICENSE](./LICENSE)。

## 说明

这是个人实验项目，接口/行为仍可能调整。皮肤 / 装饰里的「命运石之门」「彩虹猫」等为个人皮肤命名或社区梗，与相关版权方无关。
