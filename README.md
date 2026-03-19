# 👕 PrintFrenzy

**High-Efficiency DTF Print Queue & Production Manager**

PrintFrenzy is a specialized internal tool built for Built Networks, LLC (Creston, IA). It is designed to bridge the gap between e-commerce orders (Wix) and physical DTF (Direct to Film) production by providing a high-resolution, "printer-ready" visual queue.

---

### 🎯 Pro-Production Workflow
The goal of this application is to minimize the "clicks-to-print" ratio:
- **Wix Grouping**: Automatic grouping of multiple items (shirts, hats, bags) from a single Wix order into one card.
- **Smart Thumbnails**: Automatically transforms low-res Wix thumbnails into 400x400 "printer-ready" images via `wixUtils.ts`.
- **Manual Orders**: Drag-and-drop design uploads to Cloudflare R2 for off-platform jobs.
- **Accountability**: Real-time logging of exactly which staff member printed which design via the `audit_logs`.

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
- **Database Schema**: Unified tables for `users`, `orders`, and `audit_logs`.
- **Auth Engine**: Switched to `@auth/nextjs (v5)` to support Next.js 16 on the Edge.
- **Production Queue**: Dashboard built with item grouping for multi-item Wix orders.
- **R2 Integration**: Secure browser-to-bucket uploads for manual designs.
- **Staff Control**: Admin panel for managing staff and resetting passwords.

⏳ **In Progress / Next Phase**:
- **Wix Direct API**: Migrating from CSV imports to a "Sync" button via the Wix Orders API.
- **Audit Reporting**: Summary page for total prints per staff member.
- **Webhook Integration**: Real-time order synchronization.

---

### 🔑 Environment Variables
Add these to your Cloudflare Pages Dashboard:
- `AUTH_SECRET`: Random 32-character string for JWT encryption.
- `AUTH_URL`: `https://printfrenzy.pages.dev/api/auth`
- `DB`: D1 Database Binding.
- `BUCKET`: R2 Bucket Binding.
- `ACCOUNT_ID`: Cloudflare Account ID.
- `NPM_CONFIG_LEGACY_PEER_DEPS`: `true` (Required for Auth v5 build).
