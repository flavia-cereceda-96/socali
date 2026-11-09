export type AttendeeStatus = 'confirmed' | 'maybe' | 'pending' | 'declined' | string;

export interface Attendee {
  id: string;
  name: string;
  avatarUrl?: string | null;
  status: AttendeeStatus;
}

export const AVATAR_FALLBACK_COLORS = ['--lilac', '--secondary', '--peach', '--accent'] as const;

/** Deterministic fallback colour token for a user id. */
export function avatarColorVar(id: string): (typeof AVATAR_FALLBACK_COLORS)[number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_FALLBACK_COLORS[Math.abs(h) % AVATAR_FALLBACK_COLORS.length];
}

/** Faces to show: no declined; invited only for organiser; confirmed → top friends → others. */
export function orderAttendees(
  people: Attendee[],
  opts: { viewerIsOrganiser: boolean; friendRank?: Record<string, number> },
): Attendee[] {
  const rank = opts.friendRank ?? {};
  const statusOrder = (s: string) => (s === 'confirmed' ? 0 : s === 'maybe' ? 1 : 2);
  return people
    .filter((p) => p.status !== 'declined')
    .filter((p) => opts.viewerIsOrganiser || p.status === 'confirmed' || p.status === 'maybe')
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      const s = statusOrder(a.p.status) - statusOrder(b.p.status);
      if (s) return s;
      const r = (rank[b.p.id] ?? 0) - (rank[a.p.id] ?? 0);
      if (r) return r;
      return a.i - b.i;
    })
    .map((x) => x.p);
}

/** "Mica, Sofia +3 going". Up to 3 names when ≤8 going, 2 names above 8. */
export function goingSummary(people: Attendee[], friendRank?: Record<string, number>): string {
  const going = orderAttendees(people, { viewerIsOrganiser: false, friendRank }).filter(
    (p) => p.status === 'confirmed',
  );
  if (going.length === 0) return '';
  const nameCount = going.length > 8 ? 2 : Math.min(3, going.length);
  const names = going.slice(0, nameCount).map((p) => p.name).join(', ');
  const rest = going.length - nameCount;
  return rest > 0 ? `${names} +${rest} going` : `${names} going`;
}
