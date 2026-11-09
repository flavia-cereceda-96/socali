import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DbEventWithCreator } from '@/hooks/useEvents';
import { mascotSuccessToast } from '@/components/MascotToast';
import { maybeShowPushPrompt } from '@/lib/pushPrompt';

interface PollRow { eventId: string; title: string; kind: 'date' | 'what'; voted: number; total: number }

function useOpenPolls(events: DbEventWithCreator[], userId: string | null) {
  const dateIds = events.filter(e => (e as any).date_confirmed === false || !e.date).map(e => e.id);
  const whatIds = events.filter(e => !(e as any).confirmed_what_option_id).map(e => e.id);
  return useQuery({
    queryKey: ['home-open-polls', userId, dateIds.join(','), whatIds.join(',')],
    enabled: !!userId && (dateIds.length > 0 || whatIds.length > 0),
    queryFn: async (): Promise<PollRow[]> => {
      const rows: PollRow[] = [];
      const byId = Object.fromEntries(events.map(e => [e.id, e]));
      const total = (e: DbEventWithCreator) => e.participants.length + 1;
      const today = new Date();

      if (dateIds.length) {
        const { data: opts } = await supabase.from('event_date_options').select('id,event_id').in('event_id', dateIds);
        if (opts?.length) {
          const { data: votes } = await supabase.from('event_date_votes').select('date_option_id,user_id').in('date_option_id', opts.map(o => o.id));
          const optEvent = Object.fromEntries(opts.map(o => [o.id, o.event_id]));
          [...new Set(opts.map(o => o.event_id))].forEach(eid => {
            const e = byId[eid];
            const dl = (e as any).poll_deadline;
            if (dl && new Date(dl + 'T23:59:59') < today) return;
            const voters = new Set((votes || []).filter(v => optEvent[v.date_option_id] === eid).map(v => v.user_id));
            if (voters.has(userId!)) return;
            rows.push({ eventId: eid, title: e.title, kind: 'date', voted: voters.size, total: total(e) });
          });
        }
      }
      if (whatIds.length) {
        const { data: opts } = await (supabase as any).from('event_what_options').select('id,event_id').in('event_id', whatIds);
        if (opts?.length) {
          const { data: votes } = await (supabase as any).from('event_what_votes').select('what_option_id,user_id').in('what_option_id', opts.map((o: any) => o.id));
          const optEvent = Object.fromEntries(opts.map((o: any) => [o.id, o.event_id]));
          [...new Set<string>(opts.map((o: any) => o.event_id))].forEach(eid => {
            const e = byId[eid];
            const voters = new Set((votes || []).filter((v: any) => optEvent[v.what_option_id] === eid).map((v: any) => v.user_id));
            if (voters.has(userId!)) return;
            rows.push({ eventId: eid, title: e.title, kind: 'what', voted: voters.size, total: total(e) });
          });
        }
      }
      return rows;
    },
  });
}

export function NeedsYouCard({ events, userId }: { events: DbEventWithCreator[]; userId: string | null }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const { data: polls = [] } = useOpenPolls(events, userId);

  const invites = events
    .map(e => ({ e, me: e.participants.find(p => p.user_id === userId) }))
    .filter(x => x.me && (x.me.status === 'pending' || x.me.status === 'suggested'));

  const n = invites.length + polls.length;
  if (n === 0) return null;

  const rsvp = async (participantId: string, value: 'confirmed' | 'declined') => {
    setBusy(participantId);
    const { error } = await supabase.from('event_participants').update({ status: value }).eq('id', participantId);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    if (value === 'confirmed') mascotSuccessToast("You're in! 🎉"); else toast.success('RSVP updated');
    void maybeShowPushPrompt();
    qc.invalidateQueries({ queryKey: ['events'] });
  };

  return (
    <section
      className="mb-6 rounded-3xl border p-4"
      style={{ backgroundColor: 'hsl(var(--accent-soft))', borderColor: '#DDEFA0' }}
    >
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-accent-soft-foreground">Needs you · {n}</p>
      <ul className="divide-y divide-[#DDEFA0]">
        {invites.map(({ e, me }) => (
          <li key={e.id} className="py-3 first:pt-0 last:pb-0">
            <button onClick={() => navigate(`/event/${e.id}`)} className="block text-left">
              <p className="font-semibold text-foreground">{e.title}</p>
              <p className="text-sm text-muted-foreground">
                {e.creator_profile?.username || 'Someone'} invited you. Are you in?
              </p>
            </button>
            <div className="mt-2 flex gap-2">
              <button
                disabled={busy === me!.id}
                onClick={() => rsvp(me!.id, 'confirmed')}
                className="rounded-full bg-foreground px-4 py-1.5 text-sm font-semibold text-background disabled:opacity-60"
              >
                Going
              </button>
              <button
                disabled={busy === me!.id}
                onClick={() => rsvp(me!.id, 'declined')}
                className="rounded-full border border-foreground/30 px-4 py-1.5 text-sm font-semibold text-foreground disabled:opacity-60"
              >
                Can't
              </button>
            </div>
          </li>
        ))}
        {polls.map(p => (
          <li key={`${p.kind}-${p.eventId}`} className="py-3 first:pt-0 last:pb-0">
            <button onClick={() => navigate(`/event/${p.eventId}`)} className="flex w-full items-center gap-3 text-left">
              <div className="flex-1">
                <p className="font-semibold text-foreground">{p.title}</p>
                <p className="text-sm text-muted-foreground">
                  {p.kind === 'date' ? 'Vote on a date' : 'Vote on what to do'} · {p.voted} of {p.total} voted
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
