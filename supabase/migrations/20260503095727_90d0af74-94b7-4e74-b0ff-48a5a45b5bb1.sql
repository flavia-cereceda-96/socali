-- Recreate groups RLS policies with public role for broader compatibility
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Members can view their groups" ON public.groups;
DROP POLICY IF EXISTS "Creator can update group" ON public.groups;
DROP POLICY IF EXISTS "Creator can delete group" ON public.groups;

CREATE POLICY "Users can create groups"
  ON public.groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Members can view their groups"
  ON public.groups FOR SELECT
  TO authenticated
  USING (is_group_member(id, auth.uid()) OR auth.uid() = created_by);

CREATE POLICY "Creator can update group"
  ON public.groups FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can delete group"
  ON public.groups FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Ensure RLS is enabled
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Recreate group_members policies cleanly
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;
DROP POLICY IF EXISTS "Creator can add members" ON public.group_members;
DROP POLICY IF EXISTS "Creator can remove members or self leave" ON public.group_members;

CREATE POLICY "Members can view group members"
  ON public.group_members FOR SELECT
  TO authenticated
  USING (is_group_member(group_id, auth.uid()) OR is_group_creator(group_id, auth.uid()));

CREATE POLICY "Creator can add members"
  ON public.group_members FOR INSERT
  TO authenticated
  WITH CHECK (is_group_creator(group_id, auth.uid()));

CREATE POLICY "Creator can remove members or self leave"
  ON public.group_members FOR DELETE
  TO authenticated
  USING (is_group_creator(group_id, auth.uid()) OR auth.uid() = user_id);