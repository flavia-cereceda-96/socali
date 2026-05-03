-- Feedback table
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view feedback"
  ON public.feedback FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create own feedback"
  ON public.feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback"
  ON public.feedback FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any feedback"
  ON public.feedback FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete own feedback"
  ON public.feedback FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_feedback_updated_at
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Feedback votes
CREATE TABLE public.feedback_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feedback_id UUID NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, feedback_id)
);

ALTER TABLE public.feedback_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view feedback votes"
  ON public.feedback_votes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own feedback votes"
  ON public.feedback_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback votes"
  ON public.feedback_votes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own feedback votes"
  ON public.feedback_votes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Feedback comments
CREATE TABLE public.feedback_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feedback_id UUID NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view feedback comments"
  ON public.feedback_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own feedback comments"
  ON public.feedback_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own feedback comments"
  ON public.feedback_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Comment votes
CREATE TABLE public.comment_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  comment_id UUID NOT NULL REFERENCES public.feedback_comments(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL DEFAULT 'upvote' CHECK (vote_type = 'upvote'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, comment_id)
);

ALTER TABLE public.comment_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view comment votes"
  ON public.comment_votes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own comment votes"
  ON public.comment_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comment votes"
  ON public.comment_votes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_feedback_votes_feedback ON public.feedback_votes(feedback_id);
CREATE INDEX idx_feedback_comments_feedback ON public.feedback_comments(feedback_id);
CREATE INDEX idx_comment_votes_comment ON public.comment_votes(comment_id);