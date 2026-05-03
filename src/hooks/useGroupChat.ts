import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GroupMessage {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: { username: string; avatar_url: string | null };
}

export function useGroupMessages(groupId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!groupId) return;
    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
        () => {
          qc.invalidateQueries({ queryKey: ['group-messages', groupId] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, qc]);

  return useQuery({
    queryKey: ['group-messages', groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<GroupMessage[]> => {
      if (!groupId) return [];
      const { data: msgs, error } = await supabase
        .from('group_messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw error;
      const userIds = [...new Set((msgs || []).map(m => m.user_id))];
      let profileMap = new Map<string, { username: string; avatar_url: string | null }>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', userIds);
        (profiles || []).forEach((p: any) => profileMap.set(p.user_id, { username: p.username, avatar_url: p.avatar_url }));
      }
      return (msgs || []).map(m => ({ ...m, author: profileMap.get(m.user_id) }));
    },
  });
}

export function useSendGroupMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, content }: { groupId: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');
      const trimmed = content.trim();
      if (!trimmed) return;
      const { error } = await supabase
        .from('group_messages')
        .insert({ group_id: groupId, user_id: user.id, content: trimmed });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['group-messages', vars.groupId] });
    },
  });
}
