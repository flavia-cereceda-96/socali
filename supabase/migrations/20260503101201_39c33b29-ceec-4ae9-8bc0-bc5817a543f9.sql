-- 1. Grant admin role to the specified user
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'flavia.cereceda@outlook.com'
ON CONFLICT DO NOTHING;

-- 2. Migrate feedback status to new values + default
UPDATE public.feedback SET status = 'created' WHERE status IS NULL OR status NOT IN ('created','accepted','rejected');
ALTER TABLE public.feedback ALTER COLUMN status SET DEFAULT 'created';
ALTER TABLE public.feedback ALTER COLUMN status SET NOT NULL;

-- 3. Add developer response flag to comments
ALTER TABLE public.feedback_comments ADD COLUMN IF NOT EXISTS is_developer_response BOOLEAN NOT NULL DEFAULT false;

-- 4. Restrict status changes to admins via trigger
CREATE OR REPLACE FUNCTION public.enforce_feedback_status_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Only admins can change feedback status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS feedback_status_admin_only ON public.feedback;
CREATE TRIGGER feedback_status_admin_only
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.enforce_feedback_status_admin();

-- 5. Restrict developer-response flag on comments to admins via trigger
CREATE OR REPLACE FUNCTION public.enforce_developer_response_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_developer_response = true THEN
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Only admins can post developer responses';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS comment_dev_response_admin_only ON public.feedback_comments;
CREATE TRIGGER comment_dev_response_admin_only
  BEFORE INSERT OR UPDATE ON public.feedback_comments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_developer_response_admin();