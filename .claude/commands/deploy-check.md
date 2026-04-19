# Pre-Deploy Check

Verify the ShiftWise app is ready to deploy to Vercel.

## Steps

1. Run `npx tsc -p tsconfig.app.json --noEmit` — must pass with zero errors.
2. Run `npm run build` — must succeed.
3. Check `vercel.json` exists with SPA rewrite rule.
4. Check `.npmrc` has `legacy-peer-deps=true`.
5. Check `.env.example` exists and documents `VITE_API_URL`.
6. Confirm `src/api/client.ts` baseURL is `${VITE_API_URL}/api/v1`.
7. Report pass/fail for each check and list any fixes needed.
