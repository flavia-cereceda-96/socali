

## Plan: Multi-Day Events + Home Screen Scorecard

### 1. Support Multi-Day Events (e.g., Trips)

**Data model changes** (`src/data/mockData.ts`):
- Add optional `endDate` field to `SocialEvent` interface
- Add a mock multi-day event (e.g., "Weekend Trip 🏕️" spanning 2-3 days)

**Event creation** (`src/pages/CreateEventPage.tsx`):
- Add a toggle/option at step 0 for "Multi-day" planning
- When multi-day is selected, show start date and end date inputs at step 2 instead of single date + time

**Event detail** (`src/pages/EventDetailPage.tsx`):
- Display date range (e.g., "Friday Apr 17 – Sunday Apr 19") when `endDate` exists

**Event card** (`src/components/EventCard.tsx`):
- Show date range indicator for multi-day events (e.g., "3 days" label)

### 2. Home Screen Scorecard + 7-Day Filter

**Home page** (`src/pages/Index.tsx`):
- Remove the feed insights section
- Add a scorecard summary card at the top showing: "X events coming up this week" with confirmed/pending counts
- Filter the events list to only show next 7 days (already the case with mock data, but add explicit filtering logic)

### Technical Details

- `SocialEvent.endDate?: Date` — optional, only set for multi-day events
- Scorecard uses the same `events` array, filtered to `date <= today + 7 days`
- Create event flow adds a "Multi-day / Trip" toggle that swaps the date input UI

