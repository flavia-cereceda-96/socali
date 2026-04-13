

## Plan: Set Up Lovable Cloud Backend for Data Persistence & Auth

### Overview
Enable Lovable Cloud to add a real database and authentication, replacing the current localStorage-based onboarding with proper account creation and data storage.

### Steps

**1. Enable Lovable Cloud**
- Use Cloud tools to set up the Supabase-backed database and auth

**2. Create Database Tables**
- `profiles` table: `id` (FK to auth.users), `username`, `email`, `usage` (spouse/friends/own), `created_at`
- `events` table: `id`, `title`, `emoji`, `date`, `end_date`, `time`, `location`, `notes`, `is_trip`, `created_by` (FK to profiles)
- `event_participants` table: `id`, `event_id` (FK), `user_id` (FK), `status` (confirmed/maybe/declined/suggested)
- `friends` table: `id`, `user_id` (FK), `friend_id` (FK), `created_at`
- Set up RLS policies so users only see their own data and events they're invited to

**3. Update Onboarding to Use Real Auth**
- Replace localStorage with Supabase `signUp` (email + password) 
- After signup, create a profile row with username and usage preference
- Navigate to home on success

**4. Add Login Page**
- Create a `/login` page with email + password sign-in
- Add password field to the onboarding form for signup
- Update route guards to check Supabase session instead of `localStorage.getItem('onboarded')`

**5. Update App Routing**
- Replace `isOnboarded()` localStorage check with a Supabase auth session check using `onAuthStateChange`
- Redirect unauthenticated users to `/onboarding`

**6. Wire Up Event Creation**
- Update `CreateEventPage` to insert into the `events` table + `event_participants`
- Update home page and calendar to query real events from the database

### Files Modified
- `src/pages/OnboardingPage.tsx` — add password field, use Supabase signUp
- `src/pages/LoginPage.tsx` — new login page
- `src/App.tsx` — session-based routing
- `src/pages/CreateEventPage.tsx` — insert events to DB
- `src/pages/Index.tsx` — query events from DB
- `src/pages/CalendarPage.tsx` — query events from DB
- New migration files for tables + RLS policies
- `src/integrations/supabase/` — auto-generated client + types

### What stays the same
- All UI/UX (calendar views, @-mention input, RSVP buttons, bottom nav)
- Mock data kept as fallback during transition

