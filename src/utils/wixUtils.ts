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

  // 2. Surgical replacement of the sizing segment
  // Targets: /fit/w_50,h_50,q_90/ -> /fill/w_1000,h_1000,al_c,q_95/
  if (finalUrl.includes('wixstatic.com/media/')) {
    const targetW = highRes ? 1500 : 1000;
    const targetH = highRes ? 1500 : 1000;
    const targetQ = highRes ? 100 : 95;
    const segment = `fill/w_${targetW},h_${targetH},al_c,q_${targetQ}`;

    // Replace anything between /v1/ and the next / (which is where the sizing lives)
    finalUrl = finalUrl.replace(/\/v1\/(fit|fill)\/[^\/]+(?=\/)/, `/v1/${segment}`);
  }

  return finalUrl;
}