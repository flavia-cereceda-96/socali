
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS avatar_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('group-avatars', 'group-avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Group avatars are publicly viewable" ON storage.objects;
CREATE POLICY "Group avatars are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'group-avatars');

DROP POLICY IF EXISTS "Group creators can upload group avatars" ON storage.objects;
CREATE POLICY "Group creators can upload group avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'group-avatars'
  AND public.is_group_creator(((storage.foldername(name))[1])::uuid, auth.uid())
);

DROP POLICY IF EXISTS "Group creators can update group avatars" ON storage.objects;
CREATE POLICY "Group creators can update group avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'group-avatars'
  AND public.is_group_creator(((storage.foldername(name))[1])::uuid, auth.uid())
);

DROP POLICY IF EXISTS "Group creators can delete group avatars" ON storage.objects;
CREATE POLICY "Group creators can delete group avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'group-avatars'
  AND public.is_group_creator(((storage.foldername(name))[1])::uuid, auth.uid())
);
