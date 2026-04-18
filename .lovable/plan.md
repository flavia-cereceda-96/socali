

## Current state

The current "Google Calendar export" is a **link generator**, not an integration:
- `src/lib/googleCalendar.ts` builds a `calendar.google.com/render?action=TEMPLATE&...` URL
- `autoExportGCalIfEnabled` opens that URL in a new tab
- Nothing is ever written to the user's calendar via API; the user has to click "Save" on Google's side every time
- There's no OAuth, no token storage, no two-way sync

## What "real integration" means

A real Google Calendar integration requires **per-user OAuth** (each user authorises access to *their own* calendar — not the workspace owner's). Per the Lovable connector docs, connectors authenticate the developer's account, so they're not suitable here. We need our own OAuth flow.

The full real integration involves:
1. A Google Cloud project with OAuth 2.0 credentials (Client ID + Secret) with the `https://www.googleapis.com/auth/calendar.events` scope
2. Storing per-user `access_token` + `refresh_token` securely (in a new `google_calendar_tokens` table, RLS-locked to the owner)
3. An OAuth start edge function that redirects the user to Google's consent screen
4. An OAuth callback edge function that exchanges the code for tokens and stores them
5. A `gcal-create-event` edge function that uses the stored token (refreshing if expired) to POST to `https://www.googleapis.com/calendar/v3/calendars/primary/events`
6. Settings UI: "Connect Google Calendar" / "Disconnect" + connection status
7. Wire `autoExportToGCalIfEnabled` (and any explicit export buttons) to call the edge function instead of opening a URL

## What I need from you (the user)

The Lovable platform cannot create Google OAuth credentials for you — you have to register an OAuth client in **Google Cloud Console**. I'll guide you, but you'll need to:

1. Create/choose a project at https://console.cloud.google.com
2. Enable the **Google Calendar API**
3. Configure the OAuth consent screen (External, add your email as a test user)
4. Create an **OAuth 2.0 Client ID** (Web application)
5. Add this exact redirect URI:
   `https://nadyafekoiaxoeqgvhtp.supabase.co/functions/v1/gcal-oauth-callback`
6. Copy the **Client ID** and **Client Secret** — I'll prompt for them as secrets

## Implementation plan

### 1. Database
Migration to create `google_calendar_tokens`:
- `user_id uuid PK references auth.users`
- `access_token text`, `refresh_token text`, `expires_at timestamptz`, `scope text`
- RLS: only the owner can `select`/`delete` their row; only edge functions (service role) can `insert`/`update`

### 2. Secrets
Request from user: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

### 3. Edge functions
- `gcal-oauth-start` — builds Google consent URL with `access_type=offline&prompt=consent`, returns it to the client
- `gcal-oauth-callback` — exchanges `code` for tokens, upserts into `google_calendar_tokens`, redirects user back to `/settings?gcal=connected`
- `gcal-create-event` — accepts an event payload, loads the user's token, refreshes if needed, POSTs to Calendar API, returns the created event id/link

### 4. Frontend
- `src/lib/gcalClient.ts` — `connectGoogleCalendar()`, `disconnectGoogleCalendar()`, `isGoogleCalendarConnected()`, `createGCalEvent(event)`
- `SettingsPage.tsx` — replace the auto-export switch with a real **Connect Google Calendar** button showing connection status, plus the "auto-export new events" switch (only enabled once connected)
- `autoExportGCal.ts` — call `createGCalEvent` instead of `window.open`, toast success/failure with link to the created event
- `EventDetailPage.tsx` "Add to Google Calendar" button — same treatment

### 5. Cleanup
- Keep `googleCalendar.ts` URL builder as a fallback only if user hasn't connected; otherwise hide it

## Files

**Create:** migration for `google_calendar_tokens`; `supabase/functions/gcal-oauth-start/index.ts`, `gcal-oauth-callback/index.ts`, `gcal-create-event/index.ts`; `src/lib/gcalClient.ts`
**Edit:** `src/pages/SettingsPage.tsx`, `src/lib/autoExportGCal.ts`, `src/pages/EventDetailPage.tsx`
**Secrets requested:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

Once you approve, I'll start with the migration + edge function scaffolding, then prompt you for the two Google secrets before wiring the UI.

