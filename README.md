# ShiftWise

**AI-native nurse scheduling for Apollo Hospitals.**

ShiftWise turns the Sunday-night Excel nightmare into a 15-minute conversation — a preference-aware roster platform where ward in-charges negotiate with a Copilot-Agent, every shift assignment is explainable, and nurses get a voice in their schedule.

See [PRD.md](./PRD.md) for the full problem statement, market sizing, and success metrics.

---

## Hackathon Demo

This build is packaged for hackathon judges.

**Quick login:** click the **"Fill login credentials"** button on the login screen (amber panel below the Sign In button). It pre-fills:

| Field | Value |
| --- | --- |
| Employee ID | `AP001` |
| Password | `admin@123` |

You'll land directly on the **Roster** page with the Copilot-Agent open. Try one of the suggested prompts — e.g. *"Summarise this week's roster"* — to see the conversation flow.

---

## Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | React 19 + TypeScript |
| Build tool | Vite 6 |
| UI library | MUI v7 (`@mui/material`, `@mui/icons-material`, `@mui/x-data-grid`, `@mui/x-date-pickers`) |
| Data fetching | TanStack Query v5 |
| HTTP client | Axios |
| Routing | React Router v7 |
| Date utils | date-fns v4 |
| Export / print | ExcelJS, jsPDF, html2canvas |
| Drag & drop | react-beautiful-dnd |
| Linting | ESLint 9 + typescript-eslint |

---

## Features

- **Co-branded login** — ShiftWise + Apollo Hospitals lockup on a split-panel login screen with hero imagery.
- **Roster page** — weekly/monthly grid (nurse × day), click-to-add/remove shifts, ward + period selectors, and a per-roster coverage summary row.
- **Copilot-Agent** — built-in AI sidebar open by default on the Roster page:
  - Suggested prompts in the empty state (e.g. *"&lt;nurse name&gt; took a sick leave on &lt;day&gt;, adjust the roster."*)
  - Streams chat responses, renders applied roster modifications, and can surface constraint violations with one-click resolutions.
  - Quick close (X) in the header; toggle from the roster toolbar.
- **Settings** — admin configuration for wards, constraints, and shift rules.
- **Staff management** — paginated staff table with CRUD, CSV upload, and fairness scoring.
- **Ward transfers** — create/approve/cancel transfers; auto-fills `from_shift` from the active roster.
- **Insights** — compliance KPIs, ward monitoring cards, a fairness bar chart, and an audit trail.
- **Legal pages** — public `/privacy`, `/terms`, `/accessibility` routes (no auth required).

---

## Architecture

### Entry flow

```
src/main.tsx
  → QueryClientProvider
    → src/App.tsx
      → BrowserRouter + ThemeProvider + AuthProvider
        → src/routes/AppRouter.tsx
          → MainLayout (Sidebar + content)
            → Page (Dashboard, Roster, …)
```

- **`MainLayout`** (`src/layouts/MainLayout.tsx`) renders the app chrome for authenticated routes; suppressed on `/login`, `/privacy`, `/terms`, `/accessibility` so those pages own their own chrome.
- **`ProtectedRoute`** (`src/components/ProtectedRoute.tsx`) guards authenticated routes and redirects unauthenticated users to `/login`. Supports `allowedRoles` for per-role gating (Settings is `ADMIN | SUPER_ADMIN | WARD_INCHARGE`).
- **`AuthContext`** (`src/contexts/AuthContext.tsx`) derives the `User` object exclusively from the decoded JWT (never from the login response body). Tokens are stored in `localStorage`.

### API layer

The API layer is deliberately split into three files so hooks, endpoints, and types stay independently evolvable:

| File | Role |
| --- | --- |
| `src/api/client.ts` | Axios instance. Injects the JWT on every request; on 401, clears the token and redirects to `/login`. Base URL is `${VITE_API_URL}/api/v1`. |
| `src/api/index.ts` | Raw endpoint functions (one per URL). All paths are relative (e.g. `/rosters`, `/staff`, `/chat`). |
| `src/api/*.hooks.ts` | TanStack Query wrappers (`useQuery` / `useMutation`), domain-sharded (roster, staff, chat, dashboard, shift, leave, diff, ward-transfer). |
| `src/api/hooks.ts` | Barrel re-export of all hooks. |
| `src/api/types.ts` | All shared API types (request/response shapes, domain objects). |

### Known backend constraints

Documented here so future engineers don't re-learn them:

- **Rosters** — only `PATCH /rosters/{id}` exists; there's no `PUT`. `updateRosterConstraints` in the API layer is a no-op stub (endpoint does not exist on the backend).
- **Ward transfers** — cancel via `PUT /ward-transfers/{id}/cancel`.
- **Leaves** — no leaves endpoint exists on the backend today.

### Folder structure

```
src/
├── api/             # axios client, endpoint functions, TanStack Query hooks, shared types
├── assets/          # logos (ShiftWise, Apollo), hero imagery
├── components/      # reusable UI — Header, Footer, ProtectedRoute, Copilot widgets, cards
├── containers/      # route-level pages (LoginPage, RosterPage, SettingsPage, …)
├── contexts/        # React contexts (AuthContext)
├── layouts/         # MainLayout, LegalPageLayout
├── routes/          # AppRouter
├── theme/           # MUI theme (primary teal #0BAB87, sidebar navy #1A2035)
└── utils/           # shared helpers
```

### Routes

| Path | Component | Auth | Notes |
| --- | --- | --- | --- |
| `/` | → `/roster` | — | Redirect (Dashboard is intentionally hidden for this build) |
| `/login` | `LoginPage` | Public | Split panel, Apollo co-brand, hackathon helper |
| `/privacy` | `PrivacyPolicyPage` | Public | Standalone layout |
| `/terms` | `TermsOfServicePage` | Public | Standalone layout |
| `/accessibility` | `AccessibilityPage` | Public | Standalone layout |
| `/roster` | `RosterPage` | Protected | Weekly/monthly grid + Copilot-Agent |
| `/generated-roster` | → `/roster` | — | Legacy redirect |
| `/settings` | `SettingsPage` | Protected (ADMIN, SUPER_ADMIN, WARD_INCHARGE) | |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm

### Install

```bash
npm install --legacy-peer-deps
```

> `--legacy-peer-deps` is required because `react-beautiful-dnd@13.1.1` declares peer `react@^16.8.5 || ^17.0.0 || ^18.0.0` and the project runs on React 19. Long-term, this dependency should migrate to `@hello-pangea/dnd` (maintained fork).

### Configure environment

Copy the example and fill in the backend URL:

```bash
cp .env.example .env
```

```env
VITE_API_URL=https://<backend-host>   # no trailing slash, no /api/v1 suffix
```

The axios client appends `/api/v1` itself, so all endpoint paths in `src/api/index.ts` stay relative.

### Run

```bash
npm run dev         # Vite dev server (http://localhost:5173)
npm run build       # tsc -b && vite build
npm run lint        # ESLint
npm run preview     # serve the production build locally

# faster than full build when you only need type validation:
npx tsc -p tsconfig.app.json --noEmit
```

---

## Deployment

- **Vercel**: set `VITE_API_URL` in the project's environment variables. SPA routing rewrites are handled by [`vercel.json`](./vercel.json).
- Build command: `npm run build` (runs TypeScript project build then Vite bundle).
- Output directory: `dist/`.

---

## Branding & Theme

- **Primary:** `#0BAB87` (teal — action buttons, focus rings, active nav, Copilot accents)
- **Sidebar navy:** `#1A2035`
- **Typography:** Inter (loaded from Google Fonts in `index.html`)
- **Logo assets:** `src/assets/shiftwise_logo.png`, `src/assets/apollo_hospitals_logo.png`
- Theme tokens live in `src/theme/theme.ts`.

---

## Contributing

1. Branch from `main`: `git checkout -b <type>/<short-name>`
2. Run `npm run lint` and `npx tsc -p tsconfig.app.json --noEmit` before pushing.
3. Keep PRs focused — don't bundle rebranding changes with feature work.
4. Match existing patterns: new endpoint → add raw fn in `api/index.ts`, TanStack hook in `api/<domain>.hooks.ts`, re-export from `api/hooks.ts`, add types to `api/types.ts`.

---

## License

Proprietary — all rights reserved. See [Terms of Service](src/containers/TermsOfServicePage.tsx) for usage terms.
