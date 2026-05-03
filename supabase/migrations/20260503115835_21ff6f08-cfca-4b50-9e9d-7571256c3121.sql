
ALTER TABLE public.event_participants
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'attendee';

ALTER TABLE public.event_participants
DROP CONSTRAINT IF EXISTS event_participants_role_check;
ALTER TABLE public.event_participants
ADD CONSTRAINT event_participants_role_check
CHECK (role IN ('attendee', 'co-admin'));

CREATE OR REPLACE FUNCTION public.is_event_co_admin(_event_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_participants
    WHERE event_id = _event_id AND user_id = _user_id AND role = 'co-admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_event_admin(_event_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_event_creator(_event_id, _user_id) OR public.is_event_co_admin(_event_id, _user_id)
$$;

-- Co-admins can update event details (delete remains creator-only)
DROP POLICY IF EXISTS "Co-admins can update event" ON public.events;
CREATE POLICY "Co-admins can update event"
ON public.events FOR UPDATE TO authenticated
USING (public.is_event_co_admin(id, auth.uid()))
WITH CHECK (public.is_event_co_admin(id, auth.uid()));

-- Co-admins can view all participants
DROP POLICY IF EXISTS "Co-admins can view participants" ON public.event_participants;
CREATE POLICY "Co-admins can view participants"
ON public.event_participants FOR SELECT
USING (public.is_event_co_admin(event_id, auth.uid()));

-- Co-admins can add new attendees (must be added as 'attendee')
DROP POLICY IF EXISTS "Co-admins can add participants" ON public.event_participants;
CREATE POLICY "Co-admins can add participants"
ON public.event_participants FOR INSERT
WITH CHECK (public.is_event_co_admin(event_id, auth.uid()) AND role = 'attendee');

-- Co-admins can remove attendees, but NOT other co-admins
DROP POLICY IF EXISTS "Co-admins can remove attendees" ON public.event_participants;
CREATE POLICY "Co-admins can remove attendees"
ON public.event_participants FOR DELETE
USING (public.is_event_co_admin(event_id, auth.uid()) AND role <> 'co-admin');

-- Trigger: only the organizer can change a participant's role
CREATE OR REPLACE FUNCTION public.enforce_event_role_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_event_creator(NEW.event_id, auth.uid()) THEN
      RAISE EXCEPTION 'Only the organizer can change participant roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS event_participants_role_change ON public.event_participants;
CREATE TRIGGER event_participants_role_change
BEFORE UPDATE ON public.event_participants
FOR EACH ROW EXECUTE FUNCTION public.enforce_event_role_change();

-- Co-admins manage invite links
DROP POLICY IF EXISTS "Co-admins create invite links" ON public.event_invite_links;
CREATE POLICY "Co-admins create invite links"
ON public.event_invite_links FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by AND public.is_event_co_admin(event_id, auth.uid()));

DROP POLICY IF EXISTS "Co-admins delete invite links" ON public.event_invite_links;
CREATE POLICY "Co-admins delete invite links"
ON public.event_invite_links FOR DELETE TO authenticated
USING (public.is_event_co_admin(event_id, auth.uid()));
