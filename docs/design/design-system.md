# CampusFlow AI 设计系统

CampusFlow AI 的视觉系统由 UIUX Pro Max 的 Student Productivity / Task Manager 检索结果与 Impeccable 的 Operate 模式共同约束。主产品采用现代校园日程簿的信息秩序，Inbox 与 Review 采用通知整理台的结构化过程表达。

## 设计目标

- 390 × 844 下优先完成高频任务。
- Today 页在数秒内说明今日负担、紧急项和完成进度。
- OCR 与 AI 过程可见、可编辑、可恢复，但不呈现聊天机器人界面。
- 通过文字、图标和层级共同表达 Deadline 紧急程度。
- 保持年轻、轻量和克制，避免儿童风格与 SaaS 模板感。

## Design Dials

| 维度 | 设定 |
|---|---|
| Variance | 5 / 10，现代但不牺牲熟悉度 |
| Motion | 3 / 10，仅保留功能性微动效 |
| Density | 6 / 10，适合手机任务列表 |
| Surface mode | Operate |
| Build path | Code-first |

## 页面结构

```text
App Shell
├─ Today       日期与行动优先级
├─ Inbox       文字 / 截图输入与 OCR
├─ Tasks       按日期组织的未完成事项
├─ Completed   完成记录与恢复
├─ Settings    时区、ChatGPT 连接与模型
└─ Review      AI 提取结果的人工确认流程
```

具体 Token、组件、响应式规则和反模式以根目录 [DESIGN.md](../../DESIGN.md) 为准。
