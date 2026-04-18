-- Table to store per-user Google Calendar OAuth tokens
CREATE TABLE public.google_calendar_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  scope text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Users can see whether they have a connection (but the tokens themselves
-- are still readable only by them — edge functions use the service role).
CREATE POLICY "Users can view own gcal tokens"
ON public.google_calendar_tokens
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can disconnect (delete) their own connection.
CREATE POLICY "Users can delete own gcal tokens"
ON public.google_calendar_tokens
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- NOTE: No INSERT/UPDATE policies for client roles.
-- Only edge functions (service_role) may write tokens, preventing client tampering.

CREATE TRIGGER update_google_calendar_tokens_updated_at
BEFORE UPDATE ON public.google_calendar_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();