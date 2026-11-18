# MentorConnect Client Engineering Notes

## Scope

This document records the client-side work implemented so far in MentorConnect. The client is a React and TypeScript application built with Vite and Tailwind CSS. The current implementation contains public mentor discovery experiences, a shared chat experience, and a dedicated mentor dashboard.

## Technology Stack

- React 19 with TypeScript
- Vite for development and production bundling
- Tailwind CSS 4 through `@tailwindcss/vite`
- `react-router` 8.3.0 for browser routing
- ESLint with TypeScript, React Hooks, and React Refresh rules
- CSS custom properties for the application theme

Available client commands, run from this directory:

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

## Source Structure

```text
src/
  App.tsx                 Application state and route composition
  App.css                 Shared visual system and responsive styles
  index.css               Global reset, base typography, and theme root
  components/             Public and shared client-facing components
    chat/                 Shared chat workspace, sidebar, and window
  data/                   Public/shared typed mock data
  pages/                  Public client-facing pages
  mentor-dashboard/       Mentor-only feature area
    components/           Mentor dashboard-only reusable components
    pages/                Mentor dashboard page modules
    data.ts               Dashboard overview data and navigation types
    sessionData.ts        Mentor session data and status types
  student-dashboard/      Reserved boundary for future student-only features
```

The `components/` folder is for components shared by public pages or more than one role. Components inside `mentor-dashboard/` are intentionally scoped to the mentor product area and should not be imported into the normal public interface. The student dashboard follows the same intended boundary and currently contains only a placeholder file.

## Application Shell and Routing

`src/App.tsx` owns application-level state:

- Selected mentor for the profile page
- Login/signup modal state
- Light/dark theme state persisted in `localStorage` under `mentorconnect-theme`

The app is wrapped in `BrowserRouter` from `react-router`. The current routes are:

| Path                | Page                | Purpose                                    |
| ------------------- | ------------------- | ------------------------------------------ |
| `/`                 | `HomePage`          | Public landing page                        |
| `/mentors`          | `MentorsPage`       | Searchable and filterable mentor directory |
| `/profile`          | `MentorProfilePage` | Selected mentor profile and courses        |
| `/chat`             | `ChatPage`          | Shared standalone chat page                |
| `/mentor-dashboard` | `MentorDashboard`   | Mentor-only dashboard shell                |

The public `Header` is rendered for public routes and hidden for `/mentor-dashboard`. This prevents the public site navigation from appearing inside the role-specific dashboard.

## Public Client Experience

### Landing page

`pages/HomePage.tsx` provides the public introduction, mentor discovery call to action, social proof, trust strip, and the three-step explanation section. It receives callbacks from the app shell for mentor discovery and authentication.

### Mentor directory

`pages/MentorsPage.tsx` uses typed records from `data/mentors.ts`. It supports:

- Text search over mentor name, role, company, and specialty
- Specialty filtering
- Available-now filtering
- Empty state with filter reset
- Selection of a mentor for the profile route

`components/MentorCard.tsx` is reusable and receives a `Mentor` plus a selection callback.

### Mentor profile

`pages/MentorProfilePage.tsx` renders the selected mentor hero, experience summary, expertise, contact information, and courses. Reused public components include:

- `components/CourseCard.tsx`
- `components/SiteFooter.tsx`
- `components/AuthModal.tsx`

The profile uses local typed mock course data until a backend course contract is available.

## Shared Chat

Chat is intentionally in the normal shared client flow because both mentors and students need it.

- `pages/ChatPage.tsx` provides the standalone public page heading and uses `ChatWorkspace`.
- `components/chat/ChatWorkspace.tsx` owns selected-contact state and composes the chat sidebar and message window.
- `components/chat/ChatSidebar.tsx` renders typed conversation contacts and selection state.
- `components/chat/ChatWindow.tsx` renders messages and owns the local message composer behavior.
- `data/chat.ts` contains the shared typed mock contacts.

The mentor dashboard imports `ChatWorkspace` through `mentor-dashboard/pages/MentorChatPage.tsx`, so the dashboard and standalone route use the same chat implementation rather than duplicating it.

## Mentor Dashboard

`mentor-dashboard/MentorDashboard.tsx` is a feature shell. It owns the active dashboard navigation item and delegates page rendering to the dedicated pages folder:

- `pages/MentorOverviewPage.tsx` composes the dashboard overview panels.
- `pages/MentorChatPage.tsx` renders the shared chat workspace in compact dashboard layout.
- `pages/MentorSessionsPage.tsx` renders the mentor session experience.

Dashboard-only reusable components are located in `mentor-dashboard/components/`:

- `DashboardSidebar.tsx`: mentor navigation and mobile navigation behavior
- `DashboardTopbar.tsx`: dashboard greeting, search, notifications, avatar, and theme toggle
- `DashboardPanels.tsx`: overview panel components and panel-level reusable pieces
- `SessionCard.tsx`: typed upcoming, live, and past session card
- `SessionsPanel.tsx`: session filters, search, sorting, counts, and empty state

The public header is not rendered on the mentor dashboard route. The dashboard has its own sidebar and top-level controls.

### Session functionality

The Sessions tab uses `mentor-dashboard/sessionData.ts` and supports:

- Past sessions
- Upcoming sessions
- Live sessions
- All sessions
- Search by student or topic
- Sort by date or student
- Status counts
- Session-specific actions such as joining a live session or viewing notes

The session data is currently local mock data. Session cards accept an action callback so API actions or modals can be added without changing the card presentation.

## Theme System

Theme state is managed once in `App.tsx`. Every theme-aware view receives the current state or reads the CSS variables applied to `document.documentElement`.

- `ThemeToggle.tsx` is shared by public navigation and dashboard controls.
- `data-theme="light"` and `data-theme="dark"` are written to the root element.
- Theme preference is persisted in `localStorage`.
- `App.css` defines shared variables such as `--paper`, `--surface`, `--ink`, `--muted`, `--green`, and `--lime`.
- Public pages, chat, mentor dashboard, and sessions consume those variables instead of maintaining separate palettes.

When adding a new page, use the existing variables rather than hardcoding a new color system. Ensure borders, muted text, inputs, panels, hover states, and focus states remain readable in both themes.

## Mentor Dashboard (Extended)

### Overview and Navigation

`mentor-dashboard/MentorDashboard.tsx` manages the active dashboard tab state and conditionally renders pages. The active dashboard pages include:

- `Dashboard` (overview with panels)
- `Chat` (shared chat workspace)
- `Sessions` (session management)
- `Transactions` (transaction history and metrics)
- `Services` (mentor service creation and listing)
- `Profile` (shared profile section across dashboards)

### Dashboard Sidebar and Topbar

- `DashboardSidebar.tsx`: Displays the active dashboard type label (MENTOR DASHBOARD, STUDENT DASHBOARD, or ADMIN DASHBOARD) in uppercase below the logo. Supports custom nav items passed as props and icon mapping for each navigation item.
- `DashboardTopbar.tsx`: Shows user greeting, search bar, notifications, home button, theme toggle, and avatar. Hidden on the Sessions tab for layout consistency.

### Transactions Page

`pages/MentorTransactionsPage.tsx` provides mentor transaction history with:

- Filter buttons (All, Completed, Pending, Cancelled)
- Pagination logic (items per page, current page state, visible items calculation)
- Transaction table with columns: Date, Description, Amount, Status, Type
- Metrics cards showing Total Earnings, This Month, and Pending Amount
- Status badge styling (completed, pending, cancelled states)

Styling in `mentor-dashboard/transactions.css` supports responsive tables, filter UI, and metric card layouts.

### Services Management (Modular)

`pages/MentorServicesPage.tsx` allows mentors to create and list their services. Implemented with a modular component structure in `mentor-dashboard/components/services/`:

**File structure:**

- `serviceTypes.ts` - TypeScript type definition for `MentorService` (id, title, price, expertise[], languages[], quote, emoji)
- `ServiceForm.tsx` - Form component for creating a new service with comma-separated expertise and language inputs
- `ServiceCard.tsx` - Reusable card displaying a single service with all details, expertise tags, language tags, and quote
- `ServiceList.tsx` - Container component that maps services to cards and displays the services count

**Features:**

- Validation for required fields (title, expertise, languages, quote)
- Automatic parsing of comma-separated expertise and languages
- Live service list update after creation
- Default mock services for demonstration
- Per-minute pricing with emoji icon selection
- Service quote as a highlighted blockquote section

Styling in `MentorDashboard.css` includes form grid layouts, currency field styling, tag groups, and card presentation.

## Student Dashboard

`student-dashboard/StudentDashboard.tsx` follows the same shell pattern as the mentor dashboard with its own nav items and page routing.

### Navigation Items

The Student Dashboard includes:

- Overview
- Messages (uses shared ChatWorkspace)
- Sessions (uses shared SessionsPanel)
- Payments
- Profile (uses shared ProfilePage)
- Community
- Settings

### Pages

**StudentOverviewPage:**

- Reuses dashboard panel components from mentor dashboard (new courses, premium upgrade, activity chart, today's sessions, calendar, my classes, assignments)
- Displays student-specific content with StudentDashboardPanels components

**StudentPaymentsPage:**

- Metrics cards: Total spent, This month, Payment method
- Recent transactions table with columns: Date, Mentor, Session type, Duration, Amount, Status
- Status badges for Paid and Pending transactions
- Transaction history with sorting and filtering capability

**Pages Reused from Mentor Dashboard:**

- `MentorChatPage` - Chat workspace in compact layout
- `MentorSessionsPage` - Session panel with filters and management
- `ProfilePage` - Shared profile section

### Styling

`MentorDashboard.css` contains shared payment page styles:

- `.payments-page` - Main container
- `.payments-metrics` - Grid layout for metric cards
- `.metric-card` - Individual metric styling
- `.payments-table` and `.status-badge` - Table and status styling

## Admin Dashboard

`admin-dashboard/AdminDashboard.tsx` is a new role-specific dashboard following the same architecture as mentor and student dashboards.

### Navigation Items

- Dashboard (overview)
- Users (placeholder)
- Mentors (placeholder)
- Transactions (placeholder)
- Reports (placeholder)
- Settings (placeholder)

### Pages

**AdminOverviewPage:**

- Key metrics grid: Total Users, Active Mentors, Total Revenue, Active Sessions
- Admin panel hero section with system management messaging
- Placeholder structure for future admin features

### Dashboard Type Support

All three dashboards (mentor, student, admin) use the shared `DashboardSidebar` component with `dashboardType` prop:

- `"MENTOR"` → displays "MENTOR DASHBOARD"
- `"STUDENT"` → displays "STUDENT DASHBOARD"
- `"ADMIN"` → displays "ADMIN DASHBOARD"

## Shared Profile Section

`mentor-dashboard/components/ProfileSection.tsx` and `mentor-dashboard/pages/ProfilePage.tsx` provide a reusable profile UI shared across mentor and student dashboards.

**Features:**

- Profile avatar and cover image
- User stats (sessions completed, students mentored, satisfaction rate)
- Contact information (email, phone, location, timezone)
- Social links (LinkedIn, Twitter, GitHub, Portfolio)
- Education history with school, degree, and year
- Employment history with company, role, duration, and description
- Responsive grid layout

Styling in `MentorDashboard.css` includes profile section blocks, contact rows, education/employment grids, and responsive breakpoints.

## Header and Navigation

### Header Component (`src/components/Header.tsx`)

The header is now unified with CSS classes instead of inline Tailwind strings for better maintainability:

**Header Structure:**

- Logo button with brand mark
- Navigation items: Home, Find a mentor, Dashboard (dropdown), Chat, How it works
- Action buttons: Theme toggle, Log in, Get started

**CSS Classes (in App.css):**

- `.header-wrapper` - Main header layout (82px height, max-width 1240px)
- `.header-logo` - Logo button with hover opacity transition
- `.brand-mark` - Green square with M icon
- `.header-nav` - Navigation container with flex gap
- `.header-nav-item` - Navigation button styling with active state
- `.header-nav-link` - Link styling for static links
- `.header-actions` - Right-side action buttons container
- `.header-button` - Base button styling with transform hover
- `.header-button.primary` - Primary green button variant

### Dashboard Dropdown (`src/components/DashboardDropdown.tsx`)

New dropdown component for dashboard navigation:

**Features:**

- Single "Dashboard" button that opens a dropdown menu
- Three options: Mentor Dashboard, Student Dashboard, Admin Dashboard
- Active state highlighting for current dashboard
- Animated chevron icon (rotates on open)
- Menu closes automatically after selection

**CSS Classes (in App.css):**

- `.dashboard-dropdown-wrapper` - Relative positioned container
- `.dashboard-dropdown-menu` - Positioned dropdown with shadow and border
- `.dashboard-dropdown-item` - Individual menu item styling
- `.dashboard-dropdown-item.active` - Highlighted current selection with green accent

**Integration:**

- Replaces separate "Dashboard" and "Student Dashboard" buttons in header
- Uses `header-nav-item` class for visual consistency
- Menu closes on selection via state management

## Styling System

### CSS Organization

Styles are organized across:

- `App.css` - Shared visual system, header, navigation, dashboard dropdown
- `mentor-dashboard/MentorDashboard.css` - Dashboard shell, panels, profile, sessions, services, payments
- `mentor-dashboard/transactions.css` - Transaction-specific styles

### Reusable Classes and Patterns

**Dashboard Panels:**

- `.dashboard-grid` - Multi-column layout for overview panels
- `.dashboard-panel` - Individual panel card styling
- `.panel-heading` - Panel title and action area

**Form Styling:**

- `.field` - Label and input container
- `.form-grid` - Grid layout for form fields
- `.currency-field` - Special styling for price inputs with $ prefix
- `.compact-row` - Tight form row for related fields

**Tables:**

- `.payments-table` - Table base styling
- `.status-badge` - Status indicator badges (paid, pending, cancelled)

**Tags and Lists:**

- `.tag-group` - Flex container for tag display
- `.tag` - Individual tag styling with background
- `.muted-tag` - Variant tag with muted colors

**Buttons:**

- `.primary-button` - Green action button
- `.secondary-button` - Muted secondary button

## Routing and App Integration

The `App.tsx` route configuration now includes:

| Path                 | Component          | Purpose                |
| -------------------- | ------------------ | ---------------------- |
| `/mentor-dashboard`  | `MentorDashboard`  | Mentor-only dashboard  |
| `/student-dashboard` | `StudentDashboard` | Student-only dashboard |
| `/admin-dashboard`   | `AdminDashboard`   | Admin-only dashboard   |

The Header is hidden for all three dashboard routes to prevent navigation conflicts with dashboard-specific sidebars.

## Component and Folder Guidelines

- Keep route composition and global state in `App.tsx`.
- Keep public pages in `src/pages`.
- Keep public/shared components in `src/components`.
- Keep shared chat UI in `src/components/chat`.
- Keep mentor-only page modules in `src/mentor-dashboard/pages`.
- Keep mentor-only reusable UI in `src/mentor-dashboard/components`.
- Organize feature-specific sub-components in subdirectories (e.g., `services/` for service components).
- Put typed feature mock data beside its feature until it is replaced by API services.
- Prefer typed props and callback-driven actions over direct cross-feature state access.
- Do not move dashboard components into the public `components/` folder unless they become genuinely shared by another role.
- Avoid duplicating chat, cards, filters, modal logic, or theme logic.

## Validation

The current implementation has been validated with:

```bash
npm run lint
npm run build
npx tsc -p tsconfig.app.json --noEmit
```

`npm run build` runs TypeScript project compilation followed by the Vite production bundle. Run both commands after changes that affect routes, shared components, dashboard modules, or CSS integration.

## Architecture Decisions

### Modular Component Design

The mentor services feature demonstrates the modular approach:

- Separate type definitions (`serviceTypes.ts`)
- Focused components (form, card, list)
- Reusable props-driven interfaces
- Minimal state coupling

This pattern should be replicated for future features to maintain code clarity and testability.

### Shared Dashboard Shell

All three dashboards (mentor, student, admin) reuse:

- `DashboardSidebar` with `dashboardType` prop
- `DashboardTopbar` with customizable labels
- Shared CSS and layout structure
- Consistent navigation patterns

New dashboard roles can be added by creating a new shell component and pages folder without duplicating navigation or layout logic.

### CSS Class over Inline Tailwind

Header refactoring moved from `.join(" ")` arrays to semantic CSS classes (`.header-nav-item`, `.header-button`, etc.). This approach:

- Reduces component file size
- Centralizes style changes
- Makes hover/active states consistent
- Improves component readability

Apply this pattern when adding new UI regions or large component families.

### Reusable Sidebar Labels

Dashboard type labels are determined by the `dashboardType` prop passed to `DashboardSidebar`. The component handles the label text internally. This avoids hardcoding role names in multiple places.

## Known Limitations and TODOs

### Admin Dashboard

The Admin Dashboard is a shell with placeholder pages. The following pages need implementation:

- Users management (list, search, filter, admin actions)
- Mentors management (approval, verification, deactivation)
- Transactions view (global transaction logs, refunds, disputes)
- Reports and analytics
- System settings

### Student Dashboard

The Student Dashboard pages are largely complete with overview and payments. The following optional enhancements remain:

- Community page for student discussions
- Settings page for profile and notification preferences
- Advanced filtering and sorting in payments/sessions
- Integration with calendar/scheduling

### Service Management

The Mentor Services page supports creation and listing. Enhancement TODOs:

- Edit/update existing services
- Delete services with confirmation
- Service availability status (active/inactive)
- Service pricing tiers or bulk discounts
- Service reviews and ratings

### Shared Profile

The profile section is read-only. Enhancement TODOs:

- Edit mode for mentors and students to update their own profiles
- Profile picture upload and cropping
- Verification badges and status indicators
- Social link validation

## Future Work

**Phase 1 - Core Functionality:**

- Replace local mentor, chat, course, session, service, and payment data with server API services.
- Add authentication and authorization guards for mentor, student, and admin routes.
- Add backend persistence for chat messages, session booking, notes, calendar data, and service offerings.

**Phase 2 - Enhanced Dashboards:**

- Complete Admin Dashboard pages (users, mentors, transactions, reports, settings).
- Add edit modes to Student and Mentor profile sections.
- Implement service management actions (edit, delete, toggle status).
- Add calendar integration for session scheduling.

**Phase 3 - Quality and Testing:**

- Add route-level error and not-found pages.
- Add automated component and interaction tests for filtering, routing, theme persistence, chat sending, session actions, and form validation.
- Implement error boundaries for graceful failure handling.

**Phase 4 - Performance and Analytics:**

- Add analytics tracking for user actions and session flow.
- Optimize dashboard load times with lazy loading and pagination.
- Implement caching strategies for frequently accessed data.
- Add performance monitoring and logging.

## Summary

The MentorConnect client has evolved from a public mentor discovery experience to a multi-role dashboard application with shared components, consistent styling, and modular architecture. The mentor and student dashboards provide role-specific experiences while maintaining a unified visual system. The admin dashboard provides infrastructure for system management. The next phase focuses on backend integration and enhanced feature completion.
