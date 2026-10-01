export type Urgency = 'overdue' | 'within24h' | 'within3d' | 'within7d' | 'normal' | 'none';

export function getUrgency(dueAt: string | null, now = new Date()): Urgency {
  if (!dueAt) return 'none';
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return 'none';
  const hours = (due.getTime() - now.getTime()) / 3_600_000;
  if (hours < 0) return 'overdue';
  if (hours <= 24) return 'within24h';
  if (hours <= 72) return 'within3d';
  if (hours <= 168) return 'within7d';
  return 'normal';
}

export function urgencyLabel(dueAt: string | null, now = new Date()): string {
  const urgency = getUrgency(dueAt, now);
  if (!dueAt) return '无截止日期';
  const due = new Date(dueAt);
  const time = new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(due);
  const days = Math.ceil((due.getTime() - now.getTime()) / 86_400_000);
  if (urgency === 'overdue') return `已逾期 · ${time}`;
  if (urgency === 'within24h') return `24 小时内 · ${time}`;
  if (days === 1) return `明天截止 · ${time}`;
  if (days > 1 && days <= 7) return `还有 ${days} 天 · ${time}`;
  return `${time} 截止`;
}
