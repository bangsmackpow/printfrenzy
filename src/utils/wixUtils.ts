export function getPrinterQualityImage(url: string): string {
  if (!url || !url.includes('wixstatic.com')) return url;

  // The CSV format is: .../v1/fit/w_50,h_50,q_90/media_file.jpg
  // We want to target the sizing segment and boost it.
  return url
    .replace('w_50', 'w_400')
    .replace('h_50', 'h_400')
    .replace('q_90', 'q_100');
}