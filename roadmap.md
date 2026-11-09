# Calendar refresh

- [x] Replace the default month display with a two-week grid, event chips, reply indicators and multi-day bars.
- [x] Preserve month navigation, friend availability and day details.
- [x] Verify calendar date rules and signed-in desktop/mobile interaction.
- [x] Compress both weeks for a mobile-first layout with all seven days visible.

# Split calendar redesign

- [x] Replace crowded cells with a compact selected-date grid and event dots.
- [x] Show a daily timeline with event details, friend availability, and date-prefilled creation.
- [x] Verify signed-in calendar selection, navigation, real-event opening, and phone layout.

# Native push notifications

- [x] Connect Firebase and mirror activity alerts into preference-aware native push delivery.
- [x] Add native FCM registration, safe tap navigation, Settings preferences, and Capacitor configuration.
- [x] Add friend alerts and idempotent scheduled day-of/poll-closing reminders.
- [x] Verify permissions, preferences, dispatch guards, and signed-in Settings; document Apple/Firebase device setup blockers.
- [ ] Native transport and device flows: requires GoogleService-Info.plist, Apple signing/APNs key setup, and a real iPhone.

# App Store readiness

- [x] Correct safe areas, phone input sizing, and public sharing/auth links.
- [x] Add public privacy, terms, and approved support email links.
- [x] Add authenticated permanent account deletion and two-step confirmations.
- [x] Add reporting, blocking, blocked-content suppression, and admin report review.
- [x] Verify safety rules and signed-in report, moderation, block/unblock, and deletion guard flows without deleting the owner's account.
- [ ] Legal owner identity and legal-text approval: waiting on owner details and review.
- [ ] Native device validation (including disposable-account deletion, photo permissions, speech support, and auth return handling) and App Store privacy disclosures: requires owner's Apple/native setup.
- [ ] Operational moderation and pre-publication content filtering strategy: requires owner policy and ongoing review; report/block controls alone do not guarantee App Store approval.
# Landing & login redesign

- [x] Landing: flat illustration, English-first copy, benefit boxes and language toggle removed.
- [x] Login: matching flat illustration with distinct animation and composition.

## Home top rebuild
- [ ] Greeting header, hero next-plan card with Cal, Needs you card; remove scorecards + feedback banner (feedback link to Profile)
