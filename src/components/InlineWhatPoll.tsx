import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ThumbsUp, ThumbsDown, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/UserAvatar';

interface WhatOption {
  id: string;
  event_id: string;
  title: string;
  link: string | null;
  suggested_by: string;
}
interface WhatVote {
  id: string;
  what_option_id: string;
  user_id: string;
  vote: 'yes' | 'no';
}

interface Props {
  eventId: string;
  userId: string | null;
  participantProfiles: Record<string, { username?: string; avatar_url?: string | null }>;
  totalEligible: number;
}

export function InlineWhatPoll({ eventId, userId, participantProfiles, totalEligible }: Props) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const { data: options = [] } = useQuery({
    queryKey: ['what-options', eventId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('event_what_options')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at');
      return (data || []) as WhatOption[];
    },
  });

  const { data: votes = [] } = useQuery({
    queryKey: ['what-votes', eventId],
    queryFn: async () => {
      if (options.length === 0) return [];
      const { data } = await (supabase as any)
        .from('event_what_votes')
        .select('*')
        .in('what_option_id', options.map(o => o.id));
      return (data || []) as WhatVote[];
    },
    enabled: options.length > 0,
  });

  if (options.length === 0) return null;

  const handleVote = async (e: React.MouseEvent, optionId: string, value: 'yes' | 'no') => {
    e.stopPropagation();
    if (!userId) return;
    const existing = votes.find(v => v.what_option_id === optionId && v.user_id === userId);
    if (existing && existing.vote === value) {
      const { error } = await (supabase as any).from('event_what_votes').delete().eq('id', existing.id);
      if (error) { toast.error(error.message); return; }
    } else if (existing) {
      const { error } = await (supabase as any).from('event_what_votes').update({ vote: value }).eq('id', existing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await (supabase as any).from('event_what_votes').insert({
        what_option_id: optionId, user_id: userId, vote: value,
      });
      if (error) { toast.error(error.message); return; }
    }
    qc.invalidateQueries({ queryKey: ['what-votes', eventId] });
  };

  const visible = expanded ? options : options.slice(0, 3);

  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Vote on what
      </p>
      {visible.map(opt => {
        const optVotes = votes.filter(v => v.what_option_id === opt.id);
        const yesVotes = optVotes.filter(v => v.vote === 'yes');
        const myVote = optVotes.find(v => v.user_id === userId)?.vote;
        return (
          <div
            key={opt.id}
            className="rounded-xl border border-border/60 bg-background/60 p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex items-center gap-1.5">
                <p className="text-xs font-semibold text-foreground truncate">{opt.title}</p>
                {opt.link && (
                  <a
                    href={opt.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-primary"
                    aria-label="Open link"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={!userId}
                  onClick={(e) => handleVote(e, opt.id, 'yes')}
                  className={cn(
                    'flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold transition-all disabled:opacity-50',
                    myVote === 'yes'
                      ? 'bg-status-confirmed/15 text-status-confirmed ring-2 ring-status-confirmed/40'
                      : 'bg-secondary text-muted-foreground hover:bg-status-confirmed/10 hover:text-status-confirmed',
                  )}
                >
                  <ThumbsUp className="h-3 w-3" /> Yes
                </button>
                <button
                  type="button"
                  disabled={!userId}
                  onClick={(e) => handleVote(e, opt.id, 'no')}
                  className={cn(
                    'flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold transition-all disabled:opacity-50',
                    myVote === 'no'
                      ? 'bg-destructive/15 text-destructive ring-2 ring-destructive/40'
                      : 'bg-secondary text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
                  )}
                >
                  <ThumbsDown className="h-3 w-3" /> No
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