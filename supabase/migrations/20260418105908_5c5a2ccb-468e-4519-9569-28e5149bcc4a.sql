ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS link_url text,
ADD COLUMN IF NOT EXISTS link_label text;