import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { ArrowLeft, CalendarPlus, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { format, formatDistanceToNow } from 'date-fns';

const PersonPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

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
          <div className="rounded-2xl bg-card p-4 shadow-card text-center">
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Events Together</span>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {sharedStats?.count ?? '—'}
            </p>
          </div>

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
