import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Plus, X } from '@phosphor-icons/react';
import { api } from '../api';
import { PageLoading } from '../components/PageState';
import { TaskCard } from '../components/TaskCard';
import type { ItemKind, Task } from '../../shared/types';

type Range = 'today' | 'week' | 'all';

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [range, setRange] = useState<Range>('week');
  const [creating, setCreating] = useState(false);
  const load = () => api.listTasks('pending').then((result) => setTasks(result.items));
  useEffect(() => { void load(); }, []);
  const groups = useMemo(() => groupByDate(filterRange(tasks ?? [], range)), [tasks, range]);

  return <div className="page"><header className="page-header page-header--action"><div><p className="brand-name">待办</p><h1>所有行动项</h1><p>按日期分组，最近截止的事项优先。</p></div><button className="icon-button icon-button--primary" aria-label="新建任务" onClick={() => setCreating(true)}><Plus size={22} /></button></header>
    <div className="segmented-control task-filter" aria-label="筛选任务日期">{(['today', 'week', 'all'] as const).map((value) => <button key={value} className={range === value ? 'is-active' : ''} onClick={() => setRange(value)}>{value === 'today' ? '今日' : value === 'week' ? '本周' : '全部'}</button>)}</div>
    {creating && <NewTaskPanel onClose={() => setCreating(false)} onCreated={async () => { setCreating(false); await load(); }} />}
    {!tasks ? <PageLoading /> : groups.length ? groups.map(([label, items]) => <section className="task-section" key={label}><div className="section-heading"><h2>{label}</h2><span>{items.length} 项</span></div><div className="task-list">{items.map((task) => <TaskCard key={task.id} task={task} onStatusChange={async (item) => { await api.setTaskStatus(item.id, 'completed'); await load(); }} />)}</div></section>) : <div className="empty-state"><h2>这里暂时没有待办</h2><p>可以新建任务，或从收件箱整理课程通知。</p></div>}</div>;
}

function NewTaskPanel({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState(''); const [kind, setKind] = useState<ItemKind>('task');
  const [dueAt, setDueAt] = useState(''); const [location, setLocation] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!title.trim()) return; setBusy(true);
    try { await api.createTask({ kind, title, dueAt: dueAt ? new Date(dueAt).toISOString() : null, startAt: null, location: location || null, notes: null }); onCreated(); }
    finally { setBusy(false); }
  }
  return <form className="new-task-panel" onSubmit={(event) => void submit(event)}><div className="workspace-heading"><div><span className="step-number"><Plus size={15} /></span><h2>新建行动项</h2></div><button type="button" className="icon-button icon-button--small" aria-label="关闭" onClick={onClose}><X size={18} /></button></div><label className="field-label">标题<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：提交计算机网络作业" /></label><div className="new-task-grid"><label className="field-label">类型<select value={kind} onChange={(event) => setKind(event.target.value as ItemKind)}><option value="task">待办</option><option value="deadline">截止事项</option><option value="meeting">会议</option><option value="event">活动</option></select></label><label className="field-label">截止时间<input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label></div><label className="field-label">地点（可选）<input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="教二 302" /></label><button className="button button--primary button--full" disabled={busy || !title.trim()}>{busy ? '正在保存…' : '保存到待办'}</button></form>;
}

function taskDate(task: Task) { return task.dueAt ?? task.startAt; }
function filterRange(tasks: Task[], range: Range) {
  if (range === 'all') return tasks;
  const now = new Date(); const end = new Date(now); end.setHours(23, 59, 59, 999); if (range === 'week') end.setDate(end.getDate() + 7);
  return tasks.filter((task) => { const value = taskDate(task); return value ? new Date(value) <= end : false; });
}
function groupByDate(tasks: Task[]): [string, Task[]][] {
  const today = localDateKey(new Date()); const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); const tomorrowKey = localDateKey(tomorrow);
  const groups = new Map<string, Task[]>();
  for (const task of tasks) { const value = taskDate(task); const key = value ? localDateKey(new Date(value)) : 'none'; const label = key === today ? '今天' : key === tomorrowKey ? '明天' : key === 'none' ? '无日期' : new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(value!)); groups.set(label, [...(groups.get(label) ?? []), task]); }
  return [...groups.entries()];
}
function localDateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
