# MentorConnect

MentorConnect is a full-stack mentoring platform that connects students and
mentors through profiles, mentor discovery, scheduled sessions, real-time chat,
and browser-based video calls.

> **Project status:** Core account, profile, scheduled-session, chat, and
> WebRTC video-call paths are implemented. Some dashboard sections remain
> demonstration UI, and a production payment-provider integration is not
> configured. Review the current implementation before relying on any
> integration for production.

## Features

- Student, mentor, and administrator accounts with role-aware dashboards.
- Cookie-based authentication using email/password; optional Google OAuth.
- Student onboarding and profile management.
- Mentor profiles, availability, and API-backed mentor search.
- Scheduled one-to-one video sessions with mentor acceptance, cancellation,
  and completion workflows.
- Session chat backed by MongoDB and Socket.IO.
- WebRTC video with microphone audio, authenticated Socket.IO signaling, STUN,
  and optional TURN relay support.
- Local-time session booking inputs; saved session times are UTC instants, and
  weekly mentor availability is evaluated in the mentor's configured timezone.

## Technology

- **Client:** React, TypeScript, Vite, Tailwind CSS, React Router, Socket.IO
  client.
- **Server:** Node.js, TypeScript, Express, MongoDB/Mongoose, Passport,
  cookie-backed sessions, Socket.IO.

## Getting started

### Prerequisites

- Node.js `^20.19.0` or `>=22.12.0` and npm.
- MongoDB running locally or a reachable MongoDB instance.

### 1. Configure and run the server

From the project root, in PowerShell:

```powershell
cd server
npm ci
Copy-Item .env.example .env
```

Edit `server/.env` and set `MONGODB_URI` and a private `SESSION_SECRET` with at
least 32 characters. Keep `.env` files out of source control. The example uses
local MongoDB and the default development origins. Google OAuth is optional.

Start the API:

```powershell
npm run dev
```

The API listens on `http://localhost:5000` by default. Its root endpoint,
`http://localhost:5000/`, returns a health response.

### 2. Run the client

In a second terminal from the project root:

```powershell
cd client
npm ci
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` and `/socket.io` to the local
server. There is no root-level npm script; install and run each app separately.

### Optional Google sign-in

Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL` in
`server/.env`, and configure the same callback URL in the Google OAuth
application. Without these values, email/password authentication remains
available.

### Optional TURN relay for video

The server provides a default STUN server. For more reliable calls across
restrictive NATs, firewalls, VPNs, and mobile networks, configure
`TURN_SERVER_URLS` and `TURN_SHARED_SECRET` in `server/.env`. The TURN shared
secret must remain server-side; the API issues short-lived credentials to
authorized call participants. Use HTTPS for deployed client sites.

## Testing and validation

Run each command from its application directory.

**Server** (`server/`):

```powershell
npm test
npm run build
```

**Client** (`client/`):

```powershell
npm run build
npm run lint
```

### Quick local video-call test

1. Start MongoDB, the server, and the client.
2. From `server/`, run `npm run test:webrtc -- setup`. The helper creates
   temporary student and mentor accounts plus an accepted session in a local,
   non-production MongoDB database, then prints the test login details.
3. Open the printed call URL in two isolated browser profiles (for example,
   normal and private windows), sign in as the different participants, and
   allow camera and microphone access.
4. Confirm both participants can see video and hear audio. Headphones help
   prevent feedback when using one computer.
5. From `server/`, run `npm run test:webrtc -- cleanup` to remove the temporary
   test accounts and related data.

Scheduled calls are available from five minutes before the accepted session
start until its scheduled end. A one-laptop test validates the local media and
signaling path; test from separate networks and configure TURN to assess
restrictive-network connectivity.

## Architecture

```text
Browser A --HTTP + session cookie--> Express API --> MongoDB
Browser A --authenticated Socket.IO--> chat and call signaling
Browser A <========== WebRTC media ==========> Browser B
                       ICE: STUN / optional TURN
```

The API exposes authentication under `/api/users`, student profiles under
`/api/students`, mentor profiles and search under `/api/mentors`, and sessions
under `/api/audio-meet-sessions`. The session route keeps its legacy name for
compatibility; new and edited sessions are video-only. Session and chat access
is checked on the server, not just hidden in the UI.

## Repository layout

```text
client/     React application, pages, dashboards, and browser call UI
server/     Express API, MongoDB models, authentication, chat, and signaling
server/.env.example
            Template for local server configuration
context.md  Current technical handoff and coding-agent guidance
```

For current implementation details, known limitations, and important behavior
to preserve, see [`context.md`](./context.md). Additional video-session testing
notes are in [`client/README.md`](./client/README.md).

## Security notes

- Never commit `.env` files, API keys, OAuth credentials, session secrets, or
  TURN secrets. The root `.gitignore` excludes environment files while keeping
  `server/.env.example`.
- Do not put the TURN shared secret in client code or expose it to browsers.
- Production deployments require HTTPS and production-appropriate MongoDB,
  session, CORS, OAuth, and TURN configuration.
