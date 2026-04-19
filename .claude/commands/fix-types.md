# Fix TypeScript Errors

Fix all TypeScript errors in the ShiftWise project.

## Steps

1. Run `npx tsc -p tsconfig.app.json --noEmit 2>&1` to get the full error list.
2. Fix each error — prefer fixing types over using `any` or `// @ts-ignore`.
3. Re-run the type check to confirm zero errors.
4. Run `npm run build` to confirm the build also passes.
