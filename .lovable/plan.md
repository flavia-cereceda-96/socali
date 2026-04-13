

## Plan: Friend Availability View + Plan Requests Section

### 1. Friend Availability Overlay on Calendar

Add a feature to the Calendar page where users can select friends and see their busy days overlaid on the calendar grid.

**Changes to `src/pages/CalendarPage.tsx`:**
- Add a friend selector panel (toggleable) at the top of the calendar — shows friend avatars as tappable chips
- When friends are selected, highlight their busy days on the calendar grid with colored indicators (each friend gets a distinct color dot)
- The calendar cells show stacked dots for multiple friends' events on the same day
- Selecting a day shows both your events and selected friends' events
- This helps users visually find free windows to plan something

**Mock data approach:** Since there's no real backend, generate mock "busy" schedules for each friend using their existing event participation data from `events[]`. Friends are "busy" on days they have events.

### 2. Plan Requests / Invitations Page

A new page showing all events where you've been invited (events not created by "you") with RSVP actions.

**New file `src/pages/RequestsPage.tsx`:**
- Filter events where `createdBy !== 'you'` (these are invitations from friends)
- Each invitation card shows: event details, who invited you, participant list, your current status
- RSVP buttons: Confirm, Maybe, Decline — updates status locally with state
- Visual distinction between pending (suggested) and already-responded invitations

**Changes to `src/components/BottomNav.tsx`:**
- Add a "Requests" tab (using `Mail` or `Inbox` icon) to the bottom nav

**Changes to `src/App.tsx`:**
- Add route `/requests` for the new page

### Technical Details

- Friend availability uses existing `events` data — a friend is busy on any day they appear as a participant
- Multi-day events: friend is busy on all days in the range
- RSVP state managed with `useState` locally (no persistence yet)
- Friend color assignment: a small palette mapped by friend index

