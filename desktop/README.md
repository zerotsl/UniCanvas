# 通用画布 · UniCanvas · 独立桌面窗口

不打开 DeepSeek Harness，也能从桌面直接打开通用画布。窗口是 Chrome/Edge 的 app 模式
（无地址栏、无标签页），后台由本目录里的小型 Node 服务提供存储与画板 UI。

## 打开方式

- 静默启动：双击 `launcher.vbs`（无控制台窗口）；
- 调试启动：双击 `launcher-debug.cmd`（保留服务日志窗口）；
- 桌面快捷方式：可自行用 `app.ico` 给 `launcher.vbs` 建快捷方式（仓库不含 `.lnk` 文件）。

首次打开会自动从 DeepSeek Harness 的画板存储导入全部画布；之后使用本目录数据。

## 数据

- 默认：`desktop/data/library.json`（本机文件，自动保存，可与 DSH 数据分离）
- 界面左下角「导入画板」：用插件版当前画板覆盖独立版数据
- 导入源：`%USERPROFILE%\.dsh\storages\infinite_canvas.json`（只读）

> 独立版与插件版各自保存一份数据，互不打扰；需要合并时点「导入画板」。

## 能力范围

- 完整画布：便签 / 文本 / 形状 / 画框 / 图片 / 画笔 / 连线、缩放、小地图、多画布、历史快照
- 项目 / Agent 卡 UI 可用；配置 AI 模型 API 后，「生成」与 Agent「开工」可用（详见下节）
- 派活（父子 Agent）仍不支持，请回插件窗口使用

## 左侧知识栏（笔记库 / 标签 / 链接 / 搜索）

独立窗口左边缘有一条 Obsidian 风格的侧栏（可点左上箭头收起，状态会记住）：

- **笔记库**：填本地 Markdown 文件夹路径 →「载入」列出其中文件（跳过 `.git` / `node_modules` 等）；
  点 `.md` 导入为便签、点 `.canvas` 导入整张 Obsidian 画布（text / group / file / edge 都会转换）、点图片导入为图片卡；
  也可以用 `...?vault=<路径>` 直接在窗口/浏览器打开时定位到某个笔记库；
- **标签**：自动收集当前画布里的 `#标签`（也支持 `meta.tags`），点一下只高亮匹配卡片，再点取消；
- **链接**：解析卡片文字里的 `[[双向链接]]`，选中一张卡片即可看到「我指向 / 指向我」；点条目跳转；
- **搜索**：在当前画布内全文搜索卡片，点结果跳转并选中；
- **快速切换（`Ctrl/⌘+O`）**：随时搜索卡片 / 画布 / 笔记库文件，↑↓ 选择、Enter 打开、Esc 关闭。

导入的 `.md` 卡片会在 `meta.filePath` 记住来源文件；**在画布上编辑卡片会自动写回该 `.md`**
（外部编辑器改过文件时，先备份为 `<文件名>.conflict-时间戳.md` 再写回）；也可以选中卡片点「写回文件」手动同步。

## AI 模型 API（顶部「API 接口」或「⚙ 设置 → API 接口」）

独立版支持任何 **OpenAI 兼容**的 `chat/completions` 接口，可配置多套接口。在顶部「API 接口」或 `⚙ 设置` 里填写：

| 项 | 示例 |
| --- | --- |
| API 地址 | `https://api.deepseek.com/v1`（或 `https://api.openai.com/v1`、本地 Ollama `http://127.0.0.1:11434/v1` 等） |
| 模型名 | `deepseek-chat` / `gpt-4o-mini` / `qwen-plus` … |
| API Key | 对应平台的 key（本地 Ollama 可填任意非空值） |

- 「测试连接」会发一个最小请求验证地址 / Key / 模型；
- 保存后「生成」直接写到当前画布（便签 / 框 / 连线 / 修改 / 删除，模型返回 JSON 计划），Agent「开工」也可用；
- Key 只保存在本机 `desktop/data/ai-providers.json`（旧版 `ai-config.json` 会自动迁移），不会写进画板数据；可随时「清除 Key」。

## 组成

| 文件 | 作用 |
| --- | --- |
| `node.exe` | 可选的本机 Node 运行时（仓库不包含；`launcher.vbs` 会先找它，找不到就用 DSH 自带的 node） |
| `server.mjs` | 本地 HTTP 服务：画板 API（`/api/canvas.doc`）+ 静态页面 + 数据持久化 |
| `renderer/` | 页面外壳（React 挂载 DSH 插件里同一个 `client.js` 面板） |
| `launcher.vbs` / `launcher-debug.cmd` | 启动脚本本体（按需启动服务 + 打开 app 窗口） |
| `app.ico` | 桌面快捷方式 / 窗口图标（16–256 共 10 档；小尺寸用简化版，大尺寸用完整三层版） |
| `data/` | 本地画板数据（自动生成；不提交到 git） |

## 手动启动

```bat
cd /d <本目录>
node server.mjs
```

> 需要系统已安装 Node.js（或在目录里放 `node.exe`）；直接双击 `launcher.vbs` 时会自动查找 DSH 自带的 Node。
> 然后浏览器打开 <http://127.0.0.1:47822/>。
