import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type WeekStart = 'monday' | 'sunday';

/** Hook returning the user's preferred week start day. Defaults to 'monday'. */
export function useWeekStart(): WeekStart {
  const { data } = useQuery({
    queryKey: ['week-starts-on'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 'monday' as WeekStart;
      const { data } = await supabase
        .from('profiles')
        .select('week_starts_on')
        .eq('user_id', user.id)
        .maybeSingle();
      return ((data?.week_starts_on as WeekStart) || 'monday') as WeekStart;
    },
    staleTime: 60 * 1000,
  });
  return data || 'monday';
}

/** 0=Sunday ... 6=Saturday — index in JS Date.getDay() */
export const weekStartIndex = (ws: WeekStart) => (ws === 'sunday' ? 0 : 1);

/** Day labels in display order, starting from the chosen week start. */
export const weekDayLabels = (ws: WeekStart): string[] => {
  const all = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return ws === 'sunday' ? all : [...all.slice(1), all[0]];
};