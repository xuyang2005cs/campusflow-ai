import { useCallback, useEffect, useMemo, useState } from 'react';
import { BellRinging, CalendarDots } from '@phosphor-icons/react';
import { api } from '../api';
import { PageError, PageLoading } from '../components/PageState';
import { TaskCard } from '../components/TaskCard';
import type { Task, TodaySummary } from '../../shared/types';

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

  const selectedKey = dateKey(selectedDate);
  const selectedEnd = new Date(selectedDate); selectedEnd.setHours(23, 59, 59, 999);
  const upcomingEnd = new Date(selectedEnd); upcomingEnd.setDate(upcomingEnd.getDate() + 3);
  const taskTime = (task: Task) => task.dueAt ?? task.startAt;
  const overdue = tasks.filter((task) => { const value = taskTime(task); return value && new Date(value) < new Date(`${selectedKey}T00:00:00+08:00`); });
  const onSelectedDay = tasks.filter((task) => { const value = taskTime(task); return value && dateKey(new Date(value)) === selectedKey; });
  const isToday = selectedKey === dateKey(new Date());
  const upcoming = isToday ? tasks.filter((task) => { const value = taskTime(task); if (!value) return false; const time = new Date(value); return time > selectedEnd && time <= upcomingEnd; }) : [];
  const completedRate = summary?.plannedToday ? Math.round((summary.completedToday / summary.plannedToday) * 100) : null;

  async function toggle(task: Task) { await api.setTaskStatus(task.id, 'completed'); await load(); }

  return (
    <div className="page today-page">
      <header className="today-header">
        <div><p className="brand-name">CampusFlow AI</p><h1>{formatHeadingDate(selectedDate)}</h1><p className="welcome-copy">{summary ? `${isToday ? '今日' : '当天'}到期 ${summary.dueToday} 项${isToday ? ` · 未来 3 天 ${summary.upcoming3d} 项` : ''}` : '把今天安排清楚'}</p></div>
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
          <div><h2 id="summary-title">{isToday ? '今日计划完成率' : '当天计划完成率'}</h2><p>{summary?.plannedToday ? `${summary.completedToday} / ${summary.plannedToday} 项完成 · 仅统计当天计划` : '暂无当天计划 · 未来事项不计入完成率'}</p></div><strong>{completedRate === null ? '—' : `${completedRate}%`}</strong>
          <div className="progress-track" role="progressbar" aria-valuenow={completedRate ?? 0} aria-valuetext={completedRate === null ? '暂无当天计划' : `${completedRate}%`} aria-valuemin={0} aria-valuemax={100} aria-label="当天计划完成进度"><span style={{ width: `${completedRate ?? 0}%` }} /></div>
          <div className="summary-facts" aria-label="任务概览"><span><strong>{summary?.dueToday ?? 0}</strong> 当天待办</span><span><strong>{summary?.upcoming3d ?? 0}</strong> 未来 3 天</span><span><strong>{summary?.overdue ?? 0}</strong> 已逾期</span></div>
        </section>
        {overdue.length === 0 && onSelectedDay.length === 0 && upcoming.length === 0 ? <section className="empty-state"><CalendarDots size={34} aria-hidden="true" /><h2>这一天已经安排妥当</h2><p>可以去收件箱整理新的课程通知。</p></section> : <>
          <TaskSection title="已逾期" hint="需要重新安排" tasks={overdue} onToggle={toggle} />
          <TaskSection title={isToday ? '今天' : formatSectionDate(selectedDate)} hint={`${onSelectedDay.length} 项计划`} tasks={onSelectedDay} onToggle={toggle} />
          {isToday && <TaskSection title="未来 3 天" hint="提前准备" tasks={upcoming} onToggle={toggle} />}
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
function formatSectionDate(date: Date) { return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(date); }
