ALTER TABLE public.profiles ADD COLUMN push_notifications boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN notification_timezone text NOT NULL DEFAULT 'Europe/Amsterdam';
ALTER TABLE public.activity_feed ADD COLUMN dedupe_key text;
CREATE UNIQUE INDEX activity_feed_dedupe_key ON public.activity_feed(dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE TABLE public.user_push_tokens (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
 token text NOT NULL UNIQUE, platform text NOT NULL CHECK(platform IN ('ios','android')), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.user_push_tokens TO authenticated;
GRANT ALL ON public.user_push_tokens TO service_role;
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_push_tokens ON public.user_push_tokens TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE TABLE public.push_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), activity_id uuid NOT NULL UNIQUE REFERENCES public.activity_feed(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','sent','skipped','failed')),
 attempts integer NOT NULL DEFAULT 0, sent_token_ids uuid[] NOT NULL DEFAULT '{}', retry_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(), last_error text
);
GRANT ALL ON public.push_outbox TO service_role;
ALTER TABLE public.push_outbox ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.claim_push_delivery(_id uuid) RETURNS SETOF public.push_outbox LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 UPDATE public.push_outbox SET status='processing',attempts=attempts+1,retry_at=now()+interval '10 minutes'
 WHERE id=_id AND attempts<6 AND (status='pending' OR (status IN ('failed','processing') AND retry_at<=now())) AND created_at>now()-interval '1 day' RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.claim_push_delivery(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_push_delivery(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.wake_push_delivery() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM net.http_post(url:='https://nadyafekoiaxoeqgvhtp.supabase.co/functions/v1/send-push-notification',headers:=jsonb_build_object('Content-Type','application/json'),body:=jsonb_build_object('dispatchId',NEW.id));
 RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END; $$;
CREATE TRIGGER push_outbox_wake AFTER INSERT OR UPDATE OF status ON public.push_outbox FOR EACH ROW WHEN (NEW.status='pending') EXECUTE FUNCTION public.wake_push_delivery();
CREATE OR REPLACE FUNCTION public.enqueue_activity_push() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.push_outbox(activity_id) VALUES(NEW.id) ON CONFLICT(activity_id) DO NOTHING;
 RETURN NEW;
END; $$;
CREATE TRIGGER activity_feed_push AFTER INSERT ON public.activity_feed FOR EACH ROW EXECUTE FUNCTION public.enqueue_activity_push();
CREATE OR REPLACE FUNCTION public.notify_friend_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' AND NEW.status='pending' AND NEW.user_id<>NEW.friend_id THEN
 INSERT INTO public.activity_feed(user_id,source_user_id,type,dedupe_key) VALUES(NEW.friend_id,NEW.user_id,'friend_request','friend_request:'||NEW.id) ON CONFLICT(dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
 ELSIF TG_OP='UPDATE' AND OLD.status='pending' AND NEW.status='accepted' THEN
 INSERT INTO public.activity_feed(user_id,source_user_id,type,dedupe_key) VALUES(NEW.user_id,NEW.friend_id,'friend_accepted','friend_accepted:'||NEW.id) ON CONFLICT(dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER friends_activity AFTER INSERT OR UPDATE OF status ON public.friends FOR EACH ROW EXECUTE FUNCTION public.notify_friend_activity();
CREATE POLICY verified_activity_actor ON public.activity_feed AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (
 source_user_id=auth.uid() AND dedupe_key IS NULL AND (
 (event_id IS NOT NULL AND (public.is_event_creator(event_id,auth.uid()) OR public.is_event_participant(event_id,auth.uid()))) OR
 (group_id IS NOT NULL AND public.is_group_admin(group_id,auth.uid()))
 ));
CREATE OR REPLACE FUNCTION public.generate_due_notifications() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE total integer:=0; inserted integer;
BEGIN
 INSERT INTO public.activity_feed(user_id,event_id,type,dedupe_key)
 SELECT p.user_id,e.id,'event_reminder','event_reminder:'||e.id||':'||p.user_id||':'||e.date
 FROM public.events e JOIN public.event_participants ep ON ep.event_id=e.id JOIN public.profiles p ON p.user_id=ep.user_id
 WHERE ep.status='confirmed' AND e.date_confirmed AND e.date=(now() AT TIME ZONE p.notification_timezone)::date
 AND extract(hour FROM now() AT TIME ZONE p.notification_timezone)>=8
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
CREATE EXTENSION IF NOT EXISTS pg_cron;