import { useNavigate } from 'react-router-dom';
import { personName } from '@/lib/personName';
import CalMascot from '@/components/CalMascot';
import { AvatarGroup, Attendee } from '@/components/AvatarGroup';
import type { DbEventWithCreator } from '@/hooks/useEvents';

function fmtTime(t?: string | null) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function dayTag(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'TODAY';
  if (diff === 1) return 'TOMORROW';
  if (diff < 7) return d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
}

export function HomeHero({
  event, userId, friendRank,
}: { event?: DbEventWithCreator; userId: string | null; friendRank: Record<string, number> }) {
  const navigate = useNavigate();

  const people: Attendee[] = event
    ? [
        ...(event.created_by !== userId
          ? [{
              id: event.created_by,
              name: personName(event.creator_profile, 'organiser'),
              avatarUrl: event.creator_profile?.avatar_url,
              status: (event as any).creator_rsvp || 'confirmed',
            }]
          : []),
        ...event.participants
          .filter(p => p.user_id !== userId)
          .map(p => ({ id: p.user_id, name: personName(p.profile, 'user'), avatarUrl: p.profile?.avatar_url, status: p.status })),
      ]
    : [];

  const tag = event ? [dayTag(event.date), fmtTime(event.time)].filter(Boolean).join(' · ') : '';

  return (
    <div className="relative mb-6 mt-4">
      <div className="relative overflow-visible rounded-3xl bg-primary p-5 pr-20 text-primary-foreground shadow-elevated">
        {event ? (
          <>
            <span className="inline-block rounded-full bg-mint-strong px-2.5 py-1 text-[11px] font-bold tracking-wide text-foreground">
              {tag}
            </span>
            <h2 className="mt-3 text-[26px] font-bold leading-tight">{event.title}</h2>
            {people.length > 0 && (
              <div className="mt-3">
                <AvatarGroup
                  size="lg"
                  people={people}
                  viewerIsOrganiser={event.created_by === userId}
                  friendRank={friendRank}
                  showSummary
                  summaryClassName="text-sm text-primary-foreground/85"
                  title={event.title}
                />
              </div>
            )}
            <button
              onClick={() => navigate(`/event/${event.id}`)}
              className="mt-4 rounded-full bg-background px-5 py-2.5 text-sm font-semibold text-foreground"
            >
              Open plan
            </button>
          </>
        ) : (
          <>
            <h2 className="text-[26px] font-bold leading-tight">Nothing planned yet</h2>
            <button
              onClick={() => navigate('/create')}
              className="mt-4 rounded-full bg-background px-5 py-2.5 text-sm font-semibold text-foreground"
            >
              Plan something
            </button>
          </>
        )}
      </div>
      <div className="pointer-events-none absolute -right-2 -top-7 rotate-[8deg]">
        <CalMascot mood={event ? 'excited' : 'sleepy'} size={86} />
      </div>
    </div>
  );
}
