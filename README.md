# 👕 PrintFrenzy

**High-Efficiency DTF Print Queue & Production Manager**

PrintFrenzy is a specialized internal tool built for Built Networks, LLC (Creston, IA). It is designed to bridge the gap between e-commerce orders (Wix) and physical DTF (Direct to Film) production by providing a high-resolution, "printer-ready" visual queue.

---

### 🎯 Pro-Production Workflow
The goal of this application is to minimize the "clicks-to-print" ratio:
- **Wix Direct Sync**: Real-time order fetching via the "Sync Wix" button, eliminating the need for CSV imports.
- **Auto-Image Uplifting**: Automatically transforms low-res Wix thumbnails into 1500px+ production-quality images via `wixUtils.ts`.
- **Manual Orders**: Drag-and-drop design uploads directly to Cloudflare R2 for off-platform or custom jobs.
- **Accountability**: Real-time logging of exactly which staff member moved which design through the production pipeline.

### 🔔 Live Notifications
- **Stage Subscriptions**: Subscribe to any production stage (RECEIVED → COMPLETED) and get instant popup notifications when someone moves an order into your watched stage.
- **Polling-Based**: Checks for new notifications every 5 seconds — no WebSocket infrastructure needed.
- **Click-to-Navigate**: Click any notification toast to jump directly to that order's new stage in the queue.

### 📋 Audit Log & Command Center
- **Just-In-Time Intelligence**: `/admin/audit` is now a Command Center with quick-action buttons to investigate deletions, label purchases, and system clears.
- **Production Velocity**: Real-time monitoring of daily order volume for the last 7 days.
- **Complete History**: Every status change, order edit, note update, deletion, and system clear is logged with who did it, when, and what changed.
- **Filterable UI**: Filter by action type and by user.

### 🔐 Security & Management
Protecting the production data and team access:
- **Unified Security Standards**: PBKDF2 with 600k iterations synchronized across production and administrative scripts.
- **Password Management**: Self-service user resets and admin-initiated password resets for all staff.
- **Destructive Safety**: "Clear All Orders" requires an Admin password re-prompt to confirm the system wipe.
- **Individual Cleanup**: Admins can delete specific orders or entire Wix groups directly from the queue.

### 🛠️ Tech Stack (The "Bleeding Edge" Build)
- **Framework**: Next.js 16.1.7 (Turbopack enabled)
- **Runtime**: Cloudflare Pages (Edge Runtime)
- **Database**: Cloudflare D1 (SQL)
- **Storage**: Cloudflare R2 (S3-compatible)
- **Auth**: Auth.js (v5 Beta)
- **Styling**: Tailwind CSS 4

---

### 📅 Current Development Progress
✅ **Completed**:
- **Database Schema**: Unified tables for `users`, `orders`, `audit_logs`, `shipments`, `notification_subscriptions`, and `notifications`. Orders support up to 4 images (`image_url` through `image_url4`).
- **Auth Engine**: Switched to `@auth/nextjs (v5)` to support Next.js 16 on the Edge.
- **Production Queue**: Dashboard built with item grouping for multi-item Wix orders.
- **Command Center**: Audit log with intelligence filters and production velocity stats.
- **Production Print Manifest**: A dedicated sidebar tab for generating global, high-resolution print manifests for all orders in the "PRINTING" stage.
- **USPS Shipping Tool**: A standalone sidebar tool for generating and tracking USPS shipping labels for both internal orders and external shipments via Shippo API. Ensures sender contact compliance and hides postage price on labels.
- **Wix Direct API Sync**: Real-time synchronization of paid orders directly into the production queue without manual processing. Cursor-based pagination (50/page, max 5 pages).
- **Wix Webhook Integration**: Real-time order ingestion via `/api/webhooks/wix` with HMAC-SHA256 signature verification. No manual sync needed.
- **R2 Integration**: Secure browser-to-bucket uploads for manual designs. Custom R2-hosted placeholder SVG for orders without artwork.
- **Staff Control**: Admin panel for managing staff and resetting passwords.
- **Order sheets (v3)**: Per-batch selection interface — pick which batches to print. Each item prints on its own page as a compact packing slip with product image(s), variant, personalization, and QC sign-off checkboxes.
- **Multi-Image Support**: Manual orders support up to 4 artwork images. Displayed as 2x2 quadrants in the queue and on packing slips. Click-to-enlarge lightbox with keyboard navigation.
- **Universal Search**: Sidebar search bar (⌘K shortcut) searches across all order fields — order number, customer, product, variant, notes, print name, and status.
- **Multi-Theme Experience**: Native support for Light, Dark, and High-Contrast Polarized modes. Theme preferences are persistent per user and sync across all logged-in devices.
- **Staging Workflow**: Added a mandatory "STAGING" step between production and shipping to ensure physical inventory matches digital batches.
- **Personalization Upgrade**: "Personalization / Prints Name" upgraded to a multi-line textarea in all views.
- **Automated Security**: Gitleaks, Semgrep, and Trivy run on every push to detect secrets, logic flaws, and dependency vulnerabilities.
- **Security Hardening**: Error sanitization, R2 upload validation (size/MIME/magic bytes), input validation, PBKDF2 600k iterations, constant-time API key comparison, CSV import limits, backup hardening.
- **Copy Label URL**: One-click clipboard copy for shipping label URLs on both the Shipping Tool and Order Details pages.
- **Shipping Audit Trail**: Every label purchase logged in audit log with tracking number, destination, and user email.
- **RGC Vinyl Pricing Engine**: Pro-grade square-inch based calculator with mode-based presets (Simple, Layered, Printed), setup fees, shop minimums, and a professional **Print-to-PDF Quote** generator.
- **Apple HEIC Support**: Support for `.heic` and `.heif` image uploads from mobile devices.
- **Trace ID & Diagnostic UI**: Unique support codes for all errors with one-click diagnostic data export for staff.
- **Shipping Resiliency**: Duplicate charge prevention and post-purchase database auto-recovery.
- **R2 Upload Security**: Increased to 20MB limit with MIME whitelist (including PDF) and magic-byte validation.
- **Axiom Logging**: High-signal event streaming for uploads, shipping, and order imports to Axiom for "after the fact" debugging.

⏳ **In Progress / Next Phase**:
- **Automated Tracking Push**: Automatically update Wix order status and tracking numbers after label purchase.
- **Barcode Support**: Direct scanning of manifests to trigger movement through the production stages.
- **Live Dispatch Dashboard**: Real-time status updates across different production workstations.
- **Email Notifications**: Extend the notification system to send email alerts for critical stage transitions.
- **Multi-Image Wix/CSV Import**: Add `image_url2-4` support to Wix sync and CSV import (currently only manual orders).
- **Webhook Retry Handling**: Add retry logic for failed webhook deliveries from Wix.
- **Scheduled Sync Fallback**: Add cron-based sync as backup if webhooks fail.

---

### 🔑 Environment Variables
Add these to your Cloudflare Pages Dashboard:
- `AUTH_SECRET`: Random 32-character string for JWT encryption.
- `AUTH_URL`: `https://printfrenzy.pages.dev/api/auth`
- `DB`: D1 Database Binding.
- `BUCKET`: R2 Bucket Binding.
- `ACCOUNT_ID`: Cloudflare Account ID.
- `NPM_CONFIG_LEGACY_PEER_DEPS`: `true` (Required for Auth v5 build).
- `SHIPPO_API_KEY`: API Key for USPS shipping label generation.
- `SHIPPO_SENDER_ADDRESS_JSON`: JSON string of the default sender address (requires email & phone).
- `WIX_API_KEY`: Wix API Key (Direct API sync).
- `WIX_SITE_ID`: Wix Site ID (Direct API sync).
- `WIX_WEBHOOK_SECRET`: HMAC secret for Wix webhook signature verification (real-time order ingestion).
- `R2_PUBLIC_URL`: Public URL for R2 bucket (e.g., `https://pub-xxxx.r2.dev`).
- `AXIOM_DATASET`: Axiom dataset name for high-signal logging.
- `AXIOM_TOKEN`: Axiom API token for event streaming.

