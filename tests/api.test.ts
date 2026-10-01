import { beforeEach, describe, expect, it } from 'vitest';
import { createApp, type AiService } from '../src/server/app.js';
import { CampusDatabase } from '../src/server/database.js';
import type { ExtractedItem } from '../src/shared/types.js';

const item: ExtractedItem = {
  id: 'ai-1', kind: 'meeting', title: '课程答疑', dueAt: null,
  startAt: '2026-10-02T15:00:00+08:00', location: '教二 302', notes: null,
  originalTimeText: '明天下午三点', sourceExcerpt: '明天下午三点在教二 302 答疑', confidence: 0.91, selected: true,
};

class FakeAi implements AiService {
  connected = false;
  fail = false;
  async status() { return { connected: this.connected, provider: 'openai' as const, authLabel: 'Sign in with ChatGPT' as const, planLabel: '使用 ChatGPT 计划' as const, model: this.connected ? 'catalog-model' : null, loginState: this.connected ? 'connected' as const : 'idle' as const, message: null }; }
  async beginLogin() { return { authUrl: 'https://example.test/oauth', status: await this.status() }; }
  async logout() { this.connected = false; }
  async extract() { if (this.fail) throw new Error('provider down'); return [item]; }
}

describe('CampusFlow API', () => {
  let database: CampusDatabase;
  let ai: FakeAi;
  let app: ReturnType<typeof createApp>['app'];

  beforeEach(() => { database = new CampusDatabase(':memory:'); ai = new FakeAi(); app = createApp(database, ai).app; });

  it('reports health', async () => expect(await (await app.request('/api/health')).json()).toEqual({ status: 'ok' }));
  it('creates a task', async () => {
    const response = await app.request('/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'task', title: '阅读论文' }) });
    expect(response.status).toBe(201); expect((await response.json() as { title: string }).title).toBe('阅读论文');
  });
  it('rejects blank titles', async () => {
    const response = await app.request('/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'task', title: '  ' }) });
    expect(response.status).toBe(422);
  });
  it('rejects unknown kinds', async () => {
    const response = await app.request('/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'message', title: '事项' }) });
    expect(response.status).toBe(422);
  });
  it('returns a missing task as 404 when changing status', async () => {
    const response = await app.request('/api/tasks/missing/status', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'completed' }) });
    expect(response.status).toBe(404);
  });
  it('imports text without saving a task', async () => {
    const response = await app.request('/api/imports', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ inputType: 'text', rawText: '明天提交报告' }) });
    expect(response.status).toBe(201); expect(database.listTasks()).toHaveLength(0);
  });
  it('rejects an empty import', async () => {
    const response = await app.request('/api/imports', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ inputType: 'text', rawText: '' }) });
    expect(response.status).toBe(422);
  });
  it('reports disconnected OAuth state without exposing credentials', async () => {
    const body = await (await app.request('/api/ai/status')).json() as Record<string, unknown>;
    expect(body.connected).toBe(false); expect(JSON.stringify(body)).not.toMatch(/token|secret|access/i);
  });
  it('starts the provider-owned OAuth flow', async () => {
    const body = await (await app.request('/api/ai/login', { method: 'POST' })).json() as { authUrl: string };
    expect(body.authUrl).toBe('https://example.test/oauth');
  });
  it('extracts items into a review record', async () => {
    const record = database.createImport('text', '明天下午三点在教二 302 答疑');
    const response = await app.request(`/api/imports/${record.id}/extract`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ localDateTime: '2026-10-01T13:00:00+08:00', timezone: 'Asia/Shanghai' }) });
    expect(response.status).toBe(200); expect((await response.json() as { items: unknown[] }).items).toHaveLength(1);
  });
  it('requires time context for relative date extraction', async () => {
    const record = database.createImport('text', '明天交作业');
    const response = await app.request(`/api/imports/${record.id}/extract`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    expect(response.status).toBe(422);
  });
  it('maps AI provider failures to a safe error', async () => {
    ai.fail = true; const record = database.createImport('text', '通知');
    const response = await app.request(`/api/imports/${record.id}/extract`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ localDateTime: '2026-10-01T13:00:00+08:00', timezone: 'Asia/Shanghai' }) });
    expect(response.status).toBe(502); expect(JSON.stringify(await response.json())).not.toContain('provider down');
  });
});
