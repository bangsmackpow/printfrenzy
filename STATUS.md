# Project Status - PrintFrenzy

## 🚀 Recent Major Updates (April 1, 2026)

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
