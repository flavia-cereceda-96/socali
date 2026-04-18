

## Calendar overhaul plan

Skip Change 2 (it already works). Implement Changes 1, 3, 4, 5.

### Change 1 — Paginated month view
Rewrite `CalendarPage.tsx` from infinite week-scroll to a single-month grid:
- State: `viewMonth: Date` (defaults to current month, first of month)
- Sticky header (`sticky top-0 bg-background z-20`): `‹` button → previous month, centred bold 18px "Month YYYY", `›` button → next month, "Today" pill on the right that resets to current month
- Sticky day-of-week row (`sticky top-[57px] z-10`) with 12px small-caps muted labels
- 7-col grid, 6 rows, each cell `min-h-[56px]`. Cells from prev/next month at `opacity-30 pointer-events-none`
- Today: filled terracotta circle behind date number, white text
- 150ms slide transition on month change using `AnimatePresence` + `x` slide based on direction

### Change 3 — Friend busy-day tints
Friend palette (exact hex per spec):
- Friend 1: `#DBEAFE` (blue) at 70% opacity
- Friend 2: `#EDE9FE` (purple) at 70% opacity
- Friend 3: `#DCFCE7` (green) at 70% opacity

Applied as inline `style={{ backgroundColor }}` since they fall outside the design system. Cell layering:
- Background: friend tint (or stacked diagonal gradient if multiple friends busy)
- Foreground: date number + user's terracotta event dots (existing behaviour preserved)

Friend chip (Change 5 area) shows the same hex as a small filled dot so the legend is implicit.

### Change 4 — Day detail bottom sheet
Replace the current inline `AnimatePresence` expanding section with a shadcn `Sheet` (side="bottom") containing:
- Drag handle bar
- Bold date heading "Saturday, 25 April 2026"
- Scrollable list mixing user events + friend events
- Friend events: 3px left border in their assigned tint hex
- Empty state: "Nothing planned — tap + to add something ✨" linking to `/create?date=YYYY-MM-DD`
- Tap-outside or drag-down dismisses (built-in shadcn behaviour)

### Change 5 — Friend availability search
- Replace free-text `@` parsing with: input shows all confirmed friends in dropdown the moment user focuses or types a single `@`. As they type more, list filters by username substring.
- Selected friends row sits **below** the search input in a `overflow-x-auto flex` row (not flex-wrap above it)
- Each chip: avatar, username, coloured dot (matching grid tint), `×` remove
- Hard cap at 3. If user attempts a 4th selection, show inline `text-xs text-amber-600` "Maximum 3 friends at once" for 3 seconds
- Input clears after each selection

### Files
**Edit:** `src/pages/CalendarPage.tsx` (full rewrite — file is monolithic, ~400 lines, single responsibility, no need to split)
**No DB changes, no new components needed** (using existing shadcn `Sheet`).

### Out of scope
- Change 2 (skipped per your confirmation)

Approve and I'll write it.

