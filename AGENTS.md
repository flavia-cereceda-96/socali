# Project architecture

- Calendar date windows and multi-day placement use pure local-date helpers in `src/lib/calendarDisplay.ts`; this keeps week-start preferences and cross-week rendering testable without changing event data.
- Calendar date selectors and the inline daily timeline are presentation components; both two-week and month views reuse the calendar page's existing event and friend queries.