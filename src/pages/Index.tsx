import { useState, useMemo, useEffect } from 'react';
import { useEvents, DbEvent, DbEventWithCreator } from '@/hooks/useEvents';
import { useEventGroupHints } from '@/hooks/useGroups';
import { UserAvatar } from '@/components/UserAvatar';
import { motion } from 'framer-motion';
import { CalendarDays, Check, X, HelpCircle, MapPin, Clock } from 'lucide-react';
import { HomeEmptyState } from '@/components/HomeEmptyState';
import { CoachMark } from '@/components/CoachMark';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const Index = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  const { upcomingEvents, pendingRsvps, weekCount, monthCount } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    // All future events sorted by date
    const future = events
      .filter(e => new Date(e.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Pending RSVPs: events where MY participation is 'suggested'
    const pending = future.filter(e => {
      const myP = e.participants.find(p => p.user_id === userId);
      return myP?.status === 'suggested';
    });

    // Upcoming: next 7 events that are NOT pending for me
    const nonPending = future.filter(e => {
      const myP = e.participants.find(p => p.user_id === userId);
      return !myP || myP.status !== 'suggested';
    });

    // Scorecards: count events in next 7 days / this month (excluding declined)
    const countable = future.filter(e => {
      const myP = e.participants.find(p => p.user_id === userId);
      return !myP || myP.status !== 'declined';
    });

    const inWeek = countable.filter(e => new Date(e.date) <= nextWeek).length;
    const inMonth = countable.filter(e => new Date(e.date) <= monthEnd).length;

    return {
      upcomingEvents: nonPending.slice(0, 7),
      pendingRsvps: pending,
      weekCount: inWeek,
      monthCount: inMonth,
    };
  }, [events, userId]);

  const handleRsvp = async (event: DbEvent, participantId: string, status: string) => {
    const { error } = await supabase
      .from('event_participants')
      .update({ status })
      .eq('id', participantId);
    if (error) toast.error(error.message);
    else {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  };

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

  return (
    <div className="min-h-screen pb-24">
      <CoachMark
        id="home-fab"
        text="Tap here to create your first plan"
        anchorSelector='[data-coach="home-fab"]'
        placement="top"
      />
      <div className="mx-auto max-w-md px-4 pt-12">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className="text-sm font-medium text-muted-foreground">{greeting}</p>
          <h1 className="text-2xl font-bold text-foreground">Your Week</h1>
        </motion.div>

        {hasNoEvents ? (
          <HomeEmptyState usage={profile?.usage} />
        ) : (
          <>
            {/* Scorecards */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mb-6 grid grid-cols-2 gap-3"
            >
              <div className="rounded-2xl bg-card p-4 shadow-card">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Next 7 days</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{weekCount}</p>
                <p className="text-xs text-muted-foreground">plan{weekCount !== 1 ? 's' : ''} booked</p>
              </div>
              <div className="rounded-2xl bg-card p-4 shadow-card">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">This month</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{monthCount}</p>
                <p className="text-xs text-muted-foreground">plan{monthCount !== 1 ? 's' : ''} remaining</p>
              </div>
            </motion.div>

            {/* Pending RSVPs */}
            {pendingRsvps.length > 0 && (
              <>
                <motion.h2
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Pending RSVPs ({pendingRsvps.length})
                </motion.h2>
                <div className="flex flex-col gap-3 mb-8">
                  {pendingRsvps.map((event, i) => {
                    const myParticipation = event.participants.find(p => p.user_id === userId && p.status === 'suggested');
                    const timeDisplay = getTimeDisplay(event);
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12 + i * 0.06 }}
                        className="rounded-2xl bg-card p-4 shadow-card"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{event.emoji}</span>
                          <span className="font-semibold text-foreground">{event.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          {timeDisplay && ` · ${timeDisplay}`}
                          {event.location && ` · ${event.location}`}
                        </p>
                        {myParticipation && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="default" className="flex-1 gap-1" onClick={() => handleRsvp(event, myParticipation.id, 'confirmed')}>
                              <Check className="h-3.5 w-3.5" /> Confirm
                            </Button>
                            <Button size="sm" variant="secondary" className="flex-1 gap-1" onClick={() => handleRsvp(event, myParticipation.id, 'maybe')}>
                              <HelpCircle className="h-3.5 w-3.5" /> Maybe
                            </Button>
                            <Button size="sm" variant="ghost" className="flex-1 gap-1" onClick={() => handleRsvp(event, myParticipation.id, 'declined')}>
                              <X className="h-3.5 w-3.5" /> Decline
                            </Button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Upcoming Events */}
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Upcoming Plans
            </motion.h2>
            <div className="flex flex-col gap-3 mb-8">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event, i) => {
                  const timeDisplay = getTimeDisplay(event);
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.17 + i * 0.06 }}
                      onClick={() => navigate(`/event/${event.id}`)}
                      className="flex gap-3 rounded-2xl bg-card p-4 shadow-card cursor-pointer transition-shadow hover:shadow-elevated active:scale-[0.99]"
                    >
                      <div className="flex flex-col items-center justify-center rounded-xl bg-primary/10 px-3 py-2 min-w-[52px]">
                        <span className="text-xs font-semibold uppercase text-primary">
                          {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <span className="text-lg font-bold text-primary">
                          {new Date(event.date + 'T00:00:00').getDate()}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{event.emoji}</span>
                          <span className="font-semibold text-foreground truncate">{event.title}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {timeDisplay && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeDisplay}</span>}
                          {event.location && <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" />{event.location}</span>}
                        </div>
                        {event.participants.length > 0 && (
                          <div className="flex items-center gap-1 mt-0.5">
                            {event.participants.slice(0, 5).map(p => (
                              <UserAvatar
                                key={p.id}
                                avatarUrl={p.profile?.avatar_url}
                                username={p.profile?.username}
                                size="sm"
                                className="h-6 w-6 text-[10px] -ml-1 first:ml-0 ring-2 ring-card"
                              />
                            ))}
                            {event.participants.length > 5 && (
                              <span className="ml-1 text-[10px] text-muted-foreground">+{event.participants.length - 5}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming plans — time to create one! ✨</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
