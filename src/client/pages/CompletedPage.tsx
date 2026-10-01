import { useEffect, useMemo, useState } from 'react';
import { CheckCircle } from '@phosphor-icons/react';
import { api } from '../api';
import { PageLoading } from '../components/PageState';
import { TaskCard } from '../components/TaskCard';
import type { Task } from '../../shared/types';

export function CompletedPage() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const load = () => api.listTasks('completed').then((result) => setTasks(result.items));
  useEffect(() => { void load(); }, []);
  const sections = useMemo(() => completedGroups(tasks ?? []), [tasks]);
  const weekCount = sections.slice(0, 2).reduce((sum, [, items]) => sum + items.length, 0);
  return <div className="page"><header className="page-header"><p className="brand-name">完成</p><h1>完成记录</h1><p>{tasks ? `本周已经推进 ${weekCount} 项，做过的事都留有记录。` : '回顾已经推进的事情'}</p></header>{tasks && tasks.length > 0 && <div className="completion-summary"><CheckCircle size={28} weight="fill" /><div><strong>{weekCount}</strong><span>本周完成</span></div><p>完成不是删除。任何事项都可以恢复到待办。</p></div>}{!tasks ? <PageLoading /> : tasks.length ? sections.map(([label, items]) => <section className="task-section" key={label}><div className="section-heading"><h2>{label}</h2><span>{items.length} 项</span></div><div className="task-list">{items.map((task) => <TaskCard key={task.id} task={task} onStatusChange={async (item) => { await api.setTaskStatus(item.id, 'pending'); await load(); }} />)}</div></section>) : <div className="empty-state"><CheckCircle size={36} /><h2>还没有完成记录</h2><p>完成的任务会保留在这里，并且可以恢复。</p></div>}</div>;
}

function completedGroups(tasks: Task[]): [string, Task[]][] {
  const now = new Date(); const start = new Date(now); start.setHours(0, 0, 0, 0); const week = new Date(start); week.setDate(week.getDate() - 7);
  const today: Task[] = []; const recent: Task[] = []; const history: Task[] = [];
  for (const task of tasks) { const completed = task.completedAt ? new Date(task.completedAt) : new Date(0); if (completed >= start) today.push(task); else if (completed >= week) recent.push(task); else history.push(task); }
  return [['今天完成', today], ['本周完成', recent], ['历史完成', history]].filter(([, items]) => items.length) as [string, Task[]][];
}
