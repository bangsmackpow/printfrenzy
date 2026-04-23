# Project Status - PrintFrenzy

## 🚀 Recent Major Updates (April 23, 2026 — Session 4)

### 15. 📈 High-Signal Observability (Axiom Integration)
- **Axiom Streaming**: Integrated Axiom logging across all critical production endpoints (Uploads, Shipping, Order Imports, Wix Sync).
- **Silent Failure Visibility**: Replaced standard `console.error` with `log.error` to Axiom, providing "after the fact" debugging for edge runtime execution failures.
- **Rich Event Context**: Every log entry captures user email, filename, file size, and third-party API responses (Shippo/Wix).
- **Edge-Compatible Logger**: Built a lightweight `src/utils/logger.ts` that uses standard `fetch` to keep cold starts fast and memory usage low.

### 16. 📦 Enhanced Upload & PDF Support
- **Increased Capacity**: Boosted `MAX_FILE_SIZE` from 10MB to **20MB** in response to high-resolution artwork needs.
- **Universal PDF Support**: Enabled `.pdf` file uploads in both the New Order and Edit Order UI.
- **Backend Validation**: Updated magic-byte validation and MIME whitelist to robustly support PDF while maintaining security.

---

## 🚀 Recent Major Updates (April 20, 2026 — Session 3)

### 11. 🛡️ Security Synchronization (Live)
- **Unified Hashing Standards**: Synchronized PBKDF2 iterations to **600,000** across the production app and all helper scripts (`create-admin.js`, `seed-admin.mjs`).
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
- **PBKDF2 Hardened**: Increased from 100k to 600k iterations (OWASP recommended).
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

## 🧹 Cleanup Notes (April 1, 2026)
- Removed temporary `image-diagnostic` admin endpoint (one-time use only).
- Added `.wrangler/` to `.gitignore`.
- All placeholder images now served from R2 (`pub-0a9a68a0e7bd45fd90bf38ff3ec0e00b.r2.dev/placeholder.svg`) instead of local `/placeholder.png`.
- Database backfilled: all orders with missing images now reference the R2 placeholder.
