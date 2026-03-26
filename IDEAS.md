# 💡 Future Ideas & Enhancements

## 🖼️ Media & Imaging
- [ ] **R2 Image Synchronization**: On CSV import, download the high-res Wix source (2000x2000) and save it directly to Cloudflare R2.
  - *Benefits*: Faster serving, persistent asset ownership, and avoidance of Wix's "Forbidden" errors.
  - *Implementation*: Use Cloudflare Workers to stream the buffer during the `/import` process.
- [ ] **Auto-scaling for Dashboard**: Implement Cloudflare Image Resizing on the R2 source to serve small thumbnails for the queue and full res for printing.

## 🚚 Logistics & Shipping
- [ ] **Address Validation**: Integrate Shippo's Global Address Validation to prevent USPS delivery errors before label purchase.
- [ ] **Multi-Carrier Support**: Expand beyond USPS to include UPS and FedEx (pending customer demand).

## ⚙️ Production Workflow
- [ ] **Order Batching Logic**: Group similar products across multiple Wix orders into a single "Print Run" to optimize material usage.
- [ ] **Barcode Scanning**: Add a barcode scanner interface to the production manifest to "Mark as Printed" with a physical scan.
