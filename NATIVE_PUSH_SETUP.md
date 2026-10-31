# Native push setup

## Implemented

Every new activity item enqueues native push independently of email. Preferences default off and are separate from email; blocked senders are suppressed. Settings requests phone permission only when enabled. Initial and refreshed **FCM** tokens are registered to the authenticated account, revoked on logout, and removed after Firebase reports an invalid registration. Never substitute the APNs device token for an FCM token.

The iOS project, Firebase Messaging plugin, APNs callbacks, foreground alert/sound presentation, remote-notification background mode and debug/release push entitlements are included. Notification taps use internal allowlisted destinations and matching recipient identity. A signed-out tap waits until the matching account signs in.

Friend request/acceptance alerts are generated on persisted friend changes. One hourly database job generates day-of reminders and date-poll-closing alerts, with unique event/recipient/date keys to prevent duplicates. Reminders use the recipient's timezone (Amsterdam fallback until a phone preference update); normally 08:00 local, earlier for morning events. Poll alerts occur on the deadline day, starting at 08:00 local. Only date polls have a stored deadline. This does not invent a closing date for independent activity/venue polls.

The private dispatch outbox uses unguessable, single-use identifiers, atomic claims, per-device progress, collapse keys, and bounded retries for temporary failures; it never accepts arbitrary recipients or message text. Hourly reconciliation retries failures for up to six attempts within 24 hours. Delivery cannot be guaranteed by APNs/FCM; no system can retract a notification already delivered before opting out.

## Required on your Mac / Firebase / Apple account

1. Update your local project from the connected repository, run `npm install`, then `npx cap sync ios`.
2. In Firebase project **socali26**, register the iOS app with bundle ID `app.lovable.p437aa7d002a1413ba0ad9ce0f8a8fbfe`. Download its **GoogleService-Info.plist**. Add it in Xcode to the App target, ensuring target membership and Copy Bundle Resources. It is not present here; launching native Firebase without it will fail.
3. In Apple Developer, enable push for that exact App ID. Create an APNs authentication key. Upload the `.p8` key, key ID and Apple team ID in Firebase → Project settings → Cloud Messaging → Apple app configuration. Never place the private Apple key in this repository.
4. Open `ios/App/App.xcodeproj` with Xcode. Select your signing team and regenerate provisioning profiles with Push Notifications enabled. Check **Push Notifications** and **Background Modes → Remote notifications** under Signing & Capabilities.
5. Current `capacitor.config.ts` uses the Lovable sandbox URL for device development. **Before an App Store archive remove the entire `server` block** so the native app loads bundled web assets. Build the updated web app locally (`npm run build`) and run `npx cap sync ios` again. Do not ship a sandbox hot-reload URL.
6. Run on a real iPhone. Sign in, enable Push notifications in Settings, then generate a real invitation from another account. Verify foreground, background, terminated-app tap, opted-out suppression, logout/account-switch isolation, denied-permission recovery, Spanish copy and refreshed tokens. APNs transport and these native states cannot be verified inside the web preview.
7. For Android later: run `npx cap add android`, add the matching Firebase `google-services.json`, and sync. Android setup is not generated here.

## Verification here

Firebase credentials passed a validation-only request (no notification delivered). Web Settings stays safe and disables native-only controls. Route/preference rules and authenticated registration/dispatch guards are tested. Full native delivery awaits the Apple credentials, Firebase iOS configuration file and real-device check above.

Guide: https://lovable.dev/blog/mobile-app