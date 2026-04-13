
ALTER TABLE public.event_participants
ADD COLUMN decline_note TEXT;

ALTER TABLE public.events
ADD COLUMN end_time TIME WITHOUT TIME ZONE;
