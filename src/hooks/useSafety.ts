import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useBlocks() {
  return useQuery({ queryKey: ['user-blocks'], queryFn: async () => {
    const { data, error } = await supabase.from('user_blocks').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } });
}

export function useSafetyActions() {
  const qc = useQueryClient();
  const refresh = async () => { await qc.invalidateQueries(); };
  const block = async (userId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Sign in required');
    const { error } = await supabase.from('user_blocks').upsert({ blocker_id: user.id, blocked_user_id: userId }, { onConflict: 'blocker_id,blocked_user_id', ignoreDuplicates: true });
    if (error) throw error;
    await refresh();
  };
  const unblock = async (id: string) => {
    const { error } = await supabase.from('user_blocks').delete().eq('id', id);
    if (error) throw error;
    await refresh();
  };
  return { block, unblock, refresh };
}