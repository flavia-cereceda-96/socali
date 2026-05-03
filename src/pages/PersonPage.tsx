import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEvents } from '@/hooks/useEvents';
import { motion } from 'framer-motion';
import { ArrowLeft, CalendarPlus, Clock, MapPin, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { GroupAvatar } from '@/components/GroupAvatar';

const PersonPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [meId, setMeId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id || null));
  }, []);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['person-profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, bio, invite_to')
        .eq('user_id', userId)
        .maybeSingle();
      return data as any;
    },
    enabled: !!userId,
  });

  const { data: publicStats } = useQuery({
    queryKey: ['public-user-stats', userId],
    queryFn: async () => {
      if (!userId) return { events_attended: 0, friends_count: 0 };
      const { data } = await supabase.rpc('get_public_user_stats' as any, { _user_id: userId });
      const row = Array.isArray(data) ? data[0] : data;
      return {
        events_attended: Number(row?.events_attended ?? 0),
        friends_count: Number(row?.friends_count ?? 0),
      };
    },
    enabled: !!userId,
  });

  // Use existing events query (viewer's own visible events) to compute shared & upcoming together
  const { data: events = [] } = useEvents();

  // Shared and other groups
  const { data: groupData } = useQuery({
    queryKey: ['person-groups', userId, meId],
    enabled: !!userId && !!meId,
    queryFn: async () => {
      if (!userId || !meId) return { shared: [], theirOther: [] };
      // Their accepted groups
      const { data: theirMems } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId)
        .eq('membership_status', 'accepted');
      const theirGroupIds = (theirMems || []).map(m => m.group_id);
      if (theirGroupIds.length === 0) return { shared: [], theirOther: [] };

      // My accepted groups
      const { data: myMems } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', meId)
        .eq('membership_status', 'accepted');
      const myGroupIds = new Set((myMems || []).map(m => m.group_id));

      const { data: groups } = await supabase
        .from('groups')
        .select('id, name, emoji, avatar_url')
        .in('id', theirGroupIds);
      const all = (groups || []) as any[];
      return {
        shared: all.filter(g => myGroupIds.has(g.id)),
        theirOther: all.filter(g => !myGroupIds.has(g.id)),
      };
    },
  });

  const shared = useMemo(() => {
    if (!userId || !meId) return [];
    return events.filter(e => {
      const involvedIds = new Set<string>([e.created_by, ...e.participants.map(p => p.user_id)]);
      return involvedIds.has(userId) && involvedIds.has(meId);
    });
  }, [events, userId, meId]);

  const upcomingTogether = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return shared
      .filter(e => new Date(e.date + 'T00:00:00') >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [shared]);

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

  const formatTime = (t: string) => {
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-4 pt-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Profile header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center mb-8"
        >
          <UserAvatar avatarUrl={profile.avatar_url} username={profile.username} size="xl" />
          <h1 className="mt-3 text-2xl font-bold text-foreground">{profile.username}</h1>
          {profile.bio && (
            <p className="mt-2 text-sm text-foreground/80 max-w-xs leading-relaxed">{profile.bio}</p>
          )}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-3 mb-8"
        >
          <div className="rounded-2xl p-3 shadow-card text-center" style={{ backgroundColor: '#6B45F5', color: '#ffffff' }}>
            <p className="text-2xl font-bold">{shared.length}</p>
            <p className="text-[11px] opacity-90 mt-0.5">Events together</p>
          </div>
          <div className="rounded-2xl p-3 shadow-card text-center" style={{ backgroundColor: '#CFFCE3', color: '#1A9E55' }}>
            <p className="text-2xl font-bold">{publicStats?.events_attended ?? '—'}</p>
            <p className="text-[11px] opacity-90 mt-0.5">Events attended</p>
          </div>
          <div className="rounded-2xl p-3 shadow-card text-center" style={{ backgroundColor: '#FFE0CC', color: '#C2410C' }}>
            <p className="text-2xl font-bold">{publicStats?.friends_count ?? '—'}</p>
            <p className="text-[11px] opacity-90 mt-0.5">Friends</p>
          </div>
        </motion.div>

        {/* Plans together */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Plans together
          </h2>
          {upcomingTogether.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming plans together yet</p>
          ) : (
            <div className="flex flex-col gap-3">
              {upcomingTogether.map(e => (
                <button
                  key={e.id}
                  onClick={() => navigate(`/event/${e.id}`)}
                  className="flex gap-3 rounded-2xl bg-card p-4 shadow-card text-left hover:shadow-elevated transition-shadow"
                >
                  <div
                    className="flex flex-col items-center justify-center rounded-xl px-3 py-2 min-w-[52px]"
                    style={{ backgroundColor: '#CFFCE3', color: '#1A9E55' }}
                  >
                    <span className="text-xs font-semibold uppercase">
                      {new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className="text-lg font-bold">
                      {new Date(e.date + 'T00:00:00').getDate()}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{e.emoji}</span>
                      <span className="font-semibold text-foreground truncate">{e.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {e.time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(e.time)}</span>}
                      {e.location && <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" />{e.location}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </motion.section>

        {/* Groups */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mb-8"
        >
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Groups
          </h2>
          {(groupData?.shared.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No groups in common</p>
          ) : (
            <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
              <div className="flex gap-4 pb-1">
                {groupData!.shared.map((g: any) => (
                  <button
                    key={g.id}
                    onClick={() => navigate(`/people/groups/${g.id}`)}
                    className="flex flex-col items-center gap-1.5 w-16 flex-shrink-0"
                  >
                    <GroupAvatar avatarUrl={g.avatar_url} emoji={g.emoji} name={g.name} size="lg" />
                    <span className="text-xs text-foreground truncate max-w-full">{g.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(groupData?.theirOther.length ?? 0) > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 text-xs font-medium text-muted-foreground">Their other groups</h3>
              <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
                <div className="flex gap-4 pb-1 opacity-80">
                  {groupData!.theirOther.map((g: any) => (
                    <div key={g.id} className="flex flex-col items-center gap-1.5 w-16 flex-shrink-0">
                      <GroupAvatar avatarUrl={g.avatar_url} emoji={g.emoji} name={g.name} size="lg" />
                      <span className="text-xs text-foreground truncate max-w-full">{g.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.section>

        {/* Invite preferences */}
        {profile.invite_to && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-8"
          >
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Invite them to
            </h2>
            <div className="flex items-start gap-2 rounded-2xl border border-border bg-secondary/40 px-4 py-3">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-foreground/90 leading-relaxed">{profile.invite_to}</p>
            </div>
          </motion.section>
        )}

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
