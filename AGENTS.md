# Project architecture

- Calendar date windows and multi-day placement use pure local-date helpers in `src/lib/calendarDisplay.ts`; this keeps week-start preferences and cross-week rendering testable without changing event data.
- Calendar date selectors and the inline daily timeline are presentation components; both four-week and month views reuse the calendar page's existing event and friend queries.
- Account deletion runs through a JWT-validated edge function, removes files through Storage APIs, purges public data via a service-role-only RPC, then deletes the auth account; this prevents users selecting another account and avoids storage orphans.
- Reports and blocks use shared safety controls and restrictive read policies across UGC tables; moderation decisions require the protected platform-admin role rather than event/group admin privileges.
- Public share links use the canonical app URL, web auth keeps its own origin, and native external links/shares use guarded Capacitor plugins; this keeps web behavior intact while avoiding native-only URL schemes.
- Native push uses the Firebase Messaging plugin (FCM tokens, never APNs tokens), owner-scoped registration and a private activity outbox; recipient data and destinations are resolved server-side to prevent forged deliveries.
- Notification taps use shared allowlisted route helpers and recipient matching; keep listeners mounted through sign-in so cold-start taps can open safely after authentication.
- Due notifications use one hourly, idempotent database job in each recipient's stored timezone; day-of reminders and date-poll deadline alerts reuse activity inserts rather than bypassing notification preferences.