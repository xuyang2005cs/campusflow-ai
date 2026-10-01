import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { ArrowRight, FileImage, TextAlignLeft, UploadSimple, WarningCircle } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

type Mode = 'text' | 'image';

export function InboxPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>('text');
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  useEffect(() => { void api.aiStatus().then((status) => setConnected(status.connected)).catch(() => setConnected(false)); }, []);
  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError('请选择 PNG、JPG 或 WEBP 图片'); return; }
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file)); setText(''); setError(''); setOcrProgress(0); setBusy(true);
    try {
      const { createWorker, OEM } = await import('tesseract.js');
      const worker = await createWorker(['chi_sim', 'eng'], OEM.LSTM_ONLY, { logger: (message) => { if (message.status === 'recognizing text') setOcrProgress(Math.round(message.progress * 100)); } });
      const prepared = await prepareImage(file);
      const result = await worker.recognize(prepared);
      await worker.terminate();
      setText(result.data.text.trim()); setOcrProgress(100);
    } catch { setError('图片文字没有识别成功，请重试或直接编辑文字'); }
    finally { setBusy(false); }
  }

  async function organize(preview = false) {
    if (!text.trim()) { setError('请先输入或识别需要整理的文字'); return; }
    setBusy(true); setError('');
    try {
      const record = await api.createImport(mode, text, mode === 'image' ? text : null);
      if (preview) {
        await api.demoExtract(record.id);
        navigate(`/review/${record.id}`);
        return;
      }
      const extracted = await api.extract(record.id, new Date().toISOString(), Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai');
      navigate(`/review/${extracted.id}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : '整理失败，请重试'); }
    finally { setBusy(false); }
  }

  return (
    <div className="page inbox-page">
      <header className="page-header"><div><p className="brand-name">收件箱</p><h1>把通知变成行动</h1><p>粘贴群消息，或从截图识别文字。保存前你始终可以检查和修改。</p></div></header>
      <div className="segmented-control" aria-label="选择输入方式">
        <button className={mode === 'text' ? 'is-active' : ''} aria-pressed={mode === 'text'} onClick={() => setMode('text')}><TextAlignLeft size={19} aria-hidden="true" />粘贴文字</button>
        <button className={mode === 'image' ? 'is-active' : ''} aria-pressed={mode === 'image'} onClick={() => setMode('image')}><FileImage size={19} aria-hidden="true" />上传截图</button>
      </div>

      <section className="source-workspace" aria-labelledby="source-title">
        <div className="workspace-heading"><div><span className="step-number">1</span><h2 id="source-title">原始信息</h2></div><span>{mode === 'text' ? '文字输入' : '图片 OCR'}</span></div>
        {mode === 'image' && <>
          <input ref={fileRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void handleFile(event)} />
          {!imageUrl ? <button className="upload-zone" onClick={() => fileRef.current?.click()}><UploadSimple size={28} aria-hidden="true" /><strong>选择聊天或课程通知截图</strong><span>PNG、JPG、WEBP · 中英文识别</span></button> : <div className="image-preview"><img src={imageUrl} alt="待识别的通知截图预览" /><button className="text-button" onClick={() => fileRef.current?.click()}>更换图片</button></div>}
          {ocrProgress !== null && <div className="ocr-status" role="status"><span>OCR {busy ? '正在识别' : '识别完成'}</span><strong>{ocrProgress}%</strong><div><i style={{ width: `${ocrProgress}%` }} /></div></div>}
        </>}
        <label className="field-label" htmlFor="source-text">{mode === 'text' ? '通知内容' : '识别文字（可编辑）'}</label>
        <textarea id="source-text" value={text} onChange={(event) => setText(event.target.value)} rows={9} placeholder="例如：老师说数据结构实验报告明天晚上 10 点之前提交。周五下午三点在教二 302 答疑。" />
        <div className="input-foot"><span>{text.length} 字</span><button className="text-button" onClick={() => setText('')}>清空</button></div>
      </section>

      <section className="organize-panel" aria-labelledby="organize-title">
        <div><span className="step-number">2</span><div><h2 id="organize-title">整理行动项</h2><p>{connected ? '使用 ChatGPT 计划提取待办、截止日期、会议与活动。' : '连接 ChatGPT 后，AI 会提取可确认的行动项。'}</p></div></div>
        {!connected && <a className="connection-note" href="/settings"><WarningCircle size={18} aria-hidden="true" />ChatGPT 尚未连接<span>前往设置</span></a>}
        <button className="button button--primary button--full" disabled={busy || !text.trim() || !connected} onClick={() => void organize()}>{busy ? '正在处理…' : <>AI 整理<ArrowRight size={19} aria-hidden="true" /></>}</button>
        {import.meta.env.DEV && <button className="button button--secondary button--full" disabled={busy || !text.trim()} onClick={() => void organize(true)}>开发预览：生成示例提取结果</button>}
      </section>
      {error && <p className="inline-message inline-message--error" role="alert">{error}</p>}
    </div>
  );
}

async function prepareImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(2, 1800 / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < image.data.length; index += 4) {
    const gray = image.data[index] * 0.299 + image.data[index + 1] * 0.587 + image.data[index + 2] * 0.114;
    const value = gray > 178 ? 255 : gray < 72 ? 0 : gray;
    image.data[index] = value; image.data[index + 1] = value; image.data[index + 2] = value;
  }
  context.putImageData(image, 0, 0);
  return await new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob ?? file), 'image/png'));
}

