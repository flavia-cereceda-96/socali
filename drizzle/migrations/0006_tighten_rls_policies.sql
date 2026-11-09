DROP POLICY IF EXISTS "Authenticated users can create activity" ON public.activity_feed;

DROP POLICY IF EXISTS "Anyone authenticated can view comment votes" ON public.comment_votes;
CREATE POLICY "Signed-in users can view comment votes" ON public.comment_votes FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Anyone authenticated can view feedback votes" ON public.feedback_votes;
CREATE POLICY "Signed-in users can view feedback votes" ON public.feedback_votes FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Anyone authenticated can view feedback" ON public.feedback;
CREATE POLICY "Signed-in users can view feedback" ON public.feedback FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Anyone authenticated can view feedback comments" ON public.feedback_comments;
CREATE POLICY "Signed-in users can view feedback comments" ON public.feedback_comments FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Anyone authenticated can view updates" ON public.app_updates;
CREATE POLICY "Signed-in users can view updates" ON public.app_updates FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public can view invite links" ON public.event_invite_links;
CREATE POLICY "Event members can view invite links" ON public.event_invite_links FOR SELECT TO authenticated
USING (public.is_event_creator(event_id, auth.uid()) OR public.is_event_participant(event_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.profile_related(_other uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    _other = auth.uid()
    OR EXISTS (SELECT 1 FROM public.friends f WHERE (f.user_id=auth.uid() AND f.friend_id=_other) OR (f.user_id=_other AND f.friend_id=auth.uid()))
    OR EXISTS (SELECT 1 FROM public.events e LEFT JOIN public.event_participants p ON p.event_id=e.id
               WHERE (e.created_by=_other OR p.user_id=_other)
                 AND (public.is_event_creator(e.id, auth.uid()) OR public.is_event_participant(e.id, auth.uid())))
    OR EXISTS (SELECT 1 FROM public.group_members a JOIN public.group_members b ON a.group_id=b.group_id
               WHERE a.user_id=auth.uid() AND b.user_id=_other)
    OR EXISTS (SELECT 1 FROM public.feedback WHERE user_id=_other)
    OR EXISTS (SELECT 1 FROM public.feedback_comments WHERE user_id=_other)
    OR public.has_role(auth.uid(), 'admin')
  )
$$;
REVOKE EXECUTE ON FUNCTION public.profile_related(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.profile_related(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can search profiles by username" ON public.profiles;
CREATE POLICY "Users can view related profiles" ON public.profiles FOR SELECT TO authenticated USING (public.profile_related(user_id));

CREATE OR REPLACE FUNCTION public.search_profiles(_query text)
RETURNS TABLE(user_id uuid, username text, avatar_url text, bio text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id, p.username, p.avatar_url, p.bio FROM public.profiles p
  WHERE auth.uid() IS NOT NULL AND length(trim(_query)) >= 1 AND length(_query) <= 100
    AND p.user_id <> auth.uid()
    AND (p.username ILIKE '%' || replace(replace(trim(_query),'%','\%'),'_','\_') || '%' OR lower(p.email) = lower(trim(_query)))
  LIMIT 20
$$;
REVOKE EXECUTE ON FUNCTION public.search_profiles(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can upload event photos" ON storage.objects;
CREATE POLICY "Participants can upload own event photos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'event-photos' AND (storage.foldername(name))[1] = (select auth.uid()::text)
  AND (public.is_event_creator(((storage.foldername(name))[2])::uuid, auth.uid()) OR public.is_event_participant(((storage.foldername(name))[2])::uuid, auth.uid())));

DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Users can view own avatar objects" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (select auth.uid()::text));
DROP POLICY IF EXISTS "Anyone can view event photos" ON storage.objects;
CREATE POLICY "Users can view own event photo objects" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'event-photos' AND (storage.foldername(name))[1] = (select auth.uid()::text));
DROP POLICY IF EXISTS "Group avatars are publicly viewable" ON storage.objects;
CREATE POLICY "Group creators can view group avatar objects" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'group-avatars' AND public.is_group_creator(((storage.foldername(name))[1])::uuid, auth.uid()));