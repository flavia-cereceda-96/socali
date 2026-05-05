ALTER TABLE public.events ADD COLUMN IF NOT EXISTS creator_rsvp text NOT NULL DEFAULT 'confirmed';
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_creator_rsvp_check;
ALTER TABLE public.events ADD CONSTRAINT events_creator_rsvp_check CHECK (creator_rsvp IN ('confirmed', 'declined', 'pending'));