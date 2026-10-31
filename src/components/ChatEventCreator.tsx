import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mic, MicOff, Send, X, Plus, Check, CalendarDays, Clock, Users, Pencil, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DbProfile } from '@/hooks/useEvents';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export type ChatDraft = {
  title: string;
  emoji: string;
  date: string;
  startTime: string;
  endTime: string;
  noTime: boolean;
  friends: DbProfile[];
};

type Msg = { role: 'bot' | 'user'; text: string };

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return toISO(d); };
const nextSaturday = () => { const d = new Date(); const diff = (6 - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + diff); return toISO(d); };

const prettyDate = (iso: string) =>
  iso ? new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : '';
const prettyTime = (t: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const d = new Date(); d.setHours(h, m);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

type Stage = 'start' | 'title' | 'date' | 'time' | 'friends' | 'confirm';

interface Props {
  friends: DbProfile[];
  initial?: Partial<ChatDraft>;
  submitting: boolean;
  onCreate: (d: ChatDraft) => void;
  onMoreDetails: (d: ChatDraft) => void;
}

export function ChatEventCreator({ friends, initial, submitting, onCreate, onMoreDetails }: Props) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ChatDraft>({
    title: initial?.title || '', emoji: initial?.emoji || '🎉', date: initial?.date || '',
    startTime: '', endTime: '', noTime: false, friends: initial?.friends || [],
  });
  const [friendsAsked, setFriendsAsked] = useState(false);
  const [started, setStarted] = useState(!!initial?.title);
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'bot', text: initial?.title ? `Let's plan ${initial.emoji || ''} ${initial.title}!` : "Hey! What are you planning? Tell me in your own words — e.g. “Dinner with Maya next Friday at 7”." },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [friendQuery, setFriendQuery] = useState('');
  const recRef = useRef<any>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const stage: Stage = !started ? 'start'
    : !draft.title.trim() ? 'title'
    : !draft.date ? 'date'
    : !draft.startTime && !draft.noTime ? 'time'
    : !friendsAsked ? 'friends'
    : 'confirm';

  const prompts: Record<Stage, string> = {
    start: '',
    title: 'What should we call it?',
    date: 'What day is it happening?',
    time: 'What time? Or skip it and it’ll just show on that day.',
    friends: draft.friends.length ? 'Want to invite anyone else?' : 'Who do you want to invite?',
    confirm: 'Here’s your plan — please double-check everything, especially who’s invited, before I send the invites.',
  };

  // Post a bot prompt whenever the stage changes
  const lastStage = useRef<Stage>('start');
  useEffect(() => {
    if (stage === lastStage.current || stage === 'start') return;
    lastStage.current = stage;
    setMessages(m => [...m, { role: 'bot', text: prompts[stage] }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, stage, thinking]);

  const speechSupported = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const toggleMic = () => {
    if (listening) { recRef.current?.stop(); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error('Voice input isn’t supported in this browser'); return; }
    const rec = new SR();
    rec.lang = navigator.language || 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    const base = input ? input + ' ' : '';
    rec.onresult = (e: any) => {
      let t = '';
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setInput(base + t);
    };
    rec.onerror = (e: any) => { if (e.error !== 'aborted') toast.error('Couldn’t hear you — try again'); };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  const say = (text: string) => setMessages(m => [...m, { role: 'user', text }]);

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || thinking) return;
    recRef.current?.stop();
    setInput('');
    say(text);
    setStarted(true);

    // Title stage with a plain short answer: take it literally
    if (stage === 'title' && text.split(' ').length <= 6) {
      setDraft(d => ({ ...d, title: text }));
      return;
    }

    setThinking(true);
    try {
      const now = new Date();
      const { data, error } = await supabase.functions.invoke('parse-event', {
        body: {
          text,
          today: toISO(now),
          weekday: now.toLocaleDateString('en-US', { weekday: 'long' }),
          friends: friends.map(f => ({ id: f.user_id, username: f.username })),
          current: { title: draft.title, date: draft.date, start_time: draft.startTime, asking_for: stage },
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      const matched = friends.filter(f => (data.friend_ids || []).includes(f.user_id));
      setDraft(d => ({
        ...d,
        title: data.title || d.title,
        emoji: data.emoji || d.emoji,
        date: data.date || d.date,
        startTime: data.start_time || d.startTime,
        endTime: data.end_time || d.endTime,
        noTime: data.no_time ? true : d.noTime,
        friends: [...d.friends, ...matched.filter(m => !d.friends.some(x => x.user_id === m.user_id))],
      }));
      const bits: string[] = [];
      if (data.title) bits.push(`${data.emoji || ''} ${data.title}`.trim());
      if (data.date) bits.push(prettyDate(data.date));
      if (data.start_time) bits.push(prettyTime(data.start_time));
      if (matched.length) bits.push(`with ${matched.map(m => m.username).join(', ')}`);
      if (bits.length) setMessages(m => [...m, { role: 'bot', text: `Got it: ${bits.join(' · ')}` }]);
      if (data.unmatched_names?.length) {
        setMessages(m => [...m, { role: 'bot', text: `I couldn’t find ${data.unmatched_names.join(', ')} in your friends — pick them below if they’re there.` }]);
      }
    } catch (e: any) {
      if (stage === 'title' || !draft.title) setDraft(d => ({ ...d, title: d.title || text.slice(0, 60) }));
      setMessages(m => [...m, { role: 'bot', text: 'Hmm, I couldn’t read all of that — let’s go step by step.' }]);
    } finally {
      setThinking(false);
    }
  };

  const pickDate = (iso: string, label: string) => { say(label); setDraft(d => ({ ...d, date: iso })); };
  const pickNoTime = () => { say('No specific time'); setDraft(d => ({ ...d, noTime: true, startTime: '', endTime: '' })); };
  const toggleFriend = (f: DbProfile) =>
    setDraft(d => ({ ...d, friends: d.friends.some(x => x.user_id === f.user_id) ? d.friends.filter(x => x.user_id !== f.user_id) : [...d.friends, f] }));
  const doneFriends = () => {
    say(draft.friends.length ? `Invite ${draft.friends.map(f => f.username).join(', ')}` : 'Just me for now');
    setFriendsAsked(true);
  };

  const filteredFriends = useMemo(() => {
    const q = friendQuery.trim().toLowerCase();
    return friends.filter(f => !q || f.username.toLowerCase().includes(q)).slice(0, 30);
  }, [friends, friendQuery]);

  const FriendPicker = (
    <div className="space-y-2">
      <Input value={friendQuery} onChange={e => setFriendQuery(e.target.value)} placeholder="Search friends" className="h-9" />
      <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
        {filteredFriends.map(f => {
          const on = draft.friends.some(x => x.user_id === f.user_id);
          return (
            <button key={f.user_id} onClick={() => toggleFriend(f)}
              className={cn('flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium transition-colors',
                on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground')}>
              <UserAvatar username={f.username} avatarUrl={f.avatar_url} size="sm" />
              {f.username}
              {on && <Check className="h-3 w-3" />}
            </button>
          );
        })}
        {filteredFriends.length === 0 && <p className="text-xs text-muted-foreground">No friends found</p>}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col pb-24">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-12">
        <div className="mb-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-xl font-bold text-foreground">Plan Something</h1>
          <button onClick={() => onMoreDetails(draft)} className="text-xs font-medium text-primary">Use form</button>
        </div>

        <div className="flex-1 space-y-3">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[85%] rounded-2xl px-3.5 py-2 text-sm',
                  m.role === 'user' ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-secondary text-foreground')}>
                  {m.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {thinking && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading your plan…</div>
          )}

          {/* Stage quick actions */}
          {!thinking && stage === 'date' && (
            <div className="flex flex-wrap gap-2">
              <QuickPill onClick={() => pickDate(addDays(0), 'Today')}>Today</QuickPill>
              <QuickPill onClick={() => pickDate(addDays(1), 'Tomorrow')}>Tomorrow</QuickPill>
              <QuickPill onClick={() => pickDate(nextSaturday(), 'This weekend')}>This weekend</QuickPill>
              <input type="date" min={addDays(0)} onChange={e => e.target.value && pickDate(e.target.value, prettyDate(e.target.value))}
                className="h-8 rounded-full border border-border bg-card px-3 text-xs text-foreground" />
            </div>
          )}
          {!thinking && stage === 'time' && (
            <div className="flex flex-wrap items-center gap-2">
              <input type="time" onChange={e => e.target.value && setDraft(d => ({ ...d, startTime: e.target.value }))}
                onBlur={e => e.target.value && say(prettyTime(e.target.value))}
                className="h-8 rounded-full border border-border bg-card px-3 text-xs text-foreground" />
              <QuickPill onClick={pickNoTime}>No specific time</QuickPill>
            </div>
          )}
          {!thinking && stage === 'friends' && (
            <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
              {FriendPicker}
              <Button size="sm" className="w-full" onClick={doneFriends}>
                {draft.friends.length ? `Continue with ${draft.friends.length} ${draft.friends.length === 1 ? 'friend' : 'friends'}` : 'Just me for now'}
              </Button>
            </div>
          )}

          {stage === 'confirm' && (
            <ConfirmCard draft={draft} setDraft={setDraft} picker={FriendPicker} submitting={submitting}
              onCreate={() => onCreate(draft)} onMoreDetails={() => onMoreDetails(draft)} />
          )}
          <div ref={endRef} />
        </div>

        {stage !== 'confirm' && stage !== 'friends' && (
          <div className="sticky bottom-20 mt-4 flex items-center gap-2 rounded-full border border-border bg-card p-1.5 shadow-sm">
            {speechSupported && (
              <button onClick={toggleMic} aria-label={listening ? 'Stop voice input' : 'Speak'}
                className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors',
                  listening ? 'animate-pulse bg-destructive text-destructive-foreground' : 'bg-secondary text-foreground')}>
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
              placeholder={listening ? 'Listening…' : stage === 'start' ? 'Describe your plan…' : 'Type your answer…'}
              className="flex-1 bg-transparent px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
            <button onClick={() => send()} disabled={!input.trim() || thinking} aria-label="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40">
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickPill({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="h-8 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-secondary">
      {children}
    </button>
  );
}

function ConfirmCard({ draft, setDraft, picker, submitting, onCreate, onMoreDetails }: {
  draft: ChatDraft; setDraft: React.Dispatch<React.SetStateAction<ChatDraft>>; picker: React.ReactNode;
  submitting: boolean; onCreate: () => void; onMoreDetails: () => void;
}) {
  const [editing, setEditing] = useState<null | 'title' | 'date' | 'time' | 'friends'>(null);
  const [friendsChecked, setFriendsChecked] = useState(false);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <Row icon={<span className="text-lg">{draft.emoji}</span>} label="Plan" onEdit={() => setEditing(editing === 'title' ? null : 'title')}>
        {editing === 'title'
          ? <Input autoFocus value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} className="h-8" />
          : <span className="font-semibold">{draft.title}</span>}
      </Row>
      <Row icon={<CalendarDays className="h-4 w-4" />} label="Date" onEdit={() => setEditing(editing === 'date' ? null : 'date')}>
        {editing === 'date'
          ? <Input type="date" value={draft.date} onChange={e => e.target.value && setDraft(d => ({ ...d, date: e.target.value }))} className="h-8" />
          : prettyDate(draft.date)}
      </Row>
      <Row icon={<Clock className="h-4 w-4" />} label="Time" onEdit={() => setEditing(editing === 'time' ? null : 'time')}>
        {editing === 'time' ? (
          <div className="flex items-center gap-2">
            <Input type="time" value={draft.startTime} onChange={e => setDraft(d => ({ ...d, startTime: e.target.value, noTime: !e.target.value }))} className="h-8" />
            <button onClick={() => setDraft(d => ({ ...d, startTime: '', endTime: '', noTime: true }))} className="text-xs text-muted-foreground underline">No time</button>
          </div>
        ) : draft.noTime || !draft.startTime ? 'No specific time' : `${prettyTime(draft.startTime)}${draft.endTime ? ` – ${prettyTime(draft.endTime)}` : ''}`}
      </Row>

      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
          <Users className="h-3.5 w-3.5" /> Inviting {draft.friends.length} {draft.friends.length === 1 ? 'person' : 'people'}
        </div>
        {draft.friends.length === 0 && <p className="text-sm text-muted-foreground">No one yet — just you.</p>}
        <div className="flex flex-wrap gap-2">
          {draft.friends.map(f => (
            <span key={f.user_id} className="flex items-center gap-1.5 rounded-full bg-card py-1 pl-1 pr-2 text-xs font-medium text-foreground">
              <UserAvatar username={f.username} avatarUrl={f.avatar_url} size="sm" />
              {f.username}
              <button aria-label={`Remove ${f.username}`} onClick={() => setDraft(d => ({ ...d, friends: d.friends.filter(x => x.user_id !== f.user_id) }))}>
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            </span>
          ))}
        </div>
        <button onClick={() => setEditing(editing === 'friends' ? null : 'friends')} className="mt-2 flex items-center gap-1 text-xs font-medium text-primary">
          <Plus className="h-3 w-3" /> {editing === 'friends' ? 'Done' : 'Add or change people'}
        </button>
        {editing === 'friends' && <div className="mt-2">{picker}</div>}
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-foreground">
          <input type="checkbox" checked={friendsChecked} onChange={e => setFriendsChecked(e.target.checked)} className="h-4 w-4 accent-primary" />
          Yes, these are the right people to invite
        </label>
      </div>

      <Button className="w-full font-semibold" size="lg" disabled={!friendsChecked || !draft.title.trim() || !draft.date || submitting} onClick={onCreate}>
        {submitting ? 'Creating…' : draft.friends.length ? 'Looks good — create & send invites' : 'Looks good — create plan'}
      </Button>
      <button onClick={onMoreDetails} className="w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground">
        Add more details (location, notes, link, polls…)
      </button>
    </motion.div>
  );
}

function Row({ icon, label, children, onEdit }: { icon: React.ReactNode; label: string; children: React.ReactNode; onEdit: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="text-sm text-foreground">{children}</div>
      </div>
      <button onClick={onEdit} aria-label={`Edit ${label}`} className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary">
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
