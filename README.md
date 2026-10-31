# Cali

Here’s your upgraded Lovable prompt with the differentiation baked in — this is now positioned as a social planning app, not a calendar.

🚀 Lovable Prompt: Social Calendar App (People-First Planning)

App Name: SyncCircle (working name)

🧠 Core Concept

Build a mobile-first social planning app that helps couples and small groups of friends effortlessly plan time together.

This is not a traditional calendar.
It is a people-first, social coordination tool where:

Users plan with people (not just time slots)

Events feel like conversations

The experience is lightweight, fun, and intuitive

🎯 Product Principles

People-first (not schedule-first)

Fast > feature-heavy

Social > transactional

Emotionally engaging UI (not corporate/calendar-like)

🏠 1. Home Screen (Social Feed / Weekly Overview)

Purpose:

A living view of your social life, not a static list

Components:

🔹 Weekly Snapshot

Show next 7 days of plans

Each event displayed as a card with:

Title (e.g. “Dinner 🍝”)

Time

Participants (avatars)

Status (Suggested / Maybe / Confirmed)

🔹 Social Feed Elements

“Upcoming plans”

“Pending invites”

“You haven’t seen [Friend] in a while”

“You’re free on Thursday evening” (optional smart insight)

🔹 Quick Actions

Floating CTA: “Plan something”

Shortcut to:

Create event

Start from friend

👥 2. People-First Flow (Core Differentiator)

Instead of:

“Create event → add people”

Build:

“Pick people → plan something”

Flow:

Select a friend or group

See:

Past events together

Upcoming plans

CTA:
👉 “Plan something together”

📅 3. Calendar Screen (Secondary View)

Purpose:

Visual overview of time, but still social

Features:

Monthly calendar view

Days with events are highlighted

Click on a day:

Shows events + participants

Ability to create event from a selected date

💬 4. Event Creation (Chat-Style Experience)

Replace traditional forms with:

A lightweight, conversational creation flow

Input:

Natural input:

“Dinner tomorrow at 8”

“Gym with Alex Friday morning”

Event Fields (auto or manual):

Title

Date & time

Participants

Optional:

Location

Notes

UX:

Feels like messaging (inspired by WhatsApp / iMessage)

Minimal steps (2–3 taps max)

🤝 5. Invitations & Social Interaction

Invitation Flow:

Invited users receive a request

Response Types:

👀 Suggested (default)

🤔 Maybe

✅ Confirmed

❌ Declined

Event Interaction:

Participants can:

Accept / decline / maybe

React with emojis

Comment (light chat thread per event)

Visibility:

Show participant status clearly

Animate when users accept (subtle delight)

⚡ 6. Coordination Features (High Value)

“Find a Time”

Suggest overlapping availability across participants

Poll Scheduling

Creator proposes multiple times:

“Wed / Thu / Fri?”

Participants vote

🎨 7. UI / UX Design Direction

Style:

Clean, minimal, friendly

Soft colors, rounded cards

Avatar-driven UI

Inspirations:

Social feel: Instagram

Messaging feel: WhatsApp

Simplicity baseline: Google Calendar

Micro-interactions:

Emoji reactions 🎉🍷

Smooth transitions between states

Visual confirmation when event becomes “locked in”

🧱 Data Model (Simple)

User

id

name

email

Event

id

title

start_time

end_time

created_by

is_private

EventParticipants

user_id

event_id

status (suggested / maybe / confirmed / declined)

Friend

user_id

friend_id

🔔 8. Notifications

New invite

Status updates (someone accepted)

Event reminders

🔮 Optional (If scope allows)

Shared groups (e.g. “Household”)

Memory layer:

Past events timeline

Photos/comments after events

🧩 Output Requirements

Mobile-first UI

Two main screens:

Social Home (7-day + feed)

Calendar View

Functional:

Event creation

Invites

Status tracking

Smooth navigation between screens

💡 Key UX Goal (VERY IMPORTANT)

Users should feel:
👉 “Planning something with friends is effortless and fun”

NOT:
👉 “I am managing a calendar”

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://socali.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/437aa7d0-02a1-413b-a0ad-9ce0f8a8fbfe).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
