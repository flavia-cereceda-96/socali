import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronUp, ChevronDown, MessageSquare, Plus, X, Search, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/UserAvatar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Category = 'bug' | 'feature' | 'improvement' | 'other';
type Status = 'under_review' | 'planned' | 'done' | null;

interface FeedbackRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: Category;
  status: Status;
  created_at: string;
}

interface Profile {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
}

interface VoteRow {
  feedback_id: string;
  user_id: string;
  vote_type: 'upvote' | 'downvote';
}

interface CommentRow {
  id: string;
  user_id: string;
  feedback_id: string;
  content: string;
  created_at: string;
}

interface CommentVoteRow {
  comment_id: string;
  user_id: string;
}

const CATEGORY_LABELS: Record<Category, string> = {
  bug: 'Bug',
  feature: 'Feature request',
  improvement: 'Improvement',
  other: 'Other',
};

const STATUS_LABELS: Record<Exclude<Status, null>, string> = {
  under_review: 'Under review',
  planned: 'Planned',
  done: 'Done',
};

const STATUS_STYLES: Record<Exclude<Status, null>, string> = {
  under_review: 'bg-amber-100 text-amber-800',
  planned: 'bg-blue-100 text-blue-800',
  done: 'bg-green-100 text-green-800',
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diffMs < day) return 'Today';
  if (diffMs < 2 * day) return 'Yesterday';
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}d ago`;
  return d.toLocaleDateString();
};

const FeedbackBoardPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(() => {
    return localStorage.getItem('feedback_guide_dismissed') !== '1';
  });
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id || null;
      setUserId(uid);
      if (uid) {
        supabase.from('user_roles').select('role').eq('user_id', uid).eq('role', 'admin').maybeSingle().then(({ data }) => {
          setIsAdmin(!!data);
        });
      }
    });
  }, []);

  const dismissGuide = () => {
    localStorage.setItem('feedback_guide_dismissed', '1');
    setShowGuide(false);
  };

  const { data: feedback = [] } = useQuery({
    queryKey: ['feedback'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as FeedbackRow[];
    },
  });

  const { data: votes = [] } = useQuery({
    queryKey: ['feedback_votes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('feedback_votes').select('feedback_id, user_id, vote_type');
      if (error) throw error;
      return data as VoteRow[];
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['feedback_comments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('feedback_comments').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return data as CommentRow[];
    },
  });

  const { data: commentVotes = [] } = useQuery({
    queryKey: ['comment_votes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('comment_votes').select('comment_id, user_id');
      if (error) throw error;
      return data as CommentVoteRow[];
    },
  });

  const userIds = useMemo(() => {
    const s = new Set<string>();
    feedback.forEach(f => s.add(f.user_id));
    comments.forEach(c => s.add(c.user_id));
    return Array.from(s);
  }, [feedback, comments]);

  const { data: profiles = [] } = useQuery({
    queryKey: ['feedback-profiles', userIds.join(',')],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);
      if (error) throw error;
      return data as Profile[];
    },
    enabled: userIds.length > 0,
  });

  const profileMap = useMemo(() => {
    const m = new Map<string, Profile>();
    profiles.forEach(p => m.set(p.user_id, p));
    return m;
  }, [profiles]);

  const enrichedFeedback = useMemo(() => {
    const lower = search.trim().toLowerCase();
    const items = feedback.map(f => {
      const fVotes = votes.filter(v => v.feedback_id === f.id);
      const ups = fVotes.filter(v => v.vote_type === 'upvote').length;
      const downs = fVotes.filter(v => v.vote_type === 'downvote').length;
      const myVote = fVotes.find(v => v.user_id === userId)?.vote_type ?? null;
      const cs = comments.filter(c => c.feedback_id === f.id);
      return { ...f, ups, downs, myVote, score: ups - downs, commentCount: cs.length };
    });
    const filtered = lower
      ? items.filter(f =>
          f.title.toLowerCase().includes(lower) ||
          (f.description ?? '').toLowerCase().includes(lower)
        )
      : items;
    return filtered.sort((a, b) => b.ups - a.ups || b.score - a.score);
  }, [feedback, votes, comments, userId, search]);

  const handleVote = async (feedbackId: string, type: 'upvote' | 'downvote') => {
    if (!userId) return;
    const existing = votes.find(v => v.feedback_id === feedbackId && v.user_id === userId);
    if (existing && existing.vote_type === type) {
      // Remove vote
      const { error } = await supabase
        .from('feedback_votes')
        .delete()
        .eq('user_id', userId)
        .eq('feedback_id', feedbackId);
      if (error) toast.error(error.message);
    } else if (existing) {
      // Switch vote
      const { error } = await supabase
        .from('feedback_votes')
        .update({ vote_type: type })
        .eq('user_id', userId)
        .eq('feedback_id', feedbackId);
      if (error) toast.error(error.message);
    } else {
      const { error } = await supabase
        .from('feedback_votes')
        .insert({ user_id: userId, feedback_id: feedbackId, vote_type: type });
      if (error) toast.error(error.message);
    }
    queryClient.invalidateQueries({ queryKey: ['feedback_votes'] });
  };

  const handleStatusChange = async (feedbackId: string, status: string) => {
    const newStatus = status === 'none' ? null : status;
    const { error } = await supabase.from('feedback').update({ status: newStatus }).eq('id', feedbackId);
    if (error) toast.error(error.message);
    else queryClient.invalidateQueries({ queryKey: ['feedback'] });
  };

  return (
    <div className="min-h-screen pb-28 bg-background">
      <div className="mx-auto max-w-md px-4 pt-10">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/')} className="p-2 -ml-2 rounded-full hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Feedback Board</h1>
        </div>

        {showGuide && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-2xl bg-accent/40 p-4 relative"
          >
            <button onClick={dismissGuide} className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
            <div className="flex gap-2 pr-6">
              <Info className="w-4 h-4 mt-0.5 shrink-0 text-foreground/70" />
              <p className="text-sm text-foreground/80 leading-relaxed">
                <span className="font-semibold">How it works:</span> Search before posting. If someone already suggested what you want, upvote it and leave a comment to add more detail. Only add a new post if nothing similar exists.
              </p>
            </div>
          </motion.div>
        )}

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search feedback..."
            className="pl-9"
          />
        </div>

        <div className="flex flex-col gap-3">
          {enrichedFeedback.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {search ? 'No feedback matches your search.' : 'No feedback yet. Be the first to post!'}
            </p>
          )}
          {enrichedFeedback.map((f) => {
            const author = profileMap.get(f.user_id);
            const isExpanded = expandedId === f.id;
            const itemComments = comments.filter(c => c.feedback_id === f.id);
            return (
              <motion.div
                key={f.id}
                layout
                className="rounded-2xl bg-card shadow-card p-4"
              >
                <div className="flex gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => handleVote(f.id, 'upvote')}
                      className={cn(
                        "p-1 rounded-md transition-colors",
                        f.myVote === 'upvote' ? 'bg-primary/15 text-primary' : 'hover:bg-muted text-muted-foreground'
                      )}
                      aria-label="Upvote"
                    >
                      <ChevronUp className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-semibold tabular-nums">{f.ups}</span>
                    <button
                      onClick={() => handleVote(f.id, 'downvote')}
                      className={cn(
                        "p-1 rounded-md transition-colors",
                        f.myVote === 'downvote' ? 'bg-destructive/15 text-destructive' : 'hover:bg-muted text-muted-foreground'
                      )}
                      aria-label="Downvote"
                    >
                      <ChevronDown className="w-5 h-5" />
                    </button>
                    {f.downs > 0 && <span className="text-[10px] text-muted-foreground tabular-nums">{f.downs}</span>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground leading-tight flex-1 min-w-0">{f.title}</h3>
                      {f.status && (
                        <Badge className={cn("text-[10px] font-medium", STATUS_STYLES[f.status])} variant="secondary">
                          {STATUS_LABELS[f.status]}
                        </Badge>
                      )}
                    </div>
                    {f.description && (
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{f.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <UserAvatar avatarUrl={author?.avatar_url} username={author?.username} size="xs" />
                      <span>{author?.username || 'Someone'}</span>
                      <span>·</span>
                      <span>{formatDate(f.created_at)}</span>
                      <span>·</span>
                      <span className="capitalize">{CATEGORY_LABELS[f.category]}</span>
                    </div>

                    <div className="flex items-center gap-3 mt-3">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : f.id)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{f.commentCount} {f.commentCount === 1 ? 'comment' : 'comments'}</span>
                      </button>
                      {isAdmin && (
                        <Select value={f.status ?? 'none'} onValueChange={(v) => handleStatusChange(f.id, v)}>
                          <SelectTrigger className="h-7 text-xs w-[140px]">
                            <SelectValue placeholder="Set status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No status</SelectItem>
                            <SelectItem value="under_review">Under review</SelectItem>
                            <SelectItem value="planned">Planned</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <CommentsThread
                            feedbackId={f.id}
                            comments={itemComments}
                            commentVotes={commentVotes}
                            profileMap={profileMap}
                            userId={userId}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => setAddOpen(true)}
        className="fixed bottom-24 right-4 rounded-full bg-primary text-primary-foreground shadow-lg p-4 hover:scale-105 transition-transform z-30"
        aria-label="Add feedback"
      >
        <Plus className="w-5 h-5" />
      </button>

      <AddFeedbackDialog open={addOpen} onOpenChange={setAddOpen} userId={userId} />
    </div>
  );
};

function CommentsThread({
  feedbackId,
  comments,
  commentVotes,
  profileMap,
  userId,
}: {
  feedbackId: string;
  comments: CommentRow[];
  commentVotes: CommentVoteRow[];
  profileMap: Map<string, Profile>;
  userId: string | null;
}) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const enriched = useMemo(() => {
    return comments
      .map(c => {
        const cVotes = commentVotes.filter(v => v.comment_id === c.id);
        const ups = cVotes.length;
        const myUpvoted = cVotes.some(v => v.user_id === userId);
        return { ...c, ups, myUpvoted };
      })
      .sort((a, b) => b.ups - a.ups || a.created_at.localeCompare(b.created_at));
  }, [comments, commentVotes, userId]);

  const handleUpvote = async (commentId: string, currentlyUpvoted: boolean) => {
    if (!userId) return;
    if (currentlyUpvoted) {
      const { error } = await supabase
        .from('comment_votes')
        .delete()
        .eq('user_id', userId)
        .eq('comment_id', commentId);
      if (error) toast.error(error.message);
    } else {
      const { error } = await supabase
        .from('comment_votes')
        .insert({ user_id: userId, comment_id: commentId, vote_type: 'upvote' });
      if (error) toast.error(error.message);
    }
    queryClient.invalidateQueries({ queryKey: ['comment_votes'] });
  };

  const handleSubmit = async () => {
    if (!userId || !text.trim()) return;
    setSubmitting(true);
    const { error } = await supabase
      .from('feedback_comments')
      .insert({ user_id: userId, feedback_id: feedbackId, content: text.trim() });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setText('');
    queryClient.invalidateQueries({ queryKey: ['feedback_comments'] });
  };

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      {enriched.map(c => {
        const author = profileMap.get(c.user_id);
        return (
          <div key={c.id} className="flex gap-2">
            <UserAvatar avatarUrl={author?.avatar_url} username={author?.username} size="xs" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{author?.username || 'Someone'}</span>
                <span> · {formatDate(c.created_at)}</span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{c.content}</p>
            </div>
            <button
              onClick={() => handleUpvote(c.id, c.myUpvoted)}
              className={cn(
                "flex items-center gap-0.5 text-xs px-1.5 rounded h-fit py-1 transition-colors",
                c.myUpvoted ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span className="tabular-nums">{c.ups}</span>
            </button>
          </div>
        );
      })}
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Button onClick={handleSubmit} disabled={!text.trim() || submitting} size="sm">
          Post
        </Button>
      </div>
    </div>
  );
}

function AddFeedbackDialog({
  open,
  onOpenChange,
  userId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string | null;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('feature');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setTitle('');
      setDescription('');
      setCategory('feature');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!userId || !title.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('feedback').insert({
      user_id: userId,
      title: title.trim(),
      description: description.trim() || null,
      category,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Feedback posted!');
    queryClient.invalidateQueries({ queryKey: ['feedback'] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add feedback</DialogTitle>
          <DialogDescription>
            Please search first to avoid duplicates. If something similar exists, upvote and comment instead.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Title *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short, descriptive title" maxLength={120} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add more detail (optional)" rows={4} maxLength={2000} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="feature">Feature request</SelectItem>
                <SelectItem value="improvement">Improvement</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || submitting}>
            {submitting ? 'Posting...' : 'Post feedback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FeedbackBoardPage;