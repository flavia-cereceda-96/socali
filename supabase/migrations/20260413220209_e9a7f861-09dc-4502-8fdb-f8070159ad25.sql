
-- Add status column to friends table
ALTER TABLE public.friends 
ADD COLUMN status text NOT NULL DEFAULT 'pending';

-- Update existing rows to 'accepted' (they were added before this feature)
UPDATE public.friends SET status = 'accepted';

-- Drop old update-blocking state: allow recipients to update
DROP POLICY IF EXISTS "Users can view their friends" ON public.friends;

CREATE POLICY "Users can view their friends"
ON public.friends FOR SELECT
USING ((auth.uid() = user_id) OR (auth.uid() = friend_id));

-- Allow the recipient (friend_id) to update the request status
CREATE POLICY "Recipients can respond to friend requests"
ON public.friends FOR UPDATE
USING (auth.uid() = friend_id);
