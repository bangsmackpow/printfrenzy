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

### 🔐 Security & Management
Protecting the production data and team access:
- **Password Management**: Self-service user resets and admin-initiated password resets for all staff.
- **Destructive Safety**: "Clear All Orders" requires an Admin password re-prompt to confirm the system wipe.
- **Individual Cleanup**: Admins can delete specific orders or entire Wix groups directly from the queue.

### 🛠️ Tech Stack (The "Bleeding Edge" Build)
- **Framework**: Next.js 16.1.7 (Turbopack enabled)
- **Runtime**: Cloudflare Pages (Edge Runtime)
- **Database**: Cloudflare D1 (SQL)
- **Storage**: Cloudflare R2 (S3-compatible)
- **Auth**: Auth.js (v5 Beta)
- **Styling**: Tailwind CSS

---

### 📅 Current Development Progress
✅ **Completed**:
- **Database Schema**: Unified tables for `users`, `orders`, and `audit_logs`. Added `shipments` table.
- **Auth Engine**: Switched to `@auth/nextjs (v5)` to support Next.js 16 on the Edge.
- **Production Queue**: Dashboard built with item grouping for multi-item Wix orders.
- **Production Print Manifest**: A dedicated sidebar tab for generating global, high-resolution print manifests for all orders in the "PRINTING" stage.
- **USPS Shipping Tool**: A standalone sidebar tool for generating and tracking USPS shipping labels for both internal orders and external shipments via Shippo API. Ensures sender contact compliance and hides postage price on labels.
- **Wix Direct API Sync**: Real-time synchronization of paid orders directly into the production queue without manual processing.
- **R2 Integration**: Secure browser-to-bucket uploads for manual designs.
- **Staff Control**: Admin panel for managing staff and resetting passwords.
- **Production Print Manifest**: Dedicated sidebar view for generating high-resolution manifests and specialized urgent notes pages.

⏳ **In Progress / Next Phase**:
- **Automated Tracking Push**: Automatically update Wix order status and tracking numbers after label purchase.
- **Audit Reporting**: Summary page for total prints per staff member.
- **Barcode Support**: Direct scanning of manifests to trigger movement through the production stages.

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
