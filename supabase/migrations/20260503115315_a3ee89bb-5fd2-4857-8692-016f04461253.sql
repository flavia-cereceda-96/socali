
-- Group messages table
CREATE TABLE public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_group_messages_group ON public.group_messages(group_id, created_at DESC);

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Helper: accepted member check
CREATE OR REPLACE FUNCTION public.is_accepted_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id AND user_id = _user_id AND membership_status = 'accepted'
  )
$$;

CREATE POLICY "Members can view group messages"
ON public.group_messages FOR SELECT TO authenticated
USING (public.is_accepted_group_member(group_id, auth.uid()));

CREATE POLICY "Members can post group messages"
ON public.group_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_accepted_group_member(group_id, auth.uid()));

CREATE POLICY "Authors or admins can delete messages"
ON public.group_messages FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.is_group_admin(group_id, auth.uid()));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
ALTER TABLE public.group_messages REPLICA IDENTITY FULL;

-- Trigger: notify other accepted members on new message
CREATE OR REPLACE FUNCTION public.notify_group_on_new_message()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activity_feed (user_id, type, group_id, source_user_id, is_read)
  SELECT gm.user_id, 'group_message', NEW.group_id, NEW.user_id, false
  FROM public.group_members gm
  WHERE gm.group_id = NEW.group_id
    AND gm.membership_status = 'accepted'
    AND gm.user_id <> NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS group_messages_notify ON public.group_messages;
CREATE TRIGGER group_messages_notify
AFTER INSERT ON public.group_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_group_on_new_message();
