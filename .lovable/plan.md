# Plan: Floating Action Button + Notification Bell on All Main Pages

## 1. New shared component: `src/components/FloatingActionButton.tsx`
- Fixed-position circular button, bottom-right.
- Position: `fixed bottom-[88px] right-4 z-40` (88px clears the BottomNav + safe-area).
- Size 56×56, rounded-full, background `#FFB8C6`, white `Plus` icon (Lucide), subtle shadow, tap scale animation.
- `onClick` → `navigate('/create')`.
- Respects `env(safe-area-inset-bottom)` by adding it to `bottom` via inline style.
- Accepts optional `className` / `hidden` prop in case a page needs to hide it (not used now, but useful for modals).

## 2. Reuse existing `AppHeader` for the bell
`AppHeader` already renders the title + bell with the unread badge and navigates to `/requests`. We'll reuse it as-is on every main page. (The badge is already a small red pill — matches the "red dot" requirement; no change needed.)

## 3. Mount on each main page
Add both `<AppHeader title="..." />` at the top and `<FloatingActionButton />` near the root return of:

- `src/pages/Index.tsx` — already has `AppHeader`; just add `<FloatingActionButton />`.
- `src/pages/CalendarPage.tsx` — add `<AppHeader title="Calendar" />` above existing content; add FAB. Keep the existing sticky month header below it.
- `src/pages/PeoplePage.tsx` — add `<AppHeader title="People" />` and FAB. (Covers both Friends and Groups tabs since they share this page.)
- `src/pages/GroupDetailPage.tsx` — has its own back-button header; **skip the AppHeader** here (it's a sub-page, not a main tab) but still add the FAB so users can quickly create an event. Actually per scope ("Groups" tab = PeoplePage), we'll skip GroupDetailPage entirely to avoid changing its custom header. Confirm in implementation.
- `src/pages/ProfilePage.tsx` — add `<AppHeader title="Profile" />` and FAB.

Decision: treat the 5 "main pages" as: Home (Index), Calendar, People (Friends+Groups tabs), Profile. GroupDetailPage is a sub-page and is left unchanged.

## 4. Layout safety
- FAB `z-40`, BottomNav is `z-50` — FAB sits above content but below nav, and is positioned above the nav vertically so they don't overlap.
- `bottom: calc(72px + env(safe-area-inset-bottom))` to clear the nav on devices with home indicators.

## Technical notes
- No new dependencies.
- No DB / RLS / auth changes.
- AppHeader already uses `useUnreadActivityCount` so the badge logic is shared automatically.
- FAB uses Tailwind + inline style for the safe-area `bottom` calc.

## Files
- Create: `src/components/FloatingActionButton.tsx`
- Edit: `src/pages/Index.tsx`, `src/pages/CalendarPage.tsx`, `src/pages/PeoplePage.tsx`, `src/pages/ProfilePage.tsx`
