# PrintFrenzy - Agent Context

## Project Overview

DTF print queue & production management system. Handles order ingestion (Wix sync, CSV import, manual entry), print queue management with stage-based workflow, shipping label purchasing via Shippo, and production tracking.

**Tech Stack**: Next.js 16 + Cloudflare Pages + D1 (SQLite) + R2 + Tailwind CSS

## Architecture Decisions

- **Real-time**: 5-second polling against D1 (Cloudflare Edge doesn't support WebSockets/long-lived connections)
- **Database**: Cloudflare D1 (serverless SQLite) — sufficient for this scale, no external streaming DB needed
- **Auth**: PBKDF2 with 600k iterations, constant-time API key comparison
- **Error Handling**: `sanitizeError()` helper on all API routes — logs real errors server-side, returns `"Internal server error"` to clients (never leak D1/schema internals)
- **SQL**: Parameterized queries exclusively — no string interpolation

## Security Requirements

- Sanitize all API error responses (use `sanitizeError()`)
- Validate all inputs: email format, password strength, MIME types, file sizes, URL formats, enum status values
- R2 uploads: 10MB limit, MIME whitelist, magic-byte verification, UUID-based storage keys
- Bulk status cap: 500 orders max per operation
- CSV limits: 5MB / 10k records max
- CI: `npm audit --audit-level=critical` (dev deps cause false positives at `--audit-level=high`)

## UI Conventions

- Tailwind CSS with `font-black`, uppercase tracking
- Rounded-2xl/3xl cards
- Slate/blue color palette
- Multi-image display: 2x2 quadrant grid
- `ImageLightbox` component for full-screen image viewing with arrow navigation, thumbnails, keyboard controls

## Current Feature Set

### Completed
1. **Audit Logging**: `audit_logs` table with `action_type`, `details`, `order_number`. Logs status changes, note updates, order edits/deletions, admin clears. `/admin/audit` UI with filters and color-coded badges.
2. **Stage Subscriptions & Notifications**: `notification_subscriptions` & `notifications` tables. Bell icon in dashboard header. 5s polling via `/api/notifications/poll`. Toast popups show who moved which order to which stage. Self-filtering (no notifications for own moves).
3. **Order Sheets v3**: Per-batch selection grid with item counts. Select All / Clear All. Prints one item per page as packing slip with QC sign-off checkboxes (Art OK / Printed / Applied).
4. **Universal Search**: Sidebar search bar under logo. Searches `order_number`, `customer_name`, `product_name`, `variant`, `notes`, `print_name`, `status`. `⌘K` shortcut. 250ms debounce. Dropdown with status badges.
5. **Security Hardening**: Error sanitization, R2 upload validation, env var for R2 public URL, constant-time API key comparison, input validation, bulk status cap, CSV limits, removed login console.log, PBKDF2 → 600k, backup hardening (excludes `password_hash`), CI threshold fix.
6. **Multi-Image Support**: Manual orders accept up to 4 images (`image_url`–`image_url4`). Queue and print views display 2x2 quadrant grid. `ImageLightbox` for full-screen viewing. Remote & local D1 migrations completed.
7. **Documentation**: `README.md` and `STATUS.md` updated with all features, security improvements, and schema changes.
8. **Copy Label URL to Clipboard**: Clipboard button next to "Print Label" on shipping page and order details. One-click copy with visual confirmation ("Copied!" for 1.5s).
9. **Wix Webhook Integration**: `/api/webhooks/wix` endpoint with HMAC-SHA256 signature verification. Real-time order ingestion from Wix. Automatic dedup. Env var: `WIX_WEBHOOK_SECRET`.
10. **Wix Sync Pagination**: Cursor-based pagination (50 orders/page, max 5 pages). Replaces hardcoded 20-order limit. Returns `pages` count in response.
11. **Shipping Audit Log Entries**: `SHIPMENT_CREATED` action type logged on label purchase. Captures tracking number, destination, user email. Green badge in audit UI.

### Pending / Future
- Email notifications for critical stage transitions
- Barcode/QR support on packing slips for scan-based status updates
- Cloudflare native rate limiting on login, upload, and shipping purchase endpoints
- Automated Wix tracking number pushback after label purchase
- Add `image_url2-4` support to Wix sync & CSV import (currently only manual orders)
- Webhook retry handling for failed Wix webhook deliveries
- Scheduled sync fallback (cron-based) if webhooks fail

## Key File Structure

### Schema & DB
- `schema.sql` — D1 schema definitions

### API Routes
- `src/app/api/orders/[[...slug]]/route.ts` — status, bulk, sync, manual, update, delete
- `src/app/api/admin/[[...slug]]/route.ts` — users, audit, clear, password reset
- `src/app/api/notifications/[[...slug]]/route.ts` — subscribe, poll, mark-read
- `src/app/api/search/route.ts` — universal search
- `src/app/api/upload/route.ts` — R2 upload with validation
- `src/app/api/shipping/[[...slug]]/route.ts` — Shippo rates/purchase
- `src/app/api/user/[[...slug]]/route.ts` — self password reset
- `src/app/api/webhooks/wix/route.ts` — Wix webhook with HMAC verification

### UI Pages
- `src/app/dashboard/page.tsx` — main queue, notifications, search integration, lightbox
- `src/app/orders/print/page.tsx` — order sheets, 2x2 quadrants, packing slip layout
- `src/app/orders/new/page.tsx` — manual order form with 4-image upload
- `src/app/admin/audit/page.tsx` — filterable audit log table

### Components
- `src/components/Sidebar.tsx` — navigation + search bar
- `src/components/ToastNotifications.tsx` — polling hook + toast UI
- `src/components/ImageLightbox.tsx` — multi-image modal with keyboard nav

### Utilities
- `src/utils/hashUtils.ts` — PBKDF2 600k iterations
- `src/utils/backupUtils.ts` — excludes password_hash
- `src/utils/wixUtils.ts` — image URL transformation

### Config & CI
- `.github/workflows/security-scan.yml` — npm audit level fixed
- `README.md`, `STATUS.md` — project documentation

## Workflow Rules

- Always push to GitHub after completing feature batches or documentation updates
- Update `README.md` and `STATUS.md` after each major feature or security pass
- Run `npm audit --audit-level=critical` before pushing
- Verify remote D1 sync after schema changes (`wrangler d1 execute ... --remote`)
