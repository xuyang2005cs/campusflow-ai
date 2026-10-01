# Phase 0–2 开发记录

## 目标与结果

本轮从空目录建立 TypeScript 全栈项目，并完成本地任务闭环：任务创建、Today、日期分组、完成与恢复、SQLite 重启持久化、文字/截图 Inbox、客户端 OCR、Pi AI OAuth 起点、Structured Output、Review 和确认保存。

## 工程选择

- Hono 与 React 共享 TypeScript 类型，避免为 AI package 单独增加第二套后端。
- SQLite 是单机应用的正式持久层；数据库文件位于 `data/` 并被 Git 忽略。
- OCR 在客户端运行，识别文本可编辑，原始图片不持久化。
- Pi AI 的 OpenAI provider 承担模型目录、OAuth 和请求适配；应用注入文件型 `CredentialStore`。
- TypeBox 对工具参数和返回结果执行双重 Schema 约束。

## 真实问题与修复

1. **Impeccable Windows 路由参数被识别为磁盘根路径**  
   Surface brief 的 `/today` 被工具写入 `D:\today`。确认该目录只含本次生成文件后，将文件移回项目 `.impeccable/surfaces/` 并删除空目录。后续以项目内文件路径作为工具目标。

2. **npm Arborist 安装异常**  
   首次 `npm install` 报 `Cannot read properties of null (reading 'edgesOut')`。使用 npm 支持的 `--legacy-peer-deps` 完成确定性安装，并在 CI 中采用同一参数；安全审计为 0 vulnerability。

3. **Review 的日期输入在 390px 下溢出**  
   两个 `datetime-local` 控件并排超过移动视口。移动端改为单列，768px 以上再恢复双列，并重新截取 390×844 页面验证。

4. **Playwright 设备预设错误选择 WebKit**  
   `iPhone 13` 预设默认要求本机未安装的 WebKit。测试明确改为 Chromium，并在 Windows 复用系统 Edge；CI 安装 Chromium。最终 6 个浏览器流程全部通过。

5. **生产 Service Worker 返回 HTML MIME**  
   SPA catch-all 接管了 `/sw.js`，导致注册失败。为 Service Worker 增加显式静态路由后，生产页面控制台恢复为 0 error。

6. **ChatGPT 授权回调成功，但 Token 交换返回 HTTP 403**
   2026-10-01 使用真实账号完成两次 OpenAI 浏览器授权，本地 callback 均显示成功；Pi AI 随后的 Token 请求均收到 HTTP 403，因此没有生成 `.local/auth.json`，也没有进行实时模型调用。已确认 npm 最新版仍为 `@earendil-works/pi-ai@0.99.2`，并保留安全的状态码级错误提示，不记录授权码或 Token。该现象与 Pi 的[动态客户端可用性问题](https://github.com/earendil-works/pi/issues/10184)及 OpenAI Codex 的[区域 / 网络导致 Token 交换 403](https://github.com/openai/codex/issues/37682)报告一致；在服务端开放前不切换非指定 provider，也不伪造连接状态。

7. **Today 统计口径造成 0 件待办与 100% 并存**
   原实现把不同时间范围的任务混入同一摘要，未来截止事项与今日进度含义不一致。摘要现拆分为“今日到期、未来 3 天、已逾期”，完成率只统计当天计划；无当天计划时显示 `—`，避免暗示已全部完成。

## 验证

- Vitest：35 tests passed
- Playwright：6 tests passed（移动端 Edge/Chromium）
- TypeScript：strict + no-unused checks passed
- Vite production build：passed
- 实机视口：390×844、430×932、1440×900
- SQLite 写入后重启读取：passed
- OpenAI 浏览器授权 / callback：passed
- OpenAI Token 交换：blocked（HTTP 403；无 credential 写入）
