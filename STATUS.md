# Project Status

## Recent Updates
- **Fixed Order Notes & Print Name Fields**: Identified that `notes` and `print_name` were missing from the database schema. Updated `schema.sql` and provided `migration.sql`. Also added an explicit "Save Notes" button to the order details UI for better user feedback.
- **USPS Shipping Feature Added**: Implemented a "Purchase USPS Label" feature on the order details page. It groups by customer and allows generating real USPS shipping labels via the Shippo API.
- **Standalone Shipping Tool**: Promoted the shipping function to a top-level "Shipping Tool" on the sidebar. It now supports generating labels for external shipments (optional order reference) and maintains history with optional links back to internal orders.
- **Global Production Print Tab**: Added a dedicated "Production Print" link to the sidebar. This page now generates a global manifest of ALL items currently in the "PRINTING" status, making it easier to run large print jobs across multiple batches (Wix or Manual).
- **Major Bundle Size Optimization**:
    - Removed `bcryptjs` and switched to native **Web Crypto PBKDF2** (adds 0 bytes to bundle).
    - Enabled **Build Minification** via `next-on-pages --minify`.
    - **API Consolidation**: Merged 15+ individual API routes into consolidated "Catch-all" routes (`api/admin/[[...slug]]` and `api/orders/[[...slug]]`). This removed ~3MB of redundant Next.js Edge boilerplate.
    - **Middleware Matcher**: Restricted middleware to only run on necessary routes, preventing it from loading for every API call or asset.

## Required Actions for Developer/Admin
1. **Database Migration**: The local database needs to be updated with the new columns and the `shipments` table.
   Run the following command in your terminal:
   ```bash
   npx wrangler d1 execute printfrenzy_db --local --file=migration.sql
   ```
   *Note: If you have already deployed this to production, you will also need to run this against your remote D1 database by adding `--remote`.*

2. **Shippo Integration Setup**:
   - Create a free account at [Shippo](https://goshippo.com/).
   - Generate an API Key (Test or Live).
   - Add the key to your `.env` (for local dev) and Cloudflare Pages Environment Variables:
     `SHIPPO_API_KEY="shippo_test_..."`
   - *(Optional)* Add your default sender address as a JSON string to avoid using the fallback dummy address:
     `SHIPPO_SENDER_ADDRESS_JSON='{"name": "Your Shop", "street1": "123 Main St", "city": "City", "state": "ST", "zip": "12345", "country": "US"}'`
