-- Replace insert policy: any event member (creator or participant) can add date options
DROP POLICY IF EXISTS "Admins can add date options" ON public.event_date_options;

CREATE POLICY "Members can add date options"
ON public.event_date_options
FOR INSERT
TO authenticated
WITH CHECK (
  is_event_creator(event_id, auth.uid())
  OR is_event_participant(event_id, auth.uid())
);
