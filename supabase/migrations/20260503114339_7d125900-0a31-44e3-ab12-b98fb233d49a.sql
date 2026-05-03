-- Add role to group_members for admin promotion
ALTER TABLE public.group_members 
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member';

-- Make creator an admin going forward and backfill existing creators
UPDATE public.group_members gm
SET role = 'admin'
FROM public.groups g
WHERE gm.group_id = g.id AND gm.user_id = g.created_by;

-- Update creator-add trigger to set admin role
CREATE OR REPLACE FUNCTION public.add_creator_to_group()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, membership_status, role)
  VALUES (NEW.id, NEW.created_by, 'accepted', 'admin')
  ON CONFLICT (group_id, user_id) DO UPDATE 
    SET membership_status = 'accepted', role = 'admin';
  RETURN NEW;
END;
$function$;

-- Helper: is user an admin of a group? (creator counts as admin too)
CREATE OR REPLACE FUNCTION public.is_group_admin(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id 
      AND user_id = _user_id 
      AND role = 'admin'
      AND membership_status = 'accepted'
  ) OR EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = _group_id AND created_by = _user_id
  );
$$;

-- Allow admins (not just creator) to add members
DROP POLICY IF EXISTS "Creator can add members" ON public.group_members;
CREATE POLICY "Admins can add members"
ON public.group_members FOR INSERT
TO authenticated
WITH CHECK (public.is_group_admin(group_id, auth.uid()));

-- Allow admins to remove members or self leave
DROP POLICY IF EXISTS "Creator can remove members or self leave" ON public.group_members;
CREATE POLICY "Admins can remove members or self leave"
ON public.group_members FOR DELETE
TO authenticated
USING (public.is_group_admin(group_id, auth.uid()) OR auth.uid() = user_id);

-- Allow admins to update member roles (promote/demote). Keep self-update.
DROP POLICY IF EXISTS "Users can update own membership" ON public.group_members;
CREATE POLICY "Admins or self can update membership"
ON public.group_members FOR UPDATE
TO authenticated
USING (public.is_group_admin(group_id, auth.uid()) OR auth.uid() = user_id)
WITH CHECK (public.is_group_admin(group_id, auth.uid()) OR auth.uid() = user_id);

-- Allow admins to update group details (name, description, avatar)
DROP POLICY IF EXISTS "Creator can update group" ON public.groups;
CREATE POLICY "Admins can update group"
ON public.groups FOR UPDATE
TO authenticated
USING (public.is_group_admin(id, auth.uid()))
WITH CHECK (public.is_group_admin(id, auth.uid()));