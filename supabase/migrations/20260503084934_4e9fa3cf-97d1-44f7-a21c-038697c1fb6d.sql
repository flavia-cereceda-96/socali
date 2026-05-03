-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.send_notification_email_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _url text := 'https://nadyafekoiaxoeqgvhtp.supabase.co/functions/v1/send-notification-email';
  _anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hZHlhZmVrb2lheG9lcWd2aHRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMDU1OTgsImV4cCI6MjA5MTY4MTU5OH0.o_ee9jRS18eDvuq5K4h8oa_S_wj9nR4XOH20MfF-dqM';
BEGIN
  PERFORM extensions.http_post(
    url := _url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || _anon),
    body := jsonb_build_object('record', to_jsonb(NEW))
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the insert if email dispatch fails
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS activity_feed_send_email ON public.activity_feed;
CREATE TRIGGER activity_feed_send_email
AFTER INSERT ON public.activity_feed
FOR EACH ROW
EXECUTE FUNCTION public.send_notification_email_trigger();