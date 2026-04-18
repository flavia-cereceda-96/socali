-- Add a trigger that creates an activity_feed entry for the event creator
-- whenever a participant updates their RSVP status (accepted, declined, maybe).
-- Skips notification if the creator is the one updating, or if status didn't change.

CREATE OR REPLACE FUNCTION public.notify_event_creator_on_rsvp_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _creator_id uuid;
BEGIN
  -- Only fire when status actually changed
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Only notify for meaningful response statuses
    IF NEW.status IN ('accepted', 'declined', 'maybe') THEN
      SELECT created_by INTO _creator_id
      FROM public.events
      WHERE id = NEW.event_id;

      -- Don't notify the creator about their own RSVP
      IF _creator_id IS NOT NULL AND _creator_id <> NEW.user_id THEN
        INSERT INTO public.activity_feed (user_id, type, event_id, source_user_id, is_read)
        VALUES (_creator_id, 'rsvp_' || NEW.status, NEW.event_id, NEW.user_id, false);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_creator_on_rsvp ON public.event_participants;

CREATE TRIGGER trg_notify_creator_on_rsvp
AFTER UPDATE ON public.event_participants
FOR EACH ROW
EXECUTE FUNCTION public.notify_event_creator_on_rsvp_change();