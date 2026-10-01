import { ArrowCounterClockwise, Check, MapPin } from '@phosphor-icons/react';
import type { Task } from '../../shared/types';
import { getUrgency, urgencyLabel } from '../../shared/urgency';

const kindLabels = { task: '待办', deadline: '截止事项', meeting: '会议', event: '活动' } as const;

export function TaskCard({ task, onStatusChange }: { task: Task; onStatusChange: (task: Task) => void }) {
  const time = task.dueAt ?? task.startAt;
  const urgency = getUrgency(time);
  const completed = task.status === 'completed';
  return (
    <article className={`task-card task-card--${urgency}${completed ? ' is-completed' : ''}`}>
      <button
        className="task-card__check"
        aria-label={completed ? `恢复任务：${task.title}` : `完成任务：${task.title}`}
        onClick={() => onStatusChange(task)}
      >
        {completed ? <ArrowCounterClockwise size={18} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}
      </button>
      <div className="task-card__content">
        <div className="task-card__heading">
          <h3>{task.title}</h3><span className="kind-label">{kindLabels[task.kind]}</span>
        </div>
        <p className={`task-card__time urgency-text urgency-text--${urgency}`}>{completed ? `完成于 ${formatDateTime(task.completedAt)}` : urgencyLabel(time)}</p>
        {task.location && <p className="task-card__meta"><MapPin size={15} aria-hidden="true" />{task.location}</p>}
        {task.sourceExcerpt && <p className="task-card__source">来源：{task.sourceExcerpt}</p>}
      </div>
    </article>
  );
}

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
}

