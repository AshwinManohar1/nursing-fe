# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # start dev server
npm run build      # tsc -b && vite build
npm run lint       # eslint
npx tsc -p tsconfig.app.json --noEmit  # type-check only (faster than full build)
```

## Architecture

**Stack:** React 19 + TypeScript, MUI v7, TanStack Query v5, React Router v7, Axios.

**Entry:** `src/main.tsx` → wraps app in `QueryClientProvider` → `src/App.tsx` → `BrowserRouter + ThemeProvider + AuthProvider` → `AppRouter`.

**Routing & layout:** `src/routes/AppRouter.tsx` owns `MainLayout` (sidebar + content). `MainLayout` suppresses the sidebar on `/login`. `ProtectedRoute` guards all authenticated routes and redirects unauthenticated users to `/login`.

**Auth:** JWT-based. `AuthContext` derives the `User` object exclusively from the decoded access token (never from the login response body). Tokens stored in `localStorage`. The axios client in `src/api/client.ts` injects the token on every request and redirects to `/login` on 401.

**API base URL:** `${VITE_API_URL}/api/v1` — set in the axios client, so all paths in `src/api/index.ts` are relative (e.g. `/rosters`, `/staff`, `/chat`).

**API layer pattern:**
- `src/api/index.ts` — raw axios functions, one per endpoint
- `src/api/*.hooks.ts` — TanStack Query `useQuery`/`useMutation` wrappers
- `src/api/hooks.ts` — barrel re-export of all hooks
- `src/api/types.ts` — all shared API types

**Known backend constraints:**
- Rosters: only `PATCH /rosters/{id}` exists — no PUT. `updateRosterConstraints` is a no-op stub (endpoint does not exist on the backend).
- Ward transfers: cancel via `PUT /ward-transfers/{id}/cancel`.
- No leaves endpoint exists on the backend.

**Pages** (`src/containers/`):
- `LoginPage` — split layout, calls `AuthContext.login()`
- `Dashboard` — ward KPIs + ward performance table + active staff + AI suggestions panel; driven by `useDashboardData(org_id, date, shift)`
- `RosterPage` — ward/period selector, weekly/monthly grid (nurse × day), click-to-add/remove shifts via `usePatchRoster`, floating AI Copilot chat via `useSendChatMessage`
- `StaffPage` — paginated staff table, CRUD dialog, CSV upload, fairness score column
- `TransfersPage` — transfers list with tabs, create transfer dialog (auto-fills `from_shift` from active roster)
- `InsightsPage` — compliance KPIs, ward monitoring cards, fairness bar chart, audit trail

**Theme:** `src/theme/theme.ts` — primary teal `#0BAB87`, sidebar navy `#1A2035`. Sidebar is rendered by `src/layouts/Sidebar.tsx`.

## Environment

Single required env var:

```
VITE_API_URL=https://<backend-host>   # no trailing slash, no /api/v1 suffix
```

Copy `.env.example` to `.env` for local dev. For Vercel, set `VITE_API_URL` in project environment variables — `vercel.json` handles SPA routing rewrites.
