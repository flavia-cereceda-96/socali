# Project architecture

- Calendar date windows and multi-day placement use pure local-date helpers in `src/lib/calendarDisplay.ts`; this keeps week-start preferences and cross-week rendering testable without changing event data.
- The two-week calendar is a presentation component alongside the existing month grid; both reuse the calendar page's event queries and day detail sheet.