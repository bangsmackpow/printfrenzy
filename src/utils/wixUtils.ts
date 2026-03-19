export function getPrinterQualityImage(url: string, highRes = false): string {
  if (!url) return "/placeholder.png";
  if (!url.includes('wixstatic.com')) return url; // Handle R2 uploads

  // Robust regex for replacing dimensions in Wix URLs
  // Handles comma-separated fit/fill dimensions like w_50,h_50
  const size = highRes ? 'w_1000,h_1000' : 'w_500,h_500';
  const q = highRes ? 'q_100' : 'q_90';

  return url
    .replace(/w_\d+/g, size.split(',')[0])
    .replace(/h_\d+/g, size.split(',')[1])
    .replace(/q_\d+/g, q);
}