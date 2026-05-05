import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type BucketListItem = {
  id: string;
  bucket_list_id: string;
  added_by: string;
  title: string;
  description: string | null;
  emoji: string | null;
  status: 'active' | 'done';
  linked_event_id: string | null;
  created_at: string;
  done_at: string | null;
  linked_event?: { id: string; title: string; date: string | null } | null;
};

export type BucketListSummary = {
  id: string;
  type: 'friend' | 'group';
  group_id: string | null;
  other_user_id: string | null;
  total_count: number;
  done_count: number;
  // enriched client-side
  name?: string;
  avatar_url?: string | null;
  emoji?: string | null;
  preview_items?: BucketListItem[];
};

/** Resolve (and lazily create) the friend bucket list id between current user and a friend. */
export function useFriendBucketListId(friendUserId?: string) {
  return useQuery({
    queryKey: ['bucket-list-id', 'friend', friendUserId],
    enabled: !!friendUserId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_or_create_friend_bucket_list' as any, {
        _other_user: friendUserId,
      });
      if (error) throw error;
      return data as string;
    },
  });
}

/** Resolve (and lazily create) the group bucket list id. */
export function useGroupBucketListId(groupId?: string) {
  return useQuery({
    queryKey: ['bucket-list-id', 'group', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_or_create_group_bucket_list' as any, {
        _group_id: groupId,
      });
      if (error) throw error;
      return data as string;
    },
  });
}

export function useBucketListItems(bucketListId?: string) {
  return useQuery({
    queryKey: ['bucket-list-items', bucketListId],
    enabled: !!bucketListId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('bucket_list_items')
        .select('*')
        .eq('bucket_list_id', bucketListId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const items = (data || []) as BucketListItem[];
      const eventIds = items.map(i => i.linked_event_id).filter(Boolean) as string[];
      if (eventIds.length === 0) return items;
      const { data: events } = await supabase
        .from('events')
        .select('id, title, date')
        .in('id', eventIds);
      const map = new Map((events || []).map((e: any) => [e.id, e]));
      return items.map(i => ({
        ...i,
        linked_event: i.linked_event_id ? (map.get(i.linked_event_id) as any) || null : null,
      }));
    },
  });
}

export function useAddBucketListItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { bucketListId: string; title: string; description?: string; emoji?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');
      const { error } = await (supabase as any).from('bucket_list_items').insert({
        bucket_list_id: args.bucketListId,
        added_by: user.id,
        title: args.title,
        description: args.description || null,
        emoji: args.emoji || null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['bucket-list-items', vars.bucketListId] });
      qc.invalidateQueries({ queryKey: ['my-bucket-lists'] });
    },
  });
}

export function useMarkBucketListItemDone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await (supabase as any)
        .from('bucket_list_items')
        .update({ status: 'done', done_at: new Date().toISOString() })
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bucket-list-items'] });
      qc.invalidateQueries({ queryKey: ['my-bucket-lists'] });
    },
  });
}

export function useDeleteBucketListItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await (supabase as any).from('bucket_list_items').delete().eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bucket-list-items'] });
      qc.invalidateQueries({ queryKey: ['my-bucket-lists'] });
    },
  });
}

/** Fetch all bucket lists current user is part of, enriched with names & previews. */
export function useMyBucketLists() {
  return useQuery({
    queryKey: ['my-bucket-lists'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_bucket_lists' as any);
      if (error) throw error;
      const summaries = ((data as any[]) || []) as BucketListSummary[];
      if (summaries.length === 0) return [] as BucketListSummary[];

      // Enrich names & avatars
      const userIds = summaries.filter(s => s.type === 'friend' && s.other_user_id).map(s => s.other_user_id!) as string[];
      const groupIds = summaries.filter(s => s.type === 'group' && s.group_id).map(s => s.group_id!) as string[];

      const [profilesRes, groupsRes] = await Promise.all([
        userIds.length
          ? supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', userIds)
          : Promise.resolve({ data: [] as any[] }),
        groupIds.length
          ? supabase.from('groups').select('id, name, emoji, avatar_url').in('id', groupIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const profMap = new Map(((profilesRes.data || []) as any[]).map(p => [p.user_id, p]));
      const grpMap = new Map(((groupsRes.data || []) as any[]).map(g => [g.id, g]));

      // Top 2 active items per list
      const ids = summaries.map(s => s.id);
      const { data: items } = await (supabase as any)
        .from('bucket_list_items')
        .select('*')
        .in('bucket_list_id', ids)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      const itemsByList = new Map<string, BucketListItem[]>();
      ((items || []) as BucketListItem[]).forEach(i => {
        const arr = itemsByList.get(i.bucket_list_id) || [];
        if (arr.length < 2) arr.push(i);
        itemsByList.set(i.bucket_list_id, arr);
      });

      return summaries.map(s => {
        if (s.type === 'friend' && s.other_user_id) {
          const p: any = profMap.get(s.other_user_id);
          return { ...s, name: p?.username || 'Friend', avatar_url: p?.avatar_url || null, preview_items: itemsByList.get(s.id) || [] };
        }
        const g: any = s.group_id ? grpMap.get(s.group_id) : null;
        return { ...s, name: g?.name || 'Group', avatar_url: g?.avatar_url || null, emoji: g?.emoji || '👯', preview_items: itemsByList.get(s.id) || [] };
      });
    },
  });
}

export function useLinkBucketItemToEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { itemId: string; eventId: string }) => {
      const { error } = await (supabase as any)
        .from('bucket_list_items')
        .update({ linked_event_id: args.eventId })
        .eq('id', args.itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bucket-list-items'] });
      qc.invalidateQueries({ queryKey: ['my-bucket-lists'] });
    },
  });
}