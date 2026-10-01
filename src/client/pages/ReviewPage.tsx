import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, MapPin, Sparkle, Trash } from '@phosphor-icons/react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { PageError, PageLoading } from '../components/PageState';
import type { ExtractedItem, ImportRecord, ItemKind } from '../../shared/types';

const kindLabels: Record<ItemKind, string> = { task: '待办', deadline: '截止事项', meeting: '会议', event: '活动' };

export function ReviewPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState<ImportRecord | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { void api.getImport(id).then((value) => { setRecord(value); setState('ready'); }).catch(() => setState('error')); }, [id]);
  const selectedCount = record?.items.filter((item) => item.selected).length ?? 0;

  function updateItem(itemId: string, changes: Partial<ExtractedItem>) {
    setRecord((current) => current ? { ...current, items: current.items.map((item) => item.id === itemId ? { ...item, ...changes } : item) } : current);
  }

  async function save() {
    if (!record || selectedCount === 0) { setError('请至少选择一条行动项'); return; }
    setSaving(true); setError('');
    try { await api.confirmImport(record.id, record.items); navigate('/today'); }
    catch (caught) { setError(caught instanceof Error ? caught.message : '保存失败，请重试'); }
    finally { setSaving(false); }
  }

  if (state === 'loading') return <main className="review-shell"><PageLoading label="正在加载提取结果" /></main>;
  if (state === 'error' || !record) return <main className="review-shell"><PageError message="没有找到这次整理结果" /></main>;

  return (
    <main className="review-shell">
      <header className="review-header"><Link to="/inbox" className="icon-button" aria-label="返回收件箱"><ArrowLeft size={22} aria-hidden="true" /></Link><div><p>AI 整理结果</p><h1>确认行动项</h1></div><span className="review-count">{selectedCount}/{record.items.length}</span></header>
      <section className="review-source"><div><Sparkle size={20} aria-hidden="true" /><strong>识别出 {record.items.length} 条信息</strong></div><p>{record.rawText}</p><span>保存前请检查日期、地点和标题</span></section>
      <div className="review-list">
        {record.items.map((item, index) => <ReviewItem key={item.id} item={item} index={index} onChange={(changes) => updateItem(item.id, changes)} />)}
      </div>
      {error && <p className="inline-message inline-message--error" role="alert">{error}</p>}
      <div className="review-action"><button className="button button--primary button--full" disabled={saving || selectedCount === 0} onClick={() => void save()}>{saving ? '正在保存…' : `保存 ${selectedCount} 条到任务面板`}<CheckCircle size={20} aria-hidden="true" /></button></div>
    </main>
  );
}

function ReviewItem({ item, index, onChange }: { item: ExtractedItem; index: number; onChange: (changes: Partial<ExtractedItem>) => void }) {
  return <article className={`review-item${item.selected ? '' : ' is-unselected'}`}>
    <div className="review-item__top"><label className="select-item"><input type="checkbox" checked={item.selected} onChange={(event) => onChange({ selected: event.target.checked })} /><span>第 {index + 1} 条</span></label><button className="icon-button icon-button--danger" aria-label={`取消选择：${item.title}`} onClick={() => onChange({ selected: false })}><Trash size={18} aria-hidden="true" /></button></div>
    <div className="review-grid">
      <label><span>类型</span><select value={item.kind} onChange={(event) => onChange({ kind: event.target.value as ItemKind })}>{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="review-title-field"><span>标题</span><input value={item.title} onChange={(event) => onChange({ title: event.target.value })} /></label>
      <label><span>截止时间</span><input type="datetime-local" value={toLocalInput(item.dueAt)} onChange={(event) => onChange({ dueAt: fromLocalInput(event.target.value) })} /></label>
      <label><span>开始时间</span><input type="datetime-local" value={toLocalInput(item.startAt)} onChange={(event) => onChange({ startAt: fromLocalInput(event.target.value) })} /></label>
      <label className="review-title-field"><span>地点</span><div className="input-with-icon"><MapPin size={17} aria-hidden="true" /><input value={item.location ?? ''} onChange={(event) => onChange({ location: event.target.value || null })} /></div></label>
      <label className="review-title-field"><span>备注</span><textarea rows={2} value={item.notes ?? ''} onChange={(event) => onChange({ notes: event.target.value || null })} /></label>
    </div>
    <footer><span>原文时间：{item.originalTimeText ?? '未明确'}</span><span>置信度 {Math.round(item.confidence * 100)}%</span></footer>
  </article>;
}

function toLocalInput(value: string | null) {
  if (!value) return '';
  const date = new Date(value); const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
function fromLocalInput(value: string) { return value ? new Date(value).toISOString() : null; }

