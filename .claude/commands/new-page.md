# Add New Page

Add a new page to the ShiftWise app.

**Arguments:** `$ARGUMENTS` — page name and optional description (e.g. `Reports — shows shift analytics`)

## Steps

1. Create `src/containers/<PageName>.tsx` — full MUI page component matching the existing style (purple theme `#8B5CF6`, same Card/Box patterns as Dashboard.tsx)
2. Add a route in `src/routes/AppRouter.tsx` with `<ProtectedRoute>`
3. Add a nav link in `src/layouts/Sidebar.tsx` with an appropriate MUI icon
4. If the page needs API data, add the fetch function to `src/api/index.ts` and a TanStack Query hook in a new `src/api/<name>.hooks.ts`, then re-export from `src/api/hooks.ts`
5. Run `npx tsc -p tsconfig.app.json --noEmit` and fix any type errors

Keep the component structure consistent with existing pages. Do not add comments unless the logic is non-obvious.
