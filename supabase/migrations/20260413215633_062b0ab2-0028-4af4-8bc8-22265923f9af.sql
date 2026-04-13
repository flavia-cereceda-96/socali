
-- Create security definer functions to break RLS recursion

CREATE OR REPLACE FUNCTION public.is_event_creator(_event_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = _event_id AND created_by = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_event_participant(_event_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_participants
    WHERE event_id = _event_id AND user_id = _user_id
  )
$$;

-- Fix events "view invited" policy (was self-referencing bug)
DROP POLICY IF EXISTS "Users can view invited events" ON public.events;
CREATE POLICY "Users can view invited events"
ON public.events FOR SELECT
USING (public.is_event_participant(id, auth.uid()));

-- Replace event_participants policies that query events
DROP POLICY IF EXISTS "Event creators can add participants" ON public.event_participants;
CREATE POLICY "Event creators can add participants"
ON public.event_participants FOR INSERT
WITH CHECK (public.is_event_creator(event_id, auth.uid()));

DROP POLICY IF EXISTS "Event creators can delete participants" ON public.event_participants;
CREATE POLICY "Event creators can delete participants"
ON public.event_participants FOR DELETE
USING (public.is_event_creator(event_id, auth.uid()));

DROP POLICY IF EXISTS "Event creators can view participants" ON public.event_participants;
CREATE POLICY "Event creators can view participants"
ON public.event_participants FOR SELECT
USING (public.is_event_creator(event_id, auth.uid()));
