import { clampChroma, converter, differenceCiede2000, formatHex, inGamut, parse, wcagContrast, type Oklch } from "culori";
import type { ColorValue } from "./tokens";
import { round } from "./units";

const toOklchCulori = converter("oklch");
const toRgbCulori = converter("rgb");
const srgb = inGamut("rgb");
const p3 = inGamut("p3");

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function normalizeHue(h: number): number {
  const n = h % 360;
  return n < 0 ? n + 360 : n;
}

export function fromCulori(c: Oklch): ColorValue {
  const out: ColorValue = {
    l: round(clamp01(c.l)),
    c: round(Math.max(0, c.c)),
    h: round(normalizeHue(Number.isFinite(c.h ?? NaN) ? (c.h as number) : 0), 2),
  };
  if (c.alpha !== undefined && c.alpha < 1) out.alpha = round(c.alpha);
  return out;
}

export function toCulori(color: ColorValue): Oklch {
  const out: Oklch = { mode: "oklch", l: color.l, c: color.c, h: color.h };
  if (color.alpha !== undefined) out.alpha = color.alpha;
  return out;
}

export function oklch(l: number, c: number, h: number, alpha?: number): ColorValue {
  return fromCulori({ mode: "oklch", l, c, h, ...(alpha === undefined ? {} : { alpha }) });
}

// Accepts anything CSS accepts: hex, rgb(), hsl(), oklch(), named colors.
export function parseColor(input: string): ColorValue | undefined {
  const parsed = parse(input.trim());
  if (parsed === undefined) return undefined;
  const converted = toOklchCulori(parsed);
  return converted === undefined ? undefined : fromCulori(converted);
}

export function toHex(color: ColorValue): string {
  return formatHex(toCulori(color));
}

export type Rgba = { r: number; g: number; b: number; a: number };

// sRGB components in 0..1, gamut-clamped, for platforms that cannot take OKLCH (Figma, native).
export function toRgba(color: ColorValue): Rgba {
  const rgb = toRgbCulori(toCulori(clampToSrgb(color)));
  const unit = (v: number | undefined) => round(clamp01(v ?? 0));
  return { r: unit(rgb?.r), g: unit(rgb?.g), b: unit(rgb?.b), a: round(color.alpha ?? 1) };
}

export function toCssOklch(color: ColorValue): string {
  const base = `${round(color.l, 4)} ${round(color.c, 4)} ${round(color.h, 2)}`;
  return color.alpha === undefined ? `oklch(${base})` : `oklch(${base} / ${round(color.alpha, 3)})`;
}

export function isInSrgb(color: ColorValue): boolean {
  return srgb(toCulori(color));
}

export function isInP3(color: ColorValue): boolean {
  return p3(toCulori(color));
}

// Reduces chroma until the color fits sRGB, keeping lightness and hue.
export function clampToSrgb(color: ColorValue): ColorValue {
  if (isInSrgb(color)) return color;
  let out = fromCulori(clampChroma(toCulori(color), "oklch", "rgb"));
  // Rounding in fromCulori can land a hair outside the gamut boundary; back off chroma until it fits.
  while (!isInSrgb(out) && out.c > 0) out = { ...out, c: round(Math.max(0, out.c - 0.0005)) };
  return out;
}

export function contrastRatio(a: ColorValue, b: ColorValue): number {
  return round(wcagContrast(toCulori(a), toCulori(b)), 2);
}

// How different two colors look (CIEDE2000): under about 2 most people can't tell them apart.
const ciede2000 = differenceCiede2000();
export function colorDistance(a: ColorValue, b: ColorValue): number {
  return ciede2000(toCulori(a), toCulori(b));
}
