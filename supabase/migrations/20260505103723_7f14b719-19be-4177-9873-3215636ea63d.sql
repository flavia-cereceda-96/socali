-- Make event date optional, add poll-related fields
ALTER TABLE public.events ALTER COLUMN date DROP NOT NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS date_confirmed boolean NOT NULL DEFAULT true;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS poll_deadline date;

-- Existing events have a date; mark them confirmed already (default covers it).
-- New TBD events will be inserted with date_confirmed=false explicitly.

-- ===== event_date_options =====
CREATE TABLE IF NOT EXISTS public.event_date_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  proposed_date date NOT NULL,
  start_time time,
  end_time time,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_date_options_event_id_idx ON public.event_date_options(event_id);

ALTER TABLE public.event_date_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view date options"
  ON public.event_date_options FOR SELECT TO authenticated
  USING (public.is_event_creator(event_id, auth.uid()) OR public.is_event_participant(event_id, auth.uid()));

CREATE POLICY "Admins can add date options"
  ON public.event_date_options FOR INSERT TO authenticated
  WITH CHECK (public.is_event_admin(event_id, auth.uid()));

CREATE POLICY "Admins can update date options"
  ON public.event_date_options FOR UPDATE TO authenticated
  USING (public.is_event_admin(event_id, auth.uid()))
  WITH CHECK (public.is_event_admin(event_id, auth.uid()));

CREATE POLICY "Admins can delete date options"
  ON public.event_date_options FOR DELETE TO authenticated
  USING (public.is_event_admin(event_id, auth.uid()));

-- ===== event_date_votes =====
CREATE TABLE IF NOT EXISTS public.event_date_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date_option_id uuid NOT NULL REFERENCES public.event_date_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  vote text NOT NULL CHECK (vote IN ('yes', 'no')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (date_option_id, user_id)
);

CREATE INDEX IF NOT EXISTS event_date_votes_option_id_idx ON public.event_date_votes(date_option_id);
CREATE INDEX IF NOT EXISTS event_date_votes_user_id_idx ON public.event_date_votes(user_id);

ALTER TABLE public.event_date_votes ENABLE ROW LEVEL SECURITY;

-- Helper to determine the event id for a given option (avoids recursive RLS lookups)
CREATE OR REPLACE FUNCTION public.event_id_for_date_option(_option_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT event_id FROM public.event_date_options WHERE id = _option_id
$$;

CREATE POLICY "Members can view votes"
  ON public.event_date_votes FOR SELECT TO authenticated
  USING (
    public.is_event_creator(public.event_id_for_date_option(date_option_id), auth.uid())
    OR public.is_event_participant(public.event_id_for_date_option(date_option_id), auth.uid())
  );

CREATE POLICY "Members can cast their own votes"
  ON public.event_date_votes FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.is_event_creator(public.event_id_for_date_option(date_option_id), auth.uid())
      OR public.is_event_participant(public.event_id_for_date_option(date_option_id), auth.uid())
    )
  );

CREATE POLICY "Members can update their own votes"
  ON public.event_date_votes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can delete their own votes"
  ON public.event_date_votes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);