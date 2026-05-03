CREATE TABLE public.event_invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  created_by uuid NOT NULL,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX event_invite_links_token_key ON public.event_invite_links(token);
CREATE UNIQUE INDEX event_invite_links_event_unique ON public.event_invite_links(event_id);

ALTER TABLE public.event_invite_links ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can look up an invite link by token
CREATE POLICY "Public can view invite links"
ON public.event_invite_links FOR SELECT
USING (true);

CREATE POLICY "Event creators can create invite links"
ON public.event_invite_links FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by AND public.is_event_creator(event_id, auth.uid()));

CREATE POLICY "Event creators can delete invite links"
ON public.event_invite_links FOR DELETE
TO authenticated
USING (public.is_event_creator(event_id, auth.uid()));