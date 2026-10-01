export function extractionPrompt(text: string, localDateTime: string, timezone: string): string {
  return `你是校园信息整理器。请调用 submit_extracted_items，只返回真正具有行动意义的待办、截止事项、会议或活动。

当前本地时间：${localDateTime}
时区：${timezone}

规则：
1. 不确定日期不要猜，无法确定时填写 null。
2. 只有明确的截止时间才填写 dueAt；只有明确的开始时间才填写 startAt。
3. 将可确定的相对时间转换为带时区偏移的 ISO 8601，同时保留 originalTimeText。
4. 不推断原文没有出现的地点或要求。
5. 忽略“好的”“收到”“哈哈”等没有行动意义的内容。
6. 合并重复事项。低置信度事项可以返回，但 confidence 必须反映不确定性。
7. sourceExcerpt 使用能支持该事项的最短原文片段。

待整理内容：
${text}`;
}
