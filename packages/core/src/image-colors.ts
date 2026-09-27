// The colors an image is made of, measured from its pixels, for the AI to read exact values from
// (a model looking at a screenshot guesses hex codes badly). Pixels that look alike are merged, so
// a flat button reads as one color however it's anti-aliased.

export type ImageColor = { hex: string; share: number };

// Channels 0..255 to OKLab, where straight-line distance is close to how different colors look.
function linear(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function oklab(r: number, g: number, b: number): [number, number, number] {
  const [lr, lg, lb] = [linear(r), linear(g), linear(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

type Cluster = { r: number; g: number; b: number; n: number; lab: [number, number, number] };

// Under this OKLab distance two colors are one (about twice what most people can tell apart).
const SAME = 0.04;
// Colors this saturated are listed first: in a screenshot the brand color is often only the
// buttons and links.
const VIVID = 0.08;
// A flat color covering less than this is an edge's anti-aliasing, not a color of the design.
// Text and hairline borders sit well above it at the sample size the builder measures.
const NOISE = 0.0002;

const hex = (c: Cluster) => `#${[c.r, c.g, c.b].map((v) => Math.round(v / c.n).toString(16).padStart(2, "0")).join("")}`;
const chroma = (c: Cluster) => Math.hypot(c.lab[1], c.lab[2]);

type Tally = Map<number, { r: number; g: number; b: number; n: number }>;

// Pixels counted by color: exactly, or in buckets of `bits` a channel.
function tally(pixels: ArrayLike<number>, bits: number): { counts: Tally; total: number } {
  const shift = 8 - bits;
  const counts: Tally = new Map();
  let total = 0;
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3]! < 128) continue;
    const r = pixels[i]!;
    const g = pixels[i + 1]!;
    const b = pixels[i + 2]!;
    const key = ((r >> shift) << (2 * bits)) | ((g >> shift) << bits) | (b >> shift);
    const count = counts.get(key);
    if (count === undefined) counts.set(key, { r, g, b, n: 1 });
    else {
      count.r += r;
      count.g += g;
      count.b += b;
      count.n += 1;
    }
    total += 1;
  }
  return { counts, total };
}

// Colors above the noise, most area first, with ones that look alike merged.
function cluster(counts: Tally, total: number): Cluster[] {
  const clusters: Cluster[] = [];
  for (const count of [...counts.values()].sort((a, b) => b.n - a.n)) {
    if (count.n / total < NOISE) break;
    const lab = oklab(count.r / count.n, count.g / count.n, count.b / count.n);
    const near = clusters.find((c) => Math.hypot(c.lab[0] - lab[0], c.lab[1] - lab[1], c.lab[2] - lab[2]) < SAME);
    if (near === undefined) clusters.push({ ...count, lab });
    else {
      near.r += count.r;
      near.g += count.g;
      near.b += count.b;
      near.n += count.n;
    }
  }
  return clusters;
}

// `pixels` is RGBA, row by row, as a canvas gives it: a copy about 400px across, drawn without
// smoothing. Transparent pixels are skipped. Most area first; at most `limit` colors.
//
// A screenshot of an interface is made of flat colors, so exact colors are counted: its text and
// borders show up however little area they cover, and anti-aliasing scatters into shades too rare
// to count. A photo or a compressed JPEG has no flat colors; when exact colors cover less than
// half of it, similar colors are pooled instead.
export function measureColors(pixels: ArrayLike<number>, limit = 10): ImageColor[] {
  let { counts, total } = tally(pixels, 8);
  if (total === 0) return [];
  let clusters = cluster(counts, total);
  if (clusters.reduce((sum, c) => sum + c.n, 0) / total < 0.5) {
    ({ counts, total } = tally(pixels, 5));
    clusters = cluster(counts, total);
  }
  const share = (c: Cluster) => c.n / total;
  const vivid = clusters.filter((c) => chroma(c) >= VIVID).slice(0, 4);
  const picked = [...new Set([...vivid, ...clusters])].slice(0, limit);
  return picked.sort((a, b) => b.n - a.n).map((c) => ({ hex: hex(c), share: Math.round(share(c) * 10000) / 10000 }));
}
