-- bucket_lists table
CREATE TABLE public.bucket_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('friend','group')),
  group_id uuid,
  user_a uuid,
  user_b uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (type = 'group' AND group_id IS NOT NULL AND user_a IS NULL AND user_b IS NULL) OR
    (type = 'friend' AND group_id IS NULL AND user_a IS NOT NULL AND user_b IS NOT NULL AND user_a < user_b)
  )
);

CREATE UNIQUE INDEX bucket_lists_group_unique ON public.bucket_lists(group_id) WHERE type = 'group';
CREATE UNIQUE INDEX bucket_lists_friend_unique ON public.bucket_lists(user_a, user_b) WHERE type = 'friend';

-- bucket_list_items table
CREATE TABLE public.bucket_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_list_id uuid NOT NULL REFERENCES public.bucket_lists(id) ON DELETE CASCADE,
  added_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  emoji text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','done')),
  linked_event_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  done_at timestamptz
);

CREATE INDEX bucket_list_items_list_idx ON public.bucket_list_items(bucket_list_id, created_at DESC);

-- Helper: is current user a member of this bucket list
CREATE OR REPLACE FUNCTION public.is_bucket_list_member(_bucket_list_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bucket_lists bl
    WHERE bl.id = _bucket_list_id
      AND (
        (bl.type = 'friend' AND (bl.user_a = _user_id OR bl.user_b = _user_id))
        OR (bl.type = 'group' AND public.is_accepted_group_member(bl.group_id, _user_id))
      )
  )
$$;

-- Helper: get-or-create a friend bucket list between two users (only callable if caller is one of them and they are accepted friends)
CREATE OR REPLACE FUNCTION public.get_or_create_friend_bucket_list(_other_user uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _a uuid;
  _b uuid;
  _id uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _me = _other_user THEN RAISE EXCEPTION 'Invalid friend'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.friends
    WHERE status = 'accepted'
      AND ((user_id = _me AND friend_id = _other_user) OR (user_id = _other_user AND friend_id = _me))
  ) THEN
    RAISE EXCEPTION 'Not friends';
  END IF;

  IF _me < _other_user THEN _a := _me; _b := _other_user;
  ELSE _a := _other_user; _b := _me;
  END IF;

  SELECT id INTO _id FROM public.bucket_lists
   WHERE type='friend' AND user_a = _a AND user_b = _b;

  IF _id IS NULL THEN
    INSERT INTO public.bucket_lists (type, user_a, user_b)
    VALUES ('friend', _a, _b)
    RETURNING id INTO _id;
  END IF;

  RETURN _id;
END;
$$;

-- Helper: get-or-create group bucket list (caller must be accepted member)
CREATE OR REPLACE FUNCTION public.get_or_create_group_bucket_list(_group_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _id uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF NOT public.is_accepted_group_member(_group_id, _me) THEN
    RAISE EXCEPTION 'Not a group member';
  END IF;

  SELECT id INTO _id FROM public.bucket_lists WHERE type='group' AND group_id = _group_id;
  IF _id IS NULL THEN
    INSERT INTO public.bucket_lists (type, group_id) VALUES ('group', _group_id) RETURNING id INTO _id;
  END IF;
  RETURN _id;
END;
$$;

-- List bucket lists the current user belongs to (with summary)
CREATE OR REPLACE FUNCTION public.get_my_bucket_lists()
RETURNS TABLE (
  id uuid,
  type text,
  group_id uuid,
  other_user_id uuid,
  total_count bigint,
  done_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    bl.id,
    bl.type,
    bl.group_id,
    CASE
      WHEN bl.type='friend' AND bl.user_a = auth.uid() THEN bl.user_b
      WHEN bl.type='friend' AND bl.user_b = auth.uid() THEN bl.user_a
      ELSE NULL
    END AS other_user_id,
    COALESCE((SELECT COUNT(*) FROM public.bucket_list_items i WHERE i.bucket_list_id = bl.id), 0) AS total_count,
    COALESCE((SELECT COUNT(*) FROM public.bucket_list_items i WHERE i.bucket_list_id = bl.id AND i.status='done'), 0) AS done_count
  FROM public.bucket_lists bl
  WHERE
    (bl.type='friend' AND (bl.user_a = auth.uid() OR bl.user_b = auth.uid()))
    OR (bl.type='group' AND public.is_accepted_group_member(bl.group_id, auth.uid()));
$$;

-- RLS
ALTER TABLE public.bucket_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bucket_list_items ENABLE ROW LEVEL SECURITY;

-- bucket_lists policies
CREATE POLICY "Members can view their bucket lists"
  ON public.bucket_lists FOR SELECT TO authenticated
  USING (public.is_bucket_list_member(id, auth.uid()));

-- Inserts go through SECURITY DEFINER helpers; restrict direct insert to members only
CREATE POLICY "Members can create bucket lists"
  ON public.bucket_lists FOR INSERT TO authenticated
  WITH CHECK (
    (type = 'friend' AND (user_a = auth.uid() OR user_b = auth.uid()))
    OR (type = 'group' AND public.is_accepted_group_member(group_id, auth.uid()))
  );

-- bucket_list_items policies
CREATE POLICY "Members can view items"
  ON public.bucket_list_items FOR SELECT TO authenticated
  USING (public.is_bucket_list_member(bucket_list_id, auth.uid()));

CREATE POLICY "Members can add items"
  ON public.bucket_list_items FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = added_by
    AND public.is_bucket_list_member(bucket_list_id, auth.uid())
  );

-- Any member can update (mark done / link event); creator can edit fields
CREATE POLICY "Members can update items"
  ON public.bucket_list_items FOR UPDATE TO authenticated
  USING (public.is_bucket_list_member(bucket_list_id, auth.uid()))
  WITH CHECK (public.is_bucket_list_member(bucket_list_id, auth.uid()));

CREATE POLICY "Adder can delete item"
  ON public.bucket_list_items FOR DELETE TO authenticated
  USING (auth.uid() = added_by);
