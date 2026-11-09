import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEvents } from '@/hooks/useEvents';
import { motion } from 'framer-motion';
import { ArrowLeft, MoreHorizontal, UserMinus, Flag, ShieldBan, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { SafetyMenu } from '@/components/SafetyMenu';
import { useBlocks, useSafetyActions } from '@/hooks/useSafety';
import { CalMascot } from '@/components/CalMascot';
import { IdentityBlock, StatTile, SectionHeader, MemoryGrid, UpcomingList, attended, todayStr } from '@/components/profile/ProfileBits';
import { personName } from '@/lib/personName';
import { toast } from 'sonner';

const PersonPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [meId, setMeId] = useState<string | null>(null);
  const [safetyOpen, setSafetyOpen] = useState<'report' | 'block' | null>(null);
  const { data: blocks = [] } = useBlocks();
  const { unblock } = useSafetyActions();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id || null));
  }, []);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['person-profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url, bio, invite_to')
        .eq('user_id', userId)
        .maybeSingle();
      return data as any;
    },
    enabled: !!userId,
  });

  const { data: friendship } = useQuery({
    queryKey: ['friendship', userId, meId],
    enabled: !!userId && !!meId,
    queryFn: async () => {
      const { data } = await supabase
        .from('friends')
        .select('id, status, user_id')
        .or(`and(user_id.eq.${meId},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${meId})`)
        .maybeSingle();
      return data;
    },
  });
  const isFriend = friendship?.status === 'accepted';

  const { data: events = [] } = useEvents();

  const { data: sharedGroups = 0 } = useQuery({
    queryKey: ['person-shared-groups', userId, meId],
    enabled: !!userId && !!meId,
    queryFn: async () => {
      const { data } = await supabase
        .from('group_members')
        .select('group_id, user_id')
        .in('user_id', [userId!, meId!])
        .eq('membership_status', 'accepted');
      const mine = new Set((data || []).filter(m => m.user_id === meId).map(m => m.group_id));
      return new Set((data || []).filter(m => m.user_id === userId && mine.has(m.group_id)).map(m => m.group_id)).size;
    },
  });

  const today = todayStr();
  const { upcoming, memories } = useMemo(() => {
    if (!userId || !meId) return { upcoming: [], memories: [] };
    const shared = events.filter(e => {
      const ids = new Set([e.created_by, ...e.participants.filter(p => p.status !== 'declined').map(p => p.user_id)]);
      return ids.has(userId) && ids.has(meId);
    });
    return {
      upcoming: shared.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)),
      memories: shared.filter(e => e.date < today && attended(e, userId) && attended(e, meId)).sort((a, b) => b.date.localeCompare(a.date)),
    };
  }, [events, userId, meId, today]);

  if (profileLoading) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-sm text-muted-foreground">Loading...</p></div>;
  }

  if (!profile) {
    const blocked = blocks.find(b => b.blocked_user_id === userId);
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{blocked ? 'This person is blocked' : 'Person not found'}</p>
        {blocked && <Button variant="outline" onClick={async () => { try { await unblock(blocked.id); } catch { toast.error('Could not unblock'); } }}>Unblock</Button>}
        <Button variant="ghost" onClick={() => navigate(-1)}>Go back</Button>
      </div>
    );
  }

  const name = personName(profile);
  const firstName = name.split(' ')[0];
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['friendship'] });
    queryClient.invalidateQueries({ queryKey: ['friends'] });
  };

  const addFriend = async () => {
    if (!meId || !userId) return;
    const { error } = await supabase.from('friends').insert({ user_id: meId, friend_id: userId });
    if (error) { toast.error(error.message); return; }
    toast.success('Friend request sent! 📨');
    refresh();
  };

  const removeFriend = async () => {
    if (!friendship) return;
    if (!window.confirm(`Remove ${name} from your friends?`)) return;
    const { error } = await supabase.from('friends').delete().eq('id', friendship.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Friend removed');
    refresh();
  };

  const isMe = meId === userId;

  return (
    <div className="min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-md px-4 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-foreground" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          {!isMe && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-foreground" aria-label="More options">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isFriend && <DropdownMenuItem onSelect={removeFriend}><UserMinus className="mr-2 h-4 w-4" />Remove friend</DropdownMenuItem>}
                <DropdownMenuItem onSelect={() => setSafetyOpen('block')}><ShieldBan className="mr-2 h-4 w-4" />Block</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSafetyOpen('report')}><Flag className="mr-2 h-4 w-4" />Report</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {/* Reused report/block dialogs */}
        <SafetyMenu type="profile" contentId={profile.user_id} authorId={profile.user_id} currentUserId={meId} hideTrigger open={safetyOpen} onOpenChange={setSafetyOpen} />

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-7">
          <IdentityBlock avatarUrl={profile.avatar_url} userId={profile.user_id} name={name} username={profile.username} subtitle={isFriend ? 'Friends' : undefined} bio={profile.bio} />

          {!isFriend ? (
            !isMe && (
              friendship ? (
                <Button disabled variant="secondary" className="h-12 w-full rounded-2xl">Request pending</Button>
              ) : (
                <Button onClick={addFriend} className="h-12 w-full gap-2 rounded-2xl bg-foreground text-background hover:bg-foreground/90">
                  <UserPlus className="h-5 w-5" /> Add friend
                </Button>
              )
            )
          ) : (
            <>
              <button
                onClick={() => navigate('/create', { state: { inviteFriendId: userId, inviteFriendName: name } })}
                className="h-12 w-full rounded-2xl bg-accent text-sm font-bold text-accent-foreground"
              >
                Invite {firstName} to a plan
              </button>

              <div className="grid grid-cols-3 gap-3">
                <StatTile value={upcoming.length} label="coming up" bg="--primary" fg="--primary-foreground" />
                <StatTile value={memories.length} label="hangouts together" bg="--secondary" fg="--secondary-foreground" />
                <StatTile value={sharedGroups} label="shared groups" bg="--accent-soft" fg="--accent-soft-foreground" />
              </div>

              {upcoming.length > 0 && (
                <section>
                  <SectionHeader title="Coming up together" />
                  <UpcomingList events={upcoming} />
                </section>
              )}

              <section>
                <SectionHeader title="Memories together" />
                {memories.length > 0 ? (
                  <MemoryGrid events={memories} viewerId={meId} />
                ) : (
                  <div className="flex flex-col items-center gap-2 rounded-[20px] bg-muted p-6 text-center">
                    <CalMascot mood="sleepy" size={56} />
                    <p className="text-sm text-muted-foreground">Your past plans with {firstName} will show up here.</p>
                  </div>
                )}
              </section>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PersonPage;
