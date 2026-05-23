// Plantillas SVG parametrizadas. Devuelven un string SVG que luego se convierte a PNG.
// Cada plantilla define su tamano (cuadrado 1080x1080 para IG feed, 1200x627 para LinkedIn).

const escapeXml = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

// Word-wrap simple para SVG <text>. Devuelve array de lineas que caben en `maxChars`.
const wrap = (text, maxChars) => {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = (line ? line + ' ' : '') + w;
    }
  }
  if (line) lines.push(line);
  return lines;
};

// ===== IG: Cita / frase impactante (1080x1080) =====
const igQuote = ({ title = '', subtitle = '', author = '', bg = '#0f172a', fg = '#f8fafc', accent = '#22d3ee' }) => {
  const lines = wrap(title, 22).slice(0, 6);
  const startY = 540 - (lines.length - 1) * 60;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.35"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#g)"/>
  <text x="80" y="140" font-family="Inter, Arial, sans-serif" font-size="36" fill="${accent}" font-weight="700">${escapeXml(subtitle)}</text>
  ${lines
    .map(
      (l, i) =>
        `<text x="540" y="${startY + i * 110}" font-family="Inter, Arial, sans-serif" font-size="88" font-weight="800" fill="${fg}" text-anchor="middle">${escapeXml(l)}</text>`
    )
    .join('\n  ')}
  <text x="540" y="980" font-family="Inter, Arial, sans-serif" font-size="34" fill="${fg}" text-anchor="middle" opacity="0.85">${escapeXml(author)}</text>
</svg>`;
};

// ===== IG: Tip / lista numerada (1080x1080) =====
const igTip = ({ title = '', items = [], brand = '', bg = '#fffbeb', fg = '#111827', accent = '#f59e0b' }) => {
  const titleLines = wrap(title, 24).slice(0, 3);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <rect width="1080" height="1080" fill="${bg}"/>
  <rect x="0" y="0" width="1080" height="14" fill="${accent}"/>
  <text x="60" y="100" font-family="Inter, Arial, sans-serif" font-size="32" fill="${accent}" font-weight="700">${escapeXml(brand)}</text>
  ${titleLines
    .map((l, i) => `<text x="60" y="${190 + i * 80}" font-family="Inter, Arial, sans-serif" font-size="72" font-weight="800" fill="${fg}">${escapeXml(l)}</text>`)
    .join('\n  ')}
  ${(items || [])
    .slice(0, 5)
    .map((it, i) => {
      const y = 470 + i * 110;
      return `
  <circle cx="100" cy="${y - 20}" r="38" fill="${accent}"/>
  <text x="100" y="${y - 8}" font-family="Inter, Arial, sans-serif" font-size="42" font-weight="800" fill="${bg}" text-anchor="middle">${i + 1}</text>
  <text x="170" y="${y - 8}" font-family="Inter, Arial, sans-serif" font-size="40" fill="${fg}">${escapeXml(it.slice(0, 42))}</text>`;
    })
    .join('')}
</svg>`;
};

// ===== IG: Promo / oferta (1080x1080) =====
const igPromo = ({ title = '', subtitle = '', cta = '', brand = '', bg = '#020617', fg = '#f8fafc', accent = '#a855f7' }) => {
  const tLines = wrap(title, 18).slice(0, 4);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <radialGradient id="rg" cx="50%" cy="0%" r="80%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="${bg}"/>
    </radialGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#rg)"/>
  <text x="60" y="100" font-family="Inter, Arial, sans-serif" font-size="32" fill="${fg}" font-weight="700" opacity="0.8">${escapeXml(brand)}</text>
  ${tLines
    .map((l, i) => `<text x="540" y="${380 + i * 96}" font-family="Inter, Arial, sans-serif" font-size="92" font-weight="900" fill="${fg}" text-anchor="middle">${escapeXml(l)}</text>`)
    .join('\n  ')}
  <text x="540" y="${380 + tLines.length * 96 + 40}" font-family="Inter, Arial, sans-serif" font-size="40" fill="${fg}" text-anchor="middle" opacity="0.85">${escapeXml(subtitle)}</text>
  <rect x="290" y="900" width="500" height="100" rx="50" fill="${accent}"/>
  <text x="540" y="965" font-family="Inter, Arial, sans-serif" font-size="42" font-weight="800" fill="${fg}" text-anchor="middle">${escapeXml(cta)}</text>
</svg>`;
};

// ===== LinkedIn: portada de articulo (1200x627) =====
const liCover = ({ title = '', subtitle = '', author = '', bg = '#0a66c2', fg = '#ffffff', accent = '#ffffff' }) => {
  const tLines = wrap(title, 30).slice(0, 4);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="627" viewBox="0 0 1200 627">
  <defs>
    <linearGradient id="lg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="627" fill="url(#lg)"/>
  <rect x="60" y="60" width="80" height="6" fill="${accent}"/>
  ${tLines
    .map((l, i) => `<text x="60" y="${180 + i * 70}" font-family="Inter, Arial, sans-serif" font-size="56" font-weight="800" fill="${fg}">${escapeXml(l)}</text>`)
    .join('\n  ')}
  <text x="60" y="${180 + tLines.length * 70 + 30}" font-family="Inter, Arial, sans-serif" font-size="28" fill="${fg}" opacity="0.85">${escapeXml(subtitle)}</text>
  <text x="60" y="580" font-family="Inter, Arial, sans-serif" font-size="24" fill="${fg}" opacity="0.9">${escapeXml(author)}</text>
</svg>`;
};

export const templates = {
  'ig-quote': { name: 'IG: Frase impactante', size: '1080x1080', build: igQuote },
  'ig-tip': { name: 'IG: Lista de tips', size: '1080x1080', build: igTip },
  'ig-promo': { name: 'IG: Oferta / promo', size: '1080x1080', build: igPromo },
  'li-cover': { name: 'LinkedIn: portada articulo', size: '1200x627', build: liCover }
};
