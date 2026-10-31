DROP POLICY verified_activity_actor ON public.activity_feed;
CREATE POLICY verified_activity_actor ON public.activity_feed AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (
 source_user_id=auth.uid() AND dedupe_key IS NULL AND (
 (event_id IS NOT NULL AND (public.is_event_creator(event_id,auth.uid()) OR public.is_event_participant(event_id,auth.uid())) AND (public.is_event_creator(event_id,user_id) OR public.is_event_participant(event_id,user_id))) OR
 (group_id IS NOT NULL AND public.is_group_admin(group_id,auth.uid()) AND public.is_group_member(group_id,user_id))
 ));
REVOKE INSERT,UPDATE ON public.user_push_tokens FROM authenticated;
CREATE OR REPLACE FUNCTION public.generate_due_notifications() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE total integer:=0; inserted integer;
BEGIN
 INSERT INTO public.activity_feed(user_id,event_id,type,dedupe_key)
 SELECT p.user_id,e.id,'event_reminder','event_reminder:'||e.id||':'||p.user_id||':'||e.date
 FROM public.events e JOIN public.event_participants ep ON ep.event_id=e.id JOIN public.profiles p ON p.user_id=ep.user_id
 WHERE ep.status='confirmed' AND e.date_confirmed AND e.date=(now() AT TIME ZONE p.notification_timezone)::date
 AND (now() AT TIME ZONE p.notification_timezone)::time >= LEAST(time '08:00', COALESCE(e.time,time '08:00')-interval '1 hour')
 AND (e.time IS NULL OR e.time>=(now() AT TIME ZONE p.notification_timezone)::time)
 ON CONFLICT(dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT; total:=total+inserted;
 INSERT INTO public.activity_feed(user_id,event_id,type,dedupe_key)
 SELECT p.user_id,e.id,'poll_closing','poll_closing:'||e.id||':'||p.user_id||':'||e.poll_deadline
 FROM public.events e JOIN public.event_participants ep ON ep.event_id=e.id JOIN public.profiles p ON p.user_id=ep.user_id
 WHERE ep.status IN ('confirmed','pending','suggested','maybe') AND NOT e.date_confirmed AND e.poll_deadline=(now() AT TIME ZONE p.notification_timezone)::date
 AND extract(hour FROM now() AT TIME ZONE p.notification_timezone)>=8
 ON CONFLICT(dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT; total:=total+inserted;
 UPDATE public.push_outbox SET status='pending' WHERE status IN ('failed','processing') AND retry_at<=now() AND attempts<6 AND created_at>now()-interval '1 day';
 RETURN total;
END; $$;
REVOKE ALL ON FUNCTION public.generate_due_notifications() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.generate_due_notifications() TO service_role;