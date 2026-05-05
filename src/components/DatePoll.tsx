import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { Check, X, CalendarCheck, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  canManage: boolean;
  pollDeadline?: string | null;
  participantProfiles: Record<string, { username: string; avatar_url: string | null }>;
  onConfirmed?: () => void;
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
function fmtTime(t: string) {
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export function DatePoll({ eventId, userId, canManage, pollDeadline, participantProfiles, onConfirmed }: Props) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState<DateOption | null>(null);
  const [busy, setBusy] = useState(false);

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

  const handleVote = async (optionId: string, value: 'yes' | 'no') => {
    if (!userId || pollClosed) return;
    const existing = votes.find(v => v.date_option_id === optionId && v.user_id === userId);
    if (existing && existing.vote === value) {
      // toggle off
      const { error } = await supabase.from('event_date_votes').delete().eq('id', existing.id);
      if (error) { toast.error(error.message); return; }
    } else if (existing) {
      const { error } = await supabase.from('event_date_votes').update({ vote: value }).eq('id', existing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from('event_date_votes').insert({
        date_option_id: optionId,
        user_id: userId,
        vote: value,
      });
      if (error) { toast.error(error.message); return; }
    }
    queryClient.invalidateQueries({ queryKey: ['date-votes', eventId] });
  };

  const handleConfirm = async () => {
    if (!confirming) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({
          date: confirming.proposed_date,
          time: confirming.start_time,
          end_time: confirming.end_time,
          date_confirmed: true,
        } as any)
        .eq('id', eventId);
      if (error) { toast.error(error.message); return; }

      // Notify all participants
      const participantIds = Object.keys(participantProfiles).filter(id => id !== userId);
      if (participantIds.length > 0) {
        await supabase.from('activity_feed').insert(
          participantIds.map(uid => ({
            user_id: uid,
            type: 'date_confirmed',
            event_id: eventId,
            source_user_id: userId,
          }))
        );
      }
      toast.success('Date confirmed! 🎉');
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setConfirming(null);
      onConfirmed?.();
    } finally {
      setBusy(false);
    }
  };

  if (options.length === 0) return null;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Vote on a date
        </h2>
        {pollClosed && (
          <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            <Lock className="h-3 w-3" /> Closed
          </span>
        )}
      </div>
      {pollDeadline && !pollClosed && (
        <p className="mb-3 text-xs text-muted-foreground">
          Voting closes on {fmtDate(pollDeadline)}
        </p>
      )}
      <div className="flex flex-col gap-2">
        {options.map((opt, i) => {
          const optVotes = votes.filter(v => v.date_option_id === opt.id);
          const yesVotes = optVotes.filter(v => v.vote === 'yes');
          const myVote = optVotes.find(v => v.user_id === userId)?.vote;
          return (
            <motion.div
              key={opt.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl bg-card p-3 shadow-card space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{fmtDate(opt.proposed_date)}</p>
                  {opt.start_time && (
                    <p className="text-xs text-muted-foreground">
                      {fmtTime(opt.start_time)}
                      {opt.end_time && ` – ${fmtTime(opt.end_time)}`}
                    </p>
                  )}
                </div>
                {canManage && !pollClosed && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 text-xs"
                    onClick={() => setConfirming(opt)}
                  >
                    <CalendarCheck className="h-3 w-3" /> Confirm
                  </Button>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {yesVotes.slice(0, 5).map(v => {
                    const p = participantProfiles[v.user_id];
                    return (
                      <UserAvatar
                        key={v.id}
                        avatarUrl={p?.avatar_url || null}
                        username={p?.username || '?'}
                        size="sm"
                        className="h-6 w-6 text-[10px] ring-2 ring-card -ml-1 first:ml-0"
                      />
                    );
                  })}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {yesVotes.length} {yesVotes.length === 1 ? 'yes' : 'yeses'}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={pollClosed || !userId}
                    onClick={() => handleVote(opt.id, 'yes')}
                    className={cn(
                      'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all disabled:opacity-50',
                      myVote === 'yes'
                        ? 'bg-status-confirmed/15 text-status-confirmed ring-2 ring-status-confirmed/40'
                        : 'bg-secondary text-muted-foreground hover:bg-status-confirmed/10 hover:text-status-confirmed',
                    )}
                    title="Works for me"
                  >
                    <Check className="h-3 w-3" /> Works
                  </button>
                  <button
                    type="button"
                    disabled={pollClosed || !userId}
                    onClick={() => handleVote(opt.id, 'no')}
                    className={cn(
                      'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all disabled:opacity-50',
                      myVote === 'no'
                        ? 'bg-destructive/15 text-destructive ring-2 ring-destructive/40'
                        : 'bg-secondary text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
                    )}
                    title="Doesn't work"
                  >
                    <X className="h-3 w-3" /> Can't
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AlertDialog open={!!confirming} onOpenChange={o => !o && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Set {confirming && fmtDate(confirming.proposed_date)} as the confirmed date?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This closes the poll and notifies everyone. You can edit the date later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleConfirm(); }}
              disabled={busy}
            >
              {busy ? 'Confirming...' : 'Confirm date'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}