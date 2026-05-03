
-- 1. Add membership_status to group_members
ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS membership_status text NOT NULL DEFAULT 'pending'
    CHECK (membership_status IN ('pending', 'accepted', 'declined'));

-- 2. Existing members are accepted
UPDATE public.group_members SET membership_status = 'accepted' WHERE membership_status = 'pending';

-- 3. Update creator-auto-add trigger to mark creator as accepted
CREATE OR REPLACE FUNCTION public.add_creator_to_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, membership_status)
  VALUES (NEW.id, NEW.created_by, 'accepted')
  ON CONFLICT (group_id, user_id) DO UPDATE SET membership_status = 'accepted';
  RETURN NEW;
END;
$$;

-- 4. RLS: users can update their own group_members row (status)
DROP POLICY IF EXISTS "Users can update own membership" ON public.group_members;
CREATE POLICY "Users can update own membership"
  ON public.group_members FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Pending invitees also need to see groups they're invited to (group name, etc.)
-- Update is_group_member to include any membership row regardless of status (already does).
-- But ensure SELECT policy on groups also lets pending invitees see the row.
-- Existing policy "Members can view their groups" uses is_group_member — already covers them.

-- 6. Add group_id to activity_feed for group_invite notifications
ALTER TABLE public.activity_feed
  ADD COLUMN IF NOT EXISTS group_id uuid;
