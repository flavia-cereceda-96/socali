import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CalendarPlus, Calendar, Clock, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const PersonPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [showShared, setShowShared] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['person-profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      return data;
    },
    enabled: !!userId,
  });

  const { data: sharedStats } = useQuery({
    queryKey: ['shared-stats', userId],
    queryFn: async () => {
      if (!userId) return { count: 0, lastSeen: null };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { count: 0, lastSeen: null };

      // Get events where current user is creator or participant
      const { data: myCreated } = await supabase
        .from('events')
        .select('id')
        .eq('created_by', user.id);

      const { data: myParticipations } = await supabase
        .from('event_participants')
        .select('event_id')
        .eq('user_id', user.id);

      const myEventIds = new Set([
        ...(myCreated || []).map(e => e.id),
        ...(myParticipations || []).map(p => p.event_id),
      ]);

      // Get events where the friend is creator or participant
      const { data: theirCreated } = await supabase
        .from('events')
        .select('id, date')
        .eq('created_by', userId);

      const { data: theirParticipations } = await supabase
        .from('event_participants')
        .select('event_id')
        .eq('user_id', userId);

      const theirEventIds = new Set([
        ...(theirCreated || []).map(e => e.id),
        ...(theirParticipations || []).map(p => p.event_id),
      ]);

      // Find shared events
      const sharedEventIds = [...myEventIds].filter(id => theirEventIds.has(id));

      // Get dates of shared events to find last seen
      let lastSeen: string | null = null;
      if (sharedEventIds.length > 0) {
        const { data: sharedEvents } = await supabase
          .from('events')
          .select('date')
          .in('id', sharedEventIds)
          .lte('date', new Date().toISOString().split('T')[0])
          .order('date', { ascending: false })
          .limit(1);

        if (sharedEvents && sharedEvents.length > 0) {
          lastSeen = sharedEvents[0].date;
        }
      }

      return { count: sharedEventIds.length, lastSeen };
    },
    enabled: !!userId,
  });

  const { data: sharedEvents = [], isLoading: sharedLoading } = useQuery({
    queryKey: ['shared-events-list', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const [{ data: myCreated }, { data: myParts }, { data: theirCreated }, { data: theirParts }] = await Promise.all([
        supabase.from('events').select('id').eq('created_by', user.id),
        supabase.from('event_participants').select('event_id').eq('user_id', user.id),
        supabase.from('events').select('id').eq('created_by', userId),
        supabase.from('event_participants').select('event_id').eq('user_id', userId),
      ]);

      const mine = new Set([
        ...(myCreated || []).map(e => e.id),
        ...(myParts || []).map(p => p.event_id),
      ]);
      const theirs = new Set([
        ...(theirCreated || []).map(e => e.id),
        ...(theirParts || []).map(p => p.event_id),
      ]);
      const sharedIds = [...mine].filter(id => theirs.has(id));
      if (sharedIds.length === 0) return [];

      const { data: events } = await supabase
        .from('events')
        .select('id, title, emoji, date, time')
        .in('id', sharedIds);
      return events || [];
    },
    enabled: !!userId && showShared,
  });

  const today = new Date().toISOString().split('T')[0];
  const upcoming = sharedEvents
    .filter(e => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
  const past = sharedEvents
    .filter(e => e.date < today)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || ''));

  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Person not found</p>
        <Button variant="ghost" onClick={() => navigate(-1)}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-4 pt-6">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center mb-8"
        >
          <UserAvatar
            avatarUrl={profile.avatar_url}
            username={profile.username}
            size="xl"
            className="mb-4"
          />
          <h1 className="text-2xl font-bold text-foreground">{profile.username}</h1>
          <p className="text-sm text-muted-foreground mt-1">{profile.email}</p>
          {profile.bio && (
            <p className="mt-3 text-sm text-foreground/80 max-w-xs leading-relaxed">
              {profile.bio}
            </p>
          )}
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3 mb-8"
        >
          <button
            onClick={() => setShowShared(s => !s)}
            className="rounded-2xl bg-card p-4 shadow-card text-center hover:bg-accent/40 transition-[background-color] duration-100 ease-out relative"
            aria-expanded={showShared}
          >
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Events Together</span>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {sharedStats?.count ?? '—'}
            </p>
            <ChevronDown
              className={cn(
                "absolute right-2 top-2 h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                showShared && "rotate-180"
              )}
            />
          </button>

          <div className="rounded-2xl bg-card p-4 shadow-card text-center">
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Last Seen</span>
            </div>
            <p className="text-lg font-bold text-foreground">
              {sharedStats?.lastSeen
                ? formatDistanceToNow(new Date(sharedStats.lastSeen), { addSuffix: true })
                : 'Never yet'}
            </p>
          </div>
        </motion.div>

        {/* Shared events expand */}
        <AnimatePresence initial={false}>
          {showShared && (
            <motion.div
              key="shared"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mb-8"
            >
              <div className="space-y-5">
                <SharedEventsSection
                  title="Upcoming"
                  events={upcoming}
                  loading={sharedLoading}
                  emptyText="No upcoming plans together yet"
                  onClick={(id) => navigate(`/event/${id}`)}
                />
                <SharedEventsSection
                  title="Past"
                  events={past}
                  loading={sharedLoading}
                  emptyText="No past events together yet"
                  onClick={(id) => navigate(`/event/${id}`)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            onClick={() => navigate('/create', { state: { inviteFriendId: userId, inviteFriendName: profile.username } })}
            className="w-full gap-2 h-12 text-base"
          >
            <CalendarPlus className="h-5 w-5" />
            Create an event with {profile.username}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default PersonPage;

function SharedEventsSection({
  title,
  events,
  loading,
  emptyText,
  onClick,
}: {
  title: string;
  events: Array<{ id: string; title: string; emoji: string; date: string; time: string | null }>;
  loading: boolean;
  emptyText: string;
  onClick: (id: string) => void;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {title}
      </h3>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {events.map(e => (
            <button
              key={e.id}
              onClick={() => onClick(e.id)}
              className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card text-left hover:bg-accent/40 transition-[background-color] duration-100 ease-out"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl">
                {e.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{e.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(e.date + 'T00:00:00'), 'EEE, MMM d')}
                  {e.time ? ` · ${e.time.slice(0, 5)}` : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
