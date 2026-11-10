window.__ModuleLoader__.load({
  id: '@local/infinite-canvas',
  factory(require) {
    'use strict';
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useRef, useMemo, useCallback } = React;

    /* ------------------------------------------------------------------ *
     * constants
     * ------------------------------------------------------------------ */
    const PANEL_KEY = 'infinite-canvas';
    const CLIENT_BUILD = '2026-11-10.2';
    const AI_HIGHLIGHT_MS = 2800;
    const POLL_MS = 700;
    const VIEWPORT_REPORT_MS = 600;
    const MIN_ZOOM = 0.12;
    const MAX_ZOOM = 4;
    const GRID_SIZE = 24;
    const NOTE_COLORS = {
      yellow: { bg: '#FFE8A3', line: '#EFCF75', ink: '#4A3A00', label: '黄' },
      blue: { bg: '#CFE4FF', line: '#A6CBF4', ink: '#0E3A63', label: '蓝' },
      green: { bg: '#D3F2D2', line: '#A6DEA5', ink: '#143D14', label: '绿' },
      pink: { bg: '#FFD9E6', line: '#F3B3CC', ink: '#5C1733', label: '粉' },
      purple: { bg: '#E5DCFF', line: '#C9B8F3', ink: '#2C1A5E', label: '紫' },
      orange: { bg: '#FFDCC2', line: '#F3BB90', ink: '#5A2A08', label: '橙' },
      gray: { bg: '#ECEEF2', line: '#CFD4DC', ink: '#2A2F38', label: '灰' },
      white: { bg: '#FFFFFF', line: '#DFE3E9', ink: '#1D2127', label: '白' },
    };
    const COLOR_KEYS = Object.keys(NOTE_COLORS);
    const SHAPES = ['rect', 'ellipse', 'diamond'];
    const TOOL_ITEMS = [
      { id: 'select', icon: 'cursor', shortcut: 'v' },
      { id: 'hand', icon: 'hand', shortcut: 'h' },
      { id: 'note', icon: 'note', shortcut: 'n' },
      { id: 'text', icon: 'text', shortcut: 't' },
      { id: 'shape', icon: 'shape', shortcut: 's' },
      { id: 'frame', icon: 'frame', shortcut: 'f' },
      { id: 'connect', icon: 'connect', shortcut: 'c' },
      { id: 'pen', icon: 'pen', shortcut: 'p' },
      { id: 'agent', icon: 'agent', shortcut: 'g' },
    ];
    const DEFAULT_SIZE = {
      note: { w: 240, h: 168 },
      text: { w: 340, h: 90 },
      shape: { w: 200, h: 140 },
      frame: { w: 600, h: 400 },
      image: { w: 300, h: 220 },
      stroke: { w: 1, h: 1 },
      agent: { w: 440, h: 340 },
      axis: { w: 1200, h: 150 },
    };
    const DEFAULT_COLOR = { note: 'yellow', text: 'white', shape: 'blue', frame: 'gray', image: 'white', stroke: 'white', agent: 'purple' };

    const TEXTS = {
      zh: {
        panelTitle: '通用画布',
        untitled: '未命名画板',
        select: '选择',
        hand: '抓手',
        note: '便签',
        text: '文本',
        shape: '形状',
        frame: '画框',
        connect: '连线',
        pen: '画笔',
        agent: 'Agent',
        undo: '撤销',
        redo: '重做',
        fit: '适应内容',
        zoomIn: '放大',
        zoomOut: '缩小',
        insertImage: '插入图片',
        duplicate: '复制',
        delete: '删除',
        edit: '编辑文字',
        syncing: '同步中',
        live: '已同步',
        offline: '连接断开',
        loading: '正在加载画板…',
        aiEditing: 'AI 正在编辑画板',
        aiNow: 'AI 更新了 {n} 处',
        emptyTitle: '通用画布',
        emptyAlias: 'UniCanvas',
        emptyModes: 'Agent | 通用画布 | 画笔',
        emptyBody: '本地文件可查询的数据库，提供多种视图和画布做笔记\n可视化 Agent 管理分工\n灵感一键展示',
        emptyStatus: '> 画板在线 · 等待输入',
        emptyCta: '⚡ 插入示例画板',
        emptyChipSummary: '📊 总结画板',
        emptyChipSplit: '🧩 拆成便签',
        emptyChipFlow: '🔀 画流程图',
        emptyHint: '双击空白 → 新建便签 · 滚轮平移 · Ctrl+滚轮缩放',
        copyPrompt: '复制给 AI 的指令',
        copied: '已复制',
        imageUrl: '图片地址',
        imagePlaceholder: '粘贴 https:// 或 data:image 地址',
        cancel: '取消',
        confirm: '确定',
        close: '关闭',
        colorLabel: '颜色',
        image: '图片',
        stroke: '画笔',
        selectionBarHint: '这排操作作用于当前选中的内容；按 Esc 取消选择',
        selectionKindMore: '等',
        agentStartShort: '开工',
        divergenceLabel: '世界线变动率',
        divergenceTitle: '世界线变动率：1.048596 是命运石之门世界线（Steins;Gate），数字会随机跳跃并偶尔收敛回这条世界线',
        fitFrame: '贴合内容',
        fitFrameEmpty: '画框里没有内容可贴合',
        fitFrameDone: '画框已贴合内容',
        autoHeight: '自动高度',
        autoHeightOn: '自动高度已开启：卡片会按内容自动伸缩，不再固定高度',
        autoHeightOff: '自动高度已关闭：恢复固定高度',
        autoHeightTip: '自动高度：卡片高度随内容自动调整，避免选择和内容错位',
        bigEditorTitle: '编辑文本',
        bigEditorHint: '支持 Markdown 语法；Ctrl/⌘+Enter 保存，Esc 取消',
        bigEditorPlaceholder: '输入文字内容…',
        bigEditorChars: '{n} 字',
        bigEditorSave: '保存',
        titlePlaceholder: '画板标题',
        connectHint: '点击起点，再连续点击目标即可画多条线（Esc 结束）；也可以直接拖拽到目标',
        connected: '已连接',
        selectedCount: '已选 {n} 项',
        emptyNote: '双击编辑文字',
        buildLoaded: '画板已加载：{v}',
        help: '功能介绍',
        helpTitle: '通用画布 · 功能说明',
        helpTextTitle: '文字编辑',
        helpTextBody:
          '双击便签 / 文本块 / 形状：进入编辑\n三击 Agent 卡：打开大编辑面板，写任务、角色设定，并选择产出方式（画板 / 文档），Ctrl/⌘+Enter 保存\n选中后按 Enter（或点底部铅笔按钮）也可以编辑\n双击画布空白处：新建一张便签\n支持中文输入法与多行文字：Enter 换行，Ctrl/⌘+Enter 保存\n点击画布空白处或按 Esc 结束编辑；编辑中切换面板、或 AI 改动导致重建，草稿也会自动保存\n便签、文本、形状、Agent 卡都可以拖动四角 / 四边缩放，卡片内文字会同步放大缩小\n长文本：便签超过 10 行或 320 字会按 Markdown 排版并允许卡内滚动，双击自动打开大编辑器；选择条可「转为文档卡」（更宽 + 自动高度）',
        helpCanvasTitle: '画布操作',
        helpCanvasBody:
          '滚轮：上下平移；Shift+滚轮：左右平移\nCtrl/⌘+滚轮：以光标为中心缩放\n空格+拖拽 或 中键拖拽：平移画布\n拖拽框选：批量选择；Shift+点击：加选\n拖动卡片四角 / 四边：手动改大小，卡片里的文字会跟着等比缩放\nDel / Backspace：删除选中；Ctrl/⌘+D：复制\nCtrl/⌘+Z 撤销，Ctrl/⌘+Shift+Z 重做\nCtrl/⌘+0 适应内容，Ctrl/⌘+A 全选\n工具栏「全选」：一键勾选全部节点，再点一次取消勾选\n选中任意节点后点选择条「勾选同类」：一次勾选全部同类型节点（例如所有 Agent）\n工具栏「↺ 历史」：打开画布列表 + 历史快照面板（详见下方「多画布与历史」）\n小地图：右下角缩略图显示全部节点与当前视野；点一下或拖动即可快速跳转，「–」可收起（收起后点右下角小按钮展开）\n工具栏「⚙ 设置」：语言、小地图 / 画框拖动开关、数据位置与构建信息；独立窗口还能在这里配置 API 接口（OpenAI 兼容，填地址 / 模型 / Key 后即可用「生成」和 Agent 开工）\n左侧栏「笔记库 / 标签 / 链接 / 搜索 / 数轴 / 关系图」：浏览本地 Markdown 文件夹，点 .md / .canvas / 图片即可导入画布；按 #标签 过滤高亮；全文搜索卡片并跳转；「数轴」里插入 / 定位 / 编辑画布上的数轴卡；「关系图」打开全屏力导向关系网络（侧栏可用左缘箭头收起）\n画笔：按住拖动即可随手画任意多条线（选中后可改色/删除）\n连线：点起点后连续点目标，可画无限条线与分叉；Esc 结束\n画框：默认拖动会带着框内节点一起移动（整块拖动）；选中画框后可在选择条关闭「连带内容」只移动画框，或按住 Alt 临时只动框；把节点拖进画框会自动归属，拖出去自动解除',
        helpBoardsTitle: '多画布与历史',
        helpBoardsBody:
          '工具栏「↺ 历史」：同一个面板分两段——上方是画布列表（＋ 新建画布、点行切换、✎ 重命名、✕ 删除），下方是当前画布的历史快照\n切换画布后，内容、视口、历史都是各自独立的；每块画布仍有独立标题（点顶部标题可改）\n空画板的初始界面直接显示画布 chips 和最近 3 条历史，点一下即可切换 / 恢复，不用先打开面板\n「＋ 保存当前快照」保存一版（可命名）；「↺ 恢复」回滚；恢复前会自动把当前状态再存一份，所以恢复也能反悔\n删除画布会连同它的历史快照一起删除（至少保留一块画布）；每块画布最多保留 20 个快照（自动保留最新），全部数据存在本机、重启不丢',
        helpUpdateTitle: '最近更新',
        helpUpdateBody:
          'v1.6 关系图：左侧栏最下面新增「关系图」图标，打开全屏力导向关系网络（当前画布 / 全部画布 / 笔记库；搜索、标签/孤立节点开关、力参数、双击跳转，布局会记住）\n' +
          'v1.7 装饰系统：「皮肤与装饰」面板——皮肤决定背景（星空 / 赛博朋克 / 极光 / 蓝图 / 碳纤维 / 纯黑或自定义图），装饰（鲸鱼 / 彩虹猫 0/1 粒子、赛博极光、命运石之门）可多选叠加、与皮肤同时生效；生物在画布背后游动、鼠标移动有视差，画布内容与操作不受影响\nv1.6 粒子生物：鲸鱼 / 彩虹猫 0/1 字符粒子生物，后续并入装饰\\nv1.5 数轴 / 时间线：入口移到了左侧栏「数轴」（搜索图标下面）：插入横向 / 纵向数轴卡，点刻度即可在轴下新建卡片，列表可定位、编辑\nv1.4 小地图：画板右下角的缩略图显示全部节点与当前视野，点击 / 拖动可快速定位，可收起，开关状态会记住\nv1.3 多画布 + 历史快照：工具栏「↺ 历史」面板管理画布与快照，空画板初始界面也能直接新建画布 / 恢复历史\n「生成」= 原来的「Agent」按钮（AI 直接生成到画板）；原「添加文字」按钮已移除，用左侧 T 文本工具新建文字块\n工具栏「全选」+ 选择条「勾选同类」：一键批量选中；模型选择（工具栏「API 接口」）只影响本画布\n画布可切换 / 重命名 / 删除；AI 生成与 Agent 开工只作用于当前画布，不会串到其他画布\n赛博朋克视觉：世界线变动率仪表、扫描线、霓虹选中框；皮肤可换星空 / 赛博朋克或上传背景图',
        helpProjectTitle: '项目与 Agent',
        helpProjectBody:
          '工具栏「项目」→「新建独立项目」：在当前视野中央生成项目画框 + 负责人 Agent + 提示便签\n「项目」菜单列出所有项目画框（含暂时没有 Agent 的空项目），点一下即跳转定位\n选中项目画框 →「关联本地路径」：填写本地文件夹 / 文件路径，保存后画框右上角出现 📂，点击用资源管理器打开\nAgent 卡三击可以写任务；点「开工」让它在画板上产出内容；卡片可拖动 / 缩放，文字同步缩放\n点「派活」把工作拆成多个子项目：每个项目一个画框 + 一张子 Agent 卡，自动连线（最多 6 个子 Agent、最多两层）；弹窗可填项目名（逗号分隔），留空则由 AI 拆分\n子 Agent 运行时会以「自己项目画框内的节点」为上下文，不会看到其他项目的内容\n父卡显示「子任务 x/y」；点「跑子任务」会逐个运行子 Agent，结果写在各自画框里，最后汇总回父卡\n画框与 Agent 的归属：把 Agent/便签拖进画框即归属；选中画框点「收纳框内节点」可批量归属；选中节点点「移出画框」可解除',
        helpMediaTitle: '图片 · 提示词 · 皮肤 · 模型',
        helpMediaBody:
          '图片：按主题在本机生成 SVG 图片或 GIF 动图，插入当前视野中央，可拖动 / 缩放 / 删除\n提示词：保存常用提示词，随时插入 Agent 输入框、角色设定，或直接放到画板上；「管理」里可编辑 / 删除\n皮肤与装饰：皮肤决定背景（星空 / 赛博朋克 / 极光 / 蓝图 / 碳纤维 / 纯黑或自定义背景图），装饰（鲸鱼 / 彩虹猫 0/1 粒子、赛博极光、命运石之门）可多选叠加、和皮肤同时生效；鼠标移动有视差\nAPI 接口：工具栏「API 接口」选择画板 AI 生成 / Agent 执行使用的模型（可添加自定义接口）；选「跟随默认模型」则使用 Harness 默认模型，只影响画板，不影响其他对话\n生成：工具栏「生成」打开 AI 生成弹窗，可直接让 Agent 在画板上产出内容',
        helpBulkTitle: '多选与批量操作',
        helpBulkBody:
          '框选 / Shift+点击 / 工具栏「全选」/ 选择条「勾选同类」：都能一次选中多个节点\n选中后选择条支持批量改色、复制、删除\n多选后拖动其中一个会整体移动；只想移动一个时先单独选中它\n缩放只影响被拖动的那个卡片，其他卡片不会被带动\n选中框与 8 个缩放手柄都在卡片内部，缩放 / 拖动时始终贴合卡片',
        helpKeysTitle: '快捷键速查',
        helpKeysBody:
          'V 选择 · H 抓手 · N 便签 · T 文本 · S 形状 · F 画框 · C 连线 · P 画笔 · G Agent\nEnter / F2：编辑选中节点；Esc：结束编辑或取消选择\nCtrl/⌘+A 全选 · Ctrl/⌘+D 复制 · Del / Backspace 删除\nCtrl/⌘+Z 撤销 · Ctrl/⌘+Shift+Z 重做 · Ctrl/⌘+0 适应内容\n空格+拖拽 / 中键拖拽 平移画布；滚轮上下平移；Shift+滚轮左右平移；Ctrl/⌘+滚轮缩放',
        helpAiTitle: '和 DeepSeek 一起画',
        helpAiBody:
          '通用画布可以读这块画板，也能直接创建、修改便签\n点工具栏「生成」直接写需求，Agent 会在画板上生成\n也可以用 Agent 卡干活：三击写任务 → 开工，或者「派活」给子 Agent\n试试在对话里说：「读一下画板，把这些想法拆成 5 张便签」\nAI 与 Agent 只作用于当前画布；切换画布后，改动只会落在当前画布\nAgent 的修改会实时出现，被更新的节点会闪烁高亮\n画板内容自动保存在本机，重启不丢。',
        helpClose: '知道了',
        deleteSelected: '删除选中（Del）',
        addText: '添加文字',
        addTextHint: '在视口中央新建一个文字块并直接输入',
        aiGenerate: '生成',
        aiTitle: '让 Agent 在画板上生成',
        aiPlaceholder: '例如：把这个想法拆成 5 张便签，用箭头连成流程图',
        aiHint: '由 Agent 直接生成到画板上，不需要切换到对话',
        aiSubmit: '开始生成',
        aiSent: '已发给 Agent，正在画板上生成…',
        aiSentTo: '已发给「{title}」，正在画板上生成…',
        aiPendingChip: 'Agent 正在生成…',
        aiOpenChat: '打开对话',
        aiNoChange: '没有收到画板的 AI 改动，点开对话看看原因',
        aiQueued: '对话正忙，任务已排队；空闲后会自动生成',
        aiGenerated: '已在画板上生成：新增 {created} 个、修改 {updated} 个、删除 {deleted} 个（rev {rev}）',
        aiDirectFailed: 'AI 生成失败：{message}',
        aiBusyText: '正在生成…',
        aiModeLabel: '模式',
        aiModeAsk: '询问',
        aiModeAskHint: '生成前先预览方案，确认后写入画板',
        aiModeAuto: '自动',
        aiModeAutoHint: '无需确认，直接生成到画板',
        aiPlanTitle: '确认生成方案',
        aiPlanIntro: '模型给出的改动如下，确认后写入画板：',
        aiPlanCreated: '新增 {n} 个节点',
        aiPlanUpdated: '修改 {n} 个节点',
        aiPlanDeleted: '删除 {n} 个节点',
        aiPlanConfirm: '确认生成',
        agentStatusIdle: '待命中',
        agentStatusRunning: '开工中',
        agentStatusDone: '搞定了',
        agentStatusFailed: '翻车了',
        agentTaskPlaceholder: '三击我，写下要做什么…',
        agentRun: '开工',
        agentRunShort: '开工',
        agentRunAgain: '再来一次',
        agentRunAgainShort: '再来',
        agentNoTask: '空转中 · 还没任务',
        agentRunningMeta: '正在画板上忙…',
        agentDoneMeta: '凯旋归来',
        agentFailedMeta: '再试一次？',
        agentWorkingFor: '开工 {n}s 了…',
        agentEmptyTask: '先给我写个任务吧（三击卡片）',
        agentEmptyHintText: '三击卡片派活 · Enter 保存',
        agentProjectChip: '📁 {name}',
        agentParentChip: '↳ {name}',
        agentFrameChip: '▣ {name}',
        detachFrame: '移出画框',
        detachFrameDone: '已移出画框，之后单独拖动这个节点',
        frameGroupChip: '画框：{name}',
        agentCreatedAtPoint: '已在点击的位置创建 Agent',
        agentPlaceHint: '在画布上点击要放置的位置，随后会打开 Agent 编辑面板',
        agentDelegate: '派活',
        agentDelegateTip: '把这个 Agent 的工作拆给多个子 Agent（每个负责一个项目）',
        agentRunChildren: '跑子任务',
        agentRunChildrenTip: '依次运行所有子 Agent，并把结果汇总到这张卡',
        agentChildrenProgress: '子任务 {done}/{total}',
        agentChildrenChip: '{n} 个子 Agent',
        agentNoChildren: '还没有子 Agent，先点「派活」',
        agentChildrenRunning: '正在逐个运行子 Agent…',
        agentParentLocked: '子 Agent 不能再派活（最多两层）',
        delegateTitle: '派活给子 Agent',
        delegateHint:
          '每个项目会生成一张子 Agent 卡 + 一个项目画框，并连到当前 Agent。项目名用逗号 / 换行分隔（最多 6 个）；留空则由 AI 自动拆分。',
        delegatePlaceholder: '例如：品牌官网、小程序、数据看板',
        delegateConfirm: '派活',
        delegateBusy: '拆分中…',
        delegateDone: '已派发 {n} 个子 Agent',
        delegateFailed: '派活失败：{message}',
        runChildrenSummary: '子任务完成 {done}/{total}，失败 {failed} 个',
        agentQuips:
          '我在这儿，等你派活～\n给我一个任务，我立刻开画 ✨\n三击卡片，写下要做什么\n空转中…要不给我个活儿？\n我准备好啦，随时开工！\n别看我小，画板我说了算 😎',
        roleLabel: '角色设定',
        roleSet: '设定角色',
        roleEdit: '编辑角色',
        roleDialogTitle: 'Agent 角色设定',
        rolePlaceholder:
          '把角色 / 任务 / 约束模板贴进来，例如：\n# 角色\n你是一位做了 200 场以上用户访谈的用户研究员，擅长《The Mom Test》式提问法…\n# 任务\n根据我提供的产品想法，设计一份可直接照着念的用户访谈提纲\n# 约束\n禁止「是不是」「会不会」等诱导式提问；每个问题 ≤25 字',
        roleInsertExample: '插入示例角色',
        roleExample:
          '# 角色\n你是一位做了 200 场以上用户访谈的用户研究员，擅长《The Mom Test》式提问法：只问用户过去真实发生过的行为和已付出的代价，绝不问「你会不会用」「你觉得好不好」。\n# 任务\n根据产品想法，设计一份可以直接照着念的用户访谈提纲。\n# 约束\n- 问题必须开放式，禁止诱导式或假设未来式问法\n- 每个问题不超过 25 个字，保证口语可念\n- 问过去的行为与已付出的成本，不问未来意愿\n# 输出格式\nMarkdown：产品假设复述 / 待验证假设 H1..Hn / 筛选标准/ 访谈提纲表格 / 危险问题清单 / 记录表模板\n# 自检\n输出前逐条确认：每个主问题都对应至少一条假设；时间盒加总等于访谈时长。',
        roleOutputLabel: '产出方式',
        roleOutputCanvas: '画布结构化',
        roleOutputCanvasHint: '生成便签 / 连线 / 画框等画布元素',
        roleOutputDocument: '文本文档',
        roleOutputDocumentHint: '生成一份长文档：自动排成画框 + 文本卡片',
        roleDocHint: '文本文档模式下，任务描述就是文档主题；长内容会自动分页成多张文本卡片。',
        roleSave: '保存',
        roleSaved: '角色设定已保存',
        rolePreview: '角色：{text}',
        roleNone: '未设定角色',
        promptLib: '提示词',
        promptLibTitle: '提示词库',
        promptLibHint: '把常用提示词存起来，随时插入 Agent 输入框、角色设定，或直接生成到画板、放到画板上。',
        promptNew: '新建',
        promptUntitled: '未命名提示词',
        promptNameLabel: '名称',
        promptNamePlaceholder: '例如：用户访谈提纲',
        promptBodyLabel: '提示词内容',
        promptBodyPlaceholder: '粘贴或输入提示词…（可保留 {{占位符}}，使用时按需替换）',
        promptSave: '保存',
        promptSaved: '提示词已保存',
        promptDelete: '删除',
        promptDeleteConfirm: '确定删除这条提示词吗？',
        promptDeleted: '提示词已删除',
        promptEmpty: '还没有提示词：点「新建」，或先插入示例提示词。',
        promptNoMatch: '没有匹配的提示词',
        promptPickAgent: '插入到 Agent 输入框',
        promptPickRole: '插入到角色设定',
        promptToCanvas: '放到画板上',
        promptToCanvasDone: '提示词已放到画板上',
        promptGenerate: '生成',
        promptGenerateHint: '用这条提示词打开 AI 生成弹窗',
        promptCopy: '复制',
        promptCopied: '已复制',
        promptInsertExample: '插入示例提示词',
        promptSearchPlaceholder: '搜索提示词…',
        promptExampleInterview:
          '请为「{{产品想法}}」设计一份用户访谈提纲：先用 3~5 句复述产品假设并列出要验证的假设 H1..Hn；给出受访者筛选标准；按时间盒设计提纲（开场 2 分钟、热身 5 分钟、现状深挖 15 分钟、替代方案与代价 10 分钟、收尾 3 分钟）；每个主问题附 2 个追问句；附访谈记录表模板；最后列出 5 个危险问题。全部使用开放式问题，每问不超过 25 字。',
        promptExampleCompete:
          '分析「{{产品}}」的竞品：列出 3~5 个主要竞品，逐个说明定位、目标用户、核心功能、定价与增长方式；输出对比表；最后给出 3 条我们可以切入的差异化机会，并标注风险。',
        promptExampleMinutes:
          '把下面这段会议记录整理成结论：{{会议记录}}。输出格式：已达成的决定 / 待确认的问题 / 负责人与截止时间 / 风险与依赖。',
        promptExampleRewrite: '把选中的内容改写成更简洁、口语化的表达，保留原意与关键数据；如果超过 3 句，先给一句话总结。',
        promptExampleInterviewName: '用户访谈提纲',
        promptExampleCompeteName: '竞品分析',
        promptExampleMinutesName: '会议记录整理',
        promptExampleRewriteName: '改写润色',
        skin: '皮肤',
        skinTitle: '画布皮肤与装饰',
        skinHint: '皮肤决定背景，装饰是叠在上面的动效，两者可同时开启；选择会保存在本机，下次打开还在。',
        skinPresetLabel: '内置皮肤',
        skinUpload: '上传背景图',
        skinUploadHint: '支持 JPG / PNG / WebP，会自动缩放到 1600px 内并保存在本机',
        skinRemove: '恢复默认皮肤',
        skinCustomLabel: '自定义背景',
        skinApplied: '皮肤已切换',
        skinUploadFailed: '上传失败：{message}',
        skinStarry: '深空星野',
        skinNeon: '赛博霓虹',
        skinAurora: '极光夜',
        skinBlueprint: '蓝图',
        skinCarbon: '碳纤维',
        skinVoid: '纯黑极简',
        skinWhale: '鲸鱼 · 0/1 粒子',
        skinRainbowCat: '彩虹猫 · 0/1 粒子',
        decorTitle: '装饰（可多选，与皮肤同时生效）',
        decorHint: '装饰叠加在皮肤之上：鲸鱼从左往右游过、彩虹猫从上往下飘落，0/1 粒子平时是安静的点线，鼠标碰到会炸成彩色 0/1 和白色方块（有视差）；赛博极光 / 命运石之门提供氛围。',
        decorWhale: '鲸鱼 · 0/1 粒子',
        decorRainbowCat: '彩虹猫 · 0/1 粒子',
        decorAurora: '赛博极光',
        decorSteinsGate: '命运石之门',
        decorApplied: '装饰已更新',
        agentRunning: 'Agent 正在执行任务…',
        agentDoneToast: 'Agent 完成：新增 {n} 个节点',
        agentDocDone: '文档已生成：{chars} 字',
        agentFailedToast: 'Agent 执行失败：{message}',
        projects: '项目',
        projectsTitle: '项目列表',
        projectNew: '新建独立项目',
        projectNewHint: '在画板右侧新建一个独立项目：项目画框 + 负责人 Agent',
        projectCreated: '已创建项目「{name}」',
        projectEmpty: '还没有项目：点「新建独立项目」',
        projectJumpTip: '点击跳转到该项目',
        projectJump: '项目',
        projectCount: '{n} 个子 Agent',
        projectPrefix: '项目',
        projectNoteHint: '把任务写进负责人 Agent，然后点卡片上的「派活」拆成子项目；子 Agent 会在这个画框里各自产出。',
        projectWorkspace: '项目工作区',
        openWorkspace: '打开工作区',
        openWorkspaceTip: '在资源管理器中打开该本地路径',
        linkPath: '关联本地路径',
        pathDialogTitle: '项目本地路径',
        pathHint: '填写本地文件夹或文件路径（例如 D:\\项目\\docs）。保存后项目画框右上角会出现 📂 按钮，点击即可在资源管理器打开。',
        pathPlaceholder: 'D:\\项目文件夹',
        pathSave: '保存路径',
        pathSaved: '路径已保存',
        pathRequired: '请先填写路径',
        pathClear: '清除路径',
        pathOpenFailed: '打开失败：{message}',
        gatherFrame: '收纳框内节点',
        gatherFrameTip: '把画框范围内的节点（含 Agent）收进这个画框，之后移动/缩放画框会带着它们一起走',
        gatherFrameDone: '已收纳 {n} 个节点',
        gatherFrameEmpty: '画框范围内没有可收纳的节点，先把 Agent 拖进画框范围内再试',
        model: 'API 接口',
        modelTitle: 'API 接口 / 模型',
        modelHint: '这里选择的是「通用画布」里 AI 生成 / Agent 执行使用的模型；不影响其他对话；可在下方添加自定义 API 接口（OpenAI 兼容）。选「跟随默认」则使用宿主默认模型。',
        modelFollowDefault: '跟随默认模型',
        modelDefaultTag: '默认',
        modelCurrentTag: '当前',
        modelSaved: '模型已切换：{name}',
        modelSavedDefault: '已改为跟随默认模型',
        modelLoading: '正在读取可用模型…',
        modelFailed: '读取模型列表失败：{message}',
        modelEmpty: '没有可用的模型，请先在 Harness 设置里配置模型',
        modelClose: '关闭',
        aiProviders: '自定义接口',
        aiProviderAdd: '添加接口',
        aiProviderEdit: '编辑接口',
        aiProviderDelete: '删除接口',
        aiProviderDeleteConfirm: '确定删除 AI 接口「{name}」吗？',
        aiProviderTest: '测试连接',
        aiProviderTesting: '测试中…',
        aiProviderSaved: '接口已保存：{name}',
        aiProviderDeleted: '接口已删除',
        aiProviderFailed: '接口操作失败：{message}',
        aiProviderEmpty: '还没有自定义接口：可接 DeepSeek / OpenAI / Kimi / 智谱 / 本地 Ollama 等 OpenAI 兼容接口。',
        aiProviderFormHint: '填写一个 OpenAI 兼容接口（/chat/completions）。Key 只保存在本机，不会写进画板数据。',
        aiProviderName: '名称',
        aiProviderNamePlaceholder: '例如 DeepSeek 官方',
        aiProviderBaseUrl: 'API 地址',
        aiProviderBaseUrlPlaceholder: 'https://api.deepseek.com/v1',
        aiProviderKey: 'API Key',
        aiProviderKeyPlaceholder: '粘贴 Key；留空保持不变',
        aiProviderKeySaved: '已保存：{masked}（留空保持不变）',
        aiProviderKeyMissing: '未配置 Key',
        aiProviderKeyHint: 'Key 只存本机；自定义接口由画板直连，不经过 Harness 账号',
        aiProviderModels: '模型列表',
        aiProviderModelsPlaceholder: '逗号或换行分隔，例如 deepseek-chat, deepseek-reasoner',
        aiProviderDefaultModel: '默认模型',
        aiProviderAdvanced: '高级参数',
        aiProviderTemperature: '温度',
        aiProviderMaxTokens: '最大 tokens',
        aiProviderTimeout: '超时（秒）',
        aiProviderSave: '保存接口',
        aiProviderTestOk: '连接成功',
        aiProviderTestFailed: '连接失败：{message}',
        frameCarry: '连带内容',
        frameCarryTip:
          '开关：拖动画框时是否带着框内节点一起移动。默认开启（鼠标拖动整块一起走）；关闭后只移动画框，按住 Alt 拖动可临时连带',
        frameCarryOn: '拖动画框将连带框内内容',
        frameCarryOff: '拖动画框只移动画框，框内内容留在原地',
        selectAll: '全选',
        selectAllTip: '一键勾选画板上全部节点；再次点击取消勾选（快捷键 Ctrl+A）',
        selectAllDone: '已勾选 {n} 个节点',
        selectCleared: '已取消勾选',
        selectSameKind: '勾选同类',
        selectSameKindTip: '勾选画板上与当前选中项同类型的所有节点（例如全部 Agent）',
        selectSameKindDone: '已勾选 {n} 个同类节点',
        boards: '画布',
        boardsTitle: '画布列表',
        boardNew: '新建画布',
        boardEmpty: '还没有画布',
        boardNodes: '{n} 节点',
        boardCurrent: '当前',
        boardRename: '重命名',
        boardRenamePrompt: '画布名称',
        boardRenamed: '已重命名画布',
        boardDelete: '删除画布',
        boardDeleteConfirm: '确定删除画布「{name}」吗？该画布的历史快照也会一起删除。',
        boardCreated: '已新建画布「{name}」',
        boardSwitched: '已切换到「{name}」',
        boardFailed: '画布操作失败：{message}',
        history: '历史',
        historyTitle: '历史快照',
        historySave: '保存当前快照',
        historySavePrompt: '给这个快照起个名字（可留空）',
        historySaved: '已保存快照（{n} 个节点）',
        historyEmpty: '还没有历史快照：点「保存当前快照」',
        historyRestore: '恢复',
        historyDelete: '删除快照',
        historyRestoreConfirm: '恢复到这个快照？当前画布会先自动保存一份快照。',
        historyRestored: '已恢复到该快照（恢复前的状态已自动保存）',
        historyNodes: '{n} 节点',
        historyFailed: '历史快照操作失败：{message}',
        minimap: '小地图',
        minimapTitle: '小地图：显示全部内容与当前视野，点击或拖动即可快速定位',
        minimapHide: '收起小地图',
        minimapShow: '展开小地图',
        settings: '设置',
        settingsTitle: '设置',
        settingsAppearance: '外观',
        settingsMinimap: '小地图',
        settingsMinimapHint: '右下角缩略图：点击 / 拖动快速定位',
        settingsFrameCarry: '画框拖动连带内容',
        settingsFrameCarryHint: '拖动画框时带着框内节点一起移动（按住 Alt 临时反向）',
        settingsSkin: '皮肤与背景',
        settingsSkinHint: '星空 / 赛博朋克主题、鲸鱼 / 彩虹猫 / 赛博极光 / 命运石之门装饰，或上传自己的背景图',
        settingsLanguage: '语言',
        settingsLanguageHint: '界面文字，立即生效',
        settingsData: '数据',
        settingsDataPath: '存储位置',
        settingsDataHint: '所有画布与历史快照都保存在这里',
        settingsOpenFolder: '打开文件夹',
        settingsDataStats: '{canvases} 块画布 · {snapshots} 个快照',
        settingsImportDsh: '导入画板',
        settingsImportDshHint: '用桌面版画板覆盖本机数据',
        settingsImportDone: '已导入画板',
        settingsAbout: '关于',
        settingsClientBuild: '客户端构建',
        settingsHostBuild: 'Host 构建',
        settingsMode: '运行模式',
        settingsModeStandalone: '通用画布',
        settingsModePlugin: '插件模式',
        settingsHelp: '打开功能说明',
        settingsClose: '关闭',
        settingsUnavailable: '暂不可用',
        settingsOn: '开',
        settingsOff: '关',
        settingsLoading: '读取设置…',
        settingsFailed: '读取设置失败：{message}',
        settingsAiTitle: 'API 接口',
        settingsAiHint: '旧的单接口设置，会同步为第一个 API 接口；多接口请点顶部「API 接口」管理',
        settingsApiBase: 'API 地址',
        settingsApiBasePlaceholder: 'https://api.deepseek.com/v1',
        settingsApiModel: '模型名',
        settingsApiModelPlaceholder: 'deepseek-chat',
        settingsApiKey: 'API Key',
        settingsApiKeyPlaceholder: '已保存，留空保持不变',
        settingsAiSave: '保存配置',
        settingsAiTest: '测试连接',
        settingsAiClear: '清除 Key',
        settingsAiSaved: 'AI 模型配置已保存',
        settingsAiTesting: '测试连接中…',
        settingsAiTestOk: '连接成功 · {ms}ms · {model}',
        settingsAiTestFailed: '连接失败：{message}',
        settingsAiKeyCleared: '已清除 API Key',
        settingsAiNoKey: '还没有配置 API Key，AI 生成不可用',
        settingsAiSavedKey: '当前 Key：{masked}',
        settingsAiLocalHint: 'Key 只保存在本机 desktop/data 目录，不会写进画板数据',
        settingsAiNeedsBase: '请先填写 API 地址和模型名',
        sidebarCollapse: '收起侧栏',
        sidebarExpand: '展开侧栏',
        sidebarVault: '笔记库',
        sidebarTags: '标签',
        sidebarSearch: '搜索',
        sidebarVaultHint: '本地 Markdown 文件夹：点文件即可导入到画布（.md / .canvas / 图片）',
        sidebarVaultPlaceholder: '例如 D:\\我的笔记',
        sidebarVaultLoad: '载入',
        sidebarVaultEmpty: '这个文件夹里没有可导入的文件',
        sidebarVaultTruncated: '文件太多，只显示了前 {n} 个',
        sidebarVaultImported: '已导入「{name}」（{n} 个节点）',
        sidebarVaultFailed: '导入失败：{message}',
        sidebarVaultNotSet: '先填写笔记库路径再点「载入」',
        sidebarTagsHint: '当前画布里的 #标签，点一下过滤高亮',
        sidebarTagsEmpty: '当前画布还没有标签（在卡片文字里写 #标签 即可）',
        sidebarTagClear: '清除筛选',
        sidebarTagActive: '正在筛选 #{tag}',
        sidebarSearchPlaceholder: '搜索当前画布的卡片…',
        sidebarSearchEmpty: '输入关键词搜索卡片文字',
        sidebarSearchNoResult: '没有找到匹配的卡片',
        sidebarSearchHint: '点一下结果即可跳转并选中',
        sidebarImportCanvas: '导入 Obsidian 画布',
        sidebarLinks: '链接',
        sidebarLinksHint: '卡片文字里的 [[双向链接]]：查看谁引用了我、我引用了谁',
        sidebarLinksNoSelection: '选中一张卡片查看它的链接',
        sidebarLinksNone: '这张卡片没有 [[链接]]',
        sidebarLinksOut: '我指向',
        sidebarLinksIn: '指向我',
        sidebarAxis: '数轴',
        sidebarAxisHint: '当前画布上的数轴 / 时间线：点轴上的刻度即可原地新建卡片；这里可以直接插入、定位和编辑',
        sidebarAxisEmpty: '当前画布还没有数轴，点上面「插入数轴」开始',
        sidebarAxisCards: '已建卡 {n}',
        sidebarAxisJump: '点一下定位到这张数轴',
        writeBack: '写回文件',
        writeBackTip: '把这张卡片的内容写回它绑定的本地 Markdown 文件',
        writeBackDone: '已写回文件：{path}',
        writeBackUnchanged: '文件和卡片一致，无需写回',
        writeBackConflict: '检测到外部修改，已备份为 {file} 后再写回',
        writeBackFailed: '写回失败：{message}',
        convertToDoc: '转为文档卡',
        convertToDocTip: '内容较长：转换为更宽的文档卡，Markdown 排版 + 自动高度',
        longNoteHint: '长文便签：双击打开大编辑器，卡内可滚动',
        tagsAll: '全部画布',
        tagsAddPlaceholder: '输入标签，如 灵感',
        tagsAdd: '加标签',
        tagsAddTip: '给选中的卡片追加这个 #标签',
        tagsAdded: '已给选中卡片加上 #{tag}',
        tagsNoSelection: '先选中一张卡片',
        linksCanvas: '画布连线',
        linksSameTag: '同标签卡片',
        linksAddPlaceholder: '链接到的卡片标题 / 文件名',
        linksAdd: '添加链接',
        linksAdded: '已添加 [[{target}]]',
        linksNoTarget: '先选中一张卡片',
        searchAll: '全局',
        searchAllPlaceholder: '全局搜索所有画布与笔记库…',
        searchAllEmpty: '没有全局结果',
        searchGlobalHint: 'Enter 全局搜索 · 点击结果跳转',
        axis: '数轴',
        axisTitle: '数轴 / 时间线',
        axisConfigTitle: '插入数轴',
        axisEditTitle: '编辑数轴',
        axisName: '标题',
        axisOrientation: '方向',
        axisHorizontal: '横向',
        axisVertical: '纵向',
        axisMin: '起点',
        axisMax: '终点',
        axisStep: '步长',
        axisUnit: '单位',
        axisCreate: '插入数轴',
        axisSave: '保存',
        axisEdit: '编辑数轴',
        axisTickHint: '点刻度即可新建一张卡片',
        axisInvalid: '起点需要小于终点',
        axisTickAdded: '已在刻度位置新建卡片',
        axisDeleteHint: '选中后按 Del 删除数轴（卡片不受影响）',
        helpAxisTitle: '数轴 / 时间线',
        helpAxisBody:
          '入口：左侧栏最下面的「数轴」图标（搜索图标下面）\n点「＋ 插入数轴」：填标题、方向（横向 / 纵向）、起点、终点、步长、单位，确定后插入当前视野中央\n点数轴上的任意刻度：立刻在轴下新建一张便签，内容就是该刻度值\n点左侧栏「数轴」里的一条：定位并选中这张数轴卡；点行尾 ✎ 可重新编辑范围 / 步长 / 单位 / 方向\n双击画布上的数轴卡也能编辑；拖动四角缩放宽高；选中按 Del 只删数轴，已建卡片不受影响',
        helpGraphTitle: '关系图（力导向）',
        helpGraphBody:
          '入口：左侧栏最下面「关系图」图标（数轴下面）；全屏力导向网络视图\n范围：当前画布 / 全部画布 / 笔记库；笔记库模式还会把画布卡片和它导入的源文件用「同源文件」虚线连起来\n节点 = 卡片、笔记库 .md 文件、#标签；边 = 画布连线、[[wiki 链接]]、同标签、同源文件\n操作：拖拽节点调整布局，拖空白平移，滚轮缩放；单击节点高亮它和邻居，点信息条「打开」按钮打开（便签 / 文本直接打开文本编辑，其他卡片跳转选中，笔记文件导入画布，标签筛选）；双击已取消，防止误触\n顶栏：搜索过滤、标签/孤立节点/名称开关、力参数（斥力 / 连线距离 / 向心力）、重新布局 / 适应视图 / 刷新；布局会自动记住；节点会持续缓慢漂浮，点「动画」可暂停 / 继续',
        graph: '关系图',
        graphTitle: '关系图 · 力导向网络',
        graphBack: '返回画布',
        graphHint: '拖拽节点 · 滚轮缩放 · 双击打开',
        graphScopeCanvas: '当前画布',
        graphScopeAll: '全部画布',
        graphScopeVault: '笔记库',
        graphSearchPlaceholder: '搜索节点（标题 / 标签）…',
        graphLoading: '正在生成关系网络…',
        graphFailed: '关系图读取失败：{message}',
        graphEmpty: '当前范围还没有关系节点：建几张卡片、给卡片加 [[链接]] / #标签，或切换到「全部画布 / 笔记库」',
        graphEmptyVault: '还没有设置笔记库路径：先到左侧栏「笔记库」载入一个 Markdown 文件夹',
        graphTruncated: '节点太多，只显示了前 {n} 个',
        graphRelayout: '重新布局',
        graphFit: '适应视图',
        graphRefresh: '刷新',
        graphForce: '力参数',
        graphRepel: '斥力',
        graphLinkDistance: '连线距离',
        graphGravity: '向心力',
        graphShowTags: '标签节点',
        graphShowOrphans: '孤立节点',
        graphShowLabels: '名称',
        graphAnimate: '动画',
        graphLegend: '图例',
        graphNodes: '{n} 节点',
        graphEdges: '{n} 连线',
        graphKindCanvas: '画布连线',
        graphKindWiki: '[[链接]]',
        graphKindTag: '同标签',
        graphKindSync: '同源文件',
        graphKindCard: '卡片',
        graphKindFile: '笔记文件',
        graphKindTagNode: '标签',
        graphOpen: '打开',
        graphOpenText: '打开文本',
        graphDoubleHint: '单击选中节点 · 拖拽调整位置 · 用上方「打开」按钮打开',
        graphDoubleOff: '双击已取消：请点上方「打开」按钮（防止误触）',
        graphSelected: '已选中',
        graphDegree: '连接数 {n}',
        graphFilesScanned: '扫描 {n} 个笔记',
        quickTitle: '快速切换',
        quickPlaceholder: '搜索卡片 / 画布 / 笔记库文件…',
        quickHint: '↑↓ 选择 · Enter 打开 · Esc 关闭',
        quickNoResult: '没有匹配项',
        quickKindCard: '卡片',
        quickKindCanvas: '画布',
        quickKindFile: '文件',
        mediaGenerate: '图片',
        mediaTitle: '生成图片 / 动图',
        mediaTabImage: '图片',
        mediaTabGif: 'GIF 动图',
        mediaPromptLabel: '主题',
        mediaPromptPlaceholder: '一句话描述，例如：产品发布会海报',
        mediaStyleLabel: '风格',
        mediaRatioLabel: '尺寸',
        mediaSubtitle: '通用画布 · 本地程序化生成',
        mediaGenerateBtn: '生成并插入画板',
        mediaBusy: '生成中…',
        mediaInserted: '已生成并插入画板',
        mediaFailed: '生成失败：{message}',
        mediaPromptRequired: '请先输入一句主题',
        mediaLimitTitle: '能力上限与用法',
        mediaLimits:
          '· 本地程序化生成：偏设计/图表风格，不做照片级或 AI 写实插画\n· 图片：矢量 SVG 输出，尺寸上限 2048×2048，秒级完成\n· 动图：GIF 360×203、10 帧、约 1 秒循环，约 100–300KB\n· 不支持 MP4 视频（本机没有 ffmpeg），GIF 会在画板中循环播放\n· 用法：输入主题 → 选风格/尺寸 → 生成 → 自动插入当前视口中央，可拖动/缩放/删除',
        stylePoster: '海报',
        styleCover: '封面',
        styleBanner: '横幅',
        styleCard: '卡片',
        styleAbstract: '抽象',
        styleWaves: '波浪',
        stylePulse: '脉冲',
        styleOrbit: '环绕',
        styleBars: '律动',
        ratioWide: '16:9',
        ratioSquare: '1:1',
        ratioTall: '竖版',
        backdropHint: '点击空白处或按 Esc 取消',
        hostStaleShort: '后台需重启',
        hostStaleHint: '画板后台代码还是旧版本（桌面端不会热更新 Host）。请完全退出并重开应用，AI 生成才能使用。',
        aiScopeLabel: '生成范围',
        aiScopeCanvas: '整个画板',
        aiScopeSelection: '选中模块',
        aiScopeSelectionEmpty: '先选中节点',
        aiScopeHintCanvas: '在整个画板上生成/整理内容',
        aiScopeHintSelection: '只围绕选中的节点生成或改写，其他内容保持不变',
        aiSelectedCount: '已选中 {n} 个节点',
        aiSelectionRequired: '请先在画板上选中要生成的模块',
        aiSelectionContext: '作用于选中节点：{text}',
        aiExample1: '把这个想法拆成 5 张便签并连线',
        aiExample2: '把画板上的内容整理成结构化',
        aiExample3: '画一个三步流程：目标 → 方案 → 结果',
        createHint: '在画布上点击或拖拽即可创建「{kind}」',
        penHint: '按住并拖动即可随手画线，可连续画无数条',
        addConnected: '添加相连的便签',
        emptyTextHint: '文字：双击便签进入编辑 · 选中后按 Enter',
        darkHint: '提示',
      },
      en: {
        panelTitle: 'UniCanvas',
        untitled: 'Untitled canvas',
        select: 'Select',
        hand: 'Pan',
        note: 'Note',
        text: 'Text',
        shape: 'Shape',
        frame: 'Frame',
        connect: 'Connect',
        pen: 'Pen',
        agent: 'Agent',
        undo: 'Undo',
        redo: 'Redo',
        fit: 'Fit content',
        zoomIn: 'Zoom in',
        zoomOut: 'Zoom out',
        insertImage: 'Insert image',
        duplicate: 'Duplicate',
        delete: 'Delete',
        edit: 'Edit text',
        syncing: 'Syncing',
        live: 'Synced',
        offline: 'Disconnected',
        loading: 'Loading canvas…',
        aiEditing: 'AI is editing the canvas',
        aiNow: 'AI updated {n} spots',
        emptyTitle: 'UniCanvas',
        emptyAlias: '',
        emptyModes: 'Agent | UniCanvas | Pen',
        emptyBody: 'A searchable local-file database — multiple views and canvases for notes\nVisual Agent task delegation\nOne-click inspiration showcase',
        emptyStatus: '> canvas online · waiting for input',
        emptyCta: '⚡ Insert sample canvas',
        emptyChipSummary: '📊 Summarise',
        emptyChipSplit: '🧩 Split into notes',
        emptyChipFlow: '🔀 Draw a flow',
        emptyHint: 'Double-click empty space → new note · wheel pans · Ctrl+wheel zooms',
        copyPrompt: 'Copy an instruction for the AI',
        copied: 'Copied',
        imageUrl: 'Image URL',
        imagePlaceholder: 'Paste an https:// or data:image URL',
        cancel: 'Cancel',
        confirm: 'Add',
        close: 'Close',
        colorLabel: 'Colour',
        image: 'Image',
        stroke: 'Stroke',
        selectionBarHint: 'These actions apply to the current selection; press Esc to clear it',
        selectionKindMore: 'and more',
        agentStartShort: 'Start',
        divergenceLabel: 'Divergence',
        divergenceTitle: 'Divergence meter: 1.048596 is the Steins;Gate worldline; digits jump randomly and occasionally settle back on it',
        fitFrame: 'Fit to content',
        fitFrameEmpty: 'This frame has nothing inside to fit',
        fitFrameDone: 'Frame fitted to its content',
        autoHeight: 'Auto height',
        autoHeightOn: 'Auto height on: cards resize to their content instead of a fixed height',
        autoHeightOff: 'Auto height off: back to fixed height',
        autoHeightTip: 'Auto height: the card grows with its content so the selection frame always matches',
        bigEditorTitle: 'Edit text',
        bigEditorHint: 'Markdown supported; Ctrl/⌘+Enter saves, Esc cancels',
        bigEditorPlaceholder: 'Type your content…',
        bigEditorChars: '{n} chars',
        bigEditorSave: 'Save',
        titlePlaceholder: 'Canvas title',
        connectHint: 'Click a source, then keep clicking targets to add links (Esc ends), or drag straight onto a target',
        connected: 'Connected',
        selectedCount: '{n} selected',
        emptyNote: 'Double-click to edit',
        buildLoaded: 'Canvas loaded: {v}',
        help: 'How it works',
        helpTitle: 'UniCanvas · Features',
        helpTextTitle: 'Text editing',
        helpTextBody:
          'Double-click a note, text block or shape to edit it\nTriple-click an Agent card to open its big editor: task, role, and output type (canvas / document); Ctrl/⌘+Enter saves\nWith one node selected press Enter (or the pencil button)\nDouble-click empty canvas to create a new note\nChinese IME and multi-line are supported: Enter for a new line, Ctrl/⌘+Enter to save\nClick empty canvas or press Esc to finish; a draft is saved even if the panel is rebuilt\nNotes, text, shapes and Agent cards all resize from their corners/edges, and the text scales with the card\nLong text: a note over 10 lines / 320 chars switches to Markdown layout and scrolls inside the card; double-click opens the big editor, and the selection bar can convert it to a document card (wider + auto height)',
        helpCanvasTitle: 'Canvas controls',
        helpCanvasBody:
          'Wheel: pan vertically; Shift+wheel: pan horizontally\nCtrl/⌘+wheel: zoom around the pointer\nSpace+drag or middle-drag: pan the canvas\nDrag a box: multi-select; Shift+click: add to selection\nDrag a card corner / edge: resize it; the text scales with the card\nDel / Backspace: delete; Ctrl/⌘+D: duplicate\nCtrl/⌘+Z undo, Ctrl/⌘+Shift+Z redo\nCtrl/⌘+0 fit content, Ctrl/⌘+A select all\nToolbar “Select all”: ticks every node in one click; click again to clear\nWith a node selected, “Same kind” in the selection bar ticks every node of that kind (e.g. all Agents)\nToolbar “↺ History”: opens the canvas list + history snapshots panel (see “Multiple canvases & history” below)\nMinimap: the thumbnail in the bottom-right shows all nodes plus the current view; click or drag it to jump there, “–” collapses it (use the small button to expand)\nToolbar “⚙ Settings”: language, minimap / frame-drag toggles, storage location and build info; the standalone window can also configure API endpoints here (OpenAI-compatible: base URL / model / key — then “Generate” and Agent Start work)\nLeft sidebar: vault / tags / links / search / axis / graph — the “Graph” icon opens the full-screen force-directed relation network\nPen: drag to draw as many freehand lines as you like\nConnect: click a source then keep clicking targets for unlimited links; Esc ends\nFrame: dragging a frame moves everything inside it by default (whole-block drag); turn off “Carry contents” or hold Alt to move only the frame; drop a node into a frame to attach it, drag it out to detach',
        helpBoardsTitle: 'Multiple canvases & history',
        helpBoardsBody:
          'Toolbar “↺ History”: one panel with two parts — the canvas list on top (＋ new canvas, click to switch, ✎ rename, ✕ delete) and the current canvas’s snapshots below\nEach canvas keeps its own content, viewport and history; the title at the top still names the current canvas\nOn an empty board the welcome screen shows canvas chips and the latest 3 snapshots, so you can switch / restore without opening the panel\n“＋ Save current snapshot” stores a version (optional name); “↺ Restore” rolls back; before a restore the current state is snapshotted again, so restores can be undone\nDeleting a canvas removes its snapshots too (at least one canvas always remains); up to 20 snapshots per canvas (newest kept); everything stays on this machine and survives restarts',
        helpUpdateTitle: 'What’s new',
        helpUpdateBody:
          'v1.6 graph: a “Graph” entry at the bottom of the left sidebar opens the full-screen force-directed relation network (current canvas / all canvases / vault; search, tag / orphan toggles, force sliders, double-click to open; layout is remembered)\n' +
          'v1.7 decoration system: the “Skin & decorations” panel — the skin sets the background (starry / cyberpunk / aurora / blueprint / carbon / pure black or a custom image); decorations (whale / rainbow-cat 0/1 particles, cyberpunk aurora, Steins;Gate) are multi-select overlays that combine with the skin — creatures drift behind the board with pointer parallax, canvas content and interactions are unaffected\nv1.6 particle creatures: whale / rainbow-cat 0/1 glyph creatures, now part of decorations\nv1.4 minimap: the bottom-right thumbnail shows every node and the current view; click / drag to jump, collapse it any time, and the preference is remembered\nv1.3 multiple canvases + history: manage canvases and snapshots in the “↺ History” panel; the empty-board screen can also create a canvas / restore history directly\n“Generate” is the old “Agent” AI entry; the “Add text” toolbar button is gone — create text blocks with the T tool on the left\n“Select all” + “Same kind”: batch-select in one click; the “API” picker only affects this canvas\nCanvases can be switched / renamed / deleted; AI generation and Agent runs only touch the active canvas\nCyberpunk visuals: divergence meter, scanlines, neon selection frame; skins include starry / cyberpunk or your own background image',
        helpProjectTitle: 'Projects & Agents',
        helpProjectBody:
          'Toolbar “Projects” → “New independent project”: creates a project frame, a lead Agent and a hint note at the current view\n“Projects” lists every project frame (including temporarily empty ones) — click one to jump to it\nSelect a project frame → “Link local path”: enter a local folder / file; a 📂 button appears on the frame and opens it in the file manager\nTriple-click an Agent card to write its task; press “Start” to produce work; cards can be dragged/resized and text scales with them\n“Delegate” splits the work into child projects: one frame + one child Agent per project, auto-connected (max 6 children, two levels); type project names (comma-separated) or leave it empty for the AI to split\nA child Agent only uses its own project frame as context and never sees other projects\nThe coordinator shows “child tasks x/y”; “Run children” executes them one by one and each writes into its own frame, then the coordinator gets a summary\nGrouping: drag nodes into a frame to attach them, or “Gather nodes” on the frame; detach one node with “Detach from frame”',
        helpMediaTitle: 'Media · Prompts · Skin · Model',
        helpMediaBody:
          'Media: generate SVG images or GIF animations locally, inserted at the view centre; drag / resize / delete them\nPrompts: save prompts and insert them into the Agent input, a role, or straight onto the canvas; “Manage” lets you edit / delete them\nSkin & decorations: the skin sets the background (starry / cyberpunk / aurora / blueprint / carbon / pure black or your own image); decorations (whale / rainbow-cat 0/1 particles, cyberpunk aurora, Steins;Gate) are multi-select overlays combined with the skin — pointer parallax included\nAPI: the toolbar “API” picker chooses the endpoint/model used by canvas AI generation and Agent runs; “Follow default” uses the Harness default. It only affects this canvas, not other chats\nGenerate: the toolbar “Generate” button opens the AI dialog and lets the Agent draw on the canvas',
        helpBulkTitle: 'Multi-select & batch',
        helpBulkBody:
          'Box-select / Shift+click / toolbar “Select all” / “Same kind”: select many nodes at once\nThe selection bar supports batch colour, duplicate and delete\nDragging one node of a multi-selection moves them all; select a single node first to move only it\nResizing only changes the grabbed card, never its siblings\nSelection frame and 8 resize handles live inside the card, so they always stick to it',
        helpKeysTitle: 'Keyboard shortcuts',
        helpKeysBody:
          'V select · H hand · N note · T text · S shape · F frame · C connect · P pen · G Agent\nEnter / F2: edit the selected node; Esc: finish editing or clear selection\nCtrl/⌘+A select all · Ctrl/⌘+D duplicate · Del / Backspace delete\nCtrl/⌘+Z undo · Ctrl/⌘+Shift+Z redo · Ctrl/⌘+0 fit content\nSpace+drag / middle-drag pan; wheel pan; Shift+wheel horizontal pan; Ctrl/⌘+wheel zoom',
        helpAiTitle: 'Drawing with UniCanvas',
        helpAiBody:
          'UniCanvas can read this board and create or edit notes directly\nUse "Generate" in the toolbar and it draws for you\nAgent cards work too: triple-click to write a task, then Start — or Delegate to child Agents\nTry saying: "read the canvas and split these ideas into 5 notes"\nAI and Agents only touch the active canvas; after switching canvases their changes land on the active one\nIts changes appear live and updated nodes flash\nEverything is stored on this machine and survives a restart',
        helpClose: 'Got it',
        deleteSelected: 'Delete selection (Del)',
        addText: 'Add text',
        addTextHint: 'Create a text block at the centre of the view and start typing',
        aiGenerate: 'Generate',
        aiTitle: 'Let Agent draw on this canvas',
        aiPlaceholder: 'e.g. split this idea into 5 notes and connect them as a flow',
        aiHint: 'Agent generates directly onto the canvas — no window switching',
        aiSubmit: 'Generate',
        aiSent: 'Sent to Agent — drawing on the canvas…',
        aiSentTo: 'Sent to "{title}" — drawing on the canvas…',
        aiPendingChip: 'Agent is drawing…',
        aiOpenChat: 'Open chat',
        aiNoChange: 'No canvas changes arrived — open the chat to see why',
        aiQueued: 'The conversation is busy; generation is queued',
        aiGenerated: 'Generated on the canvas: {created} added, {updated} updated, {deleted} deleted (rev {rev})',
        aiDirectFailed: 'AI generation failed: {message}',
        aiBusyText: 'Generating…',
        aiModeLabel: 'Mode',
        aiModeAsk: 'Ask',
        aiModeAskHint: 'Preview the plan and confirm before it is written to the canvas',
        aiModeAuto: 'Auto',
        aiModeAutoHint: 'Generate directly without confirmation',
        aiPlanTitle: 'Confirm generation plan',
        aiPlanIntro: 'The model proposes these changes; confirm to write them to the canvas:',
        aiPlanCreated: '{n} node(s) added',
        aiPlanUpdated: '{n} node(s) updated',
        aiPlanDeleted: '{n} node(s) deleted',
        aiPlanConfirm: 'Apply',
        agentStatusIdle: 'Idle',
        agentStatusRunning: 'On it',
        agentStatusDone: 'Done!',
        agentStatusFailed: 'Crashed',
        agentTaskPlaceholder: 'Triple-click me and give me a job…',
        agentRun: 'Start',
        agentRunShort: 'Start',
        agentRunAgain: 'Again',
        agentRunAgainShort: 'Again',
        agentNoTask: 'Idling · no task yet',
        agentRunningMeta: 'Busy drawing on the canvas…',
        agentDoneMeta: 'Mission accomplished',
        agentFailedMeta: 'Try again?',
        agentWorkingFor: 'Working for {n}s…',
        agentEmptyTask: 'Give me a task first (triple-click the card)',
        agentEmptyHintText: 'Triple-click to assign · Enter to save',
        agentProjectChip: '📁 {name}',
        agentParentChip: '↳ {name}',
        agentFrameChip: '▣ {name}',
        detachFrame: 'Detach from frame',
        detachFrameDone: 'Detached — drag this node on its own now',
        frameGroupChip: 'Frame: {name}',
        agentCreatedAtPoint: 'Agent created at the position you clicked',
        agentPlaceHint: 'Click the canvas where the Agent should go — its editor opens right after',
        agentDelegate: 'Delegate',
        agentDelegateTip: 'Split this Agent’s work across child Agents, one project each',
        agentRunChildren: 'Run children',
        agentRunChildrenTip: 'Run every child Agent in order and summarise the results on this card',
        agentChildrenProgress: '{done}/{total} child tasks',
        agentChildrenChip: '{n} child Agents',
        agentNoChildren: 'No child Agents yet — use “Delegate” first',
        agentChildrenRunning: 'Running child Agents one by one…',
        agentParentLocked: 'A child Agent cannot delegate further (max two levels)',
        delegateTitle: 'Delegate to child Agents',
        delegateHint:
          'Each project becomes a child Agent card inside its own project frame, linked from this Agent. Separate project names with commas or new lines (max 6); leave empty and the AI splits them.',
        delegatePlaceholder: 'e.g. marketing site, mini app, analytics dashboard',
        delegateConfirm: 'Delegate',
        delegateBusy: 'Splitting…',
        delegateDone: 'Delegated to {n} child Agents',
        delegateFailed: 'Delegation failed: {message}',
        runChildrenSummary: 'Child tasks done {done}/{total}, failed {failed}',
        agentQuips:
          "I'm here, waiting for a job~\nGive me a task and I'll start drawing ✨\nTriple-click this card to tell me what to do\nIdling… got a job for me?\nAll set and ready to go!\nSmall but mighty ？this canvas is mine 😎",
        roleLabel: 'Role',
        roleSet: 'Set a role',
        roleEdit: 'Edit role',
        roleDialogTitle: 'Agent role setup',
        rolePlaceholder:
          'Paste a persona / task / constraint template, e.g.:\n# Role\nYou are a user researcher with 200+ interviews, using The Mom Test…\n# Task\nDesign a ready-to-read interview script for my product idea\n# Constraints\nNo leading or future-tense questions; each question ≤25 characters',
        roleInsertExample: 'Insert example role',
        roleExample:
          '# Role\nYou are a user researcher with 200+ interviews, using The Mom Test: only ask about real past behaviour and costs actually paid; never ask "would you use it" or "do you think it is good".\n# Task\nDesign a ready-to-read user interview script for the product idea.\n# Constraints\n- Open questions only; no leading or future-tense wording\n- Each question under 25 characters so it can be read aloud\n- Ask about past behaviour and money/time already spent\n# Output format\nMarkdown: assumptions / hypotheses H1..Hn / screening criteria / script table / dangerous questions / notes template\n# Self-check\nEvery main question maps to a hypothesis; time boxes add up to the interview length.',
        roleOutputLabel: 'Output',
        roleOutputCanvas: 'Canvas layout',
        roleOutputCanvasHint: 'Creates notes, edges and frames on the canvas',
        roleOutputDocument: 'Text document',
        roleOutputDocumentHint: 'Writes a long document: frame + paginated text cards',
        roleDocHint: 'In document mode the task text is the document topic; long output is paginated into several text cards.',
        roleSave: 'Save',
        roleSaved: 'Role setup saved',
        rolePreview: 'Role: {text}',
        roleNone: 'No role yet',
        promptLib: 'Prompts',
        promptLibTitle: 'Prompt library',
        promptLibHint: 'Save reusable prompts and insert them into the Agent input, a role setup, generate onto the canvas, or place them directly.',
        promptNew: 'New',
        promptUntitled: 'Untitled prompt',
        promptNameLabel: 'Name',
        promptNamePlaceholder: 'e.g. user interview script',
        promptBodyLabel: 'Prompt',
        promptBodyPlaceholder: 'Paste or write a prompt… (keep {{placeholders}} and fill them in when using)',
        promptSave: 'Save',
        promptSaved: 'Prompt saved',
        promptDelete: 'Delete',
        promptDeleteConfirm: 'Delete this prompt?',
        promptDeleted: 'Prompt deleted',
        promptEmpty: 'No prompts yet: click "New", or insert an example prompt first.',
        promptNoMatch: 'No matching prompts',
        promptPickAgent: 'Insert into Agent input',
        promptPickRole: 'Insert into role setup',
        promptToCanvas: 'Place on canvas',
        promptToCanvasDone: 'Prompt placed on the canvas',
        promptGenerate: 'Generate',
        promptGenerateHint: 'Open the AI generate dialog with this prompt',
        promptCopy: 'Copy',
        promptCopied: 'Copied',
        promptInsertExample: 'Insert example prompts',
        promptSearchPlaceholder: 'Search prompts…',
        promptExampleInterview:
          'Design a user interview script for "{{product idea}}": restate the product hypothesis in 3-5 sentences and list hypotheses H1..Hn to test; give participant screening criteria; build a time-boxed script (2 min intro, 5 min warm-up, 15 min current behaviour, 10 min alternatives and costs, 3 min wrap-up); add 2 follow-up probes per main question; include a notes template; finish with 5 dangerous questions. Use open questions under 25 characters each.',
        promptExampleCompete:
          'Analyse competitors for "{{product}}": list 3-5 main competitors with positioning, target users, core features, pricing and growth motion; output a comparison table; finish with 3 differentiation opportunities and their risks.',
        promptExampleMinutes:
          'Turn these meeting notes into decisions: {{notes}}. Output: decisions made / open questions / owners and deadlines / risks and dependencies.',
        promptExampleRewrite: 'Rewrite the selected content more concisely and conversationally, keeping the meaning and key data; start with a one-sentence summary if it is longer than 3 sentences.',
        promptExampleInterviewName: 'Interview script',
        promptExampleCompeteName: 'Competitor analysis',
        promptExampleMinutesName: 'Meeting notes',
        promptExampleRewriteName: 'Rewrite & polish',
        skin: 'Skin',
        skinTitle: 'Canvas skin & decorations',
        skinHint: 'The skin sets the background; decorations are animated overlays on top — both can be active at the same time. Choices are saved locally.',
        skinPresetLabel: 'Built-in skins',
        skinUpload: 'Upload background',
        skinUploadHint: 'JPG / PNG / WebP; resized to 1600px max and saved locally',
        skinRemove: 'Reset to default skin',
        skinCustomLabel: 'Custom background',
        skinApplied: 'Skin updated',
        skinUploadFailed: 'Upload failed: {message}',
        skinStarry: 'Deep space',
        skinNeon: 'Cyber neon',
        skinAurora: 'Aurora night',
        skinBlueprint: 'Blueprint',
        skinCarbon: 'Carbon',
        skinVoid: 'Pure black',
        skinWhale: 'Whale · 0/1 particles',
        skinRainbowCat: 'Rainbow cat · 0/1 particles',
        decorTitle: 'Decorations (multi-select, combined with the skin)',
        decorHint: 'Decorations layer over the skin: the whale sweeps left to right, the rainbow cat drifts from top to bottom; their 0/1 particles are calm dots until the pointer touches them and they burst into colourful 0/1 glyphs and white blocks (pointer parallax). Cyberpunk aurora and Steins;Gate add mood.',
        decorWhale: 'Whale · 0/1 particles',
        decorRainbowCat: 'Rainbow cat · 0/1 particles',
        decorAurora: 'Cyberpunk aurora',
        decorSteinsGate: 'Steins;Gate',
        decorApplied: 'Decorations updated',
        agentRunning: 'The agent is working…',
        agentDoneToast: 'Agent finished: {n} node(s) added',
        agentDocDone: 'Document generated: {chars} chars',
        agentFailedToast: 'Agent failed: {message}',
        projects: 'Projects',
        projectsTitle: 'Projects',
        projectNew: 'New independent project',
        projectNewHint: 'Create an independent project workspace: a project frame with a lead Agent',
        projectCreated: 'Project "{name}" created',
        projectEmpty: 'No projects yet — click “New independent project”',
        projectJumpTip: 'Jump to this project',
        projectJump: 'Projects',
        projectCount: '{n} child Agent(s)',
        projectPrefix: 'Project',
        projectNoteHint: 'Write the task into the lead Agent, then click “Delegate” on the card to split it into child projects; the child Agents produce their work inside this frame.',
        projectWorkspace: 'Project workspace',
        openWorkspace: 'Open workspace',
        openWorkspaceTip: 'Open this local path in the file manager',
        linkPath: 'Link local path',
        pathDialogTitle: 'Project local path',
        pathHint:
          'Enter a local folder or file path (e.g. D:\\projects\\docs). After saving, a 📂 button appears on the project frame and opens it in the file manager.',
        pathPlaceholder: 'D:\\project-folder',
        pathSave: 'Save path',
        pathSaved: 'Path saved',
        pathRequired: 'Enter a path first',
        pathClear: 'Clear path',
        pathOpenFailed: 'Open failed: {message}',
        gatherFrame: 'Gather nodes',
        gatherFrameTip: 'Adopt every node (Agents included) whose centre is inside this frame, so they move and resize together',
        gatherFrameDone: 'Gathered {n} node(s)',
        gatherFrameEmpty: 'Nothing inside this frame yet — drag the Agent into the frame first',
        model: 'API',
        modelTitle: 'API endpoints / models',
        modelHint:
          'This model is used by AI generation and Agent runs inside UniCanvas only; other conversations are unaffected. Add your own OpenAI-compatible API endpoints below. Pick “Follow default” to use the host default model.',
        modelFollowDefault: 'Follow default model',
        modelDefaultTag: 'Default',
        modelCurrentTag: 'Current',
        modelSaved: 'Model switched: {name}',
        modelSavedDefault: 'Following the default model again',
        modelLoading: 'Loading available models…',
        modelFailed: 'Could not load models: {message}',
        modelEmpty: 'No model available — configure one in the host settings first',
        modelClose: 'Close',
        aiProviders: 'Custom endpoints',
        aiProviderAdd: 'Add endpoint',
        aiProviderEdit: 'Edit endpoint',
        aiProviderDelete: 'Delete endpoint',
        aiProviderDeleteConfirm: 'Delete AI endpoint “{name}”?',
        aiProviderTest: 'Test connection',
        aiProviderTesting: 'Testing…',
        aiProviderSaved: 'Endpoint saved: {name}',
        aiProviderDeleted: 'Endpoint deleted',
        aiProviderFailed: 'Endpoint operation failed: {message}',
        aiProviderEmpty: 'No custom endpoints yet — connect any OpenAI-compatible API (DeepSeek / OpenAI / Kimi / Zhipu / local Ollama…).',
        aiProviderFormHint: 'An OpenAI-compatible endpoint (/chat/completions). The key stays on this machine and is never written into canvas data.',
        aiProviderName: 'Name',
        aiProviderNamePlaceholder: 'e.g. DeepSeek official',
        aiProviderBaseUrl: 'API base URL',
        aiProviderBaseUrlPlaceholder: 'https://api.deepseek.com/v1',
        aiProviderKey: 'API key',
        aiProviderKeyPlaceholder: 'Paste a key; leave empty to keep it',
        aiProviderKeySaved: 'Saved: {masked} (leave empty to keep it)',
        aiProviderKeyMissing: 'No key',
        aiProviderKeyHint: 'Keys stay local; custom endpoints are called directly, not through the Harness account',
        aiProviderModels: 'Models',
        aiProviderModelsPlaceholder: 'Comma or newline separated, e.g. deepseek-chat, deepseek-reasoner',
        aiProviderDefaultModel: 'Default model',
        aiProviderAdvanced: 'Advanced',
        aiProviderTemperature: 'Temperature',
        aiProviderMaxTokens: 'Max tokens',
        aiProviderTimeout: 'Timeout (s)',
        aiProviderSave: 'Save endpoint',
        aiProviderTestOk: 'Connected',
        aiProviderTestFailed: 'Connection failed: {message}',
        frameCarry: 'Carry contents',
        frameCarryTip:
          'Toggle whether dragging a frame moves the nodes inside it. On by default (drag the whole block); turn it off to move only the frame, or hold Alt to carry them for one gesture',
        frameCarryOn: 'Dragging the frame now carries its contents',
        frameCarryOff: 'Dragging the frame moves only the frame',
        selectAll: 'Select all',
        selectAllTip: 'Tick every node on the canvas in one click; click again to clear (Ctrl+A)',
        selectAllDone: 'Selected {n} nodes',
        selectCleared: 'Selection cleared',
        selectSameKind: 'Same kind',
        selectSameKindTip: 'Tick every node of the same kind as the current selection (e.g. all Agents)',
        selectSameKindDone: 'Selected {n} nodes of the same kind',
        boards: 'Boards',
        boardsTitle: 'Canvases',
        boardNew: 'New canvas',
        boardEmpty: 'No canvases yet',
        boardNodes: '{n} nodes',
        boardCurrent: 'Current',
        boardRename: 'Rename',
        boardRenamePrompt: 'Canvas name',
        boardRenamed: 'Canvas renamed',
        boardDelete: 'Delete canvas',
        boardDeleteConfirm: 'Delete canvas "{name}"? Its history snapshots are removed too.',
        boardCreated: 'Canvas "{name}" created',
        boardSwitched: 'Switched to "{name}"',
        boardFailed: 'Canvas action failed: {message}',
        history: 'History',
        historyTitle: 'History snapshots',
        historySave: 'Save current snapshot',
        historySavePrompt: 'Name this snapshot (optional)',
        historySaved: 'Snapshot saved ({n} nodes)',
        historyEmpty: 'No snapshots yet — click “Save current snapshot”',
        historyRestore: 'Restore',
        historyDelete: 'Delete snapshot',
        historyRestoreConfirm: 'Restore this snapshot? The current canvas is saved as a snapshot first.',
        historyRestored: 'Snapshot restored (the previous state was saved automatically)',
        historyNodes: '{n} nodes',
        historyFailed: 'Snapshot action failed: {message}',
        minimap: 'Minimap',
        minimapTitle: 'Minimap: all content plus the current view; click or drag to jump',
        minimapHide: 'Collapse minimap',
        minimapShow: 'Expand minimap',
        settings: 'Settings',
        settingsTitle: 'Settings',
        settingsAppearance: 'Appearance',
        settingsMinimap: 'Minimap',
        settingsMinimapHint: 'Bottom-right thumbnail: click / drag to jump',
        settingsFrameCarry: 'Frame drag carries contents',
        settingsFrameCarryHint: 'Dragging a frame moves the nodes inside it too (hold Alt to invert)',
        settingsSkin: 'Skin & background',
        settingsSkinHint: 'Starry / cyberpunk themes, whale / rainbow-cat / cyberpunk-aurora / Steins;Gate decorations, or upload your own background',
        settingsLanguage: 'Language',
        settingsLanguageHint: 'Interface language, applied immediately',
        settingsData: 'Data',
        settingsDataPath: 'Storage',
        settingsDataHint: 'Every canvas and history snapshot is stored here',
        settingsOpenFolder: 'Open folder',
        settingsDataStats: '{canvases} canvases · {snapshots} snapshots',
        settingsImportDsh: 'Import canvases',
        settingsImportDshHint: 'Replace this standalone copy with the desktop canvases',
        settingsImportDone: 'Imported the canvases',
        settingsAbout: 'About',
        settingsClientBuild: 'Client build',
        settingsHostBuild: 'Host build',
        settingsMode: 'Mode',
        settingsModeStandalone: 'UniCanvas',
        settingsModePlugin: 'Plugin mode',
        settingsHelp: 'Open the feature guide',
        settingsClose: 'Close',
        settingsUnavailable: 'Unavailable',
        settingsOn: 'On',
        settingsOff: 'Off',
        settingsLoading: 'Loading settings…',
        settingsFailed: 'Could not load settings: {message}',
        settingsAiTitle: 'API endpoints',
        settingsAiHint: 'Legacy single-endpoint setting, synced to the first API endpoint; manage multiple endpoints from the top “API” picker',
        settingsApiBase: 'API base URL',
        settingsApiBasePlaceholder: 'https://api.deepseek.com/v1',
        settingsApiModel: 'Model',
        settingsApiModelPlaceholder: 'deepseek-chat',
        settingsApiKey: 'API key',
        settingsApiKeyPlaceholder: 'Saved — leave empty to keep it',
        settingsAiSave: 'Save',
        settingsAiTest: 'Test connection',
        settingsAiClear: 'Clear key',
        settingsAiSaved: 'AI model settings saved',
        settingsAiTesting: 'Testing connection…',
        settingsAiTestOk: 'Connected · {ms}ms · {model}',
        settingsAiTestFailed: 'Connection failed: {message}',
        settingsAiKeyCleared: 'API key cleared',
        settingsAiNoKey: 'No API key yet — AI generation is unavailable',
        settingsAiSavedKey: 'Key: {masked}',
        settingsAiLocalHint: 'The key stays in the local desktop/data folder and is never written into canvas data',
        settingsAiNeedsBase: 'Fill in the API base URL and model first',
        sidebarCollapse: 'Collapse sidebar',
        sidebarExpand: 'Expand sidebar',
        sidebarVault: 'Vault',
        sidebarTags: 'Tags',
        sidebarSearch: 'Search',
        sidebarVaultHint: 'A local Markdown folder — click a file to import it (.md / .canvas / images)',
        sidebarVaultPlaceholder: 'e.g. D:\\my-notes',
        sidebarVaultLoad: 'Load',
        sidebarVaultEmpty: 'No importable files in this folder',
        sidebarVaultTruncated: 'Too many files — showing the first {n}',
        sidebarVaultImported: 'Imported “{name}” ({n} nodes)',
        sidebarVaultFailed: 'Import failed: {message}',
        sidebarVaultNotSet: 'Enter a vault path and press “Load” first',
        sidebarTagsHint: 'Hashtags found in the current canvas — click to filter',
        sidebarTagsEmpty: 'No tags yet (write #tag inside a card)',
        sidebarTagClear: 'Clear filter',
        sidebarTagActive: 'Filtering #{tag}',
        sidebarSearchPlaceholder: 'Search cards in the current canvas…',
        sidebarSearchEmpty: 'Type a keyword to search card text',
        sidebarSearchNoResult: 'No matching cards',
        sidebarSearchHint: 'Click a result to jump to it and select it',
        sidebarImportCanvas: 'Import an Obsidian canvas',
        sidebarLinks: 'Links',
        sidebarLinksHint: '[[Wiki links]] in card text: who links here, and what this card links to',
        sidebarLinksNoSelection: 'Select one card to see its links',
        sidebarLinksNone: 'No [[links]] on this card',
        sidebarLinksOut: 'Links to',
        sidebarLinksIn: 'Linked from',
        writeBack: 'Write to file',
        writeBackTip: 'Write this card back into its bound local Markdown file',
        writeBackDone: 'Written to {path}',
        writeBackUnchanged: 'File and card already match — nothing to write',
        writeBackConflict: 'External edit detected — backed up as {file} before writing',
        writeBackFailed: 'Write-back failed: {message}',
        convertToDoc: 'Convert to document card',
        convertToDocTip: 'Long text: convert to a wider document card with Markdown layout and auto height',
        longNoteHint: 'Long note: double-click for the big editor; the card itself scrolls',
        tagsAll: 'All canvases',
        tagsAddPlaceholder: 'tag, e.g. idea',
        tagsAdd: 'Add tag',
        tagsAddTip: 'Append this #tag to the selected card',
        tagsAdded: 'Added #{tag} to the selected card',
        tagsNoSelection: 'Select a card first',
        linksCanvas: 'Canvas connections',
        linksSameTag: 'Same tag',
        linksAddPlaceholder: 'Card title / file name to link',
        linksAdd: 'Add link',
        linksAdded: 'Added [[{target}]]',
        linksNoTarget: 'Select a card first',
        searchAll: 'Global',
        searchAllPlaceholder: 'Search all canvases and the vault…',
        searchAllEmpty: 'No global results',
        searchGlobalHint: 'Enter = global search · click a result to jump',
        axis: 'Axis',
        axisTitle: 'Number line / timeline',
        axisConfigTitle: 'Insert an axis',
        axisEditTitle: 'Edit axis',
        axisName: 'Title',
        axisOrientation: 'Direction',
        axisHorizontal: 'Horizontal',
        axisVertical: 'Vertical',
        axisMin: 'Start',
        axisMax: 'End',
        axisStep: 'Step',
        axisUnit: 'Unit',
        axisCreate: 'Insert axis',
        axisSave: 'Save',
        axisEdit: 'Edit axis',
        axisTickHint: 'Click a tick to create a card there',
        axisInvalid: 'The start must be lower than the end',
        axisTickAdded: 'Card created at the tick',
        axisDeleteHint: 'Select and press Del to remove the axis (cards stay)',
        helpAxisTitle: 'Axis / timeline',
        helpAxisBody:
          'Entry: the last icon in the left sidebar («Axis», below the search icon)\nClick “+ Insert axis”: title, direction (horizontal / vertical), start, end, step and unit — it is inserted at the view centre\nClick any tick on the axis: a new sticky note is created under it with that tick label\nClick an entry in the left “Axis” tab to jump to and select the axis card; click the ✎ at the row end to edit range / step / unit / direction\nDouble-click the axis card on the canvas to edit it too; drag corners to resize; Del removes only the axis, existing cards stay',
        helpGraphTitle: 'Relation graph (force-directed)',
        helpGraphBody:
          'Entry: the last icon in the left sidebar («Graph», below the axis icon); opens a full-screen force-directed network view\nScope: current canvas / all canvases / vault; vault mode also links canvas cards to the vault files they were imported from (“same file” dashed line)\nNodes = cards, vault .md files, #tags; edges = canvas connections, [[wiki links]], shared tags, same file\nDrag nodes to adjust the layout, drag the background to pan, wheel to zoom; click a node to highlight it and its neighbours, then use the “Open” button in the info bar (notes / text cards open their text editor directly, other cards jump to the canvas, note files import, tags filter); double-click is disabled to prevent accidental triggers\nToolbar: search filter, tag / orphan / labels toggles, force sliders (repulsion / link distance / gravity), re-layout / fit / refresh; the layout is remembered; nodes keep floating gently — the “Animate” toggle pauses or resumes it',
        graph: 'Graph',
        graphTitle: 'Relation graph · force-directed',
        graphBack: 'Back to canvas',
        graphHint: 'Drag nodes · wheel to zoom · double-click to open',
        graphScopeCanvas: 'This canvas',
        graphScopeAll: 'All canvases',
        graphScopeVault: 'Vault',
        graphSearchPlaceholder: 'Search nodes (title / tag)…',
        graphLoading: 'Building the relation network…',
        graphFailed: 'Graph data failed: {message}',
        graphEmpty: 'No relation nodes in this scope — add cards, give them [[links]] / #tags, or switch to “All canvases / Vault”',
        graphEmptyVault: 'No vault path yet — load a Markdown folder from “Vault” in the left sidebar first',
        graphTruncated: 'Too many nodes — showing the first {n}',
        graphRelayout: 'Re-layout',
        graphFit: 'Fit',
        graphRefresh: 'Refresh',
        graphForce: 'Forces',
        graphRepel: 'Repulsion',
        graphLinkDistance: 'Link distance',
        graphGravity: 'Gravity',
        graphShowTags: 'Tag nodes',
        graphShowOrphans: 'Orphans',
        graphShowLabels: 'Labels',
        graphAnimate: 'Animate',
        graphLegend: 'Legend',
        graphNodes: '{n} nodes',
        graphEdges: '{n} links',
        graphKindCanvas: 'Canvas edge',
        graphKindWiki: '[[link]]',
        graphKindTag: 'Same tag',
        graphKindSync: 'Same file',
        graphKindCard: 'Card',
        graphKindFile: 'Note file',
        graphKindTagNode: 'Tag',
        graphOpen: 'Open',
        graphOpenText: 'Open text',
        graphDoubleHint: 'Click to select · drag to arrange · use the “Open” button above',
        graphDoubleOff: 'Double-click is disabled — use the “Open” button above',
        graphSelected: 'Selected',
        graphDegree: '{n} links',
        graphFilesScanned: '{n} notes scanned',
        quickTitle: 'Quick switcher',
        quickPlaceholder: 'Search cards / canvases / vault files…',
        quickHint: '↑↓ select · Enter open · Esc close',
        quickNoResult: 'No matches',
        quickKindCard: 'Card',
        quickKindCanvas: 'Canvas',
        quickKindFile: 'File',
        mediaGenerate: 'Media',
        mediaTitle: 'Generate image / animation',
        mediaTabImage: 'Image',
        mediaTabGif: 'GIF animation',
        mediaPromptLabel: 'Theme',
        mediaPromptPlaceholder: 'One line, e.g. product launch poster',
        mediaStyleLabel: 'Style',
        mediaRatioLabel: 'Size',
        mediaSubtitle: 'UniCanvas · local procedural generation',
        mediaGenerateBtn: 'Generate and insert',
        mediaBusy: 'Generating…',
        mediaInserted: 'Generated and inserted into the canvas',
        mediaFailed: 'Generation failed: {message}',
        mediaPromptRequired: 'Enter a theme first',
        mediaLimitTitle: 'Limits and usage',
        mediaLimits:
          '· Local procedural generation: design/diagram styles only, not photorealistic or AI art\n· Image: vector SVG output, up to 2048×2048, completes in seconds\n· Animation: GIF 360×203, 10 frames, ~1s loop, ~100–300KB\n· MP4 video is not available (no ffmpeg on this machine); the GIF loops on the canvas\n· Usage: theme → style/size → generate → inserted at the view centre; draggable/resizable/deletable',
        stylePoster: 'Poster',
        styleCover: 'Cover',
        styleBanner: 'Banner',
        styleCard: 'Card',
        styleAbstract: 'Abstract',
        styleWaves: 'Waves',
        stylePulse: 'Pulse',
        styleOrbit: 'Orbit',
        styleBars: 'Bars',
        ratioWide: '16:9',
        ratioSquare: '1:1',
        ratioTall: 'Portrait',
        backdropHint: 'Click outside or press Esc to cancel',
        hostStaleShort: 'restart needed',
        hostStaleHint: 'The canvas Host half is still an older build (the desktop app does not hot-reload Host modules). Quit and reopen the app to enable AI generation.',
        aiScopeLabel: 'Scope',
        aiScopeCanvas: 'Whole canvas',
        aiScopeSelection: 'Selected modules',
        aiScopeSelectionEmpty: 'select nodes first',
        aiScopeHintCanvas: 'Generate or reorganise content across the whole canvas',
        aiScopeHintSelection: 'Only generate or rewrite around the selected nodes; everything else stays untouched',
        aiSelectedCount: '{n} node(s) selected',
        aiSelectionRequired: 'Select the modules you want to generate first',
        aiSelectionContext: 'Applies to the selected node: {text}',
        aiExample1: 'Split this idea into 5 notes and connect them',
        aiExample2: 'Turn the canvas into a structured diagram',
        aiExample3: 'Draw a 3-step flow: goal → approach → result',
        createHint: 'Click or drag on the canvas to add a {kind}',
        penHint: 'Hold and drag to draw freehand lines — as many as you like',
        addConnected: 'Add a connected note',
        emptyTextHint: 'Text: double-click a note to edit · select and press Enter',
        darkHint: 'Tip',
      },
    };

    /* ------------------------------------------------------------------ *
     * locale
     * ------------------------------------------------------------------ */
    let localeService = null;
    let clientCtx = null;

    /** Best-effort jump to the conversation that owns a generation request. */
    function openConversation(sessionId) {
      try {
        const workspace = clientCtx?.get?.('uiWorkspace');
        if (workspace && typeof workspace.openSession === 'function' && sessionId) workspace.openSession(sessionId);
      } catch (error) {
        /* ignore */
      }
      try {
        const layout = clientCtx?.get?.('layout');
        if (layout && typeof layout.selectPanel === 'function') layout.selectPanel(null);
      } catch (error) {
        /* ignore */
      }
    }

    function detectLang() {
      try {
        const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('dsic.lang.v1') : null;
        if (saved === 'zh' || saved === 'en') return saved;
      } catch (error) {
        /* fall through to the locale service */
      }
      try {
        const service = localeService;
        if (service) {
          const snapshot =
            typeof service.getSnapshot === 'function'
              ? service.getSnapshot()
              : typeof service.getLocale === 'function'
                ? service.getLocale()
                : null;
          if (snapshot) {
            const id = String(snapshot.active ?? snapshot.id ?? snapshot.locale ?? snapshot.language ?? '');
            if (id) return id.toLowerCase().startsWith('zh') ? 'zh' : 'en';
          }
        }
      } catch (error) {
        /* fall through to the browser language */
      }
      try {
        return String(navigator.language ?? '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
      } catch (error) {
        return 'zh';
      }
    }

    function useLang() {
      const [lang, setLang] = useState(detectLang);
      useEffect(() => {
        const service = localeService;
        if (!service || typeof service.subscribe !== 'function') return undefined;
        const onChange = () => setLang(detectLang());
        const off = service.subscribe(onChange);
        return typeof off === 'function' ? off : undefined;
      }, []);
      useEffect(() => {
        if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return undefined;
        const onChange = () => setLang(detectLang());
        window.addEventListener('dsic:lang', onChange);
        return () => window.removeEventListener('dsic:lang', onChange);
      }, []);
      return lang;
    }

    function useT() {
      const lang = useLang();
      return useCallback(
        (key, vars) => {
          const table = TEXTS[lang] ?? TEXTS.zh;
          let text = table[key] ?? TEXTS.zh[key] ?? key;
          if (vars) {
            for (const name of Object.keys(vars)) text = text.split(`{${name}}`).join(String(vars[name]));
          }
          return text;
        },
        [lang],
      );
    }

    /* ------------------------------------------------------------------ *
     * client -> host transport: authenticated exact Fetch route `/api/canvas.doc`
     * ------------------------------------------------------------------ */
    function canvasApiUrl() {
      const base = (typeof document !== 'undefined' && document.baseURI) || '/';
      // document-relative so a mount prefix keeps working
      return new URL('api/canvas.doc', base).href;
    }

    async function callCanvas(action, payload) {
      let response;
      try {
        response = await fetch(canvasApiUrl(), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ action, payload: payload ?? {} }),
        });
      } catch (error) {
        throw new Error(`无法连接画板服务 (${action}) — ${error?.message ?? error}`);
      }
      if (!response.ok) throw new Error(`画板服务 ${action} 返回 HTTP ${response.status}`);
      const body = await response.json();
      if (!body || body.ok !== true) throw new Error(body?.error?.message ?? `画板服务 ${action} 调用失败`);
      return body.value;
    }

    /* ------------------------------------------------------------------ *
     * local document store
     * ------------------------------------------------------------------ */
    function emptyDoc() {
      return {
        schema: 1,
        id: 'default',
        title: '',
        rev: 0,
        updatedAt: new Date().toISOString(),
        viewport: { cx: 0, cy: 0, zoom: 1, vw: 1200, vh: 800 },
        focus: null,
        items: {},
      };
    }

    function localApply(doc, ops) {
      const next = { ...doc, items: { ...doc.items } };
      for (const op of ops ?? []) {
        if (!op || typeof op !== 'object') continue;
        if (op.op === 'upsert' && op.item?.id) next.items[op.item.id] = op.item;
        else if (op.op === 'patch' && op.id) {
          const current = next.items[op.id];
          if (current) next.items[op.id] = { ...current, ...(op.patch ?? {}) };
        } else if (op.op === 'delete' && op.id) {
          delete next.items[op.id];
          for (const key of Object.keys(next.items)) {
            const item = next.items[key];
            if (item.type === 'edge' && (item.from === op.id || item.to === op.id)) delete next.items[key];
          }
        } else if (op.op === 'clear') next.items = {};
        else if (op.op === 'title') next.title = op.title;
        else if (op.op === 'focus') next.focus = { cx: op.cx, cy: op.cy, zoom: op.zoom, at: op.at };
      }
      return next;
    }

    function highestZ(items) {
      let z = 0;
      for (const key of Object.keys(items)) {
        const item = items[key];
        if (item && typeof item.z === 'number' && item.z > z) z = item.z;
      }
      return z + 1;
    }

    let localSeq = 0;
    function newLocalId(prefix) {
      localSeq += 1;
      return `${prefix}_${Date.now().toString(36).slice(-4)}${localSeq.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    }

    const store = {
      doc: emptyDoc(),
      rev: 0,
      docId: null,
      library: null,
      snapshots: [],
      status: 'idle',
      error: null,
      subscribers: new Set(),
      pollTimer: null,
      aiFlash: new Map(),
      aiCount: 0,
      aiAt: 0,
      history: [],
      future: [],
      pendingOps: [],
      loaded: false,
      hostStale: false,
      // panel-scoped view state that must survive the keyed main panel unmounting
      view: null,
      viewInitialized: false,
      lastFocusAt: 0,
    };

    function notify() {
      for (const listener of Array.from(store.subscribers)) {
        try {
          listener();
        } catch (error) {
          console.error('[infinite-canvas] subscriber failed', error);
        }
      }
    }

    function subscribeStore(listener) {
      store.subscribers.add(listener);
      ensureStarted();
      return () => {
        store.subscribers.delete(listener);
        if (store.subscribers.size === 0) stopPolling();
      };
    }

    function ensureStarted() {
      if (store.pollTimer !== null) return;
      store.pollTimer = setInterval(pollOnce, POLL_MS);
      pollOnce();
    }

    function stopPolling() {
      if (store.pollTimer !== null) {
        clearInterval(store.pollTimer);
        store.pollTimer = null;
      }
    }

    let pollBusy = false;
    async function pollOnce() {
      if (pollBusy || store.subscribers.size === 0) return;
      pollBusy = true;
      let changed = false;
      let statusChanged = false;
      try {
        const value = await callCanvas('state', {
          since: store.loaded ? store.rev : undefined,
          docId: store.docId ?? undefined,
        });
        const wasStale = store.hostStale;
        store.hostStale = typeof value?.hostBuild !== 'string';
        changed = applyServerState(value) === true;
        statusChanged = store.status !== 'live' || store.error !== null || !store.loaded || (store.hostStale && !wasStale);
        store.status = 'live';
        store.error = null;
        store.loaded = true;
        if (store.pendingOps.length > 0) {
          const queued = store.pendingOps;
          store.pendingOps = [];
          for (const ops of queued) sendOps(ops);
        }
      } catch (error) {
        const message = String(error?.message ?? error);
        statusChanged = store.status !== 'offline' || store.error !== message;
        store.status = 'offline';
        store.error = message;
      } finally {
        pollBusy = false;
        if (changed || statusChanged) notify();
      }
    }

    function rememberAi(ops) {
      const now = Date.now();
      let changed = 0;
      for (const op of ops ?? []) {
        if (op?.op === 'upsert' && op.item?.id) {
          store.aiFlash.set(op.item.id, now);
          changed += 1;
        } else if (op?.op === 'delete' && op.id) {
          store.aiFlash.set(op.id, now);
          changed += 1;
        }
      }
      if (changed > 0) {
        store.aiCount = changed;
        store.aiAt = now;
      }
    }

    function applyServerState(value) {
      if (!value || typeof value !== 'object') return false;
      const incomingDocId = typeof value.docId === 'string' ? value.docId : null;
      // Switching canvases on the host: replace the whole document locally.
      if (incomingDocId && incomingDocId !== store.docId) {
        store.docId = incomingDocId;
        store.history = [];
        store.future = [];
        store.pendingOps = [];
        store.doc = {
          ...emptyDoc(),
          id: incomingDocId,
          title: value.title ?? store.doc.title,
          rev: value.rev ?? 0,
          updatedAt: value.updatedAt ?? new Date().toISOString(),
          viewport: value.viewport ?? store.doc.viewport,
          focus: value.focus ?? null,
          items: value.items ?? {},
        };
        store.rev = store.doc.rev;
        store.aiFlash.clear();
        if (value.library && typeof value.library === 'object') store.library = value.library;
        if (Array.isArray(value.snapshots)) store.snapshots = value.snapshots;
        return true;
      }
      const previousRev = store.rev;
      const previousLoaded = store.loaded;
      const previousTitle = store.doc.title;
      if (value.library && typeof value.library === 'object') store.library = value.library;
      if (Array.isArray(value.snapshots)) store.snapshots = value.snapshots;
      if (value.full === true && value.items) {
        store.doc = {
          ...store.doc,
          title: value.title ?? store.doc.title,
          rev: value.rev ?? store.doc.rev,
          updatedAt: value.updatedAt ?? store.doc.updatedAt,
          viewport: value.viewport ?? store.doc.viewport,
          focus: value.focus ?? null,
          items: value.items,
        };
        store.rev = store.doc.rev;
        store.aiFlash.clear();
        return true;
      }
      if (typeof value.rev === 'number' && value.rev < store.rev && !value.full) return false;
      const ops = Array.isArray(value.ops) ? value.ops : [];
      if (ops.length > 0) {
        store.doc = localApply(store.doc, ops);
        const aiOps = ops.filter((op) => op?.item?.by === 'ai');
        if (aiOps.length > 0) rememberAi(aiOps);
      }
      store.doc = {
        ...store.doc,
        title: value.title ?? store.doc.title,
        rev: value.rev ?? store.doc.rev,
        updatedAt: value.updatedAt ?? store.doc.updatedAt,
        focus: value.focus ?? store.doc.focus,
      };
      if (typeof value.rev === 'number') store.rev = value.rev;
      return ops.length > 0 || store.rev !== previousRev || !previousLoaded || store.doc.title !== previousTitle;
    }

    function inverseOps(docBefore, ops) {
      const inverse = [];
      for (const op of ops) {
        if (op.op === 'upsert') {
          const previous = docBefore.items[op.item.id];
          inverse.push(previous ? { op: 'upsert', item: previous } : { op: 'delete', id: op.item.id });
        } else if (op.op === 'patch') {
          const previous = docBefore.items[op.id];
          if (previous) inverse.push({ op: 'upsert', item: previous });
        } else if (op.op === 'delete') {
          const previous = docBefore.items[op.id];
          if (previous) inverse.push({ op: 'upsert', item: previous });
          // the host cascades deletion to attached edges; restore those too
          for (const key of Object.keys(docBefore.items)) {
            const item = docBefore.items[key];
            if (item.type === 'edge' && (item.from === op.id || item.to === op.id)) inverse.push({ op: 'upsert', item });
          }
        } else if (op.op === 'clear') {
          for (const key of Object.keys(docBefore.items)) inverse.push({ op: 'upsert', item: docBefore.items[key] });
        } else if (op.op === 'title') {
          inverse.push({ op: 'title', title: docBefore.title });
        }
      }
      return inverse;
    }

    let sendChain = Promise.resolve();

    function sendOps(ops) {
      sendChain = sendChain
        .then(() =>
          callCanvas('apply', { ops, by: 'user' }).then((value) => {
            // the host answers { revision, applied, changed, errors }: take the normalized ops
            if (value && typeof value.revision === 'number') store.rev = Math.max(store.rev, value.revision);
            if (value && Array.isArray(value.applied) && value.applied.length > 0) {
              store.doc = localApply(store.doc, value.applied);
            }
            if (store.status !== 'live') store.status = 'live';
            notify();
          }),
        )
        .catch((error) => {
          store.status = 'offline';
          store.error = String(error?.message ?? error);
          store.pendingOps.push(ops);
          notify();
        });
      return sendChain;
    }

    function commit(ops, options = {}) {
      if (!store.doc || ops.length === 0) return;
      const before = store.doc;
      const inverse = options.undoable === false ? [] : inverseOps(before, ops);
      store.doc = localApply(before, ops);
      if (options.undoable !== false) {
        store.history.push({ forward: ops, inverse });
        if (store.history.length > 80) store.history.shift();
        store.future = [];
      }
      notify();
      sendOps(ops);
    }

    function undo() {
      const entry = store.history.pop();
      if (!entry) return;
      store.future.push(entry);
      const before = store.doc;
      store.doc = localApply(before, entry.inverse);
      notify();
      sendOps(entry.inverse);
    }

    function redo() {
      const entry = store.future.pop();
      if (!entry) return;
      store.history.push(entry);
      const before = store.doc;
      store.doc = localApply(before, entry.forward);
      notify();
      sendOps(entry.forward);
    }

    function beginItem(type, x, y, extra = {}) {
      const size = DEFAULT_SIZE[type] ?? { w: 240, h: 160 };
      const now = new Date().toISOString();
      return {
        id: newLocalId(type === 'edge' ? 'e' : 'n'),
        type,
        x: Math.round(x),
        y: Math.round(y),
        w: extra.w ?? size.w,
        h: extra.h ?? size.h,
        z: highestZ(store.doc.items),
        text: extra.text ?? '',
        color: extra.color ?? DEFAULT_COLOR[type] ?? 'yellow',
        by: 'user',
        createdAt: now,
        updatedAt: now,
        ...(type === 'shape' ? { shape: extra.shape ?? 'rect' } : {}),
        ...(type === 'stroke' ? { points: extra.points ?? [], width: extra.width ?? 3 } : {}),
        ...(type === 'agent' ? { task: extra.task ?? '', status: extra.status ?? 'idle' } : {}),
        ...(type === 'image' ? { src: extra.src ?? '' } : {}),
        ...(type === 'edge' ? { from: extra.from, to: extra.to, label: extra.label ?? '' } : {}),
      };
    }

    function upsertItem(item) {
      commit([{ op: 'upsert', item: { ...item, updatedAt: new Date().toISOString() } }]);
    }

    function patchItem(id, patch, options) {
      const current = store.doc.items[id];
      if (!current) return;
      const merged = { ...current, ...patch, updatedAt: new Date().toISOString() };
      commit([{ op: 'upsert', item: merged }], options);
    }

    function deleteItems(ids) {
      const targets = ids.filter((id) => store.doc.items[id]);
      if (targets.length === 0) return;
      const deleted = new Set(targets);
      const ops = targets.map((id) => ({ op: 'delete', id }));
      // Detach children of deleted frames so they never reference a missing frame.
      const now = new Date().toISOString();
      for (const entry of Object.values(store.doc.items)) {
        if (entry.type === 'edge' || deleted.has(entry.id)) continue;
        if (entry.frameId && deleted.has(entry.frameId)) {
          ops.push({ op: 'upsert', item: { ...entry, frameId: null, updatedAt: now } });
        }
      }
      commit(ops);
    }

    /** Innermost frame that contains a world point (frames only). */
    // #region frame-helpers
    function frameContainingPoint(items, point, excludeIds) {
      let best = null;
      for (const item of Object.values(items ?? {})) {
        if (!item || item.type !== 'frame') continue;
        if (excludeIds && excludeIds.has(item.id)) continue;
        if (point.x < item.x || point.x > item.x + item.w || point.y < item.y || point.y > item.y + item.h) continue;
        if (!best || item.w * item.h < best.w * best.h) best = item;
      }
      return best;
    }

    /** All descendants (recursively) that belong to a frame through `frameId`. */
    function frameDescendants(items, frameIds, into) {
      const result = into ?? new Map();
      for (const item of Object.values(items ?? {})) {
        if (!item || item.type === 'edge' || result.has(item.id)) continue;
        if (item.frameId && frameIds.has(item.frameId)) {
          result.set(item.id, item);
          frameDescendants(items, new Set([item.id]), result);
        }
      }
      return result;
    }
    // #endregion frame-helpers

    function duplicateItems(ids) {
      const items = ids.map((id) => store.doc.items[id]).filter((item) => item && item.type !== 'edge');
      if (items.length === 0) return;
      const created = items.map((item) => ({
        ...item,
        id: newLocalId('n'),
        x: item.x + 32,
        y: item.y + 32,
        z: highestZ(store.doc.items),
        updatedAt: new Date().toISOString(),
      }));
      commit(created.map((item) => ({ op: 'upsert', item })));
      return created.map((item) => item.id);
    }

    function reportViewport(viewport) {
      if (!store.loaded) return;
      callCanvas('viewport', { viewport }).catch(() => {});
    }

    function useStore() {
      const [, force] = useState(0);
      useEffect(() => subscribeStore(() => force((value) => value + 1)), []);
      return store;
    }

    /* ------------------------------------------------------------------ *
     * icons
     * ------------------------------------------------------------------ */
    const ICON_PATHS = {
      cursor: 'M6 3.5l12.5 6.4-5.2 1.3L11 17z',
      hand: 'M9 11V5.6a1.6 1.6 0 013.2 0V11m0-1.4a1.6 1.6 0 013.2 0V12m0-1a1.6 1.6 0 013.2 0v5.2a4.6 4.6 0 01-4.6 4.6h-1.3a4.6 4.6 0 01-3.8-2l-2.6-3.6a1.7 1.7 0 012.5-2.2L9 13.8',
      note: 'M5 4.5h14v10.5l-4.5 4.5H5zM14.5 19v-4h4.5',
      text: 'M5 6h14M12 6v12M9 18h6',
      shape: 'M4.5 7.5a3 3 0 116 0 3 3 0 01-6 0zM13.5 16.5a3 3 0 116 0 3 3 0 01-6 0zM9.5 9.5h4',
      frame: 'M8 4v16M16 4v16M4 8h16M4 16h16',
      'connect': 'M7 7a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM17 12a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM9.5 9.5l5 5',
      edit: 'M4 20h4.2L19 9.2a2.1 2.1 0 00-3-3L5.2 17zM14.5 7.5l2 2',
      undo: 'M9 8H5v-4M5.6 8.6A7 7 0 1119 12',
      redo: 'M15 8h4v-4M18.4 8.6A7 7 0 105 12',
      plus: 'M12 5v14M5 12h14',
      minus: 'M5 12h14',
      fit: 'M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4M9 12h6',
      trash: 'M4 7h16M9.5 7V4.5h5V7M6.5 7l.8 12.5h9.4L17.5 7M10 11v5M14 11v5',
      copy: 'M9 9h10v11H9zM15 9V4H5v11h4',
      image: 'M4 5.5h16v13H4zM4 15l4.5-4.5L13 15M14 12.5l2.5-2.5L20 13M15.5 8.5h.01',
      close: 'M6 6l12 12M18 6L6 18',
      check: 'M5 12.5l4.5 4.5L19 7.5',
      sparkles: 'M12 4l1.8 4.2L18 10l-4.2 1.8L12 16l-1.8-4.2L6 10l4.2-1.8zM18.5 16.5l.8 1.8 1.8.8-1.8.8-.8 1.8-.8-1.8-1.8-.8 1.8-.8z',
      help: 'M12 3a9 9 0 100 18 9 9 0 000-18zM9.4 9.4a2.7 2.7 0 015.1 1c0 1.8-2.5 2-2.5 3.8M12 17.2h.01',
      settings: 'M12 8.4a3.6 3.6 0 100 7.2 3.6 3.6 0 000-7.2zM12 2.8v2.1M12 19.1v2.1M4.9 12H2.8M21.2 12h-2.1M6.4 6.4L4.9 4.9M19.1 19.1l-1.5-1.5M17.6 6.4l1.5-1.5M4.9 19.1l1.5-1.5',
      folder: 'M3.5 6.5h6l2 2h9v9.5h-17z',
      tag: 'M4 4.5h7l8.5 8.5-7 7L4 11.5zM8 8h.01',
      search: 'M11 4.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM16 16l4 4',
      chevronLeft: 'M14.5 6l-6 6 6 6',
      link: 'M9.5 14.5l5-5M8 11l-1.5 1.5a3.5 3.5 0 004.9 4.9L13 16M16 13l1.5-1.5a3.5 3.5 0 00-4.9-4.9L11 8',
      save: 'M5 4.5h11l3 3V19.5H5zM8 4.5v5h7v-5M8 19.5v-5h8v5',
      axis: 'M3.5 12h17M7 12v4M12 12v4M17 12v4M7 16v-2M12 16v-3M17 16v-2',
      graph: 'M5.5 5.5a2 2 0 100 4 2 2 0 000-4zM18.5 4a2 2 0 100 4 2 2 0 000-4zM12 16.5a2 2 0 100 4 2 2 0 000-4zM7.2 8.1l3.6 7.1M16.8 7.9l-3.4 7.3M7.6 7.4l8.7-2.4',
      pen: 'M4 20h4.2L19 9.2a2.1 2.1 0 00-3-3L5.2 17z',
      agent: 'M7 8.5h10a2 2 0 012 2v5a2 2 0 01-2 2H7a2 2 0 01-2-2v-5a2 2 0 012-2zM12 4.5v4M9.2 12.8h.01M14.8 12.8h.01M9.6 16.4h4.8',
      play: 'M8 5.5l10.5 6.5L8 18.5z',
      book: 'M6.5 4.5h8a2 2 0 012 2v13H8a2 2 0 01-2-2zM6.5 4.5v15M10 8.5h6M10 12h6',
      palette: 'M12 3.2a8.8 8.8 0 100 17.6h1.4a2 2 0 001.6-3.2 2 2 0 011.6-3.2h1.9a2 2 0 002-2A8.9 8.9 0 0012 3.2zM7.6 10.6h.01M10 7.6h.01M14 7.4h.01M16.4 10.4h.01',
    };

    function Icon({ name, size = 18 }) {
      const path = ICON_PATHS[name] ?? ICON_PATHS.note;
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': 'true', style: { display: 'block', flex: '0 0 auto' } },
        h('path', {
          d: path,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      );
    }

    /* 品牌标记：叠起来的画布 + 取景角 + 大白眼（掀角方向） */
    function BrandMark({ size = 20 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 64 64', 'aria-hidden': 'true', style: { display: 'block', flex: '0 0 auto' } },
        h('rect', { x: 0.5, y: 0.5, width: 63, height: 63, rx: 15, fill: '#0B0E1B', stroke: '#233449', strokeWidth: 1 }),
        h('path', { d: 'M48 0.5 L63.5 16 L48 16 Z', fill: '#16323F', stroke: '#22D3EE', strokeWidth: 1.2, strokeLinejoin: 'round' }),
        h('path', { d: 'M22.5 9 H9 V22.5', fill: 'none', stroke: '#22D3EE', strokeWidth: 5.5, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        h('path', { d: 'M22.5 55 H9 V41.5', fill: 'none', stroke: '#22D3EE', strokeWidth: 5.5, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        h('path', { d: 'M55 41.5 V55 H41.5', fill: 'none', stroke: '#22D3EE', strokeWidth: 5.5, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        h('path', { d: 'M25.5 34.6 Q32 38.6 38.5 34.6', fill: 'none', stroke: '#E0F2FE', strokeWidth: 2.8, strokeLinecap: 'round' }),
        h('circle', { cx: 19.5, cy: 34, r: 6, fill: '#E0F2FE' }),
        h('circle', { cx: 44.5, cy: 34, r: 6, fill: '#E0F2FE' }),
      );
    }

    function ToolButton({ tool, label, shortcut, active, onSelect }) {
      const title = shortcut ? `${label} (${shortcut.toUpperCase()})` : label;
      return h(
        'button',
        {
          type: 'button',
          className: 'dsic-btn dsic-tool',
          'data-active': active ? 'true' : undefined,
          title,
          'aria-label': title,
          'aria-pressed': active ? 'true' : undefined,
          onClick: () => onSelect(tool),
        },
        h(Icon, { name: tool, size: 17 }),
        h('span', { className: 'dsic-tool-label' }, label),
      );
    }

    /* ------------------------------------------------------------------ *
     * geometry helpers
     * ------------------------------------------------------------------ */
    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    /** Compact relative time for the canvas / history lists. */
    function relativeWhen(value) {
      const at = typeof value === 'number' ? value : Date.parse(String(value ?? ''));
      if (!Number.isFinite(at) || at <= 0) return '';
      const delta = Date.now() - at;
      if (delta < 60_000) return '刚刚';
      if (delta < 3_600_000) return `${Math.floor(delta / 60_000)} 分钟前`;
      if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)} 小时前`;
      if (delta < 7 * 86_400_000) return `${Math.floor(delta / 86_400_000)} 天前`;
      const date = new Date(at);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }

    function formatFileSize(bytes) {
      const size = Number(bytes) || 0;
      if (size < 1024) return `${size} B`;
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }

    /** Tick positions of an axis (number line / timeline), as percentages along it. */
    function axisTicks(config) {
      const source = config && typeof config === 'object' ? config : {};
      const count = Math.max(2, Math.min(80, Number(source.ticks) || 11));
      const min = Number(source.min) || 0;
      const max = Number.isFinite(Number(source.max)) ? Number(source.max) : min + 10;
      const step = Number(source.step) > 0 ? Number(source.step) : (max - min) / (count - 1);
      const unit = String(source.unit ?? '');
      const ticks = [];
      for (let index = 0; index < count; index += 1) {
        const value = Math.round((min + index * step) * 1000) / 1000;
        ticks.push({
          index,
          value,
          label: `${value}${unit}`,
          pct: count > 1 ? (index / (count - 1)) * 100 : 0,
        });
      }
      return ticks;
    }

    /** Cards with this much text stop behaving like short sticky notes. */
    const LONG_CARD_CHARS = 320;
    const LONG_CARD_LINES = 10;

    function isLongCardText(text) {
      const value = String(text ?? '');
      if (value.trim() === '') return false;
      return value.length > LONG_CARD_CHARS || value.split('\n').length > LONG_CARD_LINES;
    }

    /** Rough autosize for document cards: wrapped lines at ~13px per char over the width. */
    function estimateDocHeight(text, width) {
      const value = String(text ?? '');
      const columns = Math.max(18, Math.floor((Number(width) || 520) / 13));
      const lines = value.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / columns)), 0);
      return Math.min(4000, Math.max(200, Math.round(lines * 27 + 70)));
    }

    /** Tiny Markdown renderer for document cards (headings, bold, lists, quotes, code). */
    function renderInlineMarkdown(text, keyPrefix) {
      const nodes = [];
      const source = String(text ?? '');
      const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
      let cursor = 0;
      let match;
      let index = 0;
      while ((match = pattern.exec(source)) !== null) {
        if (match.index > cursor) nodes.push(source.slice(cursor, match.index));
        const token = match[0];
        if (token.startsWith('**')) nodes.push(h('strong', { key: `${keyPrefix}-b-${index}` }, token.slice(2, -2)));
        else if (token.startsWith('`')) nodes.push(h('code', { key: `${keyPrefix}-c-${index}` }, token.slice(1, -1)));
        else {
          const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
          nodes.push(h('span', { key: `${keyPrefix}-a-${index}`, className: 'dsic-md-link' }, link ? link[1] : token));
        }
        cursor = match.index + token.length;
        index += 1;
      }
      if (cursor < source.length) nodes.push(source.slice(cursor));
      return nodes;
    }

    function MarkdownLite({ text }) {
      const lines = String(text ?? '').split('\n');
      const blocks = [];
      let list = null;
      const flushList = () => {
        if (list) {
          blocks.push(h('ul', { key: `ul-${blocks.length}`, className: 'dsic-md-list' }, list));
          list = null;
        }
      };
      lines.forEach((raw, index) => {
        const line = raw.replace(/\r$/, '');
        const heading = /^(#{1,4})\s+(.*)$/.exec(line);
        if (heading) {
          flushList();
          const level = heading[1].length;
          blocks.push(h(`h${Math.min(4, level + 1)}`, { key: `h-${index}`, className: `dsic-md-h dsic-md-h${level}` }, renderInlineMarkdown(heading[2], `h${index}`)));
          return;
        }
        if (/^\s*(?:---|\*\*\*)\s*$/.test(line)) {
          flushList();
          blocks.push(h('hr', { key: `hr-${index}`, className: 'dsic-md-hr' }));
          return;
        }
        const quote = /^>\s?(.*)$/.exec(line);
        if (quote) {
          flushList();
          blocks.push(h('blockquote', { key: `q-${index}`, className: 'dsic-md-quote' }, renderInlineMarkdown(quote[1], `q${index}`)));
          return;
        }
        const item = /^\s*(?:[-*+]|\d+\.)\s+(.*)$/.exec(line);
        if (item) {
          if (!list) list = [];
          list.push(h('li', { key: `li-${index}` }, renderInlineMarkdown(item[1], `li${index}`)));
          return;
        }
        flushList();
        if (line.trim() === '') blocks.push(h('div', { key: `sp-${index}`, className: 'dsic-md-gap' }));
        else blocks.push(h('p', { key: `p-${index}`, className: 'dsic-md-p' }, renderInlineMarkdown(line, `p${index}`)));
      });
      flushList();
      return h('div', { className: 'dsic-md' }, blocks);
    }

    function NodeText({ item, t }) {
      if (!item.text) return h('span', { className: 'dsic-placeholder' }, t('emptyNote'));
      // Document cards (and long-form sticky notes) get lightweight Markdown rendering
      // instead of one clipped raw paragraph.
      if (item.type === 'text' || isLongCardText(item.text)) return h(MarkdownLite, { text: item.text });
      return h('span', { className: 'dsic-node-text' }, item.text);
    }

    function round(value) {
      return Math.round(value);
    }

    function screenToWorld(point, viewport, size) {
      return {
        x: viewport.cx + (point.x - size.w / 2) / viewport.zoom,
        y: viewport.cy + (point.y - size.h / 2) / viewport.zoom,
      };
    }

    function localPoint(event, element) {
      const rect = element.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    /** Item id under a viewport point; used by link dragging to find the drop target. */
    function nodeIdAtClientPoint(clientX, clientY) {
      try {
        if (typeof document === 'undefined' || typeof document.elementFromPoint !== 'function') return null;
        const element = document.elementFromPoint(clientX, clientY);
        const nodeEl = element && element.closest ? element.closest('[data-node-id]') : null;
        return nodeEl ? nodeEl.getAttribute('data-node-id') : null;
      } catch (error) {
        return null;
      }
    }

    function itemBounds(item) {
      return { x: item.x, y: item.y, w: item.w, h: item.h };
    }

    function unionBounds(items) {
      if (items.length === 0) return null;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const item of items) {
        minX = Math.min(minX, item.x);
        minY = Math.min(minY, item.y);
        maxX = Math.max(maxX, item.x + item.w);
        maxY = Math.max(maxY, item.y + item.h);
      }
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }

    function rectsIntersect(a, b) {
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    function anchorPoint(item, toward) {
      const cx = item.x + item.w / 2;
      const cy = item.y + item.h / 2;
      const dx = toward.x - cx;
      const dy = toward.y - cy;
      if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return { x: cx, y: cy };
      const halfW = Math.max(item.w / 2, 1);
      const halfH = Math.max(item.h / 2, 1);
      const scale = Math.min(dx === 0 ? Infinity : halfW / Math.abs(dx), dy === 0 ? Infinity : halfH / Math.abs(dy));
      return { x: cx + dx * scale, y: cy + dy * scale };
    }

    function edgePath(fromItem, toItem, fromRect, toRect) {
      const from = { ...fromItem, ...(fromRect ?? itemBounds(fromItem)) };
      const to = { ...toItem, ...(toRect ?? itemBounds(toItem)) };
      const fromCenter = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
      const toCenter = { x: to.x + to.w / 2, y: to.y + to.h / 2 };
      const start = anchorPoint(from, toCenter);
      const end = anchorPoint(to, fromCenter);
      const curve = Math.max(Math.abs(end.x - start.x) * 0.45, 40);
      const c1x = start.x + (end.x > start.x ? curve : -curve);
      const c2x = end.x + (end.x > start.x ? -curve : curve);
      return {
        d: `M ${start.x} ${start.y} C ${c1x} ${start.y} ${c2x} ${end.y} ${end.x} ${end.y}`,
        midX: (start.x + end.x) / 2,
        midY: (start.y + end.y) / 2,
        startX: start.x,
        startY: start.y,
        endX: end.x,
        endY: end.y,
      };
    }

    /** Deterministic neon colour pair per edge for the cyberpunk connector look. */
    const NEON_PAIRS = [
      ['#22d3ee', '#818cf8'],
      ['#f472b6', '#22d3ee'],
      ['#a3e635', '#22d3ee'],
      ['#f59e0b', '#ec4899'],
      ['#818cf8', '#a855f7'],
      ['#2dd4bf', '#a78bfa'],
    ];

    function neonPairFor(id) {
      let hash = 0;
      const text = String(id ?? '');
      for (let index = 0; index < text.length; index += 1) hash = (hash * 31 + text.charCodeAt(index)) % 9973;
      return NEON_PAIRS[hash % NEON_PAIRS.length];
    }

    /* ------------------------------------------------------------------ *
     * media generation (local, programmatic: SVG images + GIF animations)
     * ------------------------------------------------------------------ */
    // #region media-generation
    const GIF_STEPS = 6;
    const GIF_PALETTE = (() => {
      const palette = [];
      for (let r = 0; r < GIF_STEPS; r += 1) {
        for (let g = 0; g < GIF_STEPS; g += 1) {
          for (let b = 0; b < GIF_STEPS; b += 1) {
            const scale = 255 / (GIF_STEPS - 1);
            palette.push([Math.round(r * scale), Math.round(g * scale), Math.round(b * scale)]);
          }
        }
      }
      return palette;
    })();
    const GIF_TABLE_BITS = 8;

    function gifColorIndex(red, green, blue) {
      const scale = (GIF_STEPS - 1) / 255;
      const ri = Math.round(red * scale);
      const gi = Math.round(green * scale);
      const bi = Math.round(blue * scale);
      return ri * GIF_STEPS * GIF_STEPS + gi * GIF_STEPS + bi;
    }

    /** GIF LZW compression over 8-bit palette indices (LSB-first codes). */
    function gifLzwEncode(indices, minCodeSize) {
      const CLEAR = 1 << minCodeSize;
      const END_CODE = CLEAR + 1;
      const bytes = [];
      let bitBuffer = 0;
      let bitCount = 0;
      const emit = (code, codeSize) => {
        bitBuffer |= code << bitCount;
        bitCount += codeSize;
        while (bitCount >= 8) {
          bytes.push(bitBuffer & 0xff);
          bitBuffer >>>= 8;
          bitCount -= 8;
        }
      };
      let codeSize = minCodeSize + 1;
      let nextCode = END_CODE + 1;
      let table = new Map();
      emit(CLEAR, codeSize);
      if (indices.length === 0) {
        emit(END_CODE, codeSize);
        if (bitCount > 0) bytes.push(bitBuffer & 0xff);
        return bytes;
      }
      let current = indices[0];
      for (let index = 1; index < indices.length; index += 1) {
        const next = indices[index];
        const key = current * 256 + next;
        const found = table.get(key);
        if (found !== undefined) {
          current = found;
          continue;
        }
        emit(current, codeSize);
        if (nextCode < 4096) {
          table.set(key, nextCode);
          nextCode += 1;
          if (nextCode > 1 << codeSize && codeSize < 12) codeSize += 1;
        } else {
          emit(CLEAR, codeSize);
          table = new Map();
          nextCode = END_CODE + 1;
          codeSize = minCodeSize + 1;
        }
        current = next;
      }
      emit(current, codeSize);
      emit(END_CODE, codeSize);
      if (bitCount > 0) bytes.push(bitBuffer & 0xff);
      return bytes;
    }

    function bytesToBase64(bytes) {
      let binary = '';
      const chunk = 0x8000;
      for (let offset = 0; offset < bytes.length; offset += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(offset, offset + chunk));
      }
      if (typeof btoa === 'function') return btoa(binary);
      return Buffer.from(bytes).toString('base64');
    }

    /** Encode palette-index frames into a looping GIF89a data URL. */
    function encodeGif({ width, height, frames, delayMs }) {
      const bytes = [];
      const pushAscii = (text) => {
        for (let index = 0; index < text.length; index += 1) bytes.push(text.charCodeAt(index) & 0xff);
      };
      const pushU16 = (value) => bytes.push(value & 0xff, (value >> 8) & 0xff);
      pushAscii('GIF89a');
      pushU16(width);
      pushU16(height);
      bytes.push(0xf7, 0x00, 0x00); // global color table, 8 bits, 256 entries
      for (const color of GIF_PALETTE) bytes.push(color[0], color[1], color[2]);
      for (let index = GIF_PALETTE.length; index < 256; index += 1) bytes.push(0, 0, 0);
      pushAscii('!'); bytes.push(0xff, 0x0b); pushAscii('NETSCAPE2.0'); bytes.push(0x03, 0x01, 0x00, 0x00, 0x00);
      const delay = Math.max(2, Math.round((delayMs ?? 90) / 10));
      for (const frame of frames) {
        bytes.push(0x21, 0xf9, 0x04, 0x04, delay & 0xff, (delay >> 8) & 0xff, 0x00, 0x00);
        bytes.push(0x2c);
        pushU16(0); pushU16(0); pushU16(width); pushU16(height);
        bytes.push(0x00);
        bytes.push(GIF_TABLE_BITS);
        const compressed = gifLzwEncode(frame, GIF_TABLE_BITS);
        for (let offset = 0; offset < compressed.length; offset += 255) {
          const block = compressed.slice(offset, offset + 255);
          bytes.push(block.length);
          for (const byte of block) bytes.push(byte);
        }
        bytes.push(0x00);
      }
      bytes.push(0x3b);
      return `data:image/gif;base64,${bytesToBase64(new Uint8Array(bytes))}`;
    }

    function escapeXml(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    const MEDIA_RATIOS = {
      wide: { w: 1280, h: 720 },
      square: { w: 1024, h: 1024 },
      tall: { w: 900, h: 1280 },
    };

    const MEDIA_STYLES = ['poster', 'cover', 'banner', 'card', 'abstract'];
    const MEDIA_GIF_STYLES = ['waves', 'pulse', 'orbit', 'bars'];

    function mediaHue(prompt) {
      let hash = 0;
      const text = String(prompt ?? '');
      for (let index = 0; index < text.length; index += 1) hash = (hash * 31 + text.charCodeAt(index)) % 360;
      return hash;
    }

    /** Deterministic SVG illustration (flat design, not photorealistic). */
    function buildImageSvg({ width, height, title, subtitle, style, hue }) {
      const h1 = hue % 360;
      const h2 = (hue + 48) % 360;
      const id = Math.abs(hue) % 1000;
      const text = escapeXml(title).slice(0, 40);
      const sub = escapeXml(subtitle).slice(0, 60);
      const parts = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
        `<defs><linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="1">`,
        `<stop offset="0" stop-color="hsl(${h1} 70% 16%)"/><stop offset="1" stop-color="hsl(${h2} 72% 30%)"/>`,
        `</linearGradient><linearGradient id="a${id}" x1="0" y1="0" x2="1" y2="0">`,
        `<stop offset="0" stop-color="hsl(${(h1 + 180) % 360} 85% 64%)"/><stop offset="1" stop-color="hsl(${h2} 90% 58%)"/>`,
        `</linearGradient></defs>`,
        `<rect width="${width}" height="${height}" fill="url(#g${id})"/>`,
      ];
      if (style === 'poster') {
        parts.push(`<circle cx="${width * 0.78}" cy="${height * 0.28}" r="${height * 0.3}" fill="hsl(${h2} 85% 62%)" opacity="0.9"/>`);
        parts.push(`<circle cx="${width * 0.22}" cy="${height * 0.82}" r="${height * 0.22}" fill="url(#a${id})" opacity="0.55"/>`);
        parts.push(`<rect x="${width * 0.08}" y="${height * 0.6}" width="${width * 0.55}" height="8" rx="4" fill="hsl(${h1} 40% 92%)" opacity="0.8"/>`);
      } else if (style === 'cover') {
        for (let index = 0; index < 7; index += 1) {
          const x = width * (0.1 + index * 0.12);
          parts.push(`<rect x="${x}" y="${height * (0.18 + (index % 3) * 0.06)}" width="${width * 0.07}" height="${height * 0.6}" rx="10" fill="hsl(${(h1 + index * 26) % 360} 80% 62%)" opacity="${0.35 + index * 0.07}"/>`);
        }
      } else if (style === 'banner') {
        parts.push(`<path d="M0 ${height * 0.62} Q ${width * 0.25} ${height * 0.4} ${width * 0.5} ${height * 0.6} T ${width} ${height * 0.52} V ${height} H 0 Z" fill="url(#a${id})" opacity="0.35"/>`);
        parts.push(`<path d="M0 ${height * 0.78} Q ${width * 0.3} ${height * 0.6} ${width * 0.6} ${height * 0.76} T ${width} ${height * 0.7} V ${height} H 0 Z" fill="hsl(${h2} 85% 60%)" opacity="0.5"/>`);
      } else if (style === 'card') {
        parts.push(`<rect x="${width * 0.1}" y="${height * 0.18}" width="${width * 0.8}" height="${height * 0.64}" rx="28" fill="hsl(${h1} 30% 96%)" opacity="0.95"/>`);
        parts.push(`<rect x="${width * 0.1}" y="${height * 0.18}" width="${width * 0.8}" height="10" rx="5" fill="url(#a${id})"/>`);
        parts.push(`<circle cx="${width * 0.2}" cy="${height * 0.62}" r="${height * 0.06}" fill="hsl(${h2} 80% 58%)"/>`);
      } else {
        for (let index = 0; index < 14; index += 1) {
          const x = (width * ((index * 37) % 100)) / 100;
          const y = (height * ((index * 53) % 100)) / 100;
          parts.push(`<circle cx="${x}" cy="${y}" r="${height * (0.04 + (index % 5) * 0.02)}" fill="hsl(${(h1 + index * 21) % 360} 82% 62%)" opacity="${0.25 + (index % 4) * 0.15}"/>`);
        }
      }
      const titleY = style === 'card' ? height * 0.46 : height * 0.5;
      parts.push(`<text x="${width * 0.08}" y="${titleY}" font-family="system-ui, 'Segoe UI', 'Microsoft YaHei', sans-serif" font-size="${Math.round(width * 0.052)}" font-weight="700" fill="#ffffff">${text}</text>`);
      if (sub) {
        parts.push(`<text x="${width * 0.08}" y="${titleY + Math.round(width * 0.052) + Math.round(height * 0.05)}" font-family="system-ui, sans-serif" font-size="${Math.round(width * 0.024)}" fill="rgba(255,255,255,0.72)">${sub}</text>`);
      }
      parts.push('</svg>');
      return parts.join('');
    }

    function svgToDataUrl(svg) {
      const encoded = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(svg))) : '';
      return `data:image/svg+xml;base64,${encoded}`;
    }

    function drawAnimationFrame(context, { style, width, height, progress, title }) {
      const hue = 208;
      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, `hsl(${hue} 75% 14%)`);
      gradient.addColorStop(1, `hsl(${(hue + 60) % 360} 80% 26%)`);
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
      const tau = Math.PI * 2;
      if (style === 'waves') {
        for (let layer = 0; layer < 3; layer += 1) {
          context.beginPath();
          for (let x = 0; x <= width; x += 8) {
            const y = height * (0.45 + layer * 0.12) + Math.sin((x / width) * tau * 1.6 + progress * tau + layer) * height * 0.06;
            if (x === 0) context.moveTo(x, y); else context.lineTo(x, y);
          }
          context.strokeStyle = `hsla(${(hue + layer * 45) % 360} 90% 65% / ${0.65 - layer * 0.15})`;
          context.lineWidth = 3;
          context.stroke();
        }
      } else if (style === 'pulse') {
        for (let ring = 0; ring < 4; ring += 1) {
          const phase = (progress + ring * 0.25) % 1;
          context.beginPath();
          context.arc(width * 0.5, height * 0.5, height * (0.1 + phase * 0.38), 0, tau);
          context.strokeStyle = `hsla(${(hue + ring * 40) % 360} 90% 66% / ${0.8 - phase * 0.7})`;
          context.lineWidth = 3;
          context.stroke();
        }
      } else if (style === 'orbit') {
        for (let dot = 0; dot < 9; dot += 1) {
          const angle = progress * tau + (dot / 9) * tau;
          const radius = height * (0.2 + (dot % 3) * 0.09);
          const x = width * 0.5 + Math.cos(angle) * radius * 1.7;
          const y = height * 0.5 + Math.sin(angle) * radius;
          context.beginPath();
          context.arc(x, y, 5 + (dot % 3) * 2, 0, tau);
          context.fillStyle = `hsl(${(hue + dot * 32) % 360} 88% 66%)`;
          context.fill();
        }
      } else {
        for (let bar = 0; bar < 12; bar += 1) {
          const amplitude = 0.18 + 0.16 * (0.5 + 0.5 * Math.sin(progress * tau + bar * 0.7));
          const x = width * 0.1 + bar * (width * 0.8 / 12);
          const barHeight = height * amplitude;
          context.fillStyle = `hsl(${(hue + bar * 18) % 360} 85% 62%)`;
          context.fillRect(x, height * 0.82 - barHeight, width * 0.8 / 12 - 6, barHeight);
        }
      }
      if (title) {
        context.fillStyle = 'rgba(255,255,255,0.92)';
        context.font = '700 18px system-ui, "Microsoft YaHei", sans-serif';
        context.fillText(String(title).slice(0, 24), 18, 34);
      }
    }

    /** Render GIF frames in the browser (canvas 2D 到 palette indices). */
    function renderAnimationFrames({ style, width, height, frameCount, title }) {
      if (typeof document === 'undefined' || !document.createElement) return null;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext ? canvas.getContext('2d') : null;
      if (!context) return null;
      const frames = [];
      for (let index = 0; index < frameCount; index += 1) {
        drawAnimationFrame(context, { style, width, height, progress: index / frameCount, title });
        const pixels = context.getImageData(0, 0, width, height).data;
        const indices = new Uint8Array(width * height);
        for (let pixel = 0, offset = 0; pixel < indices.length; pixel += 1, offset += 4) {
          indices[pixel] = gifColorIndex(pixels[offset], pixels[offset + 1], pixels[offset + 2]);
        }
        frames.push(indices);
      }
      return frames;
    }

    const MEDIA_GIF_WIDTH = 360;
    const MEDIA_GIF_HEIGHT = 203;
    const MEDIA_GIF_FRAMES = 10;

    /** Build one media asset: SVG still image or looping GIF animation. */
    function generateMediaAsset({ kind, prompt, style, ratio, subtitle }) {
      const title = String(prompt ?? '').trim().slice(0, 60);
      if (kind === 'gif') {
        const frames = renderAnimationFrames({
          style: MEDIA_GIF_STYLES.includes(style) ? style : MEDIA_GIF_STYLES[0],
          width: MEDIA_GIF_WIDTH,
          height: MEDIA_GIF_HEIGHT,
          frameCount: MEDIA_GIF_FRAMES,
          title,
        });
        if (!frames) throw new Error('当前浏览器不支持 canvas 渲染');
        return {
          src: encodeGif({ width: MEDIA_GIF_WIDTH, height: MEDIA_GIF_HEIGHT, frames, delayMs: 90 }),
          width: MEDIA_GIF_WIDTH,
          height: MEDIA_GIF_HEIGHT,
          title,
        };
      }
      const size = MEDIA_RATIOS[ratio] ?? MEDIA_RATIOS.wide;
      const svg = buildImageSvg({
        width: size.w,
        height: size.h,
        title: title || '未命名',
        subtitle,
        style: MEDIA_STYLES.includes(style) ? style : MEDIA_STYLES[0],
        hue: mediaHue(title),
      });
      const displayWidth = Math.min(560, size.w);
      return {
        src: svgToDataUrl(svg),
        width: Math.round(displayWidth),
        height: Math.round((displayWidth * size.h) / size.w),
        title,
      };
    }
    // #endregion media-generation

    /* ------------------------------------------------------------------ *
     * node rendering (display only; text is edited through the overlay below)
     * ------------------------------------------------------------------ */

    /** Stable, playful idle line per agent card (same card always shows the same quip). */
    function agentQuip(t, item) {
      const quips = String(t('agentQuips') ?? '')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '');
      if (quips.length === 0) return t('agentTaskPlaceholder');
      let hash = 0;
      const text = String(item?.id ?? 'agent');
      for (let index = 0; index < text.length; index += 1) hash = (hash * 31 + text.charCodeAt(index)) % 9973;
      return quips[hash % quips.length];
    }

    /** Standalone large text editor: pure modal layout, no canvas-coordinate math. */
    function BigEditor({ t, initial, placeholder, onSave, onCancel }) {
      const [value, setValue] = useState(initial ?? '');
      return h(
        'div',
        {
          className: 'dsic-bigeditor',
          onPointerDown: (event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) onCancel();
          },
          onClick: (event) => event.stopPropagation(),
          onDoubleClick: (event) => event.stopPropagation(),
        },
        h(
          'div',
          { className: 'dsic-bigeditor-card', role: 'dialog', 'aria-label': t('bigEditorTitle') },
          h(
            'div',
            { className: 'dsic-bigeditor-head' },
            h('div', { className: 'dsic-bigeditor-title' }, t('bigEditorTitle')),
            h('button', { type: 'button', className: 'dsic-bigeditor-close', title: t('close'), onClick: onCancel }, h(Icon, { name: 'close', size: 16 })),
          ),
          h('p', { className: 'dsic-bigeditor-hint' }, t('bigEditorHint')),
          h('textarea', {
            className: 'dsic-bigeditor-input',
            value,
            autoFocus: true,
            spellCheck: false,
            placeholder: placeholder ?? t('bigEditorPlaceholder'),
            onChange: (event) => setValue(event.target.value),
            onKeyDown: (event) => {
              event.stopPropagation();
              if (event.key === 'Escape') onCancel();
              else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) onSave(value);
            },
          }),
          h(
            'div',
            { className: 'dsic-bigeditor-foot' },
            h('span', { className: 'dsic-bigeditor-count' }, t('bigEditorChars', { n: String(value).length })),
            h('button', { type: 'button', className: 'dsic-ghost', onClick: onCancel }, t('cancel')),
            h('button', { type: 'button', className: 'dsic-primary', onClick: () => onSave(value) }, t('bigEditorSave')),
          ),
        ),
      );
    }

    /** One-line role preview for the card badge. */
    function rolePreviewOf(role) {
      const line = String(role ?? '')
        .split('\n')
        .map((value) => value.replace(/^[#>\s-]+/, '').trim())
        .find((value) => value !== '');
      if (!line) return '';
      return line.length > 26 ? `${line.slice(0, 26)}…` : line;
    }

    /* ------------------------------------------------------------------ *
     * canvas skins (built-in presets + local custom background)
     * ------------------------------------------------------------------ */
    // #region skins
    const SKIN_KEY = 'dsic.skin.v1';
    const SKIN_PRESETS = [
      { id: 'starry', overlays: { twinkle: true, scanlines: true, hud: true, vignette: true } },
      { id: 'neon', overlays: { twinkle: false, scanlines: true, hud: true, vignette: true } },
      { id: 'aurora', overlays: { twinkle: true, scanlines: false, hud: false, vignette: true } },
      { id: 'blueprint', overlays: { twinkle: false, scanlines: false, hud: true, vignette: true } },
      { id: 'carbon', overlays: { twinkle: false, scanlines: false, hud: true, vignette: true } },
      { id: 'void', overlays: { twinkle: false, scanlines: false, hud: false, vignette: false } },
    ];
    const SKIN_IDS = SKIN_PRESETS.map((preset) => preset.id);
    const CUSTOM_SKIN_MAX = 3_000_000;

    /** Background layers for a built-in preset, panning/zooming with the canvas camera. */
    function skinBackground(presetId, params) {
      const zoom = Number(params?.zoom) > 0 ? Number(params.zoom) : 1;
      const ox = Number(params?.ox) || 0;
      const oy = Number(params?.oy) || 0;
      const grid = Number(params?.gridSize) || 24;
      const size = (factor) => `${Math.round(grid * zoom * factor * 100) / 100}px ${Math.round(grid * zoom * factor * 100) / 100}px`;
      const at = `${ox}px ${oy}px`;
      if (presetId === 'neon') {
        return {
          backgroundImage: [
            'radial-gradient(ellipse at 50% 112%, rgba(236,72,153,.2), transparent 55%)',
            'radial-gradient(ellipse at 50% 38%, rgba(34,211,238,.07), transparent 62%)',
            'linear-gradient(rgba(34,211,238,.11) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(34,211,238,.11) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: `auto, auto, ${size(4)}, ${size(4)}`,
          backgroundPosition: `0 0, 0 0, ${at}, ${at}`,
        };
      }
      if (presetId === 'aurora') {
        return {
          backgroundImage: [
            'radial-gradient(ellipse at 22% 28%, rgba(45,212,191,.13), transparent 52%)',
            'radial-gradient(ellipse at 74% 22%, rgba(129,140,248,.14), transparent 55%)',
            'radial-gradient(ellipse at 55% 88%, rgba(236,72,153,.08), transparent 60%)',
            'radial-gradient(circle, rgba(255,255,255,.5) 1.6px, transparent 2px)',
            'radial-gradient(circle, rgba(255,255,255,.2) 1px, transparent 1.3px)',
          ].join(', '),
          backgroundSize: `auto, auto, auto, ${size(6)}, ${size(2)}`,
          backgroundPosition: `0 0, 0 0, 0 0, ${at}, ${at}`,
        };
      }
      if (presetId === 'blueprint') {
        return {
          backgroundImage: [
            'linear-gradient(rgba(148,197,255,.14) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(148,197,255,.14) 1px, transparent 1px)',
            'linear-gradient(rgba(148,197,255,.05) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(148,197,255,.05) 1px, transparent 1px)',
            'linear-gradient(#071627, #0a2138)',
          ].join(', '),
          backgroundSize: `auto, auto, auto, auto, auto`,
          backgroundPosition: `0 0, 0 0, 0 0, 0 0, 0 0`,
        };
      }
      if (presetId === 'carbon') {
        return {
          backgroundImage: [
            'repeating-linear-gradient(45deg, rgba(255,255,255,.028) 0 2px, transparent 2px 7px)',
            'repeating-linear-gradient(-45deg, rgba(255,255,255,.022) 0 2px, transparent 2px 9px)',
            'radial-gradient(ellipse at 50% 30%, rgba(255,255,255,.04), transparent 65%)',
          ].join(', '),
          backgroundSize: 'auto, auto, auto',
          backgroundPosition: '0 0, 0 0, 0 0',
        };
      }
      if (presetId === 'void') {
        return {
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.16) 0.9px, transparent 1.2px)',
          backgroundSize: size(2),
          backgroundPosition: at,
        };
      }
      // starry (default): corner glows + nebula + three star layers + neon grids
      return {
        backgroundImage: [
          'radial-gradient(circle at 0% 0%, rgba(34,211,238,.07), transparent 38%)',
          'radial-gradient(circle at 100% 100%, rgba(236,72,153,.06), transparent 40%)',
          'radial-gradient(ellipse at 28% 18%, rgba(56,189,248,.04), transparent 55%)',
          'radial-gradient(ellipse at 76% 72%, rgba(168,85,247,.035), transparent 55%)',
          'radial-gradient(circle, rgba(255,255,255,.55) 1.9px, transparent 2.3px)',
          'radial-gradient(circle, rgba(255,255,255,.26) 1.25px, transparent 1.6px)',
          'radial-gradient(circle, rgba(255,255,255,.1) 1px, transparent 1.3px)',
          'linear-gradient(rgba(34,211,238,.055) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(34,211,238,.055) 1px, transparent 1px)',
          'linear-gradient(rgba(168,85,247,.05) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(168,85,247,.05) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: `auto, auto, auto, auto, ${size(4)}, ${size(2)}, ${size(1)}, ${size(4)}, ${size(4)}, ${size(16)}, ${size(16)}`,
        backgroundPosition: `0 0, 0 0, 0 0, 0 0, ${at}, ${at}, ${at}, ${at}, ${at}, ${at}, ${at}`,
      };
    }

    function normalizeSkin(value) {
      if (!value || typeof value !== 'object') return { kind: 'preset', presetId: 'starry' };
      if (value.kind === 'custom' && typeof value.src === 'string' && /^data:image\//i.test(value.src)) {
        return {
          kind: 'custom',
          src: value.src.slice(0, CUSTOM_SKIN_MAX),
          w: Math.max(32, Math.min(6000, Number(value.w) || 1200)),
          h: Math.max(32, Math.min(6000, Number(value.h) || 800)),
        };
      }
      return { kind: 'preset', presetId: SKIN_IDS.includes(value.presetId) ? value.presetId : 'starry' };
    }

    function loadSkin() {
      try {
        if (typeof localStorage === 'undefined') return { kind: 'preset', presetId: 'starry' };
        const raw = localStorage.getItem(SKIN_KEY);
        if (!raw) return { kind: 'preset', presetId: 'starry' };
        return normalizeSkin(JSON.parse(raw));
      } catch (error) {
        return { kind: 'preset', presetId: 'starry' };
      }
    }

    function persistSkin(skin) {
      try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(SKIN_KEY, JSON.stringify(normalizeSkin(skin)));
      } catch (error) {
        /* storage may be full/disabled: keep the in-memory skin */
      }
    }

    function buildSkinStyle(skin, params) {
      if (skin && skin.kind === 'custom' && skin.src) {
        const zoom = Number(params?.zoom) > 0 ? Number(params.zoom) : 1;
        return {
          backgroundImage: `url("${skin.src}")`,
          backgroundSize: `${Math.round(skin.w * zoom)}px ${Math.round(skin.h * zoom)}px`,
          backgroundPosition: `${Number(params?.ox) || 0}px ${Number(params?.oy) || 0}px`,
          backgroundRepeat: 'repeat',
        };
      }
      return skinBackground(skin?.presetId ?? 'starry', params);
    }

    function skinOverlays(skin) {
      if (skin && skin.kind === 'custom') return { twinkle: false, scanlines: false, hud: true, vignette: true };
      const preset = SKIN_PRESETS.find((entry) => entry.id === (skin?.presetId ?? 'starry')) ?? SKIN_PRESETS[0];
      return preset.overlays;
    }

    /** Read a user image, downscale it and return a storable skin entry. */
    function readImageAsSkin(file) {
      return new Promise((resolve, reject) => {
        if (typeof FileReader === 'undefined' || typeof document === 'undefined') {
          reject(new Error('当前环境不支持上传'));
          return;
        }
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.onload = () => {
          const image = new Image();
          image.onerror = () => reject(new Error('图片解析失败'));
          image.onload = () => {
            const scale = Math.min(1, 1600 / Math.max(image.width, 1));
            const width = Math.max(32, Math.round(image.width * scale));
            const height = Math.max(32, Math.round(image.height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext ? canvas.getContext('2d') : null;
            if (!context) {
              reject(new Error('当前环境不支持图片处理'));
              return;
            }
            context.drawImage(image, 0, 0, width, height);
            resolve({ kind: 'custom', src: canvas.toDataURL('image/jpeg', 0.82), w: width, h: height });
          };
          image.src = String(reader.result);
        };
        reader.readAsDataURL(file);
      });
    }
    // #endregion skins

    /* ------------------------------------------------------------------ *
     * canvas decorations (independent overlay layer, combinable with skins)
     * ------------------------------------------------------------------ */
    // #region decor
    const DECOR_KEY = 'dsic.decor.v1';
    const DECOR_PRESETS = [
      { id: 'whale', glyph: '🐋', labelKey: 'decorWhale' },
      { id: 'rainbowcat', glyph: '🌈', labelKey: 'decorRainbowCat' },
      { id: 'aurora', glyph: '🌌', labelKey: 'decorAurora' },
      { id: 'steinsgate', glyph: '📟', labelKey: 'decorSteinsGate' },
    ];
    const DECOR_IDS = DECOR_PRESETS.map((preset) => preset.id);
    const DECOR_CANVAS_IDS = ['whale', 'rainbowcat', 'aurora'];

    function normalizeDecor(value) {
      const list = Array.isArray(value) ? value : [];
      const unique = [];
      for (const entry of list) {
        const id = String(entry ?? '');
        if (DECOR_IDS.includes(id) && !unique.includes(id)) unique.push(id);
      }
      return unique;
    }

    function loadDecor() {
      try {
        if (typeof localStorage === 'undefined') return [];
        const raw = localStorage.getItem(DECOR_KEY);
        if (!raw) return [];
        return normalizeDecor(JSON.parse(raw));
      } catch (error) {
        return [];
      }
    }

    function persistDecor(decor) {
      try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(DECOR_KEY, JSON.stringify(normalizeDecor(decor)));
      } catch (error) {
        /* storage may be full/disabled: keep the in-memory decorations */
      }
    }

    function decorHasCanvasFx(decor) {
      return normalizeDecor(decor).some((id) => DECOR_CANVAS_IDS.includes(id));
    }

    function decorHas(decor, id) {
      return normalizeDecor(decor).includes(id);
    }
    // #endregion decor

    /* ------------------------------------------------------------------ *
     * animated particle skins (whale / rainbow cat): 0/1 glyph clouds
     * drifting behind the canvas content, with pointer parallax.
     * ------------------------------------------------------------------ */
    // #region skin-fx
    /** Small deterministic PRNG so the creature silhouette is stable per skin. */
    function skinFxRandom(seed) {
      let value = seed >>> 0;
      return () => {
        value = (value + 0x6d2b79f5) >>> 0;
        let t = value;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    /** Whale silhouette sampled into particle points (local units, facing +x). */
    function skinFxWhalePoints(rand) {
      const points = [];
      const palette = ['#7dd3fc', '#38bdf8', '#22d3ee', '#a5f3fc', '#e0f2fe'];
      const push = (x, y, part, depth, forcedPalette) => {
        const char = rand() < 0.19 ? (rand() < 0.5 ? '0' : '1') : '';
        points.push({
          x,
          y,
          part,
          depth,
          char,
          size: 0.8 + rand() * 0.8,
          alpha: 0.32 + rand() * 0.58,
          phase: rand() * Math.PI * 2,
          color: char ? '#bae6fd' : (forcedPalette ?? palette)[Math.floor(rand() * (forcedPalette ?? palette).length)],
          glitch: rand() < 0.5 ? '0' : '1',
          glitchColor: DECOR_GLITCH_COLORS[Math.floor(rand() * DECOR_GLITCH_COLORS.length)],
          block: rand() < 0.26,
          threshold: rand(),
        });
        return points[points.length - 1];
      };
      // bright silhouette edge so the whale shape reads instantly
      const outline = (x, y, part, depth) => {
        const point = push(x, y, part, depth);
        point.alpha = 0.55 + rand() * 0.4;
        point.size = 0.9 + rand() * 0.5;
        return point;
      };
      const bodyAt = (angle, radius) => {
        const taper = 1 - 0.16 * (0.5 - Math.sin(angle) * 0.5);
        return { x: Math.cos(angle) * radius * 1.02, y: Math.sin(angle) * radius * 0.46 * taper };
      };
      // body outline
      for (let index = 0; index < 220; index += 1) {
        const point = bodyAt((index / 220) * Math.PI * 2, 1);
        outline(point.x, point.y, 'body', 0.4 + rand() * 0.6);
      }
      // plump body interior
      for (let index = 0; index < 220; index += 1) {
        const angle = rand() * Math.PI * 2;
        const radius = Math.sqrt(rand()) * 0.92;
        const point = bodyAt(angle, radius);
        push(point.x, point.y, 'body', 0.3 + rand() * 0.5);
      }
      // short tail stock linking the body to the flukes
      for (let index = 0; index < 26; index += 1) {
        const t = index / 25;
        outline(-0.98 - t * 0.2, (rand() - 0.5) * 0.1 * (0.4 + t), 'body', 0.4 + rand() * 0.3);
      }
      // tail flukes: two curved lobes behind the body
      for (const side of [-1, 1]) {
        for (let index = 0; index < 90; index += 1) {
          const t = index / 89;
          const spread = Math.sin(t * Math.PI * 0.92);
          outline(-1.12 - 0.5 * t, side * spread * 0.44 + (rand() - 0.5) * 0.055 + side * 0.02, 'tail', 0.4 + rand() * 0.4);
        }
      }
      // pectoral fin
      for (let index = 0; index < 40; index += 1) {
        const angle = rand() * Math.PI * 2;
        const radius = Math.sqrt(rand());
        push(0.12 + Math.cos(angle) * radius * 0.36, 0.3 + Math.sin(angle) * radius * 0.16, 'fin', 0.7 + rand() * 0.3);
      }
      // dorsal fin bump
      for (let index = 0; index < 26; index += 1) {
        const point = push(-0.2 + (rand() - 0.5) * 0.3, -0.42 - rand() * 0.2, 'fin', 0.55 + rand() * 0.25);
        point.alpha = 0.5 + rand() * 0.4;
      }
      // eye cluster + spout droplets
      for (let index = 0; index < 10; index += 1) {
        const eye = push(0.56 + (rand() - 0.5) * 0.06, -0.14 + (rand() - 0.5) * 0.06, 'eye', 1, ['#e0f2fe']);
        eye.size = 2.1;
      }
      for (let index = 0; index < 12; index += 1) {
        push(0.4 + rand() * 0.1, -0.6 - rand() * 0.55, 'spout', 0.2 + rand() * 0.4, ['#67e8f9']);
      }
      return points;
    }

    /** Sitting rainbow cat silhouette sampled into particle points (facing viewer). */
    function skinFxCatPoints(rand) {
      const points = [];
      const push = (x, y, part, depth) => {
        const char = rand() < 0.2 ? (rand() < 0.5 ? '0' : '1') : '';
        points.push({
          x,
          y,
          part,
          depth,
          char,
          hue: (x * 62 + y * 44 + rand() * 90 + 360) % 360,
          size: 0.8 + rand() * 0.8,
          alpha: 0.38 + rand() * 0.56,
          phase: rand() * Math.PI * 2,
          glitch: rand() < 0.5 ? '0' : '1',
          glitchColor: DECOR_GLITCH_COLORS[Math.floor(rand() * DECOR_GLITCH_COLORS.length)],
          block: rand() < 0.26,
          threshold: rand(),
        });
        return points[points.length - 1];
      };
      const outline = (x, y, part, depth) => {
        const point = push(x, y, part, depth);
        point.alpha = 0.55 + rand() * 0.4;
        point.size = 0.9 + rand() * 0.5;
        return point;
      };
      const headAt = (angle, radius) => ({ x: Math.cos(angle) * radius * 0.42, y: -0.5 + Math.sin(angle) * radius * 0.4 });
      // head outline + interior
      for (let index = 0; index < 180; index += 1) {
        const point = headAt((index / 180) * Math.PI * 2, 1);
        outline(point.x, point.y, 'head', 0.6 + rand() * 0.4);
      }
      for (let index = 0; index < 110; index += 1) {
        const point = headAt(rand() * Math.PI * 2, Math.sqrt(rand()) * 0.92);
        push(point.x, point.y, 'head', 0.55 + rand() * 0.35);
      }
      // ears: two filled triangles with outlined edges
      for (const side of [-1, 1]) {
        const a = { x: 0.06 * side, y: -0.8 };
        const b = { x: 0.4 * side, y: -1.1 };
        const c = { x: 0.38 * side, y: -0.6 };
        const edges = [[a, b], [b, c], [c, a]];
        for (const [from, to] of edges) {
          for (let index = 0; index < 26; index += 1) {
            const t = index / 25;
            outline(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, 'ear', 0.5 + rand() * 0.4);
          }
        }
        for (let index = 0; index < 34; index += 1) {
          let u = rand();
          let v = rand();
          if (u + v > 1) {
            u = 1 - u;
            v = 1 - v;
          }
          push(a.x + (b.x - a.x) * u + (c.x - a.x) * v, a.y + (b.y - a.y) * u + (c.y - a.y) * v, 'ear', 0.5 + rand() * 0.4);
        }
      }
      const bodyAt = (angle, radius) => {
        const wide = 0.46 + 0.06 * Math.sin(angle * 0.5);
        return { x: Math.cos(angle) * radius * wide, y: 0.24 + Math.sin(angle) * radius * 0.56 };
      };
      // body outline + interior
      for (let index = 0; index < 200; index += 1) {
        const point = bodyAt((index / 200) * Math.PI * 2, 1);
        outline(point.x, point.y, 'body', 0.35 + rand() * 0.45);
      }
      for (let index = 0; index < 150; index += 1) {
        const point = bodyAt(rand() * Math.PI * 2, Math.sqrt(rand()) * 0.92);
        push(point.x, point.y, 'body', 0.3 + rand() * 0.45);
      }
      // tail curling around the right side
      for (let index = 0; index < 120; index += 1) {
        const t = index / 119;
        const bx = 0.36 + Math.sin(t * Math.PI) * 0.62;
        const by = 0.52 + t * 0.34 - Math.sin(t * Math.PI * 0.5) * 0.76;
        outline(bx + (rand() - 0.5) * 0.06, by + (rand() - 0.5) * 0.06, 'tail', 0.35 + rand() * 0.4);
      }
      // front paws
      for (const side of [-1, 1]) {
        for (let index = 0; index < 34; index += 1) {
          const angle = (index / 34) * Math.PI * 2;
          outline(side * 0.26 + Math.cos(angle) * 0.14, 0.74 + Math.sin(angle) * 0.08, 'paw', 0.8 + rand() * 0.2);
        }
        for (let index = 0; index < 16; index += 1) {
          const angle = rand() * Math.PI * 2;
          const radius = Math.sqrt(rand());
          push(side * 0.26 + Math.cos(angle) * radius * 0.12, 0.74 + Math.sin(angle) * radius * 0.06, 'paw', 0.8 + rand() * 0.2);
        }
      }
      // face: bright eyes, nose, whiskers
      for (const side of [-1, 1]) {
        for (let index = 0; index < 9; index += 1) {
          const angle = rand() * Math.PI * 2;
          const radius = Math.sqrt(rand());
          const eye = push(side * 0.15 + Math.cos(angle) * radius * 0.045, -0.52 + Math.sin(angle) * radius * 0.045, 'eye', 1);
          eye.size = 1.6;
        }
      }
      for (let index = 0; index < 4; index += 1) {
        const nose = push((rand() - 0.5) * 0.05, -0.4 + (rand() - 0.5) * 0.04, 'nose', 1);
        nose.size = 1.5;
      }
      for (const side of [-1, 1]) {
        for (let line = 0; line < 3; line += 1) {
          const endY = -0.44 + line * 0.06;
          for (let index = 0; index < 10; index += 1) {
            const t = index / 9;
            const whisker = push(side * (0.16 + 0.26 * t), -0.4 + (endY + 0.4) * t, 'whisker', 0.9);
            whisker.size = 0.5;
          }
        }
      }
      return points;
    }

    /** Binary glitch palette used when the pointer touches a decoration. */
    const DECOR_GLITCH_COLORS = ['#ff8300', '#308cff', '#46c933', '#2dd4bf', '#f1f5f9'];

    /** Paint one glyph / dot particle (shared by the decoration scenes). */
    function decorPaint(context, px, py, point, color, fontPx, dotPx, time, alphaScale = 1) {
      context.globalAlpha = Math.max(0.06, Math.min(1, point.alpha * (0.74 + 0.2 * Math.sin(time * 1.6 + point.phase)))) * alphaScale;
      context.fillStyle = color;
      if (point.char) {
        context.font = `${fontPx}px ui-monospace, Consolas, monospace`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(point.char, px, py);
        return;
      }
      const size = Math.max(1, dotPx * point.size);
      context.fillRect(px - size / 2, py - size / 2, size, size);
    }

    /** Turn nearby particles into the colourful 0/1 + animated block glitch look. */
    function drawGlitchPoint(context, point, px, py, factor, fontPx, dotPx, alphaScale, time) {
      const strength = Math.min(1, factor * 1.45);
      if (point.block && strength > point.threshold * 0.62) {
        const flicker = Math.sin(time * (16 + point.threshold * 14) + point.phase * 6);
        if (flicker < -0.55) return true;
        const tone = Math.sin(time * 3.4 + point.phase * 7.3);
        const colour = tone > 0.42 ? '#f8fafc' : tone < -0.46 ? '#0b1220' : '#cbd5e1';
        const pulse = 0.55 + 0.45 * Math.sin(time * 6.2 + point.phase * 4.1);
        const size = Math.max(2.4, dotPx * (1.5 + pulse * 1.6));
        const jitterX = Math.sin(time * 9.1 + point.phase * 11.3) * 1.9;
        const jitterY = Math.cos(time * 8.3 + point.phase * 9.7) * 1.9;
        context.globalAlpha = Math.max(0.1, Math.min(1, strength * (0.55 + 0.45 * Math.abs(flicker)))) * alphaScale;
        context.fillStyle = colour;
        context.fillRect(px + jitterX - size / 2, py + jitterY - size / 2, size, size);
        return true;
      }
      if (strength > point.threshold * 0.8) {
        context.globalAlpha = Math.max(0.12, Math.min(1, 0.3 + strength * 0.7)) * alphaScale;
        context.fillStyle = point.glitchColor;
        context.font = `${Math.max(9, Math.round(fontPx * 1.05))}px ui-monospace, Consolas, monospace`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(point.glitch, px, py);
        return true;
      }
      return false;
    }

    /** Whale: washes across the board from left to right (tsunami sweep). */
    function drawWhaleScene(context, points, width, height, time, pointer) {
      const period = 15;
      const sweep = (time % period) / period;
      const edgeFade = Math.max(0, Math.min(1, sweep * 6, (1 - sweep) * 6));
      if (edgeFade <= 0) return;
      const scale = Math.min(width * 0.29, height * 0.45);
      const centerX = -0.35 * width + sweep * 1.7 * width + pointer.x * width * 0.02;
      const centerY = height * (0.42 + Math.sin(sweep * Math.PI * 2) * 0.07) + Math.sin(time * 0.9) * height * 0.02 + pointer.y * height * 0.02;
      const tilt = Math.sin(time * 0.8) * 0.04 + Math.cos(sweep * Math.PI) * 0.06 + pointer.x * 0.04;
      const cos = Math.cos(tilt);
      const sin = Math.sin(tilt);
      const parallaxX = pointer.x * width * 0.05;
      const parallaxY = pointer.y * height * 0.05;
      const tailSway = Math.sin(time * 1.5) * 0.16 + pointer.x * 0.12;
      const tailCos = Math.cos(tailSway);
      const tailSin = Math.sin(tailSway);
      const fontPx = Math.max(8, Math.round(scale * 0.042));
      const dotPx = Math.max(1.2, scale * 0.012);
      context.save();
      context.globalCompositeOperation = 'lighter';
      for (const point of points) {
        let x = point.x;
        let y = point.y;
        if (point.part === 'tail') {
          const baseX = -0.92;
          const dx = x - baseX;
          x = baseX + dx * tailCos - y * tailSin;
          y = dx * tailSin + y * tailCos;
        }
        if (point.part === 'spout') y -= (time * 0.12) % 0.6;
        const depth = point.depth;
        const px = centerX + (x * cos - y * sin) * scale + parallaxX * (depth - 0.45) * 2;
        const py = centerY + (x * sin + y * cos) * scale + parallaxY * (depth - 0.45) * 2;
        if (pointer.inside) {
          const distance = Math.hypot(px - pointer.px, py - pointer.py);
          if (distance < 72) pointer.onCreature = true;
          if (distance < 150 && drawGlitchPoint(context, point, px, py, 1 - distance / 150, fontPx, dotPx, edgeFade, time)) continue;
        }
        const color = point.part === 'body' && point.y > 0.16 ? '#a5f3fc' : point.color;
        decorPaint(context, px, py, point, color, fontPx, dotPx, time, edgeFade);
      }
      context.restore();
    }

    /** Rainbow cat: drifts down through the board from top to bottom. */
    function drawCatScene(context, points, width, height, time, pointer) {
      const period = 17;
      const sweep = (time % period) / period;
      const edgeFade = Math.max(0, Math.min(1, sweep * 6, (1 - sweep) * 6));
      if (edgeFade <= 0) return;
      const scale = Math.min(width * 0.3, height * 0.44);
      const centerX = width * 0.55 + Math.sin(time * 0.7) * width * 0.045 + pointer.x * width * 0.02;
      const centerY = (-0.28 + sweep * 1.56) * height + pointer.y * height * 0.02;
      const parallaxX = pointer.x * width * 0.055;
      const parallaxY = pointer.y * height * 0.055;
      const tailSway = Math.sin(time * 1.15) * 0.16 + pointer.x * 0.14;
      const tailCos = Math.cos(tailSway);
      const tailSin = Math.sin(tailSway);
      const earTwitch = Math.sin(time * 2.3) * 0.05 + Math.sin(time * 5.7) * 0.015;
      const earCos = Math.cos(earTwitch);
      const earSin = Math.sin(earTwitch);
      const fontPx = Math.max(8, Math.round(scale * 0.044));
      const dotPx = Math.max(1.2, scale * 0.013);
      context.save();
      context.globalCompositeOperation = 'lighter';
      for (const point of points) {
        let x = point.x;
        let y = point.y;
        if (point.part === 'tail') {
          const baseX = 0.34;
          const baseY = 0.5;
          const dx = x - baseX;
          const dy = y - baseY;
          x = baseX + dx * tailCos - dy * tailSin;
          y = baseY + dx * tailSin + dy * tailCos;
        } else if (point.part === 'ear') {
          const baseX = point.x >= 0 ? 0.2 : -0.2;
          const baseY = -0.7;
          const dx = x - baseX;
          const dy = y - baseY;
          x = baseX + dx * earCos - dy * earSin;
          y = baseY + dx * earSin + dy * earCos;
        }
        const depth = point.depth;
        const px = centerX + x * scale + parallaxX * (depth - 0.5) * 2;
        const py = centerY + y * scale + parallaxY * (depth - 0.5) * 2;
        if (pointer.inside) {
          const distance = Math.hypot(px - pointer.px, py - pointer.py);
          if (distance < 72) pointer.onCreature = true;
          if (distance < 150 && drawGlitchPoint(context, point, px, py, 1 - distance / 150, fontPx, dotPx, edgeFade, time)) continue;
        }
        const hue = Math.round((point.hue + time * 22) % 360);
        const color = point.part === 'eye' ? '#f0f9ff' : point.part === 'nose' ? '#fda4af' : `hsl(${hue} 94% 68%)`;
        decorPaint(context, px, py, point, color, fontPx, dotPx, time, edgeFade);
      }
      context.restore();
    }

    function drawAuroraScene(context, width, height, time, pointer) {
      const bands = [
        { x: 0.3, y: 0.42, radius: 0.52, hue: 168, alpha: 0.16, speed: 0.22, phase: 0 },
        { x: 0.68, y: 0.34, radius: 0.46, hue: 208, alpha: 0.14, speed: 0.31, phase: 1.7 },
        { x: 0.52, y: 0.74, radius: 0.56, hue: 292, alpha: 0.12, speed: 0.18, phase: 3.4 },
        { x: 0.2, y: 0.74, radius: 0.34, hue: 330, alpha: 0.1, speed: 0.26, phase: 5 },
      ];
      context.save();
      context.globalCompositeOperation = 'lighter';
      for (const band of bands) {
        const cx = width * (band.x + Math.sin(time * band.speed + band.phase) * 0.08 + pointer.x * 0.03);
        const cy = height * (band.y + Math.cos(time * band.speed * 0.8 + band.phase) * 0.06 + pointer.y * 0.03);
        const radius = Math.max(width, height) * band.radius;
        const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, `hsla(${band.hue}, 92%, 62%, ${band.alpha})`);
        gradient.addColorStop(0.55, `hsla(${(band.hue + 28) % 360}, 90%, 56%, ${band.alpha * 0.5})`);
        gradient.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
        context.fillStyle = gradient;
        context.save();
        context.translate(cx, cy);
        context.scale(1, Math.max(0.35, (height * band.radius) / radius));
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
      for (let index = 0; index < 40; index += 1) {
        const drift = time * 0.05 + index * 0.618;
        const x = ((Math.sin(drift) + 1) / 2) * width;
        const y = ((Math.cos(drift * 1.3) + 1) / 2) * height * 0.92 + height * 0.04;
        context.globalAlpha = 0.2 + 0.18 * Math.sin(time * 1.4 + index);
        context.fillStyle = `hsl(${(index * 47 + time * 18) % 360} 92% 70%)`;
        context.fillRect(x, y, 2, 2);
      }
      context.restore();
    }

    /**
     * Decoration canvas behind the canvas content (combines with any skin):
     * aurora / whale / rainbow cat, 0/1 glyph particles with pointer parallax.
     */
    function DecorFx({ ids }) {
      const canvasRef = useRef(null);
      useEffect(() => {
        const canvas = canvasRef.current;
        const active = Array.isArray(ids) ? ids : [];
        if (!canvas || active.length === 0) return undefined;
        if (typeof document === 'undefined' || typeof window === 'undefined') return undefined;
        const context = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
        if (!context) return undefined;

        const wantWhale = active.includes('whale');
        const wantCat = active.includes('rainbowcat');
        const wantAurora = active.includes('aurora');
        if (!wantWhale && !wantCat && !wantAurora) return undefined;

        const reducedQuery = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
        let reduced = Boolean(reducedQuery && reducedQuery.matches);
        const rand = skinFxRandom(wantWhale ? 0x51ed2701 : 0x2f9a3c11);
        const whalePoints = wantWhale ? skinFxWhalePoints(rand) : [];
        const catPoints = wantCat ? skinFxCatPoints(rand) : [];
        const pointer = { x: 0, y: 0, tx: 0, ty: 0, px: -9999, py: -9999, lastX: null, lastY: null, inside: false, onCreature: false };
        const sparks = [];
        const sparkPalette = ['#ff8300', '#308cff', '#46c933', '#2dd4bf', '#f1f5f9'];
        const cursorField = Array.from({ length: 20 }, () => ({
          angle: Math.random() * Math.PI * 2,
          radius: 18 + Math.random() * 58,
          speed: 0.2 + Math.random() * 0.8,
          phase: Math.random() * Math.PI * 2,
          kind: Math.random() < 0.38 ? 'block' : Math.random() < 0.74 ? 'digit' : 'line',
          char: Math.random() < 0.5 ? '0' : '1',
          color: sparkPalette[Math.floor(Math.random() * sparkPalette.length)],
          size: 0.7 + Math.random() * 0.9,
        }));
        let cursorAlpha = 0;
        let width = 0;
        let height = 0;
        let dpr = 1;
        let raf = 0;
        let last = 0;
        let time = 0;
        let disposed = false;

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const resize = () => {
          const parent = canvas.parentElement;
          const rect = parent && typeof parent.getBoundingClientRect === 'function' ? parent.getBoundingClientRect() : null;
          width = Math.max(1, Math.round((rect && rect.width) || canvas.clientWidth || 960));
          height = Math.max(1, Math.round((rect && rect.height) || canvas.clientHeight || 640));
          dpr = clamp(Number(window.devicePixelRatio) || 1, 1, 2);
          canvas.width = Math.max(1, Math.round(width * dpr));
          canvas.height = Math.max(1, Math.round(height * dpr));
          context.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const spawnSparks = (x, y, speed) => {
          const count = Math.min(3, 1 + Math.floor(speed / 36));
          for (let index = 0; index < count; index += 1) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 6 + Math.random() * 46;
            const kindRoll = Math.random();
            sparks.push({
              x: x + Math.cos(angle) * radius * 0.5,
              y: y + Math.sin(angle) * radius * 0.5,
              vx: Math.cos(angle) * (9 + Math.random() * 42),
              vy: Math.sin(angle) * (9 + Math.random() * 42),
              angle,
              length: 8 + Math.random() * 18,
              life: 0.5 + Math.random() * 0.65,
              maxLife: 1.15,
              kind: kindRoll < 0.46 ? 'line' : kindRoll < 0.72 ? 'block' : 'digit',
              char: Math.random() < 0.5 ? '0' : '1',
              color: sparkPalette[Math.floor(Math.random() * sparkPalette.length)],
            });
          }
          while (sparks.length > 160) sparks.shift();
        };

        const updateSparks = (delta) => {
          if (!pointer.onCreature) {
            sparks.length = 0;
            return;
          }
          for (const spark of sparks) {
            spark.x += spark.vx * delta;
            spark.y += spark.vy * delta;
            spark.vx *= 0.96;
            spark.vy *= 0.96;
            spark.life -= delta;
          }
          for (let index = sparks.length - 1; index >= 0; index -= 1) {
            if (sparks[index].life <= 0) sparks.splice(index, 1);
          }
        };

        const drawSparks = () => {
          if (!pointer.onCreature || sparks.length === 0) return;
          context.save();
          context.globalCompositeOperation = 'lighter';
          for (const spark of sparks) {
            const life = Math.max(0, spark.life / spark.maxLife);
            if (life <= 0) continue;
            context.globalAlpha = Math.min(1, life * 0.95);
            context.strokeStyle = spark.color;
            context.fillStyle = spark.color;
            if (spark.kind === 'line') {
              context.save();
              context.translate(spark.x, spark.y);
              context.rotate(spark.angle);
              context.lineWidth = 1.4;
              context.beginPath();
              context.moveTo(-spark.length / 2, 0);
              context.lineTo(spark.length / 2, 0);
              context.stroke();
              context.restore();
            } else if (spark.kind === 'block') {
              context.fillRect(spark.x - 3, spark.y - 3, 6, 6);
            } else {
              context.font = '11px ui-monospace, Consolas, monospace';
              context.textAlign = 'center';
              context.textBaseline = 'middle';
              context.fillText(spark.char, spark.x, spark.y);
            }
          }
          context.restore();
        };

        const drawCursorField = () => {
          if (cursorAlpha <= 0.02 || !pointer.inside || !pointer.onCreature) return;
          context.save();
          context.globalCompositeOperation = 'lighter';
          for (const particle of cursorField) {
            const angle = particle.angle + time * particle.speed + Math.sin(time * 0.9 + particle.phase) * 0.4;
            const radius = particle.radius + Math.sin(time * 1.4 + particle.phase * 2) * 7;
            const x = pointer.px + Math.cos(angle) * radius;
            const y = pointer.py + Math.sin(angle) * radius * 0.72;
            const pulse = 0.35 + 0.4 * Math.sin(time * 2.1 + particle.phase);
            context.globalAlpha = Math.min(1, cursorAlpha * (0.25 + pulse));
            context.fillStyle = particle.color;
            context.strokeStyle = particle.color;
            if (particle.kind === 'block') {
              const flicker = Math.sin(time * 13.7 + particle.phase * 8.3);
              if (flicker < -0.4) continue;
              const tone = Math.sin(time * 3.9 + particle.phase * 5.7);
              context.fillStyle = tone > 0.3 ? '#f8fafc' : tone < -0.38 ? '#0b1220' : '#cbd5e1';
              const size = (3 + particle.size * 3) * (0.65 + 0.55 * Math.abs(flicker));
              const jitterX = Math.sin(time * 8.9 + particle.phase * 7) * 1.6;
              const jitterY = Math.cos(time * 7.7 + particle.phase * 9) * 1.6;
              context.fillRect(x + jitterX - size / 2, y + jitterY - size / 2, size, size);
            } else if (particle.kind === 'line') {
              context.save();
              context.translate(x, y);
              context.rotate(particle.angle + time * 0.4);
              context.lineWidth = 1.3;
              context.beginPath();
              context.moveTo(-7 - particle.size * 4, 0);
              context.lineTo(7 + particle.size * 4, 0);
              context.stroke();
              context.restore();
            } else {
              context.font = `${Math.round(9 + particle.size * 4)}px ui-monospace, Consolas, monospace`;
              context.textAlign = 'center';
              context.textBaseline = 'middle';
              context.fillText(particle.char, x, y);
            }
          }
          context.restore();
        };

        const noiseBlocks = Array.from({ length: 28 }, () => ({
          phase: Math.random() * Math.PI * 2,
          radius: 26 + Math.random() * 96,
          speed: 0.3 + Math.random() * 1.2,
          size: 2.5 + Math.random() * 5.5,
          orbit: Math.random() * Math.PI * 2,
        }));

        const drawBlockNoise = () => {
          if (cursorAlpha <= 0.02 || !pointer.inside || !pointer.onCreature) return;
          context.save();
          context.globalCompositeOperation = 'source-over';
          for (const block of noiseBlocks) {
            const step = Math.floor(time * 9 + block.phase * 6.7);
            const hash = Math.sin(step * 12.9898 + block.phase * 78.233) * 43758.5453;
            const frac = hash - Math.floor(hash);
            if (frac < 0.24) continue;
            const angle = block.orbit + time * block.speed + frac * Math.PI * 2;
            const radius = block.radius * (0.55 + frac * 0.65);
            const x = pointer.px + Math.cos(angle) * radius;
            const y = pointer.py + Math.sin(angle) * radius * 0.72;
            const toneRoll = (hash * 7.13) % 1;
            const size = block.size * (0.6 + frac * 1.1);
            context.globalAlpha = cursorAlpha * (0.3 + frac * 0.65);
            context.fillStyle =
              toneRoll < 0.46 ? '#f8fafc' : toneRoll < 0.68 ? '#cbd5e1' : toneRoll < 0.84 ? '#64748b' : '#020617';
            context.fillRect(x - size / 2, y - size / 2, size, size);
          }
          context.restore();
        };

        const draw = () => {
          context.clearRect(0, 0, width, height);
          pointer.onCreature = false;
          if (wantAurora) drawAuroraScene(context, width, height, time, pointer);
          if (wantWhale) drawWhaleScene(context, whalePoints, width, height, time, pointer);
          if (wantCat) drawCatScene(context, catPoints, width, height, time, pointer);
          cursorAlpha += (((pointer.inside && pointer.onCreature && !reduced) ? 1 : 0) - cursorAlpha) * 0.18;
          drawCursorField();
          drawBlockNoise();
          drawSparks();
        };

        const frame = (now) => {
          if (disposed) return;
          raf = window.requestAnimationFrame(frame);
          if (document.hidden) return;
          const delta = last > 0 ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
          last = now;
          time += delta;
          pointer.x += (pointer.tx - pointer.x) * 0.07;
          pointer.y += (pointer.ty - pointer.y) * 0.07;
          updateSparks(delta);
          draw();
        };

        const start = () => {
          if (raf || disposed || reduced) return;
          last = 0;
          raf = window.requestAnimationFrame(frame);
        };

        const onPointerMove = (event) => {
          const rect = canvas.getBoundingClientRect();
          if (!rect || rect.width < 1 || rect.height < 1) return;
          const localX = event.clientX - rect.left;
          const localY = event.clientY - rect.top;
          pointer.inside = true;
          pointer.px = localX;
          pointer.py = localY;
          pointer.tx = clamp((localX / rect.width) * 2 - 1, -1, 1);
          pointer.ty = clamp((localY / rect.height) * 2 - 1, -1, 1);
          if (!reduced && pointer.onCreature && pointer.lastX !== null) {
            const speed = Math.hypot(localX - pointer.lastX, localY - pointer.lastY);
            if (speed > 3) spawnSparks(localX, localY, speed);
          }
          pointer.lastX = localX;
          pointer.lastY = localY;
        };
        const onPointerLeave = () => {
          pointer.inside = false;
          pointer.px = -9999;
          pointer.py = -9999;
          pointer.lastX = null;
          pointer.lastY = null;
          pointer.tx = 0;
          pointer.ty = 0;
        };
        const onResize = () => {
          resize();
          if (reduced) draw();
        };
        const onMotionChange = () => {
          reduced = Boolean(reducedQuery && reducedQuery.matches);
          if (reduced) {
            sparks.length = 0;
            if (raf) {
              window.cancelAnimationFrame(raf);
              raf = 0;
            }
            draw();
          } else {
            start();
          }
        };

        resize();
        window.addEventListener('pointermove', onPointerMove, { passive: true });
        window.addEventListener('pointerleave', onPointerLeave);
        const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(onResize) : null;
        if (observer && canvas.parentElement) observer.observe(canvas.parentElement);
        else window.addEventListener('resize', onResize);
        if (reducedQuery) {
          if (typeof reducedQuery.addEventListener === 'function') reducedQuery.addEventListener('change', onMotionChange);
          else if (typeof reducedQuery.addListener === 'function') reducedQuery.addListener(onMotionChange);
        }
        if (reduced) draw();
        else start();

        return () => {
          disposed = true;
          if (raf) window.cancelAnimationFrame(raf);
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerleave', onPointerLeave);
          if (observer) observer.disconnect();
          else window.removeEventListener('resize', onResize);
          if (reducedQuery) {
            if (typeof reducedQuery.removeEventListener === 'function') reducedQuery.removeEventListener('change', onMotionChange);
            else if (typeof reducedQuery.removeListener === 'function') reducedQuery.removeListener(onMotionChange);
          }
        };
      }, [ids]);
      return h('canvas', {
        ref: canvasRef,
        className: 'dsic-decorfx',
        'data-decor': Array.isArray(ids) ? ids.join('+') : '',
        'aria-hidden': 'true',
      });
    }

    /** Steins;Gate decoration: CRT world-line divergence meter, always above content. */
    function SteinsGateDecor({ divergence, rolling }) {
      return h(
        'div',
        { className: 'dsic-decor-sg', 'aria-hidden': 'true' },
        h('div', { className: 'dsic-decor-sg-head' }, 'WORLD LINE'),
        h(
          'div',
          { className: 'dsic-decor-sg-nixie', 'data-rolling': rolling ? 'true' : undefined },
          Array.from(divergence).map((char, index) =>
            char === '.'
              ? h('span', { key: `sg-${index}`, className: 'dsic-decor-sg-cell dsic-decor-sg-dot' }, '.')
              : h('span', { key: `sg-${index}`, className: 'dsic-decor-sg-cell' }, char),
          ),
        ),
        h('div', { className: 'dsic-decor-sg-caption' }, '世界线变动率'),
        h(
          'div',
          { className: 'dsic-decor-sg-tags' },
          h('span', null, 'EL PSY KONGROO'),
          h('span', null, 'SYNC · OK'),
        ),
      );
    }

    // #endregion skin-fx

    /* ------------------------------------------------------------------ *
     * prompt library (browser storage; independent from the canvas document)
     * ------------------------------------------------------------------ */
    // #region prompt-library
    const PROMPTS_KEY = 'dsic.prompts.v1';
    const PROMPT_LIMIT = 50;

    function normalizePromptEntry(entry) {
      if (!entry || typeof entry !== 'object') return null;
      const id = String(entry.id ?? '').slice(0, 60);
      const body = String(entry.body ?? '').slice(0, 20000);
      if (id === '' || body.trim() === '') return null;
      const name = String(entry.name ?? '').slice(0, 60).trim();
      return { id, name: name === '' ? '未命名提示词' : name, body, at: Number(entry.at) || Date.now() };
    }

    function loadPrompts() {
      try {
        if (typeof localStorage === 'undefined') return [];
        const raw = localStorage.getItem(PROMPTS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.map(normalizePromptEntry).filter(Boolean).slice(-PROMPT_LIMIT);
      } catch (error) {
        return [];
      }
    }

    function persistPrompts(list) {
      try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(PROMPTS_KEY, JSON.stringify(list.slice(-PROMPT_LIMIT)));
      } catch (error) {
        /* storage disabled: keep the in-memory list for this session */
      }
    }

    function newPromptId() {
      return `p_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    }

    function promptExamples(t) {
      return [
        { name: t('promptExampleInterviewName'), body: t('promptExampleInterview') },
        { name: t('promptExampleCompeteName'), body: t('promptExampleCompete') },
        { name: t('promptExampleMinutesName'), body: t('promptExampleMinutes') },
        { name: t('promptExampleRewriteName'), body: t('promptExampleRewrite') },
      ];
    }
    // #endregion prompt-library

    /* ------------------------------------------------------------------ *
     * canvas AI model choice (browser storage; sent with each generation)
     * ------------------------------------------------------------------ */
    const MODEL_KEY = 'dsic.model.v1';

    function normalizeModelChoice(value) {
      if (!value || typeof value !== 'object') return null;
      if (value.source === 'custom') {
        const providerId = String(value.providerId ?? '').trim().slice(0, 80);
        const model = String(value.model ?? '').trim().slice(0, 200);
        if (providerId === '' || model === '') return null;
        const providerName = String(value.providerName ?? '').trim().slice(0, 80);
        return { source: 'custom', providerId, model, ...(providerName === '' ? {} : { providerName }) };
      }
      const provider = String(value.provider ?? '').trim().slice(0, 120);
      const model = String(value.model ?? '').trim().slice(0, 200);
      if (provider === '' || model === '') return null;
      const reasoningEffort = String(value.reasoningEffort ?? value.reasoning ?? '').trim().slice(0, 80);
      return { provider, model, ...(reasoningEffort === '' ? {} : { reasoningEffort }) };
    }

    function loadModelChoice() {
      try {
        if (typeof localStorage === 'undefined') return null;
        const raw = localStorage.getItem(MODEL_KEY);
        if (!raw) return null;
        return normalizeModelChoice(JSON.parse(raw));
      } catch (error) {
        return null;
      }
    }

    function persistModelChoice(choice) {
      try {
        if (typeof localStorage === 'undefined') return;
        if (choice) localStorage.setItem(MODEL_KEY, JSON.stringify(choice));
        else localStorage.removeItem(MODEL_KEY);
      } catch (error) {
        /* storage disabled: keep the in-memory choice for this session */
      }
    }

    /* Frame drag behaviour: by default dragging a frame drags everything inside it
     * (the classic mouse workflow); the toggle or Alt can change that per gesture. */
    const FRAME_CARRY_KEY = 'dsic.frameCarry.v1';

    function loadFrameCarry() {
      try {
        if (typeof localStorage === 'undefined') return true;
        const raw = localStorage.getItem(FRAME_CARRY_KEY);
        // Default ON: "drag the frame = drag the whole block". The toggle turns it
        // off, and Alt temporarily forces it back on while dragging.
        return raw === null ? true : raw !== '0';
      } catch (error) {
        return true;
      }
    }

    function persistFrameCarry(value) {
      try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(FRAME_CARRY_KEY, value ? '1' : '0');
      } catch (error) {
        /* storage disabled: keep the in-memory value for this session */
      }
    }

    /* Minimap visibility is a per-machine preference ("1" shown / "0" collapsed). */
    const MINIMAP_KEY = 'dsic.minimap.v1';
    const MINIMAP_W = 212;
    const MINIMAP_H = 132;

    function loadMinimapOpen() {
      try {
        if (typeof localStorage === 'undefined') return true;
        return localStorage.getItem(MINIMAP_KEY) !== '0';
      } catch (error) {
        return true;
      }
    }

    function persistMinimapOpen(value) {
      try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(MINIMAP_KEY, value ? '1' : '0');
      } catch (error) {
        /* storage disabled: keep the in-memory value for this session */
      }
    }

    /** Persist the UI language override and notify every mounted panel. */
    function applyLangPref(value) {
      const next = value === 'en' ? 'en' : 'zh';
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem('dsic.lang.v1', next);
      } catch (error) {
        /* storage disabled: in-memory only */
      }
      try {
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new Event('dsic:lang'));
        }
      } catch (error) {
        /* best effort */
      }
      return next;
    }

    /* Left sidebar (Obsidian-style vault / tags / search). */
    const SIDEBAR_KEY = 'dsic.sidebar.v1';
    const VAULT_KEY = 'dsic.vault.v1';

    function loadSidebarOpen() {
      try {
        if (typeof localStorage === 'undefined') return true;
        return localStorage.getItem(SIDEBAR_KEY) !== '0';
      } catch (error) {
        return true;
      }
    }

    function persistSidebarOpen(value) {
      try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(SIDEBAR_KEY, value ? '1' : '0');
      } catch (error) {
        /* storage disabled */
      }
    }

    function loadVaultPath() {
      try {
        if (typeof localStorage === 'undefined') return '';
        return localStorage.getItem(VAULT_KEY) ?? '';
      } catch (error) {
        return '';
      }
    }

    function persistVaultPath(value) {
      try {
        if (typeof localStorage === 'undefined') return;
        const text = String(value ?? '').trim();
        if (text === '') localStorage.removeItem(VAULT_KEY);
        else localStorage.setItem(VAULT_KEY, text);
      } catch (error) {
        /* storage disabled */
      }
    }

    /** Saved prompt library dialog: list + inline editor. */
    function PromptDialog({ t, mode, prompts, onSave, onDelete, onPick, onGenerate, onCancel }) {
      const first = prompts.length > 0 ? prompts[prompts.length - 1] : null;
      const [selectedId, setSelectedId] = useState(first ? first.id : null);
      const [draftName, setDraftName] = useState(first ? first.name : '');
      const [draftBody, setDraftBody] = useState(first ? first.body : '');
      const [fresh, setFresh] = useState(first === null);
      const [query, setQuery] = useState('');

      const selectPrompt = (entry) => {
        setSelectedId(entry.id);
        setDraftName(entry.name);
        setDraftBody(entry.body);
        setFresh(false);
      };

      const startNew = () => {
        setSelectedId(null);
        setDraftName('');
        setDraftBody('');
        setFresh(true);
      };

      const saveDraft = () => {
        const body = String(draftBody).trim();
        if (body === '') return;
        onSave({ id: fresh || selectedId === null ? newPromptId() : selectedId, name: String(draftName).trim(), body });
        setFresh(false);
      };

      const visible = prompts.filter((entry) => {
        const needle = query.trim().toLowerCase();
        if (needle === '') return true;
        return `${entry.name}\n${entry.body}`.toLowerCase().includes(needle);
      });

      const canPick = String(draftBody).trim() !== '' || selectedId !== null || fresh;

      return h(
        'div',
        {
          className: 'dsic-dialog',
          onPointerDown: (event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) onCancel();
          },
          onClick: (event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) onCancel();
          },
          onDoubleClick: (event) => event.stopPropagation(),
        },
        h(
          'div',
          { className: 'dsic-dialog-card dsic-prompt-card', role: 'dialog', 'aria-label': t('promptLibTitle') },
          h(
            'div',
            { className: 'dsic-ai-head' },
            h(Icon, { name: 'book', size: 18 }),
            h('div', { className: 'dsic-dialog-title' }, t('promptLibTitle')),
          ),
          h('p', { className: 'dsic-ai-hint' }, t('promptLibHint')),
          h(
            'div',
            { className: 'dsic-prompt-body' },
            h(
              'div',
              { className: 'dsic-prompt-list' },
              h('input', {
                className: 'dsic-input dsic-prompt-search',
                value: query,
                placeholder: t('promptSearchPlaceholder'),
                onChange: (event) => setQuery(event.target.value),
                onKeyDown: (event) => event.stopPropagation(),
              }),
              h(
                'button',
                { type: 'button', className: 'dsic-prompt-new', onClick: startNew },
                `＋ ${t('promptNew')}`,
              ),
              h(
                'div',
                { className: 'dsic-prompt-items', 'data-scroll': 'true' },
                prompts.length === 0
                  ? h('div', { className: 'dsic-prompt-empty' }, t('promptEmpty'))
                  : visible.length === 0
                    ? h('div', { className: 'dsic-prompt-empty' }, t('promptNoMatch'))
                    : visible.map((entry) =>
                        h(
                          'button',
                          {
                            key: entry.id,
                            type: 'button',
                            className: 'dsic-prompt-item',
                            'data-active': entry.id === selectedId ? 'true' : undefined,
                            onClick: () => selectPrompt(entry),
                          },
                          h('span', { className: 'dsic-prompt-item-name' }, entry.name),
                          h('span', { className: 'dsic-prompt-item-preview' }, String(entry.body).slice(0, 60)),
                        ),
                      ),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsic-prompt-examples',
                  onClick: () => promptExamples(t).forEach((entry) => onSave({ ...entry, id: newPromptId() })),
                },
                `✨ ${t('promptInsertExample')}`,
              ),
            ),
            h(
              'div',
              { className: 'dsic-prompt-editor' },
              h('label', { className: 'dsic-field-label' }, t('promptNameLabel')),
              h('input', {
                className: 'dsic-input',
                value: draftName,
                placeholder: t('promptNamePlaceholder'),
                onChange: (event) => setDraftName(event.target.value),
                onKeyDown: (event) => event.stopPropagation(),
              }),
              h('label', { className: 'dsic-field-label dsic-field-label-gap' }, t('promptBodyLabel')),
              h('textarea', {
                className: 'dsic-prompt-input',
                value: draftBody,
                placeholder: t('promptBodyPlaceholder'),
                spellCheck: false,
                onChange: (event) => setDraftBody(event.target.value),
                onKeyDown: (event) => {
                  event.stopPropagation();
                  if (event.key === 'Escape') onCancel();
                  else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) saveDraft();
                },
              }),
              h(
                'div',
                { className: 'dsic-prompt-editor-actions' },
                h(
                  'button',
                  { type: 'button', className: 'dsic-ghost', onClick: saveDraft, disabled: String(draftBody).trim() === '' },
                  t('promptSave'),
                ),
                selectedId
                  ? h(
                      'button',
                      {
                        type: 'button',
                        className: 'dsic-ghost dsic-danger',
                        onClick: () => {
                          if (typeof window !== 'undefined' && typeof window.confirm === 'function' && !window.confirm(t('promptDeleteConfirm'))) return;
                          onDelete(selectedId);
                          startNew();
                        },
                      },
                      t('promptDelete'),
                    )
                  : null,
                selectedId
                  ? h(
                      'button',
                      {
                        type: 'button',
                        className: 'dsic-ghost',
                        onClick: () => {
                          if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(draftBody).catch(() => {});
                        },
                      },
                      t('promptCopy'),
                    )
                  : null,
              ),
            ),
          ),
          h(
            'div',
            { className: 'dsic-dialog-actions' },
            h('button', { type: 'button', className: 'dsic-ghost', onClick: onCancel }, t('cancel')),
            mode !== 'agent' && mode !== 'role'
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsic-ghost dsic-prompt-generate',
                    disabled: String(draftBody).trim() === '',
                    title: t('promptGenerateHint'),
                    onClick: () => {
                      const body = String(draftBody).trim();
                      if (body === '') return;
                      onSave({ id: selectedId ?? newPromptId(), name: String(draftName).trim(), body });
                      onGenerate(body);
                    },
                  },
                  `✨ ${t('promptGenerate')}`,
                )
              : null,
            h(
              'button',
              {
                type: 'button',
                className: 'dsic-primary',
                disabled: !canPick,
                onClick: () => {
                  const body = String(draftBody).trim();
                  if (body !== '') onSave({ id: selectedId ?? newPromptId(), name: String(draftName).trim(), body });
                  if (body !== '') onPick(body);
                },
              },
              mode === 'agent'
                ? t('promptPickAgent')
                : mode === 'role'
                  ? t('promptPickRole')
                  : t('promptToCanvas'),
            ),
          ),
        ),
      );
    }

    /** #RRGGBB 到 rgba(...) for derived accent tints. */
    function withAlpha(hex, alpha) {
      const match = /^#([0-9a-f]{6})$/i.exec(String(hex ?? ''));
      if (!match) return hex;
      const value = parseInt(match[1], 16);
      const r = (value >> 16) & 255;
      const g = (value >> 8) & 255;
      const b = value & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function NodeView(props) {
      const { item, rect, selected, flashing, editing, dropTarget, dimmed, t } = props;
      const palette = NOTE_COLORS[item.color] ?? NOTE_COLORS.yellow;

      const baseStyle = {
        left: rect.x,
        top: rect.y,
        width: rect.w,
        // Fixed geometry: the card always renders exactly the stored w/h, so the
        // selection frame, "+" bubbles and connector anchors can never disagree.
        height: rect.h,
        opacity: dimmed ? 0.22 : undefined,
        filter: dimmed ? 'saturate(0.4)' : undefined,
        transition: 'opacity .15s ease',
        // Inline z-index must beat the neighbours; a selected node rises above everything
        // so its selection frame can never appear detached behind another card.
        zIndex: selected ? 99999 : (item.z ?? 0) + 10,
        '--dsic-zoom': Number(props.zoom) > 0 ? Number(props.zoom) : 1,
      };
      const shared = {
        className: 'dsic-node',
        'data-node-id': item.id,
        'data-selected': selected ? 'true' : undefined,
        'data-flash': flashing ? 'true' : undefined,
        'data-editing': editing ? 'true' : undefined,
        'data-drop': dropTarget ? 'true' : undefined,
        style: baseStyle,
      };
      const textNode = h(NodeText, { item, t });
      // Text-bearing cards scale their type with the card box (see contentScaleOf).
      const textScale = contentScaleOf(item, rect);
      // Quick-add bubbles live INSIDE the node element (scale-corrected), so they can
      // never drift away from the card the way screen-space overlays could.
      const zoomNow = Number(props.zoom) > 0 ? Number(props.zoom) : 1;
      const bubbleSize = 26 / zoomNow;
      const bubbleGap = 14 / zoomNow;
      const bubbleIcon = 14 / zoomNow;
      const bubbleBorder = Math.max(1, 1.2 / zoomNow);
      const plusBubbles =
        selected && !editing && item.type !== 'edge'
          ? ['right', 'left', 'top', 'bottom'].map((side) => {
              const place =
                side === 'right'
                  ? { left: '100%', top: '50%', transform: `translate(${bubbleGap}px, -50%)` }
                  : side === 'left'
                    ? { right: '100%', top: '50%', transform: `translate(-${bubbleGap}px, -50%)` }
                    : side === 'top'
                      ? { left: '50%', bottom: '100%', transform: `translate(-50%, -${bubbleGap}px)` }
                      : { left: '50%', top: '100%', transform: `translate(-50%, ${bubbleGap}px)` };
              return h(
                'button',
                {
                  key: `plus-${side}`,
                  type: 'button',
                  className: 'dsic-node-plus',
                  'data-side': side,
                  title: t('addConnected'),
                  'aria-label': t('addConnected'),
                  style: {
                    ...place,
                    width: bubbleSize,
                    height: bubbleSize,
                    borderWidth: bubbleBorder,
                    position: 'absolute',
                  },
                  onPointerDown: (event) => {
                    if (props.onPlusDrag) props.onPlusDrag(event, item.id, side);
                  },
                },
                h(Icon, { name: 'plus', size: Math.round(bubbleIcon) }),
              );
            })
          : null;

      // Selection chrome lives INSIDE the node element, so the neon frame and the
      // resize handles can never drift away from the card they belong to.
      const showChrome = selected && !editing && props.showChrome !== false;
      const chromeSize = 12 / zoomNow;
      const chromeBorder = Math.max(1, 1.5 / zoomNow);
      const handleDirs = [
        ['nw', 0, 0],
        ['n', 50, 0],
        ['ne', 100, 0],
        ['e', 100, 50],
        ['se', 100, 100],
        ['s', 50, 100],
        ['sw', 0, 100],
        ['w', 0, 50],
      ];
      const selectionChrome = showChrome
        ? [
            h('div', {
              key: 'selectframe',
              className: 'dsic-selectframe',
              'data-neon': 'true',
              'aria-hidden': 'true',
              style: {
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                '--dsic-frame-corner': `${Math.max(12, Math.round(18 / zoomNow))}px`,
                '--dsic-frame-scan': `${Math.max(0, Math.round((Number(rect?.h) || 0) - 2))}px`,
                pointerEvents: 'none',
              },
            }),
            ...handleDirs.map(([dir, left, top]) =>
              h('div', {
                key: `handle-${dir}`,
                className: 'dsic-handle',
                'data-handle': dir,
                style: {
                  left: `${left}%`,
                  top: `${top}%`,
                  width: chromeSize,
                  height: chromeSize,
                  transform: 'translate(-50%, -50%)',
                  borderWidth: chromeBorder,
                  borderRadius: Math.max(1, 2 / zoomNow),
                  cursor:
                    dir === 'n' || dir === 's'
                      ? 'ns-resize'
                      : dir === 'e' || dir === 'w'
                        ? 'ew-resize'
                        : dir === 'nw' || dir === 'se'
                          ? 'nwse-resize'
                          : 'nesw-resize',
                },
              }),
            ),
          ]
        : [];

      if (item.type === 'axis') {
        const config = item.meta?.axis ?? { orientation: 'h', min: 0, max: 10, step: 1, ticks: 11, unit: '', title: item.text || '数轴' };
        const ticks = axisTicks({ ...config, title: item.text || config.title });
        const horizontal = config.orientation !== 'v';
        return h(
          'div',
          {
            ...shared,
            className: 'dsic-node dsic-axis',
            'data-orientation': horizontal ? 'h' : 'v',
            style: { ...baseStyle, color: 'var(--dsw-alias-label-primary)' },
          },
          h('div', { className: 'dsic-axis-title' }, item.text || config.title || t('axis')),
          h('div', { className: 'dsic-axis-line' }),
          ticks.map((tick) =>
            h(
              'div',
              {
                key: tick.index,
                className: 'dsic-axis-tick',
                style: horizontal ? { left: `${tick.pct}%` } : { top: `${tick.pct}%` },
              },
              h('div', { className: 'dsic-axis-mark' }),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsic-axis-label',
                  title: `${t('axisTickHint')} · ${tick.label}`,
                  onPointerDown: (event) => event.stopPropagation(),
                  onClick: (event) => {
                    event.stopPropagation();
                    if (props.onAxisTick) props.onAxisTick(item, tick);
                  },
                },
                tick.label,
              ),
            ),
          ),
          plusBubbles,
          ...selectionChrome,
        );
      }
      if (item.type === 'text') {
        return h(
          'div',
          { ...shared, className: 'dsic-node dsic-node-text-block', style: { ...baseStyle, color: 'var(--dsw-alias-label-primary)', '--dsic-text-scale': String(textScale) } },
          textNode,
          plusBubbles,
          ...selectionChrome,
        );
      }
      if (item.type === 'frame') {
        const workspacePath = String(item.meta?.workspacePath ?? '').trim();
        return h(
          'div',
          { ...shared, className: 'dsic-node dsic-frame', style: { ...baseStyle, borderColor: 'color-mix(in srgb, var(--dsw-alias-label-secondary) 34%, transparent)' } },
          h(
            'div',
            { className: 'dsic-frame-label', style: { color: palette.ink, background: palette.bg, borderColor: palette.line } },
            item.text || t('frame'),
          ),
          workspacePath
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'dsic-frame-open',
                  title: `${t('openWorkspace')} · ${workspacePath}`,
                  'aria-label': t('openWorkspace'),
                  onPointerDown: (event) => event.stopPropagation(),
                  onClick: (event) => {
                    event.stopPropagation();
                    if (props.onOpenPath) props.onOpenPath(workspacePath);
                  },
                },
                '📂',
              )
            : null,
          plusBubbles,
          ...selectionChrome,
        );
      }
      if (item.type === 'image') {
        return h(
          'div',
          { ...shared, className: 'dsic-node dsic-image', style: { ...baseStyle, borderColor: palette.line, background: palette.bg } },
          item.src
            ? h('img', { src: item.src, alt: item.text || 'canvas image', draggable: false, className: 'dsic-image-el' })
            : h('div', { className: 'dsic-image-empty', style: { color: palette.ink } }, h(Icon, { name: 'image', size: 26 }), h('span', null, t('imageUrl'))),
          item.text ? h('div', { className: 'dsic-image-caption', style: { color: palette.ink } }, item.text) : null,
          plusBubbles,
          ...selectionChrome,
        );
      }
      if (item.type === 'agent') {
        const status = item.status ?? 'idle';
        const statusLabel = t(`agentStatus${status.charAt(0).toUpperCase()}${status.slice(1)}`);
        const running = status === 'running';
        const elapsed = running
          ? Math.max(0, Math.round((Date.now() - (Date.parse(item.updatedAt ?? '') || Date.now())) / 1000))
          : 0;
        const allItems = props.docItems ?? {};
        const parentItem = item.parentId ? allItems[item.parentId] : null;
        const frameItem = item.frameId ? allItems[item.frameId] : null;
        const children = Object.values(allItems).filter(
          (child) => child && child.type === 'agent' && child.parentId === item.id,
        );
        const childrenDone = children.filter((child) => child.status === 'done').length;
        // Compact chrome once the card is resized smaller than its default size.
        const cardSize = item.w <= 360 || item.h <= 260 ? 'true' : undefined;
        // The whole card content scales together with the card box, so fonts and
        // chrome keep their proportions when the user drags a resize handle.
        // The layout box is cardSize / scale, so after the transform the content
        // fills the card exactly (reflow handles any aspect-ratio change).
        const contentBase = contentBaseOf(item);
        const contentScale = contentScaleOf(item, rect);
        const layoutW = Math.max(1, Math.round(((Number(rect?.w) || contentBase.w) / contentScale) * 100) / 100);
        const layoutH = Math.max(1, Math.round(((Number(rect?.h) || contentBase.h) / contentScale) * 100) / 100);
        return h(
          'div',
          {
            ...shared,
            className: 'dsic-node dsic-agent',
            'data-status': status,
            'data-agent': item.id,
            'data-size': cardSize,
            style: {
              ...baseStyle,
              '--dsic-agent-accent': palette.bg,
              '--dsic-agent-accent-line': withAlpha(palette.line, 0.55),
            },
          },
          h(
            'div',
            {
              className: 'dsic-agent-scale',
              'data-scale': contentScale,
              style: {
                width: layoutW,
                height: layoutH,
                transform: `scale(${contentScale})`,
                transformOrigin: 'top left',
                display: 'flex',
                flexDirection: 'column',
                flex: '0 0 auto',
              },
            },
          h(
            'div',
            { className: 'dsic-agent-head' },
            h(
              'span',
              { className: 'dsic-agent-avatar', style: { background: palette.bg, color: palette.ink } },
              h(Icon, { name: 'agent', size: 15 }),
              running ? h('span', { className: 'dsic-agent-avatar-ring' }) : null,
            ),
            h('span', { className: 'dsic-agent-name' }, item.text || 'Agent'),
            h('span', { className: 'dsic-agent-status', 'data-status': status }, statusLabel),
          ),
          item.project || parentItem || frameItem
            ? h(
                'div',
                { className: 'dsic-agent-project' },
                item.project
                  ? h('span', { className: 'dsic-agent-project-name' }, t('agentProjectChip', { name: item.project }))
                  : null,
                parentItem
                  ? h(
                      'span',
                      { className: 'dsic-agent-parent' },
                      t('agentParentChip', { name: parentItem.text || 'Agent' }),
                    )
                  : null,
                frameItem && !item.project
                  ? h(
                      'span',
                      { className: 'dsic-agent-parent' },
                      t('agentFrameChip', { name: frameItem.text || t('frame') }),
                    )
                  : null,
              )
            : null,
          item.role
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'dsic-agent-role',
                  title: t('roleEdit'),
                  onPointerDown: (event) => event.stopPropagation(),
                  onClick: (event) => {
                    event.stopPropagation();
                    if (props.onEditRole) props.onEditRole(item.id);
                  },
                },
                h('span', { className: 'dsic-agent-role-icon' }, item.output === 'document' ? '📄' : '🎭'),
                h('span', { className: 'dsic-agent-role-text' }, rolePreviewOf(item.role)),
                h('span', { className: 'dsic-agent-role-edit' }, t('roleEdit')),
              )
            : h(
                'button',
                {
                  type: 'button',
                  className: 'dsic-agent-role dsic-agent-role-empty',
                  title: t('roleDialogTitle'),
                  onPointerDown: (event) => event.stopPropagation(),
                  onClick: (event) => {
                    event.stopPropagation();
                    if (props.onEditRole) props.onEditRole(item.id);
                  },
                },
                h('span', { className: 'dsic-agent-role-icon' }, '🎭'),
                h('span', { className: 'dsic-agent-role-text' }, t('roleSet')),
              ),
          running
            ? h(
                'div',
                { className: 'dsic-agent-body' },
                h('div', { className: 'dsic-agent-typing' }, h('span'), h('span'), h('span')),
                item.task ? h('div', { className: 'dsic-agent-task dsic-agent-task-running' }, item.task) : null,
                h('div', { className: 'dsic-agent-meta-line' }, t('agentWorkingFor', { n: elapsed })),
              )
            : item.task
              ? h(
                  'div',
                  { className: 'dsic-agent-body' },
                  h('div', { className: 'dsic-agent-task' }, item.task),
                  item.agentResult
                    ? h(
                        'div',
                        { className: 'dsic-agent-result', 'data-status': status },
                        `${status === 'done' ? '🎉' : '💥'} ${item.agentResult}`,
                      )
                    : null,
                )
              : h(
                  'div',
                  { className: 'dsic-agent-body' },
                  h(
                    'div',
                    { className: 'dsic-agent-empty' },
                    h('span', { className: 'dsic-agent-empty-emoji' }, '🛸'),
                    h(
                      'div',
                      { className: 'dsic-agent-empty-copy' },
                      h('div', { className: 'dsic-agent-quip' }, agentQuip(t, item)),
                      h('div', { className: 'dsic-agent-hint' }, t('agentEmptyHintText')),
                    ),
                  ),
                ),
          h(
            'div',
            { className: 'dsic-agent-foot' },
            h(
              'span',
              { className: 'dsic-agent-meta' },
              status === 'idle' ? t('agentNoTask') : running ? t('agentRunningMeta') : status === 'done' ? t('agentDoneMeta') : t('agentFailedMeta'),
            ),
            children.length > 0
              ? h(
                  'span',
                  { className: 'dsic-agent-children', title: t('agentChildrenChip', { n: children.length }) },
                  t('agentChildrenProgress', { done: childrenDone, total: children.length }),
                )
              : null,
            !item.parentId
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsic-agent-delegate',
                    title: t('agentDelegateTip'),
                    'aria-label': t('agentDelegate'),
                    onPointerDown: (event) => event.stopPropagation(),
                    onClick: (event) => {
                      event.stopPropagation();
                      if (props.onDelegate) props.onDelegate(item.id);
                    },
                  },
                  h(Icon, { name: 'sparkles', size: 11 }),
                  h('span', null, t('agentDelegate')),
                )
              : null,
            children.length > 0
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsic-agent-runchildren',
                    title: t('agentRunChildrenTip'),
                    'aria-label': t('agentRunChildren'),
                    onPointerDown: (event) => event.stopPropagation(),
                    onClick: (event) => {
                      event.stopPropagation();
                      if (props.onRunChildren) props.onRunChildren(item.id);
                    },
                  },
                  h(Icon, { name: 'play', size: 11 }),
                  h('span', null, t('agentRunChildren')),
                )
              : null,
            h(
              'button',
              {
                type: 'button',
                className: 'dsic-agent-run',
                title: status === 'done' || status === 'failed' ? t('agentRunAgain') : t('agentRun'),
                'aria-label': t('agentRun'),
                onPointerDown: (event) => event.stopPropagation(),
                onClick: (event) => {
                  event.stopPropagation();
                  if (props.onRunAgent) props.onRunAgent(item.id);
                },
              },
              h(Icon, { name: 'play', size: 11 }),
              h('span', null, status === 'idle' ? t('agentRunShort') : t('agentRunAgainShort')),
            ),
          ),
          ),
          plusBubbles,
          ...selectionChrome,
        );
      }
      if (item.type === 'shape') {
        const shape = item.shape ?? 'rect';
        const shapeStyle =
          shape === 'ellipse'
            ? { borderRadius: '50%' }
            : shape === 'diamond'
              ? { clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)', borderRadius: 0 }
              : { borderRadius: 14 };
        return h(
          'div',
          {
            ...shared,
            className: 'dsic-node dsic-shape',
            style: { ...baseStyle, ...shapeStyle, background: palette.bg, borderColor: palette.line, color: palette.ink, '--dsic-text-scale': String(textScale) },
          },
          h('div', { className: 'dsic-shape-text' }, textNode),
          plusBubbles,
          ...selectionChrome,
        );
      }
      return h(
        'div',
        {
          ...shared,
          className: 'dsic-node dsic-note',
          'data-long': isLongCardText(item.text) ? 'true' : undefined,
          style: { ...baseStyle, background: palette.bg, borderColor: palette.line, color: palette.ink, '--dsic-text-scale': String(textScale) },
        },
        textNode,
        plusBubbles,
        ...selectionChrome,
      );
    }

    /**
     * Screen-space text editor drawn above the zoomed world, so caret, IME and scrolling
     * never depend on the transformed node box. It commits on blur / Cmd+Enter, cancels on
     * Escape, and saves a non-empty draft if it is unmounted for any other reason.
     */
    function EditorOverlay({ item, rect, viewport, stageSize, draft, t, onDraftChange, onCommit, onCancel }) {
      const textareaRef = useRef(null);
      const startingText = useRef(item.text ?? '');
      const finished = useRef(false);
      const draftRef = useRef(draft);
      const commitRef = useRef(onCommit);
      const cancelRef = useRef(onCancel);
      draftRef.current = draft;
      commitRef.current = onCommit;
      cancelRef.current = onCancel;

      useEffect(() => {
        const element = textareaRef.current;
        if (!element) return;
        element.focus();
        const end = element.value.length;
        try {
          element.setSelectionRange(end, end);
        } catch (error) {
          /* selection is best effort */
        }
      }, []);

      // Never lose typed text: if this editor is torn down by anything other than a
      // deliberate commit/cancel (panel switch, node re-render, remote delete), save it.
      useEffect(
        () => () => {
          if (finished.current) return;
          if (draftRef.current === startingText.current) return;
          finished.current = true;
          try {
            commitRef.current();
          } catch (error) {
            console.error('[infinite-canvas] deferred text save failed', error);
          }
        },
        [],
      );

      const finish = (commit) => {
        if (finished.current) return;
        finished.current = true;
        if (commit) commitRef.current();
        else cancelRef.current();
      };

      const zoom = viewport.zoom;
      const left = (rect.x - viewport.cx) * zoom + stageSize.w / 2;
      const top = (rect.y - viewport.cy) * zoom + stageSize.h / 2;
      const width = rect.w * zoom;
      const height = rect.h * zoom;
      const palette = NOTE_COLORS[item.color] ?? NOTE_COLORS.yellow;
      // The inline editor must match the (scaled) card typography, otherwise the
      // text jumps when editing a resized sticky.
      const fontScale = contentScaleOf(item, rect);
      const singleLine = item.type === 'frame';
      let editorStyle;
      if (item.type === 'frame') {
        editorStyle = {
          left: left + 10 * zoom,
          top: top - 13 * zoom,
          width: Math.max(150, Math.min(width - 24 * zoom, 340)),
          height: Math.max(22, 20 * zoom),
          padding: `1px ${Math.max(6, 8 * zoom)}px`,
          fontSize: Math.max(11, 12 * zoom),
          lineHeight: 1.5,
          fontWeight: 600,
          color: palette.ink,
          background: palette.bg,
          borderColor: palette.line,
          borderWidth: 1,
          borderStyle: 'solid',
          borderRadius: 999,
          textAlign: 'left',
        };
      } else if (item.type === 'text') {
        editorStyle = {
          left,
          top,
          width,
          height,
          padding: 2,
          fontSize: Math.max(10, 24 * zoom * fontScale),
          lineHeight: 1.3,
          fontWeight: 600,
          color: 'var(--dsw-alias-label-primary)',
          textAlign: 'left',
        };
      } else if (item.type === 'agent') {
        editorStyle = {
          left,
          top,
          width,
          height,
          padding: Math.max(8, 12 * zoom * fontScale),
          fontSize: Math.max(10, 12.5 * zoom * fontScale),
          lineHeight: 1.6,
          color: 'var(--dsw-alias-label-primary)',
          background: 'var(--dsw-alias-bg-layer-2)',
          textAlign: 'left',
        };
      } else if (item.type === 'shape') {
        editorStyle = {
          left: left + width * 0.1,
          top: top + height * 0.1,
          width: width * 0.8,
          height: height * 0.8,
          padding: 4,
          fontSize: Math.max(10, 15 * zoom * fontScale),
          lineHeight: 1.4,
          color: palette.ink,
          textAlign: 'center',
        };
      } else {
        editorStyle = {
          left,
          top,
          width,
          height,
          padding: Math.max(6, 16 * zoom * fontScale),
          fontSize: Math.max(10, 15 * zoom * fontScale),
          lineHeight: 1.45,
          color: palette.ink,
          textAlign: 'left',
        };
      }

      return h('textarea', {
        ref: textareaRef,
        className: 'dsic-overlay-editor',
        value: draft,
        placeholder: singleLine ? t('frame') : item.type === 'agent' ? t('agentTaskPlaceholder') : t('emptyNote'),
        spellCheck: false,
        'data-single-line': singleLine ? 'true' : undefined,
        style: editorStyle,
        onPointerDown: (event) => event.stopPropagation(),
        onClick: (event) => event.stopPropagation(),
        onDoubleClick: (event) => event.stopPropagation(),
        onChange: (event) => onDraftChange(event.target.value),
        onBlur: () => finish(true),
        onKeyDown: (event) => {
          event.stopPropagation();
          if (event.key === 'Escape') {
            event.preventDefault();
            finish(false);
          } else if (event.key === 'Enter' && (singleLine || event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            finish(true);
          }
        },
      });
    }

    /** Polyline path for a freehand stroke; points are stored relative to item.x/item.y. */
    function strokePathData(item) {
      const points = Array.isArray(item.points) ? item.points : [];
      if (points.length < 2) return '';
      let d = `M ${item.x + points[0][0]} ${item.y + points[0][1]}`;
      for (let index = 1; index < points.length; index += 1) {
        d += ` L ${item.x + points[index][0]} ${item.y + points[index][1]}`;
      }
      return d;
    }

    function strokeColor(item) {
      const palette = NOTE_COLORS[item.color] ?? NOTE_COLORS.white;
      return palette.bg;
    }

    function EdgeLayer({ items, selection, zoom, hoveredEdge, onHover, draftFor }) {
      const resolve = (item) => (draftFor ? draftFor(item) : itemBounds(item));
      const edges = [];
      const strokes = [];
      for (const key of Object.keys(items)) {
        const item = items[key];
        if (item.type === 'stroke') {
          if (Array.isArray(item.points) && item.points.length > 1) strokes.push(item);
          continue;
        }
        if (item.type !== 'edge') continue;
        const from = items[item.from];
        const to = items[item.to];
        if (!from || !to || from.type === 'edge' || to.type === 'edge') continue;
        edges.push({
          item,
          geometry: edgePath(from, to, resolve(from), resolve(to)),
          pair: neonPairFor(item.id),
          width: Math.max(1.6, 2.4 / zoom),
        });
      }
      if (edges.length === 0 && strokes.length === 0) return null;
      return h(
        'svg',
        { className: 'dsic-edges', width: 1, height: 1, 'aria-hidden': 'true' },
        h(
          'defs',
          null,
          strokes.map((stroke) => {
            const pair = neonPairFor(stroke.id);
            const box = itemBounds(stroke);
            return h(
              'linearGradient',
              {
                key: `gs-${stroke.id}`,
                id: `dsic-strokeneon-${stroke.id}`,
                gradientUnits: 'userSpaceOnUse',
                x1: box.x,
                y1: box.y,
                x2: box.x + Math.max(box.w, 1),
                y2: box.y + Math.max(box.h, 1),
              },
              h('stop', { offset: '0%', stopColor: pair[0] }),
              h('stop', { offset: '100%', stopColor: pair[1] }),
            );
          }),
          edges.map((edge) =>
            h(
              'marker',
              {
                key: `m-${edge.item.id}`,
                id: `dsic-arrow-${edge.item.id}`,
                viewBox: '0 0 10 10',
                refX: 8,
                refY: 5,
                markerWidth: 7,
                markerHeight: 7,
                orient: 'auto-start-reverse',
              },
              h('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: edge.pair[0] }),
            ),
          ),
          h(
            'marker',
            {
              id: 'dsic-arrow',
              viewBox: '0 0 10 10',
              refX: 8,
              refY: 5,
              markerWidth: 7,
              markerHeight: 7,
              orient: 'auto-start-reverse',
            },
            h('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#22d3ee' }),
          ),
        ),
        strokes.map((stroke) => {
          const selected = selection.includes(stroke.id);
          const d = strokePathData(stroke);
          const width = stroke.width ?? 3;
          const pair = neonPairFor(stroke.id);
          const neon = !stroke.color || stroke.color === 'white' || stroke.color === 'gray';
          return h(
            'g',
            { key: stroke.id, className: 'dsic-stroke', 'data-stroke-id': stroke.id, 'data-selected': selected ? 'true' : undefined },
            h('path', {
              d,
              className: 'dsic-stroke-hit',
              strokeWidth: Math.max(width + 12, 18 / zoom),
              fill: 'none',
              stroke: 'transparent',
            }),
            h('path', {
              d,
              stroke: neon ? pair[0] : '#22d3ee',
              strokeWidth: width + 7,
              opacity: 0.16,
              fill: 'none',
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            }),
            selected
              ? h('path', { d, stroke: 'var(--dsw-alias-brand-primary)', strokeWidth: width + 6, opacity: 0.25, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' })
              : null,
            h('path', {
              d,
              stroke: selected ? '#e0f2fe' : neon ? `url(#dsic-strokeneon-${stroke.id})` : strokeColor(stroke),
              strokeWidth: width,
              fill: 'none',
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            }),
          );
        }),
        edges.map((edge) => {
          const selected = selection.includes(edge.item.id);
          const hover = hoveredEdge === edge.item.id;
          const [startColor, endColor] = edge.pair;
          return h(
            'g',
            {
              key: edge.item.id,
              className: 'dsic-edge',
              'data-edge-id': edge.item.id,
              'data-selected': selected ? 'true' : undefined,
              'data-hover': hover ? 'true' : undefined,
            },
            h('path', {
              d: edge.geometry.d,
              className: 'dsic-edge-hit',
              strokeWidth: Math.max(14, 18 / zoom),
              onPointerEnter: () => onHover(edge.item.id),
              onPointerLeave: () => onHover(null),
            }),
            h('path', {
              d: edge.geometry.d,
              className: 'dsic-edge-line',
              stroke: startColor,
              strokeWidth: edge.width,
              markerEnd: `url(#dsic-arrow-${edge.item.id})`,
              fill: 'none',
              strokeLinecap: 'round',
            }),
            // static scan texture: fine bright dashes riding on the solid line
            h('path', {
              d: edge.geometry.d,
              className: 'dsic-edge-scan',
              stroke: '#f8fafc',
              strokeWidth: Math.max(0.8, 1.1 / zoom),
              strokeDasharray: '2 7',
              fill: 'none',
              strokeLinecap: 'butt',
            }),
            // circuit-style port dot: only while the connector is selected / hovered
            // (a dot on every line looked like a stray ring in dense views)
            selected || hover
              ? h('circle', {
                  className: 'dsic-edge-port',
                  cx: edge.geometry.startX,
                  cy: edge.geometry.startY,
                  r: Math.max(2.2, 2.8 / zoom),
                  fill: '#0b1220',
                  stroke: startColor,
                  strokeWidth: Math.max(1, 1.3 / zoom),
                })
              : null,
            selected || hover
              ? h('path', {
                  d: edge.geometry.d,
                  className: 'dsic-edge-flow',
                  stroke: '#f0f9ff',
                  strokeWidth: Math.max(1.2, 1.7 / zoom),
                  fill: 'none',
                  strokeLinecap: 'round',
                })
              : null,
            edge.item.label
              ? h(
                  'text',
                  {
                    x: edge.geometry.midX,
                    y: edge.geometry.midY - 4,
                    textAnchor: 'middle',
                    className: 'dsic-edge-label',
                    style: { fontSize: Math.max(11, 12 / zoom), fill: startColor },
                  },
                  edge.item.label,
                )
              : null,
          );
        }),
      );
    }

    function ResizeHandles({ rect, zoom, scale }) {
      const edge = Math.max(9 / zoom, 12 / zoom);
      const half = edge / 2;
      const dirs = [
        { dir: 'nw', x: rect.x, y: rect.y, cursor: 'nwse-resize' },
        { dir: 'n', x: rect.x + rect.w / 2, y: rect.y, cursor: 'ns-resize' },
        { dir: 'ne', x: rect.x + rect.w, y: rect.y, cursor: 'nesw-resize' },
        { dir: 'e', x: rect.x + rect.w, y: rect.y + rect.h / 2, cursor: 'ew-resize' },
        { dir: 'se', x: rect.x + rect.w, y: rect.y + rect.h, cursor: 'nwse-resize' },
        { dir: 's', x: rect.x + rect.w / 2, y: rect.y + rect.h, cursor: 'ns-resize' },
        { dir: 'sw', x: rect.x, y: rect.y + rect.h, cursor: 'nesw-resize' },
        { dir: 'w', x: rect.x, y: rect.y + rect.h / 2, cursor: 'ew-resize' },
      ];
      return dirs.map((handle) =>
        h('div', {
          key: handle.dir,
          className: 'dsic-handle',
          'data-handle': handle.dir,
          style: {
            left: handle.x - half,
            top: handle.y - half,
            width: edge,
            height: edge,
            borderRadius: Math.max(1, 2 / zoom),
            borderWidth: Math.max(1, 1.4 / zoom),
            cursor: handle.cursor,
          },
        }),
      );
    }

    /* ------------------------------------------------------------------ *
     * sidebar icon
     * ------------------------------------------------------------------ */
    function CanvasIcon(props) {
      const size = props && typeof props.size === 'number' ? props.size : 20;
      const active = Boolean(props && props.active);
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          'aria-hidden': 'true',
          style: { display: 'block', color: active ? 'var(--dsw-alias-brand-primary)' : 'currentColor' },
        },
        h('path', {
          d: 'M7.4 3.4H13.4L20.6 10.6V16.6Q20.6 20.6 16.6 20.6H7.4Q3.4 20.6 3.4 16.6V7.4Q3.4 3.4 7.4 3.4Z',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
        h('path', { d: 'M13.4 3.4L20.6 10.6H13.4Z', fill: 'currentColor', opacity: 0.28 }),
        h('circle', { cx: 8.6, cy: 14.4, r: 1.9, fill: 'currentColor' }),
        h('circle', { cx: 15.4, cy: 14.4, r: 1.9, fill: 'currentColor' }),
        h('path', {
          d: 'M10.5 14.7Q12 16.3 13.5 14.7',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinecap: 'round',
        }),
      );
    }

    /* ------------------------------------------------------------------ *
     * styles
     * ------------------------------------------------------------------ */
    const CSS = [
      '.dsic-root{position:relative;display:flex;flex-direction:column;flex:1 1 auto;height:100%;width:100%;min-height:0;overflow:hidden;box-sizing:border-box;padding-top:var(--dsh-frame-top-clearance,0px);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:inherit;font-size:13px}',
      '.dsic-bar{display:flex;align-items:center;gap:8px;flex:0 0 auto;height:60px;padding:0 12px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);overflow-x:auto;scrollbar-width:thin}',
      '.dsic-title{flex:0 1 220px;min-width:120px;height:30px;padding:0 10px;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;font-weight:600;outline:none}',
      '.dsic-title:hover{background:var(--dsw-alias-bg-layer-2)}',
      '.dsic-title:focus{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base)}',
      '.dsic-sep{width:1px;height:22px;flex:0 0 auto;background:var(--dsw-alias-border-l1);margin:0 2px}',
      '.dsic-group{display:flex;align-items:center;gap:2px;flex:0 0 auto}',
      '.dsic-spacer{flex:1 1 auto;min-width:8px}',
      '.dsic-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:38px;min-width:38px;padding:0 9px;border:1px solid transparent;border-radius:9px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer;outline:none}',
      '.dsic-btn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
      '.dsic-btn:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-brand-primary)}',
      '.dsic-btn:disabled{opacity:.4;cursor:default;background:transparent}',
      '.dsic-btn[data-active="true"]{color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 28%,transparent)}',
      '.dsic-tool{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;width:52px;height:38px;padding:1px 0 2px;border-radius:9px;border:0 !important;background:transparent;box-shadow:none !important;outline:none}',
      '.dsic-tool:hover{background:var(--dsw-alias-bg-layer-2);border:0 !important}',
      '.dsic-tool[data-active="true"]{border:0 !important;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent);color:var(--dsw-alias-brand-primary);box-shadow:none !important}',
      '.dsic-tool-label{font-size:11px;line-height:1;font-weight:500;white-space:nowrap;letter-spacing:.2px}',
      '.dsic-zoom{min-width:52px;font-variant-numeric:tabular-nums}',
      '.dsic-sync{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--dsw-alias-label-secondary);padding:0 4px}',
      '.dsic-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-idle-primary);flex:0 0 auto}',
      '.dsic-dot[data-status="live"]{background:var(--dsw-alias-state-success-primary)}',
      '.dsic-dot[data-status="offline"]{background:var(--dsw-alias-state-error-primary)}',
      '.dsic-dot[data-status="loading"]{background:var(--dsw-alias-state-warn-primary)}',
      '.dsic-build{font-size:10.5px;opacity:.55;font-variant-numeric:tabular-nums;margin-left:2px}',
      '.dsic-stale{font-size:10.5px;color:var(--dsw-alias-state-warn-primary);margin-left:6px;white-space:nowrap}',
      '.dsic-addtext{padding:0 12px;gap:6px;font-weight:600;height:38px;border-radius:9px;border-color:transparent;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
      '.dsic-addtext:hover{background:var(--dsw-alias-bg-layer-1);border-color:transparent}',
      '.dsic-addtext span{font-size:11px;white-space:nowrap}',
      '.dsic-projectbtn[data-open="true"]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 20%,var(--dsw-alias-bg-layer-1));border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,transparent)}',
      '.dsic-projects{position:absolute;top:46px;right:12px;z-index:64;width:292px;display:flex;flex-direction:column;gap:8px;padding:10px;border-radius:13px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);box-shadow:0 18px 44px rgba(2,6,23,.45);box-sizing:border-box}',
      '.dsic-projects-head{font-size:12px;font-weight:700;letter-spacing:.04em;color:var(--dsw-alias-label-primary);padding:2px 4px}',
      '.dsic-projects-new{display:flex;align-items:center;justify-content:center;gap:6px;height:32px;border-radius:9px;border:1px dashed color-mix(in srgb,var(--dsw-alias-brand-primary) 55%,transparent);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;font-weight:600;cursor:pointer}',
      '.dsic-projects-new:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 22%,transparent)}',
      '.dsic-projects-list{display:flex;flex-direction:column;gap:4px;max-height:300px;overflow:auto}',
      '.dsic-project-row{display:flex;align-items:center;gap:8px;width:100%;padding:7px 8px;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;text-align:left;cursor:pointer}',
      '.dsic-project-row:hover{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 72%,transparent);border-color:var(--dsw-alias-border-l1)}',
      '.dsic-project-name{flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dsic-project-count{flex:0 0 auto;font-size:10.5px;color:var(--dsw-alias-label-secondary)}',
      '.dsic-projects-empty{padding:8px 4px;font-size:11.5px;line-height:1.5;color:var(--dsw-alias-label-secondary)}',
      '.dsic-project-item{display:flex;align-items:center;gap:2px}',
      '.dsic-project-item .dsic-project-row{flex:1 1 auto;min-width:0}',
      '.dsic-project-open{flex:0 0 auto;width:26px;height:26px;border-radius:7px;border:1px solid transparent;background:transparent;font-size:13px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center}',
      '.dsic-project-open:hover{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 72%,transparent);border-color:var(--dsw-alias-border-l1)}',
      '.dsic-path-card{width:min(560px,88vw)}',
      '.dsic-path-input{width:100%;height:36px;margin-top:8px;padding:0 10px;box-sizing:border-box;border-radius:9px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:12.5px/1.4 ui-monospace,Consolas,monospace;outline:none}',
      '.dsic-path-input:focus{border-color:var(--dsw-alias-brand-primary)}',
      '.dsic-frame-open{position:absolute;top:8px;right:10px;width:26px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:7px;border:1px solid color-mix(in srgb,var(--dsw-alias-label-secondary) 30%,transparent);background:color-mix(in srgb,var(--dsw-alias-bg-base) 55%,transparent);font-size:12px;line-height:1;cursor:pointer;z-index:5}',
      '.dsic-frame-open:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 22%,transparent)}',
      '.dsic-boardbtn,.dsic-historybtn{flex:0 0 auto;max-width:none;min-width:78px;overflow:visible}',
      '.dsic-boardbtn span,.dsic-historybtn span{flex:0 0 auto;overflow:visible;text-overflow:clip;white-space:nowrap}',
      '.dsic-boardbtn[data-open="true"],.dsic-historybtn[data-open="true"]{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,transparent);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,var(--dsw-alias-bg-layer-1))}',
      '.dsic-boards,.dsic-history{width:352px}',
      '.dsic-board-item{display:flex;align-items:center;gap:2px}',
      '.dsic-board-row{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:7px 8px;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer}',
      '.dsic-board-row:hover{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 72%,transparent);border-color:var(--dsw-alias-border-l1)}',
      '.dsic-board-row[data-current="true"]{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 55%,transparent);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent)}',
      '.dsic-board-name{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12.5px;font-weight:600}',
      '.dsic-board-meta{font-size:10.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap}',
      '.dsic-board-act{flex:0 0 auto;width:26px;height:26px;border-radius:7px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1;cursor:pointer}',
      '.dsic-board-act:hover{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 72%,transparent);border-color:var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary)}',
      '.dsic-board-del:hover{color:var(--dsw-alias-state-error-primary)}',
      '.dsic-history-item{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:8px;border:1px solid transparent}',
      '.dsic-history-item:hover{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 72%,transparent);border-color:var(--dsw-alias-border-l1)}',
      '.dsic-history-copy{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:1px}',
      '.dsic-history-label{font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dsic-history-meta{font-size:10.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap}',
      '.dsic-history-act{flex:0 0 auto;width:26px;height:26px;border-radius:7px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1;cursor:pointer}',
      '.dsic-history-act:hover{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 72%,transparent);border-color:var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary)}',
      '.dsic-modelbtn[data-active="true"]{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,transparent);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,var(--dsw-alias-bg-layer-1))}',
      '.dsic-model-card{width:min(560px,90vw);max-height:76vh;display:flex;flex-direction:column}',
      '.dsic-model-close{margin-left:auto;width:26px;height:26px;border-radius:7px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary);font:13px/1 inherit;cursor:pointer}',
      '.dsic-model-close:hover{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 72%,transparent);border-color:var(--dsw-alias-border-l1)}',
      '.dsic-model-status{padding:16px 4px;font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.dsic-model-list{display:flex;flex-direction:column;gap:6px;margin-top:10px;overflow:auto;max-height:52vh;padding-right:2px}',
      '.dsic-model-group{display:flex;flex-direction:column;gap:3px;margin-top:6px}',
      '.dsic-model-provider{padding:4px 6px;font-size:11px;font-weight:700;letter-spacing:.04em;color:var(--dsw-alias-label-secondary);text-transform:uppercase}',
      '.dsic-model-row{display:flex;align-items:center;gap:8px;width:100%;padding:8px 9px;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;text-align:left;cursor:pointer}',
      '.dsic-model-row:hover{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 72%,transparent);border-color:var(--dsw-alias-border-l1)}',
      '.dsic-model-row[data-active="true"]{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 55%,transparent);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent)}',
      '.dsic-model-name{flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dsic-model-tag{flex:0 0 auto;padding:2px 6px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 78%,transparent);font-size:10px;color:var(--dsw-alias-label-secondary);max-width:45%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dsic-model-custom-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:14px 0 2px;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l1)}',
      '.dsic-model-custom-head .dsic-model-provider{padding:0}',
      '.dsic-model-add{height:26px;padding:0 10px;font-size:11px;white-space:nowrap}',
      '.dsic-model-provider-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:4px 6px}',
      '.dsic-model-provider-url{font-size:10px;color:var(--dsw-alias-label-secondary);max-width:230px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dsic-model-actions{margin-left:auto;display:flex;gap:4px}',
      '.dsic-model-act{width:24px;height:24px;padding:0;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}',
      '.dsic-model-act:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}',
      '.dsic-model-warn{padding:1px 6px;border-radius:999px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-warn) 45%,transparent);color:var(--dsw-alias-state-warn);font-size:9.5px}',
      '.dsic-model-empty{margin:6px 0 10px;font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary)}',
      '.dsic-model-testok{margin:6px 0 0;font-size:10.5px;line-height:1.5;color:var(--dsw-alias-state-success);word-break:break-word}',
      '.dsic-model-testerr{margin:6px 0 0;font-size:10.5px;line-height:1.5;color:var(--dsw-alias-state-error);word-break:break-word}',
      '.dsic-model-foot{display:flex;justify-content:space-between;gap:10px;margin-top:12px;padding-top:8px;border-top:1px solid var(--dsw-alias-border-l1);font-size:10px;color:var(--dsw-alias-label-secondary)}',
      '.dsic-model-footbusy{color:var(--dsw-alias-brand-primary)}',
      '.dsic-provider-card{width:min(540px,94vw);max-height:88vh;overflow:auto}',
      '.dsic-provider-presets{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 12px}',
      '.dsic-provider-preset{cursor:pointer;border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 40%,transparent)}',
      '.dsic-provider-field{display:flex;flex-direction:column;gap:4px;margin-bottom:9px;font-size:11px;color:var(--dsw-alias-label-secondary)}',
      '.dsic-provider-field input,.dsic-provider-field select{height:32px;padding:0 9px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;outline:none}',
      '.dsic-provider-field input:focus,.dsic-provider-field select:focus{border-color:var(--dsw-alias-brand-primary)}',
      '.dsic-provider-row{display:flex;gap:8px}',
      '.dsic-provider-row .dsic-provider-field{flex:1 1 0;margin-bottom:0}',
      '.dsic-provider-advanced-toggle{height:26px;padding:0 8px;font-size:11px;margin:2px 0 8px}',
      '.dsic-provider-advanced{margin-bottom:6px}',
      '.dsic-provider-test{margin:8px 0}',
      '.dsic-provider-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;margin-top:10px}',
      '.dsic-aibtn{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,var(--dsw-alias-bg-layer-1));border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 34%,transparent);color:var(--dsw-alias-brand-primary)}',
      '.dsic-aibtn:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 22%,var(--dsw-alias-bg-layer-1));border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 48%,transparent)}',
      '.dsic-ai-card{width:520px;max-width:92%}',
      '.dsic-ai-head{display:flex;align-items:center;gap:8px;color:var(--dsw-alias-brand-primary);margin-bottom:10px}',
      '.dsic-ai-head .dsic-dialog-title{margin:0;color:var(--dsw-alias-label-primary)}',
      '.dsic-ai-input{width:100%;box-sizing:border-box;min-height:84px;resize:vertical;padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:1.6;outline:none}',
      '.dsic-ai-input:focus{border-color:var(--dsw-alias-brand-primary)}',
      '.dsic-scope{display:flex;align-items:center;gap:6px;margin-bottom:10px;flex-wrap:wrap}',
      '.dsic-scope-label{font-size:12px;color:var(--dsw-alias-label-secondary);margin-right:2px}',
      '.dsic-scope-option{height:28px;padding:0 12px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}',
      '.dsic-scope-option[data-active="true"]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 16%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 40%,transparent);color:var(--dsw-alias-brand-primary);font-weight:600}',
      '.dsic-scope-option:disabled{opacity:.45;cursor:default}',
      '.dsic-scope-option:hover:not(:disabled){border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}',
      '.dsic-ai-chips{justify-content:flex-start;margin-top:10px}',
      '.dsic-ai-hint{margin:10px 0 0;font-size:11.5px;color:var(--dsw-alias-label-secondary);opacity:.85}',
      '.dsic-ai-context{margin:0 0 8px;font-size:11.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.dsic-ai-hint kbd{font:inherit;font-size:11px}',
      '.dsic-ai-card .dsic-primary{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);opacity:1}',
      '.dsic-primary:disabled{opacity:.45;cursor:default;filter:none}',
      '.dsic-ai-card .dsic-primary:disabled{opacity:.45;cursor:default}',
      '.dsic-dialog-backdrop-hint{margin:8px 0 0;text-align:right;font-size:11px;color:var(--dsw-alias-label-secondary);opacity:.7}',
      '.dsic-stage{position:relative;flex:1 1 auto;min-height:0;overflow:hidden;touch-action:none;cursor:default;--dsic-grid:color-mix(in srgb,var(--dsw-alias-label-secondary) 20%,transparent)}',
      '.dsic-stage[data-tool="hand"]{cursor:grab}',
      '.dsic-stage[data-space="true"]{cursor:grab}',
      '.dsic-stage[data-panning="true"]{cursor:grabbing}',
      '.dsic-stage[data-create="true"]{cursor:crosshair}',
      '.dsic-world{position:absolute;left:0;top:0;transform-origin:0 0;z-index:1}',
      '.dsic-twinkle{position:absolute;inset:0;pointer-events:none;opacity:.14}',
      '.dsic-decorfx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}',
      '.dsic-vignette{position:absolute;inset:0;pointer-events:none;z-index:2;background:radial-gradient(ellipse at 50% 45%, transparent 46%, rgba(2,6,23,.42) 100%)}',
      '.dsic-scanlines{position:absolute;inset:0;pointer-events:none;z-index:3;opacity:.5;background-image:repeating-linear-gradient(to bottom, rgba(148,163,184,.035) 0px, rgba(148,163,184,.035) 1px, transparent 1px, transparent 3px)}',
      '.dsic-scanbeam{position:absolute;left:0;right:0;top:-160px;height:150px;pointer-events:none;z-index:3;background:linear-gradient(to bottom, transparent, rgba(34,211,238,.055), transparent);animation:dsic-scan 11s linear infinite}',
      '@keyframes dsic-scan{from{transform:translateY(0)}to{transform:translateY(calc(100vh + 220px))}}',
      '.dsic-hud{position:absolute;inset:12px;pointer-events:none;z-index:4}',
      '.dsic-hud i{position:absolute;width:22px;height:22px;border-style:solid;border-width:0;border-color:rgba(34,211,238,.32)}',
      '.dsic-hud i:nth-child(1){left:0;top:0;border-left-width:1px;border-top-width:1px}',
      '.dsic-hud i:nth-child(2){right:0;top:0;border-right-width:1px;border-top-width:1px;border-color:rgba(236,72,153,.28)}',
      '.dsic-hud i:nth-child(3){left:0;bottom:0;border-left-width:1px;border-bottom-width:1px;border-color:rgba(236,72,153,.28)}',
      '.dsic-hud i:nth-child(4){right:0;bottom:0;border-right-width:1px;border-bottom-width:1px}',
      '.dsic-edges{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}',
      '.dsic-edge-hit{fill:none;stroke:transparent;pointer-events:stroke;cursor:pointer}',
      '.dsic-stroke-hit{fill:none;stroke:transparent;pointer-events:stroke;cursor:pointer}',
      '.dsic-edge-line{pointer-events:none}',
      '.dsic-edge-scan{pointer-events:none;opacity:.6;animation:dsic-scanflow 3.4s linear infinite}',
      '@keyframes dsic-scanflow{to{stroke-dashoffset:-18}}',
      '.dsic-edge-port{pointer-events:none}',
      '.dsic-hud-tag{position:absolute;font:9px/1 ui-monospace,Consolas,monospace;letter-spacing:.12em;opacity:.35;white-space:nowrap}',
      '.dsic-hud-tag-br{right:30px;bottom:6px;color:rgba(236,72,153,.9)}',
      '.dsic-nixie{position:absolute;left:30px;top:0;display:flex;align-items:flex-end;gap:3px;pointer-events:auto;cursor:help}',
      '.dsic-nixie-cell{display:flex;align-items:center;justify-content:center;width:18px;height:26px;border-radius:3px;background:radial-gradient(ellipse at 50% 28%, rgba(255,138,60,.14), rgba(8,6,4,.94) 72%);border:1px solid rgba(255,138,60,.22);box-shadow:inset 0 0 6px rgba(255,138,60,.18),0 0 6px rgba(255,138,60,.1);font:600 15px/1 ui-monospace,Consolas,monospace;color:#ffa457;text-shadow:0 0 4px rgba(255,138,60,.9),0 0 10px rgba(255,90,20,.5)}',
      '.dsic-nixie-cell[data-dot="true"]{width:7px;border:none;background:none;box-shadow:none;font-size:11px;color:#ff9d4d;text-shadow:0 0 4px rgba(255,138,60,.8)}',
      '.dsic-nixie[data-rolling="true"] .dsic-nixie-cell{animation:dsic-nixie-flicker .12s steps(2) infinite}',
      '@keyframes dsic-nixie-flicker{0%{opacity:1}50%{opacity:.5}100%{opacity:1}}',
      '.dsic-nixie-caption{position:absolute;left:1px;top:29px;font:9px/1 ui-monospace,Consolas,monospace;letter-spacing:.16em;color:rgba(255,138,60,.42);white-space:nowrap}',
      '.dsic-edge-flow{pointer-events:none;stroke-dasharray:10 9;animation:dsic-flow 1.1s linear infinite}',      '@keyframes dsic-flow{to{stroke-dashoffset:-19}}',
      '.dsic-edge[data-selected="true"] .dsic-edge-line{filter:brightness(1.35) saturate(1.25)}',
      '.dsic-edge[data-hover="true"] .dsic-edge-line{filter:brightness(1.2)}',
      '.dsic-edge-label{fill:var(--dsw-alias-label-secondary);paint-order:stroke;stroke:var(--dsw-alias-bg-base);stroke-width:4px;font-family:inherit}',
      '.dsic-node{position:absolute;box-sizing:border-box;border:1px solid transparent;outline:none;user-select:none;transition:box-shadow .15s ease,transform .06s ease}',
      '.dsic-node[data-selected="true"]{overflow:visible}',
      '.dsic-place-marker{position:absolute;width:var(--dsic-marker-size,26px);height:var(--dsic-marker-size,26px);transform:translate(-50%,-50%);pointer-events:none;z-index:200000;animation:dsic-marker-pulse .9s ease-out 2}',
      '.dsic-place-marker::before,.dsic-place-marker::after{content:"";position:absolute;background:#22d3ee;box-shadow:0 0 8px #22d3ee}',
      '.dsic-place-marker::before{left:0;right:0;top:50%;height:var(--dsic-marker-line,1.5px);transform:translateY(-50%)}',
      '.dsic-place-marker::after{top:0;bottom:0;left:50%;width:var(--dsic-marker-line,1.5px);transform:translateX(-50%)}',
      '@keyframes dsic-marker-pulse{0%{opacity:1;transform:translate(-50%,-50%) scale(.55)}100%{opacity:.1;transform:translate(-50%,-50%) scale(1.7)}}',
      '.dsic-node[data-selected="true"]{box-shadow:0 0 0 2px var(--dsw-alias-brand-primary)}',
      '.dsic-node[data-drop="true"]{box-shadow:0 0 0 3px var(--dsw-alias-brand-primary),0 0 0 8px color-mix(in srgb,var(--dsw-alias-brand-primary) 22%,transparent)}',
      '.dsic-linkdrag{position:absolute;left:0;top:0;overflow:visible;pointer-events:none;z-index:65}',
      '.dsic-node[data-flash="true"]{animation:dsic-flash 1.1s ease-out 2}',
      '@keyframes dsic-flash{0%{box-shadow:0 0 0 2px var(--dsw-alias-brand-primary),0 0 0 8px color-mix(in srgb,var(--dsw-alias-brand-primary) 26%,transparent)}100%{box-shadow:0 0 0 2px transparent,0 0 0 0 transparent}}',
      '.dsic-note{padding:16px 16px 14px;border-radius:14px;box-shadow:0 8px 22px rgba(15,23,42,.10);font-size:calc(15px * var(--dsic-text-scale,1));line-height:1.45;white-space:pre-wrap;word-break:break-word;overflow:hidden;cursor:grab}',
      '.dsic-node-text-block{padding:2px 2px;font-size:calc(24px * var(--dsic-text-scale,1));line-height:1.3;font-weight:600;white-space:pre-wrap;word-break:break-word;overflow:hidden;cursor:grab}',
      '.dsic-placeholder{opacity:.42;font-style:normal;font-size:calc(15px * var(--dsic-text-scale,1))}',
      '.dsic-shape{display:flex;align-items:center;justify-content:center;box-shadow:0 8px 22px rgba(15,23,42,.08);cursor:grab}',
      '.dsic-shape-text{width:100%;height:100%;display:flex;align-items:center;justify-content:center;text-align:center;padding:14px;box-sizing:border-box;font-size:calc(15px * var(--dsic-text-scale,1));line-height:1.4;white-space:pre-wrap;word-break:break-word;overflow:hidden}',
      '.dsic-frame{border-width:1.5px;border-style:dashed;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 55%,transparent);border-radius:16px}',
      '.dsic-frame-label{position:absolute;left:12px;top:-13px;max-width:70%;padding:1px 9px;border:1px solid transparent;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.dsic-frame-editor{width:150px;height:18px;padding:0;font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden}',
      '.dsic-image{overflow:hidden;border-radius:14px;box-shadow:0 8px 22px rgba(15,23,42,.10);display:flex;align-items:center;justify-content:center}',
      '.dsic-image-el{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}',
      '.dsic-image-empty{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:12px;opacity:.75}',
      '.dsic-image-caption{position:absolute;left:0;right:0;bottom:0;padding:8px 10px;font-size:12px;background:rgba(15,23,42,.35);color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.dsic-node-text{display:block;overflow:hidden}',
      '.dsic-note[data-long="true"]{overflow:auto;cursor:text;padding-right:10px}',
      '.dsic-node-text-block{overflow:auto;cursor:text}',
      '.dsic-axis{border:1px dashed color-mix(in srgb,var(--dsw-alias-label-secondary) 30%,transparent);border-radius:10px;background:color-mix(in srgb,var(--dsw-alias-bg-overlay) 55%,transparent)}',
      '.dsic-axis-title{position:absolute;left:12px;top:8px;padding:2px 10px;border-radius:999px;border:1px solid rgba(34,211,238,.45);background:rgba(8,18,32,.82);color:#a5f3fc;font:700 11px/1.5 ui-monospace,Consolas,monospace;letter-spacing:.06em;text-transform:uppercase;pointer-events:none;z-index:3}',
      '.dsic-axis-line{position:absolute;background:linear-gradient(90deg,transparent,rgba(34,211,238,.9),transparent)}',
      '.dsic-axis[data-orientation="h"] .dsic-axis-line{left:4%;right:4%;top:50%;height:2px;margin-top:-1px}',
      '.dsic-axis[data-orientation="v"] .dsic-axis-line{top:4%;bottom:4%;left:50%;width:2px;margin-left:-1px;background:linear-gradient(180deg,transparent,rgba(34,211,238,.9),transparent)}',
      '.dsic-axis-tick{position:absolute;display:flex;flex-direction:column;align-items:center;transform:translateX(-50%);z-index:2}',
      '.dsic-axis[data-orientation="h"] .dsic-axis-tick{top:50%;margin-top:-2px}',
      '.dsic-axis[data-orientation="v"] .dsic-axis-tick{flex-direction:row;transform:translateY(-50%);left:50%}',
      '.dsic-axis-mark{width:2px;height:10px;background:#22d3ee;border-radius:2px;box-shadow:0 0 8px rgba(34,211,238,.8)}',
      '.dsic-axis[data-orientation="v"] .dsic-axis-mark{width:10px;height:2px}',
      '.dsic-axis-label{margin-top:4px;padding:2px 6px;border-radius:6px;border:1px solid rgba(34,211,238,.35);background:rgba(8,18,32,.8);color:#7dd3fc;font:600 10.5px/1.4 ui-monospace,Consolas,monospace;cursor:pointer;white-space:nowrap}',
      '.dsic-axis-label:hover{background:rgba(34,211,238,.2);color:#e0f2fe}',
      '.dsic-axis[data-orientation="v"] .dsic-axis-label{margin-top:0;margin-left:5px}',
      '.dsic-md{display:flex;flex-direction:column;gap:4px;font-weight:400;line-height:1.5;text-align:left;overflow-wrap:anywhere}',
      '.dsic-md-h{margin:6px 0 2px;font-weight:800;line-height:1.25}',
      '.dsic-md-h1{font-size:1.5em}',
      '.dsic-md-h2{font-size:1.28em}',
      '.dsic-md-h3{font-size:1.12em}',
      '.dsic-md-h4{font-size:1em}',
      '.dsic-md-p{margin:0;white-space:pre-wrap;word-break:break-word}',
      '.dsic-md-list{margin:2px 0;padding-left:1.15em;display:flex;flex-direction:column;gap:2px}',
      '.dsic-md-quote{margin:2px 0;padding-left:8px;border-left:2px solid currentColor;opacity:.78}',
      '.dsic-md-hr{width:100%;border:0;border-top:1px dashed currentColor;opacity:.35;margin:4px 0}',
      '.dsic-md-gap{height:.5em}',
      '.dsic-md code{font-family:ui-monospace,Consolas,monospace;background:rgba(0,0,0,.12);padding:0 3px;border-radius:3px;font-size:.92em}',
      '.dsic-md-link{color:inherit;text-decoration:underline;text-underline-offset:2px;opacity:.85}',
      '.dsic-placeholder{opacity:.42;font-style:normal}',
      '.dsic-editor{width:100%;height:100%;box-sizing:border-box;resize:none;border:none;outline:none;background:transparent;font:inherit;font-size:inherit;line-height:inherit;padding:0;margin:0;color:inherit;overflow:auto;user-select:text}',
      '.dsic-overlay-editor{position:absolute;z-index:60;box-sizing:border-box;margin:0;resize:none;border:1px solid transparent;border-radius:10px;outline:none;background:transparent;color:inherit;font-family:inherit;overflow:auto;white-space:pre-wrap;word-break:break-word;user-select:text;cursor:text;box-shadow:0 0 0 2px var(--dsw-alias-brand-primary),0 10px 26px rgba(15,23,42,.14)}',
      '.dsic-overlay-editor[data-single-line="true"]{white-space:nowrap;overflow:hidden}',
      '.dsic-overlay-editor::placeholder{color:currentColor;opacity:.45}',
      '.dsic-node[data-editing="true"] .dsic-node-text,.dsic-node[data-editing="true"] .dsic-placeholder,.dsic-node[data-editing="true"] .dsic-shape-text,.dsic-node[data-editing="true"] .dsic-frame-label{visibility:hidden}',
      '.dsic-handle{position:absolute;box-sizing:border-box;background:linear-gradient(160deg,#07131b,#030a10);border-style:solid;border-color:#22d3ee;box-shadow:0 0 6px rgba(34,211,238,.9),0 0 14px rgba(168,85,247,.35);pointer-events:auto;z-index:100000;border-radius:2px}',
      '.dsic-handle::after{content:"";position:absolute;left:22%;top:22%;width:56%;height:56%;background:#a5f3fc;box-shadow:0 0 6px #22d3ee;border-radius:1px;opacity:.95;pointer-events:none}',
      '.dsic-handle:hover{background:#22d3ee;box-shadow:0 0 10px #22d3ee,0 0 24px rgba(168,85,247,.65)}',
      '.dsic-handle:hover::after{background:#04121a}',
      '.dsic-selectframe{position:absolute;box-sizing:border-box;pointer-events:none;z-index:99998;border-style:none;background-repeat:no-repeat;background-image:linear-gradient(#22d3ee,#22d3ee),linear-gradient(#22d3ee,#22d3ee),linear-gradient(#22d3ee,#22d3ee),linear-gradient(#22d3ee,#22d3ee),linear-gradient(#22d3ee,#22d3ee),linear-gradient(#22d3ee,#22d3ee),linear-gradient(#22d3ee,#22d3ee),linear-gradient(#22d3ee,#22d3ee),linear-gradient(#a855f7,#a855f7),linear-gradient(#a855f7,#a855f7),linear-gradient(#a855f7,#a855f7),linear-gradient(#a855f7,#a855f7);background-size:var(--dsic-frame-corner,14px) 2px,var(--dsic-frame-corner,14px) 2px,var(--dsic-frame-corner,14px) 2px,var(--dsic-frame-corner,14px) 2px,2px var(--dsic-frame-corner,14px),2px var(--dsic-frame-corner,14px),2px var(--dsic-frame-corner,14px),2px var(--dsic-frame-corner,14px),var(--dsic-frame-corner,14px) 2px,var(--dsic-frame-corner,14px) 2px,var(--dsic-frame-corner,14px) 2px,var(--dsic-frame-corner,14px) 2px;background-position:0 0,100% 0,0 100%,100% 100%,0 0,100% 0,0 100%,100% 100%,0 0,100% 0,0 100%,100% 100%;filter:drop-shadow(0 0 6px rgba(34,211,238,.55))}',
      '.dsic-selectframe::before{content:"";position:absolute;inset:0;border:1px dashed rgba(34,211,238,.62);border-radius:3px;animation:dsic-neonpulse 2.2s ease-in-out infinite;pointer-events:none}',
      '.dsic-selectframe::after{content:"";position:absolute;left:0;right:0;top:-2px;height:2px;background:linear-gradient(90deg,transparent,#22d3ee,#a855f7,transparent);box-shadow:0 0 10px rgba(34,211,238,.9);animation:dsic-framescan 2.8s linear infinite;pointer-events:none}',
      '@keyframes dsic-neonpulse{0%,100%{opacity:.55}50%{opacity:1}}',
      '@keyframes dsic-framescan{0%{transform:translateY(0);opacity:0}8%{opacity:1}92%{opacity:1}100%{transform:translateY(var(--dsic-frame-scan,0px));opacity:0}}',
      '.dsic-create-ghost{position:absolute;border:1.5px dashed var(--dsw-alias-brand-primary);border-radius:12px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,transparent);pointer-events:none}',
      '.dsic-marquee{position:absolute;border:1px solid var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent);border-radius:4px;pointer-events:none}',
      '.dsic-selbar{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-overlay);box-shadow:0 12px 32px rgba(15,23,42,.22);z-index:20;max-width:calc(100% - 32px);overflow-x:auto;scrollbar-width:none}',
      '.dsic-selbar-count{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary);white-space:nowrap}',
      '.dsic-selbar-kind{font-size:11.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap;padding:2px 7px;border-radius:999px;background:var(--dsw-alias-bg-layer-2)}',
      '.dsic-selbar-label{font-size:11.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap}',
      '.dsic-node-plus{display:flex;align-items:center;justify-content:center;padding:0;border-radius:999px;border-style:solid;border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 55%,transparent);background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-brand-primary);cursor:pointer;z-index:100001;box-shadow:0 2px 10px rgba(2,6,23,.28);pointer-events:auto}',
      '.dsic-node-plus:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 16%,var(--dsw-alias-bg-overlay))}',
      '.dsic-node-plus svg{display:block}',
      '.dsic-selbar-colors{display:flex;align-items:center;gap:4px;flex:0 0 auto}',
      '.dsic-selbtn{display:inline-flex;align-items:center;gap:5px;height:30px;padding:0 9px;border-radius:9px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}',
      '.dsic-selbtn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
      '.dsic-selbtn[data-danger="true"]:hover{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 14%,transparent);color:var(--dsw-alias-state-error-primary)}',
      '.dsic-selbtn[data-active="true"]{color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}',
      '.dsic-selbtn-state{font-size:11px;font-weight:700}',
      '.dsic-swatch{width:22px;height:22px;border-radius:7px;border:1px solid transparent;cursor:pointer;padding:0}',
      '.dsic-swatch[data-active="true"]{box-shadow:0 0 0 2px var(--dsw-alias-bg-overlay),0 0 0 4px var(--dsw-alias-brand-primary)}',
      '.dsic-plus{position:absolute;z-index:70;width:26px;height:26px;padding:0;display:flex;align-items:center;justify-content:center;border-radius:50%;border:1.5px solid var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-brand-primary);cursor:pointer;box-shadow:0 6px 16px rgba(15,23,42,.18);transition:transform .12s ease,background .12s ease}',
      '.dsic-plus:hover{transform:scale(1.12);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,var(--dsw-alias-bg-base))}',
      '.dsic-swatch{width:20px;height:20px;border-radius:50%;border:1px solid rgba(19,26,38,.18);cursor:pointer;padding:0;outline:none}',
      '.dsic-swatch[data-active="true"]{box-shadow:0 0 0 2px var(--dsw-alias-brand-primary)}',
      '.dsic-selection-count{font-size:12px;color:var(--dsw-alias-label-secondary);padding:0 4px;white-space:nowrap}',
      '.dsic-empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:5;overflow:auto;padding:18px 0;box-sizing:border-box}',
      '.dsic-empty-card{pointer-events:auto;position:relative;overflow:hidden;max-width:460px;padding:26px 26px 22px;border:1px solid rgba(34,211,238,.5);border-radius:18px;background:linear-gradient(160deg,rgba(6,14,24,.94),rgba(14,10,32,.94));box-shadow:0 0 0 1px rgba(168,85,247,.32),0 0 30px rgba(34,211,238,.25),inset 0 0 46px rgba(168,85,247,.1);text-align:center}',
      '.dsic-empty-card::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(34,211,238,.055) 0 1px,transparent 1px 3px);pointer-events:none;mix-blend-mode:screen}',
      '.dsic-empty-card::after{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:linear-gradient(90deg,transparent,#22d3ee,#a855f7,transparent);box-shadow:0 0 12px rgba(34,211,238,.9);animation:dsic-empty-scan 3.4s linear infinite;pointer-events:none}',
      '@keyframes dsic-empty-scan{0%{transform:translateY(0);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateY(320px);opacity:0}}',
      '.dsic-empty-title{position:relative;font-size:19px;font-weight:700;margin:0 0 8px;display:flex;align-items:center;justify-content:center;gap:8px;color:#e0f2fe;letter-spacing:.02em;text-shadow:0 0 10px rgba(34,211,238,.8),0 0 22px rgba(168,85,247,.4);animation:dsic-empty-glitch 4.2s steps(2) infinite}',
      '@keyframes dsic-empty-glitch{0%,90%,100%{text-shadow:0 0 10px rgba(34,211,238,.8),0 0 22px rgba(168,85,247,.4)}93%{text-shadow:-2px 0 rgba(255,0,200,.85),2px 0 rgba(0,240,255,.85),0 0 16px rgba(34,211,238,.95)}95%{text-shadow:2px 0 rgba(255,0,200,.85),-2px 0 rgba(0,240,255,.85),0 0 16px rgba(34,211,238,.95)}}',
      '.dsic-empty-body{position:relative;white-space:pre-line;margin:0 0 12px;font-size:13px;line-height:1.65;color:#a9bdd4}',
      '.dsic-empty-alias{position:relative;display:block;margin:-2px 0 10px;font:700 19px/1.2 ui-monospace,Consolas,monospace;letter-spacing:.12em;color:#67e8f9;opacity:.92;text-shadow:0 0 10px rgba(34,211,238,.55),0 0 22px rgba(34,211,238,.22)}',
      '.dsic-empty-modes{position:relative;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:7px;margin:2px 0 13px}',
      '.dsic-empty-mode{padding:2px 10px;border-radius:999px;border:1px solid rgba(34,211,238,.34);background:rgba(34,211,238,.09);color:#a5f3fc;font:10.5px/1.7 ui-monospace,Consolas,monospace;letter-spacing:.08em;white-space:nowrap}',
      '.dsic-empty-status{position:relative;display:inline-flex;align-items:center;gap:2px;margin:0 0 14px;font:11px/1.4 ui-monospace,Consolas,monospace;letter-spacing:.06em;color:#67e8f9}',
      '.dsic-empty-status::after{content:"▌";color:#22d3ee;animation:dsic-empty-blink 1.05s steps(1) infinite}',
      '@keyframes dsic-empty-blink{0%,49%{opacity:1}50%,100%{opacity:0}}',
      '.dsic-empty-cta{position:relative;height:40px;padding:0 22px;border:1px solid rgba(34,211,238,.65);border-radius:11px;background:linear-gradient(90deg,rgba(6,182,212,.92),rgba(168,85,247,.92));color:#04121a;font:inherit;font-size:13.5px;font-weight:800;letter-spacing:.02em;cursor:pointer;box-shadow:0 0 18px rgba(34,211,238,.45),0 0 34px rgba(168,85,247,.25)}',
      '.dsic-empty-cta:hover{filter:brightness(1.12);box-shadow:0 0 24px rgba(34,211,238,.7),0 0 44px rgba(168,85,247,.4)}',
      '.dsic-empty .dsic-chip{border:1px solid rgba(34,211,238,.42);background:rgba(34,211,238,.08);color:#a5f3fc;box-shadow:inset 0 0 12px rgba(34,211,238,.12)}',
      '.dsic-empty .dsic-chip:hover{background:rgba(34,211,238,.2);border-color:rgba(34,211,238,.8);box-shadow:0 0 14px rgba(34,211,238,.5)}',
      '.dsic-empty-hint{position:relative;margin:14px 0 0;font:11px/1.5 ui-monospace,Consolas,monospace;color:#7dd3fc;opacity:.9}',
      '.dsic-empty-text-hint{color:#c4b5fd;opacity:.85}',
      '.dsic-empty-boards{position:relative;margin-top:16px;padding-top:14px;border-top:1px solid rgba(34,211,238,.22);text-align:left}',
      '.dsic-empty-sub{margin:0 0 7px;font:11px/1.4 ui-monospace,Consolas,monospace;letter-spacing:.05em;color:#7dd3fc;opacity:.9}',
      '.dsic-empty-boardchips,.dsic-empty-snaps{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}',
      '.dsic-empty-boardchip{max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;height:26px;padding:0 10px;border-radius:8px;border:1px solid rgba(148,163,184,.28);background:rgba(148,163,184,.08);color:#cbd5e1;font:11.5px/1 ui-monospace,Consolas,monospace;cursor:pointer}',
      '.dsic-empty-boardchip:hover{border-color:rgba(34,211,238,.65);color:#a5f3fc;box-shadow:0 0 10px rgba(34,211,238,.3)}',
      '.dsic-empty-boardchip[data-current="true"]{border-color:rgba(34,211,238,.85);background:rgba(34,211,238,.14);color:#e0f2fe;box-shadow:0 0 12px rgba(34,211,238,.38)}',
      '.dsic-empty-newboard,.dsic-empty-savesnap{border-style:dashed;color:#a5f3fc}',
      '.dsic-empty-snap{max-width:210px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;height:26px;padding:0 10px;border-radius:8px;border:1px dashed rgba(168,85,247,.45);background:rgba(168,85,247,.08);color:#ddd6fe;font:11px/1 ui-monospace,Consolas,monospace;cursor:pointer}',
      '.dsic-empty-snap:hover{border-color:rgba(168,85,247,.85);box-shadow:0 0 10px rgba(168,85,247,.35)}',
      '.dsic-panel-sep{height:1px;margin:8px 2px;background:color-mix(in srgb,var(--dsw-alias-border-l1) 80%,transparent)}',
      '.dsic-history-head{margin-top:2px}',
      '.dsic-chips{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:14px}',
      '.dsic-chip{border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;padding:5px 11px;cursor:pointer}',
      '.dsic-chip:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2)}',
      '.dsic-primary{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:34px;padding:0 16px;border:none;border-radius:10px;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);font:inherit;font-size:13px;font-weight:600;cursor:pointer}',
      '.dsic-primary:hover{filter:brightness(1.06)}',
      '.dsic-toast{position:absolute;left:50%;bottom:74px;transform:translateX(-50%);padding:8px 14px;border-radius:10px;background:rgba(20,24,33,.9);color:#fff;font-size:12.5px;z-index:30;pointer-events:none}',
      '.dsic-minimap{position:absolute;right:14px;bottom:14px;width:224px;padding:6px 6px 5px;box-sizing:border-box;border-radius:12px;border:1px solid rgba(34,211,238,.42);background:linear-gradient(160deg,rgba(6,14,24,.92),rgba(14,10,32,.92));box-shadow:0 10px 26px rgba(2,6,23,.5),0 0 16px rgba(34,211,238,.16);z-index:9}',
      '.dsic-minimap-head{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:0 1px 4px;font:10.5px/1.2 ui-monospace,Consolas,monospace;letter-spacing:.08em;color:#7dd3fc}',
      '.dsic-minimap-title{text-transform:uppercase;opacity:.9}',
      '.dsic-minimap-toggle{width:18px;height:16px;padding:0;border:0;border-radius:5px;background:transparent;color:#a5f3fc;font:12px/1 ui-monospace,monospace;cursor:pointer;display:flex;align-items:center;justify-content:center}',
      '.dsic-minimap-toggle:hover{background:rgba(34,211,238,.16)}',
      '.dsic-minimap-svg{display:block;width:100%;height:auto;border-radius:8px;background:radial-gradient(circle at 30% 20%,rgba(34,211,238,.1),transparent 60%),linear-gradient(180deg,rgba(7,12,22,.9),rgba(9,7,20,.9));cursor:crosshair;touch-action:none}',
      '.dsic-minimap-item{rx:1.4}',
      '.dsic-minimap-view{fill:rgba(34,211,238,.1);stroke:#22d3ee;stroke-width:1.4;vector-effect:non-scaling-stroke;filter:drop-shadow(0 0 3px rgba(34,211,238,.55))}',
      '.dsic-minimap-mini{position:absolute;right:14px;bottom:14px;width:34px;height:34px;padding:0;display:flex;align-items:center;justify-content:center;border-radius:10px;border:1px solid rgba(34,211,238,.42);background:linear-gradient(160deg,rgba(6,14,24,.92),rgba(14,10,32,.92));color:#a5f3fc;cursor:pointer;z-index:9;box-shadow:0 8px 20px rgba(2,6,23,.45)}',
      '.dsic-minimap-mini:hover{border-color:rgba(34,211,238,.8);box-shadow:0 0 14px rgba(34,211,238,.35)}',
      '.dsic-sidebar{position:absolute;left:0;top:0;bottom:0;display:flex;align-items:stretch;z-index:12;pointer-events:none}',
      '.dsic-sidebar-rail{pointer-events:auto;width:40px;flex:0 0 auto;display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 0;background:linear-gradient(180deg,rgba(7,12,20,.92),rgba(10,8,22,.92));border-right:1px solid rgba(34,211,238,.22);backdrop-filter:blur(8px)}',
      '.dsic-rail-btn{width:30px;height:30px;padding:0;border-radius:8px;border:1px solid transparent;background:transparent;color:#7dd3fc;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .12s ease,color .12s ease,transform .12s ease}',
      '.dsic-rail-btn:hover{background:rgba(34,211,238,.14);color:#e0f2fe;transform:translateY(-1px)}',
      '.dsic-rail-btn[data-active="true"]{background:rgba(34,211,238,.2);border-color:rgba(34,211,238,.55);color:#a5f3fc;box-shadow:0 0 10px rgba(34,211,238,.25)}',
      '.dsic-rail-toggle{color:#64748b;margin-bottom:4px}',
      '.dsic-sidebar[data-open="false"] .dsic-rail-toggle svg{transform:rotate(180deg)}',
      '.dsic-sidebar-panel{pointer-events:auto;width:292px;flex:0 0 auto;display:flex;flex-direction:column;min-height:0;padding:12px 12px 10px;background:linear-gradient(180deg,rgba(6,12,20,.95),rgba(10,8,22,.95));border-right:1px solid rgba(34,211,238,.28);box-shadow:12px 0 30px rgba(2,6,23,.45);backdrop-filter:blur(10px);overflow:hidden}',
      '.dsic-sidebar-head{font:700 12px/1.3 ui-monospace,Consolas,monospace;letter-spacing:.08em;text-transform:uppercase;color:#a5f3fc;text-shadow:0 0 10px rgba(34,211,238,.45);margin-bottom:6px}',
      '.dsic-sidebar-hint{margin:0 0 8px;font-size:10.5px;line-height:1.5;color:#64748b}',
      '.dsic-sidebar-error{margin:0 0 8px;font-size:11px;line-height:1.5;color:#fca5a5;word-break:break-word}',
      '.dsic-sidebar-empty{margin:6px 0;font-size:11px;line-height:1.6;color:#64748b}',
      '.dsic-vault-path{display:flex;gap:6px;margin-bottom:8px}',
      '.dsic-vault-input{flex:1 1 auto;min-width:0;height:28px;padding:0 8px;border-radius:7px;border:1px solid rgba(148,163,184,.32);background:rgba(15,23,42,.7);color:#e2e8f0;font:10.5px/1.2 ui-monospace,Consolas,monospace;outline:none}',
      '.dsic-vault-input:focus{border-color:#22d3ee}',
      '.dsic-vault-load{height:28px;min-width:52px;padding:0 10px;font-size:11px}',
      '.dsic-vault-list{flex:1 1 auto;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:2px;padding-right:2px}',
      '.dsic-vault-row{display:flex;align-items:center;gap:6px;width:100%;padding:5px 6px;border-radius:7px;border:1px solid transparent;background:transparent;color:#cbd5e1;font:inherit;text-align:left;cursor:pointer}',
      '.dsic-vault-row:hover{background:rgba(34,211,238,.12);border-color:rgba(34,211,238,.32);color:#e0f2fe}',
      '.dsic-vault-row:disabled{opacity:.5;cursor:default}',
      '.dsic-vault-icon{flex:0 0 auto;width:16px;text-align:center;font-size:11px}',
      '.dsic-vault-row[data-kind="canvas"] .dsic-vault-icon{color:#c084fc}',
      '.dsic-vault-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11.5px}',
      '.dsic-vault-meta{flex:0 0 auto;max-width:88px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9.5px;color:#64748b}',
      '.dsic-tag-list{flex:1 1 auto;min-height:0;overflow:auto;display:flex;flex-wrap:wrap;gap:6px;align-content:flex-start}',
      '.dsic-tag-chip{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;border-radius:999px;border:1px solid rgba(34,211,238,.32);background:rgba(34,211,238,.08);color:#a5f3fc;font:10.5px/1 ui-monospace,Consolas,monospace;cursor:pointer}',
      '.dsic-tag-chip:hover{background:rgba(34,211,238,.18);border-color:rgba(34,211,238,.6)}',
      '.dsic-tag-chip[data-active="true"]{background:rgba(34,211,238,.28);border-color:#22d3ee;color:#ecfeff;box-shadow:0 0 10px rgba(34,211,238,.35)}',
      '.dsic-tag-count{font-size:9.5px;color:#67e8f9;opacity:.85}',
      '.dsic-tag-active{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:8px;padding:6px 8px;border-radius:8px;border:1px solid rgba(34,211,238,.3);background:rgba(34,211,238,.08);font-size:10.5px;color:#a5f3fc}',
      '.dsic-tag-active .dsic-ghost{height:24px;padding:0 8px;font-size:10.5px}',
      '.dsic-search-list{flex:1 1 auto;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:3px;margin-top:6px}',
      '.dsic-search-row{display:flex;align-items:flex-start;gap:7px;width:100%;padding:6px 7px;border-radius:7px;border:1px solid transparent;background:transparent;color:#cbd5e1;font:inherit;text-align:left;cursor:pointer}',
      '.dsic-search-row:hover{background:rgba(34,211,238,.12);border-color:rgba(34,211,238,.3)}',
      '.dsic-search-type{flex:0 0 auto;padding:1px 5px;border-radius:5px;border:1px solid rgba(148,163,184,.35);font:9px/1.4 ui-monospace,monospace;color:#94a3b8;text-transform:uppercase}',
      '.dsic-search-snippet{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;line-height:1.5}',
      '.dsic-sidebar-panel > .dsic-vault-input{margin-bottom:8px}',
      '.dsic-sidebar-panel .dsic-ghost{height:26px;padding:0 10px;font-size:11px}',
      '.dsic-links-list{flex:1 1 auto;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:4px}',
      '.dsic-links-group{margin:8px 0 2px;font:700 10px/1.2 ui-monospace,Consolas,monospace;letter-spacing:.08em;text-transform:uppercase;color:#64748b}',
      '.dsic-link-row{display:flex;align-items:center;gap:6px;width:100%;padding:5px 7px;border-radius:7px;border:1px solid transparent;background:transparent;color:#cbd5e1;font:inherit;text-align:left;cursor:pointer}',
      '.dsic-link-row:hover{background:rgba(34,211,238,.12);border-color:rgba(34,211,238,.3);color:#e0f2fe}',
      '.dsic-link-arrow{flex:0 0 auto;color:#22d3ee;font-size:11px}',
      '.dsic-link-label{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}',
      '.dsic-link-target{flex:0 0 auto;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9.5px;color:#67e8f9}',
      '.dsic-axis-insert{height:28px;margin-bottom:8px;font-size:11px;width:100%}',
      '.dsic-axis-list{flex:1 1 auto;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:4px}',
      '.dsic-axis-row{display:flex;align-items:stretch;gap:4px;border-radius:8px;border:1px solid transparent;background:transparent}',
      '.dsic-axis-row:hover{background:rgba(34,211,238,.08);border-color:rgba(34,211,238,.22)}',
      '.dsic-axis-row[data-active="true"]{background:rgba(34,211,238,.14);border-color:rgba(34,211,238,.45)}',
      '.dsic-axis-main{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px;padding:6px 7px;border:0;border-radius:8px;background:transparent;color:#cbd5e1;font:inherit;text-align:left;cursor:pointer}',
      '.dsic-axis-main:hover{background:rgba(34,211,238,.12);color:#e0f2fe}',
      '.dsic-axis-row-title{font-size:11.5px;color:#e0f2fe;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dsic-axis-row-meta{font-size:9.5px;color:#67e8f9;opacity:.9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dsic-axis-row-count{font-size:9.5px;color:#64748b}',
      '.dsic-axis-edit{flex:0 0 auto;align-self:center}',
      '.dsic-graph{position:absolute;inset:0;z-index:58;display:flex;flex-direction:column;background:#040810;background-image:radial-gradient(1100px 640px at 28% 18%,rgba(8,22,38,.97),rgba(4,8,18,.985) 62%),radial-gradient(900px 620px at 82% 92%,rgba(36,14,60,.55),transparent 70%)}',
      '.dsic-graph-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 14px;border-bottom:1px solid rgba(34,211,238,.25);background:linear-gradient(180deg,rgba(7,14,24,.96),rgba(7,14,24,.82))}',
      '.dsic-graph-title{font:700 13px/1.2 ui-monospace,Consolas,monospace;letter-spacing:.08em;color:#a5f3fc;text-transform:uppercase;text-shadow:0 0 10px rgba(34,211,238,.45);margin-right:2px}',
      '.dsic-graph-btn{height:32px;padding:0 12px;border-radius:8px;border:1px solid rgba(148,163,184,.32);background:rgba(15,23,42,.6);color:#cbd5e1;font:12px/1 ui-monospace,Consolas,monospace;cursor:pointer;display:inline-flex;align-items:center;gap:5px}',
      '.dsic-graph-btn:hover{border-color:rgba(34,211,238,.6);color:#e0f2fe}',
      '.dsic-graph-btn[data-active="true"]{background:rgba(34,211,238,.18);border-color:#22d3ee;color:#a5f3fc;box-shadow:0 0 10px rgba(34,211,238,.25)}',
      '.dsic-graph-btn.dsic-graph-back{color:#7dd3fc}',
      '.dsic-graph-btn:disabled{opacity:.45;cursor:default}',
      '.dsic-graph-divider{width:1px;height:20px;background:rgba(148,163,184,.25);margin:0 1px;flex:0 0 auto}',
      '.dsic-graph-search{height:32px;min-width:170px;flex:1 1 170px;max-width:270px;padding:0 12px;border-radius:8px;border:1px solid rgba(34,211,238,.32);background:rgba(8,16,28,.85);color:#e2e8f0;font:12px/1.2 ui-monospace,Consolas,monospace;outline:none}',
      '.dsic-graph-search:focus{border-color:#22d3ee;box-shadow:0 0 12px rgba(34,211,238,.22)}',
      '.dsic-graph-spacer{flex:1 1 auto}',
      '.dsic-graph-body{position:relative;flex:1 1 auto;min-height:0;overflow:hidden}',
      '.dsic-graph-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab}',
      '.dsic-graph-canvas:active{cursor:grabbing}',
      '.dsic-graph-stats{position:absolute;left:14px;bottom:14px;display:flex;align-items:center;gap:12px;padding:7px 12px;border-radius:9px;border:1px solid rgba(34,211,238,.25);background:rgba(6,12,22,.88);font:11px/1.5 ui-monospace,Consolas,monospace;color:#7dd3fc}',
      '.dsic-graph-trunc{color:#f59e0b}',
      '.dsic-graph-legend{position:absolute;right:14px;bottom:14px;display:flex;flex-direction:column;gap:5px;padding:9px 12px;border-radius:9px;border:1px solid rgba(34,211,238,.25);background:rgba(6,12,22,.88);font:11px/1.5 ui-monospace,Consolas,monospace;color:#94a3b8;max-width:250px}',
      '.dsic-graph-legend-title{font:700 11px/1.4 ui-monospace,Consolas,monospace;color:#a5f3fc;letter-spacing:.06em;margin-bottom:2px}',
      '.dsic-graph-legend-row{display:flex;align-items:center;gap:7px}',
      '.dsic-graph-dot{width:9px;height:9px;border-radius:50%;flex:0 0 auto}',
      '.dsic-graph-diamond{width:9px;height:9px;transform:rotate(45deg);flex:0 0 auto;border-radius:1px}',
      '.dsic-graph-line{width:18px;height:0;border-top:2px solid currentColor;flex:0 0 auto}',
      '.dsic-graph-info{position:absolute;top:14px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:10px;max-width:78%;padding:7px 14px;border-radius:999px;border:1px solid rgba(34,211,238,.3);background:rgba(6,14,24,.92);font:12px/1.5 ui-monospace,Consolas,monospace;color:#a5f3fc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}',
      '.dsic-graph-info .dsic-graph-info-label{max-width:300px;overflow:hidden;text-overflow:ellipsis}',
      '.dsic-graph-empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:30px;text-align:center;color:#7dd3fc;font:13px/1.9 ui-monospace,Consolas,monospace;pointer-events:none}',
      '.dsic-graph-empty span{max-width:580px}',
      '.dsic-graph-force{position:absolute;top:58px;right:14px;width:230px;display:flex;flex-direction:column;gap:10px;padding:12px 14px;border-radius:10px;border:1px solid rgba(34,211,238,.35);background:rgba(6,14,24,.97);box-shadow:0 18px 40px rgba(2,6,23,.62);z-index:3}',
      '.dsic-graph-force-row{display:flex;flex-direction:column;gap:4px;font:11px/1.4 ui-monospace,Consolas,monospace;color:#94a3b8}',
      '.dsic-graph-force-row input{width:100%;accent-color:#22d3ee}',
      '.dsic-graph-hint{position:absolute;left:50%;top:14px;transform:translateX(-50%);font:11.5px/1.4 ui-monospace,Consolas,monospace;color:#64748b;pointer-events:none}',
      '.dsic-graph-hint-warn{color:#fbbf24;text-shadow:0 0 12px rgba(251,191,36,.35)}',
      '.dsic-graph-error{position:absolute;left:14px;top:14px;max-width:70%;padding:8px 12px;border-radius:9px;border:1px solid rgba(248,113,113,.45);background:rgba(40,10,16,.92);color:#fca5a5;font:12px/1.55 ui-monospace,Consolas,monospace}',
      '.dsic-quick{position:absolute;inset:0;z-index:60;display:flex;align-items:flex-start;justify-content:center;padding-top:9vh;background:rgba(2,6,16,.55);backdrop-filter:blur(4px)}',
      '.dsic-quick-card{width:min(640px,88vw);max-height:72vh;display:flex;flex-direction:column;padding:12px;border-radius:16px;border:1px solid rgba(34,211,238,.42);background:linear-gradient(165deg,rgba(6,14,24,.98),rgba(12,10,30,.98));box-shadow:0 24px 60px rgba(2,6,23,.7),0 0 26px rgba(34,211,238,.18);overflow:hidden}',
      '.dsic-quick-head{display:flex;align-items:center;gap:8px;padding:2px 4px 10px;color:#a5f3fc}',
      '.dsic-quick-title{font:700 12px/1.3 ui-monospace,Consolas,monospace;letter-spacing:.08em;text-transform:uppercase;text-shadow:0 0 10px rgba(34,211,238,.45)}',
      '.dsic-quick-hint{margin-left:auto;font-size:9.5px;color:#64748b}',
      '.dsic-quick-input{height:38px;padding:0 12px;border-radius:10px;border:1px solid rgba(34,211,238,.4);background:rgba(15,23,42,.75);color:#e2e8f0;font:13px/1.2 ui-monospace,Consolas,monospace;outline:none;margin-bottom:8px}',
      '.dsic-quick-input:focus{border-color:#22d3ee;box-shadow:0 0 14px rgba(34,211,238,.25)}',
      '.dsic-quick-list{flex:1 1 auto;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:2px}',
      '.dsic-quick-row{display:flex;align-items:center;gap:9px;width:100%;padding:7px 9px;border-radius:8px;border:1px solid transparent;background:transparent;color:#cbd5e1;font:inherit;text-align:left;cursor:pointer}',
      '.dsic-quick-row:hover,.dsic-quick-row[data-active="true"]{background:rgba(34,211,238,.14);border-color:rgba(34,211,238,.35);color:#e0f2fe}',
      '.dsic-quick-kind{flex:0 0 auto;min-width:42px;padding:2px 6px;border-radius:5px;border:1px solid rgba(148,163,184,.35);font:9px/1.4 ui-monospace,monospace;color:#94a3b8;text-align:center}',
      '.dsic-quick-label{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}',
      '.dsic-quick-meta{flex:0 0 auto;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9.5px;color:#64748b}',
      '.dsic-hint{position:absolute;left:50%;top:14px;transform:translateX(-50%);padding:6px 12px;border-radius:999px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);font-size:12px;color:var(--dsw-alias-label-secondary);z-index:20}',
      '.dsic-ai{position:absolute;right:16px;top:14px;display:flex;align-items:center;gap:7px;padding:6px 12px;border-radius:999px;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 34%,transparent);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,var(--dsw-alias-bg-overlay));color:var(--dsw-alias-brand-primary);font-size:12px;z-index:20;pointer-events:none}',
      '.dsic-aipending{top:52px;pointer-events:auto;gap:8px}',
      '.dsic-aiopen{pointer-events:auto;padding:3px 10px;font-size:11px;border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 40%,transparent);background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-brand-primary)}',
      '.dsic-dialog{position:absolute;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.28)}',
      '.dsic-dialog-card{width:400px;max-width:88%;padding:18px;border-radius:16px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-overlay);box-shadow:0 24px 60px rgba(15,23,42,.24);overscroll-behavior:contain}',
      '.dsic-dialog-title{font-size:14px;font-weight:600;margin:0 0 10px}',
      '.dsic-input{width:100%;box-sizing:border-box;height:34px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;outline:none}',
      '.dsic-input:focus{border-color:var(--dsw-alias-brand-primary)}',
      '.dsic-dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}',
      '.dsic-settings-card{width:600px;max-width:94%;max-height:84%;overflow:auto;padding:18px 20px 14px}',
      '.dsic-settings-card .dsic-ai-head{margin-bottom:6px}',
      '.dsic-settings-section{margin:14px 0 6px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-brand-primary);opacity:.9}',
      '.dsic-settings-row{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid color-mix(in srgb,var(--dsw-alias-border-l1) 60%,transparent)}',
      '.dsic-settings-row:last-of-type{border-bottom:0}',
      '.dsic-settings-copy{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 auto}',
      '.dsic-settings-label{font-size:12.5px;color:var(--dsw-alias-label-primary)}',
      '.dsic-settings-hint{font-size:10.5px;color:var(--dsw-alias-label-secondary);line-height:1.45}',
      '.dsic-settings-control{display:flex;align-items:center;gap:8px;flex:0 0 auto;justify-content:flex-end}',
      '.dsic-settings-toggle{min-width:52px;height:26px;padding:0 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 80%,transparent);color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;cursor:pointer}',
      '.dsic-settings-toggle:hover{border-color:var(--dsw-alias-brand-primary)}',
      '.dsic-settings-toggle[data-active="true"]{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 55%,transparent);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 16%,transparent);color:var(--dsw-alias-brand-primary)}',
      '.dsic-settings-langs{display:flex;gap:6px}',
      '.dsic-settings-pathwrap{display:flex;align-items:center;gap:8px;max-width:320px;min-width:0}',
      '.dsic-settings-path{display:block;max-width:230px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:10.5px/1.4 ui-monospace,Consolas,monospace;color:var(--dsw-alias-label-secondary)}',
      '.dsic-settings-mode{font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.dsic-settings-builds{display:flex;gap:16px;margin:12px 0 2px;font:10.5px/1.4 ui-monospace,Consolas,monospace;color:var(--dsw-alias-label-secondary);opacity:.85}',
      '.dsic-settings-aihint{margin:0 0 8px}',
      '.dsic-settings-aifields{display:flex;flex-direction:column;gap:7px;margin:4px 0 9px}',
      '.dsic-settings-field{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.dsic-settings-field span{width:82px;flex:0 0 auto}',
      '.dsic-settings-input{flex:1 1 auto;min-width:0;height:30px;padding:0 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:12px/1.2 ui-monospace,Consolas,monospace;outline:none}',
      '.dsic-settings-input:focus{border-color:var(--dsw-alias-brand-primary)}',
      '.dsic-settings-aiactions{display:flex;flex-wrap:wrap;gap:8px;margin-top:2px}',
      '.dsic-settings-airesult{color:var(--dsw-alias-brand-primary)}',
      '.dsic-help-card{width:560px;max-width:92%;max-height:82%;overflow:auto;padding:20px 22px 16px}',
      '.dsic-help-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:4px}',
      '.dsic-help-head .dsic-dialog-title{margin:0}',
      '.dsic-help-section{margin-top:14px}',
      '.dsic-help-section-title{margin:0 0 6px;font-size:13px;font-weight:700;color:var(--dsw-alias-label-primary)}',
      '.dsic-help-list{margin:0;padding-left:18px;color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:1.8}',
      '.dsic-help-list li{margin:2px 0}',
      '.dsic-ghost{height:32px;padding:0 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;cursor:pointer}',
      '.dsic-mode-hint{font-size:11px;color:var(--dsw-alias-label-secondary);opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px}',
      '.dsic-media-card{width:560px;max-width:92%;max-height:84%;overflow:auto}',
      '.dsic-tabs{display:flex;gap:4px;margin:2px 0 12px;padding:3px;border-radius:10px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1)}',
      '.dsic-tab{flex:1 1 0;height:30px;border:none;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;cursor:pointer}',
      '.dsic-tab[data-active="true"]{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-weight:600;box-shadow:0 1px 3px rgba(15,23,42,.12)}',
      '.dsic-field-label{display:block;margin:0 0 6px;font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.dsic-media-limits{margin-top:12px;padding:10px 12px;border-radius:10px;border:1px dashed var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}',
      '.dsic-media-limits-title{display:block;margin-bottom:6px;font-size:11.5px;font-weight:600;color:var(--dsw-alias-label-secondary)}',
      '.dsic-media-limit-line{font-size:11.5px;line-height:1.75;color:var(--dsw-alias-label-secondary)}',
      '.dsic-plan-card{width:540px;max-width:92%;max-height:80%;overflow:auto}',
      '.dsic-plan-list{margin:6px 0 10px;padding-left:18px;color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:1.7}',
      '.dsic-plan-block{margin:10px 0;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}',
      '.dsic-plan-block-title{font-size:11.5px;font-weight:600;color:var(--dsw-alias-label-secondary)}',
      '.dsic-plan-texts{margin:6px 0 0;padding-left:16px;font-size:12px;line-height:1.65;color:var(--dsw-alias-label-primary);max-height:170px;overflow:auto}',
      '.dsic-plan-warn{margin:8px 0 0;font-size:11.5px;color:var(--dsw-alias-state-warn-primary)}',
      '.dsic-agent{display:flex;flex-direction:column;padding:0;background:linear-gradient(155deg,var(--dsw-alias-bg-layer-1),var(--dsw-alias-bg-layer-2));border:1px solid var(--dsic-agent-accent-line,var(--dsw-alias-border-l1));border-radius:16px;box-shadow:0 12px 30px rgba(15,23,42,.22);overflow:visible;cursor:grab;transition:box-shadow .2s ease,transform .12s ease;position:relative}',
      '.dsic-agent-scale{border-radius:16px;overflow:hidden}',
      '.dsic-agent::before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:var(--dsic-agent-accent,#a855f7);opacity:.9;z-index:2}',
      '.dsic-agent:hover{box-shadow:0 16px 36px rgba(15,23,42,.28)}',
      '.dsic-agent[data-status="running"]{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 55%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,transparent),0 16px 38px rgba(15,23,42,.3)}',
      '.dsic-agent[data-status="done"]{border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 42%,transparent)}',
      '.dsic-agent[data-status="failed"]{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 42%,transparent)}',
      '.dsic-agent-head{display:flex;align-items:center;gap:9px;padding:10px 14px;border-bottom:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--dsic-agent-accent,#a855f7) 12%,transparent);border-radius:16px 16px 0 0}',
      '.dsic-agent-avatar{position:relative;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:0 0 auto;box-shadow:0 3px 8px rgba(15,23,42,.28)}',
      '.dsic-agent-avatar-ring{position:absolute;inset:-4px;border-radius:50%;border:2px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 70%,transparent);border-top-color:transparent;animation:dsic-spin 1s linear infinite}',
      '@keyframes dsic-spin{to{transform:rotate(360deg)}}',
      '.dsic-agent-name{font-size:13.5px;font-weight:700;color:var(--dsw-alias-label-primary);flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dsic-agent-status{font-size:11px;padding:2px 10px;border-radius:999px;border:1px solid var(--dsic-agent-accent-line,var(--dsw-alias-border-l1));color:var(--dsw-alias-label-secondary);white-space:nowrap;background:color-mix(in srgb,var(--dsic-agent-accent,#a855f7) 12%,var(--dsw-alias-bg-base))}',
      '.dsic-agent-status[data-status="running"]{color:var(--dsw-alias-state-warn-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 50%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 12%,transparent);animation:dsic-status-pulse 1.6s ease-in-out infinite}',
      '@keyframes dsic-status-pulse{0%,100%{opacity:1}50%{opacity:.6}}',
      '.dsic-agent-status[data-status="done"]{color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 50%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent)}',
      '.dsic-agent-status[data-status="failed"]{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 50%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent)}',
      '.dsic-agent-body{display:flex;flex-direction:column;gap:8px;padding:12px 14px;flex:1 1 auto;overflow:auto;min-height:0}',
      '.dsic-agent-task{font-size:12.5px;line-height:1.65;color:var(--dsw-alias-label-primary);white-space:pre-wrap;word-break:break-word;overflow:hidden;user-select:none}',
      '.dsic-agent[data-size="small"] .dsic-agent-body{padding:8px 10px}',
      '.dsic-agent[data-size="small"] .dsic-agent-foot{padding:6px 10px;gap:6px}',
      '.dsic-agent-task-running{opacity:.72}',
      '.dsic-agent-result{font-size:12px;line-height:1.6;padding:7px 10px;border-radius:9px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical}',
      '.dsic-agent-result[data-status="done"]{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent)}',
      '.dsic-agent-result[data-status="failed"]{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent)}',
      '.dsic-agent-meta-line{font-size:11px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}',
      '.dsic-agent-typing{display:flex;gap:5px;align-items:center;height:14px}',
      '.dsic-agent-typing span{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-brand-primary);animation:dsic-typing 1.1s ease-in-out infinite}',
      '.dsic-agent-typing span:nth-child(2){animation-delay:.16s}',
      '.dsic-agent-typing span:nth-child(3){animation-delay:.32s}',
      '@keyframes dsic-typing{0%,80%,100%{transform:translateY(0);opacity:.45}40%{transform:translateY(-4px);opacity:1}}',
      '.dsic-agent-empty{display:flex;align-items:center;gap:12px;padding:14px;border:1px dashed var(--dsw-alias-border-l2);border-radius:12px;background:color-mix(in srgb,var(--dsw-alias-bg-base) 55%,transparent);flex:1 1 auto;min-height:0;overflow:hidden}',
      '.dsic-agent-empty-emoji{font-size:28px;line-height:1;animation:dsic-float 3s ease-in-out infinite}',
      '@keyframes dsic-float{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-4px) rotate(4deg)}}',
      '.dsic-agent-empty-copy{min-width:0;flex:1 1 auto}',
      '.dsic-agent-quip{font-size:13.5px;font-weight:600;color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.dsic-agent-hint{margin-top:4px;font-size:11px;color:var(--dsw-alias-label-secondary)}',
      '.dsic-agent-foot{display:flex;align-items:center;gap:8px;padding:8px 12px;border-top:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);font-size:11px;background:color-mix(in srgb,var(--dsw-alias-bg-base) 32%,transparent);border-radius:0 0 16px 16px}',
      '.dsic-agent-meta{flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dsic-agent-project{display:flex;align-items:center;gap:6px;margin:0 12px 8px;min-height:18px;overflow:hidden}',
      '.dsic-agent-project-name,.dsic-agent-parent{display:inline-flex;align-items:center;max-width:100%;padding:2px 7px;border-radius:999px;border:1px solid color-mix(in srgb,var(--dsic-agent-accent,#a855f7) 45%,transparent);background:color-mix(in srgb,var(--dsic-agent-accent,#a855f7) 14%,transparent);color:color-mix(in srgb,var(--dsic-agent-accent,#a855f7) 55%,#ffffff);font-size:10.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.dsic-agent-parent{border-style:dashed;color:var(--dsw-alias-label-secondary);background:transparent}',
      '.dsic-agent-children{flex:0 0 auto;padding:2px 6px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 16%,transparent);color:var(--dsw-alias-label-primary);font-size:10px;font-weight:600}',
      '.dsic-agent-delegate,.dsic-agent-runchildren{display:inline-flex;align-items:center;gap:4px;height:26px;padding:0 8px;border-radius:8px;border:1px dashed color-mix(in srgb,var(--dsic-agent-accent,#a855f7) 55%,transparent);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer;flex:0 0 auto;transition:transform .12s ease,background .12s ease}',
      '.dsic-agent-delegate:hover,.dsic-agent-runchildren:hover{background:color-mix(in srgb,var(--dsic-agent-accent,#a855f7) 18%,transparent);color:var(--dsw-alias-label-primary);transform:translateY(-1px)}',
      '.dsic-agent-runchildren{border-style:solid}',
      '.dsic-delegate-card{width:min(520px,88vw)}',
      '.dsic-delegate-parent{flex:1 1 auto;text-align:right;font-size:11px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dsic-delegate-input{min-height:110px}',
      '.dsic-agent-run{display:inline-flex;align-items:center;gap:4px;height:26px;padding:0 10px;border-radius:8px;border:1px solid color-mix(in srgb,var(--dsic-agent-accent,#a855f7) 55%,transparent);background:color-mix(in srgb,var(--dsic-agent-accent,#a855f7) 20%,var(--dsw-alias-bg-base));color:color-mix(in srgb,var(--dsic-agent-accent,#a855f7) 70%,#ffffff);font:inherit;font-size:11px;font-weight:600;cursor:pointer;flex:0 0 auto;transition:transform .12s ease,background .12s ease}',
      '.dsic-agent-run:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 28%,var(--dsw-alias-bg-base));transform:translateY(-1px)}',
      '.dsic-agent[data-status="running"] .dsic-agent-run{opacity:.4;pointer-events:none}',
      '.dsic-agent[data-status="done"] .dsic-agent-run{border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 45%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 14%,var(--dsw-alias-bg-base));color:var(--dsw-alias-state-success-primary)}',
      '.dsic-agent[data-status="failed"] .dsic-agent-run{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 45%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 14%,var(--dsw-alias-bg-base));color:var(--dsw-alias-state-error-primary)}',
      '.dsic-node[data-editing="true"] .dsic-agent-task,.dsic-node[data-editing="true"] .dsic-agent-empty{visibility:hidden}',
      '.dsic-agent-role{display:flex;align-items:center;gap:6px;margin:0 12px 9px;padding:6px 9px;border-radius:9px;border:1px dashed var(--dsw-alias-border-l2);background:color-mix(in srgb,var(--dsw-alias-bg-base) 42%,transparent);color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer;overflow:hidden;text-align:left;flex:0 0 auto}',
      '.dsic-agent-role:hover{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 60%,transparent);color:var(--dsw-alias-label-primary)}',
      '.dsic-agent-role-icon{flex:0 0 auto}',
      '.dsic-agent-role-text{flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dsic-agent-role-edit{flex:0 0 auto;opacity:.65}',
      '.dsic-agent-role-empty{justify-content:center;border-style:dashed}',
      '.dsic-role-card{width:620px;max-width:94%;max-height:86%;overflow:auto}',
      '.dsic-role-toolbar{display:flex;justify-content:flex-end;margin:0 0 8px}',
      '.dsic-role-example{height:28px;padding:0 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;cursor:pointer}',
      '.dsic-role-example:hover{color:var(--dsw-alias-label-primary);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 55%,transparent)}',
      '.dsic-role-input{width:100%;box-sizing:border-box;min-height:220px;max-height:42vh;resize:vertical;padding:11px 12px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;line-height:1.6;outline:none;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable}',
      '.dsic-role-input:focus{border-color:var(--dsw-alias-brand-primary)}',
      '.dsic-role-hint{margin:8px 0 0;font-size:11.5px;line-height:1.6;color:var(--dsw-alias-label-secondary)}',
      '.dsic-prompt-card{width:780px;max-width:94%;max-height:88%;overflow:auto}',
      '.dsic-prompt-body{display:flex;gap:14px;margin-top:12px;min-height:0}',
      '.dsic-prompt-list{display:flex;flex-direction:column;gap:8px;width:240px;flex:0 0 auto;min-height:0}',
      '.dsic-prompt-search{height:32px;font-size:12px}',
      '.dsic-prompt-new{height:30px;border-radius:8px;border:1px dashed var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer;flex:0 0 auto}',
      '.dsic-prompt-new:hover{color:var(--dsw-alias-label-primary);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,transparent)}',
      '.dsic-prompt-items{display:flex;flex-direction:column;gap:4px;overflow-y:auto;max-height:44vh;min-height:60px;overscroll-behavior:contain}',
      '.dsic-prompt-empty{font-size:11.5px;line-height:1.6;color:var(--dsw-alias-label-secondary);padding:8px 2px}',
      '.dsic-prompt-item{display:flex;flex-direction:column;gap:2px;padding:7px 9px;border-radius:8px;border:1px solid transparent;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer;overflow:hidden;flex:0 0 auto}',
      '.dsic-prompt-item:hover{border-color:var(--dsw-alias-border-l2)}',
      '.dsic-prompt-item[data-active="true"]{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 55%,transparent);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}',
      '.dsic-prompt-item-name{font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dsic-prompt-item-preview{font-size:10.5px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dsic-prompt-examples{height:28px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;cursor:pointer;flex:0 0 auto}',
      '.dsic-prompt-examples:hover{color:var(--dsw-alias-label-primary)}',
      '.dsic-prompt-editor{display:flex;flex-direction:column;flex:1 1 auto;min-width:0}',
      '.dsic-field-label-gap{margin-top:10px}',
      '.dsic-prompt-input{width:100%;box-sizing:border-box;min-height:190px;max-height:38vh;resize:vertical;padding:10px 12px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;line-height:1.6;outline:none;overflow-y:auto;overscroll-behavior:contain}',
      '.dsic-prompt-input:focus{border-color:var(--dsw-alias-brand-primary)}',
      '.dsic-prompt-editor-actions{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}',
      '.dsic-prompt-generate{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 42%,transparent);color:var(--dsw-alias-brand-primary)}',
      '.dsic-prompt-generate:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 22%,transparent)}',
      '.dsic-skin-card{width:680px;max-width:94%;max-height:88%;overflow:auto}',
      '.dsic-skin-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:8px}',
      '.dsic-skin-item{display:flex;flex-direction:column;gap:6px;padding:6px;border-radius:12px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);cursor:pointer;font:inherit;color:var(--dsw-alias-label-secondary)}',
      '.dsic-skin-item:hover{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}',
      '.dsic-skin-item[data-active="true"]{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 60%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,transparent);color:var(--dsw-alias-label-primary)}',
      '.dsic-skin-thumb{display:flex;align-items:center;justify-content:center;position:relative;width:100%;height:84px;border-radius:8px;border:1px solid rgba(148,163,184,.18);overflow:hidden}',
      '.dsic-skin-thumb-glyph{font-size:32px;line-height:1;filter:drop-shadow(0 2px 8px rgba(0,0,0,.5));user-select:none}',
      '.dsic-decor-grid{margin-bottom:2px}',
      '.dsic-decor-hint{margin:0 0 6px}',
      '.dsic-decor-item .dsic-skin-thumb{background-size:cover}',
      '.dsic-decor-sg{position:absolute;right:18px;top:14px;z-index:4;pointer-events:none;display:flex;flex-direction:column;align-items:flex-end;gap:3px;font-family:ui-monospace,Consolas,monospace;color:#fbbf24;text-shadow:0 0 8px rgba(251,191,36,.55);opacity:.9;mix-blend-mode:screen}',
      '.dsic-decor-sg::after{content:"";position:absolute;inset:-10px -18px;background:repeating-linear-gradient(0deg,rgba(251,191,36,.06) 0 1px,transparent 1px 3px);pointer-events:none;animation:dsic-decor-sg-flick 4.2s steps(2) infinite}',
      '@keyframes dsic-decor-sg-flick{0%,100%{opacity:.45}48%{opacity:.8}52%{opacity:.3}56%{opacity:.7}}',
      '.dsic-decor-sg-head{font-size:8px;letter-spacing:.24em;color:#f59e0b;opacity:.75}',
      '.dsic-decor-sg-nixie{display:flex;align-items:center;gap:2px}',
      '.dsic-decor-sg-cell{min-width:12px;padding:1px 3px;border-radius:3px;background:rgba(30,16,4,.78);border:1px solid rgba(251,191,36,.3);font-size:15px;font-weight:700;text-align:center;color:#fde68a;box-shadow:inset 0 0 8px rgba(251,191,36,.25),0 0 6px rgba(251,191,36,.18)}',
      '.dsic-decor-sg-dot{min-width:6px;padding:0;border:none;background:transparent;box-shadow:none;font-size:13px;opacity:.7}',
      '.dsic-decor-sg-nixie[data-rolling="true"] .dsic-decor-sg-cell{animation:dsic-decor-sg-roll .32s ease-in-out infinite alternate}',
      '@keyframes dsic-decor-sg-roll{from{transform:translateY(-1px);opacity:.55}to{transform:translateY(1px);opacity:1}}',
      '.dsic-decor-sg-caption{font-size:8px;letter-spacing:.16em;color:#f59e0b;opacity:.7}',
      '.dsic-decor-sg-tags{display:flex;gap:8px;font-size:7.5px;letter-spacing:.12em;color:#fbbf24;opacity:.55;justify-content:flex-end}',
      '.dsic-skin-name{font-size:11.5px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dsic-skin-custom{display:flex;align-items:center;gap:12px;margin-top:8px;padding:10px;border-radius:12px;border:1px dashed var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}',
      '.dsic-skin-custom-thumb{width:88px;height:56px;border-radius:8px;background-size:cover;background-position:center;border:1px solid rgba(148,163,184,.2);flex:0 0 auto}',
      '.dsic-skin-custom-empty{width:88px;height:56px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-layer-2);font-size:20px;flex:0 0 auto}',
      '.dsic-skin-custom-copy{min-width:0;flex:1 1 auto}',
      '.dsic-skin-custom-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary)}',
      '.dsic-skin-custom-hint{font-size:11px;color:var(--dsw-alias-label-secondary);margin-top:2px;line-height:1.5}',
      '.dsic-bigeditor{position:absolute;inset:0;z-index:300;display:flex;align-items:center;justify-content:center;background:rgba(3,7,18,.55);padding:24px}',
      '.dsic-bigeditor-card{display:flex;flex-direction:column;width:min(900px,94%);height:min(680px,86%);border-radius:16px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-overlay);box-shadow:0 24px 60px rgba(2,6,23,.5);overflow:hidden}',
      '.dsic-bigeditor-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--dsw-alias-border-l1)}',
      '.dsic-bigeditor-title{font-size:14px;font-weight:700;color:var(--dsw-alias-label-primary)}',
      '.dsic-bigeditor-close{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}',
      '.dsic-bigeditor-close:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
      '.dsic-bigeditor-hint{margin:8px 18px 0;font-size:11.5px;color:var(--dsw-alias-label-secondary)}',
      '.dsic-bigeditor-input{flex:1 1 auto;min-height:0;margin:10px 18px;padding:12px 14px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:13.5px;line-height:1.65;resize:none;outline:none;overflow-y:auto;overscroll-behavior:contain}',
      '.dsic-bigeditor-input:focus{border-color:var(--dsw-alias-brand-primary)}',
      '.dsic-bigeditor-foot{display:flex;align-items:center;gap:10px;justify-content:flex-end;padding:12px 18px;border-top:1px solid var(--dsw-alias-border-l1)}',
      '.dsic-bigeditor-count{margin-right:auto;font-size:11.5px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}',
      '.dsic-danger{color:var(--dsw-alias-state-error-primary)}',
      '@media (max-width:720px){.dsic-prompt-body{flex-direction:column}.dsic-prompt-list{width:100%}}',
    ].join('\n');

    /* ------------------------------------------------------------------ *
     * canvas panel
     * ------------------------------------------------------------------ */
    function rectFromPoints(a, b) {
      return {
        x: Math.min(a.x, b.x),
        y: Math.min(a.y, b.y),
        w: Math.abs(a.x - b.x),
        h: Math.abs(a.y - b.y),
      };
    }

    /**
     * Layout base used for proportional content scaling. Once a node has been
     * resized the base is remembered in item.meta.sizeBase; for untouched or legacy
     * cards the smaller of the card and its type default is used, which keeps old
     * cards visually unchanged while oversized cards scale their text up.
     */
    function contentBaseOf(item) {
      const base = item?.meta?.sizeBase;
      const w = Number(base?.w);
      const h = Number(base?.h);
      if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) return { w, h };
      const typeDefault = DEFAULT_SIZE[item?.type] ?? { w: item?.w ?? 1, h: item?.h ?? 1 };
      return {
        w: Math.max(1, Math.min(Number(item?.w) || typeDefault.w, typeDefault.w)),
        h: Math.max(1, Math.min(Number(item?.h) || typeDefault.h, typeDefault.h)),
      };
    }

    /** Uniform content scale (fonts, padding) that follows the node's w/h. */
    function contentScaleOf(item, rect) {
      const base = contentBaseOf(item);
      const w = Number(rect?.w ?? item?.w) || base.w;
      const h = Number(rect?.h ?? item?.h) || base.h;
      // Sticky notes and document cards scale with their WIDTH only: growing the
      // height (long text / auto height) must not make the type gigantic, which
      // used to force one character per line in tall cards.
      if (item?.type === 'note' || item?.type === 'text') {
        const widthRatio = w / base.w;
        return Math.min(4, Math.max(0.35, Math.round(widthRatio * 1000) / 1000));
      }
      // Linear scale: a card dragged N× bigger gets N× bigger type, so resizing
      // and text size stay in sync for Agents as well as shapes/frames.
      const ratio = Math.sqrt((w / base.w) * (h / base.h));
      return Math.min(20, Math.max(0.3, Math.round(ratio * 1000) / 1000));
    }

    function resizedRect(original, dir, dx, dy) {
      let x = original.x;
      let y = original.y;
      let w = original.w;
      let h = original.h;
      if (dir.indexOf('e') >= 0) w = original.w + dx;
      if (dir.indexOf('s') >= 0) h = original.h + dy;
      if (dir.indexOf('w') >= 0) {
        x = original.x + dx;
        w = original.w - dx;
      }
      if (dir.indexOf('n') >= 0) {
        y = original.y + dy;
        h = original.h - dy;
      }
      if (w < 40) {
        if (dir.indexOf('w') >= 0) x = original.x + original.w - 40;
        w = 40;
      }
      if (h < 40) {
        if (dir.indexOf('n') >= 0) y = original.y + original.h - 40;
        h = 40;
      }
      return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
    }

    function sampleItems() {
      const now = new Date().toISOString();
      const mk = (type, text, x, y, extra) => {
        const dims = DEFAULT_SIZE[type] ?? { w: 240, h: 160 };
        return Object.assign(
          {
            id: newLocalId('n'),
            type,
            x,
            y,
            w: dims.w,
            h: dims.h,
            z: 1,
            text,
            color: DEFAULT_COLOR[type] ?? 'yellow',
            by: 'user',
            createdAt: now,
            updatedAt: now,
          },
          extra || {},
        );
      };
      const idea = mk('note', '想法：让通用画布和我一起在白板上思考', 0, 0, { color: 'yellow', z: 3 });
      const step1 = mk('note', '① 双击便签写下目标\n② 拖动画布整理思路', 300, 0, { color: 'blue', z: 3 });
      const step2 = mk('note', '③ 在下方输入框对通用画布说：\n「读一下画板，把这些想法拆成 5 张便签」', 600, 0, { color: 'green', z: 3 });
      const frame = mk('frame', '示例画板', -40, -90, { w: 960, h: 400, color: 'gray', z: 1 });
      const note = mk('text', '画板对 AI 是开放的：它可以读、可以写、也可以把结果连起来。', -40, 340, {
        w: 520,
        h: 70,
        color: 'white',
        z: 2,
      });
      const e1 = mk('edge', '', 0, 0, { from: idea.id, to: step1.id, z: 2 });
      const e2 = mk('edge', '', 0, 0, { from: step1.id, to: step2.id, z: 2 });
      return [frame, idea, step1, step2, note, e1, e2];
    }

    function CanvasPanel() {
      const storeState = useStore();
      const doc = storeState.doc;
      const t = useT();
      const lang = useLang();
      const [tool, setTool] = useState('select');
      const [selection, setSelection] = useState([]);
      const [editingId, setEditingId] = useState(null);
      const [draft, setDraft] = useState('');
      const [connectFrom, setConnectFrom] = useState(null);
      const [viewport, setViewport] = useState(() => (store.view ? { ...store.view } : { cx: 0, cy: 0, zoom: 1 }));
      const [size, setSize] = useState({ w: 1280, h: 760 });
      const [dragDraft, setDragDraft] = useState(null);
      const [resizeDraft, setResizeDraft] = useState(null);
      const [createDraft, setCreateDraft] = useState(null);
      const [dragLink, setDragLink] = useState(null);
      const [motionUnused] = useState(false);
      const [marquee, setMarquee] = useState(null);
      const [penDraft, setPenDraft] = useState(null);
      const [hoveredEdge, setHoveredEdge] = useState(null);
      const [toast, setToast] = useState(null);
      const [imageDialog, setImageDialog] = useState(false);
      const [mediaOpen, setMediaOpen] = useState(false);
      const [mediaBusy, setMediaBusy] = useState(false);
      const [mediaKind, setMediaKind] = useState('image');
      const [mediaPromptText, setMediaPromptText] = useState('');
      const [mediaStyle, setMediaStyle] = useState('poster');
      const [mediaGifStyle, setMediaGifStyle] = useState('waves');
      const [mediaRatio, setMediaRatio] = useState('wide');
      const [roleEditor, setRoleEditor] = useState(null);
      const [delegateFor, setDelegateFor] = useState(null);
      const [delegateText, setDelegateText] = useState('');
      const [delegateBusy, setDelegateBusy] = useState(false);
      const [childrenRun, setChildrenRun] = useState(null);
      const [promptLib, setPromptLib] = useState(() => loadPrompts());
      const [promptOpen, setPromptOpen] = useState(null);
      const [skin, setSkin] = useState(() => loadSkin());
      const [decor, setDecor] = useState(() => loadDecor());
      const [skinOpen, setSkinOpen] = useState(false);
      const [projectsOpen, setProjectsOpen] = useState(false);
      const [projectsAnchor, setProjectsAnchor] = useState(null);
      const [boardsOpen, setBoardsOpen] = useState(false);
      const [boardsAnchor, setBoardsAnchor] = useState(null);
      const [boardList, setBoardList] = useState([]);
      const [boardsBusy, setBoardsBusy] = useState(false);
      const [historyList, setHistoryList] = useState([]);
      const [historyBusy, setHistoryBusy] = useState(false);
      const [pathDialog, setPathDialog] = useState(null);
      const [placeMarker, setPlaceMarker] = useState(null);
      const [frameCarry, setFrameCarry] = useState(() => loadFrameCarry());
      const frameCarryRef = useRef(false);
      frameCarryRef.current = frameCarry;
      const [modelOpen, setModelOpen] = useState(false);
      const [modelCatalogData, setModelCatalogData] = useState(null);
      const [modelBusy, setModelBusy] = useState(false);
      const [modelSel, setModelSel] = useState(() => loadModelChoice());
      const [providerEditor, setProviderEditor] = useState(null);
      const [providerBusy, setProviderBusy] = useState(false);
      const [providerTest, setProviderTest] = useState(null);
      const [bigEditor, setBigEditor] = useState(null);
      const [divergence, setDivergence] = useState('1.048596');
      const [nixieRolling, setNixieRolling] = useState(false);
      const [helpOpen, setHelpOpen] = useState(false);
      const [settingsOpen, setSettingsOpen] = useState(false);
      const [axisDialog, setAxisDialog] = useState(null);
      const [settingsInfo, setSettingsInfo] = useState(null);
      const [settingsBusy, setSettingsBusy] = useState(false);
      const [settingsAi, setSettingsAi] = useState({ baseUrl: '', model: '', key: '', testing: false, result: '' });
      const [sidebarOpen, setSidebarOpen] = useState(() => loadSidebarOpen());
      const [sidebarTab, setSidebarTab] = useState('vault');
      const [vaultPath, setVaultPath] = useState(() => loadVaultPath());
      const [vaultInput, setVaultInput] = useState(() => loadVaultPath());
      const [vaultFiles, setVaultFiles] = useState([]);
      const [vaultBusy, setVaultBusy] = useState(false);
      const [vaultError, setVaultError] = useState('');
      const [vaultTruncated, setVaultTruncated] = useState(false);
      const [tagFilter, setTagFilter] = useState('');
      const [searchQuery, setSearchQuery] = useState('');
      const [globalTags, setGlobalTags] = useState(null);
      const [globalSearch, setGlobalSearch] = useState(null);
      const [searchBusy, setSearchBusy] = useState(false);
      const [tagInput, setTagInput] = useState('');
      const [linkInput, setLinkInput] = useState('');
      const [quickOpen, setQuickOpen] = useState(false);
      const [quickQuery, setQuickQuery] = useState('');
      const [quickIndex, setQuickIndex] = useState(0);
      const [graphOpen, setGraphOpen] = useState(false);
      const [graphScope, setGraphScope] = useState(() => (loadVaultPath() !== '' ? 'vault' : 'all'));
      const [graphData, setGraphData] = useState(null);
      const [graphBusy, setGraphBusy] = useState(false);
      const [graphError, setGraphError] = useState('');
      const [graphShowTags, setGraphShowTags] = useState(true);
      const [graphHideOrphans, setGraphHideOrphans] = useState(false);
      const [graphNonce, setGraphNonce] = useState(0);
      const [minimapOpen, setMinimapOpen] = useState(() => loadMinimapOpen());
      const [aiDialog, setAiDialog] = useState(false);
      const [aiPrompt, setAiPrompt] = useState('');
      const [aiScope, setAiScope] = useState('canvas');
      const [aiPending, setAiPending] = useState(null);
      const [aiBusy, setAiBusy] = useState(false);
      const [aiMode, setAiMode] = useState('ask');
      const [pendingPlan, setPendingPlan] = useState(null);
      const [spaceDown, setSpaceDown] = useState(false);
      const [panning, setPanning] = useState(false);
      const [, forceFlash] = useState(0);

      const stageRef = useRef(null);
      const projectBtnRef = useRef(null);
      const boardsBtnRef = useRef(null);
      const minimapSvgRef = useRef(null);
      const minimapDraggingRef = useRef(false);
      const gestureRef = useRef(null);
      const viewportRef = useRef(viewport);
      const animRef = useRef(0);
      // Last canvas point the user clicked: opening the Agent tool / Agent dialog
      // anchors there, so new work never detaches from that spot.
      const lastCanvasPointRef = useRef(null);
      const viewportReportRef = useRef(null);
      const toastTimer = useRef(null);
      const editingRef = useRef({ id: null, value: '' });
      const lastTapRef = useRef({ time: 0, x: 0, y: 0, nodeId: null });
      const hostWarnedRef = useRef(false);
      const pendingPlanRef = useRef(null);
      const roleEditorRef = useRef(null);
      viewportRef.current = viewport;
      editingRef.current = { id: editingId, value: draft };
      roleEditorRef.current = roleEditor;
      pendingPlanRef.current = pendingPlan;

      const showToast = useCallback((text) => {
        setToast(text);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 2200);
      }, []);

      useEffect(
        () => () => {
          if (toastTimer.current) clearTimeout(toastTimer.current);
          animRef.current += 1;
        },
        [],
      );

      // announce the bundle build once per page session so a stale plug-in build is obvious
      useEffect(() => {
        try {
          if (sessionStorage.getItem('dsic-build') === CLIENT_BUILD) return;
          sessionStorage.setItem('dsic-build', CLIENT_BUILD);
          showToast(t('buildLoaded', { v: CLIENT_BUILD }));
        } catch (error) {
          /* private mode: skip the announcement */
        }
      }, [showToast, t]);

      // the Host half cannot hot-reload in the desktop app: warn once when the client is newer
      useEffect(() => {
        if (!store.hostStale || hostWarnedRef.current) return;
        hostWarnedRef.current = true;
        showToast(t('hostStaleHint'));
      }, [store.hostStale, storeState.rev, showToast, t]);

      // watch one generation request: clear the pending chip when AI changes land, or warn
      // after a while that nothing arrived (the conversation may have run without canvas tools)
      useEffect(() => {
        if (!aiPending) return undefined;
        if (store.aiAt > aiPending.at) {
          setAiPending(null);
          return undefined;
        }
        const timer = setTimeout(() => {
          setAiPending((current) => (current && current.at === aiPending.at ? null : current));
          showToast(t('aiNoChange'));
        }, 150000);
        return () => clearTimeout(timer);
      }, [aiPending, store.aiAt, t, showToast]);

      /* ---- text editing: one screen-space overlay editor ---- */
      const editFieldOf = (item) => (item.type === 'agent' ? 'task' : 'text');
      const editValueOf = (item) => (item.type === 'agent' ? item.task ?? '' : item.text ?? '');
      const startEditing = useCallback((id, seed) => {
        const item = store.doc.items[id];
        if (!item || item.type === 'edge' || item.type === 'image' || item.type === 'stroke') return;
        if (item.type === 'axis') {
          openAxisDialog(item);
          return;
        }
        // Agent cards never use the inline overlay (screen-space editors can float
        // away from the card); they always open the standalone large panel.
        if (item.type === 'agent') {
          openBigEditor(id);
          return;
        }
        // Long-form text is unreadable in the small inline editor: use the big panel.
        if (isLongCardText(editValueOf(item))) {
          openBigEditor(id);
          return;
        }
        const current = editValueOf(item);
        const value = seed !== undefined && current === '' ? seed : current;
        editingRef.current = { id, value };
        setSelection([id]);
        setDraft(value);
        setEditingId(id);
      }, []);

      const finishEditing = useCallback((commitDraft) => {
        const current = editingRef.current;
        editingRef.current = { id: null, value: '' };
        setEditingId(null);
        setDraft('');
        if (!commitDraft || !current.id) return;
        const item = store.doc.items[current.id];
        if (!item || editValueOf(item) === current.value) return;
        patchItem(current.id, item.type === 'agent' ? { task: current.value } : { text: current.value });
      }, []);

      /** Standalone large editor (used for Agent task text; no canvas-coordinate math). */
      const openBigEditor = useCallback((id) => {
        const item = store.doc.items[id];
        if (!item || item.type === 'edge' || item.type === 'stroke') return;
        setSelection([id]);
        setBigEditor({ id, field: item.type === 'agent' ? 'task' : 'text', value: editValueOf(item) });
      }, []);

      /* ---- axis (number line / timeline) ---- */
      const openAxisDialog = useCallback((item) => {
        const config = item?.meta?.axis ?? { orientation: 'h', min: 0, max: 10, step: 1, unit: '', title: '' };
        setAxisDialog({
          id: item?.id ?? null,
          title: item?.text ?? config.title ?? '',
          orientation: config.orientation ?? 'h',
          min: String(config.min ?? 0),
          max: String(config.max ?? 10),
          step: String(config.step ?? 1),
          unit: config.unit ?? '',
        });
      }, []);

      const saveAxisDialog = useCallback(() => {
        const form = axisDialog;
        if (!form) return;
        const min = Number(form.min);
        const max = Number(form.max);
        if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
          showToast(t('axisInvalid'));
          return;
        }
        const axis = {
          orientation: form.orientation === 'v' ? 'v' : 'h',
          min,
          max,
          step: Number(form.step) > 0 ? Number(form.step) : (max - min) / 10,
          unit: String(form.unit ?? ''),
          title: String(form.title ?? ''),
        };
        if (form.id) {
          patchItem(form.id, { text: String(form.title ?? '') || t('axis'), meta: { axis } });
        } else {
          const item = {
            id: newLocalId('n'),
            type: 'axis',
            x: Math.round(viewportRef.current.cx - 600),
            y: Math.round(viewportRef.current.cy - 75),
            w: 1200,
            h: 150,
            text: String(form.title ?? '') || t('axis'),
            color: 'gray',
            meta: { axis },
          };
          commit([{ op: 'upsert', item }]);
          setSelection([item.id]);
        }
        setAxisDialog(null);
      }, [axisDialog, commit, patchItem, setSelection, showToast, t]);

      const addCardAtAxisTick = useCallback(
        (axisItem, tick) => {
          if (!axisItem || !tick) return;
          const config = axisItem.meta?.axis ?? {};
          const horizontal = config.orientation !== 'v';
          const pct = Math.max(0, Math.min(100, Number(tick.pct) || 0)) / 100;
          const item = {
            id: newLocalId('n'),
            type: 'note',
            x: Math.round(horizontal ? axisItem.x + axisItem.w * pct - 120 : axisItem.x + axisItem.w + 30),
            y: Math.round(horizontal ? axisItem.y - 218 : axisItem.y + axisItem.h * pct - 84),
            w: 240,
            h: 168,
            text: String(tick.label ?? ''),
            color: 'yellow',
            meta: { axisValue: tick.value, axisId: axisItem.id },
          };
          commit([{ op: 'upsert', item }]);
          setSelection([item.id]);
          showToast(t('axisTickAdded'));
        },
        [commit, setSelection, showToast, t],
      );

      const saveBigEditor = useCallback(
        (value) => {
          const target = bigEditor;
          setBigEditor(null);
          if (!target) return;
          const item = store.doc.items[target.id];
          if (!item) return;
          const next = String(value ?? '');
          if (editValueOf(item) === next) return;
          if (item.type === 'text') {
            const nextHeight = estimateDocHeight(next, item.w);
            patchItem(target.id, nextHeight > item.h ? { text: next, h: nextHeight } : { text: next });
            return;
          }
          patchItem(target.id, target.field === 'task' ? { task: next } : { text: next });
        },
        [bigEditor],
      );

      // persist a pending edit when the whole panel unmounts (panel switch / plugin reload)
      useEffect(
        () => () => {
          const current = editingRef.current;
          editingRef.current = { id: null, value: '' };
          if (!current.id) return;
          const item = store.doc.items[current.id];
          if (!item || editValueOf(item) === current.value) return;
          try {
            patchItem(current.id, item.type === 'agent' ? { task: current.value } : { text: current.value });
          } catch (error) {
            console.error('[infinite-canvas] unmount text save failed', error);
          }
        },
        [],
      );

      /* ---- stage geometry ---- */
      useEffect(() => {
        const element = stageRef.current;
        if (!element) return undefined;
        const measure = () => {
          const w = element.clientWidth || 1280;
          const h = element.clientHeight || 760;
          setSize((current) => (current.w === w && current.h === h ? current : { w, h }));
        };
        measure();
        if (typeof ResizeObserver === 'function') {
          const observer = new ResizeObserver(measure);
          observer.observe(element);
          return () => observer.disconnect();
        }
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
      }, []);

      const animateTo = useCallback((target) => {
        const start = viewportRef.current;
        const from = { cx: start.cx, cy: start.cy, zoom: start.zoom };
        const token = animRef.current + 1;
        animRef.current = token;
        const begin = performance.now();
        const step = (now) => {
          if (animRef.current !== token) return;
          const progress = Math.min(1, (now - begin) / 320);
          const eased = 1 - Math.pow(1 - progress, 3);
          setViewport({
            cx: from.cx + (target.cx - from.cx) * eased,
            cy: from.cy + (target.cy - from.cy) * eased,
            zoom: from.zoom + (target.zoom - from.zoom) * eased,
          });
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }, []);

      const fitToContent = useCallback(() => {
        const content = Object.values(store.doc.items).filter((item) => item.type !== 'edge');
        const element = stageRef.current;
        const width = element?.clientWidth || size.w;
        const height = element?.clientHeight || size.h;
        if (content.length === 0) {
          animateTo({ cx: 0, cy: 0, zoom: 1 });
          return;
        }
        const bounds = unionBounds(content);
        const pad = 110;
        const zoom = clamp(
          Math.min((width - pad * 2) / Math.max(bounds.w, 1), (height - pad * 2) / Math.max(bounds.h, 1)),
          MIN_ZOOM,
          1.3,
        );
        animateTo({ cx: bounds.x + bounds.w / 2, cy: bounds.y + bounds.h / 2, zoom: Math.round(zoom * 1000) / 1000 });
      }, [animateTo, size.w, size.h]);

      /* ---- first load (once per page) ---- */
      useEffect(() => {
        if (!store.loaded || store.viewInitialized) return;
        store.viewInitialized = true;
        store.lastFocusAt = typeof doc.focus?.at === 'number' ? doc.focus.at : 0;
        const content = Object.values(doc.items).filter((item) => item.type !== 'edge');
        if (content.length > 0) fitToContent();
        else if (doc.viewport) setViewport({ cx: doc.viewport.cx ?? 0, cy: doc.viewport.cy ?? 0, zoom: clamp(doc.viewport.zoom ?? 1, MIN_ZOOM, MAX_ZOOM) });
      }, [store.loaded, doc.items, doc.focus, doc.viewport, fitToContent]);

      /* ---- keep the panel-scoped view across keyed-panel unmounts ---- */
      useEffect(() => {
        store.view = viewport;
      }, [viewport]);

      /* ---- report viewport to host ---- */
      useEffect(() => {
        if (!store.loaded) return undefined;
        if (viewportReportRef.current) clearTimeout(viewportReportRef.current);
        viewportReportRef.current = setTimeout(() => {
          reportViewport({
            cx: Math.round(viewport.cx),
            cy: Math.round(viewport.cy),
            zoom: Math.round(viewport.zoom * 1000) / 1000,
            vw: size.w,
            vh: size.h,
          });
        }, VIEWPORT_REPORT_MS);
        return () => {
          if (viewportReportRef.current) clearTimeout(viewportReportRef.current);
        };
      }, [viewport.cx, viewport.cy, viewport.zoom, size.w, size.h, store.loaded]);

      /* ---- AI focus requests ---- */
      useEffect(() => {
        const focus = doc.focus;
        if (!focus || typeof focus.at !== 'number') return;
        if (!store.viewInitialized) return;
        if (focus.at <= (store.lastFocusAt ?? 0)) return;
        store.lastFocusAt = focus.at;
        animateTo({ cx: focus.cx, cy: focus.cy, zoom: clamp(focus.zoom ?? viewportRef.current.zoom, MIN_ZOOM, MAX_ZOOM) });
      }, [doc.focus, animateTo]);

      /* ---- flash pruning ---- */
      useEffect(() => {
        const timer = setInterval(() => {
          const now = Date.now();
          let changed = false;
          for (const [id, at] of Array.from(store.aiFlash.entries())) {
            if (now - at > AI_HIGHLIGHT_MS) {
              store.aiFlash.delete(id);
              changed = true;
            }
          }
          if (changed) forceFlash((value) => value + 1);
        }, 600);
        return () => clearInterval(timer);
      }, []);

      /* ---- divergence meter: random world-line jumps, settles on 1.048596 ---- */
      useEffect(() => {
        const reducedMotion =
          typeof window !== 'undefined' &&
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reducedMotion) return undefined;
        const worldLines = ['1.048596', '0.571024', '1.130205', '0.456903', '1.382733', '0.337187', '0.000000', '2.615074'];
        const randomLine = () => `1.${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;
        let cancelled = false;
        let timer;
        let scramble;
        const schedule = (delay) => {
          timer = setTimeout(jump, delay);
        };
        const jump = () => {
          if (cancelled) return;
          const target =
            Math.random() < 0.22 ? randomLine() : worldLines[Math.floor(Math.random() * worldLines.length)];
          setNixieRolling(true);
          scramble = setInterval(() => {
            if (cancelled) return;
            setDivergence(randomLine());
          }, 70);
          timer = setTimeout(() => {
            if (cancelled) return;
            clearInterval(scramble);
            setDivergence(target);
            setNixieRolling(false);
            schedule(2800 + Math.random() * 4200);
          }, 620);
        };
        schedule(2600 + Math.random() * 2400);
        return () => {
          cancelled = true;
          clearTimeout(timer);
          clearInterval(scramble);
        };
      }, []);

      /* ---- wheel: pan and zoom ---- */
      useEffect(() => {
        const element = stageRef.current;
        if (!element) return undefined;
        const onWheel = (event) => {
          // Dialogs, editors and other scrollable overlays live inside the stage;
          // let the browser scroll them natively instead of panning/zooming the canvas.
          const target = event.target;
          if (
            target &&
            typeof target.closest === 'function' &&
            (target.closest('.dsic-dialog') ||
              target.closest('.dsic-bigeditor') ||
              target.closest('.dsic-selbar') ||
              target.closest('.dsic-overlay-editor') ||
              target.closest('[data-scroll]') ||
              target.closest('textarea') ||
              target.closest('input') ||
              target.closest('select'))
          ) {
            return;
          }
          event.preventDefault();
          const current = viewportRef.current;
          const width = element.clientWidth;
          const height = element.clientHeight;
          if (event.ctrlKey || event.metaKey) {
            const point = localPoint(event, element);
            const factor = Math.exp(-event.deltaY * 0.0018);
            const zoom = clamp(current.zoom * factor, MIN_ZOOM, MAX_ZOOM);
            const world = screenToWorld(point, current, { w: width, h: height });
            setViewport({
              cx: world.x - (point.x - width / 2) / zoom,
              cy: world.y - (point.y - height / 2) / zoom,
              zoom,
            });
          } else {
            const dx = event.shiftKey ? event.deltaY : event.deltaX;
            const dy = event.shiftKey ? 0 : event.deltaY;
            setViewport({ ...current, cx: current.cx + dx / current.zoom, cy: current.cy + dy / current.zoom });
          }
        };
        element.addEventListener('wheel', onWheel, { passive: false });
        return () => element.removeEventListener('wheel', onWheel);
      }, []);

      const zoomBy = useCallback((factor) => {
        setViewport((current) => ({ ...current, zoom: clamp(current.zoom * factor, MIN_ZOOM, MAX_ZOOM) }));
      }, []);

      /* ---- keyboard ---- */
      useEffect(() => {
        const isTyping = () => {
          const active = document.activeElement;
          if (!active) return false;
          const tag = active.tagName;
          return tag === 'INPUT' || tag === 'TEXTAREA' || active.isContentEditable === true;
        };
        const onKeyDown = (event) => {
          if (event.code === 'Space' && !isTyping()) {
            event.preventDefault();
            setSpaceDown(true);
          }
          if (isTyping()) return;
          const mod = event.ctrlKey || event.metaKey;
          if (event.key === 'Delete' || event.key === 'Backspace') {
            if (selection.length > 0) {
              event.preventDefault();
              deleteItems(selection);
              setSelection([]);
            }
            return;
          }
          if (event.key === 'Escape') {
            setSelection([]);
            finishEditing(false);
            setConnectFrom(null);
            setImageDialog(false);
            setHelpOpen(false);
            setAiDialog(false);
            setMediaOpen(false);
            setRoleEditor(null);
            setPromptOpen(null);
            setSkinOpen(false);
            setBigEditor(null);
            return;
          }
          if ((event.key === 'Enter' || event.key === 'F2') && selection.length === 1) {
            event.preventDefault();
            if (store.doc.items[selection[0]]?.type === 'agent') openBigEditor(selection[0]);
            else startEditing(selection[0]);
            return;
          }
          if (mod && event.key.toLowerCase() === 'z') {
            event.preventDefault();
            if (event.shiftKey) redo();
            else undo();
            return;
          }
          if (mod && event.key.toLowerCase() === 'y') {
            event.preventDefault();
            redo();
            return;
          }
          if (mod && event.key.toLowerCase() === 'd') {
            event.preventDefault();
            if (selection.length > 0) {
              const created = duplicateItems(selection);
              if (created) setSelection(created);
            }
            return;
          }
          if (mod && event.key.toLowerCase() === 'a') {
            event.preventDefault();
            setSelection(Object.keys(store.doc.items));
            return;
          }
          if (mod && (event.key === '=' || event.key === '+')) {
            event.preventDefault();
            zoomBy(1.2);
            return;
          }
          if (mod && event.key === '-') {
            event.preventDefault();
            zoomBy(1 / 1.2);
            return;
          }
          if (mod && event.key === '0') {
            event.preventDefault();
            fitToContent();
            return;
          }
          if (!mod) {
            const shortcuts = { v: 'select', h: 'hand', n: 'note', t: 'text', s: 'shape', f: 'frame', c: 'connect', p: 'pen', g: 'agent' };
            const next = shortcuts[event.key.toLowerCase()];
            if (next) setTool(next);
          }
        };
        const onKeyUp = (event) => {
          if (event.code === 'Space') setSpaceDown(false);
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
          window.removeEventListener('keydown', onKeyDown);
          window.removeEventListener('keyup', onKeyUp);
        };
      }, [selection, fitToContent, zoomBy, startEditing, finishEditing]);

      /* ---- close the project menu on an outside press ---- */
      useEffect(() => {
        if (!projectsOpen) return undefined;
        if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return undefined;
        const onDown = (event) => {
          const target = event.target;
          if (target && target.closest && target.closest('.dsic-projects, .dsic-projectbtn')) return;
          setProjectsOpen(false);
        };
        window.addEventListener('pointerdown', onDown, true);
        return () => window.removeEventListener('pointerdown', onDown, true);
      }, [projectsOpen]);

      /* ---- gestures ---- */
      const readPoint = useCallback((event) => {
        const element = stageRef.current;
        if (!element) return { point: { x: 0, y: 0 }, world: { x: 0, y: 0 } };
        const point = localPoint(event, element);
        const world = screenToWorld(point, viewportRef.current, { w: element.clientWidth, h: element.clientHeight });
        return { point, world };
      }, []);

      /** Lazy pointer capture: capture only once the gesture really drags, so plain clicks
       *  and double-clicks keep their real target (capturing early retargets click/dblclick). */
      const captureOnce = useCallback((gesture, event) => {
        if (gesture.captured) return;
        const element = stageRef.current;
        if (!element) return;
        try {
          element.setPointerCapture(event.pointerId);
          gesture.captured = true;
        } catch (error) {
          /* pointer already released */
        }
      }, []);

      /** Press-and-drag a link out of a node ("+" bubble or the connect tool). */
      const beginLinkDrag = useCallback((event, fromId, fallbackWorld, kind, direction) => {
        const element = stageRef.current;
        if (!element) return;
        const point = localPoint(event, element);
        event.preventDefault();
        event.stopPropagation();
        gestureRef.current = { mode: 'link-drag', kind, fromId, fallbackWorld, direction, start: point, targetId: null };
        try {
          element.setPointerCapture(event.pointerId);
        } catch (error) {
          /* capture is best effort */
        }
        setDragLink({ fromId, kind, direction, sx: point.x, sy: point.y, ex: point.x, ey: point.y, targetId: null });
      }, []);

      /** Node-attached "+" bubble: start a link drag from one side of the node. */
      const onPlusDrag = useCallback(
        (event, fromId, side) => {
          beginLinkDrag(event, fromId, undefined, 'plus', side);
        },
        [beginLinkDrag],
      );

      const onPointerDown = (event) => {
        if (event.button === 2) return;
        const element = stageRef.current;
        if (!element) return;
        const target = event.target;
        if (target && target.closest && target.closest('.dsic-overlay-editor, .dsic-editor, .dsic-dialog, .dsic-bigeditor, .dsic-selbar, .dsic-plus, .dsic-ai, .dsic-empty, .dsic-hint')) return;
        const nodeEl = target && target.closest ? target.closest('[data-node-id]') : null;
        const edgeEl = target && target.closest ? target.closest('[data-edge-id]') : null;
        const strokeEl = target && target.closest ? target.closest('[data-stroke-id]') : null;
        const handleEl = target && target.closest ? target.closest('[data-handle]') : null;
        const { point, world } = readPoint(event);

        // Remember the spot the user clicked on empty canvas: creating an Agent
        // afterwards anchors exactly there instead of at some random position.
        if (!nodeEl && !edgeEl && !strokeEl && !handleEl) {
          lastCanvasPointRef.current = { x: Math.round(world.x), y: Math.round(world.y), at: Date.now() };
        }

        // any click outside the open editor commits it first
        if (editingRef.current.id !== null) finishEditing(true);

        const nowMs = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
        const lastTap = lastTapRef.current;
        const tappedNodeId = nodeEl ? nodeEl.getAttribute('data-node-id') : null;
        const sameSpot =
          nowMs - lastTap.time < 720 &&
          Math.abs(point.x - lastTap.x) < 16 &&
          Math.abs(point.y - lastTap.y) < 16 &&
          (lastTap.nodeId ?? null) === tappedNodeId;
        const tapCount = sameSpot ? (lastTap.count ?? 1) + 1 : 1;
        const isDouble = sameSpot && tapCount === 2;
        const isTriple = sameSpot && tapCount >= 3;
        lastTapRef.current = { time: nowMs, x: point.x, y: point.y, nodeId: tappedNodeId, count: tapCount };

        if (event.button === 1 || spaceDown || tool === 'hand') {
          gestureRef.current = { mode: 'pan', start: point, startCx: viewportRef.current.cx, startCy: viewportRef.current.cy };
          element.setPointerCapture(event.pointerId);
          setPanning(true);
          event.preventDefault();
          return;
        }
        if (tool === 'pen') {
          gestureRef.current = { mode: 'pen', points: [world] };
          setPenDraft([world]);
          element.setPointerCapture(event.pointerId);
          setSelection([]);
          event.preventDefault();
          return;
        }
        if (handleEl && selection.length === 1) {
          const id = selection[0];
          const item = store.doc.items[id];
          if (item) {
            gestureRef.current = {
              mode: 'resize',
              dir: handleEl.getAttribute('data-handle'),
              id,
              startWorld: world,
              original: itemBounds(item),
              captured: false,
            };
            event.preventDefault();
            return;
          }
        }
        if (nodeEl) {
          const id = nodeEl.getAttribute('data-node-id');
          if (tool === 'connect') {
            if (!connectFrom) {
              setConnectFrom(id);
              setSelection([id]);
              beginLinkDrag(event, id, undefined, 'connect');
            } else if (connectFrom === id) {
              setConnectFrom(null);
            } else {
              const edge = beginItem('edge', 0, 0, { from: connectFrom, to: id });
              commit([{ op: 'upsert', item: edge }]);
              setSelection([edge.id]);
            }
            event.stopPropagation();
            return;
          }
          if (isTriple) {
            const item = doc.items[id];
            // Agent cards use the triple-click gesture + big editor;
            // notes / text / shapes keep the classic double-click inline editor.
            if (item && item.type === 'agent') openBigEditor(id);
            return;
          }
          if (isDouble) {
            const item = doc.items[id];
            if (item && item.type !== 'agent') startEditing(id);
            return;
          }
          const additive = event.shiftKey || event.metaKey || event.ctrlKey;
          let nextSelection;
          if (additive) nextSelection = selection.includes(id) ? selection.filter((value) => value !== id) : selection.concat(id);
          else nextSelection = selection.includes(id) ? selection : [id];
          setSelection(nextSelection);
          const baseItems = nextSelection.map((value) => store.doc.items[value]).filter((item) => item && item.type !== 'edge');
          // Dragging a frame moves only the frame by default; "carry contents"
          // (or holding Alt) moves everything inside it in the same gesture.
          const moveMap = new Map(baseItems.map((item) => [item.id, item]));
          const frameIds = new Set(baseItems.filter((item) => item.type === 'frame').map((item) => item.id));
          const carryContents = frameCarryRef.current || Boolean(event.altKey);
          if (frameIds.size > 0 && carryContents) {
            frameDescendants(store.doc.items, frameIds).forEach((entry) => moveMap.set(entry.id, entry));
          }
          const items = Array.from(moveMap.values());
          if (items.length > 0) {
            gestureRef.current = {
              mode: 'drag',
              startWorld: world,
              ids: items.map((item) => item.id),
              originals: items.map((item) => ({ id: item.id, x: item.x, y: item.y })),
              moved: false,
              captured: false,
            };
          }
          event.stopPropagation();
          return;
        }
        if (edgeEl) {
          setSelection([edgeEl.getAttribute('data-edge-id')]);
          event.stopPropagation();
          return;
        }
        if (strokeEl) {
          setSelection([strokeEl.getAttribute('data-stroke-id')]);
          event.stopPropagation();
          return;
        }
        if (tool === 'connect') {
          setConnectFrom(null);
          setSelection([]);
          return;
        }
        if (tool === 'agent') {
          // Place the Agent card exactly on the pressed point, and do it immediately:
          // press and release can be far apart (modal opening, pointer quirks), which
          // used to make the card drift somewhere else.
          if (isDouble) return;
          const agentW = DEFAULT_SIZE.agent.w;
          const agentH = DEFAULT_SIZE.agent.h;
          const agentCount = Object.values(store.doc.items).filter((entry) => entry && entry.type === 'agent').length;
          const agent = beginItem('agent', Math.round(world.x - agentW / 2), Math.round(world.y - agentH / 2), {
            w: agentW,
            h: agentH,
            text: `Agent${agentCount + 1}`,
          });
          commit([{ op: 'upsert', item: agent }]);
          setSelection([agent.id]);
          setCreateDraft(null);
          setTool('select');
          // Short-lived crosshair on the exact world point that was placed: if the
          // card ever lands elsewhere this marker proves where the press was read.
          setPlaceMarker({ x: Math.round(world.x), y: Math.round(world.y), at: Date.now() });
          if (typeof window !== 'undefined') {
            window.setTimeout(() => setPlaceMarker((current) => (current && Date.now() - current.at > 1800 ? null : current)), 2200);
          }
          gestureRef.current = { mode: 'agent-place', id: agent.id };
          element.setPointerCapture(event.pointerId);
          event.preventDefault();
          return;
        }
        if (tool === 'note' || tool === 'text' || tool === 'shape' || tool === 'frame') {
          if (isDouble) return; // a double-click must not create two nodes
          gestureRef.current = { mode: 'create', type: tool, startScreen: point, startWorld: world };
          setCreateDraft({ type: tool, rect: { x: world.x, y: world.y, w: 0, h: 0 } });
          element.setPointerCapture(event.pointerId);
          setSelection([]);
          event.preventDefault();
          return;
        }
        if (isDouble) {
          const item = beginItem('note', world.x - 120, world.y - 84);
          commit([{ op: 'upsert', item }]);
          startEditing(item.id);
          return;
        }
        gestureRef.current = { mode: 'marquee', startScreen: point };
        setMarquee({ x1: point.x, y1: point.y, x2: point.x, y2: point.y });
        element.setPointerCapture(event.pointerId);
        setSelection([]);
      };

      const onPointerMove = (event) => {
        const gesture = gestureRef.current;
        if (!gesture) return;
        const element = stageRef.current;
        if (!element) return;
        const { point, world } = readPoint(event);
        if (gesture.mode === 'pan') {
          const zoom = viewportRef.current.zoom;
          setViewport({
            ...viewportRef.current,
            cx: gesture.startCx - (point.x - gesture.start.x) / zoom,
            cy: gesture.startCy - (point.y - gesture.start.y) / zoom,
          });
          return;
        }
        if (gesture.mode === 'drag') {
          const dx = world.x - gesture.startWorld.x;
          const dy = world.y - gesture.startWorld.y;
          if (!gesture.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
            gesture.moved = true;
            captureOnce(gesture, event);
          }
          const next = {};
          for (const original of gesture.originals) next[original.id] = { x: Math.round(original.x + dx), y: Math.round(original.y + dy) };
          setDragDraft(next);
          return;
        }
        if (gesture.mode === 'resize') {
          captureOnce(gesture, event);
          const dx = world.x - gesture.startWorld.x;
          const dy = world.y - gesture.startWorld.y;
          setResizeDraft({ id: gesture.id, ...resizedRect(gesture.original, gesture.dir, dx, dy) });
          return;
        }
        if (gesture.mode === 'pen') {
          const last = gesture.points[gesture.points.length - 1];
          const screenDistance = Math.hypot(world.x - last.x, world.y - last.y) * viewportRef.current.zoom;
          if (screenDistance > 2 && gesture.points.length < 3000) {
            gesture.points.push(world);
            setPenDraft(gesture.points.slice());
          }
          return;
        }
        if (gesture.mode === 'link-drag') {
          const stage = stageRef.current;
          if (!stage) return;
          const screenPoint = localPoint(event, stage);
          gesture.targetId = nodeIdAtClientPoint(event.clientX, event.clientY);
          setDragLink({
            fromId: gesture.fromId,
            kind: gesture.kind,
            sx: gesture.start.x,
            sy: gesture.start.y,
            ex: screenPoint.x,
            ey: screenPoint.y,
            targetId: gesture.targetId,
          });
          return;
        }
        if (gesture.mode === 'marquee') {
          setMarquee({ x1: gesture.startScreen.x, y1: gesture.startScreen.y, x2: point.x, y2: point.y });
          return;
        }
        if (gesture.mode === 'create') {
          setCreateDraft({ type: gesture.type, rect: rectFromPoints(gesture.startWorld, world) });
        }
      };

      const onPointerUp = (event) => {
        const gesture = gestureRef.current;
        gestureRef.current = null;
        const element = stageRef.current;
        setPanning(false);
        if (!gesture || !element) return;
        const { point, world } = readPoint(event);
        if (gesture.mode === 'link-drag') {
          const moved = Math.hypot(point.x - gesture.start.x, point.y - gesture.start.y) > 6;
          const targetId = gesture.targetId ?? nodeIdAtClientPoint(event.clientX, event.clientY);
          setDragLink(null);
          if (targetId && targetId !== gesture.fromId) {
            const edge = beginItem('edge', 0, 0, { from: gesture.fromId, to: targetId });
            commit([{ op: 'upsert', item: edge }]);
            setSelection([edge.id]);
            setConnectFrom(null);
            showToast(t('connected'));
            return;
          }
          if (gesture.kind === 'plus') {
            addConnectedNode(gesture.fromId, moved ? world : gesture.fallbackWorld, moved ? 'drop' : gesture.direction);
          } else if (moved) {
            setConnectFrom(null);
          }
          return;
        }
        if (gesture.mode === 'pen') {
          setPenDraft(null);          const points = gesture.points;
          if (points.length >= 2) {
            let minX = Infinity;
            let minY = Infinity;
            for (const entry of points) {
              if (entry.x < minX) minX = entry.x;
              if (entry.y < minY) minY = entry.y;
            }
            const relative = points.map((entry) => [Math.round(entry.x - minX), Math.round(entry.y - minY)]);
            const stroke = beginItem('stroke', Math.round(minX), Math.round(minY), { points: relative, width: 3 });
            commit([{ op: 'upsert', item: stroke }]);
            setSelection([stroke.id]);
          }
          return;
        }
        if (gesture.mode === 'drag') {
          const dx = world.x - gesture.startWorld.x;
          const dy = world.y - gesture.startWorld.y;
          if (gesture.moved) {
            const now = new Date().toISOString();
            const movedIds = new Set(gesture.ids);
            const ops = gesture.ids
              .map((id) => {
                const item = store.doc.items[id];
                if (!item) return null;
                const nextItem = { ...item, x: Math.round(item.x + dx), y: Math.round(item.y + dy), updatedAt: now };
                // keep frame membership in sync when a node is dragged in/out of a frame
                if (item.type !== 'edge' && item.type !== 'frame' && !(item.frameId && movedIds.has(item.frameId))) {
                  const frame = frameContainingPoint(
                    store.doc.items,
                    { x: nextItem.x + nextItem.w / 2, y: nextItem.y + nextItem.h / 2 },
                    movedIds,
                  );
                  const nextFrameId = frame ? frame.id : null;
                  if ((item.frameId ?? null) !== nextFrameId) nextItem.frameId = nextFrameId;
                }
                return { op: 'upsert', item: nextItem };
              })
              .filter(Boolean);
            if (ops.length > 0) commit(ops);
          }
          setDragDraft(null);
          return;
        }
        if (gesture.mode === 'resize') {
          const dx = world.x - gesture.startWorld.x;
          const dy = world.y - gesture.startWorld.y;
          const rect = resizedRect(gesture.original, gesture.dir, dx, dy);
          const item = store.doc.items[gesture.id];
          if (item) {
            const updatedAt = new Date().toISOString();
            if (item.type === 'stroke' && Array.isArray(item.points) && gesture.original.w > 0 && gesture.original.h > 0) {
              const scaleX = rect.w / gesture.original.w;
              const scaleY = rect.h / gesture.original.h;
              const points = item.points.map((entry) => [Math.round(entry[0] * scaleX), Math.round(entry[1] * scaleY)]);
              commit([{ op: 'upsert', item: { ...item, ...rect, points, updatedAt } }]);
            } else {
              // Remember the pre-resize size so the content scale is measured
              // against the card's original type size, never against itself.
              const nextMeta =
                (item.type === 'note' || item.type === 'text' || item.type === 'shape' || item.type === 'agent') &&
                !item.meta?.sizeBase
                  ? { ...(item.meta ?? {}), sizeBase: { w: gesture.original.w, h: gesture.original.h } }
                  : item.meta;
              commit([{ op: 'upsert', item: { ...item, ...rect, meta: nextMeta, updatedAt } }]);
            }
          }
          setResizeDraft(null);
          return;
        }
        if (gesture.mode === 'agent-place') {
          // The card already sits on the pressed point; now wake its large editor.
          setCreateDraft(null);
          setTool('select');
          openBigEditor(gesture.id);
          return;
        }
        if (gesture.mode === 'create') {
          const rect = rectFromPoints(gesture.startWorld, world);
          const defaults = DEFAULT_SIZE[gesture.type] ?? { w: 240, h: 160 };
          // "Click" must be measured on screen: at 12% zoom a 2px hand jitter is
          // 16+ world units and used to turn every click into a tiny drag, which
          // anchored the new Agent at the press point instead of the click point.
          const dragScreen = Math.hypot(world.x - gesture.startWorld.x, world.y - gesture.startWorld.y) * viewportRef.current.zoom;
          const isClick = dragScreen < 6;
          // Every click-created card is CENTRED on the click point, so a new Agent
          // appears exactly where you clicked instead of hanging below it.
          const finalRect = isClick
            ? {
                x: Math.round(gesture.startWorld.x - defaults.w / 2),
                y: Math.round(gesture.startWorld.y - defaults.h / 2),
                w: defaults.w,
                h: defaults.h,
              }
            : { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.max(60, Math.round(rect.w)), h: Math.max(60, Math.round(rect.h)) };
          const extra = {};
          if (gesture.type === 'agent') {
            const agentCount = Object.values(store.doc.items).filter((entry) => entry.type === 'agent').length;
            extra.text = `Agent${agentCount + 1}`;
          }
          const item = beginItem(gesture.type, finalRect.x, finalRect.y, { w: finalRect.w, h: finalRect.h, ...extra });
          if (gesture.type !== 'frame') {
            // Dropping a new node inside a frame attaches it to that frame, so the
            // frame and its contents move (and read as one project) together.
            const hostFrame = frameContainingPoint(store.doc.items, {
              x: finalRect.x + finalRect.w / 2,
              y: finalRect.y + finalRect.h / 2,
            });
            if (hostFrame) item.frameId = hostFrame.id;
          }
          if (gesture.type === 'frame') {
            // a new frame adopts the nodes that already sit inside it
            const now = new Date().toISOString();
            const contained = Object.values(store.doc.items).filter((entry) => {
              if (!entry || entry.type === 'edge' || entry.type === 'frame') return false;
              const centerX = entry.x + entry.w / 2;
              const centerY = entry.y + entry.h / 2;
              return (
                centerX >= finalRect.x &&
                centerX <= finalRect.x + finalRect.w &&
                centerY >= finalRect.y &&
                centerY <= finalRect.y + finalRect.h
              );
            });
            const ops = [{ op: 'upsert', item }];
            for (const entry of contained) ops.push({ op: 'upsert', item: { ...entry, frameId: item.id, updatedAt: now } });
            commit(ops);
          } else {
            commit([{ op: 'upsert', item }]);
          }
          setSelection([item.id]);
          setCreateDraft(null);
          setTool('select');
          // Agents always edit in the standalone large panel: the inline overlay
          // used to float away from the freshly created card.
          if (gesture.type === 'agent') openBigEditor(item.id);
          else if (gesture.type === 'note' || gesture.type === 'text' || gesture.type === 'frame') startEditing(item.id);
          return;
        }
        if (gesture.mode === 'marquee') {
          const startWorld = screenToWorld(gesture.startScreen, viewportRef.current, { w: element.clientWidth, h: element.clientHeight });
          const rect = rectFromPoints(startWorld, world);
          if (rect.w > 4 || rect.h > 4) {
            const hits = Object.values(store.doc.items)
              .filter((item) => item.type !== 'edge' && rectsIntersect(rect, itemBounds(item)))
              .map((item) => item.id);
            setSelection(hits);
          }
          setMarquee(null);
        }
      };

      /** Browser dblclick fallback: pointer capture or shell chrome can swallow the second
       *  pointerdown, so also accept the native event when nothing opened the editor yet. */
      const onDoubleClickFallback = (event) => {
        if (editingRef.current.id !== null) return;
        const target = event.target;
        if (target && target.closest && target.closest('.dsic-overlay-editor, .dsic-dialog, .dsic-bigeditor, .dsic-selbar, .dsic-plus, .dsic-ai, .dsic-empty')) return;
        if (target && target.closest && target.closest('[data-stroke-id]')) return;
        if (target && target.closest && target.closest('.dsic-plus')) return;
        const nodeEl = target && target.closest ? target.closest('[data-node-id]') : null;
        if (nodeEl) {
          // native dblclick fallback: notes / text / shapes edit on double-click;
          // Agent cards need the triple-click gesture.
          const id = nodeEl.getAttribute('data-node-id');
          const item = store.doc.items[id];
          if (item && item.type !== 'agent') startEditing(id);
          return;
        }
        if (tool !== 'select') return;
        const { world } = readPoint(event);
        const item = beginItem('note', world.x - 120, world.y - 84);
        commit([{ op: 'upsert', item }]);
        setSelection([item.id]);
      };

      /**
       * Native click-count fallback for the triple-click edit gesture: `event.detail`
       * is 3 on the third consecutive click, independent of our pointerdown counter.
       */
      const onTripleClickFallback = (event) => {
        if (!event || event.detail < 3) return;
        if (editingRef.current.id !== null) return;
        const target = event.target;
        if (!target || !target.closest) return;
        if (target.closest('.dsic-overlay-editor, .dsic-dialog, .dsic-bigeditor, .dsic-selbar, .dsic-plus, .dsic-ai, .dsic-empty')) return;
        const nodeEl = target.closest('[data-node-id]');
        if (!nodeEl) return;
        const id = nodeEl.getAttribute('data-node-id');
        const item = store.doc.items[id];
        if (!item || item.type !== 'agent') return;
        openBigEditor(id);
      };

      /* ---- item actions ---- */
      const commitTitle = (value) => {
        const title = String(value ?? '').trim().slice(0, 120);
        if (title === store.doc.title) return;
        commit([{ op: 'title', title: title || t('untitled') }]);
      };

      /** Shrink a frame so it tightly hugs the items inside it (adopts them if needed). */
      const fitFrameToContent = useCallback(
        (frame) => {
          if (!frame || frame.type !== 'frame') return;
          const all = Object.values(store.doc.items).filter((item) => item && item.type !== 'edge' && item.id !== frame.id && item.type !== 'frame');
          const owned = all.filter((item) => item.frameId === frame.id);
          const targets =
            owned.length > 0
              ? owned
              : all.filter((item) => {
                  const cx = item.x + item.w / 2;
                  const cy = item.y + item.h / 2;
                  return cx >= frame.x && cx <= frame.x + frame.w && cy >= frame.y && cy <= frame.y + frame.h;
                });
          if (targets.length === 0) {
            showToast(t('fitFrameEmpty'));
            return;
          }
          const padX = 50;
          const padTop = 70;
          const padBottom = 50;
          const minX = Math.min(...targets.map((item) => item.x)) - padX;
          const minY = Math.min(...targets.map((item) => item.y)) - padTop;
          const maxX = Math.max(...targets.map((item) => item.x + item.w)) + padX;
          const maxY = Math.max(...targets.map((item) => item.y + item.h)) + padBottom;
          const now = new Date().toISOString();
          const ops = [
            {
              op: 'upsert',
              item: {
                ...frame,
                x: Math.round(minX),
                y: Math.round(minY),
                w: Math.max(120, Math.round(maxX - minX)),
                h: Math.max(120, Math.round(maxY - minY)),
                updatedAt: now,
              },
            },
          ];
          for (const child of targets) {
            if (child.frameId !== frame.id) ops.push({ op: 'upsert', item: { ...child, frameId: frame.id, updatedAt: now } });
          }
          commit(ops);
          showToast(t('fitFrameDone'));
        },
        [showToast, t],
      );

      const applyColor = (color) => {
        const ids = selection.filter((id) => {
          const item = store.doc.items[id];
          return item && item.type !== 'edge';
        });
        if (ids.length === 0) return;
        const now = new Date().toISOString();
        commit(
          ids.map((id) => ({ op: 'upsert', item: { ...store.doc.items[id], color, updatedAt: now } })),
        );
      };

      /** One-click "add text": create a text block at the viewport centre and edit it. */
      /* ---- project workspaces: create + jump ---- */
      const focusProjectFrame = useCallback(
        (frame) => {
          if (!frame) return;
          const element = stageRef.current;
          const width = element?.clientWidth || size.w;
          const height = element?.clientHeight || size.h;
          const pad = 120;
          const zoom = clamp(
            Math.min((width - pad * 2) / Math.max(frame.w, 1), (height - pad * 2) / Math.max(frame.h, 1)),
            MIN_ZOOM,
            1.1,
          );
          animateTo({
            cx: frame.x + frame.w / 2,
            cy: frame.y + frame.h / 2,
            zoom: Math.round(zoom * 1000) / 1000,
          });
          setSelection([frame.id]);
        },
        [animateTo, size.w, size.h],
      );

      /** Create a self-contained project workspace: frame + lead Agent + hint note. */
      const createProject = useCallback(() => {
        const items = Object.values(store.doc.items).filter((item) => item && item.type !== 'edge');
        const index = items.filter((item) => item.type === 'frame').length + 1;
        const name = `${t('projectPrefix')} ${index}`;
        // Put the new workspace right where the user is looking, so it never
        // lands somewhere off-screen in the workspace.
        const current = viewportRef.current;
        const frameW = 1000;
        const frameH = 720;
        const right = Math.round(current.cx - frameW / 2);
        const top = Math.round(current.cy - frameH / 2);
        const frame = {
          ...beginItem('frame', right, top, { w: frameW, h: frameH, text: name, color: 'blue' }),
          meta: { kind: 'project' },
        };
        const agent = {
          ...beginItem('agent', right + 40, top + 70, {
            w: DEFAULT_SIZE.agent.w,
            h: DEFAULT_SIZE.agent.h,
            text: name,
            task: '',
          }),
          color: 'blue',
          project: name,
          frameId: frame.id,
          z: (frame.z ?? 0) + 1,
        };
        const hint = beginItem('note', right + 40, top + 70 + DEFAULT_SIZE.agent.h + 46, {
          w: 460,
          h: 180,
          text: t('projectNoteHint'),
        });
        commit([
          { op: 'upsert', item: frame },
          { op: 'upsert', item: agent },
          { op: 'upsert', item: { ...hint, color: 'white', frameId: frame.id, z: (frame.z ?? 0) + 2 } },
        ]);
        // Select the frame itself so its resize handles are visible immediately:
        // the project box can be adjusted by hand at any time.
        setSelection([frame.id]);
        setProjectsOpen(false);
        focusProjectFrame(frame);
        showToast(t('projectCreated', { name }));
      }, [focusProjectFrame, showToast, t]);

      /**
       * Adopt every node whose centre sits inside a frame, so "this frame and its
       * Agent" become one group that moves and resizes together.
       */
      const gatherFrameNodes = useCallback(
        (frame) => {
          if (!frame || frame.type !== 'frame') return;
          const ops = [];
          const now = new Date().toISOString();
          for (const item of Object.values(store.doc.items)) {
            if (!item || item.id === frame.id || item.type === 'edge' || item.type === 'frame') continue;
            if (item.frameId === frame.id) continue;
            const cx = item.x + item.w / 2;
            const cy = item.y + item.h / 2;
            if (cx < frame.x || cx > frame.x + frame.w || cy < frame.y || cy > frame.y + frame.h) continue;
            ops.push({ op: 'upsert', item: { ...item, frameId: frame.id, updatedAt: now } });
            if (item.type === 'agent' && !item.project) {
              ops.push({ op: 'patch', id: item.id, patch: { project: frame.text || '' } });
            }
          }
          if (ops.length === 0) {
            showToast(t('gatherFrameEmpty'));
            return;
          }
          commit(ops);
          showToast(t('gatherFrameDone', { n: ops.filter((op) => op.op === 'upsert').length }));
        },
        [commit, showToast, store, t],
      );

      /** Detach one node from its frame so it moves on its own again. */
      const detachFromFrame = useCallback(
        (id) => {
          const item = store.doc.items[id];
          if (!item || !item.frameId) return;
          patchItem(id, { frameId: null });
          showToast(t('detachFrameDone'));
        },
        [patchItem, showToast, store, t],
      );

      /** Open a linked local file/folder via the host (Explorer / Finder / xdg-open). */
      const openLocalPath = useCallback(
        async (target) => {
          const raw = String(target ?? '').trim();
          if (raw === '') {
            showToast(t('pathRequired'));
            return;
          }
          try {
            await callCanvas('open-path', { path: raw });
          } catch (error) {
            showToast(t('pathOpenFailed', { message: String(error?.message ?? error) }));
          }
        },
        [showToast, t],
      );

      const openPathDialog = useCallback((id) => {
        const item = store.doc.items[id];
        if (!item) return;
        setPathDialog({ id, value: String(item.meta?.workspacePath ?? '') });
      }, [store]);

      const savePath = useCallback(
        (value) => {
          const target = pathDialog;
          if (!target) return;
          const item = store.doc.items[target.id];
          if (!item) {
            setPathDialog(null);
            return;
          }
          const path = String(value ?? '').trim();
          patchItem(target.id, { meta: { ...(item.meta ?? {}), workspacePath: path } });
          setPathDialog(null);
          showToast(t('pathSaved'));
        },
        [patchItem, pathDialog, showToast, store, t],
      );

      /* ---- canvas AI model picker + custom OpenAI-compatible providers ---- */
      const refreshModelCatalog = useCallback(async () => {
        setModelBusy(true);
        try {
          const value = await callCanvas('models', {});
          setModelCatalogData(value ?? null);
          return value;
        } catch (error) {
          showToast(t('modelFailed', { message: String(error?.message ?? error) }));
          return null;
        } finally {
          setModelBusy(false);
        }
      }, [showToast, t]);

      const openModelDialog = useCallback(async () => {
        setModelOpen(true);
        setProviderTest(null);
        await refreshModelCatalog();
      }, [refreshModelCatalog]);

      const modelChoiceLabel = (choice) => {
        if (!choice) return t('modelFollowDefault');
        if (choice.source === 'custom') return `${choice.providerName || t('aiProviders')} / ${choice.model}`;
        return `${choice.provider} / ${choice.model}`;
      };

      const pickModel = useCallback(
        (choice) => {
          const normalized = normalizeModelChoice(choice);
          setModelSel(normalized);
          persistModelChoice(normalized);
          setModelOpen(false);
          if (normalized) showToast(t('modelSaved', { name: modelChoiceLabel(normalized) }));
          else showToast(t('modelSavedDefault'));
        },
        [showToast, t],
      );

      const mergeCustomProviders = useCallback((providers) => {
        setModelCatalogData((current) => (current ? { ...current, customProviders: Array.isArray(providers) ? providers : [] } : current));
      }, []);

      const saveProvider = useCallback(
        async (form) => {
          setProviderBusy(true);
          try {
            const value = await callCanvas('ai-provider-save', form ?? {});
            mergeCustomProviders(value?.providers);
            setProviderEditor(null);
            setProviderTest(null);
            showToast(t('aiProviderSaved', { name: value?.provider?.name ?? '' }));
            return true;
          } catch (error) {
            showToast(t('aiProviderFailed', { message: String(error?.message ?? error) }));
            return false;
          } finally {
            setProviderBusy(false);
          }
        },
        [mergeCustomProviders, showToast, t],
      );

      const testProvider = useCallback(async (form) => {
        setProviderBusy(true);
        setProviderTest(null);
        try {
          const value = await callCanvas('ai-provider-test', form ?? {});
          setProviderTest({
            providerId: String(form?.id ?? '__editor__'),
            ok: true,
            latencyMs: Number(value?.latencyMs ?? 0),
            reply: String(value?.reply ?? ''),
            model: String(value?.model ?? ''),
          });
        } catch (error) {
          setProviderTest({ providerId: String(form?.id ?? '__editor__'), ok: false, message: String(error?.message ?? error) });
        } finally {
          setProviderBusy(false);
        }
      }, []);

      const deleteProvider = useCallback(
        async (id) => {
          setProviderBusy(true);
          try {
            const value = await callCanvas('ai-provider-delete', { id });
            mergeCustomProviders(value?.providers);
            if (modelSel && modelSel.source === 'custom' && modelSel.providerId === id) {
              setModelSel(null);
              persistModelChoice(null);
            }
            setProviderEditor(null);
            setProviderTest(null);
            showToast(t('aiProviderDeleted'));
          } catch (error) {
            showToast(t('aiProviderFailed', { message: String(error?.message ?? error) }));
          } finally {
            setProviderBusy(false);
          }
        },
        [mergeCustomProviders, modelSel, showToast, t],
      );

      /* ---- canvas library: multiple canvases + history snapshots ---- */
      const applyHostDocState = useCallback(
        (value) => {
          if (!value || typeof value !== 'object') return;
          applyServerState(value);
          setSelection([]);
          setEditingId(null);
          setBigEditor(null);
          const nextViewport = value.viewport;
          if (nextViewport && Number.isFinite(Number(nextViewport.zoom))) {
            setViewport({
              cx: Math.round(Number(nextViewport.cx) || 0),
              cy: Math.round(Number(nextViewport.cy) || 0),
              zoom: Math.min(4, Math.max(0.1, Number(nextViewport.zoom) || 1)),
            });
          }
          notify();
        },
        [setViewport],
      );

      const openBoards = useCallback(async () => {
        const rect =
          boardsBtnRef.current && typeof boardsBtnRef.current.getBoundingClientRect === 'function'
            ? boardsBtnRef.current.getBoundingClientRect()
            : null;
        if (rect) {
          const width = 330;
          const viewportWidth =
            typeof window !== 'undefined' && Number.isFinite(window.innerWidth) ? window.innerWidth : rect.left + width + 16;
          setBoardsAnchor({
            left: Math.round(Math.max(8, Math.min(rect.left, viewportWidth - width - 8))),
            top: Math.round(rect.bottom + 6),
          });
        }
        setBoardsOpen(true);
        try {
          const value = await callCanvas('library', {});
          setBoardList(Array.isArray(value?.canvases) ? value.canvases : []);
          if (Array.isArray(value?.snapshots)) setHistoryList(value.snapshots);
        } catch (error) {
          showToast(t('boardFailed', { message: String(error?.message ?? error) }));
        }
      }, [showToast, t]);

      const createBoard = useCallback(async () => {
        if (boardsBusy) return;
        setBoardsBusy(true);
        try {
          const value = await callCanvas('canvas-create', {});
          applyHostDocState(value);
          setBoardList(Array.isArray(value?.library?.canvases) ? value.library.canvases : []);
          setHistoryList(Array.isArray(value?.snapshots) ? value.snapshots : []);
          setBoardsOpen(false);
          showToast(t('boardCreated', { name: value?.title ?? t('boards') }));
        } catch (error) {
          showToast(t('boardFailed', { message: String(error?.message ?? error) }));
        } finally {
          setBoardsBusy(false);
        }
      }, [applyHostDocState, boardsBusy, showToast, t]);

      const switchBoard = useCallback(
        async (id) => {
          if (!id || id === store.docId || boardsBusy) return;
          setBoardsBusy(true);
          try {
            const value = await callCanvas('canvas-switch', { id });
            applyHostDocState(value);
            setBoardList(Array.isArray(value?.library?.canvases) ? value.library.canvases : []);
            setHistoryList(Array.isArray(value?.snapshots) ? value.snapshots : []);
            setBoardsOpen(false);
            showToast(t('boardSwitched', { name: value?.title ?? '' }));
          } catch (error) {
            showToast(t('boardFailed', { message: String(error?.message ?? error) }));
          } finally {
            setBoardsBusy(false);
          }
        },
        [applyHostDocState, boardsBusy, showToast, store, t],
      );

      const renameBoard = useCallback(
        async (id, currentTitle) => {
          const ask = typeof window !== 'undefined' && typeof window.prompt === 'function' ? window.prompt(t('boardRenamePrompt'), currentTitle) : null;
          const title = String(ask ?? '').trim();
          if (title === '') return;
          try {
            const value = await callCanvas('canvas-rename', { id, title });
            setBoardList(Array.isArray(value?.library?.canvases) ? value.library.canvases : []);
            showToast(t('boardRenamed'));
          } catch (error) {
            showToast(t('boardFailed', { message: String(error?.message ?? error) }));
          }
        },
        [showToast, t],
      );

      const deleteBoard = useCallback(
        async (id, name) => {
          const ask =
            typeof window !== 'undefined' && typeof window.confirm === 'function'
              ? window.confirm(t('boardDeleteConfirm', { name }))
              : false;
          if (!ask) return;
          try {
            const value = await callCanvas('canvas-delete', { id });
            applyHostDocState(value);
            setBoardList(Array.isArray(value?.library?.canvases) ? value.library.canvases : []);
            setHistoryList(Array.isArray(value?.snapshots) ? value.snapshots : []);
          } catch (error) {
            showToast(t('boardFailed', { message: String(error?.message ?? error) }));
          }
        },
        [applyHostDocState, showToast, t],
      );

      const saveSnapshot = useCallback(async () => {
        const ask =
          typeof window !== 'undefined' && typeof window.prompt === 'function' ? window.prompt(t('historySavePrompt'), '') : '';
        if (ask === null) return;
        if (historyBusy) return;
        setHistoryBusy(true);
        try {
          const value = await callCanvas('history-save', { label: String(ask ?? '') });
          setHistoryList(Array.isArray(value?.snapshots) ? value.snapshots : []);
          showToast(t('historySaved', { n: Number(value?.saved?.nodes ?? 0) }));
        } catch (error) {
          showToast(t('historyFailed', { message: String(error?.message ?? error) }));
        } finally {
          setHistoryBusy(false);
        }
      }, [historyBusy, showToast, t]);

      const restoreSnapshotAction = useCallback(
        async (entry) => {
          if (!entry || !entry.id) return;
          const ask =
            typeof window !== 'undefined' && typeof window.confirm === 'function' ? window.confirm(t('historyRestoreConfirm')) : false;
          if (!ask) return;
          if (historyBusy) return;
          setHistoryBusy(true);
          try {
            const value = await callCanvas('history-restore', { entryId: entry.id });
            applyHostDocState(value);
            setHistoryList(Array.isArray(value?.snapshots) ? value.snapshots : []);
            showToast(t('historyRestored'));
          } catch (error) {
            showToast(t('historyFailed', { message: String(error?.message ?? error) }));
          } finally {
            setHistoryBusy(false);
          }
        },
        [applyHostDocState, historyBusy, showToast, t],
      );

      const removeSnapshot = useCallback(
        async (entry) => {
          if (!entry || !entry.id) return;
          try {
            const value = await callCanvas('history-delete', { entryId: entry.id });
            setHistoryList(Array.isArray(value?.snapshots) ? value.snapshots : []);
          } catch (error) {
            showToast(t('historyFailed', { message: String(error?.message ?? error) }));
          }
        },
        [showToast, t],
      );

      /* ---- minimap: content bounding box + current view, projected into a tiny SVG ---- */
      const minimap = useMemo(() => {
        const blocks = Object.values(doc.items).filter(
          (item) =>
            item &&
            item.type !== 'edge' &&
            item.type !== 'stroke' &&
            Number.isFinite(item.x) &&
            Number.isFinite(item.y) &&
            Number(item.w) > 0 &&
            Number(item.h) > 0,
        );
        const zoom = Number(viewport.zoom) > 0 ? Number(viewport.zoom) : 1;
        const visibleW = Math.max(40, (size.w || 1200) / zoom);
        const visibleH = Math.max(40, (size.h || 800) / zoom);
        const view = {
          x: viewport.cx - visibleW / 2,
          y: viewport.cy - visibleH / 2,
          w: visibleW,
          h: visibleH,
        };
        let minX = view.x;
        let minY = view.y;
        let maxX = view.x + view.w;
        let maxY = view.y + view.h;
        for (const item of blocks) {
          minX = Math.min(minX, item.x);
          minY = Math.min(minY, item.y);
          maxX = Math.max(maxX, item.x + item.w);
          maxY = Math.max(maxY, item.y + item.h);
        }
        const padX = Math.max(40, (maxX - minX) * 0.08);
        const padY = Math.max(40, (maxY - minY) * 0.08);
        const box = { x: minX - padX, y: minY - padY, w: maxX - minX + padX * 2, h: maxY - minY + padY * 2 };
        const scale = Math.min(MINIMAP_W / box.w, MINIMAP_H / box.h) || 1;
        const offsetX = (MINIMAP_W - box.w * scale) / 2;
        const offsetY = (MINIMAP_H - box.h * scale) / 2;
        const toMap = (x, y) => ({ x: offsetX + (x - box.x) * scale, y: offsetY + (y - box.y) * scale });
        const viewTopLeft = toMap(view.x, view.y);
        const mapped = blocks.map((item) => {
          const topLeft = toMap(item.x, item.y);
          const palette = NOTE_COLORS[item.color] ?? NOTE_COLORS.yellow;
          return {
            id: item.id,
            type: item.type,
            fill: palette.bg,
            stroke: item.type === 'frame' ? '#22d3ee' : palette.line,
            x: topLeft.x,
            y: topLeft.y,
            w: Math.max(1.6, item.w * scale),
            h: Math.max(1.6, item.h * scale),
          };
        });
        return {
          blocks: mapped,
          view: {
            x: viewTopLeft.x,
            y: viewTopLeft.y,
            w: Math.max(4, view.w * scale),
            h: Math.max(4, view.h * scale),
          },
          box,
          scale: scale || 1,
          offsetX,
          offsetY,
          count: blocks.length,
        };
      }, [doc.items, viewport.cx, viewport.cy, viewport.zoom, size.w, size.h]);

      /* ---- minimap: click / drag jumps the viewport ---- */
      const minimapJumpTo = useCallback(
        (clientX, clientY) => {
          const svg = minimapSvgRef.current;
          if (!svg || !minimap || minimap.scale <= 0) return;
          const rect = typeof svg.getBoundingClientRect === 'function' ? svg.getBoundingClientRect() : null;
          if (!rect || rect.width <= 0 || rect.height <= 0) return;
          const mapX = ((clientX - rect.left) / rect.width) * MINIMAP_W;
          const mapY = ((clientY - rect.top) / rect.height) * MINIMAP_H;
          const worldX = minimap.box.x + (mapX - minimap.offsetX) / minimap.scale;
          const worldY = minimap.box.y + (mapY - minimap.offsetY) / minimap.scale;
          setViewport((current) => ({ ...current, cx: Math.round(worldX), cy: Math.round(worldY) }));
        },
        [minimap, setViewport],
      );

      const onMinimapPointerDown = useCallback(
        (event) => {
          event.stopPropagation();
          event.preventDefault();
          minimapDraggingRef.current = true;
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch (error) {
            /* pointer capture is best-effort */
          }
          minimapJumpTo(event.clientX, event.clientY);
        },
        [minimapJumpTo],
      );

      const onMinimapPointerMove = useCallback(
        (event) => {
          if (!minimapDraggingRef.current) return;
          event.stopPropagation();
          minimapJumpTo(event.clientX, event.clientY);
        },
        [minimapJumpTo],
      );

      const onMinimapPointerUp = useCallback((event) => {
        minimapDraggingRef.current = false;
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch (error) {
          /* pointer capture is best-effort */
        }
      }, []);

      const collapseMinimap = useCallback(() => {
        setMinimapOpen(false);
        persistMinimapOpen(false);
      }, []);

      const expandMinimap = useCallback(() => {
        setMinimapOpen(true);
        persistMinimapOpen(true);
      }, []);

      /* ---- settings dialog ---- */
      const openSettings = useCallback(async () => {
        setSettingsOpen(true);
        setSettingsBusy(true);
        setSettingsAi((current) => ({ ...current, testing: false, result: '' }));
        try {
          const value = await callCanvas('settings', {});
          setSettingsInfo(value ?? null);
          setSettingsAi({
            baseUrl: String(value?.ai?.baseUrl ?? ''),
            model: String(value?.ai?.model ?? ''),
            key: '',
            testing: false,
            result: '',
          });
        } catch (error) {
          showToast(t('settingsFailed', { message: String(error?.message ?? error) }));
          setSettingsInfo(null);
        } finally {
          setSettingsBusy(false);
        }
      }, [showToast, t]);

      const updateSettingsAi = useCallback((field, value) => {
        setSettingsAi((current) => ({ ...current, [field]: value }));
      }, []);

      const saveSettingsAi = useCallback(async () => {
        if (settingsAi.baseUrl.trim() === '' || settingsAi.model.trim() === '') {
          showToast(t('settingsAiNeedsBase'));
          return;
        }
        setSettingsBusy(true);
        try {
          const value = await callCanvas('settings-save-ai', {
            baseUrl: settingsAi.baseUrl,
            model: settingsAi.model,
            apiKey: settingsAi.key === '' ? undefined : settingsAi.key,
          });
          setSettingsAi((current) => ({ ...current, key: '' }));
          setSettingsInfo((current) => (current ? { ...current, ai: value?.ai ?? current.ai } : current));
          showToast(t('settingsAiSaved'));
        } catch (error) {
          showToast(t('settingsFailed', { message: String(error?.message ?? error) }));
        } finally {
          setSettingsBusy(false);
        }
      }, [settingsAi, showToast, t]);

      const testSettingsAi = useCallback(async () => {
        if (settingsAi.baseUrl.trim() === '' || settingsAi.model.trim() === '') {
          showToast(t('settingsAiNeedsBase'));
          return;
        }
        setSettingsAi((current) => ({ ...current, testing: true, result: '' }));
        try {
          const value = await callCanvas('settings-test-ai', {
            baseUrl: settingsAi.baseUrl,
            model: settingsAi.model,
            apiKey: settingsAi.key === '' ? undefined : settingsAi.key,
          });
          setSettingsAi((current) => ({
            ...current,
            testing: false,
            result: t('settingsAiTestOk', { ms: Number(value?.latencyMs ?? 0), model: value?.model ?? current.model }),
          }));
        } catch (error) {
          setSettingsAi((current) => ({
            ...current,
            testing: false,
            result: t('settingsAiTestFailed', { message: String(error?.message ?? error) }),
          }));
        }
      }, [settingsAi, showToast, t]);

      const clearSettingsAiKey = useCallback(async () => {
        setSettingsBusy(true);
        try {
          const value = await callCanvas('settings-save-ai', { baseUrl: settingsAi.baseUrl, model: settingsAi.model, clearKey: true });
          setSettingsInfo((current) => (current ? { ...current, ai: value?.ai ?? current.ai } : current));
          showToast(t('settingsAiKeyCleared'));
        } catch (error) {
          showToast(t('settingsFailed', { message: String(error?.message ?? error) }));
        } finally {
          setSettingsBusy(false);
        }
      }, [settingsAi, showToast, t]);

      const toggleSettingsMinimap = useCallback(() => {
        setMinimapOpen((current) => {
          const next = !current;
          persistMinimapOpen(next);
          return next;
        });
      }, []);

      const toggleSettingsFrameCarry = useCallback(() => {
        setFrameCarry((current) => {
          const next = !current;
          persistFrameCarry(next);
          return next;
        });
      }, []);

      const chooseLang = useCallback((value) => {
        applyLangPref(value);
        forceFlash((count) => count + 1);
      }, []);

      const openDataFolder = useCallback(async () => {
        const path = settingsInfo?.dataPath;
        if (!path) return;
        try {
          await callCanvas('open-path', { path });
        } catch (error) {
          showToast(String(error?.message ?? error));
        }
      }, [settingsInfo, showToast]);

      const importDshLibrary = useCallback(async () => {
        if (settingsBusy) return;
        setSettingsBusy(true);
        try {
          await callCanvas('import-dsh', {});
          showToast(t('settingsImportDone'));
          if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
            window.location.reload();
          }
        } catch (error) {
          showToast(t('settingsFailed', { message: String(error?.message ?? error) }));
        } finally {
          setSettingsBusy(false);
        }
      }, [settingsBusy, showToast, t]);

      /* ---- left sidebar: vault / tags / search ---- */
      const loadVault = useCallback(
        async (root) => {
          const target = String(root ?? '').trim();
          if (target === '') {
            showToast(t('sidebarVaultNotSet'));
            return;
          }
          setVaultBusy(true);
          setVaultError('');
          try {
            const value = await callCanvas('vault-list', { root: target });
            setVaultFiles(Array.isArray(value?.files) ? value.files : []);
            setVaultTruncated(Boolean(value?.truncated));
            setVaultPath(value?.root ?? target);
            persistVaultPath(value?.root ?? target);
          } catch (error) {
            setVaultError(String(error?.message ?? error));
            setVaultFiles([]);
          } finally {
            setVaultBusy(false);
          }
        },
        [showToast, t],
      );

      const toggleSidebar = useCallback(() => {
        setSidebarOpen((current) => {
          const next = !current;
          persistSidebarOpen(next);
          if (next && vaultPath !== '' && vaultFiles.length === 0) setTimeout(() => loadVault(vaultPath), 0);
          return next;
        });
      }, [loadVault, vaultFiles.length, vaultPath]);

      const importVaultFile = useCallback(
        async (file) => {
          if (!file?.path || vaultBusy) return;
          setVaultBusy(true);
          try {
            const value = await callCanvas('vault-import', { path: file.path });
            showToast(t('sidebarVaultImported', { name: file.name, n: Number(value?.created ?? 0) }));
            pollOnce();
          } catch (error) {
            showToast(t('sidebarVaultFailed', { message: String(error?.message ?? error) }));
          } finally {
            setVaultBusy(false);
          }
        },
        [vaultBusy, showToast, t],
      );

      const focusSearchResult = useCallback(
        (entry) => {
          const item = store.doc.items[entry.id];
          if (!item) return;
          setSelection([item.id]);
          setViewport((current) => ({
            ...current,
            cx: Math.round(item.x + (Number(item.w) || 0) / 2),
            cy: Math.round(item.y + (Number(item.h) || 0) / 2),
          }));
        },
        [setSelection, setViewport, store],
      );

      /* ---- relation graph (Obsidian-style force-directed view) ---- */
      const loadGraph = useCallback(
        async (targetScope) => {
          const scope = targetScope === 'all' ? 'all' : targetScope === 'vault' ? 'vault' : 'canvas';
          setGraphBusy(true);
          setGraphError('');
          try {
            const value = await callCanvas('graph-data', {
              scope,
              canvasId: store.docId,
              vaultRoot: scope === 'vault' ? vaultPath : '',
              includeTags: graphShowTags,
              includeOrphans: !graphHideOrphans,
            });
            setGraphData(value && typeof value === 'object' ? value : { nodes: [], edges: [], truncated: false, counts: null });
          } catch (error) {
            setGraphData(null);
            const message = String(error?.message ?? error);
            setGraphError(
              message.includes('unknown action')
                ? `${message}（当前服务端还是旧版本：请完全退出重开应用；独立窗口请重启后台 server 后再刷新窗口）`
                : message,
            );
          } finally {
            setGraphBusy(false);
          }
        },
        [graphHideOrphans, graphShowTags, store.docId, vaultPath],
      );

      useEffect(() => {
        if (!graphOpen) return;
        loadGraph(graphScope);
      }, [graphOpen, graphScope, graphShowTags, graphHideOrphans, graphNonce, loadGraph]);

      const openGraphNode = useCallback(
        async (node) => {
          if (!node) return;
          if (node.kind === 'card') {
            if (node.canvasId && node.canvasId !== store.docId) await switchBoard(node.canvasId);
            const item = store.doc.items[node.itemId];
            let openTextId = '';
            if (item) {
              setSelection([item.id]);
              setViewport((current) => ({
                ...current,
                cx: Math.round(item.x + (Number(item.w) || 0) / 2),
                cy: Math.round(item.y + (Number(item.h) || 0) / 2),
              }));
              // Notes / text cards open their text directly; other cards just jump and select.
              if (item.type === 'note' || item.type === 'text') openTextId = item.id;
            }
            setGraphOpen(false);
            if (openTextId !== '') openBigEditor(openTextId);
            return;
          }
          if (node.kind === 'file') {
            if (node.path) await importVaultFile({ path: node.path, name: node.name || node.label || 'note.md' });
            setGraphOpen(false);
            return;
          }
          if (node.kind === 'tag') {
            const tag = String(node.tag ?? node.label ?? '').replace(/^#/, '').trim();
            setGraphOpen(false);
            setSidebarTab('tags');
            setTagFilter(tag);
            if (!sidebarOpen) {
              setSidebarOpen(true);
              persistSidebarOpen(true);
            }
          }
        },
        [importVaultFile, openBigEditor, setSelection, setViewport, sidebarOpen, store, switchBoard],
      );

      /* ---- Obsidian-style global panels: tags across canvases, global search, quick link/tag add ---- */
      const loadGlobalTags = useCallback(async () => {
        try {
          const value = await callCanvas('tags-all', {});
          setGlobalTags(value ?? null);
        } catch (error) {
          /* offline: local tags still render */
        }
      }, []);

      const loadGlobalSearch = useCallback(async () => {
        const query = searchQuery.trim();
        if (query === '') return;
        setSearchBusy(true);
        try {
          const value = await callCanvas('search-all', { query, vaultRoot: vaultPath });
          setGlobalSearch(value ?? { cards: [], files: [] });
        } catch (error) {
          showToast(t('settingsFailed', { message: String(error?.message ?? error) }));
        } finally {
          setSearchBusy(false);
        }
      }, [searchQuery, vaultPath, showToast, t]);

      const jumpGlobalCard = useCallback(
        async (entry) => {
          if (!entry) return;
          if (entry.canvasId !== store.docId) await switchBoard(entry.canvasId);
          const item = store.doc.items[entry.itemId];
          if (!item) return;
          setSelection([item.id]);
          setViewport((current) => ({
            ...current,
            cx: Math.round(item.x + (Number(item.w) || 0) / 2),
            cy: Math.round(item.y + (Number(item.h) || 0) / 2),
          }));
        },
        [setSelection, setViewport, switchBoard, store],
      );

      const jumpGlobalTag = useCallback(
        async (tag, canvases) => {
          if (!tag) return;
          if (Array.isArray(canvases)) {
            const hit = canvases.find((entry) => Array.isArray(entry.tags) && entry.tags.some((item) => item.tag === tag));
            if (hit && hit.id !== store.docId) await switchBoard(hit.id);
          }
          setTagFilter(tag);
        },
        [setTagFilter, switchBoard, store],
      );

      const addTagToSelection = useCallback(() => {
        const tag = tagInput.trim().replace(/^#/, '').slice(0, 40);
        if (tag === '') return;
        const target = selection.length === 1 ? store.doc.items[selection[0]] : null;
        if (!target) {
          showToast(t('tagsNoSelection'));
          return;
        }
        patchItem(target.id, { text: `${target.text ?? ''}${target.text ? '\n' : ''}#${tag}` });
        setTagInput('');
        showToast(t('tagsAdded', { tag }));
      }, [tagInput, selection, store, patchItem, showToast, t]);

      const addWikiLink = useCallback(() => {
        const target = linkInput.trim().slice(0, 120);
        if (target === '') return;
        const item = selection.length === 1 ? store.doc.items[selection[0]] : null;
        if (!item) {
          showToast(t('linksNoTarget'));
          return;
        }
        patchItem(item.id, { text: `${item.text ?? ''}${item.text ? '\n' : ''}[[${target}]]` });
        setLinkInput('');
        showToast(t('linksAdded', { target }));
      }, [linkInput, selection, store, patchItem, showToast, t]);

      useEffect(() => {
        if (!sidebarOpen) return;
        if (sidebarTab === 'tags') loadGlobalTags();
        else if (sidebarTab === 'search' && searchQuery.trim() !== '') loadGlobalSearch();
      }, [sidebarOpen, sidebarTab, loadGlobalTags, loadGlobalSearch, searchQuery]);

      useEffect(() => {
        try {
          if (typeof window === 'undefined') return;
          const param = new URLSearchParams(window.location.search).get('vault');
          if (param) {
            setVaultInput(param);
            setVaultPath(param);
            setSidebarOpen(true);
            loadVault(param);
          } else {
            const saved = loadVaultPath();
            if (saved !== '') {
              setVaultInput(saved);
              setVaultPath(saved);
              loadVault(saved);
            }
          }
        } catch (error) {
          /* URL parsing is best-effort */
        }
      }, [loadVault]);

      /* ---- file write-back + quick switcher (Ctrl/⌘+O) ---- */
      const writeBackItem = useCallback(
        async (id) => {
          if (!id) return;
          try {
            const value = await callCanvas('vault-write-back', { id });
            if (value?.conflictBackup) showToast(t('writeBackConflict', { file: value.conflictBackup }));
            else if (value?.unchanged) showToast(t('writeBackUnchanged'));
            else showToast(t('writeBackDone', { path: value?.path ?? '' }));
            pollOnce();
          } catch (error) {
            showToast(t('writeBackFailed', { message: String(error?.message ?? error) }));
          }
        },
        [showToast, t],
      );

      const openQuickSwitcher = useCallback(() => {
        setQuickQuery('');
        setQuickIndex(0);
        setQuickOpen(true);
      }, []);

      const closeQuickSwitcher = useCallback(() => setQuickOpen(false), []);

      const chooseQuickResult = useCallback(
        (entry) => {
          if (!entry) return;
          setQuickOpen(false);
          if (entry.kind === 'card') {
            const item = store.doc.items[entry.id];
            if (!item) return;
            setSelection([item.id]);
            setViewport((current) => ({
              ...current,
              cx: Math.round(item.x + (Number(item.w) || 0) / 2),
              cy: Math.round(item.y + (Number(item.h) || 0) / 2),
            }));
          } else if (entry.kind === 'canvas') {
            switchBoard(entry.id);
          } else if (entry.kind === 'file' && entry.file) {
            importVaultFile(entry.file);
          }
        },
        [importVaultFile, setSelection, setViewport, store, switchBoard],
      );

      useEffect(() => {
        if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return undefined;
        const onKeyDown = (event) => {
          const key = String(event.key ?? '').toLowerCase();
          if ((event.ctrlKey || event.metaKey) && key === 'o') {
            event.preventDefault();
            openQuickSwitcher();
            return;
          }
          if (key === 'escape') {
            setQuickOpen((open) => (open ? false : open));
            setGraphOpen(false);
          }
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
      }, [openQuickSwitcher]);

      const modelLabel = (() => {
        if (!modelSel) return t('model');
        const name = String(modelSel.model ?? '');
        const short = name.length > 16 ? `${name.slice(0, 16)}…` : name || t('model');
        return modelSel.source === 'custom' ? `⚡ ${short}` : short;
      })();

      /* ---- one-click multi-select helpers ---- */
      /** Tick every node on the canvas (second click clears the selection). */
      const selectAllItems = useCallback(() => {
        const ids = Object.values(store.doc.items)
          .filter((item) => item && item.type !== 'edge')
          .map((item) => item.id);
        if (ids.length === 0) return;
        const allSelected = ids.every((id) => selection.includes(id));
        setSelection(allSelected ? [] : ids);
        showToast(allSelected ? t('selectCleared') : t('selectAllDone', { n: ids.length }));
      }, [selection, showToast, store, t]);

      /** Tick every node of the same kind(s) as the current selection (e.g. all Agents). */
      const selectSameKind = useCallback(() => {
        const selected = selection.map((id) => store.doc.items[id]).filter(Boolean);
        const kinds = new Set(selected.map((item) => item.type));
        if (kinds.size === 0) return;
        const ids = Object.values(store.doc.items)
          .filter((item) => item && item.type !== 'edge' && kinds.has(item.type))
          .map((item) => item.id);
        if (ids.length === 0) return;
        setSelection(ids);
        showToast(t('selectSameKindDone', { n: ids.length }));
      }, [selection, showToast, store, t]);

      const addTextBlock = useCallback(() => {
        const current = viewportRef.current;
        const size = DEFAULT_SIZE.text;
        const item = beginItem('text', Math.round(current.cx - size.w / 2), Math.round(current.cy - size.h / 2));
        commit([{ op: 'upsert', item }]);
        setSelection([item.id]);
        setTool('select');
        startEditing(item.id);
      }, [startEditing]);

      const plus = useCallback((fromId, world, direction) => {
        const source = store.doc.items[fromId];
        if (!source) return;
        const size = DEFAULT_SIZE.note;
        const outgoing = Object.values(store.doc.items).filter((item) => item.type === 'edge' && item.from === fromId).length;
        const side = direction === 'left' || direction === 'top' || direction === 'bottom' ? direction : direction === 'drop' ? 'drop' : 'right';
        const stackY = outgoing * (size.h + 36);
        const stackX = outgoing * (size.w + 36);
        let centerX;
        let centerY;
        if (side === 'drop') {
          centerX = world ? world.x : source.x + source.w + 120 + size.w / 2;
          centerY = world ? world.y : source.y + source.h / 2;
        } else if (world && side !== 'right' && side !== 'left') {
          // top/bottom bubbles: stack horizontally so repeated adds do not overlap the source
          centerX = world.x + stackX;
          centerY = world.y;
        } else if (world) {
          centerX = world.x;
          centerY = world.y + stackY;
        } else if (side === 'left') {
          centerX = source.x - 120 - size.w / 2;
          centerY = source.y + source.h / 2 + stackY;
        } else if (side === 'top') {
          centerX = source.x + source.w / 2 + stackX;
          centerY = source.y - 120 - size.h / 2;
        } else if (side === 'bottom') {
          centerX = source.x + source.w / 2 + stackX;
          centerY = source.y + source.h + 120 + size.h / 2;
        } else {
          centerX = source.x + source.w + 120 + size.w / 2;
          centerY = source.y + source.h / 2 + stackY;
        }
        const note = beginItem('note', Math.round(centerX - size.w / 2), Math.round(centerY - size.h / 2));
        const edge = beginItem('edge', 0, 0, { from: fromId, to: note.id });
        commit([{ op: 'upsert', item: note }, { op: 'upsert', item: edge }]);
        setSelection([note.id]);
        startEditing(note.id);
      }, [startEditing]);

      /** One-click "add connected note": create a note beside `fromId` (or at a world point) and link it. */
      const addConnectedNode = plus;

      /** Ask the canvas AI to draw on this canvas. */
      const submitGenerate = useCallback(
        async (text) => {
          const prompt = String(text ?? '').trim();
          if (prompt === '') {
            showToast(t('aiPlaceholder'));
            return;
          }
          const scope = aiScope === 'selection' ? 'selection' : 'canvas';
          if (scope === 'selection' && selection.length === 0) {
            showToast(t('aiSelectionRequired'));
            return;
          }
          setAiBusy(true);
          try {
            const value = await callCanvas('generate', {
              prompt,
              scope,
              mode: aiMode,
              selection,
              model: modelSel ?? undefined,
              anchor:
                scope === 'canvas' && lastCanvasPointRef.current
                  ? { x: lastCanvasPointRef.current.x, y: lastCanvasPointRef.current.y }
                  : undefined,
              viewport: {
                cx: Math.round(viewportRef.current.cx),
                cy: Math.round(viewportRef.current.cy),
                zoom: Math.round(viewportRef.current.zoom * 1000) / 1000,
                vw: size.w,
                vh: size.h,
              },
            });
            setAiDialog(false);
            setAiPrompt('');
            const info = value && typeof value === 'object' ? value : {};
            if (info.mode === 'plan') {
              setAiPending(null);
              setPendingPlan({
                planId: info.planId,
                created: Number(info.created ?? 0),
                updated: Number(info.updated ?? 0),
                deleted: Number(info.deleted ?? 0),
                nodeTexts: Array.isArray(info.nodeTexts) ? info.nodeTexts : [],
                updateTexts: Array.isArray(info.updateTexts) ? info.updateTexts : [],
                warnings: Array.isArray(info.warnings) ? info.warnings : [],
              });
              return;
            }
            if (info.mode === 'direct') {
              setAiPending(null);
              showToast(
                t('aiGenerated', {
                  created: Number(info.created ?? 0),
                  updated: Number(info.updated ?? 0),
                  deleted: Number(info.deleted ?? 0),
                  rev: Number(info.revision ?? 0),
                }),
              );
              return;
            }
            const title = String(info.sessionTitle ?? '').trim();
            setAiPending({ sessionId: info.sessionId ?? '', title, at: Date.now() });
            if (Number(info.queued) > 0 || info.agentStatus === 'running') showToast(t('aiQueued'));
            else showToast(title ? t('aiSentTo', { title }) : t('aiSent'));
          } catch (error) {
            const message = String(error?.message ?? error);
            if (message.includes('unknown action')) showToast(t('hostStaleHint'));
            else showToast(t('aiDirectFailed', { message }));
          } finally {
            setAiBusy(false);
          }
        },
        [aiScope, aiMode, selection, showToast, t, size.w, size.h],
      );

      /** Confirm the previewed plan (询问 mode). */
      const confirmPendingPlan = useCallback(async () => {
        const plan = pendingPlanRef.current;
        if (!plan) return;
        setAiBusy(true);
        try {
          const value = await callCanvas('generate-apply', { planId: plan.planId });
          setPendingPlan(null);
          showToast(
            t('aiGenerated', {
              created: Number(value?.created ?? 0),
              updated: Number(value?.updated ?? 0),
              deleted: Number(value?.deleted ?? 0),
              rev: Number(value?.revision ?? 0),
            }),
          );
        } catch (error) {
          const message = String(error?.message ?? error);
          showToast(t('aiDirectFailed', { message }));
        } finally {
          setAiBusy(false);
        }
      }, [showToast, t]);

      const applySkin = useCallback(
        (next) => {
          const normalized = normalizeSkin(next);
          setSkin(normalized);
          persistSkin(normalized);
          showToast(t('skinApplied'));
        },
        [showToast, t],
      );

      const uploadSkin = useCallback(
        async (file) => {
          try {
            const entry = await readImageAsSkin(file);
            applySkin(entry);
          } catch (error) {
            showToast(t('skinUploadFailed', { message: String(error?.message ?? error) }));
          }
        },
        [applySkin, showToast, t],
      );

      const toggleDecor = useCallback(
        (id) => {
          setDecor((current) => {
            const next = current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id];
            const normalized = normalizeDecor(next);
            persistDecor(normalized);
            return normalized;
          });
          showToast(t('decorApplied'));
        },
        [showToast, t],
      );

      const savePrompt = useCallback(
        (entry) => {
          const normalized = normalizePromptEntry({ ...entry, at: Date.now() });
          if (!normalized) return;
          setPromptLib((current) => {
            const without = current.filter((item) => item.id !== normalized.id);
            const next = [...without, normalized].slice(-PROMPT_LIMIT);
            persistPrompts(next);
            return next;
          });
          showToast(t('promptSaved'));
        },
        [showToast, t],
      );

      const deletePrompt = useCallback(
        (id) => {
          setPromptLib((current) => {
            const next = current.filter((item) => item.id !== id);
            persistPrompts(next);
            return next;
          });
          showToast(t('promptDeleted'));
        },
        [showToast, t],
      );

      const pickPrompt = useCallback(
        (text) => {
          const mode = promptOpen;
          if (mode === 'agent') {
            setAiPrompt(text);
          } else if (mode === 'role') {
            setRoleEditor((current) =>
              current ? { ...current, role: String(current.role).trim() === '' ? text : `${current.role}\n\n${text}` } : current,
            );
          } else {
            const current = viewportRef.current;
            const item = beginItem('text', Math.round(current.cx - 260), Math.round(current.cy - 90), { w: 520, h: 190, text });
            commit([{ op: 'upsert', item }]);
            setSelection([item.id]);
            showToast(t('promptToCanvasDone'));
          }
          setPromptOpen(null);
        },
        [promptOpen, showToast, t],
      );

      const openRoleEditor = useCallback((id) => {
        const item = store.doc.items[id];
        if (!item || item.type !== 'agent') return;
        setRoleEditor({ id, role: item.role ?? '', output: item.output ?? 'canvas' });
      }, []);

      const saveRole = useCallback(
        (role, output) => {
          const target = roleEditorRef.current;
          if (!target) return;
          patchItem(target.id, { role: String(role ?? ''), output: output === 'document' ? 'document' : 'canvas' });
          setRoleEditor(null);
          showToast(t('roleSaved'));
        },
        [showToast, t],
      );

      /** Open the "delegate to child Agents" dialog for a coordinator card. */
      const openDelegate = useCallback(
        (id) => {
          const item = store.doc.items[id];
          if (!item || item.type !== 'agent') return;
          if (item.parentId) {
            showToast(t('agentParentLocked'));
            return;
          }
          setDelegateFor({ id });
          setDelegateText('');
        },
        [store, showToast, t],
      );

      /** Split the coordinator's task into child Agents (one project each). */
      const submitDelegate = useCallback(async () => {
        const target = delegateFor;
        if (!target) return;
        if (!store.doc.items[target.id]) {
          setDelegateFor(null);
          return;
        }
        const prompt = delegateText.trim();
        const projects =
          prompt === ''
            ? undefined
            : prompt
                .split(/[\n\r、,，;；|]+/)
                .map((part) => part.trim())
                .filter(Boolean);
        setDelegateBusy(true);
        try {
          const value = await callCanvas('delegate', { parentId: target.id, prompt, projects, model: modelSel ?? undefined });
          const count = Number(value?.children?.length ?? 0);
          setDelegateFor(null);
          setDelegateText('');
          showToast(t('delegateDone', { n: count }));
        } catch (error) {
          showToast(t('delegateFailed', { message: String(error?.message ?? error) }));
        } finally {
          setDelegateBusy(false);
        }
      }, [delegateFor, delegateText, store, showToast, t]);

      /** Context for a child Agent: its own project frame (plus its own outputs). */
      const projectContextIds = useCallback(
        (child) => {
          const ids = new Set([child.id]);
          const owner = child.frameId ? store.doc.items[child.frameId] : null;
          if (owner) ids.add(owner.id);
          Object.values(store.doc.items).forEach((item) => {
            if (!item) return;
            if (child.frameId && item.frameId === child.frameId) ids.add(item.id);
            if (item.type === 'edge' && item.from === child.id) ids.add(item.to);
          });
          return Array.from(ids).slice(0, 40);
        },
        [store],
      );

      /** Run every child Agent of a coordinator card, then summarise on the parent. */
      const runChildren = useCallback(
        async (parentId) => {
          const parent = store.doc.items[parentId];
          if (!parent || parent.type !== 'agent') return;
          const children = Object.values(store.doc.items)
            .filter((item) => item && item.type === 'agent' && item.parentId === parentId)
            .sort((left, right) => left.x - right.x || left.y - right.y);
          if (children.length === 0) {
            showToast(t('agentNoChildren'));
            return;
          }
          setChildrenRun({ parentId, done: 0, total: children.length });
          patchItem(parentId, { status: 'running', agentResult: t('agentChildrenRunning') });
          showToast(t('agentChildrenRunning'));
          let done = 0;
          let failed = 0;
          for (const child of children) {
            const task = String(child.task ?? '').trim() || String(child.text ?? '').trim();
            patchItem(child.id, { status: 'running', agentResult: '' });
            try {
              const value = await callCanvas('generate', {
                prompt: task,
                mode: 'auto',
                scope: 'canvas',
                persona: child.role ?? '',
                output: child.output === 'document' ? 'document' : 'canvas',
                anchor: { x: child.x + child.w / 2, y: child.y + child.h / 2 },
                anchorId: child.id,
                contextIds: projectContextIds(child),
                model: modelSel ?? undefined,
              });
              const summary =
                value?.mode === 'document'
                  ? t('agentDocDone', { chars: Number(value?.characters ?? 0) })
                  : t('agentDoneToast', { n: Number(value?.created ?? 0) });
              patchItem(child.id, { status: 'done', agentResult: summary });
              done += 1;
            } catch (error) {
              const message = String(error?.message ?? error);
              patchItem(child.id, { status: 'failed', agentResult: message.slice(0, 200) });
              failed += 1;
            }
            setChildrenRun({ parentId, done: done + failed, total: children.length });
          }
          const summary = t('runChildrenSummary', { done, total: children.length, failed });
          patchItem(parentId, { status: failed === children.length ? 'failed' : 'done', agentResult: summary });
          setChildrenRun(null);
          showToast(summary);
        },
        [modelSel, patchItem, projectContextIds, showToast, store, t],
      );

      /** Run one Agent card task directly on the canvas, anchored at the card. */
      const runAgentCard = useCallback(
        async (id) => {
          const item = store.doc.items[id];
          if (!item || item.type !== 'agent') return;
          const task = String(item.task ?? '').trim();
          if (task === '') {
            showToast(t('agentEmptyTask'));
            openBigEditor(id);
            return;
          }
          patchItem(id, { status: 'running', agentResult: '' });
          showToast(t('agentRunning'));
          try {
            const value = await callCanvas('generate', {
              prompt: task,
              mode: 'auto',
              scope: 'canvas',
              persona: item.role ?? '',
              output: item.output === 'document' ? 'document' : 'canvas',
              anchor: { x: item.x + item.w / 2, y: item.y + item.h / 2 },
              anchorId: id,
              model: modelSel ?? undefined,
            });
            const created = Number(value?.created ?? 0);
            const summary = value?.mode === 'document' ? t('agentDocDone', { chars: Number(value?.characters ?? 0) }) : t('agentDoneToast', { n: created });
            patchItem(id, { status: 'done', agentResult: summary });
            showToast(summary);
          } catch (error) {
            const message = String(error?.message ?? error);
            patchItem(id, { status: 'failed', agentResult: message.slice(0, 200) });
            showToast(t('agentFailedToast', { message }));
          }
        },
        [modelSel, showToast, startEditing, t],
      );

      const openAiDialog = useCallback(
        (initial, scope) => {
          setAiPrompt(initial ?? '');
          setAiScope(scope ?? (selection.length > 0 ? 'selection' : 'canvas'));
          setAiDialog(true);
        },
        [selection.length],
      );

      /** Generate a local SVG image or looping GIF and insert it as an image node. */
      const insertMedia = useCallback(async () => {
        const prompt = mediaPromptText.trim();
        if (prompt === '') {
          showToast(t('mediaPromptRequired'));
          return;
        }
        setMediaBusy(true);
        try {
          const asset = generateMediaAsset({
            kind: mediaKind,
            prompt,
            style: mediaKind === 'gif' ? mediaGifStyle : mediaStyle,
            ratio: mediaRatio,
            subtitle: t('mediaSubtitle'),
          });
          if (!asset || !asset.src) throw new Error('生成结果为空');
          const current = viewportRef.current;
          const item = beginItem('image', Math.round(current.cx - asset.width / 2), Math.round(current.cy - asset.height / 2), {
            src: asset.src,
            text: asset.title,
            w: asset.width,
            h: asset.height,
          });
          commit([{ op: 'upsert', item }]);
          setSelection([item.id]);
          setMediaOpen(false);
          setMediaPromptText('');
          showToast(t('mediaInserted'));
        } catch (error) {
          showToast(t('mediaFailed', { message: String(error?.message ?? error) }));
        } finally {
          setMediaBusy(false);
        }
      }, [mediaKind, mediaPromptText, mediaRatio, mediaGifStyle, mediaStyle, showToast, t]);

      const insertImage = (src) => {        const value = String(src ?? '').trim();
        if (!/^(https?:\/\/|data:image\/)/i.test(value)) {
          showToast(t('imagePlaceholder'));
          return;
        }
        const center = { x: viewportRef.current.cx, y: viewportRef.current.cy };
        const item = beginItem('image', center.x - 160, center.y - 120, { src: value });
        commit([{ op: 'upsert', item }]);
        setSelection([item.id]);
        setImageDialog(false);
      };

      /* ---- derived ---- */
      const items = useMemo(() => Object.values(doc.items), [doc.items]);
      const sorted = useMemo(() => items.slice().sort((a, b) => (a.z ?? 0) - (b.z ?? 0) || String(a.id).localeCompare(String(b.id))), [items]);
      const contentCount = items.filter((item) => item.type !== 'edge').length;
      const selectedItems = selection.map((id) => doc.items[id]).filter(Boolean);
      const singleSelected = selection.length === 1 ? doc.items[selection[0]] : null;
      const libraryCanvases = store.library && Array.isArray(store.library.canvases) ? store.library.canvases : [];
      const librarySnapshots = Array.isArray(store.snapshots) ? store.snapshots : [];
      // Tags extracted from card text (#tag) plus explicit meta.tags arrays.
      const canvasTags = useMemo(() => {
        const counts = new Map();
        const pattern = /(?:^|[\s(（:：])#([\p{L}\p{N}_\-/]{1,40})/gu;
        for (const item of items) {
          if (!item || item.type === 'edge' || item.type === 'stroke') continue;
          const pool = [String(item.text ?? '')];
          if (Array.isArray(item.meta?.tags)) pool.push(...item.meta.tags.map((tag) => `#${tag}`));
          for (const text of pool) {
            let match;
            pattern.lastIndex = 0;
            while ((match = pattern.exec(text)) !== null) {
              const tag = match[1];
              counts.set(tag, (counts.get(tag) ?? 0) + 1);
            }
          }
        }
        return [...counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 80);
      }, [items]);
      // Axis (number line / timeline) cards on the current canvas, managed from the left sidebar.
      const axisItems = useMemo(() => items.filter((item) => item && item.type === 'axis'), [items]);
      const renderedGraphData = graphData ?? EMPTY_GRAPH_DATA;
      const itemHasTag = (item, tag) => {
        if (!tag) return true;
        if (Array.isArray(item.meta?.tags) && item.meta.tags.includes(tag)) return true;
        return new RegExp(`(?:^|[\\s(（:：#])#${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[\\s，。,.!！?？)）])`, 'u').test(String(item.text ?? ''));
      };
      const searchResults = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (query === '') return [];
        const matches = [];
        for (const item of items) {
          if (!item || item.type === 'edge' || item.type === 'stroke') continue;
          const text = String(item.text ?? '');
          if (text.toLowerCase().includes(query) || String(item.type).includes(query)) {
            const index = text.toLowerCase().indexOf(query);
            const start = Math.max(0, index - 18);
            matches.push({
              id: item.id,
              type: item.type,
              snippet: text.slice(start, start + 68) || `(${item.type})`,
            });
            if (matches.length >= 40) break;
          }
        }
        return matches;
      }, [items, searchQuery]);
      // [[wiki links]] inside card text: who links to the selection, and what it links to.
      const linkData = useMemo(() => {
        const pattern = /\[\[([^\]|#\n]{1,120})(?:[|#][^\]\n]*)?\]\]/g;
        const outMap = new Map();
        const keysByItem = new Map();
        const itemById = new Map();
        for (const item of items) {
          if (!item || item.type === 'edge' || item.type === 'stroke') continue;
          itemById.set(item.id, item);
          const keys = new Set();
          const fileName = String(item.meta?.fileName ?? '').replace(/\.(md|markdown|txt)$/i, '').trim();
          if (fileName !== '') keys.add(fileName.toLowerCase());
          const firstLine = String(item.text ?? '').split('\n')[0].replace(/^#+\s*/, '').trim().slice(0, 60);
          if (firstLine !== '') keys.add(firstLine.toLowerCase());
          keysByItem.set(item.id, keys);
          const targets = [];
          let match;
          pattern.lastIndex = 0;
          while ((match = pattern.exec(String(item.text ?? ''))) !== null) {
            const target = match[1].trim();
            if (target !== '') targets.push(target);
          }
          if (targets.length > 0) outMap.set(item.id, [...new Set(targets)]);
        }
        const resolveTarget = (target) => {
          const wanted = String(target ?? '').trim().toLowerCase();
          if (wanted === '') return [];
          const ids = [];
          for (const [id, keys] of keysByItem) if (keys.has(wanted)) ids.push(id);
          return ids;
        };
        const selected = singleSelected && singleSelected.type !== 'edge' && singleSelected.type !== 'stroke' ? singleSelected : null;
        const outLinks = [];
        const backLinks = [];
        if (selected) {
          for (const target of outMap.get(selected.id) ?? []) {
            for (const id of resolveTarget(target)) {
              if (id !== selected.id && itemById.has(id)) outLinks.push({ id, target, item: itemById.get(id) });
            }
          }
          const selectedKeys = keysByItem.get(selected.id) ?? new Set();
          for (const [sourceId, targets] of outMap) {
            if (sourceId === selected.id) continue;
            const hit = targets.some((target) => resolveTarget(target).includes(selected.id) || selectedKeys.has(target.toLowerCase()));
            if (hit && itemById.has(sourceId)) backLinks.push({ id: sourceId, item: itemById.get(sourceId) });
          }
        }
        return { outLinks, backLinks, hasAny: outMap.size > 0 };
      }, [items, singleSelected]);
      // Canvas-native connections + shared-tag peers for the selected card (never empty for connected cards).
      const selectedRelations = useMemo(() => {
        const result = { edges: [], tagPeers: [] };
        if (!singleSelected || singleSelected.type === 'edge' || singleSelected.type === 'stroke') return result;
        const byId = new Map(items.map((item) => [item.id, item]));
        for (const item of items) {
          if (!item || item.type !== 'edge') continue;
          if (item.from === singleSelected.id && byId.has(item.to)) result.edges.push({ id: item.to, label: item.label || '→', item: byId.get(item.to) });
          else if (item.to === singleSelected.id && byId.has(item.from)) result.edges.push({ id: item.from, label: item.label || '←', item: byId.get(item.from) });
        }
        const tags = new Set();
        const pool = String(singleSelected.text ?? '');
        const pattern = /(?:^|[\s(（:：])#([\p{L}\p{N}_\-/]{1,40})/gu;
        let match;
        while ((match = pattern.exec(pool)) !== null) tags.add(match[1]);
        if (Array.isArray(singleSelected.meta?.tags)) for (const tag of singleSelected.meta.tags) tags.add(tag);
        for (const tag of tags) {
          for (const item of items) {
            if (!item || item.id === singleSelected.id || item.type === 'edge' || item.type === 'stroke') continue;
            if (new RegExp(`(?:^|[\\s(（:：#])#${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[\\s，。,.!！?？)）])`, 'u').test(String(item.text ?? ''))) {
              result.tagPeers.push({ id: item.id, tag, item });
              if (result.tagPeers.length >= 20) break;
            }
          }
          if (result.tagPeers.length >= 20) break;
        }
        return result;
      }, [items, singleSelected]);
      // Quick switcher (Ctrl/⌘+O): cards in this canvas, canvases and vault files.
      const quickResults = useMemo(() => {
        if (!quickOpen) return [];
        const query = quickQuery.trim().toLowerCase();
        const results = [];
        for (const item of items) {
          if (results.length >= 30) break;
          if (!item || item.type === 'edge' || item.type === 'stroke') continue;
          const text = String(item.text ?? '');
          if (query === '' || text.toLowerCase().includes(query) || String(item.type).includes(query)) {
            results.push({
              kind: 'card',
              id: item.id,
              label: text.split('\n')[0].slice(0, 56) || item.type,
              meta: item.type,
            });
          }
        }
        for (const canvas of libraryCanvases) {
          if (results.length >= 36) break;
          if (query === '' || String(canvas.title).toLowerCase().includes(query)) {
            results.push({ kind: 'canvas', id: canvas.id, label: canvas.title, meta: `${canvas.nodes} 节点` });
          }
        }
        for (const file of vaultFiles) {
          if (results.length >= 40) break;
          if (query === '' || String(file.name).toLowerCase().includes(query)) {
            results.push({ kind: 'file', id: file.path, label: file.name, meta: file.dir || file.kind, file });
          }
        }
        return results;
      }, [quickOpen, quickQuery, items, libraryCanvases, vaultFiles]);
      const tagDimmed = (item) => Boolean(tagFilter) && item.type !== 'edge' && item.type !== 'stroke' && !itemHasTag(item, tagFilter);
      const singleAgentChildren =
        singleSelected && singleSelected.type === 'agent'
          ? items.filter((item) => item && item.type === 'agent' && item.parentId === singleSelected.id)
          : [];
      // A project = a marked project frame, or any frame that owns an Agent card
      // (new-project frames, delegated project frames, or a frame with a dropped Agent).
      const projects = useMemo(
        () =>
          Object.values(doc.items)
            .filter((item) => item && item.type === 'frame')
            .map((frame) => ({
              frame,
              agents: Object.values(doc.items).filter(
                (item) => item && item.type === 'agent' && item.frameId === frame.id,
              ),
            }))
            .filter((entry) => entry.agents.length > 0 || entry.frame.meta?.kind === 'project')
            .sort((left, right) => left.frame.x - right.frame.x || left.frame.y - right.frame.y),
        [doc.items],
      );
      const selectionKindName = (() => {
        const names = [];
        const seen = new Set();
        for (const item of selectedItems) {
          if (!item) continue;
          const key = item.type === 'edge' ? 'connect' : item.type === 'stroke' ? 'pen' : item.type;
          if (seen.has(key)) continue;
          seen.add(key);
          names.push(t(key));
        }
        const base = names.slice(0, 2).join(' / ');
        if (selection.length === 1 && singleSelected) {
          const label = String(singleSelected.text ?? singleSelected.task ?? '').trim().replace(/\s+/g, ' ');
          if (label !== '') return `${base} · ${label.length > 14 ? `${label.slice(0, 14)}…` : label}`;
        }
        return base;
      })();
      const selectionPreview = selectedItems        .map((item) => String(item.text ?? '').trim().replace(/\s+/g, ' '))
        .filter((text) => text !== '')
        .slice(0, 1)
        .map((text) => (text.length > 42 ? `${text.slice(0, 42)}…` : text))
        .join('');
      const editingItem = editingId !== null ? doc.items[editingId] ?? null : null;
      const hasRunningAgent = items.some((item) => item.type === 'agent' && item.status === 'running');
      useEffect(() => {
        if (!hasRunningAgent) return undefined;
        const timer = setInterval(() => forceFlash((value) => value + 1), 1000);
        return () => clearInterval(timer);
      }, [hasRunningAgent]);
      const now = Date.now();
      const aiActive = store.aiAt > 0 && now - store.aiAt < 4200;
      const zoomPercent = `${Math.round(viewport.zoom * 100)}%`;
      const draftFor = (item) => {
        if (dragDraft && dragDraft[item.id]) return { ...itemBounds(item), x: dragDraft[item.id].x, y: dragDraft[item.id].y };
        if (resizeDraft && resizeDraft.id === item.id) return { x: resizeDraft.x, y: resizeDraft.y, w: resizeDraft.w, h: resizeDraft.h };
        return itemBounds(item);
      };
      // "+" quick-add bubbles: four sides of a selected node (right/left/top/bottom), or past the
      // arrow head of a selected connector.
      let plusHints = [];
      if (editingId === null && !dragDraft && !resizeDraft && !createDraft && !marquee && selection.length === 1 && singleSelected) {
        if (singleSelected.type !== 'edge' && singleSelected.type !== 'stroke') {
          // Nodes render their own "+" bubbles inside the node element; only connectors
          // and freehand strokes still use this screen-space fallback.
          plusHints = [];
        } else if (singleSelected.type === 'edge') {
          const fromItem = doc.items[singleSelected.from];
          const toItem = doc.items[singleSelected.to];
          if (fromItem && toItem) {
            const head = anchorPoint(toItem, { x: fromItem.x + fromItem.w / 2, y: fromItem.y + fromItem.h / 2 });
            const headScreen = {
              x: (head.x - viewport.cx) * viewport.zoom + size.w / 2,
              y: (head.y - viewport.cy) * viewport.zoom + size.h / 2,
            };
            plusHints = [
              {
                key: `${singleSelected.id}-right`,
                side: 'right',
                left: headScreen.x + 14,
                top: headScreen.y - 12,
                fromId: singleSelected.to,
                world: screenToWorld({ x: headScreen.x + 44, y: headScreen.y }, viewport, size),
              },
            ];
          }
        } else {
          const rect = draftFor(singleSelected);
          const screenRect = {
            x: (rect.x - viewport.cx) * viewport.zoom + size.w / 2,
            y: (rect.y - viewport.cy) * viewport.zoom + size.h / 2,
            w: rect.w * viewport.zoom,
            h: rect.h * viewport.zoom,
          };
          const midX = screenRect.x + screenRect.w / 2;
          const midY = screenRect.y + screenRect.h / 2;
          const outward = 22;
          const spawn = 60;
          const sides = [
            { side: 'right', x: screenRect.x + screenRect.w + outward, y: midY, wx: screenRect.x + screenRect.w + spawn, wy: midY },
            { side: 'left', x: screenRect.x - outward, y: midY, wx: screenRect.x - spawn, wy: midY },
            { side: 'top', x: midX, y: screenRect.y - outward, wx: midX, wy: screenRect.y - spawn },
            { side: 'bottom', x: midX, y: screenRect.y + screenRect.h + outward, wx: midX, wy: screenRect.y + screenRect.h + spawn },
          ];
          plusHints = sides.map((entry) => ({
            key: `${singleSelected.id}-${entry.side}`,
            side: entry.side,
            left: entry.x - 12,
            top: entry.y - 12,
            fromId: singleSelected.id,
            world: screenToWorld({ x: entry.wx, y: entry.wy }, viewport, size),
          }));
        }
      }
      const worldTransform = `translate(${size.w / 2 - viewport.cx * viewport.zoom}px, ${size.h / 2 - viewport.cy * viewport.zoom}px) scale(${viewport.zoom})`;
      const starZoom = viewport.zoom;
      const starOriginX = size.w / 2 - viewport.cx * viewport.zoom;
      const starOriginY = size.h / 2 - viewport.cy * viewport.zoom;
      const starBig = 4 * GRID_SIZE * starZoom;
      const starMid = 2 * GRID_SIZE * starZoom;
      const starSmall = GRID_SIZE * starZoom;
      const skinOverlayFlags = skinOverlays(skin);
      const decorCanvasActive = decorHasCanvasFx(decor);
      const decorSteinsGate = decorHas(decor, 'steinsgate');
      const skinStyle = buildSkinStyle(skin, { zoom: starZoom, ox: starOriginX, oy: starOriginY, gridSize: GRID_SIZE });
      const stageProps = {
        ref: stageRef,
        className: 'dsic-stage',
        'data-tool': tool,
        'data-space': spaceDown ? 'true' : undefined,
        'data-panning': panning ? 'true' : undefined,
        'data-create': tool === 'note' || tool === 'text' || tool === 'shape' || tool === 'frame' || tool === 'agent' || tool === 'connect' || tool === 'pen' ? 'true' : undefined,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel: onPointerUp,
        onClick: onTripleClickFallback,
        onDoubleClick: onDoubleClickFallback,
        style: {
          backgroundImage: skinStyle.backgroundImage,
          backgroundSize: skinStyle.backgroundSize,
          backgroundPosition: skinStyle.backgroundPosition,
          backgroundRepeat: skinStyle.backgroundRepeat,
          backgroundColor: 'transparent',
        },
      };

      return h(
        'div',
        { className: 'dsic-root', 'data-lang': lang, 'data-build': CLIENT_BUILD },
        h('style', null, CSS),
        h(
          'div',
          { className: 'dsic-bar' },
          h('input', {
            className: 'dsic-title',
            defaultValue: doc.title ?? '',
            placeholder: t('titlePlaceholder'),
            'aria-label': t('titlePlaceholder'),
            onBlur: (event) => commitTitle(event.target.value),
            onKeyDown: (event) => {
              event.stopPropagation();
              if (event.key === 'Enter') event.currentTarget.blur();
            },
          }),
          h('div', { className: 'dsic-sep' }),
          h(
            'div',
            { className: 'dsic-group' },
            TOOL_ITEMS.map((entry) =>
              h(ToolButton, {
                key: entry.id,
                tool: entry.icon,
                label: t(entry.id),
                shortcut: entry.shortcut,
                active: tool === entry.id,
                onSelect: () => {
                  // Agent: arm the placement tool first. The card is created where
                  // the user next clicks, and the large editor only opens after that
                  // click — never on the toolbar press itself.
                  setTool(entry.id);
                  setConnectFrom(null);
                  if (entry.id === 'note' || entry.id === 'text' || entry.id === 'shape' || entry.id === 'frame') {
                    showToast(t('createHint', { kind: t(entry.id) }));
                  } else if (entry.id === 'pen') {
                    showToast(t('penHint'));
                  } else if (entry.id === 'connect') {
                    showToast(t('connectHint'));
                  } else if (entry.id === 'agent') {
                    showToast(t('agentPlaceHint'));
                  }
                },
              }),
            ),
          ),
          h('div', { className: 'dsic-sep' }),
          h(
            'button',
            {
              type: 'button',
              className: 'dsic-btn dsic-addtext dsic-aibtn',
              title: t('aiTitle'),
              'aria-label': t('aiGenerate'),
              onClick: () => openAiDialog(''),
            },
            h(Icon, { name: 'sparkles', size: 16 }),
            h('span', null, t('aiGenerate')),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dsic-btn dsic-addtext dsic-mediabtn',
              title: t('mediaTitle'),
              'aria-label': t('mediaGenerate'),
              onClick: () => setMediaOpen(true),
            },
            h(Icon, { name: 'image', size: 16 }),
            h('span', null, t('mediaGenerate')),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dsic-btn dsic-addtext',
              title: t('promptLibTitle'),
              'aria-label': t('promptLib'),
              onClick: () => setPromptOpen('manage'),
            },
            h(Icon, { name: 'book', size: 16 }),
            h('span', null, t('promptLib')),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dsic-btn dsic-addtext',
              title: t('skinTitle'),
              'aria-label': t('skin'),
              onClick: () => setSkinOpen(true),
            },
            h(Icon, { name: 'palette', size: 16 }),
            h('span', null, t('skin')),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dsic-btn dsic-addtext dsic-projectbtn',
              title: t('projectsTitle'),
              'aria-label': t('projects'),
              'data-open': projectsOpen ? 'true' : undefined,
              ref: projectBtnRef,
              onClick: () => {
                const open = !projectsOpen;
                if (open) {
                  const rect = projectBtnRef.current && typeof projectBtnRef.current.getBoundingClientRect === 'function'
                    ? projectBtnRef.current.getBoundingClientRect()
                    : null;
                  if (rect) {
                    const width = 300;
                    const viewportWidth = typeof window !== 'undefined' && Number.isFinite(window.innerWidth) ? window.innerWidth : rect.left + width + 16;
                    const left = Math.max(8, Math.min(rect.left, viewportWidth - width - 8));
                    setProjectsAnchor({ left: Math.round(left), top: Math.round(rect.bottom + 6) });
                  }
                }
                setProjectsOpen(open);
              },
            },
            h(Icon, { name: 'frame', size: 16 }),
            h('span', null, t('projects')),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dsic-btn dsic-addtext dsic-boardbtn',
              title: `${t('historyTitle')} · ${t('boardsTitle')}`,
              'aria-label': t('history'),
              'data-open': boardsOpen ? 'true' : undefined,
              ref: boardsBtnRef,
              onClick: openBoards,
            },
            h(Icon, { name: 'undo', size: 16 }),
            h('span', null, t('history')),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dsic-btn dsic-addtext dsic-modelbtn',
              title: `${modelChoiceLabel(modelSel)} · ${t('modelTitle')}`,
              'aria-label': t('modelTitle'),
              'data-active': modelSel ? 'true' : undefined,
              onClick: () => openModelDialog(),
            },
            h(Icon, { name: 'sparkles', size: 16 }),
            h('span', null, modelLabel),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dsic-btn dsic-addtext dsic-selectallbtn',
              title: t('selectAllTip'),
              'aria-label': t('selectAll'),
              onClick: selectAllItems,
            },
            h(Icon, { name: 'check', size: 16 }),
            h('span', null, t('selectAll')),
          ),
          h('div', { className: 'dsic-spacer' }),
          h(
            'div',
            { className: 'dsic-group' },
            h(
              'button',
              { type: 'button', className: 'dsic-btn', title: t('undo'), 'aria-label': t('undo'), onClick: undo, disabled: store.history.length === 0 },
              h(Icon, { name: 'undo' }),
            ),
            h(
              'button',
              { type: 'button', className: 'dsic-btn', title: t('redo'), 'aria-label': t('redo'), onClick: redo, disabled: store.future.length === 0 },
              h(Icon, { name: 'redo' }),
            ),
          ),
          h('div', { className: 'dsic-sep' }),
          h(
            'div',
            { className: 'dsic-group' },
            h('button', { type: 'button', className: 'dsic-btn', title: t('zoomOut'), 'aria-label': t('zoomOut'), onClick: () => zoomBy(1 / 1.2) }, h(Icon, { name: 'minus' })),
            h('button', { type: 'button', className: 'dsic-btn dsic-zoom', title: t('zoomIn'), onClick: () => setViewport((current) => ({ ...current, zoom: 1 })) }, zoomPercent),
            h('button', { type: 'button', className: 'dsic-btn', title: t('zoomIn'), 'aria-label': t('zoomIn'), onClick: () => zoomBy(1.2) }, h(Icon, { name: 'plus' })),
            h('button', { type: 'button', className: 'dsic-btn', title: t('fit'), 'aria-label': t('fit'), onClick: fitToContent }, h(Icon, { name: 'fit' })),
          ),
          h('div', { className: 'dsic-sep' }),
          h(
            'div',
            { className: 'dsic-group' },
            h('button', { type: 'button', className: 'dsic-btn', title: t('insertImage'), 'aria-label': t('insertImage'), onClick: () => setImageDialog(true) }, h(Icon, { name: 'image' })),
            h(
              'button',
              {
                type: 'button',
                className: 'dsic-btn',
                title: t('deleteSelected'),
                'aria-label': t('deleteSelected'),
                disabled: selection.length === 0,
                onClick: () => {
                  if (selection.length === 0) return;
                  deleteItems(selection);
                  setSelection([]);
                },
              },
              h(Icon, { name: 'trash' }),
            ),
          ),
          h('div', { className: 'dsic-spacer' }),
          h(
            'button',
            { type: 'button', className: 'dsic-btn', title: t('settings'), 'aria-label': t('settings'), onClick: openSettings },
            h(Icon, { name: 'settings' }),
          ),
          h('button', { type: 'button', className: 'dsic-btn', title: t('help'), 'aria-label': t('help'), onClick: () => setHelpOpen(true) }, h(Icon, { name: 'help' })),
          h('div', { className: 'dsic-spacer' }),
          h(
            'div',
            { className: 'dsic-sync', title: `${store.error ?? t('live')} · build ${CLIENT_BUILD}` },
            h('span', { className: 'dsic-dot', 'data-status': store.status }),
            h('span', null, store.status === 'live' ? t('live') : store.status === 'offline' ? t('offline') : t('syncing')),
            h('span', { className: 'dsic-build' }, CLIENT_BUILD),
            store.hostStale ? h('span', { className: 'dsic-stale', title: t('hostStaleHint') }, t('hostStaleShort')) : null,
          ),
        ),
        h(
          'div',
          stageProps,
          decorCanvasActive && !graphOpen ? h(DecorFx, { key: 'canvas-decor', ids: decor }) : null,
          h('div', {
            className: 'dsic-twinkle',
            'aria-hidden': 'true',
            style: skinOverlayFlags.twinkle
              ? {
                  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.5) 1.7px, transparent 2.1px)',
                  backgroundSize: `${starBig}px ${starBig}px`,
                  backgroundPosition: `${starOriginX}px ${starOriginY}px`,
                }
              : { display: 'none' },
          }),
          skinOverlayFlags.vignette ? h('div', { className: 'dsic-vignette', 'aria-hidden': 'true' }) : null,
          skinOverlayFlags.scanlines ? h('div', { className: 'dsic-scanlines', 'aria-hidden': 'true' }) : null,
          skinOverlayFlags.scanlines ? h('div', { className: 'dsic-scanbeam', 'aria-hidden': 'true' }) : null,
          skinOverlayFlags.hud
            ? h(
                'div',
                { className: 'dsic-hud', 'aria-hidden': 'true' },
                h('i'),
                h('i'),
                h('i'),
                h('i'),
                h('span', { className: 'dsic-hud-tag dsic-hud-tag-br' }, 'SYNC · OK'),
              )
            : null,
          decorSteinsGate && !graphOpen ? h(SteinsGateDecor, { divergence, rolling: nixieRolling }) : null,
          h(
            'div',
            { className: 'dsic-world', style: { transform: worldTransform } },
            h(EdgeLayer, {
              items: doc.items,
              selection,
              zoom: viewport.zoom,
              hoveredEdge,
              onHover: setHoveredEdge,
              draftFor,
            }),
            penDraft && penDraft.length > 1
              ? h(
                  'svg',
                  { className: 'dsic-edges', width: 1, height: 1, 'aria-hidden': 'true' },
                  h('path', {
                    d: penDraft.map((entry, index) => `${index === 0 ? 'M' : 'L'} ${entry.x} ${entry.y}`).join(' '),
                    stroke: '#22d3ee',
                    strokeWidth: 3,
                    fill: 'none',
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    opacity: 0.85,
                  }),
                )
              : null,
            sorted
              .filter((item) => item.type !== 'edge' && item.type !== 'stroke')
              .map((item) =>
                h(NodeView, {
                  key: item.id,
                  item,
                  rect: draftFor(item),
                  selected: selection.includes(item.id),
                  flashing: store.aiFlash.has(item.id),
                  editing: editingId === item.id,
                  dropTarget: dragLink !== null && dragLink.targetId === item.id,
                  zoom: viewport.zoom,
                  t,
                  docItems: doc.items,
                  onRunAgent: runAgentCard,
                  onEditRole: openRoleEditor,
                  onDelegate: openDelegate,
                  onRunChildren: runChildren,
                  onOpenPath: openLocalPath,
                  onPlusDrag,
                  onAxisTick: addCardAtAxisTick,
                  showChrome: tool === 'select' && createDraft === null,
                  dimmed: tagDimmed(item),
                }),
              ),
            // Strokes have no node DOM element, so their selection chrome stays in
            // world space; every other node draws it inside its own element.
            singleSelected && editingId === null && singleSelected.type === 'stroke' && tool === 'select' && createDraft === null
              ? (() => {
                  const strokeRect = draftFor(singleSelected);
                  return h(
                    React.Fragment,
                    null,
                    h('div', {
                      className: 'dsic-selectframe',
                      'data-neon': 'true',
                      'aria-hidden': 'true',
                      style: {
                        left: strokeRect.x,
                        top: strokeRect.y,
                        width: strokeRect.w,
                        height: strokeRect.h,
                        '--dsic-frame-corner': `${Math.max(12, Math.round(18 / viewport.zoom))}px`,
                        '--dsic-frame-scan': `${Math.max(0, Math.round(strokeRect.h - 2))}px`,
                        pointerEvents: 'none',
                      },
                    }),
                    h(ResizeHandles, { rect: strokeRect, zoom: viewport.zoom }),
                  );
                })()
              : null,
            placeMarker
              ? h('div', {
                  className: 'dsic-place-marker',
                  'aria-hidden': 'true',
                  style: {
                    left: placeMarker.x,
                    top: placeMarker.y,
                    '--dsic-marker-size': `${Math.round(26 / viewport.zoom)}px`,
                    '--dsic-marker-line': `${Math.max(1, 1.5 / viewport.zoom)}px`,
                  },
                })
              : null,
            createDraft && createDraft.rect.w > 0 && createDraft.rect.h > 0
              ? h('div', {
                  className: 'dsic-create-ghost',
                  style: {
                    left: createDraft.rect.x,
                    top: createDraft.rect.y,
                    width: createDraft.rect.w,
                    height: createDraft.rect.h,
                  },
                })
              : null,
          ),
          editingItem
            ? h(EditorOverlay, {
                key: editingItem.id,
                item: editingItem,
                rect: draftFor(editingItem),
                viewport,
                stageSize: size,
                draft,
                t,
                onDraftChange: setDraft,
                onCommit: () => finishEditing(true),
                onCancel: () => finishEditing(false),
              })
            : null,
          plusHints.map((hint) =>
            h(
              'button',
              {
                key: hint.key,
                type: 'button',
                className: 'dsic-plus',
                'data-side': hint.side,
                'data-dragging': dragLink && dragLink.kind === 'plus' && dragLink.fromId === hint.fromId && dragLink.direction === hint.side ? 'true' : undefined,
                title: t('addConnected'),
                'aria-label': t('addConnected'),
                style: { left: hint.left, top: hint.top },
                onPointerDown: (event) => beginLinkDrag(event, hint.fromId, hint.world, 'plus', hint.side),
              },
              h(Icon, { name: 'plus', size: 14 }),
            ),
          ),
          dragLink
            ? h(
                'svg',
                { className: 'dsic-linkdrag', width: size.w, height: size.h, 'aria-hidden': 'true' },
                h('path', {
                  d: `M ${dragLink.sx} ${dragLink.sy} L ${dragLink.ex} ${dragLink.ey}`,
                  fill: 'none',
                  stroke: 'var(--dsw-alias-brand-primary)',
                  strokeWidth: 1.8,
                  strokeDasharray: '6 5',
                  strokeLinecap: 'round',
                }),
                h('circle', {
                  cx: dragLink.ex,
                  cy: dragLink.ey,
                  r: 5,
                  fill: 'var(--dsw-alias-brand-primary)',
                  opacity: 0.9,
                }),
              )
            : null,
          marquee
            ? h('div', {
                className: 'dsic-marquee',
                style: {
                  left: Math.min(marquee.x1, marquee.x2),
                  top: Math.min(marquee.y1, marquee.y2),
                  width: Math.abs(marquee.x2 - marquee.x1),
                  height: Math.abs(marquee.y2 - marquee.y1),
                },
              })
            : null,
          !store.loaded ? h('div', { className: 'dsic-hint' }, t(store.status === 'offline' ? 'offline' : 'loading')) : null,
          contentCount === 0 && store.loaded
            ? h(
                'div',
                { className: 'dsic-empty' },
                h(
                  'div',
                  { className: 'dsic-empty-card' },
                  h('div', { className: 'dsic-empty-title' }, h(BrandMark, { size: 20 }), ' ', t('emptyTitle')),
                  t('emptyAlias') ? h('span', { className: 'dsic-empty-alias' }, t('emptyAlias')) : null,
                  h(
                    'div',
                    { className: 'dsic-empty-modes' },
                    String(t('emptyModes'))
                      .split('|')
                      .map((mode) => mode.trim())
                      .filter(Boolean)
                      .map((mode) => h('span', { key: mode, className: 'dsic-empty-mode' }, mode)),
                  ),
                  h('p', { className: 'dsic-empty-body' }, t('emptyBody')),
                  h('div', { className: 'dsic-empty-status' }, t('emptyStatus')),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'dsic-primary dsic-empty-cta',
                      onClick: () => {
                        const created = sampleItems();
                        commit(created.map((item) => ({ op: 'upsert', item })));
                        setTimeout(() => fitToContent(), 60);
                      },
                    },
                    t('emptyCta'),
                  ),
                  h(
                    'div',
                    { className: 'dsic-chips' },
                    h(
                      'button',
                      { type: 'button', className: 'dsic-chip', onClick: () => openAiDialog('读一下我的通用画布，用一句话总结画板里有什么') },
                      t('emptyChipSummary'),
                    ),
                    h(
                      'button',
                      { type: 'button', className: 'dsic-chip', onClick: () => openAiDialog('把画板上的想法拆成 5 张便签，并排成两行，用连线表示顺序。') },
                      t('emptyChipSplit'),
                    ),
                    h(
                      'button',
                      { type: 'button', className: 'dsic-chip', onClick: () => openAiDialog('在画板上画一个流程图：从目标出发，经过三个步骤，最后到达结果。') },
                      t('emptyChipFlow'),
                    ),
                  ),
                  h('p', { className: 'dsic-empty-hint' }, t('emptyHint')),
                  h('p', { className: 'dsic-empty-hint dsic-empty-text-hint' }, t('emptyTextHint')),
                  h(
                    'div',
                    { className: 'dsic-empty-boards' },
                    h('div', { className: 'dsic-empty-sub' }, `${t('boardsTitle')} · ${libraryCanvases.length}`),
                    h(
                      'div',
                      { className: 'dsic-empty-boardchips' },
                      libraryCanvases.slice(0, 6).map((canvas) =>
                        h(
                          'button',
                          {
                            key: canvas.id,
                            type: 'button',
                            className: 'dsic-empty-boardchip',
                            'data-current': canvas.id === store.docId ? 'true' : undefined,
                            title: `${canvas.title || t('untitled')} · ${t('boardNodes', { n: canvas.nodes })}`,
                            onClick: () => switchBoard(canvas.id),
                          },
                          canvas.title || t('untitled'),
                        ),
                      ),
                      h(
                        'button',
                        { type: 'button', className: 'dsic-empty-boardchip dsic-empty-newboard', onClick: createBoard },
                        `＋ ${t('boardNew')}`,
                      ),
                    ),
                    h('div', { className: 'dsic-empty-sub' }, `${t('historyTitle')} · ${librarySnapshots.length}`),
                    h(
                      'div',
                      { className: 'dsic-empty-snaps' },
                      librarySnapshots.slice(0, 3).map((entry) =>
                        h(
                          'button',
                          {
                            key: entry.id,
                            type: 'button',
                            className: 'dsic-empty-snap',
                            title: t('historyRestoreConfirm'),
                            onClick: () => restoreSnapshotAction(entry),
                          },
                          `${entry.label || relativeWhen(entry.at)} · ${t('historyNodes', { n: Number(entry.nodes) || 0 })} ↺`,
                        ),
                      ),
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'dsic-empty-snap dsic-empty-savesnap',
                          onClick: saveSnapshot,
                          disabled: historyBusy,
                        },
                        `＋ ${t('historySave')}`,
                      ),
                    ),
                  ),
                ),
              )
            : null,
          connectFrom ? h('div', { className: 'dsic-hint' }, t('connectHint')) : null,
          aiPending
            ? h(
                'div',
                { className: 'dsic-ai dsic-aipending' },
                h(Icon, { name: 'sparkles', size: 15 }),
                h('span', null, t('aiPendingChip')),
                aiPending.sessionId
                  ? h(
                      'button',
                      { type: 'button', className: 'dsic-chip dsic-aiopen', onClick: () => openConversation(aiPending.sessionId) },
                      t('aiOpenChat'),
                    )
                  : null,
              )
            : null,
          aiActive ? h('div', { className: 'dsic-ai' }, h(Icon, { name: 'sparkles', size: 15 }), t('aiNow', { n: store.aiCount })) : null,
          selection.length > 0 && !editingId
            ? h(
                'div',
                { className: 'dsic-selbar', title: t('selectionBarHint') },
                h('span', { className: 'dsic-selbar-count' }, t('selectedCount', { n: selection.length })),
                selectionKindName
                  ? h('span', { className: 'dsic-selbar-kind' }, selectionKindName)
                  : null,
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsic-selbtn',
                    title: t('selectSameKindTip'),
                    onClick: selectSameKind,
                  },
                  h(Icon, { name: 'check', size: 15 }),
                  h('span', null, t('selectSameKind')),
                ),
                selection.length === 1 &&
                singleSelected &&
                (singleSelected.type === 'note' || singleSelected.type === 'text') &&
                String(singleSelected.meta?.filePath ?? '') !== ''
                  ? h(
                      'button',
                      {
                        type: 'button',
                        className: 'dsic-selbtn',
                        title: t('writeBackTip'),
                        onClick: () => writeBackItem(singleSelected.id),
                      },
                      h(Icon, { name: 'save', size: 15 }),
                      h('span', null, t('writeBack')),
                    )
                  : null,
                selection.length === 1 && singleSelected && singleSelected.type === 'note' && isLongCardText(singleSelected.text)
                  ? h(
                      'button',
                      {
                        type: 'button',
                        className: 'dsic-selbtn',
                        title: t('convertToDocTip'),
                        onClick: () => {
                          const width = Math.max(Number(singleSelected.w) || 280, 520);
                          patchItem(singleSelected.id, {
                            type: 'text',
                            w: width,
                            h: estimateDocHeight(singleSelected.text, width),
                          });
                        },
                      },
                      h(Icon, { name: 'text', size: 15 }),
                      h('span', null, t('convertToDoc')),
                    )
                  : null,
                selectedItems.some((item) => item && item.type !== 'edge')
                  ? h(
                      'div',
                      { className: 'dsic-selbar-colors' },
                      h('span', { className: 'dsic-selbar-label' }, t('colorLabel')),
                      COLOR_KEYS.map((color) =>
                        h('button', {
                          key: color,
                          type: 'button',
                          className: 'dsic-swatch',
                          title: NOTE_COLORS[color]?.label ?? color,
                          'aria-label': NOTE_COLORS[color]?.label ?? color,
                          'data-active': selectedItems.some((item) => item && item.color === color) ? 'true' : undefined,
                          style: { background: NOTE_COLORS[color].bg, borderColor: NOTE_COLORS[color].line },
                          onClick: () => applyColor(color),
                        }),
                      ),
                    )
                  : null,
                h('div', { className: 'dsic-sep' }),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsic-selbtn',
                    title: t('aiGenerate'),
                    onClick: () => openAiDialog('', 'selection'),
                  },
                  h(Icon, { name: 'sparkles', size: 15 }),
                  h('span', null, t('aiGenerate')),
                ),
                selection.length === 1 && singleSelected && singleSelected.type === 'agent'
                  ? h(
                      'button',
                      {
                        type: 'button',
                        className: 'dsic-selbtn',
                        title: t('agentRun'),
                        onClick: () => runAgentCard(singleSelected.id),
                      },
                      h(Icon, { name: 'play', size: 15 }),
                      h('span', null, t('agentStartShort')),
                    )
                  : null,
                selection.length === 1 && singleSelected && singleSelected.type === 'agent'
                  ? h(
                      'button',
                      {
                        type: 'button',
                        className: 'dsic-selbtn',
                        title: t('roleDialogTitle'),
                        onClick: () => openRoleEditor(singleSelected.id),
                      },
                      h(Icon, { name: 'agent', size: 15 }),
                      h('span', null, t('roleLabel')),
                    )
                  : null,
                selection.length === 1 &&
                singleSelected &&
                singleSelected.type === 'agent' &&
                !singleSelected.parentId
                  ? h(
                      'button',
                      {
                        type: 'button',
                        className: 'dsic-selbtn',
                        title: t('agentDelegateTip'),
                        onClick: () => openDelegate(singleSelected.id),
                      },
                      h(Icon, { name: 'sparkles', size: 15 }),
                      h('span', null, t('agentDelegate')),
                    )
                  : null,
                selection.length === 1 && singleSelected && singleSelected.type === 'agent' && singleAgentChildren.length > 0
                  ? h(
                      'button',
                      {
                        type: 'button',
                        className: 'dsic-selbtn',
                        title: t('agentRunChildrenTip'),
                        onClick: () => runChildren(singleSelected.id),
                      },
                      h(Icon, { name: 'play', size: 15 }),
                      h('span', null, t('agentRunChildren')),
                    )
                  : null,
                selection.length === 1 && singleSelected && singleSelected.type === 'frame'
                  ? h(
                      'button',
                      {
                        type: 'button',
                        className: 'dsic-selbtn',
                        title: t('fitFrame'),
                        onClick: () => fitFrameToContent(singleSelected),
                      },
                      h(Icon, { name: 'frame', size: 15 }),
                      h('span', null, t('fitFrame')),
                    )
                  : null,
                selection.length === 1 && singleSelected && singleSelected.type === 'frame'
                  ? h(
                      'button',
                      {
                        type: 'button',
                        className: 'dsic-selbtn',
                        title: t('frameCarryTip'),
                        'data-active': frameCarry ? 'true' : undefined,
                        onClick: () => {
                          const next = !frameCarry;
                          setFrameCarry(next);
                          persistFrameCarry(next);
                          showToast(next ? t('frameCarryOn') : t('frameCarryOff'));
                        },
                      },
                      h(Icon, { name: 'check', size: 15 }),
                      h('span', null, t('frameCarry')),
                    )
                  : null,
                selection.length === 1 && singleSelected && singleSelected.type === 'frame'
                  ? h(
                      'button',
                      {
                        type: 'button',
                        className: 'dsic-selbtn',
                        title: t('gatherFrameTip'),
                        onClick: () => gatherFrameNodes(singleSelected),
                      },
                      h(Icon, { name: 'agent', size: 15 }),
                      h('span', null, t('gatherFrame')),
                    )
                  : null,
                selection.length === 1 && singleSelected && singleSelected.type === 'frame'
                  ? h(
                      'button',
                      {
                        type: 'button',
                        className: 'dsic-selbtn',
                        title: t('pathHint'),
                        onClick: () => openPathDialog(singleSelected.id),
                      },
                      h(Icon, { name: 'book', size: 15 }),
                      h('span', null, t('linkPath')),
                    )
                  : null,
                selection.length === 1 &&
                singleSelected &&
                singleSelected.type === 'frame' &&
                String(singleSelected.meta?.workspacePath ?? '').trim() !== ''
                  ? h(
                      'button',
                      {
                        type: 'button',
                        className: 'dsic-selbtn',
                        title: String(singleSelected.meta.workspacePath),
                        onClick: () => openLocalPath(singleSelected.meta.workspacePath),
                      },
                      h(Icon, { name: 'fit', size: 15 }),
                      h('span', null, t('openWorkspace')),
                    )
                  : null,
                selection.length === 1 &&
                singleSelected &&
                singleSelected.frameId &&
                singleSelected.type !== 'frame'
                  ? h(
                      'span',
                      {
                        className: 'dsic-selbar-kind',
                        title: (store.doc.items[singleSelected.frameId] ?? {}).text || '',
                      },
                      t('frameGroupChip', {
                        name: (store.doc.items[singleSelected.frameId] ?? {}).text || t('frame'),
                      }),
                    )
                  : null,
                selection.length === 1 && singleSelected && singleSelected.frameId && singleSelected.type !== 'frame'
                  ? h(
                      'button',
                      {
                        type: 'button',
                        className: 'dsic-selbtn',
                        title: t('detachFrame'),
                        onClick: () => detachFromFrame(singleSelected.id),
                      },
                      h(Icon, { name: 'frame', size: 15 }),
                      h('span', null, t('detachFrame')),
                    )
                  : null,
                selection.length === 1 && singleSelected && singleSelected.type !== 'edge' && singleSelected.type !== 'image'
                  ? h(
                      'button',
                      {
                        type: 'button',
                        className: 'dsic-selbtn',
                        title: `${t('edit')} · Enter`,
                        onClick: () => (singleSelected.type === 'agent' ? openBigEditor(singleSelected.id) : startEditing(singleSelected.id)),
                      },
                      h(Icon, { name: 'edit' }),
                      h('span', null, t('edit')),
                    )
                  : null,
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsic-selbtn',
                    title: `${t('duplicate')} · Ctrl+D`,
                    onClick: () => {
                      const created = duplicateItems(selection);
                      if (created) setSelection(created);
                    },
                  },
                  h(Icon, { name: 'copy' }),
                  h('span', null, t('duplicate')),
                ),
                h('div', { className: 'dsic-sep' }),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsic-selbtn',
                    'data-danger': 'true',
                    title: `${t('delete')} · Del`,
                    onClick: () => {
                      deleteItems(selection);
                      setSelection([]);
                    },
                  },
                  h(Icon, { name: 'trash' }),
                  h('span', null, t('delete')),
                ),
              )
            : null,
          minimap && minimap.count > 0 && minimapOpen
            ? h(
                'div',
                {
                  className: 'dsic-minimap',
                  'aria-label': t('minimapTitle'),
                  title: t('minimapTitle'),
                  onPointerDown: (event) => event.stopPropagation(),
                  onDoubleClick: (event) => event.stopPropagation(),
                },
                h(
                  'div',
                  { className: 'dsic-minimap-head' },
                  h('span', { className: 'dsic-minimap-title' }, t('minimap')),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'dsic-minimap-toggle',
                      title: t('minimapHide'),
                      'aria-label': t('minimapHide'),
                      onPointerDown: (event) => event.stopPropagation(),
                      onClick: collapseMinimap,
                    },
                    '–',
                  ),
                ),
                h(
                  'svg',
                  {
                    ref: minimapSvgRef,
                    className: 'dsic-minimap-svg',
                    viewBox: `0 0 ${MINIMAP_W} ${MINIMAP_H}`,
                    width: MINIMAP_W,
                    height: MINIMAP_H,
                    'aria-hidden': 'true',
                    onPointerDown: onMinimapPointerDown,
                    onPointerMove: onMinimapPointerMove,
                    onPointerUp: onMinimapPointerUp,
                    onPointerCancel: onMinimapPointerUp,
                  },
                  minimap.blocks.map((block) =>
                    h('rect', {
                      key: block.id,
                      className: 'dsic-minimap-item',
                      'data-type': block.type,
                      x: block.x,
                      y: block.y,
                      width: block.w,
                      height: block.h,
                      rx: 1.4,
                      fill: block.fill,
                      opacity: block.type === 'frame' ? 0.22 : 0.8,
                      stroke: block.stroke,
                      strokeWidth: block.type === 'frame' ? 0.9 : 0.35,
                    }),
                  ),
                  h('rect', {
                    className: 'dsic-minimap-view',
                    x: minimap.view.x,
                    y: minimap.view.y,
                    width: minimap.view.w,
                    height: minimap.view.h,
                    rx: 2,
                  }),
                ),
              )
            : null,
          minimap && minimap.count > 0 && !minimapOpen
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'dsic-minimap-mini',
                  title: t('minimapShow'),
                  'aria-label': t('minimapShow'),
                  onPointerDown: (event) => event.stopPropagation(),
                  onClick: expandMinimap,
                },
                h(Icon, { name: 'fit', size: 16 }),
              )
            : null,
          h(
            'div',
            { className: 'dsic-sidebar', 'data-open': sidebarOpen ? 'true' : 'false', onPointerDown: (event) => event.stopPropagation() },
            h(
              'div',
              { className: 'dsic-sidebar-rail' },
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsic-rail-btn dsic-rail-toggle',
                  title: sidebarOpen ? t('sidebarCollapse') : t('sidebarExpand'),
                  'aria-label': sidebarOpen ? t('sidebarCollapse') : t('sidebarExpand'),
                  onClick: toggleSidebar,
                },
                h(Icon, { name: 'chevronLeft', size: 16 }),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsic-rail-btn',
                  title: t('sidebarVault'),
                  'aria-label': t('sidebarVault'),
                  'data-active': sidebarTab === 'vault' ? 'true' : undefined,
                  onClick: () => {
                    setSidebarTab('vault');
                    if (!sidebarOpen) {
                      setSidebarOpen(true);
                      persistSidebarOpen(true);
                    }
                    if (vaultPath !== '' && vaultFiles.length === 0) loadVault(vaultPath);
                  },
                },
                h(Icon, { name: 'folder', size: 17 }),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsic-rail-btn',
                  title: t('sidebarTags'),
                  'aria-label': t('sidebarTags'),
                  'data-active': sidebarTab === 'tags' ? 'true' : undefined,
                  onClick: () => {
                    setSidebarTab('tags');
                    if (!sidebarOpen) {
                      setSidebarOpen(true);
                      persistSidebarOpen(true);
                    }
                  },
                },
                h(Icon, { name: 'tag', size: 17 }),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsic-rail-btn',
                  title: t('sidebarLinks'),
                  'aria-label': t('sidebarLinks'),
                  'data-active': sidebarTab === 'links' ? 'true' : undefined,
                  onClick: () => {
                    setSidebarTab('links');
                    if (!sidebarOpen) {
                      setSidebarOpen(true);
                      persistSidebarOpen(true);
                    }
                  },
                },
                h(Icon, { name: 'link', size: 17 }),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsic-rail-btn',
                  title: t('sidebarSearch'),
                  'aria-label': t('sidebarSearch'),
                  'data-active': sidebarTab === 'search' ? 'true' : undefined,
                  onClick: () => {
                    setSidebarTab('search');
                    if (!sidebarOpen) {
                      setSidebarOpen(true);
                      persistSidebarOpen(true);
                    }
                  },
                },
                h(Icon, { name: 'search', size: 17 }),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsic-rail-btn',
                  title: t('sidebarAxis'),
                  'aria-label': t('sidebarAxis'),
                  'data-active': sidebarTab === 'axis' ? 'true' : undefined,
                  onClick: () => {
                    setSidebarTab('axis');
                    if (!sidebarOpen) {
                      setSidebarOpen(true);
                      persistSidebarOpen(true);
                    }
                  },
                },
                h(Icon, { name: 'axis', size: 17 }),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsic-rail-btn',
                  title: t('graph'),
                  'aria-label': t('graph'),
                  'data-active': graphOpen ? 'true' : undefined,
                  onClick: () => setGraphOpen(true),
                },
                h(Icon, { name: 'graph', size: 17 }),
              ),
            ),
            sidebarOpen
              ? h(
                  'div',
                  { className: 'dsic-sidebar-panel' },
                  sidebarTab === 'axis'
                    ? h(
                        React.Fragment,
                        null,
                        h('div', { className: 'dsic-sidebar-head' }, t('sidebarAxis')),
                        h('p', { className: 'dsic-sidebar-hint' }, t('sidebarAxisHint')),
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'dsic-primary dsic-axis-insert',
                            'aria-label': t('axisCreate'),
                            onClick: () => openAxisDialog(null),
                          },
                          `＋ ${t('axisCreate')}`,
                        ),
                        h(
                          'div',
                          { className: 'dsic-axis-list' },
                          axisItems.length === 0
                            ? h('p', { className: 'dsic-sidebar-empty' }, t('sidebarAxisEmpty'))
                            : axisItems.map((item) => {
                                const config = item.meta?.axis ?? {};
                                const orientation = config.orientation === 'v' ? t('axisVertical') : t('axisHorizontal');
                                const unit = String(config.unit ?? '');
                                const range = `${config.min ?? 0} → ${config.max ?? 0}${unit ? ` ${unit}` : ''}`;
                                const created = items.filter((card) => card && card.meta && card.meta.axisId === item.id).length;
                                return h(
                                  'div',
                                  {
                                    key: item.id,
                                    className: 'dsic-axis-row',
                                    'data-active': selection.includes(item.id) ? 'true' : undefined,
                                  },
                                  h(
                                    'button',
                                    {
                                      type: 'button',
                                      className: 'dsic-axis-main',
                                      title: t('sidebarAxisJump'),
                                      onClick: () => focusSearchResult({ id: item.id }),
                                    },
                                    h('span', { className: 'dsic-axis-row-title' }, String(item.text ?? '').split('\n')[0].slice(0, 40) || t('axis')),
                                    h('span', { className: 'dsic-axis-row-meta' }, `${orientation} · ${range} · ${t('axisStep')} ${config.step ?? 1}`),
                                    created > 0 ? h('span', { className: 'dsic-axis-row-count' }, t('sidebarAxisCards', { n: created })) : null,
                                  ),
                                  h(
                                    'button',
                                    {
                                      type: 'button',
                                      className: 'dsic-ghost dsic-axis-edit',
                                      title: t('axisEditTitle'),
                                      onClick: () => openAxisDialog(item),
                                    },
                                    '✎',
                                  ),
                                );
                              }),
                        ),
                      )
                    : null,
                  sidebarTab === 'vault'
                    ? h(
                        React.Fragment,
                        null,
                        h('div', { className: 'dsic-sidebar-head' }, t('sidebarVault')),
                        h('p', { className: 'dsic-sidebar-hint' }, t('sidebarVaultHint')),
                        h(
                          'div',
                          { className: 'dsic-vault-path' },
                          h('input', {
                            className: 'dsic-vault-input',
                            value: vaultInput,
                            placeholder: t('sidebarVaultPlaceholder'),
                            spellCheck: false,
                            onChange: (event) => setVaultInput(event.target.value),
                            onKeyDown: (event) => {
                              event.stopPropagation();
                              if (event.key === 'Enter') loadVault(vaultInput);
                            },
                          }),
                          h(
                            'button',
                            { type: 'button', className: 'dsic-primary dsic-vault-load', disabled: vaultBusy, onClick: () => loadVault(vaultInput) },
                            vaultBusy ? '…' : t('sidebarVaultLoad'),
                          ),
                        ),
                        vaultError ? h('p', { className: 'dsic-sidebar-error' }, vaultError) : null,
                        vaultTruncated ? h('p', { className: 'dsic-sidebar-hint' }, t('sidebarVaultTruncated', { n: vaultFiles.length })) : null,
                        h(
                          'div',
                          { className: 'dsic-vault-list' },
                          vaultFiles.length === 0
                            ? h('p', { className: 'dsic-sidebar-empty' }, vaultBusy ? '…' : t('sidebarVaultEmpty'))
                            : vaultFiles.map((file) =>
                                h(
                                  'button',
                                  {
                                    key: file.path,
                                    type: 'button',
                                    className: 'dsic-vault-row',
                                    'data-kind': file.kind,
                                    title: file.rel,
                                    disabled: vaultBusy,
                                    onClick: () => importVaultFile(file),
                                  },
                                  h('span', { className: 'dsic-vault-icon', 'aria-hidden': 'true' }, file.kind === 'canvas' ? '▦' : file.kind === 'image' ? '🖼' : file.kind === 'pdf' ? 'PDF' : '📄'),
                                  h('span', { className: 'dsic-vault-name' }, file.name),
                                  h('span', { className: 'dsic-vault-meta' }, file.dir || formatFileSize(file.size)),
                                ),
                              ),
                        ),
                      )
                    : null,
                  sidebarTab === 'tags'
                    ? h(
                        React.Fragment,
                        null,
                        h('div', { className: 'dsic-sidebar-head' }, t('sidebarTags')),
                        h('p', { className: 'dsic-sidebar-hint' }, t('sidebarTagsHint')),
                        h(
                          'div',
                          { className: 'dsic-vault-path' },
                          h('input', {
                            className: 'dsic-vault-input',
                            value: tagInput,
                            placeholder: t('tagsAddPlaceholder'),
                            spellCheck: false,
                            onChange: (event) => setTagInput(event.target.value),
                            onKeyDown: (event) => {
                              event.stopPropagation();
                              if (event.key === 'Enter') addTagToSelection();
                            },
                          }),
                          h('button', { type: 'button', className: 'dsic-ghost', title: t('tagsAddTip'), onClick: addTagToSelection }, t('tagsAdd')),
                        ),
                        globalTags && globalTags.tags.length > 0
                          ? h(
                              'div',
                              { className: 'dsic-tag-list dsic-tag-all' },
                              h('div', { className: 'dsic-links-group' }, `${t('tagsAll')} (${globalTags.tags.length})`),
                              globalTags.tags.slice(0, 30).map((entry) =>
                                h(
                                  'button',
                                  {
                                    key: `all-${entry.tag}`,
                                    type: 'button',
                                    className: 'dsic-tag-chip',
                                    onClick: () => jumpGlobalTag(entry.tag, globalTags.canvases),
                                  },
                                  `#${entry.tag}`,
                                  h('span', { className: 'dsic-tag-count' }, entry.count),
                                ),
                              ),
                            )
                          : null,
                        tagFilter
                          ? h(
                              'div',
                              { className: 'dsic-tag-active' },
                              h('span', null, t('sidebarTagActive', { tag: tagFilter })),
                              h('button', { type: 'button', className: 'dsic-ghost', onClick: () => setTagFilter('') }, t('sidebarTagClear')),
                            )
                          : null,
                        h(
                          'div',
                          { className: 'dsic-tag-list' },
                          canvasTags.length === 0
                            ? h('p', { className: 'dsic-sidebar-empty' }, t('sidebarTagsEmpty'))
                            : canvasTags.map(([tag, count]) =>
                                h(
                                  'button',
                                  {
                                    key: tag,
                                    type: 'button',
                                    className: 'dsic-tag-chip',
                                    'data-active': tagFilter === tag ? 'true' : undefined,
                                    onClick: () => setTagFilter((current) => (current === tag ? '' : tag)),
                                  },
                                  `#${tag}`,
                                  h('span', { className: 'dsic-tag-count' }, count),
                                ),
                              ),
                        ),
                      )
                    : null,
                  sidebarTab === 'links'
                    ? h(
                        React.Fragment,
                        null,
                        h('div', { className: 'dsic-sidebar-head' }, t('sidebarLinks')),
                        h('p', { className: 'dsic-sidebar-hint' }, t('sidebarLinksHint')),
                        h(
                          'div',
                          { className: 'dsic-vault-path' },
                          h('input', {
                            className: 'dsic-vault-input',
                            value: linkInput,
                            placeholder: t('linksAddPlaceholder'),
                            spellCheck: false,
                            onChange: (event) => setLinkInput(event.target.value),
                            onKeyDown: (event) => {
                              event.stopPropagation();
                              if (event.key === 'Enter') addWikiLink();
                            },
                          }),
                          h('button', { type: 'button', className: 'dsic-ghost', onClick: addWikiLink }, t('linksAdd')),
                        ),
                        !singleSelected || singleSelected.type === 'edge' || singleSelected.type === 'stroke'
                          ? h('p', { className: 'dsic-sidebar-empty' }, t('sidebarLinksNoSelection'))
                          : !linkData.hasAny && linkData.outLinks.length === 0 && linkData.backLinks.length === 0
                            ? h('p', { className: 'dsic-sidebar-empty' }, t('sidebarLinksNone'))
                            : h(
                                'div',
                                { className: 'dsic-links-list' },
                                h('div', { className: 'dsic-links-group' }, t('sidebarLinksOut')),
                                linkData.outLinks.length === 0
                                  ? h('p', { className: 'dsic-sidebar-empty' }, t('sidebarLinksNone'))
                                  : linkData.outLinks.map((entry) =>
                                      h(
                                        'button',
                                        {
                                          key: `out-${entry.id}`,
                                          type: 'button',
                                          className: 'dsic-link-row',
                                          title: entry.target,
                                          onClick: () => focusSearchResult({ id: entry.id }),
                                        },
                                        h('span', { className: 'dsic-link-arrow' }, '→'),
                                        h('span', { className: 'dsic-link-label' }, String(entry.item?.text ?? '').split('\n')[0].slice(0, 60) || entry.id),
                                        h('span', { className: 'dsic-link-target' }, entry.target),
                                      ),
                                    ),
                                h('div', { className: 'dsic-links-group' }, t('sidebarLinksIn')),
                                linkData.backLinks.length === 0
                                  ? h('p', { className: 'dsic-sidebar-empty' }, t('sidebarLinksNone'))
                                  : linkData.backLinks.map((entry) =>
                                      h(
                                        'button',
                                        {
                                          key: `in-${entry.id}`,
                                          type: 'button',
                                          className: 'dsic-link-row',
                                          onClick: () => focusSearchResult({ id: entry.id }),
                                        },
                                        h('span', { className: 'dsic-link-arrow' }, '←'),
                                        h('span', { className: 'dsic-link-label' }, String(entry.item?.text ?? '').split('\n')[0].slice(0, 60) || entry.id),
                                      ),
                                    ),
                                h('div', { className: 'dsic-links-group' }, t('linksCanvas')),
                                selectedRelations.edges.length === 0
                                  ? h('p', { className: 'dsic-sidebar-empty' }, '—')
                                  : selectedRelations.edges.map((entry) =>
                                      h(
                                        'button',
                                        { key: `edge-${entry.id}`, type: 'button', className: 'dsic-link-row', onClick: () => focusSearchResult({ id: entry.id }) },
                                        h('span', { className: 'dsic-link-arrow' }, entry.label),
                                        h('span', { className: 'dsic-link-label' }, String(entry.item?.text ?? '').split('\n')[0].slice(0, 60) || entry.id),
                                      ),
                                    ),
                                h('div', { className: 'dsic-links-group' }, t('linksSameTag')),
                                selectedRelations.tagPeers.length === 0
                                  ? h('p', { className: 'dsic-sidebar-empty' }, '—')
                                  : selectedRelations.tagPeers.map((entry) =>
                                      h(
                                        'button',
                                        { key: `peer-${entry.id}`, type: 'button', className: 'dsic-link-row', onClick: () => focusSearchResult({ id: entry.id }) },
                                        h('span', { className: 'dsic-link-arrow' }, `#${entry.tag}`),
                                        h('span', { className: 'dsic-link-label' }, String(entry.item?.text ?? '').split('\n')[0].slice(0, 60) || entry.id),
                                      ),
                                    ),
                              ),
                      )
                    : null,
                  sidebarTab === 'search'
                    ? h(
                        React.Fragment,
                        null,
                        h('div', { className: 'dsic-sidebar-head' }, t('sidebarSearch')),
                        h('input', {
                          className: 'dsic-vault-input',
                          value: searchQuery,
                          placeholder: t('sidebarSearchPlaceholder'),
                          spellCheck: false,
                          onChange: (event) => setSearchQuery(event.target.value),
                          onKeyDown: (event) => {
                            event.stopPropagation();
                            if (event.key === 'Enter') loadGlobalSearch();
                          },
                        }),
                        h(
                          'button',
                          { type: 'button', className: 'dsic-ghost', disabled: searchBusy, onClick: loadGlobalSearch },
                          searchBusy ? '…' : `${t('searchAll')} ⏎`,
                        ),
                        globalSearch
                          ? h(
                              'div',
                              { className: 'dsic-search-list' },
                              h('div', { className: 'dsic-links-group' }, `${t('searchAll')} · ${(globalSearch.cards ?? []).length + (globalSearch.files ?? []).length}`),
                              (globalSearch.cards ?? []).length + (globalSearch.files ?? []).length === 0
                                ? h('p', { className: 'dsic-sidebar-empty' }, t('searchAllEmpty'))
                                : [
                                    ...(globalSearch.cards ?? []).map((entry) =>
                                      h(
                                        'button',
                                        { key: `g-${entry.canvasId}-${entry.itemId}`, type: 'button', className: 'dsic-search-row', onClick: () => jumpGlobalCard(entry) },
                                        h('span', { className: 'dsic-search-type' }, entry.canvasTitle || entry.type),
                                        h('span', { className: 'dsic-search-snippet' }, entry.snippet),
                                      ),
                                    ),
                                    ...(globalSearch.files ?? []).map((entry) =>
                                      h(
                                        'button',
                                        { key: `gf-${entry.path}`, type: 'button', className: 'dsic-search-row', onClick: () => importVaultFile(entry) },
                                        h('span', { className: 'dsic-search-type' }, entry.kind || 'file'),
                                        h('span', { className: 'dsic-search-snippet' }, `${entry.name} — ${entry.snippet || entry.dir || ''}`),
                                      ),
                                    ),
                                  ],
                            )
                          : null,
                        searchQuery.trim() === ''
                          ? h('p', { className: 'dsic-sidebar-empty' }, t('sidebarSearchEmpty'))
                          : searchResults.length === 0
                            ? h('p', { className: 'dsic-sidebar-empty' }, t('sidebarSearchNoResult'))
                            : h(
                                React.Fragment,
                                null,
                                h('p', { className: 'dsic-sidebar-hint' }, t('sidebarSearchHint')),
                                h(
                                  'div',
                                  { className: 'dsic-search-list' },
                                  searchResults.map((entry) =>
                                    h(
                                      'button',
                                      { key: entry.id, type: 'button', className: 'dsic-search-row', onClick: () => focusSearchResult(entry) },
                                      h('span', { className: 'dsic-search-type' }, entry.type),
                                      h('span', { className: 'dsic-search-snippet' }, entry.snippet),
                                    ),
                                  ),
                                ),
                              ),
                      )
                    : null,
                )
              : null,
          ),
          graphOpen
            ? h(GraphView, {
                t,
                scope: graphScope,
                onScopeChange: setGraphScope,
                nodes: renderedGraphData.nodes,
                edges: renderedGraphData.edges,
                truncated: Boolean(renderedGraphData.truncated),
                counts: renderedGraphData.counts ?? null,
                busy: graphBusy,
                error: graphError,
                vaultReady: vaultPath !== '',
                onClose: () => setGraphOpen(false),
                onOpenNode: openGraphNode,
                onReload: () => setGraphNonce((nonce) => nonce + 1),
                showTags: graphShowTags,
                hideOrphans: graphHideOrphans,
                onToggleTags: () => setGraphShowTags((value) => !value),
                onToggleOrphans: () => setGraphHideOrphans((value) => !value),
              })
            : null,
          quickOpen
            ? h(
                'div',
                {
                  className: 'dsic-quick',
                  onPointerDown: (event) => {
                    event.stopPropagation();
                    if (event.target === event.currentTarget) closeQuickSwitcher();
                  },
                },
                h(
                  'div',
                  { className: 'dsic-quick-card', role: 'dialog', 'aria-label': t('quickTitle') },
                  h(
                    'div',
                    { className: 'dsic-quick-head' },
                    h(Icon, { name: 'search', size: 15 }),
                    h('span', { className: 'dsic-quick-title' }, t('quickTitle')),
                    h('span', { className: 'dsic-quick-hint' }, t('quickHint')),
                  ),
                  h('input', {
                    className: 'dsic-quick-input',
                    autoFocus: true,
                    value: quickQuery,
                    placeholder: t('quickPlaceholder'),
                    spellCheck: false,
                    onChange: (event) => {
                      setQuickQuery(event.target.value);
                      setQuickIndex(0);
                    },
                    onKeyDown: (event) => {
                      event.stopPropagation();
                      if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        setQuickIndex((index) => Math.min(quickResults.length - 1, index + 1));
                      } else if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        setQuickIndex((index) => Math.max(0, index - 1));
                      } else if (event.key === 'Enter') {
                        event.preventDefault();
                        chooseQuickResult(quickResults[quickIndex]);
                      } else if (event.key === 'Escape') {
                        event.preventDefault();
                        closeQuickSwitcher();
                      }
                    },
                  }),
                  h(
                    'div',
                    { className: 'dsic-quick-list' },
                    quickResults.length === 0
                      ? h('p', { className: 'dsic-sidebar-empty' }, quickQuery.trim() === '' ? t('quickHint') : t('quickNoResult'))
                      : quickResults.map((entry, index) =>
                          h(
                            'button',
                            {
                              key: `${entry.kind}-${entry.id}`,
                              type: 'button',
                              className: 'dsic-quick-row',
                              'data-active': index === quickIndex ? 'true' : undefined,
                              onMouseEnter: () => setQuickIndex(index),
                              onClick: () => chooseQuickResult(entry),
                            },
                            h(
                              'span',
                              { className: 'dsic-quick-kind' },
                              t(entry.kind === 'card' ? 'quickKindCard' : entry.kind === 'canvas' ? 'quickKindCanvas' : 'quickKindFile'),
                            ),
                            h('span', { className: 'dsic-quick-label' }, entry.label),
                            h('span', { className: 'dsic-quick-meta' }, entry.meta),
                          ),
                        ),
                  ),
                ),
              )
            : null,
          toast ? h('div', { className: 'dsic-toast' }, toast) : null,
          imageDialog
            ? h(ImageDialog, { t, onCancel: () => setImageDialog(false), onConfirm: insertImage })
            : null,
          helpOpen ? h(HelpDialog, { t, onClose: () => setHelpOpen(false) }) : null,
          axisDialog
            ? h(AxisDialog, {
                t,
                form: axisDialog,
                onChange: (key, value) => setAxisDialog((current) => (current ? { ...current, [key]: value } : current)),
                onSave: saveAxisDialog,
                onCancel: () => setAxisDialog(null),
              })
            : null,
          settingsOpen
            ? h(SettingsDialog, {
                t,
                info: settingsInfo,
                busy: settingsBusy,
                minimapOpen,
                frameCarry,
                lang,
                ai: settingsAi,
                onClose: () => setSettingsOpen(false),
                onToggleMinimap: toggleSettingsMinimap,
                onToggleFrameCarry: toggleSettingsFrameCarry,
                onLangChange: chooseLang,
                onOpenSkin: () => {
                  setSettingsOpen(false);
                  setSkinOpen(true);
                },
                onOpenFolder: openDataFolder,
                onImportDsh: importDshLibrary,
                onOpenHelp: () => {
                  setSettingsOpen(false);
                  setHelpOpen(true);
                },
                onAiChange: updateSettingsAi,
                onAiSave: saveSettingsAi,
                onAiTest: testSettingsAi,
                onAiClear: clearSettingsAiKey,
              })
            : null,
          projectsOpen
            ? h(
                'div',
                {
                  className: 'dsic-projects',
                  role: 'dialog',
                  'aria-label': t('projectsTitle'),
                  style: projectsAnchor
                    ? { position: 'fixed', left: projectsAnchor.left, top: projectsAnchor.top, right: 'auto' }
                    : undefined,
                  onPointerDown: (event) => event.stopPropagation(),
                  onClick: (event) => event.stopPropagation(),
                },
                h('div', { className: 'dsic-projects-head' }, t('projectsTitle')),
                h(
                  'button',
                  { type: 'button', className: 'dsic-projects-new', title: t('projectNewHint'), onClick: createProject },
                  `＋ ${t('projectNew')}`,
                ),
                projects.length === 0
                  ? h('div', { className: 'dsic-projects-empty' }, t('projectEmpty'))
                  : h(
                      'div',
                      { className: 'dsic-projects-list' },
                      projects.map((entry) => {
                        const workspacePath = String(entry.frame.meta?.workspacePath ?? '').trim();
                        return h(
                          'div',
                          { key: entry.frame.id, className: 'dsic-project-item' },
                          h(
                            'button',
                            {
                              type: 'button',
                              className: 'dsic-project-row',
                              title: t('projectJumpTip'),
                              onClick: () => {
                                focusProjectFrame(entry.frame);
                                setProjectsOpen(false);
                              },
                            },
                            h('span', { className: 'dsic-project-name' }, `📁 ${entry.frame.text || t('projectPrefix')}`),
                            h('span', { className: 'dsic-project-count' }, t('projectCount', { n: entry.agents.length })),
                          ),
                          workspacePath
                            ? h(
                                'button',
                                {
                                  type: 'button',
                                  className: 'dsic-project-open',
                                  title: `${t('openWorkspace')} · ${workspacePath}`,
                                  'aria-label': t('openWorkspace'),
                                  onClick: () => openLocalPath(workspacePath),
                                },
                                '📂',
                              )
                            : null,
                        );
                      }),
                    ),
              )
            : null,
          boardsOpen
            ? h(
                'div',
                {
                  className: 'dsic-boards dsic-projects',
                  role: 'dialog',
                  'aria-label': t('boardsTitle'),
                  style: boardsAnchor
                    ? { position: 'fixed', left: boardsAnchor.left, top: boardsAnchor.top, right: 'auto' }
                    : undefined,
                  onPointerDown: (event) => event.stopPropagation(),
                  onClick: (event) => event.stopPropagation(),
                },
                h('div', { className: 'dsic-projects-head' }, `${t('boardsTitle')} · ${boardList.length}`),
                h(
                  'button',
                  { type: 'button', className: 'dsic-projects-new', onClick: createBoard, disabled: boardsBusy },
                  `＋ ${t('boardNew')}`,
                ),
                boardList.length === 0
                  ? h('div', { className: 'dsic-projects-empty' }, t('boardEmpty'))
                  : h(
                      'div',
                      { className: 'dsic-projects-list' },
                      boardList.map((board) =>
                        h(
                          'div',
                          { key: board.id, className: 'dsic-board-item' },
                          h(
                            'button',
                            {
                              type: 'button',
                              className: 'dsic-board-row',
                              'data-current': board.id === store.docId ? 'true' : undefined,
                              title: t('boardsTitle'),
                              onClick: () => switchBoard(board.id),
                            },
                            h('span', { className: 'dsic-board-name' }, board.title || t('untitled')),
                            h(
                              'span',
                              { className: 'dsic-board-meta' },
                              `${t('boardNodes', { n: board.nodes })} · ${relativeWhen(board.updatedAt)}`,
                            ),
                          ),
                          h(
                            'button',
                            {
                              type: 'button',
                              className: 'dsic-board-act',
                              title: t('boardRename'),
                              'aria-label': t('boardRename'),
                              onClick: () => renameBoard(board.id, board.title),
                            },
                            '✎',
                          ),
                          h(
                            'button',
                            {
                              type: 'button',
                              className: 'dsic-board-act dsic-board-del',
                              title: t('boardDelete'),
                              'aria-label': t('boardDelete'),
                              onClick: () => deleteBoard(board.id, board.title),
                            },
                            '✕',
                          ),
                        ),
                      ),
                    ),
                h('div', { className: 'dsic-panel-sep' }),
                h('div', { className: 'dsic-projects-head dsic-history-head' }, `${t('historyTitle')} · ${historyList.length}`),
                h(
                  'button',
                  { type: 'button', className: 'dsic-projects-new', onClick: saveSnapshot, disabled: historyBusy },
                  `＋ ${t('historySave')}`,
                ),
                historyList.length === 0
                  ? h('div', { className: 'dsic-projects-empty' }, t('historyEmpty'))
                  : h(
                      'div',
                      { className: 'dsic-projects-list dsic-history-list' },
                      historyList.map((entry) =>
                        h(
                          'div',
                          { key: entry.id, className: 'dsic-history-item' },
                          h(
                            'div',
                            { className: 'dsic-history-copy' },
                            h('span', { className: 'dsic-history-label' }, entry.label || relativeWhen(entry.at)),
                            h(
                              'span',
                              { className: 'dsic-history-meta' },
                              `${relativeWhen(entry.at)} · ${t('historyNodes', { n: Number(entry.nodes) || 0 })}`,
                            ),
                          ),
                          h(
                            'button',
                            {
                              type: 'button',
                              className: 'dsic-history-act',
                              title: t('historyRestore'),
                              'aria-label': t('historyRestore'),
                              onClick: () => restoreSnapshotAction(entry),
                            },
                            '↺',
                          ),
                          h(
                            'button',
                            {
                              type: 'button',
                              className: 'dsic-history-act dsic-board-del',
                              title: t('historyDelete'),
                              'aria-label': t('historyDelete'),
                              onClick: () => removeSnapshot(entry),
                            },
                            '✕',
                          ),
                        ),
                      ),
                    ),
              )
            : null,
          aiDialog
            ? h(AiDialog, {
                t,
                initial: aiPrompt,
                scope: aiScope,
                selectionCount: selection.length,
                selectionPreview,
                mode: aiMode,
                busy: aiBusy,
                onModeChange: setAiMode,
                onScopeChange: setAiScope,
                onSubmit: submitGenerate,
                onOpenPrompts: () => setPromptOpen('agent'),
                onCancel: () => setAiDialog(false),
              })
            : null,
          pendingPlan
            ? h(AiPlanDialog, {
                t,
                plan: pendingPlan,
                busy: aiBusy,
                onConfirm: confirmPendingPlan,
                onCancel: () => setPendingPlan(null),
              })
            : null,
          mediaOpen
            ? h(MediaDialog, {                t,
                kind: mediaKind,
                prompt: mediaPromptText,
                style: mediaKind === 'gif' ? mediaGifStyle : mediaStyle,
                ratio: mediaRatio,
                busy: mediaBusy,
                onKindChange: setMediaKind,
                onPromptChange: setMediaPromptText,
                onStyleChange: mediaKind === 'gif' ? setMediaGifStyle : setMediaStyle,
                onRatioChange: setMediaRatio,
                onSubmit: insertMedia,
                onCancel: () => setMediaOpen(false),
              })
            : null,
          roleEditor
            ? h(RoleDialog, {
                t,
                initialRole: roleEditor.role,
                initialOutput: roleEditor.output,
                onOpenPrompts: () => setPromptOpen('role'),
                onSave: saveRole,
                onCancel: () => setRoleEditor(null),
              })
            : null,
          delegateFor
            ? h(DelegateDialog, {
                t,
                parentName: (store.doc.items[delegateFor.id] ?? {}).text || 'Agent',
                value: delegateText,
                busy: delegateBusy,
                onChange: setDelegateText,
                onConfirm: submitDelegate,
                onCancel: () => {
                  if (!delegateBusy) setDelegateFor(null);
                },
              })
            : null,
          pathDialog
            ? h(PathDialog, {
                t,
                title: t('pathDialogTitle'),
                hint: t('pathHint'),
                placeholder: t('pathPlaceholder'),
                value: pathDialog.value,
                onSave: savePath,
                onCancel: () => setPathDialog(null),
              })
            : null,
          modelOpen
            ? h(ModelDialog, {
                t,
                busy: modelBusy,
                catalog: modelCatalogData,
                selected: modelSel,
                onPick: pickModel,
                onClose: () => setModelOpen(false),
                onAddProvider: () => {
                  setProviderTest(null);
                  setProviderEditor({ provider: null });
                },
                onEditProvider: (provider) => {
                  setProviderTest(null);
                  setProviderEditor({ provider });
                },
                onDeleteProvider: (provider) => {
                  if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
                    if (!window.confirm(t('aiProviderDeleteConfirm', { name: provider.name }))) return;
                  }
                  deleteProvider(provider.id);
                },
                onTestProvider: (provider) => testProvider({ id: provider.id }),
                providerTest,
                providerBusy,
              })
            : null,
          providerEditor
            ? h(AiProviderDialog, {
                t,
                provider: providerEditor.provider ?? null,
                busy: providerBusy,
                test: providerTest && providerTest.providerId === '__editor__' ? providerTest : null,
                onSave: (form) => saveProvider(form),
                onTest: (form) => testProvider(form),
                onDelete: (id) => deleteProvider(id),
                onCancel: () => {
                  setProviderEditor(null);
                  setProviderTest(null);
                },
              })
            : null,
          promptOpen
            ? h(PromptDialog, {
                t,
                mode: promptOpen,
                prompts: promptLib,
                onSave: savePrompt,
                onDelete: deletePrompt,
                onPick: pickPrompt,
                onGenerate: (body) => {
                  setPromptOpen(null);
                  openAiDialog(body);
                },
                onCancel: () => setPromptOpen(null),
              })
            : null,
          skinOpen
            ? h(SkinDialog, {
                t,
                skin,
                decor,
                onApply: applySkin,
                onToggleDecor: toggleDecor,
                onUpload: uploadSkin,
                onClose: () => setSkinOpen(false),
              })
            : null,
          bigEditor
            ? h(BigEditor, {
                t,
                initial: bigEditor.value,
                placeholder: bigEditor.field === 'task' ? t('agentTaskPlaceholder') : t('bigEditorPlaceholder'),
                onSave: saveBigEditor,
                onCancel: () => setBigEditor(null),
              })
            : null,
        ),
      );
    }

    function ImageDialog({ t, onCancel, onConfirm }) {
      const [value, setValue] = useState('');
      return h(
        'div',
        {
          className: 'dsic-dialog',
          onPointerDown: (event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) onCancel();
          },
          onClick: (event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) onCancel();
          },
          onDoubleClick: (event) => event.stopPropagation(),
        },
        h(
          'div',
          { className: 'dsic-dialog-card' },
          h('div', { className: 'dsic-dialog-title' }, t('imageUrl')),
          h('input', {
            className: 'dsic-input',
            autoFocus: true,
            value,
            placeholder: t('imagePlaceholder'),
            onChange: (event) => setValue(event.target.value),
            onKeyDown: (event) => {
              event.stopPropagation();
              if (event.key === 'Enter') onConfirm(value);
              if (event.key === 'Escape') onCancel();
            },
          }),
          h(
            'div',
            { className: 'dsic-dialog-actions' },
            h('button', { type: 'button', className: 'dsic-ghost', onClick: onCancel }, t('cancel')),
            h('button', { type: 'button', className: 'dsic-primary', onClick: () => onConfirm(value) }, t('confirm')),
          ),
        ),
      );
    }

    function HelpSection({ title, body }) {
      return h(
        'section',
        { className: 'dsic-help-section' },
        h('h3', { className: 'dsic-help-section-title' }, title),
        h(
          'ul',
          { className: 'dsic-help-list' },
          String(body ?? '')
            .split('\n')
            .filter((line) => line.trim() !== '')
            .map((line, index) => h('li', { key: index }, line)),
        ),
      );
    }

    function AxisDialog({ t, form, onChange, onSave, onCancel }) {
      const field = (key, label, props = {}) =>
        h(
          'label',
          { className: 'dsic-settings-field' },
          h('span', null, label),
          h('input', {
            className: 'dsic-settings-input',
            value: form[key],
            spellCheck: false,
            onChange: (event) => onChange(key, event.target.value),
            ...props,
          }),
        );
      return h(
        'div',
        {
          className: 'dsic-dialog',
          onPointerDown: (event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) onCancel();
          },
        },
        h(
          'div',
          { className: 'dsic-dialog-card dsic-settings-card', role: 'dialog', 'aria-label': t('axisConfigTitle') },
          h(
            'div',
            { className: 'dsic-ai-head' },
            h(Icon, { name: 'axis', size: 18 }),
            h('div', { className: 'dsic-dialog-title' }, form.id ? t('axisEditTitle') : t('axisConfigTitle')),
            h('div', { className: 'dsic-spacer' }),
            h(
              'button',
              { type: 'button', className: 'dsic-btn', title: t('close'), 'aria-label': t('close'), onClick: onCancel },
              h(Icon, { name: 'close', size: 16 }),
            ),
          ),
          h(
            'div',
            { className: 'dsic-settings-aifields' },
            field('title', t('axisName'), { placeholder: t('axisTitle') }),
            h(
              'div',
              { className: 'dsic-settings-field' },
              h('span', null, t('axisOrientation')),
              h(
                'div',
                { className: 'dsic-settings-langs' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsic-settings-toggle',
                    'data-active': form.orientation !== 'v' ? 'true' : undefined,
                    onClick: () => onChange('orientation', 'h'),
                  },
                  t('axisHorizontal'),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsic-settings-toggle',
                    'data-active': form.orientation === 'v' ? 'true' : undefined,
                    onClick: () => onChange('orientation', 'v'),
                  },
                  t('axisVertical'),
                ),
              ),
            ),
            field('min', t('axisMin'), { type: 'number' }),
            field('max', t('axisMax'), { type: 'number' }),
            field('step', t('axisStep'), { type: 'number', min: '0' }),
            field('unit', t('axisUnit'), { placeholder: '年 / km / %' }),
          ),
          h(
            'div',
            { className: 'dsic-dialog-actions' },
            h('button', { type: 'button', className: 'dsic-ghost', onClick: onCancel }, t('close')),
            h('button', { type: 'button', className: 'dsic-primary', onClick: onSave }, form.id ? t('axisSave') : t('axisCreate')),
          ),
        ),
      );
    }

    function SettingsRow({ label, hint, children }) {
      return h(
        'div',
        { className: 'dsic-settings-row' },
        h(
          'div',
          { className: 'dsic-settings-copy' },
          h('span', { className: 'dsic-settings-label' }, label),
          hint ? h('span', { className: 'dsic-settings-hint' }, hint) : null,
        ),
        h('div', { className: 'dsic-settings-control' }, children),
      );
    }

    function SettingsDialog({ t, info, busy, minimapOpen, frameCarry, lang, ai, onClose, onToggleMinimap, onToggleFrameCarry, onLangChange, onOpenSkin, onOpenFolder, onImportDsh, onOpenHelp, onAiChange, onAiSave, onAiTest, onAiClear }) {
      const standalone = Boolean(info?.standalone);
      return h(
        'div',
        {
          className: 'dsic-dialog',
          onPointerDown: (event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) onClose();
          },
          onDoubleClick: (event) => event.stopPropagation(),
        },
        h(
          'div',
          { className: 'dsic-dialog-card dsic-settings-card', role: 'dialog', 'aria-label': t('settingsTitle') },
          h(
            'div',
            { className: 'dsic-ai-head' },
            h(Icon, { name: 'settings', size: 18 }),
            h('div', { className: 'dsic-dialog-title' }, t('settingsTitle')),
            h('div', { className: 'dsic-spacer' }),
            h(
              'button',
              { type: 'button', className: 'dsic-btn', title: t('settingsClose'), 'aria-label': t('settingsClose'), onClick: onClose },
              h(Icon, { name: 'close', size: 16 }),
            ),
          ),
          busy ? h('p', { className: 'dsic-ai-hint' }, t('settingsLoading')) : null,
          h('div', { className: 'dsic-settings-section' }, t('settingsAppearance')),
          h(
            SettingsRow,
            { label: t('settingsMinimap'), hint: t('settingsMinimapHint') },
            h(
              'button',
              {
                type: 'button',
                className: 'dsic-settings-toggle',
                'data-active': minimapOpen ? 'true' : undefined,
                onClick: onToggleMinimap,
              },
              minimapOpen ? t('settingsOn') : t('settingsOff'),
            ),
          ),
          h(
            SettingsRow,
            { label: t('settingsFrameCarry'), hint: t('settingsFrameCarryHint') },
            h(
              'button',
              {
                type: 'button',
                className: 'dsic-settings-toggle',
                'data-active': frameCarry ? 'true' : undefined,
                onClick: onToggleFrameCarry,
              },
              frameCarry ? t('settingsOn') : t('settingsOff'),
            ),
          ),
          h(
            SettingsRow,
            { label: t('settingsSkin'), hint: t('settingsSkinHint') },
            h('button', { type: 'button', className: 'dsic-ghost', onClick: onOpenSkin }, t('skin')),
          ),
          h('div', { className: 'dsic-settings-section' }, t('settingsLanguage')),
          h(
            SettingsRow,
            { label: lang === 'zh' ? '中文' : 'English', hint: t('settingsLanguageHint') },
            h(
              'div',
              { className: 'dsic-settings-langs' },
              h(
                'button',
                { type: 'button', className: 'dsic-settings-toggle', 'data-active': lang === 'zh' ? 'true' : undefined, onClick: () => onLangChange('zh') },
                '中文',
              ),
              h(
                'button',
                { type: 'button', className: 'dsic-settings-toggle', 'data-active': lang === 'en' ? 'true' : undefined, onClick: () => onLangChange('en') },
                'English',
              ),
            ),
          ),
          standalone
            ? h(
                React.Fragment,
                null,
                h('div', { className: 'dsic-settings-section' }, t('settingsAiTitle')),
                h('p', { className: 'dsic-settings-hint dsic-settings-aihint' }, t('settingsAiHint')),
                h(
                  'div',
                  { className: 'dsic-settings-aifields' },
                  h(
                    'label',
                    { className: 'dsic-settings-field' },
                    h('span', null, t('settingsApiBase')),
                    h('input', {
                      className: 'dsic-settings-input',
                      value: ai.baseUrl,
                      placeholder: t('settingsApiBasePlaceholder'),
                      spellCheck: false,
                      onChange: (event) => onAiChange('baseUrl', event.target.value),
                    }),
                  ),
                  h(
                    'label',
                    { className: 'dsic-settings-field' },
                    h('span', null, t('settingsApiModel')),
                    h('input', {
                      className: 'dsic-settings-input',
                      value: ai.model,
                      placeholder: t('settingsApiModelPlaceholder'),
                      spellCheck: false,
                      onChange: (event) => onAiChange('model', event.target.value),
                    }),
                  ),
                  h(
                    'label',
                    { className: 'dsic-settings-field' },
                    h('span', null, t('settingsApiKey')),
                    h('input', {
                      className: 'dsic-settings-input',
                      type: 'password',
                      value: ai.key,
                      placeholder: t('settingsApiKeyPlaceholder'),
                      spellCheck: false,
                      autoComplete: 'off',
                      onChange: (event) => onAiChange('key', event.target.value),
                    }),
                  ),
                ),
                h(
                  'div',
                  { className: 'dsic-settings-aiactions' },
                  h('button', { type: 'button', className: 'dsic-primary', disabled: busy || ai.testing, onClick: onAiSave }, t('settingsAiSave')),
                  h('button', { type: 'button', className: 'dsic-ghost', disabled: busy || ai.testing, onClick: onAiTest }, ai.testing ? t('settingsAiTesting') : t('settingsAiTest')),
                  h(
                    'button',
                    { type: 'button', className: 'dsic-ghost', disabled: busy || ai.testing || !info?.ai?.hasKey, onClick: onAiClear },
                    t('settingsAiClear'),
                  ),
                ),
                ai.result ? h('p', { className: 'dsic-settings-hint dsic-settings-airesult' }, ai.result) : null,
                h(
                  'p',
                  { className: 'dsic-settings-hint' },
                  info?.ai?.hasKey ? t('settingsAiSavedKey', { masked: info.ai.keyMasked }) : t('settingsAiNoKey'),
                ),
                h('p', { className: 'dsic-settings-hint' }, t('settingsAiLocalHint')),
              )
            : null,
          h('div', { className: 'dsic-settings-section' }, t('settingsData')),
          h(
            SettingsRow,
            { label: t('settingsDataPath'), hint: info?.dataPath ? undefined : t('settingsUnavailable') },
            h(
              'div',
              { className: 'dsic-settings-pathwrap' },
              h('code', { className: 'dsic-settings-path', title: info?.dataPath ?? '' }, info?.dataPath ?? '—'),
              h('button', { type: 'button', className: 'dsic-ghost', disabled: !info?.dataPath, onClick: onOpenFolder }, t('settingsOpenFolder')),
            ),
          ),
          h(
            SettingsRow,
            {
              label: t('settingsAbout'),
              hint: t('settingsDataStats', { canvases: Number(info?.canvases) || 0, snapshots: Number(info?.snapshots) || 0 }),
            },
            h('span', { className: 'dsic-settings-mode' }, standalone ? t('settingsModeStandalone') : t('settingsModePlugin')),
          ),          info?.canImportDsh
            ? h(
                SettingsRow,
                { label: t('settingsImportDsh'), hint: t('settingsImportDshHint') },
                h('button', { type: 'button', className: 'dsic-ghost', disabled: busy, onClick: onImportDsh }, t('settingsImportDsh')),
              )
            : null,
          h(
            'div',
            { className: 'dsic-settings-builds' },
            h('span', null, `${t('settingsClientBuild')}: ${CLIENT_BUILD}`),
            h('span', null, `${t('settingsHostBuild')}: ${info?.hostBuild ?? '—'}`),
          ),
          h(
            'div',
            { className: 'dsic-dialog-actions' },
            h('button', { type: 'button', className: 'dsic-ghost', onClick: onOpenHelp }, t('settingsHelp')),
            h('button', { type: 'button', className: 'dsic-primary', onClick: onClose }, t('settingsClose')),
          ),
        ),
      );
    }

    function HelpDialog({ t, onClose }) {
      return h(
        'div',
        {
          className: 'dsic-dialog',
          onPointerDown: (event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) onClose();
          },
          onClick: (event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) onClose();
          },
          onDoubleClick: (event) => event.stopPropagation(),
        },
        h(
          'div',
          { className: 'dsic-dialog-card dsic-help-card', role: 'dialog', 'aria-label': t('helpTitle') },
          h(
            'div',
            { className: 'dsic-help-head' },
            h('div', { className: 'dsic-dialog-title' }, t('helpTitle')),
            h(
              'button',
              { type: 'button', className: 'dsic-btn', title: t('helpClose'), 'aria-label': t('helpClose'), onClick: onClose },
              h(Icon, { name: 'close', size: 16 }),
            ),
          ),
          h(HelpSection, { title: t('helpTextTitle'), body: t('helpTextBody') }),
          h(HelpSection, { title: t('helpCanvasTitle'), body: t('helpCanvasBody') }),
          h(HelpSection, { title: t('helpBoardsTitle'), body: t('helpBoardsBody') }),
          h(HelpSection, { title: t('helpProjectTitle'), body: t('helpProjectBody') }),
          h(HelpSection, { title: t('helpMediaTitle'), body: t('helpMediaBody') }),
          h(HelpSection, { title: t('helpAxisTitle'), body: t('helpAxisBody') }),
          h(HelpSection, { title: t('helpGraphTitle'), body: t('helpGraphBody') }),
          h(HelpSection, { title: t('helpBulkTitle'), body: t('helpBulkBody') }),
          h(HelpSection, { title: t('helpUpdateTitle'), body: t('helpUpdateBody') }),
          h(HelpSection, { title: t('helpKeysTitle'), body: t('helpKeysBody') }),
          h(HelpSection, { title: t('helpAiTitle'), body: t('helpAiBody') }),
          h(
            'div',
            { className: 'dsic-dialog-actions' },
            h('button', { type: 'button', className: 'dsic-primary', onClick: onClose }, t('helpClose')),
          ),
        ),
      );
    }

    function AiDialog({ t, initial, scope, selectionCount, selectionPreview, mode, busy, onModeChange, onScopeChange, onSubmit, onOpenPrompts, onCancel }) {
      const [value, setValue] = useState(initial ?? '');
      const scopeIsSelection = scope === 'selection';
      const canSubmit = String(value).trim() !== '' && (!scopeIsSelection || selectionCount > 0) && !busy;
      const submit = () => {
        if (!canSubmit) return;
        onSubmit(value);
      };
      const scopeLabel = scopeIsSelection
        ? `${t('aiScopeSelection')} · ${t('aiSelectedCount', { n: selectionCount })}`
        : t('aiScopeCanvas');
      return h(
        'div',
        {
          className: 'dsic-dialog',
          onPointerDown: (event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) onCancel();
          },
          onClick: (event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) onCancel();
          },
          onDoubleClick: (event) => event.stopPropagation(),
        },
        h(
          'div',
          { className: 'dsic-dialog-card dsic-ai-card', role: 'dialog', 'aria-label': t('aiTitle') },
          h(
            'div',
            { className: 'dsic-ai-head' },
            h(Icon, { name: 'sparkles', size: 18 }),
            h('div', { className: 'dsic-dialog-title' }, t('aiTitle')),
          ),
          h(
            'div',
            { className: 'dsic-scope', role: 'group', 'aria-label': t('aiScopeLabel') },            h('span', { className: 'dsic-scope-label' }, t('aiScopeLabel')),
            h(
              'button',
              {
                type: 'button',
                className: 'dsic-scope-option',
                'data-active': !scopeIsSelection ? 'true' : undefined,
                onClick: () => onScopeChange('canvas'),
              },
              t('aiScopeCanvas'),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dsic-scope-option',
                'data-active': scopeIsSelection ? 'true' : undefined,
                disabled: selectionCount === 0,
                title: selectionCount === 0 ? t('aiSelectionRequired') : t('aiScopeHintSelection'),
                onClick: () => onScopeChange('selection'),
              },
              scopeLabel,
            ),
          ),
          scopeIsSelection && selectionPreview
            ? h('p', { className: 'dsic-ai-context' }, t('aiSelectionContext', { text: selectionPreview }))
            : null,
          h(
            'div',
            { className: 'dsic-scope dsic-mode', role: 'group', 'aria-label': t('aiModeLabel') },
            h('span', { className: 'dsic-scope-label' }, t('aiModeLabel')),
            h(
              'button',
              {
                type: 'button',
                className: 'dsic-scope-option',
                'data-active': mode === 'ask' ? 'true' : undefined,
                onClick: () => onModeChange('ask'),
              },
              t('aiModeAsk'),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dsic-scope-option',
                'data-active': mode === 'auto' ? 'true' : undefined,
                onClick: () => onModeChange('auto'),
              },
              t('aiModeAuto'),
            ),
            h('span', { className: 'dsic-mode-hint' }, mode === 'ask' ? t('aiModeAskHint') : t('aiModeAutoHint')),
          ),
          h('textarea', {
            className: 'dsic-ai-input',
            autoFocus: true,
            rows: 3,
            value,
            placeholder: t('aiPlaceholder'),
            onChange: (event) => setValue(event.target.value),
            onKeyDown: (event) => {
              event.stopPropagation();
              if (event.key === 'Escape') onCancel();
              else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) submit();
            },
          }),
          h(
            'div',
            { className: 'dsic-chips dsic-ai-chips' },
            [t('aiExample1'), t('aiExample2'), t('aiExample3')].map((example) =>
              h('button', { key: example, type: 'button', className: 'dsic-chip', onClick: () => setValue(example) }, example),
            ),
          ),
          h('p', { className: 'dsic-ai-hint' }, scopeIsSelection ? t('aiScopeHintSelection') : t('aiScopeHintCanvas')),
          h('p', { className: 'dsic-ai-hint' }, t('aiHint')),
          h('p', { className: 'dsic-dialog-backdrop-hint' }, t('backdropHint')),
          h(
            'div',
            { className: 'dsic-dialog-actions' },
            h('button', { type: 'button', className: 'dsic-ghost dsic-ai-prompts', onClick: onOpenPrompts }, `📚 ${t('promptLib')}`),
            h('button', { type: 'button', className: 'dsic-ghost', onClick: onCancel }, t('cancel')),
            h('button', { type: 'button', className: 'dsic-primary', onClick: submit, disabled: !canSubmit }, busy ? t('aiBusyText') : t('aiSubmit')),
          ),
        ),
      );
    }

    /** Preview of the model plan; nothing is written until the user confirms (询问 mode). */
    function AiPlanDialog({ t, plan, busy, onConfirm, onCancel }) {
      const summaryLines = [];
      if (plan.created > 0) summaryLines.push(t('aiPlanCreated', { n: plan.created }));
      if (plan.updated > 0) summaryLines.push(t('aiPlanUpdated', { n: plan.updated }));
      if (plan.deleted > 0) summaryLines.push(t('aiPlanDeleted', { n: plan.deleted }));
      return h(
        'div',
        {
          className: 'dsic-dialog',
          onPointerDown: (event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) onCancel();
          },
          onClick: (event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) onCancel();
          },
          onDoubleClick: (event) => event.stopPropagation(),
        },
        h(
          'div',
          { className: 'dsic-dialog-card dsic-plan-card', role: 'dialog', 'aria-label': t('aiPlanTitle') },
          h(
            'div',
            { className: 'dsic-ai-head' },
            h(Icon, { name: 'sparkles', size: 18 }),
            h('div', { className: 'dsic-dialog-title' }, t('aiPlanTitle')),
          ),
          h('p', { className: 'dsic-ai-hint' }, t('aiPlanIntro')),
          summaryLines.length > 0
            ? h(
                'ul',
                { className: 'dsic-plan-list' },
                summaryLines.map((line) => h('li', { key: line }, line)),
              )
            : null,
          plan.nodeTexts.length > 0
            ? h(
                'div',
                { className: 'dsic-plan-block' },
                h('span', { className: 'dsic-plan-block-title' }, t('aiPlanCreated', { n: plan.created })),
                h(
                  'ul',
                  { className: 'dsic-plan-texts' },
                  plan.nodeTexts.map((text, index) => h('li', { key: index }, text)),
                ),
              )
            : null,
          plan.updateTexts.length > 0
            ? h(
                'div',
                { className: 'dsic-plan-block' },
                h('span', { className: 'dsic-plan-block-title' }, t('aiPlanUpdated', { n: plan.updated })),
                h(
                  'ul',
                  { className: 'dsic-plan-texts' },
                  plan.updateTexts.map((text, index) => h('li', { key: index }, text)),
                ),
              )
            : null,
          plan.warnings.length > 0 ? h('p', { className: 'dsic-plan-warn' }, plan.warnings.join('；')) : null,
          h(
            'div',
            { className: 'dsic-dialog-actions' },
            h('button', { type: 'button', className: 'dsic-ghost', onClick: onCancel }, t('aiPlanCancel')),
            h('button', { type: 'button', className: 'dsic-primary', onClick: onConfirm, disabled: busy }, busy ? t('aiBusyText') : t('aiPlanConfirm')),
          ),
        ),
      );
    }

    /** Local image / GIF generation dialog with explicit capability limits. */
    function MediaDialog({ t, kind, prompt, style, ratio, busy, onKindChange, onPromptChange, onStyleChange, onRatioChange, onSubmit, onCancel }) {
      const imageStyles = [
        ['poster', t('stylePoster')],
        ['cover', t('styleCover')],
        ['banner', t('styleBanner')],
        ['card', t('styleCard')],
        ['abstract', t('styleAbstract')],
      ];
      const gifStyles = [
        ['waves', t('styleWaves')],
        ['pulse', t('stylePulse')],
        ['orbit', t('styleOrbit')],
        ['bars', t('styleBars')],
      ];
      const styles = kind === 'gif' ? gifStyles : imageStyles;
      const ratios = [
        ['wide', t('ratioWide')],
        ['square', t('ratioSquare')],
        ['tall', t('ratioTall')],
      ];
      return h(
        'div',
        {
          className: 'dsic-dialog',
          onPointerDown: (event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) onCancel();
          },
          onClick: (event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) onCancel();
          },
          onDoubleClick: (event) => event.stopPropagation(),
        },
        h(
          'div',
          { className: 'dsic-dialog-card dsic-media-card', role: 'dialog', 'aria-label': t('mediaTitle') },
          h(
            'div',
            { className: 'dsic-ai-head' },
            h(Icon, { name: 'image', size: 18 }),
            h('div', { className: 'dsic-dialog-title' }, t('mediaTitle')),
          ),
          h(
            'div',
            { className: 'dsic-tabs', role: 'tablist' },
            h(
              'button',
              { type: 'button', className: 'dsic-tab', 'data-active': kind === 'image' ? 'true' : undefined, onClick: () => onKindChange('image') },
              t('mediaTabImage'),
            ),
            h(
              'button',
              { type: 'button', className: 'dsic-tab', 'data-active': kind === 'gif' ? 'true' : undefined, onClick: () => onKindChange('gif') },
              t('mediaTabGif'),
            ),
          ),
          h('label', { className: 'dsic-field-label' }, t('mediaPromptLabel')),
          h('input', {
            className: 'dsic-input',
            value: prompt,
            placeholder: t('mediaPromptPlaceholder'),
            disabled: busy,
            onChange: (event) => onPromptChange(event.target.value),
            onKeyDown: (event) => {
              event.stopPropagation();
              if (event.key === 'Escape') onCancel();
              else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) onSubmit();
            },
          }),
          h(
            'div',
            { className: 'dsic-scope' },
            h('span', { className: 'dsic-scope-label' }, t('mediaStyleLabel')),
            styles.map(([id, label]) =>
              h(
                'button',
                {
                  key: id,
                  type: 'button',
                  className: 'dsic-scope-option',
                  'data-active': style === id ? 'true' : undefined,
                  onClick: () => onStyleChange(id),
                },
                label,
              ),
            ),
          ),
          kind === 'gif'
            ? null
            : h(
                'div',
                { className: 'dsic-scope' },
                h('span', { className: 'dsic-scope-label' }, t('mediaRatioLabel')),
                ratios.map(([id, label]) =>
                  h(
                    'button',
                    {
                      key: id,
                      type: 'button',
                      className: 'dsic-scope-option',
                      'data-active': ratio === id ? 'true' : undefined,
                      onClick: () => onRatioChange(id),
                    },
                    label,
                  ),
                ),
              ),
          h(
            'div',
            { className: 'dsic-media-limits' },
            h('span', { className: 'dsic-media-limits-title' }, t('mediaLimitTitle')),
            String(t('mediaLimits'))
              .split('\n')
              .map((line, index) => h('div', { key: index, className: 'dsic-media-limit-line' }, line)),
          ),
          h(
            'div',
            { className: 'dsic-dialog-actions' },
            h('button', { type: 'button', className: 'dsic-ghost', onClick: onCancel }, t('cancel')),
            h(
              'button',
              { type: 'button', className: 'dsic-primary', onClick: onSubmit, disabled: busy || String(prompt).trim() === '' },
              busy ? t('mediaBusy') : t('mediaGenerateBtn'),
            ),
          ),
        ),
      );
    }

    /** Role / persona editor for an Agent card. */
    /** Canvas AI model picker: provider-grouped models plus "follow default". */
    function ModelDialog({
      t,
      busy,
      catalog,
      selected,
      onPick,
      onClose,
      onAddProvider,
      onEditProvider,
      onDeleteProvider,
      onTestProvider,
      providerTest,
      providerBusy,
    }) {
      const groups = Array.isArray(catalog?.providers) ? catalog.providers : [];
      const customProviders = Array.isArray(catalog?.customProviders) ? catalog.customProviders : [];
      const defaultSelection = catalog?.default ?? catalog?.current ?? null;
      const selectedKey = selected
        ? selected.source === 'custom'
          ? `custom::${selected.providerId}::${selected.model}`
          : `${selected.provider}::${selected.model}`
        : '';
      const describeDefault = (() => {
        if (!defaultSelection) return '';
        if (defaultSelection.source === 'custom') {
          const provider = customProviders.find((entry) => entry.id === defaultSelection.providerId);
          return `${provider?.name ?? t('aiProviders')} / ${defaultSelection.model ?? ''}`;
        }
        return `${defaultSelection.provider ?? ''} / ${defaultSelection.model ?? ''}`;
      })();
      return h(
        'div',
        {
          className: 'dsic-dialog',
          onPointerDown: (event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) onClose();
          },
          onClick: (event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) onClose();
          },
          onDoubleClick: (event) => event.stopPropagation(),
        },
        h(
          'div',
          { className: 'dsic-dialog-card dsic-model-card', role: 'dialog', 'aria-label': t('modelTitle') },
          h(
            'div',
            { className: 'dsic-ai-head' },
            h(Icon, { name: 'sparkles', size: 18 }),
            h('div', { className: 'dsic-dialog-title' }, t('modelTitle')),
            h('button', { type: 'button', className: 'dsic-model-close', title: t('modelClose'), onClick: onClose }, '✕'),
          ),
          h('div', { className: 'dsic-role-hint' }, t('modelHint')),
          busy
            ? h('div', { className: 'dsic-model-status' }, t('modelLoading'))
            : h(
                'div',
                { className: 'dsic-model-list' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsic-model-row',
                    'data-active': selected ? undefined : 'true',
                    onClick: () => onPick(null),
                  },
                  h('span', { className: 'dsic-model-name' }, `✨ ${t('modelFollowDefault')}`),
                  describeDefault ? h('span', { className: 'dsic-model-tag' }, describeDefault) : null,
                ),
                groups.map((group) =>
                  h(
                    'div',
                    { key: group.id || group.name, className: 'dsic-model-group' },
                    h('div', { className: 'dsic-model-provider' }, group.name || group.id),
                    (Array.isArray(group.models) ? group.models : []).map((entry) => {
                      const key = `${group.id}::${entry.id}`;
                      const isDefault =
                        defaultSelection && defaultSelection.provider === group.id && defaultSelection.model === entry.id;
                      return h(
                        'button',
                        {
                          key,
                          type: 'button',
                          className: 'dsic-model-row',
                          'data-active': selectedKey === key ? 'true' : undefined,
                          title: entry.description ?? '',
                          onClick: () => onPick({ provider: group.id, model: entry.id }),
                        },
                        h('span', { className: 'dsic-model-name' }, entry.name || entry.id),
                        selectedKey === key ? h('span', { className: 'dsic-model-tag' }, t('modelCurrentTag')) : null,
                        isDefault && selectedKey !== key ? h('span', { className: 'dsic-model-tag' }, t('modelDefaultTag')) : null,
                      );
                    }),
                  ),
                ),
                h(
                  'div',
                  { className: 'dsic-model-custom-head' },
                  h('span', { className: 'dsic-model-provider' }, t('aiProviders')),
                  h('button', { type: 'button', className: 'dsic-ghost dsic-model-add', onClick: onAddProvider }, `＋ ${t('aiProviderAdd')}`),
                ),
                customProviders.length === 0
                  ? h('p', { className: 'dsic-model-empty' }, t('aiProviderEmpty'))
                  : customProviders.map((provider) =>
                      h(
                        'div',
                        { key: provider.id, className: 'dsic-model-group' },
                        h(
                          'div',
                          { className: 'dsic-model-provider-row' },
                          h('span', { className: 'dsic-model-provider' }, provider.name || provider.baseUrl || t('aiProviders')),
                          h('span', { className: 'dsic-model-provider-url' }, provider.baseUrl || ''),
                          provider.hasKey === false ? h('span', { className: 'dsic-model-warn' }, t('aiProviderKeyMissing')) : null,
                          h(
                            'span',
                            { className: 'dsic-model-actions' },
                            h(
                              'button',
                              { type: 'button', className: 'dsic-model-act', title: t('aiProviderTest'), onClick: () => onTestProvider(provider) },
                              '⚡',
                            ),
                            h(
                              'button',
                              { type: 'button', className: 'dsic-model-act', title: t('aiProviderEdit'), onClick: () => onEditProvider(provider) },
                              '✎',
                            ),
                            h(
                              'button',
                              { type: 'button', className: 'dsic-model-act', title: t('aiProviderDelete'), onClick: () => onDeleteProvider(provider) },
                              '✕',
                            ),
                          ),
                        ),
                        (Array.isArray(provider.models) ? provider.models : []).map((modelId) => {
                          const key = `custom::${provider.id}::${modelId}`;
                          const active = selectedKey === key;
                          return h(
                            'button',
                            {
                              key,
                              type: 'button',
                              className: 'dsic-model-row',
                              'data-active': active ? 'true' : undefined,
                              onClick: () =>
                                onPick({ source: 'custom', providerId: provider.id, model: modelId, providerName: provider.name }),
                            },
                            h('span', { className: 'dsic-model-name' }, modelId),
                            active ? h('span', { className: 'dsic-model-tag' }, t('modelCurrentTag')) : null,
                            provider.defaultModel === modelId && !active ? h('span', { className: 'dsic-model-tag' }, t('modelDefaultTag')) : null,
                          );
                        }),
                        providerTest && providerTest.ok !== undefined && providerTest.providerId === provider.id
                          ? h(
                              'p',
                              { className: providerTest.ok ? 'dsic-model-testok' : 'dsic-model-testerr' },
                              providerTest.ok
                                ? `${t('aiProviderTestOk')} · ${providerTest.latencyMs}ms · ${providerTest.model || ''}${providerTest.reply ? ` · ${providerTest.reply}` : ''}`
                                : t('aiProviderTestFailed', { message: providerTest.message || '' }),
                            )
                          : null,
                      ),
                    ),
              ),
          h(
            'div',
            { className: 'dsic-model-foot' },
            h('span', null, t('aiProviderKeyHint')),
            providerBusy ? h('span', { className: 'dsic-model-footbusy' }, t('aiProviderTesting')) : null,
          ),
        ),
      );
    }

    /** Built-in endpoint presets for the custom-provider editor. */
    const AI_PROVIDER_PRESETS = [
      { name: 'DeepSeek 官方', baseUrl: 'https://api.deepseek.com/v1', models: 'deepseek-chat, deepseek-reasoner' },
      { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', models: 'gpt-4o-mini, gpt-4o' },
      { name: 'Kimi', baseUrl: 'https://api.moonshot.cn/v1', models: 'moonshot-v1-8k, moonshot-v1-32k' },
      { name: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: 'glm-4-flash, glm-4-plus' },
      { name: 'Ollama 本地', baseUrl: 'http://127.0.0.1:11434/v1', models: 'qwen2.5:14b, llama3.1:8b' },
    ];

    /** Add / edit one OpenAI-compatible endpoint. */
    function AiProviderDialog({ t, provider, busy, test, onSave, onTest, onDelete, onCancel }) {
      const existing = provider && provider.id ? provider : null;
      const [name, setName] = useState(existing?.name ?? '');
      const [baseUrl, setBaseUrl] = useState(existing?.baseUrl ?? '');
      const [apiKey, setApiKey] = useState('');
      const [modelsText, setModelsText] = useState(Array.isArray(existing?.models) ? existing.models.join(', ') : '');
      const [defaultModel, setDefaultModel] = useState(existing?.defaultModel ?? '');
      const [temperature, setTemperature] = useState(String(existing?.params?.temperature ?? 0.4));
      const [maxTokens, setMaxTokens] = useState(String(existing?.params?.maxTokens ?? 2400));
      const [timeoutSec, setTimeoutSec] = useState(String(Math.round((Number(existing?.params?.timeoutMs) || 90000) / 1000)));
      const [advanced, setAdvanced] = useState(false);
      const parsedModels = [...new Set(String(modelsText).split(/[\n,，;；]+/).map((entry) => entry.trim()).filter(Boolean))];
      const effectiveDefault = parsedModels.includes(defaultModel) ? defaultModel : parsedModels[0] || '';
      const buildForm = () => {
        const payload = {
          name: String(name).trim() || t('aiProviders'),
          baseUrl: String(baseUrl).trim(),
          models: parsedModels,
          defaultModel: effectiveDefault,
          params: {
            temperature: Number(temperature) || 0,
            maxTokens: Number(maxTokens) || 2400,
            timeoutMs: Math.round((Number(timeoutSec) || 90) * 1000),
          },
        };
        if (existing) payload.id = existing.id;
        if (String(apiKey).trim() !== '') payload.apiKey = String(apiKey).trim();
        return payload;
      };
      const canSave = String(baseUrl).trim() !== '' && parsedModels.length > 0;
      const field = (label, node) =>
        h(
          'label',
          { className: 'dsic-provider-field' },
          h('span', null, label),
          node,
        );
      const textInput = (value, onChange, placeholder, extra = {}) =>
        h('input', {
          value,
          placeholder,
          spellCheck: false,
          ...extra,
          onChange: (event) => onChange(event.target.value),
          onKeyDown: (event) => {
            event.stopPropagation();
            if (event.key === 'Escape') onCancel();
          },
        });
      return h(
        'div',
        {
          className: 'dsic-dialog',
          onPointerDown: (event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) onCancel();
          },
          onClick: (event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) onCancel();
          },
          onDoubleClick: (event) => event.stopPropagation(),
        },
        h(
          'div',
          { className: 'dsic-dialog-card dsic-provider-card', role: 'dialog', 'aria-label': existing ? t('aiProviderEdit') : t('aiProviderAdd') },
          h(
            'div',
            { className: 'dsic-ai-head' },
            h(Icon, { name: 'settings', size: 18 }),
            h('div', { className: 'dsic-dialog-title' }, existing ? t('aiProviderEdit') : t('aiProviderAdd')),
            h('button', { type: 'button', className: 'dsic-model-close', title: t('close'), onClick: onCancel }, '✕'),
          ),
          h('p', { className: 'dsic-role-hint' }, t('aiProviderFormHint')),
          h(
            'div',
            { className: 'dsic-provider-presets' },
            AI_PROVIDER_PRESETS.map((preset) =>
              h(
                'button',
                {
                  key: preset.name,
                  type: 'button',
                  className: 'dsic-model-tag dsic-provider-preset',
                  onClick: () => {
                    setName(preset.name);
                    setBaseUrl(preset.baseUrl);
                    setModelsText(preset.models);
                    setDefaultModel('');
                  },
                },
                preset.name,
              ),
            ),
          ),
          field(t('aiProviderName'), textInput(name, setName, t('aiProviderNamePlaceholder'))),
          field(t('aiProviderBaseUrl'), textInput(baseUrl, setBaseUrl, t('aiProviderBaseUrlPlaceholder'))),
          field(
            t('aiProviderKey'),
            textInput(apiKey, setApiKey, existing?.hasKey ? t('aiProviderKeySaved', { masked: existing.keyMasked || '' }) : t('aiProviderKeyPlaceholder'), {
              type: 'password',
            }),
          ),
          field(t('aiProviderModels'), textInput(modelsText, setModelsText, t('aiProviderModelsPlaceholder'))),
          field(
            t('aiProviderDefaultModel'),
            h(
              'select',
              {
                value: effectiveDefault,
                onChange: (event) => setDefaultModel(event.target.value),
              },
              (parsedModels.length === 0 ? [''] : parsedModels).map((modelId) =>
                h('option', { key: modelId || 'empty', value: modelId }, modelId || '—'),
              ),
            ),
          ),
          h(
            'button',
            { type: 'button', className: 'dsic-ghost dsic-provider-advanced-toggle', onClick: () => setAdvanced((value) => !value) },
            `${advanced ? '▾' : '▸'} ${t('aiProviderAdvanced')}`,
          ),
          advanced
            ? h(
                'div',
                { className: 'dsic-provider-advanced' },
                h(
                  'div',
                  { className: 'dsic-provider-row' },
                  field(t('aiProviderTemperature'), textInput(temperature, setTemperature, '0.4', { type: 'number', step: '0.1', min: '0', max: '2' })),
                  field(t('aiProviderMaxTokens'), textInput(maxTokens, setMaxTokens, '2400', { type: 'number', min: '256' })),
                  field(t('aiProviderTimeout'), textInput(timeoutSec, setTimeoutSec, '90', { type: 'number', min: '5' })),
                ),
              )
            : null,
          test && test.ok !== undefined
            ? h(
                'p',
                { className: test.ok ? 'dsic-provider-test dsic-model-testok' : 'dsic-provider-test dsic-model-testerr' },
                test.ok
                  ? `${t('aiProviderTestOk')} · ${test.latencyMs}ms · ${test.model || ''}${test.reply ? ` · ${test.reply}` : ''}`
                  : t('aiProviderTestFailed', { message: test.message || '' }),
              )
            : null,
          h(
            'div',
            { className: 'dsic-provider-actions' },
            existing
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsic-ghost',
                    disabled: busy,
                    onClick: () => {
                      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
                        if (!window.confirm(t('aiProviderDeleteConfirm', { name: existing.name }))) return;
                      }
                      onDelete(existing.id);
                    },
                  },
                  t('aiProviderDelete'),
                )
              : null,
            h(
              'button',
              { type: 'button', className: 'dsic-ghost', disabled: busy, onClick: () => onTest(buildForm()) },
              busy ? t('aiProviderTesting') : t('aiProviderTest'),
            ),
            h('button', { type: 'button', className: 'dsic-ghost', onClick: onCancel }, t('cancel')),
            h(
              'button',
              { type: 'button', className: 'dsic-primary', disabled: busy || !canSave, onClick: () => onSave(buildForm()) },
              t('aiProviderSave'),
            ),
          ),
        ),
      );
    }

    /** Link a project frame to a local file or folder path. */
    function PathDialog({ t, title, hint, placeholder, value, onSave, onCancel }) {
      const [path, setPath] = useState(value ?? '');
      return h(
        'div',
        {
          className: 'dsic-dialog',
          onPointerDown: (event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) onCancel();
          },
          onClick: (event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) onCancel();
          },
          onDoubleClick: (event) => event.stopPropagation(),
        },
        h(
          'div',
          { className: 'dsic-dialog-card dsic-path-card', role: 'dialog', 'aria-label': title },
          h(
            'div',
            { className: 'dsic-ai-head' },
            h(Icon, { name: 'book', size: 18 }),
            h('div', { className: 'dsic-dialog-title' }, title),
          ),
          h('div', { className: 'dsic-role-hint' }, hint),
          h('input', {
            className: 'dsic-path-input',
            value: path,
            placeholder,
            spellCheck: false,
            onChange: (event) => setPath(event.target.value),
            onKeyDown: (event) => {
              event.stopPropagation();
              if (event.key === 'Escape') onCancel();
              else if (event.key === 'Enter') onSave(path);
            },
          }),
          h(
            'div',
            { className: 'dsic-dialog-actions' },
            h('button', { type: 'button', className: 'dsic-ghost', onClick: onCancel }, t('cancel')),
            h('button', { type: 'button', className: 'dsic-primary', onClick: () => onSave(path) }, t('pathSave')),
          ),
        ),
      );
    }

    function DelegateDialog({ t, parentName, value, busy, onChange, onConfirm, onCancel }) {
      return h(
        'div',
        {
          className: 'dsic-dialog',
          onPointerDown: (event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) onCancel();
          },
          onClick: (event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) onCancel();
          },
          onDoubleClick: (event) => event.stopPropagation(),
        },
        h(
          'div',
          { className: 'dsic-dialog-card dsic-delegate-card', role: 'dialog', 'aria-label': t('delegateTitle') },
          h(
            'div',
            { className: 'dsic-ai-head' },
            h(Icon, { name: 'sparkles', size: 18 }),
            h('div', { className: 'dsic-dialog-title' }, t('delegateTitle')),
            h('div', { className: 'dsic-delegate-parent' }, parentName),
          ),
          h('div', { className: 'dsic-role-hint' }, t('delegateHint')),
          h(
            'textarea',
            {
              className: 'dsic-role-input dsic-delegate-input',
              value,
              placeholder: t('delegatePlaceholder'),
              spellCheck: false,
              onChange: (event) => onChange(event.target.value),
              onKeyDown: (event) => {
                event.stopPropagation();
                if (event.key === 'Escape' && !busy) onCancel();
                else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) onConfirm();
              },
            },
          ),
          h(
            'div',
            { className: 'dsic-dialog-actions' },
            h('button', { type: 'button', className: 'dsic-ghost', onClick: onCancel, disabled: busy }, t('cancel')),
            h(
              'button',
              {
                type: 'button',
                className: 'dsic-primary',
                onClick: onConfirm,
                disabled: busy,
                'data-busy': busy ? 'true' : undefined,
              },
              busy ? t('delegateBusy') : t('delegateConfirm'),
            ),
          ),
        ),
      );
    }

    function RoleDialog({ t, initialRole, initialOutput, onOpenPrompts, onSave, onCancel }) {
      const [role, setRole] = useState(initialRole ?? '');
      const [output, setOutput] = useState(initialOutput === 'document' ? 'document' : 'canvas');
      return h(
        'div',
        {
          className: 'dsic-dialog',
          onPointerDown: (event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) onCancel();
          },
          onClick: (event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) onCancel();
          },
          onDoubleClick: (event) => event.stopPropagation(),
        },
        h(
          'div',
          { className: 'dsic-dialog-card dsic-role-card', role: 'dialog', 'aria-label': t('roleDialogTitle') },
          h(
            'div',
            { className: 'dsic-ai-head' },
            h(Icon, { name: 'agent', size: 18 }),
            h('div', { className: 'dsic-dialog-title' }, t('roleDialogTitle')),
          ),
          h(
            'div',
            { className: 'dsic-role-toolbar' },
            h(
              'button',
              {
                type: 'button',
                className: 'dsic-role-example',
                onClick: () => setRole((current) => (String(current).trim() === '' ? t('roleExample') : current)),
              },
              `📚 ${t('roleInsertExample')}`,
            ),
            h(
              'button',
              { type: 'button', className: 'dsic-role-example', onClick: onOpenPrompts },
              `📚 ${t('promptLib')}`,
            ),
          ),
          h('textarea', {
            className: 'dsic-role-input',
            value: role,
            placeholder: t('rolePlaceholder'),
            spellCheck: false,
            onChange: (event) => setRole(event.target.value),
            onKeyDown: (event) => {
              event.stopPropagation();
              if (event.key === 'Escape') onCancel();
              else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) onSave(role, output);
            },
          }),
          h(
            'div',
            { className: 'dsic-scope' },
            h('span', { className: 'dsic-scope-label' }, t('roleOutputLabel')),
            h(
              'button',
              { type: 'button', className: 'dsic-scope-option', 'data-active': output === 'canvas' ? 'true' : undefined, onClick: () => setOutput('canvas') },
              t('roleOutputCanvas'),
            ),
            h(
              'button',
              { type: 'button', className: 'dsic-scope-option', 'data-active': output === 'document' ? 'true' : undefined, onClick: () => setOutput('document') },
              t('roleOutputDocument'),
            ),
          ),
          h(
            'p',
            { className: 'dsic-role-hint' },
            output === 'document' ? `${t('roleOutputDocumentHint')} ${t('roleDocHint')}` : t('roleOutputCanvasHint'),
          ),
          h(
            'div',
            { className: 'dsic-dialog-actions' },
            h('button', { type: 'button', className: 'dsic-ghost', onClick: onCancel }, t('cancel')),
            h(
              'button',
              { type: 'button', className: 'dsic-primary', onClick: () => onSave(role, output), disabled: String(role).trim() === '' },
              t('roleSave'),
            ),
          ),
        ),
      );
    }

    /** Canvas skin picker: built-in presets plus a locally stored custom background. */
    function SkinDialog({ t, skin, decor, onApply, onToggleDecor, onUpload, onClose }) {
      const fileRef = useRef(null);
      const [busy, setBusy] = useState(false);
      const labels = {
        starry: t('skinStarry'),
        neon: t('skinNeon'),
        aurora: t('skinAurora'),
        blueprint: t('skinBlueprint'),
        carbon: t('skinCarbon'),
        void: t('skinVoid'),
      };
      const activeId = skin?.kind === 'custom' ? '' : skin?.presetId ?? 'starry';
      const custom = skin?.kind === 'custom' ? skin : null;
      const decorIds = normalizeDecor(decor);
      const decorThumb = (id) => {
        if (id === 'whale') {
          return {
            backgroundImage:
              'radial-gradient(ellipse at 50% 30%, rgba(56,189,248,.3), transparent 60%), linear-gradient(180deg, #020617, #06283d)',
          };
        }
        if (id === 'rainbowcat') {
          return {
            backgroundImage:
              'radial-gradient(ellipse at 24% 30%, rgba(244,114,182,.26), transparent 55%), radial-gradient(ellipse at 76% 34%, rgba(56,189,248,.26), transparent 55%), linear-gradient(160deg, #160b24, #0b1220)',
          };
        }
        if (id === 'aurora') {
          return {
            backgroundImage:
              'radial-gradient(ellipse at 30% 40%, rgba(45,212,191,.3), transparent 55%), radial-gradient(ellipse at 70% 30%, rgba(129,140,248,.3), transparent 55%), radial-gradient(ellipse at 55% 80%, rgba(236,72,153,.22), transparent 60%), linear-gradient(160deg, #020617, #0b1220)',
          };
        }
        return {
          backgroundImage:
            'radial-gradient(ellipse at 50% 60%, rgba(251,191,36,.22), transparent 62%), linear-gradient(160deg, #100b02, #1a1206)',
        };
      };
      return h(
        'div',
        {
          className: 'dsic-dialog',
          onPointerDown: (event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) onClose();
          },
          onClick: (event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) onClose();
          },
          onDoubleClick: (event) => event.stopPropagation(),
        },
        h(
          'div',
          { className: 'dsic-dialog-card dsic-skin-card', role: 'dialog', 'aria-label': t('skinTitle') },
          h(
            'div',
            { className: 'dsic-ai-head' },
            h(Icon, { name: 'palette', size: 18 }),
            h('div', { className: 'dsic-dialog-title' }, t('skinTitle')),
          ),
          h('p', { className: 'dsic-ai-hint' }, t('skinHint')),
          h('div', { className: 'dsic-field-label dsic-field-label-gap' }, t('skinPresetLabel')),
          h(
            'div',
            { className: 'dsic-skin-grid' },
            SKIN_PRESETS.map((preset) =>
              h(
                'button',
                {
                  key: preset.id,
                  type: 'button',
                  className: 'dsic-skin-item',
                  'data-active': activeId === preset.id ? 'true' : undefined,
                  onClick: () => onApply({ kind: 'preset', presetId: preset.id }),
                },
                h('span', {
                  className: 'dsic-skin-thumb',
                  style: {
                    ...skinBackground(preset.id, { zoom: 0.45, ox: 0, oy: 0, gridSize: GRID_SIZE }),
                    backgroundColor: '#0b1220',
                  },
                }),
                h('span', { className: 'dsic-skin-name' }, labels[preset.id] ?? preset.id),
              ),
            ),
          ),
          h('div', { className: 'dsic-field-label dsic-field-label-gap' }, t('decorTitle')),
          h('p', { className: 'dsic-ai-hint dsic-decor-hint' }, t('decorHint')),
          h(
            'div',
            { className: 'dsic-skin-grid dsic-decor-grid' },
            DECOR_PRESETS.map((preset) => {
              const activeDecor = decorIds.includes(preset.id);
              return h(
                'button',
                {
                  key: preset.id,
                  type: 'button',
                  className: 'dsic-skin-item dsic-decor-item',
                  'data-active': activeDecor ? 'true' : undefined,
                  'aria-pressed': activeDecor ? 'true' : undefined,
                  title: t(preset.labelKey),
                  onClick: () => onToggleDecor(preset.id),
                },
                h(
                  'span',
                  { className: 'dsic-skin-thumb', style: { ...decorThumb(preset.id), backgroundColor: '#0b1220' } },
                  h('span', { className: 'dsic-skin-thumb-glyph', 'aria-hidden': 'true' }, preset.glyph),
                ),
                h('span', { className: 'dsic-skin-name' }, t(preset.labelKey)),
              );
            }),
          ),
          h('div', { className: 'dsic-field-label dsic-field-label-gap' }, t('skinCustomLabel')),
          h(
            'div',
            { className: 'dsic-skin-custom' },
            custom
              ? h('span', { className: 'dsic-skin-custom-thumb', style: { backgroundImage: `url("${custom.src}")` } })
              : h('span', { className: 'dsic-skin-custom-empty' }, '🖼'),
            h(
              'div',
              { className: 'dsic-skin-custom-copy' },
              h('div', { className: 'dsic-skin-custom-title' }, custom ? `${custom.w}×${custom.h}` : t('skinCustomLabel')),
              h('div', { className: 'dsic-skin-custom-hint' }, t('skinUploadHint')),
            ),
          ),
          h('input', {
            ref: fileRef,
            type: 'file',
            accept: 'image/*',
            style: { display: 'none' },
            onChange: (event) => {
              const file = event.target && event.target.files ? event.target.files[0] : null;
              if (!file) return;
              setBusy(true);
              Promise.resolve(onUpload(file)).finally(() => {
                setBusy(false);
                if (event.target) event.target.value = '';
              });
            },
          }),
          h(
            'div',
            { className: 'dsic-dialog-actions' },
            h(
              'button',
              {
                type: 'button',
                className: 'dsic-ghost',
                disabled: busy,
                onClick: () => {
                  if (fileRef.current) fileRef.current.click();
                },
              },
              busy ? '…' : t('skinUpload'),
            ),
            h('button', { type: 'button', className: 'dsic-ghost', onClick: () => onApply({ kind: 'preset', presetId: 'starry' }) }, t('skinRemove')),
            h('button', { type: 'button', className: 'dsic-primary', onClick: onClose }, t('close')),
          ),
        ),
      );
    }

    /* ------------------------------------------------------------------ *
     * relation graph view (Obsidian-style, force-directed, canvas 2D)
     * ------------------------------------------------------------------ */
    const GRAPH_LAYOUT_STORAGE = 'dsic.graph.layout.v1.';
    const GRAPH_LAYOUT_CACHE = new Map();
    const GRAPH_NODE_COLORS = {
      note: '#fde68a',
      text: '#93c5fd',
      shape: '#86efac',
      image: '#67e8f9',
      agent: '#c084fc',
      axis: '#22d3ee',
      file: '#34d399',
      tag: '#cbd5e1',
    };
    const GRAPH_EDGE_COLORS = { canvas: '#22d3ee', wiki: '#60a5fa', tag: '#a78bfa', sync: '#facc15' };
    const EMPTY_GRAPH_DATA = { nodes: [], edges: [], truncated: false, counts: null };
    const GRAPH_LABEL_WIDTHS = new Map();

    /** Cached text width (the canvas label font is fixed) so the idle loop stays cheap. */
    function graphLabelWidth(context, text, bold) {
      const key = `${bold ? 'b' : 'n'}:${text}`;
      const cached = GRAPH_LABEL_WIDTHS.get(key);
      if (cached !== undefined) return cached;
      const width = context.measureText(text).width;
      if (GRAPH_LABEL_WIDTHS.size > 4000) GRAPH_LABEL_WIDTHS.clear();
      GRAPH_LABEL_WIDTHS.set(key, width);
      return width;
    }

    function graphHash(value) {
      let hash = 0;
      const text = String(value ?? '');
      for (let index = 0; index < text.length; index += 1) {
        hash = (hash * 31 + text.charCodeAt(index)) | 0;
      }
      return hash >>> 0;
    }

    function graphSeeded(value, salt) {
      return (graphHash(`${salt}:${String(value ?? '')}`) % 100000) / 100000;
    }

    function graphLayoutMap(scopeKey) {
      const key = `${GRAPH_LAYOUT_STORAGE}${scopeKey}`;
      if (GRAPH_LAYOUT_CACHE.has(key)) return GRAPH_LAYOUT_CACHE.get(key);
      const map = new Map();
      try {
        if (typeof localStorage !== 'undefined') {
          const raw = localStorage.getItem(key);
          const parsed = raw ? JSON.parse(raw) : null;
          if (parsed && typeof parsed === 'object') {
            for (const [id, point] of Object.entries(parsed)) {
              if (Array.isArray(point) && Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1]))) {
                map.set(id, [Number(point[0]), Number(point[1])]);
              }
            }
          }
        }
      } catch (error) {
        /* storage unavailable */
      }
      GRAPH_LAYOUT_CACHE.set(key, map);
      return map;
    }

    function saveGraphLayout(scopeKey, sim) {
      if (!sim || !Array.isArray(sim.nodes) || sim.nodes.length === 0) return;
      const key = `${GRAPH_LAYOUT_STORAGE}${scopeKey}`;
      const map = graphLayoutMap(scopeKey);
      for (const node of sim.nodes) map.set(node.id, [Math.round(node.x), Math.round(node.y)]);
      const plain = {};
      for (const [id, point] of map) plain[id] = point;
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(plain));
      } catch (error) {
        /* storage full / private mode */
      }
    }

    function clearGraphLayout(scopeKey) {
      const key = `${GRAPH_LAYOUT_STORAGE}${scopeKey}`;
      GRAPH_LAYOUT_CACHE.delete(key);
      try {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      } catch (error) {
        /* ignore */
      }
    }

    /** Force-directed relation graph: hand-rolled simulation + canvas 2D render. */
    function GraphView(props) {
      const t = props.t;
      const scope = props.scope;
      const onScopeChange = props.onScopeChange;
      const nodes = Array.isArray(props.nodes) ? props.nodes : EMPTY_GRAPH_DATA.nodes;
      const edges = Array.isArray(props.edges) ? props.edges : EMPTY_GRAPH_DATA.edges;
      const busy = Boolean(props.busy);
      const error = String(props.error ?? '');
      const truncated = Boolean(props.truncated);
      const counts = props.counts ?? null;
      const vaultReady = Boolean(props.vaultReady);
      const onClose = props.onClose;
      const onOpenNode = props.onOpenNode;
      const onReload = props.onReload;
      const showTags = props.showTags !== false;
      const hideOrphans = Boolean(props.hideOrphans);
      const onToggleTags = props.onToggleTags;
      const onToggleOrphans = props.onToggleOrphans;

      const wrapRef = useRef(null);
      const canvasRef = useRef(null);
      const rafRef = useRef(0);
      const simRef = useRef(null);
      const viewRef = useRef({ x: 0, y: 0, scale: 1, w: 800, h: 600, dpr: 1, ready: false, lastScope: '' });
      const dragRef = useRef(null);
      const panRef = useRef(null);
      const hoverRef = useRef(null);
      const selectedRef = useRef(null);
      const queryRef = useRef('');
      const forceRef = useRef({ repel: 1, link: 120, gravity: 0.055 });
      const animateRef = useRef(true);
      const [query, setQuery] = useState('');
      const [selected, setSelected] = useState(null);
      const [hovered, setHovered] = useState(null);
      const [forceOpen, setForceOpen] = useState(false);
      const [force, setForce] = useState({ repel: 1, link: 120, gravity: 0.055 });
      const [animate, setAnimate] = useState(true);
      const [showLabels, setShowLabels] = useState(true);
      const labelsRef = useRef(true);
      const [layoutNonce, setLayoutNonce] = useState(0);
      const [stats, setStats] = useState({ nodes: 0, edges: 0 });
      const [doubleHint, setDoubleHint] = useState(false);
      const hintTimerRef = useRef(null);
      const hoverCheckRef = useRef(0);

      const selectedNode = selected ? nodes.find((node) => node.id === selected) ?? null : null;
      const hoveredNode = hovered ? nodes.find((node) => node.id === hovered) ?? null : null;
      const infoNode = selectedNode ?? hoveredNode;

      const nodeColor = (node) =>
        GRAPH_NODE_COLORS[node.kind === 'file' ? 'file' : node.kind === 'tag' ? 'tag' : node.type] ?? '#94a3b8';
      const kindLabel = (node) => {
        if (node.kind === 'file') return t('graphKindFile');
        if (node.kind === 'tag') return t('graphKindTagNode');
        const typeKey =
          node.type === 'note' || node.type === 'text' || node.type === 'shape' || node.type === 'image' || node.type === 'agent' || node.type === 'axis'
            ? node.type
            : 'graphKindCard';
        return t(typeKey);
      };

      function ensureLoop() {
        if (rafRef.current) return;
        rafRef.current = requestAnimationFrame(tick);
      }

      function isViewHidden() {
        return typeof document !== 'undefined' && document.hidden === true;
      }

      /** Very gentle perpetual floating so the network feels alive after the layout settles. */
      function driftSimulation(sim, now) {
        const time = (Number(now) || 0) / 1000;
        for (const node of sim.nodes) {
          if (node.fixed) continue;
          const phase = graphSeeded(node.id, 11) * Math.PI * 2;
          const speed = 0.45 + graphSeeded(node.id, 12) * 0.55;
          node.x += Math.sin(time * speed + phase) * 0.085;
          node.y += Math.cos(time * speed * 0.82 + phase * 1.37) * 0.075;
        }
      }

      function tick() {
        rafRef.current = 0;
        const sim = simRef.current;
        if (!sim) return;
        const now = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
        sim.lastTick = now;
        const idle = sim.alpha <= 0.004 && !sim.drag && !sim.panning;
        try {
          if (idle && animateRef.current) driftSimulation(sim, now);
          else if (!idle) stepPhysics(sim);
          if (!sim.lastDraw || now - sim.lastDraw >= 24) {
            drawGraph(sim);
            sim.lastDraw = now;
          }
        } catch (error) {
          // Never let one bad frame kill the animation loop: log it once and cool the
          // simulation down so the network stays visible and interactive.
          if (!sim.errorLogged) {
            sim.errorLogged = true;
            console.warn('[infinite-canvas] graph frame failed:', error);
          }
          sim.alpha = 0;
        }
        if (sim.drag || sim.panning || (!idle && !isViewHidden()) || (idle && animateRef.current && !isViewHidden())) ensureLoop();
      }

      function stepPhysics(sim) {
        const list = sim.nodes;
        const count = list.length;
        if (count === 0) return;
        const params = sim.params ?? { repel: 1, link: 120, gravity: 0.055 };
        const alpha = sim.alpha;
        if (alpha < 0.004) return;
        for (let i = 0; i < count; i += 1) {
          const a = list[i];
          if (a.fixed) continue;
          let ax = 0;
          let ay = 0;
          for (let j = 0; j < count; j += 1) {
            if (i === j) continue;
            const b = list[j];
            let dx = a.x - b.x;
            let dy = a.y - b.y;
            let distanceSq = dx * dx + dy * dy;
            if (distanceSq < 1) {
              dx = graphSeeded(a.id, j) - 0.5;
              dy = graphSeeded(b.id, i) - 0.5;
              distanceSq = dx * dx + dy * dy + 0.01;
            }
            const distance = Math.sqrt(distanceSq);
            const strength = Math.min(8, (Number(params.repel) || 1) * 2600 / distanceSq);
            ax += (dx / distance) * strength;
            ay += (dy / distance) * strength;
          }
          const gravity = (Number(params.gravity) || 0.055) * 0.05;
          ax -= a.x * gravity;
          ay -= a.y * gravity;
          a.vx = (a.vx + ax * alpha * 0.055) * 0.84;
          a.vy = (a.vy + ay * alpha * 0.055) * 0.84;
        }
        const desired = Number(params.link) || 120;
        for (const link of sim.links) {
          const a = list[link.s];
          const b = list[link.t];
          if (!a || !b) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const pull = (distance - desired) * 0.012 * alpha;
          const ux = dx / distance;
          const uy = dy / distance;
          if (!a.fixed) {
            a.vx += ux * pull;
            a.vy += uy * pull;
          }
          if (!b.fixed) {
            b.vx -= ux * pull;
            b.vy -= uy * pull;
          }
        }
        for (const node of list) {
          if (node.fixed) continue;
          const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
          if (speed > 40) {
            node.vx = (node.vx / speed) * 40;
            node.vy = (node.vy / speed) * 40;
          }
          node.x += node.vx * alpha;
          node.y += node.vy * alpha;
        }
        sim.alpha = Math.max(0.002, alpha * 0.985);
      }

      function drawGraph(sim) {
        const canvas = canvasRef.current;
        if (!canvas || typeof canvas.getContext !== 'function') return;
        const context = canvas.getContext('2d');
        if (!context) return;
        const view = viewRef.current;
        const dpr = view.dpr || 1;
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.x, dpr * view.y);
        const focusId = selectedRef.current || hoverRef.current;
        const neighbors = new Set();
        if (focusId) {
          neighbors.add(focusId);
          for (const link of sim.links) {
            if (link.sourceId === focusId) neighbors.add(link.targetId);
            if (link.targetId === focusId) neighbors.add(link.sourceId);
          }
        }
        const rawQuery = queryRef.current.trim().toLowerCase();
        const matched = rawQuery === '' ? null : new Set();
        if (matched) {
          for (const node of sim.nodes) {
            const ref = node.ref;
            const pool = [
              String(ref.label ?? ''),
              String(ref.canvasTitle ?? ''),
              Array.isArray(ref.tags) ? ref.tags.join(' ') : '',
              String(ref.path ?? ''),
            ];
            if (pool.some((text) => text.toLowerCase().includes(rawQuery))) matched.add(node.id);
          }
        }
        const scale = view.scale || 1;
        const denseLabels = sim.nodes.length > 80;
        const labels = [];
        for (const link of sim.links) {
          const from = sim.nodes[link.s];
          const to = sim.nodes[link.t];
          if (!from || !to) continue;
          const active = focusId ? link.sourceId === focusId || link.targetId === focusId : false;
          let alpha = focusId ? (active ? 0.95 : 0.14) : 0.4;
          if (matched) alpha *= matched.has(link.sourceId) || matched.has(link.targetId) ? 1 : 0.15;
          context.globalAlpha = alpha;
          context.strokeStyle = GRAPH_EDGE_COLORS[link.kind] ?? '#64748b';
          context.lineWidth = (active ? 2 : 1.1) / scale;
          context.beginPath();
          context.moveTo(from.x, from.y);
          context.lineTo(to.x, to.y);
          context.stroke();
        }
        context.globalAlpha = 1;
        for (const node of sim.nodes) {
          const ref = node.ref;
          const color = nodeColor(ref);
          const isFocus = focusId === node.id;
          const isNeighbor = neighbors.has(node.id);
          const matchedHere = matched ? matched.has(node.id) : false;
          let alpha = 1;
          if (matched) alpha = matchedHere ? 1 : 0.16;
          else if (focusId) alpha = isFocus ? 1 : isNeighbor ? 0.92 : 0.2;
          context.globalAlpha = alpha;
          const radius = Math.max(node.radius, 7 / scale);
          context.beginPath();
          if (ref.kind === 'tag') {
            context.moveTo(node.x, node.y - radius);
            context.lineTo(node.x + radius, node.y);
            context.lineTo(node.x, node.y + radius);
            context.lineTo(node.x - radius, node.y);
            context.closePath();
          } else if (ref.kind === 'file') {
            const side = radius * 0.92;
            context.rect(node.x - side, node.y - side, side * 2, side * 2);
          } else {
            context.arc(node.x, node.y, radius, 0, Math.PI * 2);
          }
          context.fillStyle = color;
          context.fill();
          context.lineWidth = (isFocus ? 2.4 : 1.2) / scale;
          context.strokeStyle = isFocus ? '#ecfeff' : 'rgba(2,6,23,.78)';
          context.stroke();
          if (isFocus) {
            context.beginPath();
            context.arc(node.x, node.y, radius + 4 / scale, 0, Math.PI * 2);
            context.strokeStyle = 'rgba(34,211,238,.85)';
            context.lineWidth = 2 / scale;
            context.stroke();
          }
          if (labelsRef.current) {
            labels.push({
              x: node.x,
              y: node.y,
              radius,
              text: String(ref.label ?? '').slice(0, denseLabels ? 14 : 24),
              alpha: alpha * (isFocus || matchedHere ? 1 : 0.85),
              color: isFocus ? '#ecfeff' : 'rgba(226,232,240,.92)',
              bold: isFocus || matchedHere,
              priority: isFocus ? 4 : matchedHere ? 3 : ref.kind === 'file' ? 2 : isNeighbor ? 1 : 0,
              degree: Number(ref.degree) || 0,
            });
          }
        }
        context.globalAlpha = 1;
        // Labels are drawn in screen space: one crisp readable size at every zoom. Only other
        // labels block them (nodes may sit behind a label): this keeps most names visible even
        // in a dense "all canvases" graph, while a translucent chip keeps every label readable.
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        labels.sort((left, right) => right.priority - left.priority || right.degree - left.degree);
        const placedLabels = [];
        const overlapsPlaced = (rect) =>
          placedLabels.some(
            (other) =>
              rect.x - 2 < other.x + other.w &&
              rect.x + rect.w + 2 > other.x &&
              rect.y - 2 < other.y + other.h &&
              rect.y + rect.h + 2 > other.y,
          );
        for (const label of labels) {
          if (placedLabels.length >= 260) break;
          const screenX = label.x * scale + view.x;
          const screenY = label.y * scale + view.y;
          const nodeRadius = Math.max(5, label.radius * scale);
          context.font = `${label.bold ? 700 : 600} 12px ui-monospace, Consolas, monospace`;
          const textWidth = graphLabelWidth(context, label.text, label.bold);
          const candidates = [
            { x: screenX - textWidth / 2 - 3, y: screenY + nodeRadius + 3, w: textWidth + 6, h: 15 },
            { x: screenX - textWidth / 2 - 3, y: screenY - nodeRadius - 18, w: textWidth + 6, h: 15 },
            { x: screenX - textWidth / 2 - 3, y: screenY + nodeRadius + 20, w: textWidth + 6, h: 15 },
            { x: screenX - textWidth / 2 - 3, y: screenY - nodeRadius - 34, w: textWidth + 6, h: 15 },
          ];
          const rect = candidates.find((candidate) => !overlapsPlaced(candidate));
          if (!rect) continue;
          placedLabels.push(rect);
          context.globalAlpha = 0.72;
          context.fillStyle = 'rgba(3,7,16,.9)';
          context.fillRect(rect.x, rect.y, rect.w, rect.h);
          context.globalAlpha = label.alpha;
          context.fillStyle = label.color;
          context.fillText(label.text, rect.x + 3 + textWidth / 2, rect.y + 8);
        }
        context.globalAlpha = 1;
      }

      function resizeGraph() {
        const canvas = canvasRef.current;
        const wrap = wrapRef.current;
        if (!canvas || !wrap) return;
        const width = Math.max(200, wrap.clientWidth || 0);
        const height = Math.max(160, wrap.clientHeight || 0);
        const dpr = Math.max(1, Math.min(2.5, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
        if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
          canvas.width = Math.round(width * dpr);
          canvas.height = Math.round(height * dpr);
        }
        const view = viewRef.current;
        view.w = width;
        view.h = height;
        view.dpr = dpr;
        if (!view.ready) {
          view.ready = true;
          fitGraph();
        }
      }

      function fitGraph() {
        const sim = simRef.current;
        const view = viewRef.current;
        const width = view.w || 800;
        const height = view.h || 600;
        if (!sim || sim.nodes.length === 0) {
          view.scale = 1;
          view.x = width / 2;
          view.y = height / 2;
          return;
        }
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const node of sim.nodes) {
          minX = Math.min(minX, node.x);
          minY = Math.min(minY, node.y);
          maxX = Math.max(maxX, node.x);
          maxY = Math.max(maxY, node.y);
        }
        const spanX = Math.max(60, maxX - minX);
        const spanY = Math.max(60, maxY - minY);
        const padding = 90;
        view.scale = Math.max(0.12, Math.min(2.4, Math.min((width - padding) / spanX, (height - padding) / spanY)));
        view.x = width / 2 - ((minX + maxX) / 2) * view.scale;
        view.y = height / 2 - ((minY + maxY) / 2) * view.scale;
      }

      function toWorld(event) {
        const canvas = canvasRef.current;
        if (!canvas || typeof canvas.getBoundingClientRect !== 'function') return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const view = viewRef.current;
        return {
          x: (event.clientX - rect.left - view.x) / (view.scale || 1),
          y: (event.clientY - rect.top - view.y) / (view.scale || 1),
        };
      }

      function nodeAt(world) {
        const sim = simRef.current;
        if (!sim) return null;
        const scale = viewRef.current.scale || 1;
        let best = null;
        let bestDistance = Infinity;
        for (const node of sim.nodes) {
          const dx = node.x - world.x;
          const dy = node.y - world.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const hit = Math.max(node.radius + 4 / scale, 11 / scale);
          if (distance <= hit && distance < bestDistance) {
            bestDistance = distance;
            best = node;
          }
        }
        return best;
      }

      function selectNode(id) {
        selectedRef.current = id ?? null;
        setSelected(id ?? null);
        ensureLoop();
      }

      function handlePointerDown(event) {
        if (event.stopPropagation) event.stopPropagation();
        if (event.button !== undefined && event.button !== 0 && event.pointerType === 'mouse') return;
        if (event.preventDefault) event.preventDefault();
        const sim = simRef.current;
        const world = toWorld(event);
        const node = nodeAt(world);
        try {
          if (event.currentTarget && event.currentTarget.setPointerCapture) event.currentTarget.setPointerCapture(event.pointerId);
        } catch (error) {
          /* pointer capture unavailable */
        }
        if (node && sim) {
          node.fixed = true;
          node.vx = 0;
          node.vy = 0;
          const drag = {
            id: node.id,
            offsetX: node.x - world.x,
            offsetY: node.y - world.y,
            startX: event.clientX,
            startY: event.clientY,
            moved: 0,
          };
          dragRef.current = drag;
          sim.drag = drag;
          sim.alpha = Math.max(sim.alpha, 0.5);
        } else if (sim) {
          panRef.current = {
            startX: event.clientX,
            startY: event.clientY,
            originX: viewRef.current.x,
            originY: viewRef.current.y,
            moved: 0,
          };
          sim.panning = true;
        }
        ensureLoop();
      }

      function handlePointerMove(event) {
        if (event.stopPropagation) event.stopPropagation();
        const sim = simRef.current;
        if (dragRef.current && sim) {
          const world = toWorld(event);
          const node = sim.nodes.find((entry) => entry.id === dragRef.current.id);
          if (node) {
            node.x = world.x + dragRef.current.offsetX;
            node.y = world.y + dragRef.current.offsetY;
          }
          dragRef.current.moved = Math.max(
            dragRef.current.moved,
            Math.abs(event.clientX - dragRef.current.startX) + Math.abs(event.clientY - dragRef.current.startY),
          );
          sim.alpha = Math.max(sim.alpha, 0.3);
          ensureLoop();
          return;
        }
        if (panRef.current) {
          const dx = event.clientX - panRef.current.startX;
          const dy = event.clientY - panRef.current.startY;
          panRef.current.moved = Math.max(panRef.current.moved, Math.abs(dx) + Math.abs(dy));
          viewRef.current.x = panRef.current.originX + dx;
          viewRef.current.y = panRef.current.originY + dy;
          ensureLoop();
          return;
        }
        const node = nodeAt(toWorld(event));
        const canvas = canvasRef.current;
        const now = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
        // Hover checks walk every node; throttle them so fast pointer moves cannot
        // schedule a React re-render (and a physics reheat) for every single event.
        if (now - hoverCheckRef.current >= 70) {
          hoverCheckRef.current = now;
          const nextHover = node ? node.id : null;
          if (nextHover !== hoverRef.current) {
            hoverRef.current = nextHover;
            setHovered(nextHover);
            ensureLoop();
          }
        }
        if (canvas && canvas.style) canvas.style.cursor = node ? 'pointer' : 'grab';
      }

      function handlePointerUp(event) {
        if (event.stopPropagation) event.stopPropagation();
        const sim = simRef.current;
        const drag = dragRef.current;
        if (drag) {
          const node = sim ? sim.nodes.find((entry) => entry.id === drag.id) : null;
          if (node) {
            node.fixed = false;
            if (drag.moved < 6) selectNode(node.id);
          }
          dragRef.current = null;
          if (sim) {
            sim.drag = null;
            sim.alpha = Math.max(sim.alpha, 0.3);
            saveGraphLayout(scope, sim);
          }
        } else if (panRef.current) {
          if (panRef.current.moved < 4) selectNode(null);
          panRef.current = null;
          if (sim) sim.panning = false;
        }
        try {
          if (event.currentTarget && event.currentTarget.releasePointerCapture) event.currentTarget.releasePointerCapture(event.pointerId);
        } catch (error) {
          /* ignore */
        }
        ensureLoop();
      }

      function handleDoubleClick(event) {
        if (event.stopPropagation) event.stopPropagation();
        if (event.preventDefault) event.preventDefault();
        // Double-click never opens nodes (it used to jump / import by accident); only the
        // explicit「打开」button in the info bar is allowed to trigger an action.
        setDoubleHint(true);
        if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
        hintTimerRef.current = setTimeout(() => setDoubleHint(false), 1800);
      }

      // mount: size the canvas, track resizes, wheel zoom (non-passive so preventDefault works)
      useEffect(() => {
        return () => {
          if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
        };
      }, []);

      useEffect(() => {
        const wrap = wrapRef.current;
        const canvas = canvasRef.current;
        resizeGraph();
        ensureLoop();
        let observer = null;
        if (wrap && typeof ResizeObserver === 'function') {
          observer = new ResizeObserver(() => {
            resizeGraph();
            ensureLoop();
          });
          observer.observe(wrap);
        }
        const onWindowResize = () => {
          resizeGraph();
          ensureLoop();
        };
        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') window.addEventListener('resize', onWindowResize);
        const onWheel = (event) => {
          if (event.stopPropagation) event.stopPropagation();
          if (event.preventDefault) event.preventDefault();
          const view = viewRef.current;
          const rect = canvas && typeof canvas.getBoundingClientRect === 'function' ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
          const mx = event.clientX - rect.left;
          const my = event.clientY - rect.top;
          const factor = Math.exp(-event.deltaY * 0.0016);
          const nextScale = Math.max(0.12, Math.min(3.2, (view.scale || 1) * factor));
          const ratio = nextScale / (view.scale || 1);
          view.x = mx - (mx - view.x) * ratio;
          view.y = my - (my - view.y) * ratio;
          view.scale = nextScale;
          ensureLoop();
        };
        if (canvas && typeof canvas.addEventListener === 'function') canvas.addEventListener('wheel', onWheel, { passive: false });
        // Pause the animation loop while the tab is hidden; resume when it becomes visible again.
        const onVisibilityChange = () => {
          if (isViewHidden()) {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = 0;
          } else {
            ensureLoop();
          }
        };
        if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') document.addEventListener('visibilitychange', onVisibilityChange);
        return () => {
          if (observer) observer.disconnect();
          if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') window.removeEventListener('resize', onWindowResize);
          if (canvas && typeof canvas.removeEventListener === 'function') canvas.removeEventListener('wheel', onWheel);
          if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') document.removeEventListener('visibilitychange', onVisibilityChange);
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          rafRef.current = 0;
          const sim = simRef.current;
          if (sim) saveGraphLayout(scope, sim);
        };
      }, [scope]);

      // data changed (or layout reset): rebuild the simulation, keep cached positions
      useEffect(() => {
        const cache = graphLayoutMap(scope);
        const base = Math.min(520, 150 + Math.sqrt(Math.max(1, nodes.length)) * 24);
        const simNodes = nodes.map((node) => {
          const cached = cache.get(node.id);
          const angle = graphSeeded(node.id, 1) * Math.PI * 2;
          const radius = base * (0.3 + graphSeeded(node.id, 2) * 0.8);
          return {
            id: node.id,
            ref: node,
            x: cached ? cached[0] : Math.cos(angle) * radius,
            y: cached ? cached[1] : Math.sin(angle) * radius,
            vx: 0,
            vy: 0,
            fixed: false,
            radius: 4 + Math.sqrt(Math.max(0, Number(node.degree) || 0)) * 1.9,
          };
        });
        const indexById = new Map(simNodes.map((node, index) => [node.id, index]));
        const simLinks = [];
        for (const edge of edges) {
          const source = indexById.get(edge.source);
          const target = indexById.get(edge.target);
          if (source === undefined || target === undefined || source === target) continue;
          simLinks.push({ s: source, t: target, sourceId: edge.source, targetId: edge.target, kind: edge.kind, label: String(edge.label ?? '') });
        }
        simRef.current = {
          nodes: simNodes,
          links: simLinks,
          alpha: 1,
          params: { ...forceRef.current },
          drag: null,
          panning: false,
        };
        setStats({ nodes: simNodes.length, edges: simLinks.length });
        viewRef.current.lastScope = scope;
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(() => {
            resizeGraph();
            fitGraph();
            ensureLoop();
          });
        }
        ensureLoop();
        return () => {
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          rafRef.current = 0;
        };
      }, [nodes, edges, scope, layoutNonce]);

      // force sliders: update the live simulation and reheat it
      useEffect(() => {
        forceRef.current = force;
        const sim = simRef.current;
        if (sim) {
          sim.params = { repel: force.repel, link: force.link, gravity: force.gravity };
          sim.alpha = Math.max(sim.alpha, 0.5);
        }
        ensureLoop();
      }, [force]);

      useEffect(() => {
        animateRef.current = animate;
        if (animate) {
          ensureLoop();
        } else {
          const sim = simRef.current;
          if (sim) drawGraph(sim);
        }
      }, [animate]);

      useEffect(() => {
        labelsRef.current = showLabels;
        ensureLoop();
      }, [showLabels]);

      useEffect(() => {
        queryRef.current = query;
        ensureLoop();
      }, [query]);

      useEffect(() => {
        const sim = simRef.current;
        if (sim) sim.alpha = Math.max(sim.alpha, 0.12);
        ensureLoop();
      }, [selected, hovered, showTags, hideOrphans]);

      const forceRow = (labelKey, key, min, max, step) =>
        h(
          'label',
          { className: 'dsic-graph-force-row', key },
          h('span', null, `${t(labelKey)} · ${Number(force[key]).toFixed(key === 'gravity' ? 2 : 1)}`),
          h('input', {
            type: 'range',
            min,
            max,
            step,
            value: force[key],
            onChange: (event) => {
              const next = Number(event.target.value);
              setForce((current) => ({ ...current, [key]: Number.isFinite(next) ? next : current[key] }));
            },
          }),
        );

      return h(
        'div',
        {
          className: 'dsic-graph',
          'data-scope': scope,
          // The graph lives on top of the canvas stage: keep every pointer/wheel event inside
          // this view so the board underneath never pans, zooms or creates notes.
          onPointerDown: (event) => event.stopPropagation(),
          onPointerMove: (event) => event.stopPropagation(),
          onPointerUp: (event) => event.stopPropagation(),
          onPointerCancel: (event) => event.stopPropagation(),
          onClick: (event) => event.stopPropagation(),
          onDoubleClick: (event) => event.stopPropagation(),
          onContextMenu: (event) => {
            if (event.preventDefault) event.preventDefault();
            if (event.stopPropagation) event.stopPropagation();
          },
          onWheel: (event) => {
            if (event.stopPropagation) event.stopPropagation();
          },
        },
        h(
          'div',
          { className: 'dsic-graph-bar' },
          h(
            'button',
            { type: 'button', className: 'dsic-graph-btn dsic-graph-back', title: t('graphBack'), onClick: onClose },
            h(Icon, { name: 'chevronLeft', size: 13 }),
            t('graphBack'),
          ),
          h('span', { className: 'dsic-graph-title' }, t('graphTitle')),
          h('span', { className: 'dsic-graph-divider' }),
          h(
            'button',
            {
              type: 'button',
              className: 'dsic-graph-btn',
              'data-active': scope === 'canvas' ? 'true' : undefined,
              onClick: () => onScopeChange('canvas'),
            },
            t('graphScopeCanvas'),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dsic-graph-btn',
              'data-active': scope === 'all' ? 'true' : undefined,
              onClick: () => onScopeChange('all'),
            },
            t('graphScopeAll'),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dsic-graph-btn',
              title: vaultReady ? '' : t('graphEmptyVault'),
              'data-active': scope === 'vault' ? 'true' : undefined,
              onClick: () => onScopeChange('vault'),
            },
            t('graphScopeVault'),
          ),
          h('span', { className: 'dsic-graph-divider' }),
          h('input', {
            className: 'dsic-graph-search',
            value: query,
            placeholder: t('graphSearchPlaceholder'),
            spellCheck: false,
            onChange: (event) => setQuery(event.target.value),
          }),
          h('span', { className: 'dsic-graph-spacer' }),
          h(
            'button',
            {
              type: 'button',
              className: 'dsic-graph-btn',
              'data-active': showTags ? 'true' : undefined,
              title: t('graphShowTags'),
              onClick: onToggleTags,
            },
            t('graphShowTags'),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dsic-graph-btn',
              'data-active': hideOrphans ? undefined : 'true',
              title: t('graphShowOrphans'),
              onClick: onToggleOrphans,
            },
            t('graphShowOrphans'),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dsic-graph-btn',
              'data-active': showLabels ? 'true' : undefined,
              title: t('graphShowLabels'),
              onClick: () => setShowLabels((value) => !value),
            },
            t('graphShowLabels'),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dsic-graph-btn',
              'data-active': animate ? 'true' : undefined,
              title: t('graphAnimate'),
              onClick: () => setAnimate((value) => !value),
            },
            h(Icon, { name: 'play', size: 13 }),
            t('graphAnimate'),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dsic-graph-btn',
              'data-active': forceOpen ? 'true' : undefined,
              title: t('graphForce'),
              onClick: () => setForceOpen((open) => !open),
            },
            h(Icon, { name: 'settings', size: 13 }),
            t('graphForce'),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dsic-graph-btn',
              title: t('graphRelayout'),
              onClick: () => {
                clearGraphLayout(scope);
                setLayoutNonce((nonce) => nonce + 1);
              },
            },
            h(Icon, { name: 'fit', size: 13 }),
            t('graphRelayout'),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dsic-graph-btn',
              title: t('graphFit'),
              onClick: () => {
                fitGraph();
                ensureLoop();
              },
            },
            h(Icon, { name: 'fit', size: 13 }),
            t('graphFit'),
          ),
          h(
            'button',
            { type: 'button', className: 'dsic-graph-btn', title: t('graphRefresh'), disabled: busy, onClick: onReload },
            h(Icon, { name: 'undo', size: 13 }),
            busy ? '…' : t('graphRefresh'),
          ),
        ),
        h(
          'div',
          { className: 'dsic-graph-body', ref: wrapRef },
          h('canvas', {
            ref: canvasRef,
            className: 'dsic-graph-canvas',
            onPointerDown: handlePointerDown,
            onPointerMove: handlePointerMove,
            onPointerUp: handlePointerUp,
            onPointerCancel: handlePointerUp,
            onDoubleClick: handleDoubleClick,
            onPointerLeave: () => {
              if (!dragRef.current && !panRef.current) {
                hoverRef.current = null;
                setHovered(null);
                ensureLoop();
              }
            },
          }),
          infoNode
            ? h(
                'div',
                { className: 'dsic-graph-info' },
                h('span', { className: 'dsic-graph-dot', style: { background: nodeColor(infoNode) } }),
                h('span', { className: 'dsic-graph-info-label' }, `${selectedNode ? `${t('graphSelected')} · ` : ''}${String(infoNode.label ?? '').slice(0, 40)}`),
                h('span', null, kindLabel(infoNode)),
                h('span', null, t('graphDegree', { n: Number(infoNode.degree) || 0 })),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsic-graph-btn',
                    style: { pointerEvents: 'auto', height: '22px', padding: '0 8px', fontSize: '10px' },
                    title: infoNode.kind === 'card' && (infoNode.type === 'note' || infoNode.type === 'text') ? t('graphOpenText') : t('graphOpen'),
                    onClick: () => onOpenNode(infoNode),
                  },
                  infoNode.kind === 'card' && (infoNode.type === 'note' || infoNode.type === 'text') ? t('graphOpenText') : t('graphOpen'),
                ),
              )
            : h('div', { className: doubleHint ? 'dsic-graph-hint dsic-graph-hint-warn' : 'dsic-graph-hint' }, doubleHint ? t('graphDoubleOff') : t('graphDoubleHint')),
          error ? h('div', { className: 'dsic-graph-error' }, t('graphFailed', { message: error })) : null,
          busy ? h('div', { className: 'dsic-graph-empty' }, h('span', null, t('graphLoading'))) : null,
          !busy && !error && nodes.length === 0
            ? h('div', { className: 'dsic-graph-empty' }, h('span', null, scope === 'vault' && !vaultReady ? t('graphEmptyVault') : t('graphEmpty')))
            : null,
          forceOpen
            ? h(
                'div',
                { className: 'dsic-graph-force' },
                forceRow('graphRepel', 'repel', 0.2, 2.4, 0.1),
                forceRow('graphLinkDistance', 'link', 40, 280, 10),
                forceRow('graphGravity', 'gravity', 0, 0.22, 0.01),
              )
            : null,
          h(
            'div',
            { className: 'dsic-graph-stats' },
            h('span', null, t('graphNodes', { n: stats.nodes })),
            h('span', null, t('graphEdges', { n: stats.edges })),
            truncated ? h('span', { className: 'dsic-graph-trunc' }, t('graphTruncated', { n: stats.nodes })) : null,
            counts && scope === 'vault' ? h('span', null, t('graphFilesScanned', { n: Number(counts.files) || 0 })) : null,
          ),
          h(
            'div',
            { className: 'dsic-graph-legend' },
            h('div', { className: 'dsic-graph-legend-title' }, t('graphLegend')),
            h('div', { className: 'dsic-graph-legend-row' }, h('span', { className: 'dsic-graph-dot', style: { background: GRAPH_NODE_COLORS.note } }), t('graphKindCard')),
            h('div', { className: 'dsic-graph-legend-row' }, h('span', { className: 'dsic-graph-dot', style: { background: GRAPH_NODE_COLORS.file } }), t('graphKindFile')),
            h('div', { className: 'dsic-graph-legend-row' }, h('span', { className: 'dsic-graph-diamond', style: { background: GRAPH_NODE_COLORS.tag } }), t('graphKindTagNode')),
            h('div', { className: 'dsic-graph-legend-row', style: { color: GRAPH_EDGE_COLORS.canvas } }, h('span', { className: 'dsic-graph-line' }), t('graphKindCanvas')),
            h('div', { className: 'dsic-graph-legend-row', style: { color: GRAPH_EDGE_COLORS.wiki } }, h('span', { className: 'dsic-graph-line' }), t('graphKindWiki')),
            h('div', { className: 'dsic-graph-legend-row', style: { color: GRAPH_EDGE_COLORS.tag } }, h('span', { className: 'dsic-graph-line' }), t('graphKindTag')),
            h('div', { className: 'dsic-graph-legend-row', style: { color: GRAPH_EDGE_COLORS.sync } }, h('span', { className: 'dsic-graph-line' }), t('graphKindSync')),
          ),
        ),
      );
    }

    /* ------------------------------------------------------------------ *
     * plugin entry
     * ------------------------------------------------------------------ */
    function apply(ctx) {
      clientCtx = ctx;
      try {
        localeService = ctx.get('locale') ?? null;
      } catch (error) {
        localeService = null;
      }
      ctx.slots.inject('main', () =>
        ctx.slots.register({ name: 'main', key: PANEL_KEY }, CanvasPanel),
      );
      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register(
          {
            name: 'sidebar.panellist',
            id: PANEL_KEY,
            order: 20,
            label: () => {
              const lang = detectLang();
              return (TEXTS[lang] ?? TEXTS.zh).panelTitle;
            },
          },
          CanvasIcon,
        ),
      );
    }

    return { inject: ['slots', 'locale'], apply };
  },
});
