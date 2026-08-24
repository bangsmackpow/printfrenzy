# Project Status - PrintFrenzy

### 30. 🧮 CSV Import Review & Select (Live)
- **Side-by-Side Modes**: The `/import` page now offers **Quick Import** (the original blind upload — unchanged) and **Review & Select** (preview every line item, tick what to import, skip what's already in the queue).
- **Preview & Duplicate Flagging**: `POST /api/orders/import/preview` parses the CSV, normalizes each row, and flags rows already in the queue via an exact line-item key (order number + customer + product + variant + quantity, case-insensitive). Duplicate cards render disabled with an "Already in Queue" badge.
- **One Submission = One Order**: `POST /api/orders/import/select` inserts only the checked line items as a single batch — the batch name becomes the display name (`order_number`) in the queue; if empty, an `IMPORT-<timestamp>` name is auto-generated. Server-side re-dedup skips anything that now matches (also prevents duplicate rows within one file). Inserts are chunked 100/batch to stay within D1 limits.
- **Wix Order Number Preserved**: The original Wix order number is stored in the new `source_order_number` column so future exports of the same orders are still flagged as already imported after the batch name replaces `order_number`. Requires migration `0002_orders_source_order_number.sql`.
- **No-Image Rows Importable**: Rows with a missing/invalid image URL (e.g. literal `Unknown`) now import with a `null` `image_url` instead of being silently skipped.

---

### 29. ⚡ Cloudflare Best-Practice Alignment (Live)
D1, R2, Edge, and search brought in line with Cloudflare best practices:
- **D1 Indexes**: Added indexes on the hot query paths — `orders(status)`, `orders(order_number)`, `orders(created_at DESC)`, `audit_logs(action_type/user_email/timestamp DESC/order_id)`, `shipments(order_number)`, `rate_limits(timestamp)`. Verified via `EXPLAIN QUERY PLAN` (full table `SCAN orders` → `SEARCH ... USING INDEX`).
- **N+1 → Batch Writes**: Converted per-row `.run()` loops in bulk-status, status, Wix sync, CSV import, and Wix webhook to single atomic `db.batch([...])` calls (audit + notification + order inserts).
- **Column Projection**: Trimmed `SELECT *` on hot paths (auth login, user password, notification poll) to only the columns consumed.
- **Rate Limiter**: Kept the D1-backed limiter (the native Rate Limiting binding is Workers-only and not supported on Cloudflare Pages). Optimized cleanup to delete only the requester's expired rows instead of scanning the whole table.
- **Axiom Logging**: Logger now buffers and flushes events in batches, fire-and-forget, so logging never blocks the request/response path.
- **FTS5 Full-Text Search**: Replaced the 7-column `LIKE '%term%'` scan with an FTS5 virtual table (`orders_fts`) kept in sync via triggers (using the reliable `DELETE WHERE rowid` pattern). `/api/search` now uses `MATCH`. See `migrations/0001_orders_fts.sql`.
- **R2 Cache Headers**: Uploads now set `Cache-Control: public, max-age=31536000, immutable` (safe — keys are UUID-versioned). R2 public URL centralized in `src/utils/config.ts`.
- **Migrations Workflow**: Added `migrations/` directory and `migrations_dir` to `wrangler.toml`. Removed stale `d1_backup-03192026.sql` and legacy `migration.sql` (superseded by `schema.sql`).
- **Git Hygiene**: Removed tracked `.wrangler/` local D1 state files from the repo (`.wrangler/` is gitignored).
- **console.error → log.error**: Replaced remaining unstructured `console.error` calls in admin, notifications, and shipping routes.

---

### 28. ⚡ Notification Query Optimization (Live)
- **Composite Index**: Added `idx_notifications_poll` on `notifications (user_email, read, timestamp DESC)` to `schema.sql`. The poll query (`WHERE user_email = ? AND read = 0 AND timestamp > ? ORDER BY timestamp DESC LIMIT 50`) previously had no index and full-scanned the table on every poll. Verified via `EXPLAIN QUERY PLAN` that D1 now uses the index (`SEARCH notifications USING INDEX idx_notifications_poll`) with no sort step.
- **Client Poll Cursor Fix**: `ToastNotifications.tsx` previously only advanced `lastPoll` when `data.length > 0`. When nothing new arrived (the normal steady state), `since` stayed pinned at page-load time, so every 10s poll re-read **all** unread rows for the user across every open dashboard tab. The cursor now advances on every successful poll, so steady-state polls return ~0 rows.
- **Impact**: Per-poll rows-read drops from the full unread table size to just newly-arrived rows, cutting D1 row-read volume substantially.

---

### 27. 🛡️ Privilege Escalation and Security Hardening (Live)
- **Role Segregation**: Restrained all user management APIs (CRUD operations, password resets, and email changes) and database-clearing operations (`/api/admin/clear`) to the `ADMIN` role. This prevents `MANAGER` accounts from escalating privileges, managing other admins, or performing full database purges.
- **Frontend Route Protection**: Added path-level role checks in `middleware.ts` to redirect unauthorized users (role `USER`) trying to access `/admin/*` routes to the dashboard page early.
- **Local Schema Sync**: Synchronized the local database schema to include the `action_type` column in `audit_logs` to match production.

---

### 26. 🖼️ CSV Image Import and Wix URL Parsing Fixes (Live)
- **Direct Header Matching**: Added direct support for the `"Product image URL"` (lowercased to `product image url`) column key during CSV import, bypassing the fallback URL extractor when the column is explicitly present.
- **Wix URL Resizing Regex Fix**: Removed the comma constraint from the fallback URL matching regex (`[^\s,"]+` -> `[^\s"]+`). This ensures that complex resized Wix media URLs containing commas (e.g. `w_50,h_50`) are parsed fully without truncation, preventing broken/forbidden image displays.

---

### 25. 🔧 Database Robustness and Deletion Foreign Key Bug Fixes (Live)
- **Delete Dependency Resolution**: Resolved `D1_ERROR: FOREIGN KEY constraint failed` when deleting items/batches by re-ordering the transaction batch execution, deleting matching entries from the dependent table `audit_logs` prior to the main `orders` deletion.
- **Audit Logging Null Binding Safety**: Bound `null` to `order_id` in subsequent audit log insertions after an order is completely removed. This fully prevents orphaned reference errors in SQLite, avoiding the need for unreliable, connection-scoped `PRAGMA foreign_keys` toggle controls.
- **CSV Ingest Parameter Safeguard**: Patched a D1 type mismatch error (`D1_TYPE_ERROR: Type 'undefined' not supported`) during CSV imports by explicitly defaulting optional fields (such as missing `"Date"` or `"ordered_at"` headers) to `null` instead of letting them evaluate to `undefined`.
- **Shipping Endpoint Sanitization**: Pre-sanitized all destructured shipping/address parameters (such as `customer_name`, `street`, `city`, `state`, and `zip`) to guarantee no `undefined` keys are passed to database query bindings when labels are purchased.

---

### 24. 🏠 USPS Address Validation (Live)
- **Client-Side Format Checks**: ZIP code format validation (5 digits or ZIP+4), state must be 2-letter code, minimum length checks on name/street/city.
- **Input Sanitization**: State field auto-uppercases and blocks non-alpha characters. ZIP field blocks non-digit/dash input.
- **Shippo Address Validation API**: Every address is validated against USPS via Shippo before rate fetching.
- **Auto-Correction**: When USPS provides a corrected address, it's displayed in a green confirmation panel and auto-used for label purchase.
- **Validation Warnings**: Amber panel shows USPS metadata (e.g., "Residential" vs "Commercial" classification).
- **Rejection of Invalid Addresses**: Orders with unresolvable addresses are rejected before any Shippo API charges occur.
- **Axiom Logging**: Validation failures logged with full address context for debugging.

---

### 23. 📡 Comprehensive Axiom Logging (Live)
- **Full API Coverage**: Added structured Axiom logging to 17 operations across 7 API route files and auth provider.
- **Login Monitoring**: All login attempts logged (success, failure, error) with user email and trace ID.
- **Wix Webhook Visibility**: Signature validation results, payload errors, and processed order counts logged.
- **Admin Operations**: CRUD, clear, stats, audit, backfill, and user management all logged with user context.
- **Order Lifecycle**: DELETE, status changes, update-notes, and update-item operations logged with before/after values.
- **Shipping & Search**: Rate lookups, status checks, and search queries logged for usage analytics.
- **Notifications**: Subscribe, poll, and mark-read operations logged.
- **User Preferences**: Password changes and theme switches logged.
- **Edge Runtime Safety**: Replaced `console.error` with `await log.error` to prevent log loss in Cloudflare Edge.
- **TypeScript Fixes**: Resolved `TS2304` scope errors in catch blocks by safely re-parsing request bodies.

---

### 22. 🗑️ Single-Item Delete Fix (Live)
- **Batch Deletion Bug Fixed**: Deleting a single item from a multi-item order/batch no longer deletes the entire batch.
- **FOREIGN KEY Constraint Resolved**: Fixed `D1_ERROR: FOREIGN KEY constraint failed` by wrapping delete batches in `PRAGMA foreign_keys = OFF/ON` to handle `audit_logs` FK dependency correctly.
- **Per-Item Delete Button**: Added hover-reveal "Remove Item" button on dashboard cards (ADMIN/MANAGER only).
- **Improved Batch Delete UX**: Batch delete button now shows item count ("Delete Batch (N)"), uses red styling, and displays explicit confirmation dialog.
- **Error Handling**: Both delete paths now show user-friendly error messages on failure.

---

### 21. 🖼️ Expanded Image Format Support
- **New Formats**: Added support for `.avif`, `.svg`, `.bmp`, and `.tiff` image uploads for manual orders.
- **Clipart Optimization**: SVG support enables high-quality vector clipart uploads with full transparency.
- **Backend Validation**: Updated `ALLOWED_MIME_TYPES` and `MAGIC_BYTES` to include the new formats.
- **Variable Container Support**: Implemented a validation bypass for AVIF and SVG to handle complex/variable file headers while maintaining strict checks for standard formats.
- **Frontend Integration**: Updated manual order and edit order pages with explicit file type selection for the new formats.

---

## 🚀 Recent Major Updates (April 27, 2026 — Session 5)

### 17. 📏 RGC Vinyl Pricing Engine (Calculator v2)
- **Hybrid Pricing Model**: Replaced simple square-foot pricing with a pro-grade "Per Square Inch" engine.
- **Smart Presets**: One-click modes for `1-Color Cut` ($0.60/sq in), `Layered/Multi` ($1.00/sq in), and `Printed & Lami` ($0.85/sq in).
- **Advanced Cost Factors**: 
    - **Weeding Difficulty**: Slider to add up to 200% labor overhead for complex designs.
    - **Minimum Charges**: Configurable shop minimums (default $25) to protect margins on tiny jobs.
    - **Setup Fees**: Flat-rate design/prep fee integration.
- **Detailed Quote Breakdown**: Shows base total, setup fees, and minimum charge adjustments in a high-contrast dark mode display.

### 18. 🍎 Apple HEIC Image Support
- **Mobile Compatibility**: Added support for `.heic` and `.heif` files, allowing staff to upload airdropped photos directly from iPhones.
- **Magic-Byte Bypass**: Implemented a targeted validation bypass for HEIC/HEIF containers (which vary by device) while maintaining strict validation for PNG/JPEG/PDF.
- **MIME Whitelist**: Expanded backend whitelist to include HEIC formats.

### 19. 🛠️ "Auto-Heal" & High-Signal Error Handling
- **Trace IDs (Support Codes)**: Every 500 error now generates a unique ID (e.g., `PF-A1B2`).
- **Support-Ready UI**: When an error occurs, the user is given a "Support ID" and a "Copy Diagnostic Data" button.
- **Diagnostic Payloads**: One-click copying of error context (Trace ID, URL, parameters, timestamp) to help staff report bugs with 100% precision.
- **Resilient Shipping**: 
    - **Duplicate Prevention**: Auto-recovers existing labels if a user retries a purchase within 2 minutes.
    - **Post-Purchase Safety**: If the database fails after a successful charge, the app now returns the label anyway, preventing double-billing.
- **SQL Hardening**: Fixed a critical parameter binding mismatch in the shipping API that was causing silent data loss.

### 20. 📑 Professional Customer Quoting
- **Quote Notes**: Added a free-form "Notes for Customer" area to the Vinyl Calculator for material specs and disclaimers.
- **Print-to-PDF Template**: Engineered a professional, branded quote layout (`@media print`) for customer-facing PDFs.
- **Auto-Generated Ref IDs**: Every quote includes a unique reference timestamp for tracking.
- **Branded Header**: Quotes feature "RGC SIGNS" branding with clean typography optimized for 2'x3' and larger job estimates.

---

## 🚀 Recent Major Updates (April 23, 2026 — Session 4)
...

## 🚀 Recent Major Updates (April 20, 2026 — Session 3)

### 11. 🛡️ Security Synchronization (Live)
- **Unified Hashing Standards**: Synchronized PBKDF2 iterations to **100,000** across the production app and all helper scripts (`create-admin.js`, `seed-admin.mjs`).
- **Standardized Format**: Ensured scripts generate the exact `iterations.salt.hash` format required by the production `hashUtils.ts`.
- **Bcrypt Removal**: Fully removed legacy bcrypt references from seeding scripts to prevent login failures.

### 12. 📊 Admin Command Center (Live)
- **Just-In-Time Reporting**: The Audit page has been transformed into a Command Center with quick-action intelligence reports.
- **One-Click Investigation**: Dedicated buttons to instantly filter for `Order Deletions`, `Label Purchases`, and `System Clears`.
- **Production Velocity Widget**: Real-time stats dashboard showing order volume for the last 7 days to monitor system health and ingestion consistency.
- **Stats API**: New secure endpoint `/api/admin/stats` providing aggregated daily totals.

### 13. ✍️ Multi-Line Personalization & Enhanced Editing (Live)
- **Textarea Upgrade**: "Personalization / Prints Name" is now a multi-line textarea across the New Order, Edit Order, and Order Details pages, supporting complex lists of names.
- **Full Edit Support**: The Edit Order page now supports all 4 artwork image slots, production notes, and personalization (previously limited to 1 image).
- **Manual Order Parity**: Manual orders now support production notes and personalization fields at creation time.

### 14. 🔍 Investigation: Order Integrity
- **Audit Verification**: Investigated reports of missing orders. Confirmed via D1 audit log analysis that no mass-deletions or system clears occurred in the last week.
- **Upload Reliability**: Verified R2 upload functionality with live testing and log tailing. Confirmed that magic-byte validation and 10MB limits are enforced and working.

---

## 🚀 Recent Major Updates (April 1, 2026 — Session 2)

### 7. 📋 Copy Label URL to Clipboard (Live)
- **Quick Copy Button**: Added clipboard icon button next to "Print Label" on both the Shipping Tool page and Order Details page.
- **One-Click Copy**: Uses `navigator.clipboard.writeText()` to copy the label URL instantly.
- **Visual Confirmation**: Shows "Copied!" with green checkmark for 1.5 seconds after clicking.
- **Use Case**: Easily paste label URLs into external tools, customer emails, or tracking systems.

### 8. 🔗 Wix Webhook Integration (Live)
- **Real-Time Order Ingestion**: `/api/webhooks/wix` endpoint receives order created/updated events from Wix in real-time.
- **HMAC-SHA256 Verification**: Validates `X-Wix-Signature` header using `WIX_WEBHOOK_SECRET` env var with constant-time comparison.
- **Automatic Dedup**: Checks existing orders before inserting to prevent duplicates.
- **No Manual Sync Needed**: Orders appear in the `RECEIVED` queue immediately when customers checkout on Wix.
- **Setup Required**: Configure webhook URL and secret in Wix dashboard → Settings → Webhooks.

### 9. 📄 Wix Sync Pagination (Live)
- **Cursor-Based Pagination**: Replaced hardcoded 20-order limit with 50 orders per page, up to 5 pages (250 orders max per sync).
- **Continuation Tokens**: Uses Wix `pagingMetadata.next` cursor to fetch all pending orders.
- **Efficient Sync**: Fetches only what's needed, stops when no more pages exist.
- **Response Enhancement**: Returns `pages` count in sync response for visibility.

### 10. 📦 Shipping Audit Log Entries (Live)
- **Label Purchase Tracking**: Every shipping label purchase now creates an `audit_logs` entry with `SHIPMENT_CREATED` action type.
- **Rich Details**: Captures tracking number, destination address, label URL, and user email (who purchased it).
- **Audit UI Integration**: Green "Label Purchase" badge in `/admin/audit` with tracking number and destination display.
- **Accountability**: Tracks who bought which label and when — critical for multi-user environments.

---

## 🚀 Recent Major Updates (April 1, 2026 — Session 1)

### 1. 🔔 Stage Subscription Notifications (Live)
- **Subscribe to Stages**: Users can subscribe to any production stage (RECEIVED → COMPLETED) via the bell icon in the dashboard header.
- **Popup Toast Notifications**: When anyone moves an order into a stage you're subscribed to, a toast popup appears: "alice moved #12345 from PRINTING → STAGING".
- **5-Second Polling**: Client polls `/api/notifications/poll` every 5 seconds — no WebSocket infrastructure needed.
- **Click-to-Navigate**: Click any notification toast to auto-filter the dashboard to that order's new stage.
- **Self-Filter**: You don't get notified for your own moves — only other users' actions.
- **Database-Backed**: `notification_subscriptions` and `notifications` tables store preferences and unread notifications.

### 2. 📋 Enhanced Audit Logging (Live)
- **Complete Coverage**: Every status change (single + bulk), order edit, note update, deletion, and system clear is now logged.
- **Rich Details**: Each log entry captures `action_type`, `details` (JSON with before/after values), `order_number`, and `user_email`.
- **Filterable Audit UI**: `/admin/audit` now has dropdowns to filter by action type and user, with color-coded badges for each action type.
- **Sidebar Link**: "Audit Log" link visible to ADMIN and MANAGER roles.

### 3. 📦 Order Sheets v3 — Per-Batch Selection (Live)
- **Batch Selection Cards**: Visual grid of all available batches with item counts and previews.
- **Select/Deselect Per Batch**: Toggle individual batches on or off before printing.
- **Select All / Clear All**: Quick controls for bulk selection.
- **Packing Slip Format**: Each item prints on its own page as a compact packing slip — ready to attach to physical orders.
- **QC Sign-Off Checkboxes**: Art OK / Printed / Applied checkboxes on each slip.
- **Live Item Counter**: Shows how many batches and items are selected.

### 4. 🖼️ Multi-Image Support (Live)
- **Up to 4 Images per Order**: Manual orders now support uploading or pasting URLs for up to 4 artwork images.
- **2x2 Quadrant Display**: In the queue and print view, multiple images are shown in a compact 2x2 grid.
- **Click-to-Enlarge Lightbox**: Click any image or quadrant to open a full-screen lightbox with arrow navigation, thumbnail strip, and keyboard controls (←→, Escape).
- **Print Integration**: Packing slips display all 4 images in a 2x2 layout per item.

### 5. 🔍 Universal Search (Live)
- **Sidebar Search Bar**: Positioned under the logo, searches across order number, customer name, product name, variant, notes, print name, and status.
- **⌘K Shortcut**: Quick-focus the search from anywhere.
- **Debounced Results**: 250ms debounce with instant dropdown results showing order context and status badges.

### 6. 🔒 Security Hardening (Live)
- **Error Sanitization**: All API routes return generic "Internal server error" to clients; real errors logged server-side only.
- **R2 Upload Security**: 10MB limit, MIME whitelist, magic-byte validation, UUID-based storage keys.
- **Input Validation**: Email format, password min 8 chars, role whitelist, URL validation, positive quantity enforcement.
- **Bulk Status Limits**: Max 500 items per bulk operation, status enum validation.
- **CSV Import Limits**: 5MB max file size, 10,000 record cap.
- **PBKDF2 Hardened**: Set to 100k iterations (Cloudflare Workers Web Crypto API limit).
- **Constant-Time API Key Comparison**: Timing-safe comparison for import API key.
- **Backup Hardening**: `password_hash` excluded from full database backups.
- **CI Fixed**: `npm audit --audit-level=critical` to stop false-positive dev dependency failures.

---

## 📋 Historical Updates

### ✏️ Order Modification Suite (Live)
- **Universal Editing**: Added full support for modifying any order field (Customer Name, Product, Variant, Quantity) directly from the dashboard.
- **Artwork Swap**: Ability to re-upload design files to R2 or paste new artwork URLs for existing orders.
- **Audit Logging**: Every manual modification is recorded in the `audit_logs` table with the user's email and timestamp for accountability.
- **Dashboard Hooks**: Quick-access floating pencil icons on every order card.

### 📦 Standalone Shipping Tool (Live)
- **Carrier Integration**: Full USPS rate shopping and label purchasing via Shippo API.
- **Auto-Address Tracking**: Remembers previously used shipping addresses per customer to speed up label generation.
- **Tracking History**: Dedicated `shipments` table stores tracking numbers and label URLs for audit trails and returns.
- **Universal Support**: Works for both internal Wix orders and manual external shipments.

### 🖐️ Manual Order & R2 Uploads
- **Direct Design Uploads**: Drag-and-drop file uploads directly to Cloudflare R2 on the Manual Order page.
- **Workflow Flexibility**: Artwork is now optional—order can be created first and artwork linked/uploaded later.
- **Live Preview**: Instant visual confirmation of design assets before the job is pushed to production.

### 🧹 Data Utility & Quality
- **Robust CSV Parsing**: Fixed image URL misalignment by implementing a quote-aware CSV parser.
- **Wix Transform Utility**: Automatic surgical replacement of Wix URL segments to convert low-res thumbnails into 1000px+ high-res production assets.
- **Auto-Casing**: Order descriptions and customer names are automatically converted to uppercase for consistent manifest aesthetics.

### 🔄 Wix Real-time Direct Sync (Live)
- **API Integration**: Replaced manual CSV exports with a "Sync Wix" button that pulls directly from Wix Stores.
- **Deduplication Logic**: Automatically scans existing orders to prevent duplicates when syncing multiple times.
- **Instant Processing**: New orders appear immediately in the `RECEIVED` queue with all metadata and variant details.

### 🎨 Multi-Theme System (Live)
- **Four Distinct Modes**: `light`, `dark`, `polarized-light`, and `polarized-dark`.
- **User Persistence**: Theme preferences are saved per-user in the database, syncing across devices.
- **Polarization Support**: Forced square-edge high-contrast mode for professional production environments.
- **Micro-Animations**: Smooth HSL transitions across all UI components.

### 🏗️ Staging Workflow Integration
- **New Status: STAGING**: Added a critical verification step between `PRINTING` and `PRODUCTION`.
- **Batch Verification**: Ensures all multi-item orders are physically accounted for before final assembly.
- **Dashboard Filters**: dedicated `STAGING` queue for production managers.

### 🛡️ Automated Security Audit
- **Pipeline Integration**: Gitleaks (secrets), Semgrep (vulnerabilities), and Trivy (dependencies) run on every push.
- **SARIF Uploads**: Instant feedback in the GitHub Security Dashboard.

---

## ✅ Database Integrity & Schema
The live production database has been verified and matches the current codebase exactly.
- **Tables**: `users`, `orders`, `audit_logs`, `shipments`, `notification_subscriptions`, `notifications`.
- **New Columns**: `theme` (users), `order_number`/`action_type`/`details` (audit_logs).

## ⏳ Next Phase / Ideas
- **Automated Tracking Uploads**: Push tracking numbers back to Wix orders automatically after purchase.
- **Barcode Support**: Generate barcodes on packing slips for scanning/status updates.
- **Email Notifications**: Extend the notification system to send email alerts for critical stage transitions.
- **Multi-Image Wix/CSV Import**: Add `image_url2-4` support to Wix sync and CSV import (currently only manual orders).
- **Webhook Retry Handling**: Add retry logic for failed webhook deliveries from Wix.
- **Scheduled Sync Fallback**: Add cron-based sync as backup if webhooks fail.
- **Cloudflare Rate Limiting**: Native rate limiting on login, upload, and shipping purchase endpoints.

## 🧹 YAGNI Cleanup (July 26, 2026)
A YAGNI audit identified 8 items (~560 lines) of unnecessary code. Completed:
- **`src/utils/backupUtils.ts`**: Deleted — never imported anywhere, 79 lines dead code.
- **`src/app/admin/reports/page.tsx`**: Deleted — fetched from non-existent API endpoints.
- **`src/app/api/user/theme/route.ts`**: Deleted — localStorage alone suffices for theme persistence.
- **`src/app/shipping/page.tsx`**: Deleted — duplicated the shipping block in `orders/details/page.tsx`.
- **5 legacy scripts**: Deleted `gen-hash.js`, `gen-light-hash.js`, `test-hash.js`, `fix-password.js`, `create-admin.js`. Kept `seed-admin.mjs` as the single admin seed script.
- **`scripts/email-worker.ts`**: Deleted — premature email infra, no dependent code exists.
- **`ThemeContext.tsx`**: Removed backend sync call to deleted `/api/user/theme` endpoint.
- **`Sidebar.tsx`**: Removed "Shipping Tool" nav link.

See [`CLEANUP.md`](./CLEANUP.md) for full details and remaining optional items.

## 🧹 Cleanup Notes (April 1, 2026)
- Removed temporary `image-diagnostic` admin endpoint (one-time use only).
- Added `.wrangler/` to `.gitignore`.
- All placeholder images now served from R2 (`pub-0a9a68a0e7bd45fd90bf38ff3ec0e00b.r2.dev/placeholder.svg`) instead of local `/placeholder.png`.
- Database backfilled: all orders with missing images now reference the R2 placeholder.
