import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/UserAvatar';

interface DateOption {
  id: string;
  proposed_date: string;
  start_time: string | null;
  end_time: string | null;
}
interface DateVote {
  id: string;
  date_option_id: string;
  user_id: string;
  vote: 'yes' | 'no';
}

interface Props {
  eventId: string;
  userId: string | null;
  pollDeadline?: string | null;
  participantProfiles: Record<string, { username?: string; avatar_url?: string | null }>;
  totalEligible: number;
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}
function fmtTime(t: string) {
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export function InlineDatePoll({ eventId, userId, pollDeadline, participantProfiles, totalEligible }: Props) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const pollClosed = !!pollDeadline && new Date(pollDeadline + 'T23:59:59') < new Date();

  const { data: options = [] } = useQuery({
    queryKey: ['date-options', eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from('event_date_options')
        .select('*')
        .eq('event_id', eventId)
        .order('proposed_date');
      return (data || []) as DateOption[];
    },
  });

  const { data: votes = [] } = useQuery({
    queryKey: ['date-votes', eventId],
    queryFn: async () => {
      if (options.length === 0) return [];
      const { data } = await supabase
        .from('event_date_votes')
        .select('*')
        .in('date_option_id', options.map(o => o.id));
      return (data || []) as DateVote[];
    },
    enabled: options.length > 0,
  });

  if (options.length === 0) return null;

  const handleVote = async (e: React.MouseEvent, optionId: string, value: 'yes' | 'no') => {
    e.stopPropagation();
    if (!userId || pollClosed) return;
    const existing = votes.find(v => v.date_option_id === optionId && v.user_id === userId);
    if (existing && existing.vote === value) {
      const { error } = await supabase.from('event_date_votes').delete().eq('id', existing.id);
      if (error) { toast.error(error.message); return; }
    } else if (existing) {
      const { error } = await supabase.from('event_date_votes').update({ vote: value }).eq('id', existing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from('event_date_votes').insert({
        date_option_id: optionId, user_id: userId, vote: value,
      });
      if (error) { toast.error(error.message); return; }
    }
    qc.invalidateQueries({ queryKey: ['date-votes', eventId] });
  };

  const visible = expanded ? options : options.slice(0, 3);

  return (
    <div className="mt-2 space-y-1.5">
      {visible.map(opt => {
        const optVotes = votes.filter(v => v.date_option_id === opt.id);
        const yesVotes = optVotes.filter(v => v.vote === 'yes');
        const myVote = optVotes.find(v => v.user_id === userId)?.vote;
        return (
          <div
            key={opt.id}
            className="rounded-xl border border-border/60 bg-background/60 p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">{fmtDate(opt.proposed_date)}</p>
                {opt.start_time && (
                  <p className="text-[10px] text-muted-foreground">
                    {fmtTime(opt.start_time)}{opt.end_time && ` – ${fmtTime(opt.end_time)}`}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={pollClosed || !userId}
                  onClick={(e) => handleVote(e, opt.id, 'yes')}
                  className={cn(
                    'flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold transition-all disabled:opacity-50',
                    myVote === 'yes'
                      ? 'bg-status-confirmed/15 text-status-confirmed ring-2 ring-status-confirmed/40'
                      : 'bg-secondary text-muted-foreground hover:bg-status-confirmed/10 hover:text-status-confirmed',
                  )}
                  aria-label="Works for me"
                >
                  <Check className="h-3 w-3" /> Works
                </button>
                <button
                  type="button"
                  disabled={pollClosed || !userId}
                  onClick={(e) => handleVote(e, opt.id, 'no')}
                  className={cn(
                    'flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold transition-all disabled:opacity-50',
                    myVote === 'no'
                      ? 'bg-destructive/15 text-destructive ring-2 ring-destructive/40'
                      : 'bg-secondary text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
                  )}
                  aria-label="Doesn't work"
                >
                  <X className="h-3 w-3" /> Can't
                </button>
              </div>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="flex items-center">
                {yesVotes.slice(0, 4).map(v => {
                  const p = participantProfiles[v.user_id];
                  return (
                    <UserAvatar
                      key={v.id}
                      avatarUrl={p?.avatar_url || null}
                      username={p?.username || '?'}
                      size="sm"
                      className="h-4 w-4 text-[8px] ring-2 ring-card -ml-1 first:ml-0"
                    />
                  );
                })}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {yesVotes.length} of {totalEligible} said yes
              </span>
            </div>
          </div>
        );
      })}
      {options.length > 3 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
          className="text-[11px] font-semibold text-primary hover:underline"
        >
          {expanded ? 'Show less' : `See all ${options.length} options`}
        </button>
      )}
    </div>
  );
}