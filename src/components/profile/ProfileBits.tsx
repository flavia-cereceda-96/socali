import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { DbEventWithCreator } from '@/hooks/useEvents';
import { UserAvatar } from '@/components/UserAvatar';
import { AvatarGroup, Attendee } from '@/components/AvatarGroup';
import { personName } from '@/lib/personName';

export const STICKERS = ['--accent', '--lilac', '--secondary', '--peach'];

export function fmtTime(t?: string | null) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** True when the user is in the plan as organiser (going) or a confirmed guest. */
export function attended(e: DbEventWithCreator, uid: string) {
  if (e.created_by === uid) return ((e as any).creator_rsvp || 'confirmed') === 'confirmed';
  return e.participants.some(p => p.user_id === uid && p.status === 'confirmed');
}

export function eventPeople(e: DbEventWithCreator, excludeId?: string | null): Attendee[] {
  return [
    { id: e.created_by, name: personName(e.creator_profile, 'organiser'), avatarUrl: e.creator_profile?.avatar_url, status: (e as any).creator_rsvp || 'confirmed' },
    ...e.participants.map(p => ({ id: p.user_id, name: personName(p.profile, 'user'), avatarUrl: p.profile?.avatar_url, status: p.status })),
  ].filter(p => p.id !== excludeId);
}

export function IdentityBlock({ avatarUrl, userId, name, username, subtitle, bio, onAvatarClick }: {
  avatarUrl?: string | null; userId?: string; name: string; username: string; subtitle?: string; bio?: string | null; onAvatarClick?: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <button type="button" onClick={onAvatarClick} className="rounded-full" aria-label="View profile picture">
        <UserAvatar
          avatarUrl={avatarUrl}
          username={name}
          userId={userId}
          className="h-24 w-24 text-3xl ring-4 ring-accent ring-offset-4 ring-offset-background"
        />
      </button>
      <h1 className="mt-5 text-[28px] font-bold leading-tight text-foreground">{name}</h1>
      <p className="mt-0.5 text-sm text-muted-foreground">@{username}{subtitle ? ` · ${subtitle}` : ''}</p>
      {bio && <p className="mt-3 max-w-xs text-sm italic leading-relaxed text-foreground/80">“{bio}”</p>}
    </div>
  );
}

export function StatTile({ value, label, bg, fg }: { value: number | string; label: string; bg: string; fg: string }) {
  return (
    <div className="rounded-[20px] p-3 text-center" style={{ backgroundColor: `hsl(var(${bg}))`, color: `hsl(var(${fg}))` }}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium opacity-90">{label}</p>
    </div>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {action}
    </div>
  );
}

export function DaySticker({ date, i }: { date: string; i: number }) {
  const d = new Date(date + 'T00:00:00');
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase text-foreground" style={{ backgroundColor: `hsl(var(${STICKERS[i % STICKERS.length]}))` }}>
      {d.toLocaleDateString('en-US', { weekday: 'short' })} {d.getDate()}
      {d.getFullYear() !== new Date().getFullYear() && ` '${String(d.getFullYear()).slice(2)}`}
    </span>
  );
}

export function MemoryGrid({ events, viewerId }: { events: DbEventWithCreator[]; viewerId: string | null }) {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-2 gap-3">
      {events.map((e, i) => (
        <button key={e.id} onClick={() => navigate(`/event/${e.id}`)} className="flex min-h-[120px] flex-col items-start gap-2 rounded-[20px] border border-border bg-card p-3 text-left shadow-card">
          <DaySticker date={e.date} i={i} />
          <p className="line-clamp-2 text-sm font-bold text-foreground">{e.emoji} {e.title}</p>
          <div className="mt-auto" onClick={ev => ev.stopPropagation()}>
            <AvatarGroup people={eventPeople(e, viewerId)} size="sm" />
          </div>
        </button>
      ))}
    </div>
  );
}

export function UpcomingList({ events }: { events: DbEventWithCreator[] }) {
  const navigate = useNavigate();
  return (
    <ul className="divide-y divide-border rounded-3xl border border-border bg-card px-4 shadow-card">
      {events.map((e, i) => (
        <li key={e.id}>
          <button onClick={() => navigate(`/event/${e.id}`)} className="flex w-full items-center gap-3 py-3 text-left">
            <DaySticker date={e.date} i={i} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-foreground">{e.title}</p>
              {e.time && <p className="text-[13px] text-muted-foreground">{fmtTime(e.time)}</p>}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
