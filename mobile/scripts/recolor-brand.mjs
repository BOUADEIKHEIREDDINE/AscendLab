/**
 * Recolours the brand images from the old mint accent to iris, keeping white parts white and
 * transparency intact. Run from mobile/: `node scripts/recolor-brand.mjs`.
 *
 * Each pixel is treated as a blend between its background B and the mint M:
 *   pixel = B + t · (M − B)
 * We find t by projecting onto that line, and only recolour pixels that lie close to it (so white
 * text and other colours are untouched). The pixel is rebuilt as B' + t · (iris − B'), where B'
 * is the new background, so anti-aliased edges blend correctly. Transparent images blend against
 * black (their edge pixels carry the mint colour with partial alpha).
 *
 * The originals are copied once to assets/brand/legacy/ and are always read from there, so the
 * script can be re-run safely.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const IRIS = [0x9f, 0xa8, 0xff];
const OLD_BG = [0x10, 0x18, 0x20]; // "Daily Ascent" midnight blue
const NEW_BG = [0x0a, 0x0b, 0x0e]; // ink
const BLACK = [0, 0, 0];

const ASSETS = 'assets';
const LEGACY = 'assets/brand/legacy';

/** Images to recolour. `opaqueBg`: the solid background they were drawn on (null = transparent). */
const IMAGES = [
  { file: 'icon.png', opaqueBg: OLD_BG },
  { file: 'favicon.png', opaqueBg: OLD_BG },
  { file: 'logo.png', opaqueBg: null },
  { file: 'splash-icon.png', opaqueBg: null },
  { file: 'android-icon-foreground.png', opaqueBg: null },
  { file: 'android-icon-background.png', opaqueBg: OLD_BG },
];

const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const len = (a) => Math.sqrt(dot(a, a));

/** The logo's actual mint: the most common saturated green pixel colour across the originals. */
async function measureMint(files) {
  const counts = new Map();
  for (const f of files) {
    const { data } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      if (a < 250 || g < 150 || g - r < 80 || g - b < 20) continue;
      const k = (r << 16) | (g << 8) | b;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  const [k] = [...counts.entries()].sort((x, y) => y[1] - x[1])[0];
  return [(k >> 16) & 255, (k >> 8) & 255, k & 255];
}

mkdirSync(LEGACY, { recursive: true });
for (const { file } of IMAGES) {
  if (!existsSync(`${LEGACY}/${file}`)) copyFileSync(`${ASSETS}/${file}`, `${LEGACY}/${file}`);
}
const MINT = await measureMint(IMAGES.map(({ file }) => `${LEGACY}/${file}`));
console.log('mint measured as', '#' + MINT.map((v) => v.toString(16).padStart(2, '0')).join(''));

for (const { file, opaqueBg } of IMAGES) {
  const src = `${LEGACY}/${file}`;
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const from = opaqueBg ?? BLACK;
  const to = opaqueBg ? NEW_BG : BLACK;
  const axis = sub(MINT, from);
  const axisLen = len(axis);
  let changed = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const c = [data[i], data[i + 1], data[i + 2]];
    const d = sub(c, from);
    const t = dot(d, axis) / (axisLen * axisLen);
    const residual = len(sub(d, axis.map((v) => v * t)));
    // On the background → new background; on the mint line → iris blend; anything else stays.
    if (t < -0.05 || t > 1.2 || residual > 0.14 * axisLen) continue;
    const k = Math.min(Math.max(t, 0), 1);
    const out = to.map((v, j) => Math.round(v + k * (IRIS[j] - v)));
    data[i] = out[0]; data[i + 1] = out[1]; data[i + 2] = out[2];
    changed++;
  }
  const image = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  const meta = await sharp(src).metadata();
  // Keep opaque images opaque (icon.png has no alpha channel).
  await (meta.hasAlpha ? image : image.removeAlpha()).png().toFile(`${ASSETS}/${file}`);
  console.log(`${file}: ${changed} pixels recoloured`);
}
