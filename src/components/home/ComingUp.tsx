import { useNavigate } from 'react-router-dom';
import { personName } from '@/lib/personName';
import type { DbEventWithCreator } from '@/hooks/useEvents';
import { AvatarGroup, Attendee } from '@/components/AvatarGroup';
import { orderAttendees } from '@/lib/avatarRules';

const STICKERS = ['--accent', '--lilac', '--secondary', '--peach'];

type GroupHint = { id: string; name: string; emoji: string; avatar_url?: string | null } | null;

function fmtTime(t?: string | null) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

export function ComingUp({
  events, userId, friendRank, groupHints,
}: {
  events: DbEventWithCreator[];
  userId: string | null;
  friendRank: Record<string, number>;
  groupHints: Record<string, GroupHint>;
}) {
  const navigate = useNavigate();
  if (events.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Coming up</h2>
      <ul className="divide-y divide-border rounded-3xl border border-border bg-card px-4 shadow-card">
        {events.map((e, i) => {
          const d = new Date(e.date + 'T00:00:00');
          const hosting = e.created_by === userId;
          const group = groupHints[e.id];
          const people: Attendee[] = [
            ...(!hosting ? [{ id: e.created_by, name: personName(e.creator_profile, 'organiser'), avatarUrl: e.creator_profile?.avatar_url, status: (e as any).creator_rsvp || 'confirmed' }] : []),
            ...e.participants.filter(p => p.user_id !== userId).map(p => ({ id: p.user_id, name: personName(p.profile, 'user'), avatarUrl: p.profile?.avatar_url, status: p.status })),
          ];
          let summary: string | undefined;
          if (group) {
            const vis = orderAttendees(people, { viewerIsOrganiser: hosting, friendRank });
            const names = vis.slice(0, 2).map(p => p.name).join(', ');
            summary = vis.length > 2 ? `${names} +${vis.length - 2}` : names;
          }
          const details = [fmtTime(e.time), e.location].filter(Boolean).join(' · ') + (hosting ? " · you're hosting" : '');
          return (
            <li key={e.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/event/${e.id}`)}
                onKeyDown={(k) => k.key === 'Enter' && navigate(`/event/${e.id}`)}
                className="flex cursor-pointer items-center gap-3 py-3"
              >
                <span
                  className="flex w-[54px] shrink-0 flex-col items-center rounded-full py-2 text-foreground"
                  style={{ backgroundColor: `hsl(var(${STICKERS[i % STICKERS.length]}))` }}
                >
                  <span className="text-[10px] font-bold uppercase">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <span className="text-base font-bold leading-none">{d.getDate()}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold text-foreground">{e.title}</p>
                  <p className="flex items-center gap-1 truncate text-[13px] text-muted-foreground">
                    {group && (
                      <>
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[9px]">
                          {group.avatar_url ? <img src={group.avatar_url} alt="" className="h-full w-full object-cover" /> : group.emoji}
                        </span>
                        <span className="font-medium text-foreground">{group.name}</span>
                        {details && <span>·</span>}
                      </>
                    )}
                    <span className="truncate">{details}</span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <AvatarGroup size="sm" people={people} viewerIsOrganiser={hosting} friendRank={friendRank} title={e.title} />
                  {summary && <span className="max-w-[110px] truncate text-[11px] text-muted-foreground">{summary}</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
