---
description: "Build the MentorConnect client experience with a landing page, filterable mentor directory, auth overlays, and light or dark theme support"
name: "Build MentorConnect Client UI"
argument-hint: "Describe any extra product, visual, or data requirements"
agent: "agent"
---
You are working in the MentorConnect repository. Build or refine the client-side website in `client/` based on the current workspace state and any extra requirements below.

Extra requirements: ${input:requirements:No additional requirements}

Before editing:
- Inspect `client/src/App.tsx`, `client/src/index.css`, `client/src/App.css`, `client/vite.config.ts`, and `client/package.json`.
- Inspect existing files under `client/src/pages`, `client/src/components`, `client/src/hooks`, `client/src/store`, `client/src/helpers`, and `client/src/utils`; preserve useful existing patterns and user changes.
- Use the existing React, TypeScript, Vite, and Tailwind setup. Add a dependency only when it is clearly necessary and compatible with the project.

Implement the following user-facing experience:
- A polished MentorConnect landing page with clear navigation, a strong value proposition, mentor discovery call to action, and responsive layout.
- A mentor list page where mentors are presented as reusable cards showing the relevant mentor information. Include useful controls for searching and filtering, with a clear empty state and responsive behavior.
- Login and signup as accessible modal or overlay forms with a translucent backdrop. They must open and close predictably, support dismissal through an explicit close action and backdrop or Escape where appropriate, and avoid duplicating form or modal logic.
- A light mode and dark mode experience with a persistent or consistently managed theme toggle. Ensure readable contrast, focus states, and appropriate colors in both modes.

Architecture and implementation constraints:
- Keep route or view selection in the app-level composition and put page-specific UI in `client/src/pages`.
- Put shared UI such as navigation, mentor cards, filters, modal primitives, auth forms, buttons, and theme controls in `client/src/components` when reused.
- Keep state and data shaping in the existing hooks/store/helpers/utils locations when that matches the codebase. Use typed local mock data if no backend contract is available; keep it easy to replace with API data later.
- Avoid redundant code, duplicated markup, and oversized monolithic components. Prefer small, composable components with clear TypeScript props.
- Follow existing naming and formatting conventions. Do not rewrite unrelated files or introduce unnecessary abstractions.
- Make the UI responsive for mobile and desktop, keyboard accessible, and free of overlapping or clipped content.
- Use purposeful visual hierarchy and a cohesive design system. Do not add explanatory text that merely describes how the UI works; make the controls and labels self-evident.

Completion requirements:
- Wire the experience into the existing entry point so it runs from the normal client command.
- Verify the touched client code with `npm run lint` and `npm run build` from `client/`.
- Report the files changed, the main interactions implemented, and any assumptions or remaining backend integration work.
