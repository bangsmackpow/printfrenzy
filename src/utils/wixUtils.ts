export function getPrinterQualityImage(url: string): string {
  if (!url) return "/placeholder.png";
  if (!url.includes('wixstatic.com')) return url; // Handle R2 uploads

  // Swaps thumbnail size for printer resolution
  return url
    .replace('w_50', 'w_400')
    .replace('h_50', 'h_400')
    .replace('q_90', 'q_100');
}