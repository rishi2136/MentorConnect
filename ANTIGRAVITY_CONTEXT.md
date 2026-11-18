# MentorConnect: Antigravity Handoff

Reviewed: 2026-10-31

## What this project is

MentorConnect is a mentor/student matching and session platform. The workspace has
two separate Node.js applications: a React/Vite client in `client/` and an
Express/Mongoose API in `server/`. There is no root-level package script; install,
run, build, and lint each app from its own directory.

Use the implementation as the source of truth. `client/README.md` is mostly the
original Vite template, and `client/engineer.md` is useful background but may not
reflect every recent backend or UI change.

## Stack and layout

- **Client:** React 19, TypeScript, Vite, Tailwind CSS 4, React Router 8, Socket.IO
  client.
- **Server:** Node.js, TypeScript, Express 5, MongoDB/Mongoose, Passport, persisted
  Express sessions, Socket.IO.
- **Client entry and routes:** `client/src/main.tsx`, `client/src/App.tsx`.
- **Client feature areas:** `client/src/pages/`, `client/src/components/`,
  `client/src/mentor-dashboard/`, `client/src/student-dashboard/`,
  `client/src/admin-dashboard/`.
- **API wiring:** `server/src/app.ts`, `server/src/routes/`,
  `server/src/controllers/`, `server/src/services/`, `server/src/models/`.
- **Realtime authorization and events:** `server/src/socket.ts`,
  `server/src/services/realtime.service.ts`.

The client has public routes `/`, `/mentors`, `/profile`, and `/chat`, plus
`/mentor-dashboard`, `/student-dashboard`, and `/admin-dashboard`. `App.tsx`
restores the current account from `/api/users/me`, guards dashboard routes by
role, and sends a signed-in user to the dashboard matching their access.

## Current implementation state

### Persisted/backend-backed features

- Email/password signup, login, logout, and current-user lookup use cookie-backed
  Passport sessions. Google OAuth is optional and requires configuration.
- Student and mentor profile CRUD routes are present. Public mentor search and
  mentor-by-ID endpoints are present.
- Audio-meet session endpoints support student requests, role-aware listing and
  retrieval, and permitted status changes. Scheduling validates future dates,
  duration, mentor availability/timezone, and overlapping sessions.
- Chat messages are stored in MongoDB. Socket connections require authentication;
  access to a conversation is checked against that session's student/mentor
  profiles, with admins allowed to view all session threads.
- Session updates are broadcast to participant user rooms and the admin room.

### UI that is still demo-oriented

- The public mentor directory/profile currently use local data in
  `client/src/data/mentors.ts`; they are not yet wired to the mentor search API.
- Mentor/student dashboard panels, sessions UI, payments/transactions, and
  mentor services are mostly local/demo UI rather than API-backed workflows.
- The admin dashboard has Overview, Users, Mentors, and Chat views; other
  navigation entries show a “coming soon” placeholder. Admin Users/Mentors views
  should not be assumed to be wired to admin APIs.
- The standalone `/chat` route and dashboard chat views reuse
  `client/src/components/chat/ChatWorkspace.tsx`. Chat conversations come from
  sessions; a session must exist before its thread appears.

## API and realtime contracts

All HTTP API routes are under `/api`:

- `/api/users`: `POST /signup`, `POST /login`, `POST /logout`, `GET /me`, and
  optional Google OAuth routes under `/auth/google`.
- `/api/students`: authenticated student profile endpoints (`GET /me`, `POST /`,
  `PUT /me`, `DELETE /me`).
- `/api/mentors`: public `GET /search` and `GET /:mentorProfileId`; authenticated
  mentor profile endpoints (`GET /me`, `POST /`, `PUT /me`, `DELETE /me`,
  `PATCH /me/free-session`).
- `/api/audio-meet-sessions`: student `POST /`; role-based `GET /me` and
  `GET /:sessionId`; student/mentor `PATCH /:sessionId/status`.

The client sends credentialed requests. In development, Vite proxies `/api` and
`/socket.io` to `http://localhost:5000`. Socket.IO uses the same session cookie.
Key chat events are `conversation:join`, `conversation:leave`, `chat:send`,
`chat:message`, `chat:activity`, and `session:updated`. Message text is limited
to 2,000 characters; the server loads the most recent 100 messages on join.

Session statuses are `requested`, `accepted`, `rejected`, `cancelled`, and
`completed`. Only the student can cancel a requested/accepted session; the mentor
can accept/reject a request or complete an accepted session.

## Local development

Prerequisites: Node.js/npm and a reachable MongoDB instance.

1. In `server/`, create `.env` from `.env.example` if you do not already have a
   local environment file. Preserve existing local secrets; never copy them into
   source control or this handoff. Set `MONGODB_URI` and provide a
   `SESSION_SECRET` of at least 32 characters. `CLIENT_ORIGIN` defaults to
   `http://localhost:5173`; Google OAuth values are optional.
2. Install and start the API from a terminal:

   ```powershell
   cd C:\Projects\mentorConnect\server
   npm ci
   npm run dev
   ```

3. Install and start the client from a second terminal:

   ```powershell
   cd C:\Projects\mentorConnect\client
   npm ci
   npm run dev
   ```

The API defaults to port `5000`; Vite defaults to `5173`. If changing either
origin/port, update the API environment and Vite proxy together.

## Validation commands

Run commands in the relevant app directory:

- Client typecheck + production build: `npm run build` (`tsc -b && vite build`)
- Client lint: `npm run lint`
- Server typecheck/build: `npm run build`

Neither package currently declares a `test` script. No automated test command is
documented in the package manifests, so validate the changed behavior directly
and report any checks that could not be run.

## Guidance for the next agent

- First confirm the next feature or bug with the user; this handoff records current
  state, not a feature roadmap.
- Before wiring a screen, check whether its data is still local/demo and reuse the
  existing API/service/model pattern where possible.
- Keep authorization checks server-side; hiding a dashboard control is not access
  control. For chat, retain the session-participant authorization boundary.
- Keep API types and client response handling aligned. Preserve cookie
  credentials on authenticated fetches and the Vite Socket.IO proxy in local dev.
- Follow the existing TypeScript and CSS component organization. Theme state is
  persisted by `App.tsx`; shared colors are CSS variables in `client/src/App.css`.
- Do not assume the workspace has Git metadata: this checkout was not recognized
  as a Git repository when the handoff was prepared. Confirm the intended repo
  and branch before committing or changing branch state.
