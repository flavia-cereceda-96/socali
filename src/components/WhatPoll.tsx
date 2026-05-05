import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/UserAvatar';
import { Check, X, ThumbsUp, ThumbsDown, Plus, ExternalLink, Trash2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface WhatOption {
  id: string;
  event_id: string;
  title: string;
  link: string | null;
  suggested_by: string;
  created_at: string;
}
export interface WhatVote {
  id: string;
  what_option_id: string;
  user_id: string;
  vote: 'yes' | 'no';
}

interface Props {
  eventId: string;
  userId: string | null;
  canManage: boolean;
  organizerId: string;
  confirmedOptionId?: string | null;
  participantProfiles: Record<string, { username?: string; avatar_url?: string | null }>;
  onConfirmed?: () => void;
}

function normalizeUrl(u: string): string | null {
  const trimmed = u.trim();
  if (!trimmed) return null;
  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;
  try { return new URL(candidate).toString(); } catch { return null; }
}

export function WhatPoll({
  eventId, userId, canManage, organizerId, confirmedOptionId, participantProfiles, onConfirmed,
}: Props) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLink, setNewLink] = useState('');
  const [busyAdd, setBusyAdd] = useState(false);
  const [confirming, setConfirming] = useState<WhatOption | null>(null);
  const [busyConfirm, setBusyConfirm] = useState(false);

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

  if (options.length === 0 && !confirmedOptionId) {
    return (
      <SuggestForm
        userId={userId} eventId={eventId}
        title={newTitle} setTitle={setNewTitle}
        link={newLink} setLink={setNewLink}
        adding={adding} setAdding={setAdding}
        busy={busyAdd} setBusy={setBusyAdd}
        onAdded={() => qc.invalidateQueries({ queryKey: ['what-options', eventId] })}
        sectionTitle
      />
    );
  }

  const isConfirmed = !!confirmedOptionId;

  const vote = async (optionId: string, value: 'yes' | 'no') => {
    if (!userId || isConfirmed) return;
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

  const removeOption = async (opt: WhatOption) => {
    const { error } = await (supabase as any).from('event_what_options').delete().eq('id', opt.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ['what-options', eventId] });
    qc.invalidateQueries({ queryKey: ['what-votes', eventId] });
  };

  const handleConfirm = async () => {
    if (!confirming) return;
    setBusyConfirm(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({ confirmed_what_option_id: confirming.id } as any)
        .eq('id', eventId);
      if (error) { toast.error(error.message); return; }

      const recipientIds = Object.keys(participantProfiles).filter(id => id !== userId);
      if (recipientIds.length > 0) {
        await supabase.from('activity_feed').insert(
          recipientIds.map(uid => ({
            user_id: uid,
            type: 'what_confirmed',
            event_id: eventId,
            source_user_id: userId,
          }))
        );
      }
      toast.success("Activity confirmed! 🎉");
      qc.invalidateQueries({ queryKey: ['events'] });
      setConfirming(null);
      onConfirmed?.();
    } finally {
      setBusyConfirm(false);
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {isConfirmed ? 'Confirmed activity' : 'Vote on what to do'}
        </h2>
      </div>

      <div className="flex flex-col gap-2">
        {options.map((opt, i) => {
          const optVotes = votes.filter(v => v.what_option_id === opt.id);
          const yesVotes = optVotes.filter(v => v.vote === 'yes');
          const myVote = optVotes.find(v => v.user_id === userId)?.vote;
          const suggester = opt.suggested_by !== organizerId
            ? participantProfiles[opt.suggested_by]?.username
            : null;
          const isWinner = confirmedOptionId === opt.id;

          return (
            <motion.div
              key={opt.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                'rounded-2xl bg-card p-3 shadow-card space-y-2',
                isWinner && 'ring-2 ring-primary'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{opt.title}</p>
                  {opt.link && (
                    <a
                      href={opt.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Open link
                    </a>
                  )}
                  {suggester && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Suggested by @{suggester}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {canManage && !isConfirmed && (
                    <Button
                      size="sm" variant="outline" className="h-7 gap-1 text-xs"
                      onClick={() => setConfirming(opt)}
                    >
                      <Check className="h-3 w-3" /> Select this
                    </Button>
                  )}
                  {!isConfirmed && (canManage || opt.suggested_by === userId) && (
                    <button
                      onClick={() => removeOption(opt)}
                      className="text-muted-foreground hover:text-destructive p-1"
                      aria-label="Remove option"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {!isConfirmed && (
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
                      disabled={!userId}
                      onClick={() => vote(opt.id, 'yes')}
                      className={cn(
                        'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all disabled:opacity-50',
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
                      onClick={() => vote(opt.id, 'no')}
                      className={cn(
                        'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all disabled:opacity-50',
                        myVote === 'no'
                          ? 'bg-destructive/15 text-destructive ring-2 ring-destructive/40'
                          : 'bg-secondary text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
                      )}
                    >
                      <ThumbsDown className="h-3 w-3" /> No
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {!isConfirmed && (
        <div className="mt-3">
          <SuggestForm
            userId={userId} eventId={eventId}
            title={newTitle} setTitle={setNewTitle}
            link={newLink} setLink={setNewLink}
            adding={adding} setAdding={setAdding}
            busy={busyAdd} setBusy={setBusyAdd}
            onAdded={() => qc.invalidateQueries({ queryKey: ['what-options', eventId] })}
          />
        </div>
      )}

      <AlertDialog open={!!confirming} onOpenChange={o => !o && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Set "{confirming?.title}" as the confirmed activity for this event?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This closes the poll and notifies everyone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyConfirm}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleConfirm(); }}
              disabled={busyConfirm}
            >
              {busyConfirm ? 'Confirming…' : 'Confirm activity'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SuggestForm({
  userId, eventId, title, setTitle, link, setLink,
  adding, setAdding, busy, setBusy, onAdded, sectionTitle,
}: {
  userId: string | null;
  eventId: string;
  title: string; setTitle: (s: string) => void;
  link: string; setLink: (s: string) => void;
  adding: boolean; setAdding: (b: boolean) => void;
  busy: boolean; setBusy: (b: boolean) => void;
  onAdded: () => void;
  sectionTitle?: boolean;
}) {
  const submit = async () => {
    if (!userId || !title.trim()) return;
    setBusy(true);
    try {
      const normalized = link ? normalizeUrl(link) : null;
      if (link && !normalized) { toast.error('Invalid link'); return; }
      const { error } = await (supabase as any).from('event_what_options').insert({
        event_id: eventId, title: title.trim(), link: normalized, suggested_by: userId,
      });
      if (error) { toast.error(error.message); return; }
      setTitle(''); setLink(''); setAdding(false);
      onAdded();
    } finally { setBusy(false); }
  };
  if (!userId) return null;
  return (
    <div>
      {sectionTitle && (
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3 w-3" /> Suggest what to do
        </h2>
      )}
      {adding ? (
        <div className="rounded-2xl border border-border bg-card p-3 shadow-card space-y-2">
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Dinner at Café Bloom" />
          <Input value={link} onChange={e => setLink(e.target.value)} placeholder="Optional link (https://…)" />
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)} className="flex-1">Cancel</Button>
            <Button size="sm" onClick={submit} disabled={!title.trim() || busy} className="flex-1">
              {busy ? 'Adding…' : 'Suggest'}
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5" /> Suggest an option
        </Button>
      )}
    </div>
  );
}