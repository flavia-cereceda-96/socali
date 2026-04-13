import { useState } from 'react';
import { useFriends } from '@/hooks/useEvents';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Search, UserPlus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const PeoplePage = () => {
  const queryClient = useQueryClient();
  const { data: friends = [], isLoading } = useFriends();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${searchQuery.trim()}%`)
        .neq('user_id', user.id)
        .limit(10);

      if (error) {
        toast.error(error.message);
        return;
      }

      // Filter out existing friends
      const friendIds = friends.map(f => f.user_id);
      setSearchResults((data || []).filter(p => !friendIds.includes(p.user_id)));
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

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Friend added! 🎉');
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      setSearchResults(prev => prev.filter(p => p.user_id !== friendUserId));
    } finally {
      setAdding(null);
    }
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

          {/* Search Results */}
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
          <div className="flex flex-col gap-3">
            {friends.map((friend, i) => (
              <motion.div
                key={friend.user_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-card"
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
        )}
      </div>
    </div>
  );
};

export default PeoplePage;
