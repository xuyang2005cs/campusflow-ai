import { describe, expect, it } from 'vitest';
import { extractionPrompt } from '../src/server/ai/prompts/extract-campus-items.js';
import { validateExtractionResult } from '../src/server/ai/extraction-schema.js';

const valid = { items: [{ kind: 'deadline', title: '提交报告', dueAt: '2026-10-02T22:00:00+08:00', startAt: null, location: null, notes: null, originalTimeText: '明晚十点', sourceExcerpt: '明晚十点前提交', confidence: 0.9 }] };

describe('structured extraction contract', () => {
  it('accepts a valid structured result', () => expect(validateExtractionResult(valid).items[0].kind).toBe('deadline'));
  it('rejects unsupported item kinds', () => expect(() => validateExtractionResult({ items: [{ ...valid.items[0], kind: 'chat' }] })).toThrow());
  it('rejects confidence outside zero to one', () => expect(() => validateExtractionResult({ items: [{ ...valid.items[0], confidence: 2 }] })).toThrow());
  it('rejects additional unvalidated properties', () => expect(() => validateExtractionResult({ items: [{ ...valid.items[0], invented: true }] })).toThrow());
  it('includes local time and timezone in the prompt', () => {
    const prompt = extractionPrompt('明天下午三点答疑', '2026-10-01T13:00:00+08:00', 'Asia/Shanghai');
    expect(prompt).toContain('2026-10-01T13:00:00+08:00'); expect(prompt).toContain('Asia/Shanghai');
  });
  it('instructs the model not to guess unknown dates', () => expect(extractionPrompt('通知', 'now', 'zone')).toContain('不要猜'));
});
