import { useEffect, useRef, useState } from 'react';
import { ChatCircleDots, Clock, LinkSimple, SignOut } from '@phosphor-icons/react';
import { api } from '../api';

export function SettingsPage() {
  const [connected, setConnected] = useState(false);
  const [model, setModel] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | null>(null);

  async function refresh() {
    const status = await api.aiStatus();
    setConnected(status.connected); setModel(status.model); setMessage(status.message ?? '');
    if (status.connected && timer.current) { window.clearInterval(timer.current); timer.current = null; }
  }

  useEffect(() => { void refresh(); return () => { if (timer.current) window.clearInterval(timer.current); }; }, []);

  async function connect() {
    setBusy(true); setMessage('正在准备安全授权…');
    try {
      const result = await api.beginAiLogin();
      if (result.authUrl) window.open(result.authUrl, '_blank', 'noopener,noreferrer');
      setMessage(result.status.message ?? '请在 OpenAI 页面完成授权');
      timer.current = window.setInterval(() => { void refresh(); }, 1500);
    } catch (error) { setMessage(error instanceof Error ? error.message : '授权没有启动，请重试'); }
    finally { setBusy(false); }
  }

  async function disconnect() {
    await api.disconnectAi(); setConnected(false); setModel(null); setMessage('连接已移除');
  }

  return <div className="page"><header className="page-header"><p className="brand-name">设置</p><h1>偏好与连接</h1><p>管理时间解析方式和 AI 服务。</p></header><section className="settings-section"><h2>时间</h2><div className="settings-row"><Clock size={22} aria-hidden="true" /><div><strong>默认时区</strong><span>Asia/Shanghai</span></div><span className="settings-value">中国标准时间</span></div></section><section className="settings-section"><h2>AI 服务</h2><div className={`connection-card ${connected ? 'is-connected' : ''}`}><div><ChatCircleDots size={24} aria-hidden="true" /><div><strong>{connected ? '已连接 ChatGPT' : 'ChatGPT 尚未连接'}</strong><span>{connected ? `正在使用 ChatGPT 计划${model ? ` · ${model}` : ''}` : '连接后可整理通知中的行动项'}</span></div></div>{connected ? <button className="button button--secondary" onClick={() => void disconnect()}><SignOut size={18} aria-hidden="true" />断开连接</button> : <button className="button button--primary" disabled={busy} onClick={() => void connect()}><LinkSimple size={18} aria-hidden="true" />{busy ? '正在连接…' : 'Continue with ChatGPT'}</button>}{message && <p className="connection-message" role="status">{message}</p>}<p>授权由 OpenAI 完成。OAuth 凭据只保存在本机服务端，不会进入浏览器存储。</p></div></section></div>;
}
