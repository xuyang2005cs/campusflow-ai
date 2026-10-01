# CampusFlow AI Design System

## Direction

CampusFlow AI 使用“现代校园日程簿”作为主产品视觉世界，以清楚的日期、行动层级、截止状态和课程标签组织高频任务。它借用日程簿的阅读秩序，不使用纸张纹理、胶带、手写字体或拟物控件。Inbox 与 Review 使用“通知整理台”的信息转换语言，将原始消息、OCR 文本、提取状态和候选行动项分成可追踪的步骤。

## Product Experience

- **Today 是视觉基准**：打开即能回答今天做什么、什么最紧急、完成了多少。
- **AI 退居流程内部**：界面展示“整理信息”与“提取结果”，不展示聊天记录或 AI 人格。
- **确认优先**：候选条目具有明确选中状态、可编辑字段和统一保存动作。
- **时间可信**：每个有日期的任务同时显示绝对时间和“已逾期 / 今天 / 还有 2 天”等文字。

## Information Architecture

移动端底部导航固定为五个一级入口：今日 `/today`、收件箱 `/inbox`、待办 `/tasks`、完成 `/completed`、设置 `/settings`。Review `/review/:id` 是从 Inbox 进入的任务流页面，保留返回入口但不加入底部导航。根路径 `/` 跳转至 `/today`。

桌面端不改成管理后台。内容居中放置在扩展的 App Frame 中，导航可转为紧凑侧轨，主要阅读宽度保持适合任务列表。

## Color System

| Token | Value | Role |
|---|---|---|
| `--color-canvas` | `#F4F8F7` | 应用背景 |
| `--color-surface` | `#FFFFFF` | 主要内容表面 |
| `--color-ink` | `#17211F` | 主文字 |
| `--color-muted` | `#61706C` | 辅助文字 |
| `--color-line` | `#D8E3E0` | 分隔与控件边界 |
| `--color-primary` | `#0F766E` | 品牌、选中与主操作 |
| `--color-primary-soft` | `#DDF3EF` | 日期选中与轻量状态 |
| `--color-action` | `#C2410C` | AI 整理与明确行动强调 |
| `--color-danger` | `#B42318` | 已逾期、24 小时内 |
| `--color-warning` | `#9A5B00` | 三天内 |
| `--color-caution` | `#7A6817` | 七天内 |
| `--color-complete` | `#4F6F66` | 完成状态 |

所有紧急状态同时包含图标或文字，不依赖颜色。正文与背景对比不低于 WCAG AA。

## Typography

采用平台原生中文 UI 字体栈：`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif`。这使移动 Web 更接近设备原生效率工具，避免额外字体下载和中英文混排漂移。

- 页面标题：28px / 1.2 / 700
- 区域标题：18px / 1.35 / 700
- 任务标题：16px / 1.4 / 650
- 正文与输入：16px / 1.55 / 400
- 标签：13px / 1.35 / 600
- 辅助信息：14px / 1.45 / 450
- 时间数字使用 `font-variant-numeric: tabular-nums`

## Shape, Spacing and Depth

使用 4px 基础、8px 主节奏。移动内容边距为 20px，区域间距 28–36px。任务条目是具有清晰分隔的列表单元，半径 14px；小标签与筛选控件可以使用胶囊形。卡片不叠卡片，不使用彩色粗边或装饰性阴影。浮层仅使用一档柔和投影，普通任务主要靠背景、边界和留白建立层级。

## Core Components

- **Date Strip**：七日横向选择，触控目标不小于 48px；今天、选中日期和存在任务分别有文字与形态提示。
- **Task Row**：完成控件、标题、类型、时间语义、地点和来源；紧急度改变状态行而非整张卡片染色。
- **Progress Summary**：用单一完成进度条与数字句子表达，不使用四张 KPI 卡或装饰性进度环。
- **Source Block**：Inbox 中保留输入来源和原始文本，使用分段标题与轻边界呈现。
- **Extraction Stepper**：输入、识别、整理、确认四阶段；显示当前状态和恢复操作。
- **Review Item**：选中复选、类型、标题、日期、时间、地点和备注；字段可编辑且错误就地显示。
- **Bottom Navigation**：五项图标加中文标签，固定在安全区之上；活动项用颜色、字重和短指示条共同表达。

## Motion

动效只服务状态变化：任务完成时内容轻微收拢并淡出，AI 整理过程使用克制的进度行，日期切换使用短距离内容过渡。时长 140–220ms，主要使用 opacity 与 transform；`prefers-reduced-motion` 下取消非必要运动。首版不添加装饰性 React Bits 动效，只有在真实流程需要且通过审查后再引入。

## Responsive Rules

- 390 × 844：首要基准，底部导航固定，内容预留安全区。
- 430 × 932：保持同一信息密度，扩大水平边距与列表呼吸空间。
- 768px 以上：内容可形成主列表与次级摘要两列，但不牺牲移动阅读顺序。
- 1024px 以上：底部导航转换为窄侧轨；App Frame 最大宽度 1180px。
- 1440 × 900：呈现完整产品工作区，任务主列仍控制在 720px 左右。

## Accessibility and States

所有按钮使用语义元素并具有可见焦点；图标按钮提供可访问名称；表单字段具有可见标签和关联错误；路由切换后焦点进入主内容。必须设计 loading、empty、error、offline、disabled、OAuth disconnected、OAuth expired、AI usage limit 与 structured-output invalid 状态。

## Anti-patterns

不使用紫蓝 AI 渐变、发光 AI 球、聊天气泡主界面、桌面管理后台侧栏、同尺寸卡片矩阵、玻璃拟态、纸张纹理、胶带、手写字体、整页日历时间格、只有颜色的紧急提示或未经确认的 AI 自动保存。
