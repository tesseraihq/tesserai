import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_MODE,
  colorDistance,
  contrastRatio,
  flattenTokens,
  parseColor,
  resolveToken,
  toRgba,
  type ColorValue,
  type DesignSystem,
  type ModeContext,
} from "@tesserai/core";

// Grades one import against a fixture's answer key (truth.json). Every measurable dimension is
// scored on its own, because a single number hides what went wrong:
// - accuracy: each color role (light and dark) by how different it looks (CIEDE2000), fonts by
//   name, base text size / corners / spacing by value;
// - trust: whether what the report calls "found" is really in the project (recall and precision
//   against the answer key) and whether each cited file:line actually holds the value;
// - decoys: whether a theme that isn't the app's (node_modules, Storybook, an old file) got in;
// - usable: whether the result keeps button and body text readable (WCAG 4.5:1).

export const ROLES = {
  primary: "intent.primary.solid",
  primaryForeground: "intent.primary.solid-foreground",
  background: "surface.page",
  card: "surface.card",
  foreground: "intent.neutral.text-strong",
  mutedText: "intent.neutral.text",
  border: "intent.neutral.border",
  danger: "intent.danger.solid",
  success: "intent.success.solid",
  warning: "intent.warning.solid",
} as const;
export type Role = keyof typeof ROLES;
export type Scheme = "light" | "dark";

export type Truth = {
  stack: string;
  route: "direct" | "agent" | "measure";
  hard: string;
  light: Partial<Record<Role, string>>;
  dark: Partial<Record<Role, string>> | null;
  fonts: Partial<Record<"sans" | "heading" | "mono", string>>;
  baseSize?: number;
  radius?: number;
  spacing?: number;
  // What the project doesn't define: "dark", "baseSize", "spacing", or one key ("light.border").
  absent: string[];
  // Colors in the tree that aren't the app's look.
  decoys: string[];
};

// What an import says about itself. Keys: "light.primary", "dark.border", "font.sans",
// "baseSize", "radius", "spacing" (others, like "shadow.md", aren't graded).
export type Claim = { key: string; value?: string | undefined; source?: string | undefined; via?: string | undefined };

export type Outcome = {
  ok: boolean;
  error?: string;
  system?: DesignSystem;
  // Undefined when the route doesn't report what it found (today's Import dialog).
  found?: Claim[] | undefined;
  filled?: string[] | undefined;
  skipped?: { name: string; why: string }[] | undefined;
  // The file (or files) it read.
  chose?: string[] | undefined;
  seconds: number;
  costUsd?: number | undefined;
};

export type Item = { key: string; want: string; got: string; score: number; note?: string };

export type FixtureScore = {
  fixture: string;
  ok: boolean;
  error?: string;
  accuracy: number;
  colorAccuracy: number;
  valueAccuracy: number;
  // Null when the route reports nothing about what it found.
  trust: { score: number; recall: number; precision: number; evidence: number; falseClaims: string[]; badEvidence: string[] } | null;
  decoyHits: string[];
  usable: number;
  score: number;
  items: Item[];
  chose?: string[] | undefined;
  seconds: number;
  costUsd?: number | undefined;
};

const mode = (scheme: Scheme): ModeContext => ({ ...DEFAULT_MODE, colorScheme: scheme });

function tokenValue(system: DesignSystem, path: string, scheme: Scheme): unknown {
  try {
    return resolveToken(flattenTokens(system.tokens), path, mode(scheme)).$value;
  } catch {
    return undefined;
  }
}

// A translucent color as it shows on the page: composited over the scheme's background.
function opaque(color: ColorValue, under: ColorValue | undefined): ColorValue {
  const alpha = color.alpha ?? 1;
  if (alpha >= 1 || under === undefined) return { ...color, alpha: undefined } as ColorValue;
  const a = toRgba(color);
  const b = toRgba(under);
  const mix = (x: number, y: number) => Math.round((x * alpha + y * (1 - alpha)) * 255);
  return parseColor(`rgb(${mix(a.r, b.r)} ${mix(a.g, b.g)} ${mix(a.b, b.b)})`)!;
}

const colorScore = (dE: number) => (dE <= 1 ? 1 : dE >= 10 ? 0 : 1 - (dE - 1) / 9);
const numberScore = (want: number, got: number) => (Math.abs(want - got) <= 0.5 ? 1 : Math.abs(want - got) <= 2 ? 0.5 : 0);

export function normalizeFont(name: string): string {
  return name
    .split(",")[0]!
    .replace(/["']/g, "")
    .replace(/\s+var$/i, "")
    .trim()
    .toLowerCase();
}

function firstFamily(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return String(value ?? "");
}

function generatorBase(system: DesignSystem, name: string): number | undefined {
  const config = system.generators[name]?.config as { base?: number } | undefined;
  return config?.base;
}

// Every key the answer key defines, and every key it says the project doesn't define.
export function truthKeys(truth: Truth): { defined: Set<string>; absent: (key: string) => boolean } {
  const defined = new Set<string>();
  for (const scheme of ["light", "dark"] as const) for (const role of Object.keys(truth[scheme] ?? {})) defined.add(`${scheme}.${role}`);
  for (const role of Object.keys(truth.fonts)) defined.add(`font.${role}`);
  for (const k of ["baseSize", "radius", "spacing"] as const) if (truth[k] !== undefined) defined.add(k);
  const absent = (key: string) => truth.absent.some((a) => a === key || (a === "dark" && key.startsWith("dark.")) || (a === "light" && key.startsWith("light.")));
  return { defined, absent };
}

const GRADED = /^(light|dark)\.(primary|primaryForeground|background|card|foreground|mutedText|border|danger|success|warning)$|^font\.(sans|heading|mono)$|^(baseSize|radius|spacing)$/;

// Does line `n` of the cited file hold this value? A color counts when a color on that line looks
// the same (ΔE under 2) or the line names the value as written; a number when the line has it.
export function evidenceHolds(dir: string, source: string, value: string | undefined, via?: string): { ok: boolean; why?: string } {
  if (source.startsWith("rendered:")) return { ok: true };
  const m = /^(.+):(\d+)$/.exec(source.trim());
  if (m === null) return { ok: false, why: `“${source}” isn't path:line` };
  const file = join(dir, m[1]!.replace(/^\.\//, ""));
  if (!existsSync(file)) return { ok: false, why: `${m[1]} doesn't exist` };
  const lines = readFileSync(file, "utf8").split("\n");
  const line = lines[Number(m[2]) - 1];
  if (line === undefined) return { ok: false, why: `${m[1]} has ${lines.length} lines` };
  if (value === undefined || value === "") return { ok: true };
  if (line.toLowerCase().includes(value.toLowerCase())) return { ok: true };
  // A class name standing for a library's own value (bg-red-600): the line must have it.
  if (via !== undefined && /^[a-z]+-[a-z0-9-]+$/.test(via) && line.includes(via)) return { ok: true };
  const color = parseColor(value);
  if (color !== undefined) {
    const literals = line.match(/#[0-9a-f]{3,8}\b|(?:rgb|hsl|oklch|oklab)a?\([^)]*\)|\b\d+(?:\.\d+)?%?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%|\b\d{1,3}\s+\d{1,3}\s+\d{1,3}\b/gi) ?? [];
    for (const lit of literals) {
      const parsed = parseColor(/^\d[\d.]*\s+\d{1,3}\s+\d{1,3}$/.test(lit) && !lit.includes("%") ? `rgb(${lit})` : /^\d/.test(lit) ? `hsl(${lit})` : lit);
      if (parsed !== undefined && colorDistance(parsed, color) < 2) return { ok: true };
    }
    return { ok: false, why: `line ${m[2]} of ${m[1]} has no color like ${value}` };
  }
  // A size as written: 16 is "16px", "1rem", "16"; a spacing unit may be a quarter of a spacer.
  const n = Number(value);
  if (!Number.isNaN(n)) {
    for (const m of line.matchAll(/(-?\d*\.?\d+)\s*(px|rem|em)?\b/g)) {
      const px = Number(m[1]) * (m[2] === "rem" || m[2] === "em" ? 16 : 1);
      if (Math.abs(px - n) <= 0.5 || Math.abs(px / 4 - n) <= 0.25) return { ok: true };
    }
  }
  const lower = line.toLowerCase();
  const font = normalizeFont(value);
  if (lower.includes(font) || lower.includes(font.replace(/\s+/g, "_"))) return { ok: true };
  return { ok: false, why: `line ${m[2]} of ${m[1]} doesn't have “${value}”` };
}

export function grade(fixture: string, dir: string, truth: Truth, outcome: Outcome): FixtureScore {
  const base = { fixture, chose: outcome.chose, seconds: outcome.seconds, costUsd: outcome.costUsd };
  if (!outcome.ok || outcome.system === undefined) {
    return { ...base, ok: false, error: outcome.error ?? "no system", accuracy: 0, colorAccuracy: 0, valueAccuracy: 0, trust: null, decoyHits: [], usable: 0, score: 0, items: [] };
  }
  const system = outcome.system;
  const items: Item[] = [];

  // Colors, per scheme, each composited over the truth's own background when translucent.
  const colorItems: Item[] = [];
  for (const scheme of ["light", "dark"] as const) {
    const want = truth[scheme];
    if (want === null || want === undefined) continue;
    const truthBg = parseColor(want.background ?? (scheme === "light" ? "#ffffff" : "#000000"));
    for (const [role, css] of Object.entries(want) as [Role, string][]) {
      const w = parseColor(css);
      const raw = tokenValue(system, ROLES[role], scheme) as ColorValue | undefined;
      const key = `${scheme}.${role}`;
      if (w === undefined || raw === undefined || typeof raw !== "object") {
        colorItems.push({ key, want: css, got: String(raw), score: 0, note: "no color" });
        continue;
      }
      const dE = colorDistance(opaque(w, truthBg), opaque(raw, truthBg));
      colorItems.push({ key, want: css, got: toCss(raw), score: colorScore(dE), note: `ΔE ${dE.toFixed(1)}` });
    }
  }

  const valueItems: Item[] = [];
  for (const [role, name] of Object.entries(truth.fonts)) {
    const got = firstFamily(tokenValue(system, `font.family.${role}`, "light"));
    const a = normalizeFont(name);
    const b = normalizeFont(got);
    valueItems.push({ key: `font.${role}`, want: name, got, score: a === b || (b !== "" && (a.startsWith(b) || b.startsWith(a))) ? 1 : 0 });
  }
  const numbers: [key: "baseSize" | "radius" | "spacing", generator: string][] = [["baseSize", "type"], ["radius", "radius"], ["spacing", "space"]];
  for (const [key, generator] of numbers) {
    const want = truth[key];
    if (want === undefined) continue;
    const got = generatorBase(system, generator);
    // A pill (999px, or anything from 24 up) is right when the result is at tesserai's roundest.
    const score = got === undefined ? 0 : key === "radius" && want >= 24 ? (got >= 20 ? 1 : got >= 12 ? 0.5 : 0) : numberScore(want, got);
    valueItems.push({ key, want: String(want), got: String(got), score });
  }
  items.push(...colorItems, ...valueItems);

  const mean = (xs: Item[]) => (xs.length === 0 ? 1 : xs.reduce((s, x) => s + x.score, 0) / xs.length);
  const colorAccuracy = mean(colorItems);
  const valueAccuracy = mean(valueItems);
  const accuracy = mean(items);

  // Decoys: the result's main colors look like a theme that isn't the app's.
  const decoyHits: string[] = [];
  for (const decoy of truth.decoys) {
    const d = parseColor(decoy);
    if (d === undefined) continue;
    for (const role of ["primary", "background"] as const) {
      const got = tokenValue(system, ROLES[role], "light") as ColorValue | undefined;
      const want = truth.light[role] === undefined ? undefined : parseColor(truth.light[role]!);
      if (got === undefined || typeof got !== "object") continue;
      if (colorDistance(got, d) < 2 && (want === undefined || colorDistance(got, want) > 5)) decoyHits.push(`${role} is ${decoy}`);
    }
  }

  // Trust: only for routes that report what they found.
  let trust: FixtureScore["trust"] = null;
  if (outcome.found !== undefined) {
    const { defined, absent } = truthKeys(truth);
    const claims = outcome.found.filter((c) => GRADED.test(c.key));
    const claimed = new Set(claims.map((c) => c.key));
    const recall = defined.size === 0 ? 1 : [...defined].filter((k) => claimed.has(k)).length / defined.size;
    const falseClaims: string[] = [];
    for (const c of claims) {
      if (absent(c.key)) falseClaims.push(`${c.key}: the project doesn't define it`);
      else if (c.value !== undefined && truth.decoys.some((d) => near(c.value!, d) && !near(c.value!, truthValue(truth, c.key)))) falseClaims.push(`${c.key}: ${c.value} is a decoy`);
    }
    const precision = claims.length === 0 ? 1 : 1 - falseClaims.length / claims.length;
    const badEvidence: string[] = [];
    for (const c of claims) {
      if (c.source === undefined) {
        badEvidence.push(`${c.key}: no source`);
        continue;
      }
      const held = evidenceHolds(dir, c.source, c.value, c.via);
      if (!held.ok) badEvidence.push(`${c.key}: ${held.why}`);
    }
    const evidence = claims.length === 0 ? 1 : 1 - badEvidence.length / claims.length;
    trust = { score: 0.4 * recall + 0.4 * precision + 0.2 * evidence, recall, precision, evidence, falseClaims, badEvidence };
  }

  // Usable: the import doesn't make text harder to read than the project had it. A pair passes at
  // 4.5:1, or when it's no worse than the original's own pair (a faithful copy of a theme whose
  // button text fails WCAG isn't the import's fault; the report should say so instead).
  const pair = (fg: Role, bg: Role, scheme: Scheme) => {
    const a = tokenValue(system, ROLES[fg], scheme) as ColorValue | undefined;
    const b = tokenValue(system, ROLES[bg], scheme) as ColorValue | undefined;
    if (a === undefined || b === undefined || typeof a !== "object" || typeof b !== "object") return false;
    const got = contrastRatio(opaque(a, b), b);
    const want = truth[scheme];
    const tf = want?.[fg] === undefined ? undefined : parseColor(want[fg]!);
    const tb = want?.[bg] === undefined ? undefined : parseColor(want[bg]!);
    const original = tf !== undefined && tb !== undefined ? contrastRatio(opaque(tf, tb), tb) : undefined;
    return got >= 4.5 || (original !== undefined && got >= original - 0.2);
  };
  const checks = [pair("primaryForeground", "primary", "light"), pair("foreground", "background", "light")];
  if (truth.dark !== null) checks.push(pair("primaryForeground", "primary", "dark"), pair("foreground", "background", "dark"));
  const usable = checks.filter(Boolean).length / checks.length;

  const score = Math.max(0, 0.6 * accuracy + 0.3 * (trust?.score ?? 0) + 0.1 * usable - 0.2 * decoyHits.length);
  return { ...base, ok: true, accuracy, colorAccuracy, valueAccuracy, trust, decoyHits, usable, score, items };
}

function near(a: string, b: string | undefined): boolean {
  if (b === undefined) return false;
  const x = parseColor(a);
  const y = parseColor(b);
  return x !== undefined && y !== undefined && colorDistance(x, y) < 2;
}

function truthValue(truth: Truth, key: string): string | undefined {
  const [scheme, role] = key.split(".") as [string, Role];
  if (scheme === "light") return truth.light[role];
  if (scheme === "dark") return truth.dark?.[role];
  return undefined;
}

function toCss(color: ColorValue): string {
  const { r, g, b, a } = toRgba(color);
  const hex = [r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
  return a < 1 ? `#${hex} / ${a}` : `#${hex}`;
}
