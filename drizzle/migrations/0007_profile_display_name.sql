ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_display_name_len CHECK (display_name IS NULL OR char_length(display_name) <= 40);

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, username, email, usage, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'usage', 'own'),
    NULLIF(left(trim(COALESCE(NEW.raw_user_meta_data->>'display_name', '')), 40), '')
  );
  RETURN NEW;
END;
$function$;

DROP FUNCTION IF EXISTS public.search_profiles(text);
CREATE FUNCTION public.search_profiles(_query text)
RETURNS TABLE(user_id uuid, username text, display_name text, avatar_url text, bio text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id, p.username, p.display_name, p.avatar_url, p.bio FROM public.profiles p
  WHERE auth.uid() IS NOT NULL AND length(trim(_query)) >= 1 AND length(_query) <= 100
    AND p.user_id <> auth.uid()
    AND (p.username ILIKE '%' || replace(replace(trim(_query),'%','\%'),'_','\_') || '%' OR lower(p.email) = lower(trim(_query)))
  LIMIT 20
$$;
REVOKE EXECUTE ON FUNCTION public.search_profiles(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO authenticated;

DROP FUNCTION IF EXISTS public.get_invite_info(uuid);
CREATE FUNCTION public.get_invite_info(_token uuid)
 RETURNS TABLE(event_id uuid, title text, emoji text, event_date date, event_end_date date, event_time time without time zone, event_end_time time without time zone, location text, cover_image text, inviter_id uuid, inviter_username text, inviter_avatar text, inviter_display_name text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT e.id, e.title, e.emoji, e.date, e.end_date, e.time, e.end_time, e.location, e.cover_image,
    e.created_by, p.username, p.avatar_url, p.display_name
  FROM public.event_invite_links l
  JOIN public.events e ON e.id = l.event_id
  LEFT JOIN public.profiles p ON p.user_id = e.created_by
  WHERE l.token = _token LIMIT 1;
$function$;
GRANT EXECUTE ON FUNCTION public.get_invite_info(uuid) TO anon, authenticated;