import type { ExtractedItem, ImportRecord, Task, TaskStatus, TodaySummary } from '../shared/types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
  const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
  if (!response.ok) throw new Error(body?.error?.message ?? '请求失败，请稍后重试');
  return body as T;
}

export const api = {
  listTasks: (status?: TaskStatus) => request<{ items: Task[] }>(`/api/tasks${status ? `?status=${status}` : ''}`),
  summary: (date: string) => request<TodaySummary>(`/api/summary?date=${date}`),
  setTaskStatus: (id: string, status: TaskStatus) => request<Task>(`/api/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  createTask: (task: Pick<Task, 'kind' | 'title' | 'dueAt' | 'startAt' | 'location' | 'notes'>) => request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(task) }),
  createImport: (inputType: 'text' | 'image', rawText: string, ocrText?: string | null) => request<ImportRecord>('/api/imports', { method: 'POST', body: JSON.stringify({ inputType, rawText, ocrText }) }),
  getImport: (id: string) => request<ImportRecord>(`/api/imports/${id}`),
  demoExtract: (id: string) => request<ImportRecord>(`/api/imports/${id}/demo-extract`, { method: 'POST' }),
  extract: (id: string, localDateTime: string, timezone: string) => request<ImportRecord>(`/api/imports/${id}/extract`, { method: 'POST', body: JSON.stringify({ localDateTime, timezone }) }),
  confirmImport: (id: string, items: ExtractedItem[]) => request<{ items: Task[] }>(`/api/imports/${id}/confirm`, { method: 'POST', body: JSON.stringify({ items }) }),
  aiStatus: () => request<{ connected: boolean; authLabel: string; planLabel: string; model: string | null; loginState: 'idle' | 'waiting' | 'connected' | 'failed'; message: string | null }>('/api/ai/status'),
  beginAiLogin: () => request<{ authUrl: string | null; status: { connected: boolean; loginState: string; message: string | null } }>('/api/ai/login', { method: 'POST' }),
  disconnectAi: () => request<{ connected: false }>('/api/ai/connection', { method: 'DELETE' }),
};

