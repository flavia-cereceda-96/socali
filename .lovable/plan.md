

## Diagnosis

The crash `TypeError: Cannot read properties of null (reading 'useRef')` originates from `TooltipProvider` in `@radix-ui/react-tooltip`, loaded from a **stale Vite-prebundled chunk** (`?v=97d3035c`). Findings:

1. **No current runtime errors** are being reported by the preview.
2. **Single React install** (`react@18.3.1`), no duplicates.
3. **Vite cache is gone** (`node_modules/.vite` not present — cleared on restart).
4. **Nothing in our app actually uses `TooltipProvider` anymore** — the only file referencing it is `src/components/ui/sidebar.tsx`, which is **never imported anywhere**.
5. `sonner` does not depend on radix-tooltip; `next-themes` was already removed from `sonner.tsx`.
6. Latest console only shows a benign `RESET_BLANK_CHECK` warning.

The runtime error in your report references a hashed dev-bundle (`?v=97d3035c`) that **no longer exists** on the server. Your browser is loading those cached chunks and crashing, but the underlying source is already fixed. A hard refresh would resolve it — but to make this bullet-proof and rule out any latent risk, I'll also remove the unused dead-code path that pulls in `TooltipProvider` so it can't ever be re-bundled.

## Plan

### Step 1 — Remove dead code that imports radix-tooltip
- Delete `src/components/ui/sidebar.tsx` (unused, sole importer of `TooltipProvider`)
- Delete `src/components/ui/tooltip.tsx` (unused after sidebar removal)
- Remove `@radix-ui/react-tooltip` from `package.json`

### Step 2 — Force a clean Vite optimize cycle
- `rm -rf /dev-server/node_modules/.vite /dev-server/node_modules/.vite-temp`
- Touch `vite.config.ts` to invalidate optimizer hash

### Step 3 — Verify the preview actually works
- Run `npm run build` — must pass with no TS errors
- Use the browser tool to `navigate_to_sandbox`, then `screenshot` the `/onboarding` page
- Check `read_console_logs` and `read_runtime_errors` from the live preview to confirm zero errors
- If anything still fails, capture the new error and iterate

### Step 4 — Report back
Tell you exactly what was rendered in the preview screenshot and any logs found, so you have proof the blank screen is gone before we move on.

## Files touched
- Delete: `src/components/ui/sidebar.tsx`, `src/components/ui/tooltip.tsx`
- Edit: `package.json` (remove `@radix-ui/react-tooltip`)
- Cache: `node_modules/.vite*`

