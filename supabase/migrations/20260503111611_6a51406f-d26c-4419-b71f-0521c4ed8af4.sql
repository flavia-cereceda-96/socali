
CREATE OR REPLACE FUNCTION public.get_public_user_stats(_user_id uuid)
RETURNS TABLE (events_attended bigint, friends_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (
      SELECT COUNT(DISTINCT e.id)::bigint
      FROM public.events e
      LEFT JOIN public.event_participants ep
        ON ep.event_id = e.id AND ep.user_id = _user_id
      WHERE e.created_by = _user_id
         OR (ep.user_id = _user_id AND ep.status = 'confirmed')
    ) AS events_attended,
    (
      SELECT COUNT(*)::bigint
      FROM public.friends f
      WHERE f.status = 'accepted'
        AND (f.user_id = _user_id OR f.friend_id = _user_id)
    ) AS friends_count;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_user_stats(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_public_user_stats(uuid) FROM anon, public;
