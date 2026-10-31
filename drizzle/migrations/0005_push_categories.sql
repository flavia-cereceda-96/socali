ALTER TABLE public.profiles
  ADD COLUMN push_plans boolean NOT NULL DEFAULT true,
  ADD COLUMN push_rsvps boolean NOT NULL DEFAULT true,
  ADD COLUMN push_comments boolean NOT NULL DEFAULT true,
  ADD COLUMN push_group_chat boolean NOT NULL DEFAULT false,
  ADD COLUMN push_friends boolean NOT NULL DEFAULT true;
UPDATE public.profiles SET push_plans = false, push_rsvps = false, push_comments = false, push_group_chat = false, push_friends = false WHERE push_notifications = false;