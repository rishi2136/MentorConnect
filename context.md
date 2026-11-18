# MentorConnect coding-agent context

Updated: 2026-11-18

This file is the current technical handoff for coding agents. Treat the running
code and package manifests as the source of truth when details conflict with
older notes. The root [README](./README.md) is the user-facing project overview
and setup guide.

## Project at a glance

MentorConnect is a React/TypeScript client and Express/TypeScript API for
student-mentor profiles, mentor discovery, scheduled video sessions, and
session chat. MongoDB/Mongoose stores users, profiles, sessions, chat messages,
and persistent Express sessions.

There are two independent npm applications and no root `package.json`:

- `client/`: React, Vite, Tailwind CSS, React Router, Socket.IO client.
- `server/`: Express, Mongoose, Passport, Mongo-backed sessions, Socket.IO.

Use the individual package scripts in `client/package.json` and
`server/package.json`; do not assume root npm scripts exist.

## Implemented paths

- Email/password signup, login, logout, and current-user restoration.
- Optional Google OAuth, enabled only when the server OAuth variables are
  configured.
- Student onboarding and persisted student profile CRUD.
- Mentor profile CRUD, availability configuration, and API-backed mentor
  search/profile reads.
- Scheduled video-session booking, mentor acceptance/rejection, cancellation,
  editing of eligible requests, and completion.
- Persistent session chat with authenticated Socket.IO and server-side
  participant authorization.
- Scheduled WebRTC video calls with camera and microphone media, Socket.IO
  signaling, STUN, and optional short-lived TURN credentials.

Some dashboard areas (notably admin management views, services, and financial
screens) still contain local or demonstration UI. Do not assume that a visible
screen is backed by a production API. No production payment-provider integration
is configured.

## Runtime setup and validation

Prerequisites: Node.js `^20.19.0` or `>=22.12.0`, npm, and a reachable MongoDB.
The client uses Vite's development proxy to forward `/api` and `/socket.io` to
`http://localhost:5000`.

1. In `server/`, install with `npm ci`, copy `.env.example` to `.env`, set
   `MONGODB_URI`, and replace `SESSION_SECRET` with a private value of at least
   32 characters. Start with `npm run dev`.
2. In `client/`, install with `npm ci` and start with `npm run dev`.
3. Keep all real credentials in ignored `.env` files or deployment secrets.
   Never paste them into source, docs, client code, or agent context.

Useful checks:

- Server: `npm test`, `npm run build`
- Client: `npm run build`, `npm run lint`
- Local video fixture: from `server/`, `npm run test:webrtc -- setup` and
  `npm run test:webrtc -- cleanup`. This helper refuses production mode and
  non-local MongoDB hosts.

## API and data flow

- `/api/users`: signup, login, logout, current user, optional Google OAuth.
- `/api/students`: authenticated student profile CRUD.
- `/api/mentors`: public search/profile reads and authenticated mentor profile
  CRUD/free-session setting.
- `/api/audio-meet-sessions`: authenticated session booking, listing, detail,
  edit/delete, state changes, and `/:sessionId/ice-servers`.

The session route name `audio-meet-sessions` is legacy compatibility. New and
edited sessions are video-only; legacy database mode values can remain readable.
Session state and participant checks live in server controllers/services and
`server/src/socket.ts`.

Authentication uses an HTTP-only session cookie persisted to MongoDB.
Socket.IO shares the Express session middleware and requires an authenticated
user. Chat messages are stored in MongoDB. For WebRTC, the call page obtains
ICE configuration through the authenticated ICE-server endpoint, then exchanges
offers, answers, and ICE candidates over Socket.IO. Media itself is carried by
the WebRTC peer connection, not Socket.IO.

### Authorization and call invariants

- A call requires an accepted session and a participant who owns the matching
  student or mentor profile. Admins cannot join scheduled calls.
- The call window begins five minutes before `scheduledAt` and ends at the
  scheduled session end; the server enforces this independently of the UI.
- `canJoinSession()` in `server/src/socket.ts` authorizes chat conversations.
  It intentionally permits admins to access any session conversation; current
  chat join/send handlers use that helper, so this also permits admin messages.
  Do not mistake this for call authorization. If admin read-only chat is wanted,
  separate read and send permissions and add focused tests.
- Keep authorization on the server. Client-side route guards and hidden buttons
  are UX, not security boundaries.

### Timezone invariants

- Booking and edit inputs use the user's browser-local clock.
- Session instants are stored as UTC and shared session displays use UTC.
- Weekly mentor availability is interpreted in the mentor's configured IANA
  timezone. Do not shift existing availability settings when changing display
  behavior.

### WebRTC configuration

- Default STUN is configured by the server ICE service.
- TURN is optional for local/same-network testing but recommended for
  restrictive NATs, firewalls, VPNs, and mobile networks.
- `TURN_SHARED_SECRET` is server-only. The server signs short-lived TURN REST
  credentials; never ship the shared secret to the client.
- Deployed camera/microphone access requires HTTPS. Localhost is treated as a
  secure origin by browsers.

## Important files

- Client routing, auth restoration, and role guards: `client/src/App.tsx`
- Mentor directory and profile pages: `client/src/pages/MentorsPage.tsx`,
  `client/src/pages/MentorProfilePage.tsx`
- Student onboarding: `client/src/student-dashboard/pages/StudentOnboardingPage.tsx`
- Session/call UI: `client/src/mentor-dashboard/components/SessionsPanel.tsx`,
  `client/src/pages/SessionCallPage.tsx`
- Shared call-window helper: `client/src/utils/session-call.ts`
- Browser chat: `client/src/components/chat/`
- Express setup and API mounts: `server/src/app.ts`
- API routes: `server/src/routes/`
- Session scheduling and persistence: `server/src/services/audio-meet-session.service.ts`
- Socket.IO auth, chat, signaling, and call checks: `server/src/socket.ts`
- ICE/STUN/TURN configuration: `server/src/services/ice-server.service.ts`
- Local WebRTC fixture: `server/src/scripts/webrtc-test.ts`
- Environment template: `server/.env.example`

## Working conventions

- Read existing route/controller/service/model patterns before adding a feature.
- Keep role and ownership checks server-side and align client request/response
  types with API contracts.
- Preserve cookie credentials on HTTP requests and the Vite Socket.IO proxy.
- Keep secrets out of source and test fixtures should use clearly fake values.
- Add focused tests for new behavior or fixed edge cases; use existing package
  test/build/lint commands.
- Avoid claiming production readiness for demo screens or unconfigured external
  services.

## Recent project work

- Student onboarding and profile flows were added to the student experience.
- Session booking was updated to use the user's local clock while preserving
  UTC storage and mentor-timezone availability validation.
- The scheduled call experience was made video-first with a five-minute-early
  join window, server-side authorization, TURN configuration support, and a
  local two-browser-profile test helper.
- Git is initialized on `main`, with `origin` set to
  `https://github.com/rishi2136/MentorConnect.git`. Use the configured Git
  credential manager for future pushes; never put access tokens in this file or
  chat.
