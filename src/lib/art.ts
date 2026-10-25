import { hashString, mulberry32 } from './utils';

/**
 * Procedurally generated artwork (SVG data URIs). Everything is local and original, so
 * there are no broken image links and no third-party image licensing to worry about.
 */
const cache = new Map<string, string>();

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

function palette(seed: string) {
  const r = mulberry32(hashString(seed));
  // Keep hues in the violet / blue / magenta range so everything matches the brand palette.
  const h1 = 205 + r() * 130;
  const h2 = h1 + 40 + r() * 70;
  return { r, h1, h2 };
}

function build(seed: string, initial?: string): string {
  const { r, h1, h2 } = palette(seed);
  const variant = Math.floor(r() * 4);
  let shapes = '';

  if (variant === 0) {
    const cx = 150 + r() * 300;
    const cy = 150 + r() * 300;
    for (let k = 0; k < 6; k++) {
      shapes += `<circle cx="${cx}" cy="${cy}" r="${50 + k * 55}" fill="none" stroke="#fff" stroke-opacity="${(0.07 + k * 0.02).toFixed(2)}" stroke-width="${6 + k * 2}"/>`;
    }
  } else if (variant === 1) {
    const rot = 15 + r() * 40;
    for (let k = 0; k < 9; k++) {
      shapes += `<rect x="${-120 + k * 85}" y="-200" width="${30 + r() * 30}" height="1000" fill="#fff" fill-opacity="${(0.05 + r() * 0.07).toFixed(2)}" transform="rotate(${rot.toFixed(1)} 300 300)"/>`;
    }
    shapes += `<circle cx="${200 + r() * 200}" cy="${200 + r() * 200}" r="${90 + r() * 60}" fill="#fff" fill-opacity=".1"/>`;
  } else if (variant === 2) {
    for (let k = 0; k < 6; k++) {
      const y = 140 + k * 55;
      const a = (r() - 0.5) * 140;
      shapes += `<path d="M-20 ${y} C 150 ${y - 80 + a}, 450 ${y + 80 - a}, 620 ${y}" fill="none" stroke="#fff" stroke-opacity="${(0.1 + k * 0.03).toFixed(2)}" stroke-width="${6 + k}" stroke-linecap="round"/>`;
    }
  } else {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        shapes += `<circle cx="${40 + col * 74}" cy="${40 + row * 74}" r="${3 + r() * 5}" fill="#fff" fill-opacity=".18"/>`;
      }
    }
    shapes += `<circle cx="${r() * 600}" cy="${r() * 600}" r="${130 + r() * 60}" fill="#fff" fill-opacity=".1"/>`;
  }

  const text = initial
    ? `<text x="300" y="372" font-size="250" font-weight="800" text-anchor="middle" fill="#fff" fill-opacity=".92" font-family="Inter,system-ui,sans-serif">${esc(initial)}</text>`
    : '';

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${h1.toFixed(0)},80%,55%)"/>` +
    `<stop offset="1" stop-color="hsl(${h2.toFixed(0)},85%,20%)"/></linearGradient>` +
    `<radialGradient id="r" cx=".3" cy=".22" r=".85"><stop offset="0" stop-color="#fff" stop-opacity=".28"/>` +
    `<stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>` +
    `<rect width="600" height="600" fill="url(#g)"/>${shapes}<rect width="600" height="600" fill="url(#r)"/>${text}</svg>`
  );
}

function toDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Square album / track cover. */
export function makeCover(seed: string): string {
  const k = `c:${seed}`;
  let v = cache.get(k);
  if (!v) {
    v = toDataUri(build(seed));
    cache.set(k, v);
  }
  return v;
}

/** Artist portrait with initial. */
export function makeArtistImage(name: string): string {
  const k = `a:${name}`;
  let v = cache.get(k);
  if (!v) {
    const initial = (name.trim()[0] || '?').toUpperCase();
    v = toDataUri(build(`artist:${name}`, initial));
    cache.set(k, v);
  }
  return v;
}

/** CSS gradient used when an image fails to load. */
export function fallbackGradient(seed: string): string {
  const { h1, h2 } = palette(seed || 'x');
  return `linear-gradient(135deg, hsl(${h1.toFixed(0)},75%,48%), hsl(${h2.toFixed(0)},80%,24%))`;
}
