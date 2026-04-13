import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ActivityItem {
  id: string;
  user_id: string;
  type: string;
  event_id: string | null;
  source_user_id: string | null;
  comment_id: string | null;
  is_read: boolean;
  created_at: string;
  source_profile?: { username: string; avatar_url: string | null };
  event?: { title: string; emoji: string };
  comment_content?: string;
}

export function useActivityFeed() {
  return useQuery({
    queryKey: ['activity-feed'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: items } = await supabase
        .from('activity_feed')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!items || items.length === 0) return [];

      // Fetch source profiles
      const sourceIds = [...new Set(items.map(i => i.source_user_id).filter(Boolean))] as string[];
      let profiles: any[] = [];
      if (sourceIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', sourceIds);
        profiles = data || [];
      }
      const profileMap = new Map(profiles.map(p => [p.user_id, p]));

      // Fetch events
      const eventIds = [...new Set(items.map(i => i.event_id).filter(Boolean))] as string[];
      let events: any[] = [];
      if (eventIds.length > 0) {
        const { data } = await supabase
          .from('events')
          .select('id, title, emoji')
          .in('id', eventIds);
        events = data || [];
      }
      const eventMap = new Map(events.map(e => [e.id, e]));

      // Fetch comments
      const commentIds = [...new Set(items.map(i => i.comment_id).filter(Boolean))] as string[];
      let comments: any[] = [];
      if (commentIds.length > 0) {
        const { data } = await supabase
          .from('event_comments')
          .select('id, content')
          .in('id', commentIds);
        comments = data || [];
      }
      const commentMap = new Map(comments.map(c => [c.id, c]));

      return items.map(item => ({
        ...item,
        source_profile: item.source_user_id ? profileMap.get(item.source_user_id) : undefined,
        event: item.event_id ? eventMap.get(item.event_id) : undefined,
        comment_content: item.comment_id ? commentMap.get(item.comment_id)?.content : undefined,
      })) as ActivityItem[];
    },
  });
}

export function useUnreadActivityCount() {
  return useQuery({
    queryKey: ['unread-activity-count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count } = await supabase
        .from('activity_feed')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      return count || 0;
    },
    refetchInterval: 30000,
  });
}
