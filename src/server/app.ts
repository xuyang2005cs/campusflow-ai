import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import type { ExtractedItem, ItemKind, TaskStatus } from '../shared/types.js';
import { CampusDatabase } from './database.js';
import { AiError, CampusAi, type AiStatus } from './ai/campus-ai.js';

const kinds = new Set<ItemKind>(['task', 'deadline', 'meeting', 'event']);

export interface AiService {
  status(): Promise<AiStatus>;
  beginLogin(): Promise<{ authUrl: string | null; status: AiStatus }>;
  logout(): Promise<void>;
  extract(text: string, localDateTime: string, timezone: string): Promise<ExtractedItem[]>;
}

export function createApp(database = new CampusDatabase(), ai: AiService = new CampusAi()) {
  const app = new Hono();

  app.get('/api/health', (c) => c.json({ status: 'ok' }));

  app.get('/api/tasks', (c) => {
    const status = c.req.query('status') as TaskStatus | undefined;
    if (status && status !== 'pending' && status !== 'completed') return c.json({ error: { code: 'INVALID_STATUS', message: '任务状态无效' } }, 422);
    return c.json({ items: database.listTasks(status) });
  });

  app.post('/api/tasks', async (c) => {
    const body = await c.req.json<Record<string, unknown>>();
    if (typeof body.title !== 'string' || !body.title.trim()) return c.json({ error: { code: 'INVALID_TITLE', message: '任务标题不能为空' } }, 422);
    if (!kinds.has(body.kind as ItemKind)) return c.json({ error: { code: 'INVALID_KIND', message: '任务类型无效' } }, 422);
    const task = database.createTask({
      kind: body.kind as ItemKind,
      title: body.title,
      dueAt: typeof body.dueAt === 'string' ? body.dueAt : null,
      startAt: typeof body.startAt === 'string' ? body.startAt : null,
      location: typeof body.location === 'string' ? body.location : null,
      notes: typeof body.notes === 'string' ? body.notes : null,
    });
    return c.json(task, 201);
  });

  app.patch('/api/tasks/:id/status', async (c) => {
    const body = await c.req.json<{ status?: TaskStatus }>();
    if (body.status !== 'pending' && body.status !== 'completed') return c.json({ error: { code: 'INVALID_STATUS', message: '任务状态无效' } }, 422);
    const task = database.setTaskStatus(c.req.param('id'), body.status);
    return task ? c.json(task) : c.json({ error: { code: 'NOT_FOUND', message: '没有找到该任务' } }, 404);
  });

  app.get('/api/summary', (c) => {
    const date = c.req.query('date') ?? new Date().toISOString().slice(0, 10);
    return c.json(database.summary(date));
  });

  app.post('/api/imports', async (c) => {
    const body = await c.req.json<{ inputType?: 'text' | 'image'; rawText?: string; ocrText?: string | null }>();
    if ((body.inputType !== 'text' && body.inputType !== 'image') || typeof body.rawText !== 'string' || !body.rawText.trim()) {
      return c.json({ error: { code: 'INVALID_IMPORT', message: '请提供需要整理的文字' } }, 422);
    }
    return c.json(database.createImport(body.inputType, body.rawText.trim(), body.ocrText ?? null), 201);
  });

  app.get('/api/imports/:id', (c) => {
    const record = database.getImport(c.req.param('id'));
    return record ? c.json(record) : c.json({ error: { code: 'NOT_FOUND', message: '没有找到该导入记录' } }, 404);
  });

  app.post('/api/imports/:id/demo-extract', (c) => {
    const record = database.getImport(c.req.param('id'));
    if (!record) return c.json({ error: { code: 'NOT_FOUND', message: '没有找到该导入记录' } }, 404);
    const now = new Date();
    const items: ExtractedItem[] = [
      {
        id: randomUUID(), kind: 'deadline', title: '提交数据结构实验报告',
        dueAt: new Date(now.getTime() + 33 * 3_600_000).toISOString(), startAt: null,
        location: null, notes: '完成实验截图与复杂度分析', originalTimeText: '明天晚上十点之前',
        sourceExcerpt: '数据结构实验报告明天晚上十点之前提交', confidence: 0.94, selected: true,
      },
      {
        id: randomUUID(), kind: 'meeting', title: '课程答疑', dueAt: null,
        startAt: new Date(now.getTime() + 50 * 3_600_000).toISOString(), location: '教二 302',
        notes: null, originalTimeText: '周五下午三点', sourceExcerpt: '周五下午三点在教二 302 答疑', confidence: 0.9, selected: true,
      },
    ];
    return c.json(database.setExtractedItems(record.id, items));
  });

  app.post('/api/imports/:id/confirm', async (c) => {
    const record = database.getImport(c.req.param('id'));
    if (!record) return c.json({ error: { code: 'NOT_FOUND', message: '没有找到该导入记录' } }, 404);
    const body = await c.req.json<{ items?: ExtractedItem[] }>();
    if (!Array.isArray(body.items)) return c.json({ error: { code: 'INVALID_ITEMS', message: '确认条目格式无效' } }, 422);
    return c.json({ items: database.confirmImport(record.id, body.items) });
  });

  app.post('/api/imports/:id/extract', async (c) => {
    const record = database.getImport(c.req.param('id'));
    if (!record) return c.json({ error: { code: 'NOT_FOUND', message: '没有找到该导入记录' } }, 404);
    const body = await c.req.json<{ localDateTime?: string; timezone?: string }>();
    const localDateTime = typeof body.localDateTime === 'string' ? body.localDateTime : '';
    const timezone = typeof body.timezone === 'string' ? body.timezone : '';
    if (!localDateTime || !timezone) return c.json({ error: { code: 'MISSING_TIME_CONTEXT', message: '缺少本地时间或时区信息' } }, 422);
    try {
      const items = await ai.extract(record.ocrText ?? record.rawText, localDateTime, timezone);
      return c.json(database.setExtractedItems(record.id, items));
    } catch (error) {
      if (error instanceof AiError) {
        const status = error.code === 'AI_NOT_CONNECTED' ? 401 : error.code === 'USAGE_LIMIT' ? 429 : 502;
        return c.json({ error: { code: error.code, message: error.message } }, status);
      }
      return c.json({ error: { code: 'AI_REQUEST_FAILED', message: '本次整理失败，请重试' } }, 502);
    }
  });

  app.get('/api/ai/status', async (c) => c.json(await ai.status()));
  app.post('/api/ai/login', async (c) => c.json(await ai.beginLogin(), 202));
  app.delete('/api/ai/connection', async (c) => {
    await ai.logout();
    return c.json({ connected: false });
  });

  app.use('/assets/*', serveStatic({ root: './dist/client' }));
  app.use('/app-icon.svg', serveStatic({ path: './dist/client/app-icon.svg' }));
  app.use('/manifest.webmanifest', serveStatic({ path: './dist/client/manifest.webmanifest' }));
  app.use('/sw.js', serveStatic({ path: './dist/client/sw.js' }));
  app.get('*', serveStatic({ path: './dist/client/index.html' }));

  return { app, database };
}

