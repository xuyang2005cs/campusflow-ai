import { useCallback, useEffect, useMemo, useState } from 'react';
import { BellRinging, CalendarDots } from '@phosphor-icons/react';
import { api } from '../api';
import { PageError, PageLoading } from '../components/PageState';
import { TaskCard } from '../components/TaskCard';
import type { Task, TodaySummary } from '../../shared/types';
import { getUrgency } from '../../shared/urgency';

function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }

export function TodayPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(async () => {
    setState('loading');
    try {
      const [taskResult, summaryResult] = await Promise.all([api.listTasks('pending'), api.summary(dateKey(selectedDate))]);
      setTasks(taskResult.items); setSummary(summaryResult); setState('ready');
    } catch { setState('error'); }
  }, [selectedDate]);

  useEffect(() => { void load(); }, [load]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(); date.setDate(date.getDate() + index - 2); return date;
  }), []);

  const urgent = tasks.filter((task) => ['overdue', 'within24h', 'within3d'].includes(getUrgency(task.dueAt ?? task.startAt)));
  const meetings = tasks.filter((task) => task.kind === 'meeting' || task.kind === 'event');
  const later = tasks.filter((task) => !urgent.includes(task) && !meetings.includes(task));
  const completedRate = summary?.total ? Math.round((summary.completed / summary.total) * 100) : 0;

  async function toggle(task: Task) { await api.setTaskStatus(task.id, 'completed'); await load(); }

  return (
    <div className="page today-page">
      <header className="today-header">
        <div><p className="brand-name">CampusFlow AI</p><h1>{formatHeadingDate(selectedDate)}</h1><p className="welcome-copy">{summary ? `今天有 ${summary.pending} 件事需要处理` : '把今天安排清楚'}</p></div>
        <button className="icon-button" aria-label="查看提醒"><BellRinging size={22} aria-hidden="true" /></button>
      </header>

      <section className="date-strip" aria-label="选择日期">
        {days.map((day) => {
          const active = dateKey(day) === dateKey(selectedDate);
          const today = dateKey(day) === dateKey(new Date());
          return <button key={dateKey(day)} className={`date-chip${active ? ' is-active' : ''}`} aria-pressed={active} onClick={() => setSelectedDate(day)}><span>{today ? '今天' : weekday(day)}</span><strong>{day.getDate()}</strong></button>;
        })}
      </section>

      {state === 'loading' && <PageLoading label="正在整理今天的安排" />}
      {state === 'error' && <PageError message="今天的任务暂时没有加载成功" onRetry={() => void load()} />}
      {state === 'ready' && <>
        <section className="daily-summary" aria-labelledby="summary-title">
          <div><h2 id="summary-title">今日进度</h2><p>{summary?.completed ?? 0} 项完成 · {summary?.dueSoon ?? 0} 项即将截止</p></div><strong>{completedRate}%</strong>
          <div className="progress-track" role="progressbar" aria-valuenow={completedRate} aria-valuemin={0} aria-valuemax={100} aria-label="今日完成进度"><span style={{ width: `${completedRate}%` }} /></div>
        </section>
        {tasks.length === 0 ? <section className="empty-state"><CalendarDots size={34} aria-hidden="true" /><h2>这一天已经安排妥当</h2><p>可以去收件箱整理新的课程通知。</p></section> : <>
          <TaskSection title="紧急" hint="优先处理" tasks={urgent} onToggle={toggle} />
          <TaskSection title="会议与活动" hint="按时到场" tasks={meetings.filter((task) => !urgent.includes(task))} onToggle={toggle} />
          <TaskSection title="之后" hint="保持节奏" tasks={later} onToggle={toggle} />
        </>}
      </>}
    </div>
  );
}

function TaskSection({ title, hint, tasks, onToggle }: { title: string; hint: string; tasks: Task[]; onToggle: (task: Task) => void }) {
  if (!tasks.length) return null;
  return <section className="task-section"><div className="section-heading"><h2>{title}</h2><span>{hint}</span></div><div className="task-list">{tasks.map((task) => <TaskCard key={task.id} task={task} onStatusChange={onToggle} />)}</div></section>;
}

function weekday(date: Date) { return new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date).replace('周', ''); }
function formatHeadingDate(date: Date) { return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(date); }
