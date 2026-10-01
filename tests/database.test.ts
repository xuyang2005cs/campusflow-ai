import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CampusDatabase } from '../src/server/database.js';
import type { ExtractedItem } from '../src/shared/types.js';

const temporaryDirectories: string[] = [];
const extracted: ExtractedItem = {
  id: 'item-1', kind: 'deadline', title: '提交实验报告', dueAt: '2026-10-02T22:00:00+08:00',
  startAt: null, location: null, notes: '附实验截图', originalTimeText: '明晚十点前',
  sourceExcerpt: '实验报告明晚十点前提交', confidence: 0.94, selected: true,
};

afterEach(() => {
  while (temporaryDirectories.length) rmSync(temporaryDirectories.pop()!, { recursive: true, force: true });
});

function fileDatabase() {
  const directory = mkdtempSync(join(tmpdir(), 'campusflow-'));
  temporaryDirectories.push(directory);
  return { path: join(directory, 'test.db'), db: new CampusDatabase(join(directory, 'test.db')) };
}

describe('SQLite task persistence', () => {
  it('creates and reads a task', () => {
    const db = new CampusDatabase(':memory:');
    const task = db.createTask({ kind: 'task', title: '  阅读第三章  ' });
    expect(db.getTask(task.id)?.title).toBe('阅读第三章'); db.close();
  });

  it('persists tasks after a database restart', () => {
    const first = fileDatabase();
    const task = first.db.createTask({ kind: 'event', title: '社团说明会' }); first.db.close();
    const reopened = new CampusDatabase(first.path);
    expect(reopened.getTask(task.id)?.title).toBe('社团说明会'); reopened.close();
  });

  it('completes a task without deleting it', () => {
    const db = new CampusDatabase(':memory:'); const task = db.createTask({ kind: 'task', title: '复习' });
    expect(db.setTaskStatus(task.id, 'completed')?.completedAt).not.toBeNull();
    expect(db.listTasks('completed')).toHaveLength(1); db.close();
  });

  it('restores a completed task', () => {
    const db = new CampusDatabase(':memory:'); const task = db.createTask({ kind: 'task', title: '复习' });
    db.setTaskStatus(task.id, 'completed');
    expect(db.setTaskStatus(task.id, 'pending')?.completedAt).toBeNull(); db.close();
  });

  it('stores editable OCR text with an image import', () => {
    const db = new CampusDatabase(':memory:');
    const record = db.createImport('image', '原始 OCR', '修正后的 OCR');
    expect(db.getImport(record.id)?.ocrText).toBe('修正后的 OCR'); db.close();
  });

  it('stores structured extraction for review', () => {
    const db = new CampusDatabase(':memory:'); const record = db.createImport('text', '通知');
    expect(db.setExtractedItems(record.id, [extracted])?.analysisStatus).toBe('ready'); db.close();
  });

  it('saves only selected review items', () => {
    const db = new CampusDatabase(':memory:'); const record = db.createImport('text', '通知');
    expect(db.confirmImport(record.id, [extracted, { ...extracted, id: 'item-2', title: '忽略项', selected: false }])).toHaveLength(1); db.close();
  });

  it('prevents duplicate confirmation saves', () => {
    const db = new CampusDatabase(':memory:'); const record = db.createImport('text', '通知');
    expect(db.confirmImport(record.id, [extracted])).toHaveLength(1);
    expect(db.confirmImport(record.id, [extracted])).toHaveLength(0); db.close();
  });

  it('calculates daily summary counts', () => {
    const db = new CampusDatabase(':memory:');
    const task = db.createTask({ kind: 'deadline', title: '作业', dueAt: '2026-10-01T18:00:00+08:00' });
    db.createTask({ kind: 'task', title: '其他日期', dueAt: '2026-10-03T18:00:00+08:00' });
    db.setTaskStatus(task.id, 'completed');
    expect(db.summary('2026-10-01')).toMatchObject({ total: 1, completed: 1, pending: 0 }); db.close();
  });
});
