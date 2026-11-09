import { describe, it, expect } from 'vitest';
import { orderAttendees, goingSummary, avatarColorVar } from './avatarRules';

const p = (id: string, status: string) => ({ id, name: id, status });

describe('avatar rules', () => {
  it('never shows declined', () => {
    expect(orderAttendees([p('a', 'declined'), p('b', 'confirmed')], { viewerIsOrganiser: true }).map((x) => x.id)).toEqual(['b']);
  });
  it('shows invited only to the organiser', () => {
    const list = [p('a', 'pending'), p('b', 'confirmed')];
    expect(orderAttendees(list, { viewerIsOrganiser: false }).map((x) => x.id)).toEqual(['b']);
    expect(orderAttendees(list, { viewerIsOrganiser: true }).map((x) => x.id)).toEqual(['b', 'a']);
  });
  it('orders confirmed first, then top friends', () => {
    const list = [p('x', 'pending'), p('y', 'confirmed'), p('z', 'confirmed')];
    expect(orderAttendees(list, { viewerIsOrganiser: true, friendRank: { z: 5 } }).map((x) => x.id)).toEqual(['z', 'y', 'x']);
  });
  it('summarises with first two names above 8 going', () => {
    const many = Array.from({ length: 9 }, (_, i) => p(`n${i}`, 'confirmed'));
    expect(goingSummary(many)).toBe('n0, n1 +7 going');
  });
  it('colour is deterministic', () => {
    expect(avatarColorVar('abc')).toBe(avatarColorVar('abc'));
  });
});
