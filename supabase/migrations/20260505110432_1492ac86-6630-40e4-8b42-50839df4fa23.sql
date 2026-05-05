-- Tables
CREATE TABLE public.event_what_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  title text NOT NULL,
  link text,
  suggested_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_what_options_event_idx ON public.event_what_options(event_id, created_at);

CREATE TABLE public.event_what_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  what_option_id uuid NOT NULL REFERENCES public.event_what_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  vote text NOT NULL CHECK (vote IN ('yes','no')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (what_option_id, user_id)
);

ALTER TABLE public.events ADD COLUMN confirmed_what_option_id uuid;

-- Helper: event_id from what option (for vote RLS)
CREATE OR REPLACE FUNCTION public.event_id_for_what_option(_option_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT event_id FROM public.event_what_options WHERE id = _option_id
$$;

-- RLS
ALTER TABLE public.event_what_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_what_votes ENABLE ROW LEVEL SECURITY;

-- Options
CREATE POLICY "Members can view what options"
  ON public.event_what_options FOR SELECT TO authenticated
  USING (is_event_creator(event_id, auth.uid()) OR is_event_participant(event_id, auth.uid()));

CREATE POLICY "Members can add what options"
  ON public.event_what_options FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = suggested_by
    AND (is_event_creator(event_id, auth.uid()) OR is_event_participant(event_id, auth.uid()))
  );

CREATE POLICY "Admins or suggester can delete what options"
  ON public.event_what_options FOR DELETE TO authenticated
  USING (is_event_admin(event_id, auth.uid()) OR auth.uid() = suggested_by);

-- Votes
CREATE POLICY "Members can view what votes"
  ON public.event_what_votes FOR SELECT TO authenticated
  USING (
    is_event_creator(event_id_for_what_option(what_option_id), auth.uid())
    OR is_event_participant(event_id_for_what_option(what_option_id), auth.uid())
  );

CREATE POLICY "Members can cast their own what votes"
  ON public.event_what_votes FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      is_event_creator(event_id_for_what_option(what_option_id), auth.uid())
      OR is_event_participant(event_id_for_what_option(what_option_id), auth.uid())
    )
  );

CREATE POLICY "Members can update their own what votes"
  ON public.event_what_votes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can delete their own what votes"
  ON public.event_what_votes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
