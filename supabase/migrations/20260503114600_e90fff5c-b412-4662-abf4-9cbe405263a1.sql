CREATE OR REPLACE FUNCTION public.get_invite_info(_token uuid)
RETURNS TABLE(
  event_id uuid,
  title text,
  emoji text,
  event_date date,
  event_end_date date,
  event_time time,
  event_end_time time,
  location text,
  cover_image text,
  inviter_id uuid,
  inviter_username text,
  inviter_avatar text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    e.id, e.title, e.emoji, e.date, e.end_date, e.time, e.end_time, e.location, e.cover_image,
    e.created_by, p.username, p.avatar_url
  FROM public.event_invite_links l
  JOIN public.events e ON e.id = l.event_id
  LEFT JOIN public.profiles p ON p.user_id = e.created_by
  WHERE l.token = _token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.join_event_via_invite(_token uuid, _status text DEFAULT 'confirmed')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _event_id uuid;
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  IF _status NOT IN ('confirmed', 'declined', 'maybe', 'suggested') THEN
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
$$;