export type ItemKind = 'task' | 'deadline' | 'meeting' | 'event';
export type TaskStatus = 'pending' | 'completed';
export type ImportType = 'text' | 'image';
export type AnalysisStatus = 'draft' | 'extracting' | 'ready' | 'failed' | 'saved';

export interface Task {
  id: string;
  kind: ItemKind;
  title: string;
  dueAt: string | null;
  startAt: string | null;
  location: string | null;
  notes: string | null;
  status: TaskStatus;
  sourceId: string | null;
  sourceExcerpt: string | null;
  confidence: number | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ExtractedItem {
  id: string;
  kind: ItemKind;
  title: string;
  dueAt: string | null;
  startAt: string | null;
  location: string | null;
  notes: string | null;
  originalTimeText: string | null;
  sourceExcerpt: string;
  confidence: number;
  selected: boolean;
}

export interface ImportRecord {
  id: string;
  inputType: ImportType;
  rawText: string;
  ocrText: string | null;
  createdAt: string;
  analysisStatus: AnalysisStatus;
  items: ExtractedItem[];
}

export interface TodaySummary {
  date: string;
  pending: number;
  completed: number;
  dueSoon: number;
  total: number;
}

