import { addDays, format, startOfWeek } from 'date-fns';

export function calendarDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function buildFortnight(anchor: Date, weekStartsOn: 0 | 1): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn });
  return Array.from({ length: 14 }, (_, index) => addDays(start, index));
}

export function eventWeekSpan(start: string, end: string, days: Date[]) {
  const occupied = days.map((day, index) => ({ key: calendarDateKey(day), index }))
    .filter(day => day.key >= start && day.key <= end);
  if (!occupied.length) return null;
  return { column: occupied[0].index + 1, length: occupied.length };
}