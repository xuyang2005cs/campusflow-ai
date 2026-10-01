# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React、Vite 与 TypeScript 构建移动端优先的 Web / PWA 界面；Node.js 与 Hono 提供单一后端；SQLite 负责本地持久化；`@earendil-works/pi-ai` 提供模型、认证与结构化提取能力；Tesseract.js 在客户端执行中英文 OCR。选择 Hono 是因为当前应用的 API 边界较小，可用更少框架代码完成类型清晰的本地服务。

## Users

主要用户是需要处理班级群、课程群、实验室和社团通知的学生。典型场景是在手机上快速粘贴一段群聊文字或上传截图，将其中具有行动意义的待办、截止事项、会议和活动整理到个人任务面板。

## Product Purpose

CampusFlow AI 将零散的校园消息转化为可确认、可追踪的行动项。成功意味着用户能够从文字或截图完成“输入 → OCR → AI 结构化提取 → 人工确认 → 本地保存”，并在 Today、Tasks 与 Completed 页面持续管理任务状态。

## Positioning

产品不是聊天机器人。AI 只承担信息结构化能力，用户面对的是任务、截止日期、会议和活动；任何 AI 结果都必须经过可编辑的 Review 流程后才能写入任务数据库。

## Operating Context

- 手机是主要使用设备，首要视口为 390 × 844，其次为 430 × 932；桌面 1440 × 900 提供扩展布局。
- 输入来自用户主动复制的文字或主动上传的 PNG、JPG、WEBP 截图。
- 默认时区为 `Asia/Shanghai`，设置页允许修改。
- 本地服务启动后复用已有 SQLite 数据、OAuth credential store 与稳定 installation ID。

## Capabilities and Constraints

- 任务类型固定为 `task`、`deadline`、`meeting`、`event`；状态固定为 `pending`、`completed`。
- 完成任务采用状态更新，不永久删除；Completed 页面允许恢复。
- OCR 文本必须在提交 AI 前可编辑。
- AI 输出必须经过 TypeBox Schema 校验，并保留原始时间表达与来源摘录。
- 相对时间解析必须向模型提供当前本地时间与时区，不确定的日期不得猜测。
- ChatGPT OAuth 通过 Pi AI 的公开 provider/auth API 实现；Token 不返回前端、不进入业务表、不写日志或 Git。
- 自动化测试使用测试 provider，不消耗真实 ChatGPT 计划。
- 不读取聊天软件、不后台监控消息、不使用 RAG、Agent、向量数据库或云同步。

## Brand Commitments

- 英文名称：CampusFlow AI。
- 中文副标题：校园信息整理与行动助手。
- 中文界面，年轻、清晰、轻量，具有学生效率工具的克制感。
- 不使用紫蓝 AI 渐变、发光 AI 球、聊天框模板、SaaS 后台式侧栏或装饰性玻璃拟态。
- AI 是信息整理能力，不作为页面视觉噱头。

## Evidence on Hand

项目从零开始。首版全部界面与截图使用自编课程通知和任务数据，不包含真实聊天、私人课程记录或账户凭据。

## Product Principles

1. 行动项优先：界面首先帮助用户判断现在要做什么。
2. 人工确认：AI 提取不绕过用户确认直接写库。
3. 时间可信：截止日期同时显示绝对时间与易读的紧急说明。
4. 本地持久：任务和授权凭据保留在用户设备，并严格分开存储。
5. 失败可恢复：OCR、认证和 AI 请求失败都提供清晰原因与下一步操作。

## Accessibility & Inclusion

交互目标至少 44 × 44 CSS px；表单保留可见标签；键盘与屏幕阅读器可完成核心流程；截止状态使用颜色与文字共同表达；动效尊重 `prefers-reduced-motion`；界面允许浏览器缩放。
