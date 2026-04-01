# Project Status - PrintFrenzy

## 🚀 Recent Major Updates (March 31, 2026)

### 1. ✏️ Order Modification Suite (Live)
- **Universal Editing**: Added full support for modifying any order field (Customer Name, Product, Variant, Quantity) directly from the dashboard.
- **Artwork Swap**: Ability to re-upload design files to R2 or paste new artwork URLs for existing orders.
- **Audit Logging**: Every manual modification is recorded in the `audit_logs` table with the user's email and timestamp for accountability.
- **Dashboard Hooks**: Quick-access floating pencil icons on every order card.

### 2. 📦 Standalone Shipping Tool (Live)
- **Carrier Integration**: Full USPS rate shopping and label purchasing via Shippo API.
- **Auto-Address Tracking**: Remembers previously used shipping addresses per customer to speed up label generation.
- **Tracking History**: Dedicated `shipments` table stores tracking numbers and label URLs for audit trails and returns.
- **Universal Support**: Works for both internal Wix orders and manual external shipments.

### 2. 🖨️ Production Print Manifest (Redesign v2)
- **One Page Per Part**: Optimized print layout where every item gets its own sheet, preventing mis-prints.
- **Urgent Notes Pages**: If an order has production notes, it automatically generates a separate, high-visibility "Warning" page before/after the artwork.
- **Personalization Focus**: Massive display for `print_name` to ensure custom names are never missed on individual jobs.
- **UI Clarity**: Moved Quantity (QTY) to a distinct badge to avoid clashing with long variant/size text descriptions.

### 3. 🖐️ Manual Order & R2 Uploads
- **Direct Design Uploads**: Drag-and-drop file uploads directly to Cloudflare R2 on the Manual Order page.
- **Workflow Flexibility**: Artwork is now optional—order can be created first and artwork linked/uploaded later.
- **Live Preview**: Instant visual confirmation of design assets before the job is pushed to production.

### 4. 🧹 Data Utility & Quality
- **Robust CSV Parsing**: Fixed image URL misalignment by implementing a quote-aware CSV parser.
- **Wix Transform Utility**: Automatic surgical replacement of Wix URL segments to convert low-res thumbnails into 1000px+ high-res production assets.
- **Auto-Casing**: Order descriptions and customer names are automatically converted to uppercase for consistent manifest aesthetics.

### 🔄 5. Wix Real-time Direct Sync (Live)
- **API Integration**: Replaced manual CSV exports with a "Sync Wix" button that pulls directly from Wix Stores.
- **Deduplication Logic**: Automatically scans existing orders to prevent duplicates when syncing multiple times.
- **Instant Processing**: New orders appear immediately in the `RECEIVED` queue with all metadata and variant details.

### 6. 🎨 Multi-Theme System (Live)
- **Four Distinct Modes**: `light`, `dark`, `polarized-light`, and `polarized-dark`.
- **User Persistence**: Theme preferences are saved per-user in the database, syncing across devices.
- **Polarization Support**: Forced square-edge high-contrast mode for professional production environments.
- **Micro-Animations**: Smooth HSL transitions across all UI components.

### 7. 🏗️ Staging Workflow Integration
- **New Status: STAGING**: Added a critical verification step between `PRINTING` and `PRODUCTION`.
- **Batch Verification**: Ensures all multi-item orders are physically accounted for before final assembly.
- **Dashboard Filters**: dedicated `STAGING` queue for production managers.

### 8. 📜 Universal Order Sheets
- **Feature Rebrand**: Formerly "Production Print," now "Order Sheets" for broader utility.
- **Accessible Everywhere**: Fixed-position print buttons added above every shipping block for instant manifest generation.
- **Customer Filtering**: Ability to print sheets for a single customer within a multi-order batch.

### 9. 🛡️ Automated Security Audit
- **Pipeline Integration**: Gitleaks (secrets), Semgrep (vulnerabilities), and Trivy (dependencies) run on every push.
- **SARIF Uploads**: Instant feedback in the GitHub Security Dashboard.

---

## ✅ Database Integrity & Schema
The live production database has been verified and matches the current codebase exactly. 
- **Tables**: `users`, `orders`, `audit_logs`, `shipments`.
- **New Columns**: `theme` (users table) is active for personalization.

## ⏳ Next Phase / Ideas
- **Automated Tracking Uploads**: Push tracking numbers back to Wix orders automatically after purchase.
- **Barcode Support**: Generate barcodes on the Manifest for scanning/status updates.
- **Live WebSocket Notifications**: Real-time status updates across different workstations.

