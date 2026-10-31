import { describe, expect, it } from 'vitest';
import { buildFortnight, calendarDateKey, eventWeekSpan } from './calendarDisplay';

describe('two-week calendar', () => {
  it('shows exactly 14 days starting Monday by default', () => {
    const days = buildFortnight(new Date(2026, 9, 31), 1);
    expect(days).toHaveLength(14);
    expect(calendarDateKey(days[0])).toBe('2026-10-26');
    expect(calendarDateKey(days[13])).toBe('2026-11-08');
  });
  it('respects a Sunday week start', () => {
    expect(calendarDateKey(buildFortnight(new Date(2026, 9, 31), 0)[0])).toBe('2026-10-25');
  });
  it('keeps local dates when creating a plan from a day', () => {
    expect(calendarDateKey(new Date(2026, 4, 3, 0, 0))).toBe('2026-05-03');
  });
  it('clips multi-day bars at week boundaries', () => {
    const days = buildFortnight(new Date(2026, 9, 31), 1);
    expect(eventWeekSpan('2026-10-30', '2026-11-03', days.slice(0, 7))).toEqual({ column: 5, length: 3 });
    expect(eventWeekSpan('2026-10-30', '2026-11-03', days.slice(7))).toEqual({ column: 1, length: 2 });
    expect(eventWeekSpan('2026-12-01', '2026-12-03', days.slice(7))).toBeNull();
  });
});