
-- Create comments table
CREATE TABLE public.event_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;

-- Anyone involved in the event can view comments
CREATE POLICY "Event members can view comments"
ON public.event_comments FOR SELECT
USING (
  is_event_creator(event_id, auth.uid()) OR is_event_participant(event_id, auth.uid())
);

-- Any event member can add comments
CREATE POLICY "Event members can add comments"
ON public.event_comments FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND (is_event_creator(event_id, auth.uid()) OR is_event_participant(event_id, auth.uid()))
);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
ON public.event_comments FOR DELETE
USING (auth.uid() = user_id);

-- Create event photos table
CREATE TABLE public.event_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event members can view photos"
ON public.event_photos FOR SELECT
USING (
  is_event_creator(event_id, auth.uid()) OR is_event_participant(event_id, auth.uid())
);

CREATE POLICY "Event members can add photos"
ON public.event_photos FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND (is_event_creator(event_id, auth.uid()) OR is_event_participant(event_id, auth.uid()))
);

CREATE POLICY "Users can delete own photos"
ON public.event_photos FOR DELETE
USING (auth.uid() = user_id);

-- Create storage bucket for event photos
INSERT INTO storage.buckets (id, name, public) VALUES ('event-photos', 'event-photos', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload event photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'event-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view event photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-photos');

CREATE POLICY "Users can delete their own event photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'event-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
