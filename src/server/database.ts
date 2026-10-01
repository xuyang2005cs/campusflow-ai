import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import type { ExtractedItem, ImportRecord, ImportType, ItemKind, Task, TaskStatus, TodaySummary } from '../shared/types.js';

type TaskRow = {
  id: string; kind: ItemKind; title: string; due_at: string | null; start_at: string | null;
  location: string | null; notes: string | null; status: TaskStatus; source_id: string | null;
  source_excerpt: string | null; confidence: number | null; created_at: string; updated_at: string;
  completed_at: string | null;
};

type ImportRow = {
  id: string; input_type: ImportType; raw_text: string; ocr_text: string | null;
  created_at: string; analysis_status: ImportRecord['analysisStatus']; extracted_json: string;
};

export type NewTask = Pick<Task, 'kind' | 'title'> & Partial<Pick<Task, 'dueAt' | 'startAt' | 'location' | 'notes' | 'sourceId' | 'sourceExcerpt' | 'confidence'>>;

function mapTask(row: TaskRow): Task {
  return {
    id: row.id, kind: row.kind, title: row.title, dueAt: row.due_at, startAt: row.start_at,
    location: row.location, notes: row.notes, status: row.status, sourceId: row.source_id,
    sourceExcerpt: row.source_excerpt, confidence: row.confidence, createdAt: row.created_at,
    updatedAt: row.updated_at, completedAt: row.completed_at,
  };
}

function mapImport(row: ImportRow): ImportRecord {
  return {
    id: row.id, inputType: row.input_type, rawText: row.raw_text, ocrText: row.ocr_text,
    createdAt: row.created_at, analysisStatus: row.analysis_status,
    items: JSON.parse(row.extracted_json || '[]') as ExtractedItem[],
  };
}

export class CampusDatabase {
  private readonly db: Database.Database;

  constructor(path = process.env.CAMPUSFLOW_DB_PATH ?? 'data/campusflow.db') {
    const absolute = path === ':memory:' ? path : resolve(path);
    if (absolute !== ':memory:') mkdirSync(dirname(absolute), { recursive: true });
    this.db = new Database(absolute);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS imports (
        id TEXT PRIMARY KEY,
        input_type TEXT NOT NULL CHECK (input_type IN ('text', 'image')),
        raw_text TEXT NOT NULL,
        ocr_text TEXT,
        created_at TEXT NOT NULL,
        analysis_status TEXT NOT NULL CHECK (analysis_status IN ('draft', 'extracting', 'ready', 'failed', 'saved')),
        extracted_json TEXT NOT NULL DEFAULT '[]'
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL CHECK (kind IN ('task', 'deadline', 'meeting', 'event')),
        title TEXT NOT NULL CHECK (length(trim(title)) > 0),
        due_at TEXT,
        start_at TEXT,
        location TEXT,
        notes TEXT,
        status TEXT NOT NULL CHECK (status IN ('pending', 'completed')),
        source_id TEXT REFERENCES imports(id) ON DELETE SET NULL,
        source_excerpt TEXT,
        confidence REAL CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
        fingerprint TEXT UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_status_due ON tasks(status, due_at);
      CREATE INDEX IF NOT EXISTS idx_tasks_start ON tasks(start_at);
    `);
  }

  listTasks(status?: TaskStatus): Task[] {
    const rows = status
      ? this.db.prepare('SELECT * FROM tasks WHERE status = ? ORDER BY COALESCE(due_at, start_at, updated_at) ASC').all(status)
      : this.db.prepare('SELECT * FROM tasks ORDER BY status DESC, COALESCE(due_at, start_at, updated_at) ASC').all();
    return (rows as TaskRow[]).map(mapTask);
  }

  getTask(id: string): Task | null {
    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;
    return row ? mapTask(row) : null;
  }

  createTask(input: NewTask): Task {
    const now = new Date().toISOString();
    const id = randomUUID();
    const fingerprint = [input.sourceId ?? 'manual', input.kind, input.title.trim().toLowerCase(), input.dueAt ?? '', input.startAt ?? ''].join('|');
    this.db.prepare(`
      INSERT INTO tasks (id, kind, title, due_at, start_at, location, notes, status, source_id, source_excerpt, confidence, fingerprint, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
    `).run(id, input.kind, input.title.trim(), input.dueAt ?? null, input.startAt ?? null, input.location ?? null,
      input.notes ?? null, input.sourceId ?? null, input.sourceExcerpt ?? null, input.confidence ?? null, fingerprint, now, now);
    return this.getTask(id)!;
  }

  setTaskStatus(id: string, status: TaskStatus): Task | null {
    const now = new Date().toISOString();
    const completedAt = status === 'completed' ? now : null;
    const result = this.db.prepare('UPDATE tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?').run(status, completedAt, now, id);
    return result.changes ? this.getTask(id) : null;
  }

  createImport(inputType: ImportType, rawText: string, ocrText: string | null = null): ImportRecord {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    this.db.prepare('INSERT INTO imports (id, input_type, raw_text, ocr_text, created_at, analysis_status, extracted_json) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, inputType, rawText, ocrText, createdAt, 'draft', '[]');
    return this.getImport(id)!;
  }

  getImport(id: string): ImportRecord | null {
    const row = this.db.prepare('SELECT * FROM imports WHERE id = ?').get(id) as ImportRow | undefined;
    return row ? mapImport(row) : null;
  }

  setExtractedItems(id: string, items: ExtractedItem[], status: ImportRecord['analysisStatus'] = 'ready'): ImportRecord | null {
    const result = this.db.prepare('UPDATE imports SET extracted_json = ?, analysis_status = ? WHERE id = ?').run(JSON.stringify(items), status, id);
    return result.changes ? this.getImport(id) : null;
  }

  confirmImport(id: string, items: ExtractedItem[]): Task[] {
    const selected = items.filter((item) => item.selected);
    const created: Task[] = [];
    const transaction = this.db.transaction(() => {
      for (const item of selected) {
        try {
          created.push(this.createTask({
            kind: item.kind, title: item.title, dueAt: item.dueAt, startAt: item.startAt,
            location: item.location, notes: item.notes, sourceId: id, sourceExcerpt: item.sourceExcerpt,
            confidence: item.confidence,
          }));
        } catch (error) {
          if (!(error instanceof Error) || !error.message.includes('UNIQUE constraint failed')) throw error;
        }
      }
      this.db.prepare("UPDATE imports SET analysis_status = 'saved', extracted_json = ? WHERE id = ?").run(JSON.stringify(items), id);
    });
    transaction();
    return created;
  }

  summary(date: string): TodaySummary {
    const tasks = this.listTasks();
    const dayStart = new Date(`${date}T00:00:00+08:00`);
    const dayEnd = new Date(`${date}T23:59:59+08:00`);
    const onDay = tasks.filter((task) => {
      const value = task.dueAt ?? task.startAt;
      if (!value) return false;
      const time = new Date(value).getTime();
      return time >= dayStart.getTime() && time <= dayEnd.getTime();
    });
    const dueSoonBoundary = dayStart.getTime() + 72 * 3_600_000;
    return {
      date,
      pending: onDay.filter((task) => task.status === 'pending').length,
      completed: onDay.filter((task) => task.status === 'completed').length,
      dueSoon: tasks.filter((task) => task.status === 'pending' && task.dueAt && new Date(task.dueAt).getTime() <= dueSoonBoundary).length,
      total: onDay.length,
    };
  }

  seedDemo(now = new Date()): void {
    const count = this.db.prepare('SELECT COUNT(*) AS count FROM tasks').get() as { count: number };
    if (count.count > 0) return;
    const isoAt = (hours: number) => new Date(now.getTime() + hours * 3_600_000).toISOString();
    const samples: NewTask[] = [
      { kind: 'deadline', title: '提交数据结构实验报告', dueAt: isoAt(9), notes: '完成复杂度分析与实验截图', sourceExcerpt: '实验报告今晚 22:00 前提交' },
      { kind: 'meeting', title: '算法课程答疑', startAt: isoAt(3), location: '教二 302', sourceExcerpt: '今天下午三点在教二 302 答疑' },
      { kind: 'task', title: '阅读操作系统第 4 章', dueAt: isoAt(30), notes: '整理进程调度要点', sourceExcerpt: '下次课前阅读第四章' },
      { kind: 'event', title: '实验室开放日', startAt: isoAt(52), location: '创新楼 A204', sourceExcerpt: '周六下午实验室开放日' },
      { kind: 'deadline', title: '社团活动报名', dueAt: isoAt(118), sourceExcerpt: '报名本周截止' },
    ];
    for (const sample of samples) this.createTask(sample);
  }

  close(): void {
    this.db.close();
  }
}

