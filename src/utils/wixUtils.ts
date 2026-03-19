export function getPrinterQualityImage(url: string): string {
  if (!url) return "/placeholder.png";
  if (!url.includes('wixstatic.com')) return url; // Handle R2 uploads

  // Robust regex for replacing dimensions in Wix URLs
  // Handles comma-separated fit/fill dimensions like w_50,h_50
  return url
    .replace(/w_\d+/g, 'w_500')
    .replace(/h_\d+/g, 'h_500')
    .replace(/q_\d+/g, 'q_100');
}