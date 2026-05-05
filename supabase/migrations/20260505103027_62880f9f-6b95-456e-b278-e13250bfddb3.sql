-- Drop existing check constraint(s) on status
ALTER TABLE public.event_participants DROP CONSTRAINT IF EXISTS event_participants_status_check;

-- Migrate legacy values
UPDATE public.event_participants SET status = 'pending' WHERE status IS NULL OR status NOT IN ('confirmed', 'declined', 'pending');

-- Default and new check constraint
ALTER TABLE public.event_participants ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.event_participants
  ADD CONSTRAINT event_participants_status_check
  CHECK (status IN ('confirmed', 'declined', 'pending'));

CREATE OR REPLACE FUNCTION public.join_event_via_invite(_token uuid, _status text DEFAULT 'confirmed'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _event_id uuid;
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  IF _status NOT IN ('confirmed', 'declined', 'pending') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  SELECT event_id INTO _event_id
  FROM public.event_invite_links
  WHERE token = _token
  LIMIT 1;

  IF _event_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite link';
  END IF;

  IF EXISTS (SELECT 1 FROM public.events WHERE id = _event_id AND created_by = _user_id) THEN
    RETURN _event_id;
  END IF;

  INSERT INTO public.event_participants (event_id, user_id, status)
  VALUES (_event_id, _user_id, _status)
  ON CONFLICT (event_id, user_id) DO UPDATE SET status = EXCLUDED.status;

  RETURN _event_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_event_creator_on_rsvp_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _creator_id uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('confirmed', 'declined', 'pending') THEN
      SELECT created_by INTO _creator_id
      FROM public.events
      WHERE id = NEW.event_id;

      IF _creator_id IS NOT NULL AND _creator_id <> NEW.user_id THEN
        INSERT INTO public.activity_feed (user_id, type, event_id, source_user_id, is_read)
        VALUES (_creator_id, 'rsvp_' || NEW.status, NEW.event_id, NEW.user_id, false);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;