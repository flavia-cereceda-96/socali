-- ============ Roles ============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ App updates (release notes) ============
CREATE TABLE public.app_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text NOT NULL,
  emoji text NOT NULL DEFAULT '✨',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view updates"
ON public.app_updates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert updates"
ON public.app_updates FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = created_by);

CREATE POLICY "Admins can update updates"
ON public.app_updates FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete updates"
ON public.app_updates FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============ Per-user read state ============
CREATE TABLE public.user_update_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  update_id uuid NOT NULL REFERENCES public.app_updates(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, update_id)
);

ALTER TABLE public.user_update_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reads"
ON public.user_update_reads FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can mark as read"
ON public.user_update_reads FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============ Profile preference ============
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gcal_auto_export boolean NOT NULL DEFAULT false;