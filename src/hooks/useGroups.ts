import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DbProfile } from './useEvents';

export interface DbGroup {
  id: string;
  name: string;
  emoji: string;
  created_by: string;
  created_at: string;
  member_count: number;
}

export interface DbGroupWithMembers extends DbGroup {
  members: DbProfile[];
}

/** All groups the current user belongs to, with member counts. */
export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: async (): Promise<DbGroup[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get groups I'm a member of
      const { data: myMemberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      const groupIds = (myMemberships || []).map(m => m.group_id);
      if (groupIds.length === 0) return [];

      const { data: groups } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds)
        .order('created_at', { ascending: false });

      // Member counts
      const { data: allMembers } = await supabase
        .from('group_members')
        .select('group_id')
        .in('group_id', groupIds);

      const counts: Record<string, number> = {};
      (allMembers || []).forEach(m => {
        counts[m.group_id] = (counts[m.group_id] || 0) + 1;
      });

      return (groups || []).map(g => ({
        ...g,
        member_count: counts[g.id] || 0,
      }));
    },
  });
}

/** A single group with its full member profile list. */
export function useGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group', groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<DbGroupWithMembers | null> => {
      if (!groupId) return null;

      const { data: group, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (error || !group) return null;

      const { data: memberRows } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);

      const userIds = (memberRows || []).map(m => m.user_id);
      let members: DbProfile[] = [];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', userIds);
        members = (profiles || []) as DbProfile[];
      }

      return {
        ...group,
        member_count: members.length,
        members,
      };
    },
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, emoji, memberIds }: { name: string; emoji: string; memberIds: string[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: group, error } = await supabase
        .from('groups')
        .insert({ name: name.trim(), emoji, created_by: user.id })
        .select()
        .single();

      if (error || !group) throw error;

      // Trigger auto-adds creator. Insert remaining members (skip creator).
      const others = memberIds.filter(id => id !== user.id);
      if (others.length > 0) {
        const { error: memErr } = await supabase
          .from('group_members')
          .insert(others.map(uid => ({ group_id: group.id, user_id: uid })));
        if (memErr) throw memErr;
      }

      return group;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useAddGroupMembers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userIds }: { groupId: string; userIds: string[] }) => {
      if (userIds.length === 0) return;
      const { error } = await supabase
        .from('group_members')
        .insert(userIds.map(uid => ({ group_id: groupId, user_id: uid })));
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['group', vars.groupId] });
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useRemoveGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['group', vars.groupId] });
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.from('groups').delete().eq('id', groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

/** Returns a map: eventId -> group hint (if ≥80% of participants share one group) */
export function useEventGroupHints(eventIds: string[], participantsByEvent: Record<string, string[]>) {
  return useQuery({
    queryKey: ['event-group-hints', eventIds.join(',')],
    enabled: eventIds.length > 0,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {};

      // Fetch my groups
      const { data: myMemberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      const groupIds = (myMemberships || []).map(m => m.group_id);
      if (groupIds.length === 0) return {};

      const { data: groups } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds);

      const { data: members } = await supabase
        .from('group_members')
        .select('group_id, user_id')
        .in('group_id', groupIds);

      const groupMembers: Record<string, Set<string>> = {};
      (members || []).forEach(m => {
        if (!groupMembers[m.group_id]) groupMembers[m.group_id] = new Set();
        groupMembers[m.group_id].add(m.user_id);
      });

      const hints: Record<string, { id: string; name: string; emoji: string } | null> = {};
      for (const eventId of eventIds) {
        const partIds = participantsByEvent[eventId] || [];
        if (partIds.length < 2) { hints[eventId] = null; continue; }

        let bestMatch: { id: string; name: string; emoji: string; ratio: number } | null = null;
        for (const g of (groups || [])) {
          const memberSet = groupMembers[g.id] || new Set();
          const inGroup = partIds.filter(id => memberSet.has(id)).length;
          const ratio = inGroup / partIds.length;
          // Need ≥80% of participants in group AND group covers ≥half its members AND ≥2 matches
          if (ratio >= 0.8 && inGroup >= 2 && (!bestMatch || ratio > bestMatch.ratio)) {
            bestMatch = { id: g.id, name: g.name, emoji: g.emoji, ratio };
          }
        }
        hints[eventId] = bestMatch ? { id: bestMatch.id, name: bestMatch.name, emoji: bestMatch.emoji } : null;
      }

      return hints;
    },
  });
}
