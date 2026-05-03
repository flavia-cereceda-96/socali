CREATE OR REPLACE FUNCTION public.send_notification_email_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _url text := 'https://nadyafekoiaxoeqgvhtp.supabase.co/functions/v1/send-notification-email';
  _anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hZHlhZmVrb2lheG9lcWd2aHRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMDU1OTgsImV4cCI6MjA5MTY4MTU5OH0.o_ee9jRS18eDvuq5K4h8oa_S_wj9nR4XOH20MfF-dqM';
BEGIN
  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || _anon),
    body := jsonb_build_object('record', to_jsonb(NEW))
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;