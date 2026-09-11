# PrintFrenzy - Agent Context

## Project Overview

DTF print queue & production management system. Handles order ingestion (Wix sync, CSV import, manual entry), print queue management with stage-based workflow, shipping label purchasing via Shippo, and production tracking.

**Tech Stack**: Next.js 16.2.6 (pinned — see Architecture Decisions / audit allowlist) + Cloudflare Pages + D1 (SQLite) + R2 + Tailwind CSS

## Architecture Decisions

- **Real-time**: 5-second polling against D1 (Cloudflare Edge doesn't support WebSockets/long-lived connections)
- **Database**: Cloudflare D1 (serverless SQLite) — sufficient for this scale, no external streaming DB needed
- **Auth**: PBKDF2 with 100k iterations, constant-time API key comparison
- **Error Handling**: `sanitizeError()` helper on all API routes — logs real errors to **Axiom**, returns `"Internal server error"` to clients (never leak D1/schema internals)
- **SQL**: Parameterized queries exclusively — no string interpolation
- **Observability**: High-signal event streaming to Axiom via `src/utils/logger.ts`.
- **Auth freshness**: `getCurrentUser()` (`src/utils/session.ts`) re-reads role from D1 on every privileged request (admin/orders/shipping-purchase) — JWT role is a hint only; deleted/demoted accounts are revoked immediately. Adds one indexed `users.email` read per authed request (accepted).
- **Hosting / framework pinning**: Deployed on Cloudflare Pages via the **deprecated `@cloudflare/next-on-pages`** (build command `npx @cloudflare/next-on-pages@1` lives in the Pages project, not `package.json`; bindings + `compatibility_date` also come from the Pages project settings, not `wrangler.toml`). Its peer-caps (`next <=15.5.2`) and bundled `@vercel/next@4.12.4` **cannot build patched Next (≥16.3.x) or `@auth/core` (≥0.41.3)**, so the app is pinned to `next@16.2.6` + `next-auth@5.0.0-beta.31`. The resulting 15 framework/Auth.js criticals are allowlisted (`.github/audit-allowlist.json` + `.github/audit-gate.mjs`). **Do not bump `next`/`next-auth` without migrating off next-on-pages first** — the Pages build will fail.

## Security Requirements

- Sanitize all API error responses (use `sanitizeError()`)
- Validate all inputs: email format, password strength, MIME types, file sizes, URL formats, enum status values, address formats
- R2 uploads: **20MB limit**, MIME whitelist (including **PDF**), magic-byte verification, UUID-based storage keys
- Shipping: Address validation via Shippo API before rate fetching — rejects invalid addresses, auto-corrects when USPS provides fixes
- Bulk status cap: 500 orders max per operation
- CSV limits: 5MB / 10k records max
- CI: blocking production-deps critical audit via `npm audit --omit=dev --json | node .github/audit-gate.mjs` — fails on any CRITICAL runtime advisory not listed in `.github/audit-allowlist.json` (currently the `next@16.2.6` framework + `@auth/core@0.41.2`/`next-auth@beta.31` Auth.js advisories — 15 total — pinned because `@cloudflare/next-on-pages` cannot build patched versions of either). A separate non-blocking full-tree `npm audit --audit-level=critical` surfaces dev-toolchain advisories (e.g. `tar` under `@cloudflare/next-on-pages`) without failing the build.
## UI Conventions

- Tailwind CSS with `font-black`, uppercase tracking
- Rounded-2xl/3xl cards
- Slate/blue color palette
- Multi-image display: 2x2 quadrant grid
- `ImageLightbox` component for full-screen image viewing with arrow navigation, thumbnails, keyboard controls

## Current Feature Set

### Completed
1. **Audit Logging & Command Center**: `audit_logs` table with `action_type`, `details`, `order_number`. `/admin/audit` transformed into a Command Center with quick-intelligence buttons (Deletions, Labels, System Clears) and a **Production Velocity** widget (last 7 days).
2. **Stage Subscriptions & Notifications**: `notification_subscriptions` & `notifications` tables. Bell icon in dashboard header. 5s polling via `/api/notifications/poll`. Toast popups show who moved which order to which stage. Self-filtering (no notifications for own moves).
3. **Order Sheets v3**: Per-batch selection grid with item counts. Select All / Clear All. Prints one item per page as packing slip with QC sign-off checkboxes (Art OK / Printed / Applied).
4. **Universal Search**: Sidebar search bar under logo. Searches `order_number`, `customer_name`, `product_name`, `variant`, `notes`, `print_name`, `status`. `⌘K` shortcut. 250ms debounce. Dropdown with status badges.
5. **Security Hardening**: Error sanitization, R2 upload validation (20MB, magic-byte), env var for R2 public URL, constant-time API key comparison, input validation, bulk status cap, CSV limits, removed login console.log, PBKDF2 → 100k iterations (synchronized across production and scripts).
6. **Multi-Image & UI Upgrades**: Manual orders accept up to 4 images (`image_url`–`image_url4`). Queue and print views display 2x2 quadrant grid. `ImageLightbox` for full-screen viewing. **Personalization / Prints Name** upgraded to multi-line textarea. **Edit Order** page upgraded to support all 4 images, notes, and personalization.
7. **Documentation**: `README.md` and `STATUS.md` updated with all features, security improvements, and schema changes.
8. **Copy Label URL to Clipboard**: Clipboard button next to "Print Label" on shipping page and order details. One-click copy with visual confirmation ("Copied!" for 1.5s).
9. **Wix Webhook Integration**: `/api/webhooks/wix` endpoint with HMAC-SHA256 signature verification. Real-time order ingestion from Wix. Automatic dedup. Env var: `WIX_WEBHOOK_SECRET`.
10. **Wix Sync Pagination**: Cursor-based pagination (50 orders/page, max 5 pages). Replaces hardcoded 20-order limit. Returns `pages` count in response.
11. **Shipping Audit Log Entries**: `SHIPMENT_CREATED` action type logged on label purchase. Captures tracking number, destination, user email. Green badge in audit UI.
12. **Stats Intelligence**: `/api/admin/stats` provides daily order aggregates for the last 7 days for production velocity monitoring.
13. **Observability Pass**: Integrated Axiom logging across all critical API routes (Upload, Shipping, Orders, Sync) for "after the fact" debugging of silent failures.
15. **Vinyl Pricing Engine**: Square-inch based calculator with mode-based presets (Simple, Layered, Printed), setup fees, and shop minimums. Includes a **Professional Quoting** system with free-form notes and Print-to-PDF branding.
16. **Expanded Image Support**: Added support for `.avif`, `.svg`, `.bmp`, and `.tiff` uploads for manual orders. Backend includes magic-byte validation for BMP/TIFF and a validation bypass for complex AVIF/SVG containers.
17. **HEIC Support**: Apple device image compatibility for uploads.
18. **Trace ID System**: Unique PF-XXXX codes for 500 errors to streamline debugging.
19. **Shipping Resiliency**: Auto-recovery of recent labels and post-charge success guarantee.
20. **Security Compliance**: OWASP Top 10 verified; core dependencies (Next.js, Auth.js) updated to latest secure versions.
21. **Single-Item Delete Fix**: Fixed bug where deleting one item from a multi-item batch deleted the entire batch. Resolved `FOREIGN KEY constraint failed` error via `PRAGMA foreign_keys` toggle. Dashboard now has per-item "Remove Item" button (hover-reveal, ADMIN/MANAGER) and improved batch delete UX with item count and explicit confirm dialog.
22. **Comprehensive Axiom Logging**: Structured logging across all API routes — 17 operations in 9 files (login, Wix webhooks, admin CRUD, order lifecycle, shipping, search, notifications, user changes). Replaced `console.error` with `await log.error` for Cloudflare Edge safety. Resolved TS2304 scope errors in catch blocks.
23. **Dependency Security**: Upgraded Next.js 16.2.4 → 16.2.6, fixing 4 high-severity CVEs (CVSS 8.7: DoS via FormData, connection pool exhaustion, auth bypass via segment-prefetch routes). `npm audit --audit-level=critical` passes.
24. **USPS Address Validation**: Client-side format checks (ZIP, state, required fields) + Shippo Address Validation API before rate fetching. Auto-corrects addresses, rejects invalid ones before charges, displays USPS classification (residential/commercial). Color-coded UI feedback (red errors, amber warnings, green corrected address).
25. **Database Robustness and Deletion Fixes**: Re-ordered deletion transactions in `db.batch()` to purge `audit_logs` before parent `orders`. Bound `null` instead of non-existent order IDs in deletion logs to satisfy the SQLite foreign key constraint. Defaulted all CSV parsing and shipping destructuring results to fallback null/string values to prevent `undefined` binding crashes (`D1_TYPE_ERROR`) in Cloudflare D1.
26. **YAGNI Cleanup**: Removed ~560 lines of dead/redundant code — `backupUtils.ts` (unused), `admin/reports/page.tsx` (non-existent API), `api/user/theme/route.ts` (localStorage suffices), `shipping/page.tsx` (duplicates order details), and 5 legacy scripts (`gen-hash.js`, `gen-light-hash.js`, `test-hash.js`, `fix-password.js`, `create-admin.js`). Kept `seed-admin.mjs` as the single admin seed script. See `CLEANUP.md`.
27. **CSV Import Review & Select**: The `/import` page now offers two side-by-side modes — **Quick Import** (original blind upload, unchanged) and **Review & Select** (preview every line item with per-item checkboxes, skip duplicates already in the queue, import only what's checked). One import submission = ONE batch card (the batch name becomes `order_number`, the display name in the queue). Dedup uses an exact line-item key (order_number + customer + product + variant + quantity, case-insensitive) against both `order_number` and the new `source_order_number` column (which preserves the original Wix order number for future dedup). Added `POST /api/orders/import/preview` (parse + flag duplicates) and `POST /api/orders/import/select` (JSON batch insert with server-side re-dedup, chunked 100/batch). Rows without a valid image are now importable (null `image_url`). Requires migration `0002_orders_source_order_number.sql`.
28. **Client-Side Telemetry**: Client errors are now captured in Axiom, not just the browser console. `src/utils/clientLogger.ts` buffers events and POSTs them (fire-and-forget, `keepalive`) to the new session-protected `POST /api/telemetry` route, which forwards them through the existing logger with the user's email. All client `console.error` calls in pages/components route through it. Login logs (`src/auth.ts`) now include source `ip` + `userAgent` (from `x-forwarded-for`/`cf-connecting-ip`).
29. **Auto-Growing Order Form Textareas**: The single-line **Size / Variant** input on the Edit Order and New Order pages is now a wrapping, auto-resizing `<textarea>` (`src/components/AutoGrowTextarea.tsx`) so long values (e.g. jersey `NAME ON BACK:: / NUMBER::` options) display fully without sideways scrolling. The same auto-grow treatment was applied to **Personalization / Prints Name** and **Production Notes** on both pages. Reusable component; no backend changes.
30. **P1 Security & Correctness + Cloudflare-Aligned Upgrade**: Cloudflare-MCP audit drove fixes — hardened D1 rate limiter (`INSERT OR IGNORE` + `failClosed` for login/purchase), chunked `IN(...)` in `bulk-status` and `notifications/read` under D1's ~100-bind cap, rewrote System Clear as one ordered `db.batch` (nulls `audit_logs.order_id` first — D1 enforces FK by default and PRAGMA is a no-op in a batch), added `src/utils/session.ts` `getCurrentUser()` for live-role re-validation on admin/orders/shipping-purchase (instant revocation), added `shipment_locks` (migration `0003`) for an atomic label-purchase claim (no double-charge), and made upload magic-byte validation fail-closed (`%PDF` sig, webp tag at offset 8). Bumped `compatibility_date` and fixed the stale `--minify` flag in `pages:build`. **Both security bumps BREAK the Cloudflare Pages build** — next→16.3.5 AND next-auth→beta.32/`@auth/core`→0.41.3 each fail the deprecated `@cloudflare/next-on-pages@1.13.16` bundler (peer `next: ">=14.3.0 && <=15.5.2"`; bundled `@vercel/next@4.12.4` rejects Next 16.3 output; `@auth/core` 0.41.3 fails the edge bundle — verified via failing Pages builds 8f049372/00afe73c/7f7aab57 vs the green fc395bb baseline). So the app stays pinned at **`next@16.2.6` + `next-auth@5.0.0-beta.31`** and the resulting 11 Next + 4 Auth.js criticals are allowlisted (`.github/audit-allowlist.json` + `.github/audit-gate.mjs`) with removal condition = migrate off next-on-pages. `H5`'s live-role re-validation (`session.ts`) partially mitigates the Auth.js fail-open advisory. CI critical gate audits production deps with that allowlist applied. See `STATUS.md` #33.

### Pending / Future
- **Migrate off `@cloudflare/next-on-pages`** (deprecated; peer-caps Next at 15.5.2, so the app is pinned to an unpatchable `next@16.2.6` + `next-auth@5.0.0-beta.31`, with 15 allowlisted framework/Auth.js criticals). Moving to OpenNext or vinext on **Workers** unblocks patched Next ≥16.3.3 and `@auth/core` ≥0.41.3 and lets the audit allowlist be emptied.
- Email notifications for critical stage transitions
- Barcode/QR support on packing slips for scan-based status updates
- Cloudflare WAF rate-limiting rules (dashboard-level) as an alternative to the D1-backed limiter — note: the Workers `[[ratelimits]]` binding is NOT supported on Cloudflare Pages
- Automated Wix tracking number pushback after label purchase
- Add `image_url2-4` support to Wix sync & CSV import (currently only manual orders)
- Webhook retry handling for failed Wix webhook deliveries
- Scheduled sync fallback (cron-based) if webhooks fail

## Key File Structure

### Schema & DB
- `schema.sql` — D1 schema definitions

### API Routes
- `src/app/api/orders/[[...slug]]/route.ts` — status, bulk, sync, manual, update, delete, update-item, update-notes, **import (Quick), import/preview, import/select** (with Axiom logging)
- `src/app/api/admin/[[...slug]]/route.ts` — users, audit, stats, clear, password reset, backfill-images
- `src/app/api/notifications/[[...slug]]/route.ts` — subscribe, poll, mark-read
- `src/app/api/search/route.ts` — universal search
- `src/app/api/upload/route.ts` — R2 upload with **20MB limit**, magic-byte validation, and Axiom logging
- `src/app/api/telemetry/route.ts` — session-protected client-error ingest → Axiom
- `src/app/api/shipping/[[...slug]]/route.ts` — Shippo rates/purchase (with Axiom logging)
- `src/app/api/user/[[...slug]]/route.ts` — self password reset
- `src/app/api/webhooks/wix/route.ts` — Wix webhook with HMAC verification

### UI Pages
- `src/app/dashboard/page.tsx` — main queue, notifications, search integration, lightbox
- `src/app/import/page.tsx` — CSV import with **Quick Import** (blind) and **Review & Select** (preview grid + checkboxes, duplicate flagging)
- `src/app/orders/print/page.tsx` — order sheets, 2x2 quadrants, packing slip layout
- `src/app/orders/new/page.tsx` — manual order form with 4-image upload (**supports PDF**)
- `src/app/orders/[id]/edit/page.tsx` — full order modification (**supports PDF**)
- `src/app/admin/audit/page.tsx` — filterable audit log table

### Components
- `src/components/Sidebar.tsx` — navigation + search bar
- `src/components/ToastNotifications.tsx` — polling hook + toast UI
- `src/components/ImageLightbox.tsx` — multi-image modal with keyboard nav
- `src/components/AutoGrowTextarea.tsx` — wrapping, auto-resizing textarea for order forms

### Utilities
- `src/utils/hashUtils.ts` — PBKDF2 100k iterations
- `src/utils/logger.ts` — buffered, fire-and-forget Axiom integration
- `src/utils/clientLogger.ts` — buffered client-side error reporting → `/api/telemetry`
- `src/utils/trace.ts` — Trace ID generation
- `src/utils/wixUtils.ts` — image URL transformation
- `src/utils/config.ts` — centralized R2 public URL
- `src/utils/rateLimiter.ts` — D1-backed rate limiter (per-requester cleanup, `INSERT OR IGNORE`, `failClosed` option for auth-sensitive endpoints)
- `src/utils/session.ts` — `getCurrentUser()` re-validates the session against D1 (live role + instant revocation on delete/demote)

### Database & Migrations
- `schema.sql` — canonical idempotent schema + all indexes
- `migrations/` — one-off migrations applied via `wrangler d1 migrations apply` (e.g. `0001_orders_fts.sql`, `0002_orders_source_order_number.sql`, `0003_shipment_locks.sql`)
- **D1 foreign keys**: D1 enforces FK constraints by default and `PRAGMA foreign_keys` is a no-op inside a `db.batch`/transaction — to delete parent rows referenced by `audit_logs.order_id`, either delete/null the child rows first or null the link inside an ordered `db.batch` (do NOT rely on a PRAGMA toggle).
- **Indexes**: all hot query paths are indexed (`orders(status/order_number/created_at)`, `audit_logs(action_type/user_email/timestamp/order_id)`, `shipments(order_number)`, `notifications(user_email,read,timestamp)`, `rate_limits(timestamp)`). Verify changes with `EXPLAIN QUERY PLAN` before/after.
- **FTS5**: `orders_fts` virtual table + triggers (INSERT/UPDATE/DELETE) keep full-text search in sync. `/api/search` uses `MATCH`. If you change `orders` columns, update `migrations/0001_orders_fts.sql` and re-run it (idempotent). The `source_order_number` dedup column does not need to be in FTS.
- **CSV Import Dedup**: the dedup key is `order_number|source_order_number + customer_name + product_name + variant + quantity` compared case-insensitively. The original Wix order number is stored in `source_order_number` so future exports of the same orders are flagged as already imported even after the batch name replaces `order_number`.

### Config & CI
- `.github/workflows/security-scan.yml` — Gitleaks + Semgrep/Trivy (informational, SARIF uploads skip-if-absent) + the blocking audit below
- `.github/audit-gate.mjs` — dependency-free production-critical audit gate; reads `npm audit --omit=dev --json`, fails on any critical not allowlisted
- `.github/audit-allowlist.json` — the 15 pinned `next@16.2.6` + `@auth/core@0.41.2` criticals (removal condition = migrate off next-on-pages)
- `README.md`, `STATUS.md`, `AGENTS.md` — project documentation

## Workflow Rules

- Always push to GitHub after completing feature batches or documentation updates
- Update `README.md` and `STATUS.md` after each major feature or security pass
- Run the production-deps critical gate before pushing: `npm audit --omit=dev --json | node .github/audit-gate.mjs` (mirrors CI; fails only on un-allowlisted runtime criticals). The full-tree `npm audit` is informational — the dev toolchain (next-on-pages→vercel→`tar`) carries non-shipping advisories.
- Privileged API handlers must use `getCurrentUser()` (live D1 role re-validation), not the JWT role, and mutating multi-statement writes must go through `db.batch()` with child-rows-first ordering (D1 enforces FKs by default).
- Apply schema/migration changes to remote D1 and verify with `EXPLAIN QUERY PLAN` (`wrangler d1 execute ... --remote --file=`, or `wrangler d1 migrations apply`)
