import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Send, Trash2 } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface EventCommentsProps {
  eventId: string;
}

export const EventComments = ({ eventId }: EventCommentsProps) => {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['event-comments', eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from('event_comments')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (!data || data.length === 0) return [];

      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      return data.map(c => ({
        ...c,
        username: profileMap.get(c.user_id)?.username || 'Unknown',
        avatar_url: profileMap.get(c.user_id)?.avatar_url || null,
      }));
    },
  });

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: comment, error } = await supabase.from('event_comments').insert({
        event_id: eventId,
        user_id: user.id,
        content: newComment.trim(),
      }).select().single();

      if (error) { toast.error(error.message); return; }

      // Create activity for all other participants/creator
      const { data: participants } = await supabase
        .from('event_participants')
        .select('user_id')
        .eq('event_id', eventId);

      const { data: eventData } = await supabase
        .from('events')
        .select('created_by')
        .eq('id', eventId)
        .single();

      const allUserIds = new Set([
        ...(participants || []).map(p => p.user_id),
        ...(eventData ? [eventData.created_by] : []),
      ]);
      allUserIds.delete(user.id); // Don't notify yourself

      // Check for @mentions in comment
      const mentionRegex = /@(\w+)/g;
      const mentions = [...newComment.matchAll(mentionRegex)].map(m => m[1]);

      if (allUserIds.size > 0) {
        const activityItems = [...allUserIds].map(uid => ({
          user_id: uid,
          type: 'comment' as const,
          event_id: eventId,
          source_user_id: user.id,
          comment_id: comment.id,
        }));
        await supabase.from('activity_feed').insert(activityItems);
      }

      // Create mention-specific activity items
      if (mentions.length > 0) {
        const { data: mentionedProfiles } = await supabase
          .from('profiles')
          .select('user_id, username')
          .in('username', mentions);

        if (mentionedProfiles && mentionedProfiles.length > 0) {
          const mentionActivities = mentionedProfiles
            .filter(p => p.user_id !== user.id)
            .map(p => ({
              user_id: p.user_id,
              type: 'mention' as const,
              event_id: eventId,
              source_user_id: user.id,
              comment_id: comment.id,
            }));
          if (mentionActivities.length > 0) {
            await supabase.from('activity_feed').insert(mentionActivities);
          }
        }
      }

      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['event-comments', eventId] });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase.from('event_comments').delete().eq('id', commentId);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['event-comments', eventId] });
  };

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null));

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Comments {comments.length > 0 && `(${comments.length})`}
      </h2>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No comments yet — be the first!</p>
      ) : (
        <div className="space-y-2">
          {comments.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="group flex gap-3 rounded-xl bg-card p-3 shadow-card"
            >
              <UserAvatar avatarUrl={c.avatar_url} username={c.username} size="sm" className="shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">{c.username}</span>
                  <span className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                </div>
                <p className="mt-0.5 text-sm text-foreground/90">{c.content}</p>
              </div>
              {currentUserId === c.user_id && (
                <button
                  onClick={() => handleDelete(c.id)}
                  className="shrink-0 self-start opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Write a comment..."
          className="flex-1"
        />
        <Button size="icon" onClick={handleSubmit} disabled={submitting || !newComment.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
