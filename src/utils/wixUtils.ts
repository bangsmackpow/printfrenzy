export function getPrinterQualityImage(url: string, highRes = false): string {
  if (!url) return "https://pub-0a9a68a0e7bd45fd90bf38ff3ec0e00b.r2.dev/placeholder.svg";

  let finalUrl = url;

  // 1. Transform wix:image://v1/{hash}/{name}#originWidth=...
  if (url.startsWith('wix:image://')) {
    const parts = url.split('/');
    if (parts.length >= 5) {
      const hash = parts[4];
      const filenameWithMeta = parts[parts.length - 1];
      const filename = filenameWithMeta.split('#')[0];
      const ext = filename.split('.').pop() || 'jpg';
      finalUrl = `https://static.wixstatic.com/media/${hash}~mv2.${ext}/v1/fill/w_1200,h_1200,al_c,q_100/${filename}`;
    }
  }

  // 2. Adjust size for existing static URLs (including those from CSV exports)
  // We use a broader approach: if it has w_ or h_, we'll replace the entire sizing segment.
  if (finalUrl.includes('wixstatic.com')) {
    const targetW = highRes ? 1500 : 1000;
    const targetH = highRes ? 1500 : 1000;
    const targetQ = highRes ? 100 : 95;
    const newSegment = `fill/w_${targetW},h_${targetH},al_c,q_${targetQ}`;

    // Match and replace: /v1/anything_here/ and handle the case where it might be slightly different.
    // Wix URLs strictly follow the format: .../media/id/v1/SizingMethod/Dimensions/filename
    // We capture from /v1/ to the end and then replace.
    const parts = finalUrl.split('/v1/');
    if (parts.length === 2) {
      const remaining = parts[1].split('/');
      if (remaining.length >= 2) {
        // e.g. ["fit", "w_50,h_50,q_90", "media_file.jpg"]
        const filename = remaining[remaining.length - 1];
        return `${parts[0]}/v1/${newSegment}/${filename}`;
      }
    }
  }

  return finalUrl;
}