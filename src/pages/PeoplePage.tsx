import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFriends, useFriendRequests } from '@/hooks/useEvents';
import { useGroups } from '@/hooks/useGroups';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, UserPlus, Check, X, Calendar, Share2, Plus, ChevronRight } from 'lucide-react';
import { ClickableName } from '@/components/ClickableName';
import { UserAvatar } from '@/components/UserAvatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CoachMark } from '@/components/CoachMark';
import { InviteFriendsSheet } from '@/components/InviteFriendsSheet';
import { cn } from '@/lib/utils';

const PeoplePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: friends = [], isLoading } = useFriends();
  const { data: friendRequests = [] } = useFriendRequests();
  const { data: groups = [], isLoading: groupsLoading } = useGroups();
  const [activeTab, setActiveTab] = useState<'friends' | 'groups'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Outgoing pending requests
  const { data: outgoingPending = [] } = useQuery({
    queryKey: ['outgoing-friend-requests'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: rows } = await supabase
        .from('friends')
        .select('id, friend_id, created_at')
        .eq('user_id', user.id)
        .eq('status', 'pending');
      if (!rows || rows.length === 0) return [];
      const ids = rows.map(r => r.friend_id);
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', ids);
      const profMap = new Map((profs || []).map(p => [p.user_id, p]));
      return rows.map(r => ({
        id: r.id,
        friend_id: r.friend_id,
        profile: profMap.get(r.friend_id) || null,
      }));
    },
  });

  // Fetch shared event counts for all friends
  const { data: sharedCounts = {} } = useQuery({
    queryKey: ['friend-shared-counts', friends.map(f => f.user_id).join(',')],
    queryFn: async () => {
      if (friends.length === 0) return {};
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {};

      const { data: myCreated } = await supabase.from('events').select('id').eq('created_by', user.id);
      const { data: myParts } = await supabase.from('event_participants').select('event_id').eq('user_id', user.id);
      const myEventIds = new Set([...(myCreated || []).map(e => e.id), ...(myParts || []).map(p => p.event_id)]);

      const friendIds = friends.map(f => f.user_id);
      const { data: theirCreated } = await supabase.from('events').select('id, created_by').in('created_by', friendIds);
      const { data: theirParts } = await supabase.from('event_participants').select('event_id, user_id').in('user_id', friendIds);

      const counts: Record<string, number> = {};
      for (const fid of friendIds) {
        const theirEventIds = new Set([
          ...(theirCreated || []).filter(e => e.created_by === fid).map(e => e.id),
          ...(theirParts || []).filter(p => p.user_id === fid).map(p => p.event_id),
        ]);
        counts[fid] = [...myEventIds].filter(id => theirEventIds.has(id)).length;
      }
      return counts;
    },
    enabled: friends.length > 0,
  });

  const sortedFriends = [...friends].sort((a, b) => (sharedCounts[b.user_id] || 0) - (sharedCounts[a.user_id] || 0));
  const [adding, setAdding] = useState<string | null>(null);
  const [searchDone, setSearchDone] = useState(false);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['friends'] });
    queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    queryClient.invalidateQueries({ queryKey: ['outgoing-friend-requests'] });
    queryClient.invalidateQueries({ queryKey: ['pending-friend-count'] });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchDone(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const query = searchQuery.trim();
      const lower = query.toLowerCase();

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
        .neq('user_id', user.id)
        .limit(20);

      if (error) { toast.error(error.message); return; }

      const { data: sentRequests } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', user.id)
        .eq('status', 'pending');

      const friendIds = friends.map(f => f.user_id);
      const pendingIncomingIds = friendRequests.map(r => r.user_id);
      const pendingSentIds = (sentRequests || []).map(r => r.friend_id);
      const excludeIds = new Set([...friendIds, ...pendingIncomingIds, ...pendingSentIds]);

      // Rank: exact username > prefix > substring
      const ranked = (data || [])
        .filter(p => !excludeIds.has(p.user_id))
        .map(p => {
          const u = (p.username || '').toLowerCase();
          let rank = 3;
          if (u === lower) rank = 0;
          else if (u.startsWith(lower)) rank = 1;
          else if (u.includes(lower)) rank = 2;
          return { p, rank };
        })
        .sort((a, b) => a.rank - b.rank)
        .map(x => x.p);

      setSearchResults(ranked.slice(0, 10));
      setSearchDone(true);
    } finally {
      setSearching(false);
    }
  };

  const addFriend = async (friendUserId: string) => {
    setAdding(friendUserId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('friends').insert({
        user_id: user.id,
        friend_id: friendUserId,
      });

      if (error) { toast.error(error.message); return; }

      toast.success('Friend request sent! 📨');
      invalidateAll();
      setSearchResults(prev => prev.filter(p => p.user_id !== friendUserId));
    } finally {
      setAdding(null);
    }
  };

  const cancelOutgoingRequest = async (requestId: string) => {
    const { error } = await supabase.from('friends').delete().eq('id', requestId);
    if (error) { toast.error(error.message); return; }
    toast.success('Request cancelled');
    invalidateAll();
  };

  const respondToRequest = async (requestId: string, status: 'accepted' | 'declined') => {
    const { error } = await supabase
      .from('friends')
      .update({ status })
      .eq('id', requestId);

    if (error) { toast.error(error.message); return; }

    toast.success(status === 'accepted' ? 'Friend added! 🎉' : 'Request declined');
    invalidateAll();
  };

  return (
    <div className="min-h-screen pb-24">
      <CoachMark
        id="people-search"
        text="Search a username to add friends"
        anchorSelector='[data-coach="people-search"]'
        placement="bottom"
      />
      <InviteFriendsSheet open={inviteOpen} onOpenChange={setInviteOpen} />

      <div className="mx-auto max-w-md px-4 pt-12">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-2xl font-bold text-foreground"
        >
          Your People
        </motion.h1>

        {/* Invite friends to join */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onClick={() => setInviteOpen(true)}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-3.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          <Share2 className="h-4 w-4" />
          Invite friends to join Cali
        </motion.button>

        {friendRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Friend Requests ({friendRequests.length})
            </h2>
            <div className="flex flex-col gap-2">
              {friendRequests.map(req => (
                <div
                  key={req.id}
                  className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-lg">
                    👤
                  </div>
                  <div className="flex-1 min-w-0">
                    <ClickableName userId={req.user_id} name={req.profile?.username || 'Unknown'} className="font-semibold" />
                    <p className="text-xs text-muted-foreground">{req.profile?.email}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => respondToRequest(req.id, 'accepted')}
                      className="gap-1 h-8 px-2.5"
                    >
                      <Check className="h-3.5 w-3.5" /> Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => respondToRequest(req.id, 'declined')}
                      className="gap-1 h-8 px-2.5 text-muted-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Search to add friends */}
        <motion.div
          ref={searchRef}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <div data-coach="people-search" className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search by username to add friends..."
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} disabled={searching} variant="default" size="default">
              {searching ? '...' : 'Search'}
            </Button>
          </div>

          {searchDone && searchResults.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">No results found</p>
          )}
          {searchResults.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">Results</p>
              {searchResults.map(profile => (
                <div
                  key={profile.user_id}
                  className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-lg">
                    👤
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{profile.username}</p>
                    <p className="text-xs text-muted-foreground">{profile.email}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => addFriend(profile.user_id)}
                    disabled={adding === profile.user_id}
                    className="gap-1"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    {adding === profile.user_id ? '...' : 'Add'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Outgoing Pending Requests */}
        {outgoingPending.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Pending ({outgoingPending.length})
            </h2>
            <div className="flex flex-col gap-2">
              {outgoingPending.map(req => (
                <div
                  key={req.id}
                  className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card"
                >
                  <UserAvatar
                    avatarUrl={req.profile?.avatar_url}
                    username={req.profile?.username}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      @{req.profile?.username || 'unknown'}
                    </p>
                    <p className="text-xs italic text-muted-foreground">Pending...</p>
                  </div>
                  <button
                    onClick={() => cancelOutgoingRequest(req.id)}
                    className="text-xs font-medium text-muted-foreground hover:text-destructive transition-colors px-2 py-1"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Friends List */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : friends.length === 0 ? (
          outgoingPending.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              No friends yet — search by username above to add some! 👆
            </p>
          )
        ) : (
          <>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Friends ({friends.length})
            </h2>
            <div className="flex flex-col gap-3">
              {sortedFriends.map((friend, i) => (
                <motion.div
                  key={friend.user_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/person/${friend.user_id}`)}
                  className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-card cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <UserAvatar avatarUrl={friend.avatar_url} username={friend.username} size="lg" />
                  <div className="flex-1 min-w-0">
                    <ClickableName userId={friend.user_id} name={friend.username} className="font-semibold" />
                    <p className="text-xs text-muted-foreground">{friend.email}</p>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-bold text-foreground">{sharedCounts[friend.user_id] || 0}</span>
                    <span className="text-[10px] leading-tight">events</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PeoplePage;
