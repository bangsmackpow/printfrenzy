export function getPrinterQualityImage(url: string, highRes = false): string {
  if (!url) return "/placeholder.png";

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
  if (finalUrl.includes('wixstatic.com')) {
    const targetW = highRes ? 1500 : 1000;
    const targetH = highRes ? 1500 : 1000;
    const targetQ = highRes ? 100 : 95;

    return finalUrl
      .replace(/\/fit\//g, '/fill/') // Prefer fill for consistent aspect ratios
      .replace(/w_\d+/g, `w_${targetW}`)
      .replace(/h_\d+/g, `h_${targetH}`)
      .replace(/q_\d+/g, `q_${targetQ}`);
  }

  return finalUrl;
}