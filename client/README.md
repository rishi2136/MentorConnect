# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

## Realtime session messaging

The Messages workspace uses Socket.IO and cookie-based account authentication.
Each chat thread belongs to a scheduled session; only that session's
student and mentor can join it, while admins can view every session thread.
Messages are stored in MongoDB, and session status changes are broadcast to
the participants and admins.

For local development, run the server on port 5000 and the client on port 5173.
Vite proxies `/api` and `/socket.io` to the server. Production deployments should
route both paths to the server (or configure the client and server to share an
appropriate origin).

## Video sessions

Sessions use WebRTC video with microphone audio and authenticated Socket.IO
for signaling. A call requires an accepted session and is available from five
minutes before its scheduled start until its scheduled end. Sessions are stored
and compared as UTC instants. Weekly availability is interpreted in the
mentor's configured IANA timezone for availability checks. Booking and edit
inputs, plus booking suggestions, use the current user's computer timezone so
entered clock times match their device. Session records remain canonical UTC instants; session
lists, details, call windows, and chat timestamps keep the shared UTC display.

The booking form suggests upcoming starts from the mentor's weekly availability
and presents those instants in the student's computer timezone. Students can
also enter a custom time using their computer's clock. The server converts the
input to a UTC instant and checks it against the mentor's configured timezone;
the shared session display remains UTC so participants see the same saved
session time. Mentor availability settings retain their configured timezone so
existing weekly hours are not silently shifted.

The browser requests camera and microphone access only after the participant
chooses to test devices or start a video call. Accepted-session buttons start
the call automatically when clicked during its join window; outside that
window they open the session page, where the start button becomes available at
the correct time. If access was previously denied, the browser may not show
a new prompt; allow the devices for the site in browser site settings. Calls
require HTTPS in production; localhost is treated as a secure origin for local
development.

The default ICE setup uses STUN. Configure a TURN relay in the server
environment (`TURN_SERVER_URLS`, `TURN_SHARED_SECRET`, and optionally
`TURN_CREDENTIAL_TTL_SECONDS`) for reliable connections across restrictive
NATs, firewalls, VPNs, and mobile networks. Keep the TURN shared secret on the
server only. Verify calls with two distinct participant accounts and, for
network coverage, test from separate networks. A connected WebRTC status alone
does not verify physical microphone/camera quality; confirm that participants
can hear and see each other.

### Quick local video-call test

1. Start MongoDB, then run `npm run dev` from both the `server` and `client`
   folders.
2. In `server`, run `npm run test:webrtc -- setup`. This creates temporary
   student/mentor accounts and an already accepted video session that is
   available immediately. The helper refuses production mode and non-local
   MongoDB hosts.
3. For a one-laptop test, open the printed call URL in two isolated browser
   profiles (for example, Chrome normally and Chrome Incognito). Sign in as
   the student in one and the mentor in the other using the printed
   credentials. Do not use two tabs in the same profile: they share one login
   session.
4. Allow camera and microphone access in both profiles. On both pages, choose
   **Test camera & microphone**, then **Start video call**. A single
   laptop camera can show the same view to both participants. Headphones are
   recommended to prevent speaker-to-microphone echo. Without headphones, mute
   one participant's microphone and keep the laptop speaker volume low while
   checking the call.
5. Confirm both call pages show the peer video and that the unmuted participant
   can be heard. Test mute, camera off, and **Leave call**. If the second
   profile reports that a device is busy, close the first profile's device
   test, then retry; some camera or audio drivers do not allow two browser
   profiles to use the same device simultaneously.
6. To remove the temporary accounts, session, and its messages, run
   `npm run test:webrtc -- cleanup` from `server`.

The test session lasts 30 minutes. For an automated device check without
physical hardware, Chromium can be started with
`--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`; this
validates permission and negotiation flows but not real camera/microphone
quality. Cross-network reliability still requires a configured TURN relay.

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
