import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DbEvent {
  id: string;
  title: string;
  emoji: string;
  date: string;
  end_date: string | null;
  time: string | null;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  is_trip: boolean;
  created_by: string;
  created_at: string;
  participants: DbParticipant[];
}

export interface DbParticipant {
  id: string;
  user_id: string;
  status: string;
  decline_note: string | null;
  profile?: {
    username: string;
    email: string;
    user_id: string;
    avatar_url: string | null;
  };
}

export interface DbEventWithCreator extends DbEvent {
  creator_profile?: {
    username: string;
    avatar_url: string | null;
  };
}

export interface DbProfile {
  id: string;
  user_id: string;
  username: string;
  email: string;
  usage: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get events created by user
      const { data: ownEvents } = await supabase
        .from('events')
        .select('*')
        .eq('created_by', user.id);

      // Get events where user is participant
      const { data: participations } = await supabase
        .from('event_participants')
        .select('event_id')
        .eq('user_id', user.id);

      const participatedEventIds = (participations || []).map(p => p.event_id);

      let participatedEvents: any[] = [];
      if (participatedEventIds.length > 0) {
        const { data } = await supabase
          .from('events')
          .select('*')
          .in('id', participatedEventIds);
        participatedEvents = data || [];
      }

      // Merge and deduplicate
      const allEvents = [...(ownEvents || []), ...participatedEvents];
      const uniqueMap = new Map(allEvents.map(e => [e.id, e]));
      const events = Array.from(uniqueMap.values());

      // Fetch participants for all events
      const eventIds = events.map(e => e.id);
      let participants: any[] = [];
      if (eventIds.length > 0) {
        const { data } = await supabase
          .from('event_participants')
          .select('*')
          .in('event_id', eventIds);
        participants = data || [];
      }

      // Fetch profiles for all participant user_ids + creator user_ids
      const creatorUserIds = events.map(e => e.created_by);
      const allUserIds = [...new Set([...participants.map(p => p.user_id), ...creatorUserIds])];
      let profiles: any[] = [];
      if (allUserIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('user_id, username, email, avatar_url')
          .in('user_id', allUserIds);
        profiles = data || [];
      }

      const profileMap = new Map(profiles.map(p => [p.user_id, p]));

      return events.map(e => {
        const creatorProfile = profileMap.get(e.created_by);
        return {
          ...e,
          creator_profile: creatorProfile ? { username: creatorProfile.username, avatar_url: creatorProfile.avatar_url } : undefined,
          participants: participants
            .filter(p => p.event_id === e.id)
            .map(p => ({
              ...p,
              profile: profileMap.get(p.user_id),
            })),
        };
      }) as DbEventWithCreator[];
    },
  });
}

export function useFriends() {
  return useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: friendRows } = await supabase
        .from('friends')
        .select('*')
        .eq('status', 'accepted')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (!friendRows || friendRows.length === 0) return [];

      const friendUserIds = friendRows.map(f =>
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', friendUserIds);

      return (profiles || []) as DbProfile[];
    },
  });
}

export interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  profile: { username: string; email: string } | null;
}

export function useFriendRequests() {
  return useQuery({
    queryKey: ['friend-requests'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Incoming pending requests where I'm the friend_id
      const { data: requests } = await supabase
        .from('friends')
        .select('*')
        .eq('friend_id', user.id)
        .eq('status', 'pending');

      if (!requests || requests.length === 0) return [];

      const senderIds = requests.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, email')
        .in('user_id', senderIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      return requests.map(r => ({
        ...r,
        profile: profileMap.get(r.user_id) || null,
      })) as FriendRequest[];
    },
  });
}

export function usePendingFriendCount() {
  return useQuery({
    queryKey: ['pending-friend-count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count } = await supabase
        .from('friends')
        .select('*', { count: 'exact', head: true })
        .eq('friend_id', user.id)
        .eq('status', 'pending');

      return count || 0;
    },
    refetchInterval: 30000,
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      return data as DbProfile | null;
    },
  });
}

export function usePendingRequestCount() {
  return useQuery({
    queryKey: ['pending-request-count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count } = await supabase
        .from('event_participants')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'suggested');

      return count || 0;
    },
    refetchInterval: 30000, // poll every 30s
  });
}
