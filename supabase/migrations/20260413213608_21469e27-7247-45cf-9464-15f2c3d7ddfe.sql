-- Allow authenticated users to search profiles by username (for adding friends)
CREATE POLICY "Users can search profiles by username"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);