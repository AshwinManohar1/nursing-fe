# Add API Hook

Add a new API endpoint + TanStack Query hook for ShiftWise.

**Arguments:** `$ARGUMENTS` — describe the endpoint (e.g. `GET /staff/{id}/schedule — fetch a single staff member's schedule`)

## Steps

1. Add the raw axios function to `src/api/index.ts` using the existing `client` instance. All paths are relative (baseURL already includes `/api/v1`).
2. Add types to `src/api/types.ts` if needed.
3. Create or update `src/api/<resource>.hooks.ts` with a `useQuery` or `useMutation` hook following the patterns in existing hook files.
4. Re-export the new hook from `src/api/hooks.ts`.
5. Run `npx tsc -p tsconfig.app.json --noEmit` and fix any errors.

Follow existing patterns: `useQuery` for reads, `useMutation` + `queryClient.invalidateQueries` for writes.
