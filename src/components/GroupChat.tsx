import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGroupMessages, useSendGroupMessage } from '@/hooks/useGroupChat';
import { UserAvatar } from '@/components/UserAvatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  groupId: string;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
        ' · ' +
        d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export const GroupChat = ({ groupId }: Props) => {
  const { data: messages = [], isLoading } = useGroupMessages(groupId);
  const sendMsg = useSendGroupMessage();
  const [draft, setDraft] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null));
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    const content = draft;
    setDraft('');
    try {
      await sendMsg.mutateAsync({ groupId, content });
    } catch (err: any) {
      toast.error(err.message || 'Failed to send');
      setDraft(content);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card">
      <div
        ref={scrollRef}
        className="max-h-[400px] min-h-[200px] overflow-y-auto p-3 space-y-3"
      >
        {isLoading && (
          <p className="text-center text-xs text-muted-foreground py-8">Loading...</p>
        )}
        {!isLoading && messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-8">
            No messages yet. Say hi 👋
          </p>
        )}
        {messages.map(m => {
          const isMe = m.user_id === currentUserId;
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
            >
              <UserAvatar
                avatarUrl={m.author?.avatar_url}
                username={m.author?.username || '?'}
                size="sm"
              />
              <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && (
                  <span className="text-[11px] font-medium text-muted-foreground px-1">
                    @{m.author?.username || 'unknown'}
                  </span>
                )}
                <div
                  className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                    isMe
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-secondary text-foreground rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
                <span className="text-[10px] text-muted-foreground px-1 mt-0.5">
                  {formatTime(m.created_at)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Message the group..."
          className="flex-1 rounded-full bg-secondary px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          maxLength={2000}
        />
        <button
          type="submit"
          disabled={!draft.trim() || sendMsg.isPending}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};
