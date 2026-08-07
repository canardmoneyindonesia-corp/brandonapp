// Generates every binary asset the app needs, with zero image dependencies:
//   public/icons/*.png   PWA icons (192, 512, maskable 512, apple-touch 180)
//   public/seed/*.png    Placeholder unit photos used by the database seed
//
// Everything is rasterised into an RGBA buffer and encoded as PNG by hand
// (deflate via node:zlib), then box-downsampled from a supersampled canvas
// so the edges are smooth.

import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* ------------------------------------------------------------------ PNG --- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** @param {number} w @param {number} h @param {Buffer} rgba w*h*4 */
function encodePNG(w, h, rgba) {
  const stride = w * 4;
  const raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // truecolour + alpha
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* -------------------------------------------------------------- Canvas --- */

class Canvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = Buffer.alloc(w * h * 4); // transparent
  }
  blend(x, y, [r, g, b], a = 1) {
    if (a <= 0 || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    const da = this.px[i + 3] / 255;
    const oa = a + da * (1 - a);
    if (oa <= 0) return;
    this.px[i] = Math.round((r * a + this.px[i] * da * (1 - a)) / oa);
    this.px[i + 1] = Math.round((g * a + this.px[i + 1] * da * (1 - a)) / oa);
    this.px[i + 2] = Math.round((b * a + this.px[i + 2] * da * (1 - a)) / oa);
    this.px[i + 3] = Math.round(oa * 255);
  }
  /** Paint every pixel where `test(x,y)` returns a colour (or null to skip). */
  paint(test) {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = test(x, y);
        if (c) this.blend(x, y, c, c[3] ?? 1);
      }
    }
  }
  rect(x0, y0, x1, y1, color, alpha = 1) {
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(this.h, Math.ceil(y1)); y++)
      for (let x = Math.max(0, Math.floor(x0)); x < Math.min(this.w, Math.ceil(x1)); x++)
        this.blend(x, y, color, alpha);
  }
  roundRect(x0, y0, x1, y1, r, color, alpha = 1) {
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(this.h, Math.ceil(y1)); y++) {
      for (let x = Math.max(0, Math.floor(x0)); x < Math.min(this.w, Math.ceil(x1)); x++) {
        const cx = Math.min(Math.max(x, x0 + r), x1 - r);
        const cy = Math.min(Math.max(y, y0 + r), y1 - r);
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) this.blend(x, y, color, alpha);
      }
    }
  }
  circle(cx, cy, r, color, alpha = 1) {
    for (let y = Math.max(0, Math.floor(cy - r)); y < Math.min(this.h, Math.ceil(cy + r)); y++)
      for (let x = Math.max(0, Math.floor(cx - r)); x < Math.min(this.w, Math.ceil(cx + r)); x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) this.blend(x, y, color, alpha);
  }
  /** Thick line segment with round caps. */
  line(x0, y0, x1, y1, width, color, alpha = 1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len2 = dx * dx + dy * dy || 1;
    const r = width / 2;
    const minX = Math.floor(Math.min(x0, x1) - r);
    const maxX = Math.ceil(Math.max(x0, x1) + r);
    const minY = Math.floor(Math.min(y0, y1) - r);
    const maxY = Math.ceil(Math.max(y0, y1) + r);
    for (let y = Math.max(0, minY); y < Math.min(this.h, maxY); y++) {
      for (let x = Math.max(0, minX); x < Math.min(this.w, maxX); x++) {
        let t = ((x - x0) * dx + (y - y0) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const px = x0 + t * dx;
        const py = y0 + t * dy;
        if ((x - px) ** 2 + (y - py) ** 2 <= r * r) this.blend(x, y, color, alpha);
      }
    }
  }
  /** Triangle by half-plane tests. */
  triangle(p0, p1, p2, color, alpha = 1) {
    const sign = (a, b, c) => (a[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (a[1] - c[1]);
    const minX = Math.floor(Math.min(p0[0], p1[0], p2[0]));
    const maxX = Math.ceil(Math.max(p0[0], p1[0], p2[0]));
    const minY = Math.floor(Math.min(p0[1], p1[1], p2[1]));
    const maxY = Math.ceil(Math.max(p0[1], p1[1], p2[1]));
    for (let y = Math.max(0, minY); y < Math.min(this.h, maxY); y++) {
      for (let x = Math.max(0, minX); x < Math.min(this.w, maxX); x++) {
        const p = [x, y];
        const d1 = sign(p, p0, p1);
        const d2 = sign(p, p1, p2);
        const d3 = sign(p, p2, p0);
        const neg = d1 < 0 || d2 < 0 || d3 < 0;
        const pos = d1 > 0 || d2 > 0 || d3 > 0;
        if (!(neg && pos)) this.blend(x, y, color, alpha);
      }
    }
  }
  /** Box-downsample to 1/scale, producing the final anti-aliased buffer. */
  downsample(scale) {
    const w = Math.round(this.w / scale);
    const h = Math.round(this.h / scale);
    const out = Buffer.alloc(w * h * 4);
    const n = scale * scale;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const i = ((y * scale + sy) * this.w + (x * scale + sx)) * 4;
            const pa = this.px[i + 3] / 255;
            r += this.px[i] * pa;
            g += this.px[i + 1] * pa;
            b += this.px[i + 2] * pa;
            a += pa;
          }
        }
        const o = (y * w + x) * 4;
        if (a > 0) {
          out[o] = Math.round(r / a);
          out[o + 1] = Math.round(g / a);
          out[o + 2] = Math.round(b / a);
        }
        out[o + 3] = Math.round((a / n) * 255);
      }
    }
    return { w, h, px: out };
  }
}

const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

function write(file, { w, h, px }) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, encodePNG(w, h, px));
  const kb = (fs.statSync(file).size / 1024).toFixed(0);
  console.log(`  ${path.relative(ROOT, file).replace(/\\/g, "/")}  ${w}x${h}  ${kb} KB`);
}

/* --------------------------------------------------------------- Icons --- */

const BRAND_TOP = hex("#ff5a5f");
const BRAND_BOTTOM = hex("#e0134b");
const WHITE = [255, 255, 255];

function drawIcon(size, { maskable }) {
  const S = 4;
  const c = new Canvas(size * S, size * S);
  const W = c.w;
  const pad = maskable ? 0 : 0; // full bleed either way; corners rounded below
  const radius = maskable ? 0 : W * 0.225;

  // Brand plate with a vertical gradient.
  c.paint((x, y) => {
    const cx = Math.min(Math.max(x, pad + radius), W - pad - radius);
    const cy = Math.min(Math.max(y, pad + radius), W - pad - radius);
    if (radius > 0 && (x - cx) ** 2 + (y - cy) ** 2 > radius * radius) return null;
    return mix(BRAND_TOP, BRAND_BOTTOM, y / W);
  });

  // Safe area: maskable icons keep the glyph inside the middle 80%.
  const inset = maskable ? W * 0.2 : W * 0.24;
  const gx0 = inset;
  const gx1 = W - inset;
  const gw = gx1 - gx0;
  const cxm = W / 2;

  // House: roof + body.
  const roofY = gx0 + gw * 0.06;
  const eaveY = gx0 + gw * 0.42;
  const bodyY = gx0 + gw * 0.92;
  const halfRoof = gw * 0.52;
  const halfBody = gw * 0.38;

  c.triangle([cxm, roofY], [cxm - halfRoof, eaveY], [cxm + halfRoof, eaveY], WHITE);
  c.roundRect(cxm - halfBody, eaveY - gw * 0.04, cxm + halfBody, bodyY, gw * 0.06, WHITE);

  // Clock badge — this is an *hourly* rental.
  const br = gw * 0.28;
  const bx = cxm + halfBody * 0.72;
  const by = bodyY - gw * 0.02;
  c.circle(bx, by, br * 1.24, mix(BRAND_TOP, BRAND_BOTTOM, 0.5)); // knock-out ring
  c.circle(bx, by, br, WHITE);
  const hand = mix(BRAND_TOP, BRAND_BOTTOM, 0.65);
  c.line(bx, by, bx, by - br * 0.58, br * 0.19, hand); // minute hand (12)
  c.line(bx, by, bx + br * 0.44, by, br * 0.19, hand); // hour hand (3)
  c.circle(bx, by, br * 0.11, hand);

  return c.downsample(S);
}

/* ------------------------------------------------- Placeholder photos --- */

// Each unit gets its own hue family so the app never looks like one repeated photo.
const ROOM_STYLES = [
  { wall: "#e8dfd4", accent: "#c9a227", floor: "#8c6a4a", sky: "#cfe3f5" }, // warm sand
  { wall: "#dfe6e4", accent: "#2f6f62", floor: "#7d6650", sky: "#dbeaf2" }, // sage
  { wall: "#e6e1ea", accent: "#6b5b95", floor: "#94785d", sky: "#e3e8f7" }, // lilac
  { wall: "#e9e3dc", accent: "#b5533c", floor: "#6f5844", sky: "#d7e6ef" }, // terracotta
];

const SHOTS = ["living", "bed", "bath", "view"];

function drawPhoto(styleIndex, shot, variant) {
  const S = 2;
  const W = 1200 * S;
  const H = 800 * S;
  const c = new Canvas(W, H);
  const st = ROOM_STYLES[styleIndex % ROOM_STYLES.length];
  const wall = hex(st.wall);
  const wallDark = mix(wall, [0, 0, 0], 0.18);
  const accent = hex(st.accent);
  const floor = hex(st.floor);
  const sky = hex(st.sky);
  const horizon = H * 0.72;

  // Wall with a soft corner-to-corner falloff so it reads as lit.
  c.paint((x, y) => {
    if (y >= horizon) return null;
    const t = (x / W) * 0.55 + (y / horizon) * 0.45;
    return mix(mix(wall, [255, 255, 255], 0.12), wallDark, t * 0.75);
  });
  // Floor.
  c.paint((x, y) => {
    if (y < horizon) return null;
    const t = (y - horizon) / (H - horizon);
    return mix(mix(floor, [255, 255, 255], 0.18), mix(floor, [0, 0, 0], 0.25), t);
  });
  // Skirting board.
  c.rect(0, horizon - H * 0.018, W, horizon, mix(wall, [255, 255, 255], 0.55));

  if (shot === "view" || shot === "living") {
    // Big window, mullions, daylight bloom.
    const wx0 = shot === "view" ? W * 0.08 : W * 0.52;
    const wx1 = shot === "view" ? W * 0.92 : W * 0.94;
    const wy0 = H * 0.1;
    const wy1 = horizon - H * 0.06;
    c.rect(wx0 - W * 0.012, wy0 - H * 0.018, wx1 + W * 0.012, wy1 + H * 0.018, [252, 252, 251]);
    c.paint((x, y) => {
      if (x < wx0 || x > wx1 || y < wy0 || y > wy1) return null;
      const t = (y - wy0) / (wy1 - wy0);
      return mix(mix(sky, [255, 255, 255], 0.35), mix(sky, accent, 0.22), t);
    });
    // Skyline silhouettes.
    const seed = styleIndex * 7 + variant;
    for (let i = 0; i < 9; i++) {
      const bw = (wx1 - wx0) / 9;
      const bx = wx0 + i * bw;
      const bh = (0.18 + (((seed + i * 3) % 7) / 7) * 0.42) * (wy1 - wy0);
      c.rect(bx + bw * 0.08, wy1 - bh, bx + bw * 0.92, wy1, mix(sky, [40, 55, 70], 0.55));
    }
    const mull = [250, 250, 249];
    c.rect((wx0 + wx1) / 2 - W * 0.006, wy0, (wx0 + wx1) / 2 + W * 0.006, wy1, mull);
    c.rect(wx0, (wy0 + wy1) / 2 - H * 0.008, wx1, (wy0 + wy1) / 2 + H * 0.008, mull);
  }

  if (shot === "living") {
    // Sofa + rug + coffee table + plant.
    const sy = horizon + H * 0.02;
    c.roundRect(W * 0.04, sy + H * 0.12, W * 0.52, sy + H * 0.2, W * 0.01, mix(floor, [255, 255, 255], 0.45));
    c.roundRect(W * 0.05, horizon - H * 0.16, W * 0.42, sy + H * 0.06, W * 0.018, mix(accent, [255, 255, 255], 0.55));
    c.roundRect(W * 0.07, horizon - H * 0.24, W * 0.4, horizon - H * 0.12, W * 0.02, mix(accent, [255, 255, 255], 0.68));
    c.roundRect(W * 0.09, horizon - H * 0.22, W * 0.19, horizon - H * 0.14, W * 0.012, [252, 250, 246]);
    c.roundRect(W * 0.22, horizon - H * 0.22, W * 0.32, horizon - H * 0.14, W * 0.012, mix(accent, [255, 255, 255], 0.3));
    c.circle(W * 0.47, horizon - H * 0.05, H * 0.05, mix([46, 92, 58], [255, 255, 255], 0.15));
    c.rect(W * 0.462, horizon - H * 0.02, W * 0.478, horizon + H * 0.05, mix(floor, [0, 0, 0], 0.2));
  }

  if (shot === "bed") {
    const bx0 = W * 0.16;
    const bx1 = W * 0.84;
    const by = horizon + H * 0.14;
    c.roundRect(bx0 - W * 0.01, horizon - H * 0.42, bx1 + W * 0.01, horizon - H * 0.1, W * 0.014, mix(accent, [255, 255, 255], 0.62));
    c.roundRect(bx0, horizon - H * 0.12, bx1, by, W * 0.016, [250, 249, 246]);
    c.roundRect(bx0, by - H * 0.05, bx1, by, W * 0.016, mix(accent, [255, 255, 255], 0.35));
    c.roundRect(bx0 + W * 0.04, horizon - H * 0.1, bx0 + W * 0.22, horizon - H * 0.03, W * 0.014, [255, 255, 255]);
    c.roundRect(bx1 - W * 0.22, horizon - H * 0.1, bx1 - W * 0.04, horizon - H * 0.03, W * 0.014, [255, 255, 255]);
    c.circle(W * 0.1, horizon - H * 0.3, H * 0.035, mix(accent, [255, 255, 255], 0.4));
    c.circle(W * 0.9, horizon - H * 0.3, H * 0.035, mix(accent, [255, 255, 255], 0.4));
  }

  if (shot === "bath") {
    const tiles = mix(wall, [255, 255, 255], 0.4);
    c.paint((x, y) => {
      if (y >= horizon) return null;
      const gx = Math.floor(x / (W * 0.06));
      const gy = Math.floor(y / (H * 0.07));
      return (gx + gy) % 2 === 0 ? [...tiles, 0.45] : null;
    });
    c.roundRect(W * 0.1, horizon - H * 0.1, W * 0.56, horizon + H * 0.16, W * 0.02, [253, 253, 252]);
    c.roundRect(W * 0.13, horizon - H * 0.07, W * 0.53, horizon + H * 0.1, W * 0.016, mix(sky, [255, 255, 255], 0.5));
    c.rect(W * 0.6, horizon - H * 0.34, W * 0.86, horizon - H * 0.06, mix(sky, [255, 255, 255], 0.6));
    c.rect(W * 0.6, horizon - H * 0.34, W * 0.86, horizon - H * 0.32, mix(accent, [255, 255, 255], 0.3));
    c.circle(W * 0.73, horizon + H * 0.06, H * 0.03, mix(accent, [255, 255, 255], 0.5));
    c.rect(W * 0.725, horizon + H * 0.06, W * 0.735, horizon + H * 0.16, mix(floor, [255, 255, 255], 0.5));
  }

  // Warm vignette so the flat shapes read photographic-ish rather than clip-art.
  c.paint((x, y) => {
    const dx = (x - W / 2) / (W / 2);
    const dy = (y - H / 2) / (H / 2);
    const d = Math.sqrt(dx * dx + dy * dy);
    const v = Math.max(0, d - 0.62) * 0.55;
    return v > 0 ? [20, 16, 12, v] : null;
  });

  return c.downsample(S);
}

/* ----------------------------------------------------------------- run --- */

console.log("Generating PWA icons…");
write(path.join(ROOT, "public/icons/icon-192.png"), drawIcon(192, { maskable: false }));
write(path.join(ROOT, "public/icons/icon-512.png"), drawIcon(512, { maskable: false }));
write(path.join(ROOT, "public/icons/maskable-512.png"), drawIcon(512, { maskable: true }));
write(path.join(ROOT, "public/icons/apple-touch-icon.png"), drawIcon(180, { maskable: true }));

console.log("Generating placeholder unit photos…");
for (let u = 0; u < 4; u++) {
  SHOTS.forEach((shot, i) => {
    write(path.join(ROOT, `public/seed/unit-${u + 1}-${shot}.png`), drawPhoto(u, shot, i));
  });
}

console.log("\nDone.");
