
CREATE TABLE public.activity_feed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  source_user_id UUID,
  comment_id UUID REFERENCES public.event_comments(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity"
ON public.activity_feed FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own activity"
ON public.activity_feed FOR UPDATE
USING (auth.uid() = user_id);

-- Allow inserts from authenticated users (app creates activity for others)
CREATE POLICY "Authenticated users can create activity"
ON public.activity_feed FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Index for fast lookups
CREATE INDEX idx_activity_feed_user ON public.activity_feed(user_id, is_read, created_at DESC);
