REVOKE ALL ON public.push_outbox FROM anon,authenticated;
GRANT ALL ON public.push_outbox TO service_role;
REVOKE ALL ON public.user_push_tokens FROM anon;
CREATE OR REPLACE FUNCTION public.validate_notification_timezone() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=NEW.notification_timezone) THEN RAISE EXCEPTION 'Invalid notification timezone'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER profiles_notification_timezone BEFORE INSERT OR UPDATE OF notification_timezone ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.validate_notification_timezone();