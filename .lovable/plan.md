

## Plan: Simplify Home Screen + Add Pending RSVP Section

### Changes to `src/pages/Index.tsx`:

1. **Remove the scorecard** — drop the confirmed/maybe/pending breakdown card entirely as it adds no value
2. **Filter "Upcoming Plans" to confirmed only** — show events where at least one participant (or the user's own status) is confirmed; keep the simple count in the header if useful (e.g., "X plans this week")
3. **Add "Pending RSVPs" section** — below the upcoming plans, show a new section listing events where `createdBy !== 'you'` and the user hasn't responded yet (status is `'suggested'`). Each card links to the event detail or the Requests page. Include RSVP action buttons (Confirm, Maybe, Decline) inline.

### Technical details
- Confirmed events: filter `weekEvents` where `createdBy === 'you'` OR the user's participant status is `'confirmed'` — since there's no real "current user" participant entry, use `createdBy === 'you'` as proxy for "your confirmed plans" plus events where all participants are confirmed
- Pending RSVPs: filter `events` where `createdBy !== 'you'` (invitations from others) — reuse the same card style but add inline RSVP buttons with local state
- RSVP state managed with `useState` (same pattern as `RequestsPage.tsx`)

### Files modified
- `src/pages/Index.tsx` — remove scorecard, split events into confirmed vs pending RSVP sections

