function seededRng(seed: number) {
  let s = Math.abs(seed) || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function stringHash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const W = 400, H = 280;

export function generateEventCoverSvg(eventName: string, accentHex: string): string {
  const hash = stringHash(eventName || 'event');
  const rng  = seededRng(hash);
  const [h, s] = hexToHsl(accentHex);
  const sat = Math.min(s, 80);

  // Build a palette of 6 tones: all same hue family, varying lightness + slight hue shifts
  const palette = [
    hslToHex(h,              sat,      35),   // dark
    hslToHex(h,              sat,      45),   // base accent
    hslToHex(h,              sat,      55),   // medium
    hslToHex(h,              sat,      65),   // light
    hslToHex((h + 18) % 360, sat - 5,  50),   // slight hue shift warm
    hslToHex((h - 18 + 360) % 360, sat - 5, 50), // slight hue shift cool
  ];

  // Pick tile size variant from hash (small / medium / chunky)
  const sizeVariant = hash % 3;
  const [cols, rows] = sizeVariant === 0 ? [16, 11] : sizeVariant === 1 ? [10, 7] : [7, 5];
  const cw = W / cols;
  const ch = H / rows;

  // Fill every tile with a palette color picked by seeded rng
  const tiles = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const color = palette[Math.floor(rng() * palette.length)];
      tiles.push(`<rect x="${(c * cw).toFixed(1)}" y="${(r * ch).toFixed(1)}" width="${cw.toFixed(1)}" height="${ch.toFixed(1)}" fill="${color}"/>`);
    }
  }

  // Thin dark grid lines to separate tiles (gives a clean tiled look)
  const lines = [];
  for (let c = 1; c < cols; c++) {
    lines.push(`<line x1="${(c * cw).toFixed(1)}" y1="0" x2="${(c * cw).toFixed(1)}" y2="${H}" stroke="#000" stroke-opacity="0.08" stroke-width="1"/>`);
  }
  for (let r = 1; r < rows; r++) {
    lines.push(`<line x1="0" y1="${(r * ch).toFixed(1)}" x2="${W}" y2="${(r * ch).toFixed(1)}" stroke="#000" stroke-opacity="0.08" stroke-width="1"/>`);
  }

  return [
    `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">`,
    tiles.join(''),
    lines.join(''),
    `</svg>`,
  ].join('');
}

export function generateEventCoverDataUrl(eventName: string, accentHex: string): string {
  const svg = generateEventCoverSvg(eventName, accentHex);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
