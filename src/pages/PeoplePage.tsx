import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFriends, useFriendRequests } from '@/hooks/useEvents';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Search, UserPlus, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const PeoplePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: friends = [], isLoading } = useFriends();
  const { data: friendRequests = [] } = useFriendRequests();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [searchDone, setSearchDone] = useState(false);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['friends'] });
    queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
        .neq('user_id', user.id)
        .limit(10);

      if (error) { toast.error(error.message); return; }

      // Get outgoing pending requests too
      const { data: sentRequests } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', user.id)
        .eq('status', 'pending');

      const friendIds = friends.map(f => f.user_id);
      const pendingIncomingIds = friendRequests.map(r => r.user_id);
      const pendingSentIds = (sentRequests || []).map(r => r.friend_id);
      const excludeIds = new Set([...friendIds, ...pendingIncomingIds, ...pendingSentIds]);
      setSearchResults((data || []).filter(p => !excludeIds.has(p.user_id)));
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
      <div className="mx-auto max-w-md px-4 pt-12">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-2xl font-bold text-foreground"
        >
          Your People
        </motion.h1>

        {/* Incoming Friend Requests */}
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
                    <p className="font-semibold text-foreground">{req.profile?.username || 'Unknown'}</p>
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
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <div className="flex gap-2">
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

        {/* Friends List */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : friends.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            No friends yet — search by username above to add some! 👆
          </p>
        ) : (
          <>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Friends ({friends.length})
            </h2>
            <div className="flex flex-col gap-3">
              {friends.map((friend, i) => (
                <motion.div
                  key={friend.user_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/person/${friend.user_id}`)}
                  className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-card cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-xl">
                    👤
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{friend.username}</p>
                    <p className="text-xs text-muted-foreground">{friend.email}</p>
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