-- Groups table
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(name) > 0 AND char_length(name) <= 40),
  emoji TEXT NOT NULL DEFAULT '👯',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Group members junction table
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group ON public.group_members(group_id);
CREATE INDEX idx_group_members_user ON public.group_members(user_id);
CREATE INDEX idx_groups_created_by ON public.groups(created_by);

-- Security definer helpers (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_group_creator(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = _group_id AND created_by = _user_id
  )
$$;

-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- groups policies
CREATE POLICY "Members can view their groups"
  ON public.groups FOR SELECT
  TO authenticated
  USING (public.is_group_member(id, auth.uid()));

CREATE POLICY "Users can create groups"
  ON public.groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update group"
  ON public.groups FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Creator can delete group"
  ON public.groups FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- group_members policies
CREATE POLICY "Members can view group members"
  ON public.group_members FOR SELECT
  TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Creator can add members"
  ON public.group_members FOR INSERT
  TO authenticated
  WITH CHECK (public.is_group_creator(group_id, auth.uid()));

CREATE POLICY "Creator can remove members or self leave"
  ON public.group_members FOR DELETE
  TO authenticated
  USING (
    public.is_group_creator(group_id, auth.uid())
    OR auth.uid() = user_id
  );

-- Trigger: auto-add creator as first member
CREATE OR REPLACE FUNCTION public.add_creator_to_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id)
  VALUES (NEW.id, NEW.created_by)
  ON CONFLICT (group_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_add_creator_to_group
AFTER INSERT ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.add_creator_to_group();