

## Plan: @-mention Input for Friend Availability

### What changes

**`src/pages/CalendarPage.tsx`:**
- Replace the chip-based friend selector with a text input field that supports `@name` mentions
- Input shows a dropdown/autocomplete of matching friends when user types `@`
- Selected friends appear as removable tags/pills below the input (with their avatar + colored dot)
- Move the entire availability section (input + selected friends) to sit **above** the calendar month header, always visible (no toggle button needed)
- Remove the "Availability" toggle button from the header — the input is always present
- Keep the existing busy-day dot logic and selected-day friend status indicators unchanged

### UX flow
1. User sees an input field above the calendar: placeholder `"Type @name to check availability..."`
2. Typing `@` or `@al` shows a filtered dropdown of friends from the `friends` array
3. Selecting a friend adds them as a pill/tag and triggers the busy-day overlay
4. Tags are removable with an × button

### Technical details
- Local state: `query` string, `showDropdown` boolean
- Filter `friends` by name match when query contains `@`
- Reuse existing `selectedFriends`, `friendBusyMap`, and color dot logic
- No new dependencies needed

