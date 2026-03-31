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

---

## ✅ Database Integrity & Schema
The live production database has been verified and matches the current codebase exactly. 
No further migrations are required at this time.
- **Tables**: `users`, `orders`, `audit_logs`, `shipments`.
- **New Columns**: `notes`, `print_name`, `ordered_at`, `quantity` are all active.

## 🔑 Environment Variables check
Ensure these are set in the Cloudflare Pages Dashboard for full functionality:
- `AUTH_SECRET`: [OK]
- `AUTH_URL`: [OK]
- `SHIPPO_API_KEY`: [OK]
- `SHIPPO_SENDER_ADDRESS_JSON`: [OK]
- `WIX_API_KEY`: [OK] (Wix API Token for real-time sync)
- `WIX_SITE_ID`: [OK] (Wix Site ID for real-time sync)
- `BUCKET`: (R2 Binding for design uploads) [OK]

---

## ⏳ Next Phase / Ideas
- **Automated Tracking Uploads**: Push tracking numbers back to Wix orders automatically after purchase.
- **Address Validation**: Add automatic address correction to the Shipping Tool.
- **Barcode Support**: Generate barcodes on the Manifest for scanning/status updates.
