import { describe, expect, it } from 'vitest';
import { getUrgency, urgencyLabel } from '../src/shared/urgency.js';

const now = new Date('2026-10-01T12:00:00+08:00');

describe('deadline urgency', () => {
  it('marks past deadlines overdue', () => expect(getUrgency('2026-10-01T11:00:00+08:00', now)).toBe('overdue'));
  it('marks 24-hour deadlines strongly', () => expect(getUrgency('2026-10-02T11:59:00+08:00', now)).toBe('within24h'));
  it('marks three-day deadlines warning', () => expect(getUrgency('2026-10-04T11:59:00+08:00', now)).toBe('within3d'));
  it('marks seven-day deadlines secondary', () => expect(getUrgency('2026-10-08T11:59:00+08:00', now)).toBe('within7d'));
  it('keeps distant deadlines normal', () => expect(getUrgency('2026-10-12T12:00:00+08:00', now)).toBe('normal'));
  it('keeps missing deadlines neutral', () => expect(getUrgency(null, now)).toBe('none'));
  it('does not treat invalid values as urgent', () => expect(getUrgency('not-a-date', now)).toBe('none'));
  it('labels urgency with text as well as color', () => expect(urgencyLabel('2026-10-01T18:00:00+08:00', now)).toContain('24 小时内'));
});
