

## Fix: Infinite Recursion in Events/Participants RLS Policies

### Root Cause
The `events` SELECT policy ("Users can view invited events") queries `event_participants`, and the `event_participants` INSERT policy queries `events`. This creates a circular dependency that triggers infinite recursion during inserts.

Additionally, the "view invited events" policy has a bug: it compares `event_participants.event_id = event_participants.id` (self-referencing) instead of `event_participants.event_id = events.id`.

### Fix
1. Create a `SECURITY DEFINER` function `is_event_creator` that checks if a user created an event — bypasses RLS.
2. Create a `SECURITY DEFINER` function `is_event_participant` that checks if a user is a participant — bypasses RLS.
3. Drop and recreate the problematic policies to use these functions instead of subqueries, breaking the circular dependency.

### Migration SQL (single migration)
- `CREATE FUNCTION public.is_event_creator(event_id uuid, user_id uuid)` — checks `events.created_by`
- `CREATE FUNCTION public.is_event_participant(event_id uuid, user_id uuid)` — checks `event_participants.user_id`
- Replace `events` "view invited" policy to use `is_event_participant`
- Replace `event_participants` "creators can add/delete/view" policies to use `is_event_creator`

### Files Changed
- One new database migration only — no application code changes needed.

