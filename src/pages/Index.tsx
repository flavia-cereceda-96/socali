import { useState, useMemo, useEffect } from 'react';
import { useEvents, DbEventWithCreator } from '@/hooks/useEvents';
import { useEventGroupHints } from '@/hooks/useGroups';
import { UserAvatar } from '@/components/UserAvatar';
import { motion } from 'framer-motion';
import { MapPin, Clock } from 'lucide-react';
import { HomeEmptyState } from '@/components/HomeEmptyState';
import { CoachMark } from '@/components/CoachMark';
import { AppHeader } from '@/components/AppHeader';
import { EmailNotificationsPrompt } from '@/components/EmailNotificationsPrompt';
import { AvatarPrompt } from '@/components/AvatarPrompt';
import { BucketListsRow } from '@/components/BucketListsRow';
import { InlineDatePoll } from '@/components/InlineDatePoll';
import { InlineWhatPoll } from '@/components/InlineWhatPoll';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const Index = () => {
  const navigate = useNavigate();
  const { data: events = [], isLoading } = useEvents();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  }, []);

  // Fetch user's usage preference for personalized empty state
  const { data: profile } = useQuery({
    queryKey: ['my-profile-usage', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from('profiles')
        .select('usage')
        .eq('user_id', userId)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning ☀️';
    if (h < 18) return 'Good afternoon 👋';
    return 'Good evening 🌙';
  })();

  const { todayEvents, weekEvents, monthEvents, tbdEvents, todayCount, weekCount, pendingCount } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const monthEnd = new Date(today);
    monthEnd.setDate(monthEnd.getDate() + 30);

    const future = events
      .filter(e => !!e.date && new Date(e.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const tbd = events.filter(e => (e as any).date_confirmed === false || !e.date);

    const notDeclined = future.filter(e => {
      const myP = e.participants.find(p => p.user_id === userId);
      return !myP || myP.status !== 'declined';
    });

    const today_ = notDeclined.filter(e => e.date === todayKey);
    const week_ = notDeclined.filter(e => e.date !== todayKey && new Date(e.date) <= weekEnd);
    const month_ = notDeclined.filter(e => {
      const d = new Date(e.date);
      return d > weekEnd && d <= monthEnd;
    });
    const pending = [...future, ...tbd].filter(e => {
      const myP = e.participants.find(p => p.user_id === userId);
      return myP?.status === 'pending' || myP?.status === 'suggested';
    });

    return {
      todayEvents: today_,
      weekEvents: week_,
      monthEvents: month_,
      tbdEvents: tbd,
      todayCount: today_.length,
      weekCount: notDeclined.filter(e => new Date(e.date) <= weekEnd).length,
      pendingCount: pending.length,
    };
  }, [events, userId]);

  const allListedEvents = useMemo(() => [...todayEvents, ...weekEvents, ...monthEvents], [todayEvents, weekEvents, monthEvents]);
  const upcomingEventIds = allListedEvents.map(e => e.id);
  const participantsByEvent = useMemo(() => {
    const m: Record<string, string[]> = {};
    allListedEvents.forEach(e => {
      m[e.id] = [e.created_by, ...e.participants.map(p => p.user_id)];
    });
    return m;
  }, [allListedEvents]);
  const { data: groupHints = {} } = useEventGroupHints(upcomingEventIds, participantsByEvent);

  const formatTime = (t: string) => {
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  const getTimeDisplay = (event: any) => {
    if (!event.time) return null;
    if (event.end_time) return `${formatTime(event.time)} – ${formatTime(event.end_time)}`;
    return formatTime(event.time);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const hasNoEvents = events.length === 0;

  const renderEventCard = (event: DbEventWithCreator, i: number) => {
    const timeDisplay = getTimeDisplay(event);
    const myP = event.participants.find(p => p.user_id === userId);
    const replyNeeded = myP?.status === 'pending' || myP?.status === 'suggested';
    const isTbd = !event.date || (event as any).date_confirmed === false;

    // Confirmed count: include creator's own RSVP
    const creatorRsvp = (event as any).creator_rsvp || 'confirmed';
    const total = event.participants.length + 1;
    const confirmed =
      event.participants.filter(p => p.status === 'confirmed').length +
      (creatorRsvp === 'confirmed' ? 1 : 0);
    const allConfirmed = confirmed === total;

    const participantProfiles: Record<string, { username?: string; avatar_url?: string | null }> = {};
    if (event.creator_profile) {
      participantProfiles[event.created_by] = {
        username: event.creator_profile.username,
        avatar_url: event.creator_profile.avatar_url,
      };
    }
    event.participants.forEach(p => {
      participantProfiles[p.user_id] = {
        username: p.profile?.username,
        avatar_url: p.profile?.avatar_url,
      };
    });

    return (
      <motion.div
        key={event.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 + i * 0.04 }}
        onClick={() => navigate(`/event/${event.id}`)}
        className="flex gap-3 rounded-2xl bg-card p-4 shadow-card cursor-pointer transition-shadow hover:shadow-elevated active:scale-[0.99]"
      >
        {isTbd ? (
          <div className="flex flex-col items-center justify-center rounded-xl px-3 py-2 min-w-[52px] bg-muted text-muted-foreground">
            <span className="text-[10px] font-semibold uppercase tracking-wide">Date</span>
            <span className="text-sm font-bold">TBD</span>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center rounded-xl px-3 py-2 min-w-[52px]"
            style={{ backgroundColor: '#CFFCE3', color: '#1A9E55' }}
          >
            <span className="text-xs font-semibold uppercase">
              {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
            </span>
            <span className="text-lg font-bold">
              {new Date(event.date + 'T00:00:00').getDate()}
            </span>
          </div>
        )}
        <div className="flex flex-1 flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{event.emoji}</span>
            <span className="font-semibold text-foreground truncate">{event.title}</span>
          </div>
          {isTbd && (
            <InlineDatePoll
              eventId={event.id}
              userId={userId}
              pollDeadline={(event as any).poll_deadline}
              participantProfiles={participantProfiles}
              totalEligible={total}
            />
          )}
          {!(event as any).confirmed_what_option_id && (
            <>
              {isTbd && <div className="my-2 border-t border-border/50" />}
              <InlineWhatPoll
                eventId={event.id}
                userId={userId}
                participantProfiles={participantProfiles}
                totalEligible={total}
              />
            </>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {timeDisplay && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeDisplay}</span>}
            {event.location && <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" />{event.location}</span>}
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            {(() => {
              const hint = groupHints[event.id];
              if (hint) {
                return (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/60 border border-primary/20 pl-1 pr-2 py-0.5 text-[11px] font-semibold text-foreground">
                    {hint.avatar_url ? (
                      <img src={hint.avatar_url} alt={hint.name} className="h-4 w-4 rounded-full object-cover" />
                    ) : (
                      <span className="text-sm leading-none">{hint.emoji}</span>
                    )}
                    {hint.name}
                  </span>
                );
              }
              if (event.participants.length === 0) return <span />;
              return (
                <div className="flex items-center gap-1">
                  {event.participants.slice(0, 5).map(p => (
                    <button
                      key={p.id}
                      onClick={(e) => { e.stopPropagation(); navigate(`/person/${p.user_id}`); }}
                      className="-ml-1 first:ml-0"
                      aria-label={`View @${p.profile?.username || 'user'}`}
                    >
                      <UserAvatar
                        avatarUrl={p.profile?.avatar_url}
                        username={p.profile?.username}
                        size="sm"
                        className="h-6 w-6 text-[10px] ring-2 ring-card"
                      />
                    </button>
                  ))}
                  {event.participants.length > 5 && (
                    <span className="ml-1 text-[10px] text-muted-foreground">+{event.participants.length - 5}</span>
                  )}
                </div>
              );
            })()}
            <div className="flex items-center gap-1.5">
              {replyNeeded && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: '#FFF1B8', color: '#996500' }}
                >
                  Reply needed
                </span>
              )}
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap"
                style={
                  allConfirmed
                    ? { backgroundColor: '#CFFCE3', color: '#1A9E55' }
                    : { backgroundColor: '#FFF1B8', color: '#996500' }
                }
              >
                {confirmed}/{total} confirmed
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const sectionHeaderCls = "mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground";

  const renderFriendsRow = (list: DbEventWithCreator[]) => {
    const seen = new Map<string, { user_id: string; username?: string; avatar_url?: string | null }>();
    list.forEach(e => {
      if (e.created_by && e.created_by !== userId && !seen.has(e.created_by)) {
        seen.set(e.created_by, {
          user_id: e.created_by,
          username: e.creator_profile?.username,
          avatar_url: e.creator_profile?.avatar_url,
        });
      }
      e.participants.forEach(p => {
        if (p.user_id !== userId && !seen.has(p.user_id)) {
          seen.set(p.user_id, {
            user_id: p.user_id,
            username: p.profile?.username,
            avatar_url: p.profile?.avatar_url,
          });
        }
      });
    });
    const people = Array.from(seen.values());
    if (people.length === 0) return null;
    return (
      <div className="mb-4 -mx-4 px-4 overflow-x-auto scrollbar-hide">
        <p className="mb-2 text-xs text-muted-foreground">Friends you're seeing</p>
        <div className="flex gap-3 pb-1">
          {people.map(p => {
            const name = p.username || '';
            const first = name.charAt(0).toUpperCase() + name.slice(1);
            return (
              <button
                key={p.user_id}
                onClick={() => navigate(`/person/${p.user_id}`)}
                className="flex flex-col items-center gap-1 w-12 flex-shrink-0"
              >
                <UserAvatar
                  avatarUrl={p.avatar_url}
                  username={p.username}
                  size="md"
                  className="h-11 w-11 text-sm"
                />
                <span className="text-[10px] text-muted-foreground truncate max-w-full text-center">
                  {first}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-24">
      <AppHeader title="C A L I" />
      <EmailNotificationsPrompt userId={userId} />
      <CoachMark
        id="home-fab"
        text="Tap here to create your first plan"
        anchorSelector='[data-coach="home-fab"]'
        placement="top"
      />
      <div className="mx-auto max-w-md px-4 pt-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className="text-sm font-medium text-muted-foreground">{greeting}</p>
          <h1 className="text-2xl font-bold text-foreground">Your Week</h1>
        </motion.div>

        <AvatarPrompt userId={userId} />

        {hasNoEvents ? (
          <HomeEmptyState usage={profile?.usage} />
        ) : (
          <>
            {/* Scorecards */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mb-6 grid grid-cols-3 gap-3"
            >
              <div className="rounded-2xl p-4 shadow-card" style={{ backgroundColor: '#6B45F5', color: '#ffffff' }}>
                <p className="text-xs font-medium opacity-90">Today</p>
                <p className="text-2xl font-bold mt-1">{todayCount}</p>
                <p className="text-[11px] opacity-80">plan{todayCount !== 1 ? 's' : ''}</p>
              </div>
              <div className="rounded-2xl p-4 shadow-card" style={{ backgroundColor: '#CFFCE3', color: '#1A9E55' }}>
                <p className="text-xs font-medium">Next 7 days</p>
                <p className="text-2xl font-bold mt-1">{weekCount}</p>
                <p className="text-[11px] opacity-80">plans</p>
              </div>
              <div className="rounded-2xl p-4 shadow-card" style={{ backgroundColor: '#FFD6E5', color: '#B83268' }}>
                <p className="text-xs font-medium">Pending</p>
                <p className="text-2xl font-bold mt-1">{pendingCount}</p>
                <p className="text-[11px] opacity-80">reply needed</p>
              </div>
            </motion.div>

            {/* Feedback Board entry point */}
            <motion.button
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.07 }}
              onClick={() => navigate('/feedback')}
              className="w-full mb-6 rounded-2xl bg-muted/60 hover:bg-muted transition-colors p-3 flex items-center gap-3 text-left"
            >
              <span className="text-xl">💡</span>
              <span className="text-sm text-foreground/80 flex-1">
                Got feedback or feature ideas? <span className="font-medium text-foreground">Let us know</span>
              </span>
              <span className="text-muted-foreground text-sm">›</span>
            </motion.button>

            {tbdEvents.length > 0 && (
              <>
                <motion.h2
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.08 }}
                  className={sectionHeaderCls}
                >
                  Date TBD — Vote
                </motion.h2>
                <div className="flex flex-col gap-3 mb-8">
                  {tbdEvents.map((e, i) => renderEventCard(e, i))}
                </div>
              </>
            )}

            {/* Today */}
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className={sectionHeaderCls}
            >
              Today
            </motion.h2>
            {renderFriendsRow(todayEvents)}
            <div className="flex flex-col gap-3 mb-8">
              {todayEvents.length > 0 ? (
                todayEvents.map((e, i) => renderEventCard(e, i))
              ) : (
                <p className="text-sm text-muted-foreground">Nothing on today — enjoy the free time! 🌿</p>
              )}
            </div>

            {/* Next 7 days */}
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className={sectionHeaderCls}
            >
              Next 7 days
            </motion.h2>
            {renderFriendsRow(weekEvents)}
            <div className="flex flex-col gap-3 mb-8">
              {weekEvents.length > 0 ? (
                weekEvents.map((e, i) => renderEventCard(e, i))
              ) : (
                <p className="text-sm text-muted-foreground">Nothing planned this week yet ✨</p>
              )}
            </div>

            {/* Next 30 days */}
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={sectionHeaderCls}
            >
              Next 30 days
            </motion.h2>
            {renderFriendsRow(monthEvents)}
            <div className="flex flex-col gap-3 mb-8">
              {monthEvents.length > 0 ? (
                monthEvents.map((e, i) => renderEventCard(e, i))
              ) : (
                <p className="text-sm text-muted-foreground">Nothing planned yet — a good time to make plans!</p>
              )}
            </div>

            <BucketListsRow />
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
