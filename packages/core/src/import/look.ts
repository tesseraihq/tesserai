import { contrastRatio, parseColor, toCssOklch } from "../color";
import type { Changeset } from "../ops/changeset";
import { CANONICAL_STEPS, MIN_STEPS } from "../palette";
import type { ColorValue } from "../tokens";
import { px } from "../units";

// A project's look, whatever it was read from: a stylesheet, a token file, a library theme read by
// a coding agent, or a rendered page. Every reader produces one; `lookToSystem` turns it into a
// tesserai system and says, for each part, whether it was found (and where), filled in, or left
// out. Found values are set exactly; only what wasn't found is derived.

// "file:line", or "rendered: <what was measured>" for a running page.
// `via`: the text on the source line that stands for the value when the value itself isn't written
// there (a Tailwind class like bg-red-600, whose color is Tailwind's own).
// `origin`: the token path an alias chain ends at, for readers that place sources afterwards.
export type Found<T> = { value: T; source?: string | undefined; name?: string | undefined; via?: string | undefined; origin?: string | undefined };

export type Scheme = "light" | "dark";

// The roles every import is judged on, and the token each one sets.
export const LOOK_ROLES = {
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
export type LookRole = keyof typeof LOOK_ROLES;
const ROLE_OF_PATH = new Map<string, LookRole>(Object.entries(LOOK_ROLES).map(([role, path]) => [path, role as LookRole]));

export type FontRole = "sans" | "heading" | "mono";
export type ShadowSize = "sm" | "md" | "lg";

export type Look = {
  // Colors by the tesserai token they set (the LOOK_ROLES paths, and others such as
  // "intent.neutral.subtle" or "chart.1"), per scheme, with the original written value.
  colors: Record<Scheme, Map<string, Found<string>>>;
  // Numbered color scales (50…950, 1…12), each kept step for step.
  scales: { name: string; steps: { step: string; value: Found<string> }[] }[];
  fonts: Partial<Record<FontRole, Found<string[]>>>;
  baseSize?: Found<number>;
  radius?: Found<number>;
  spacing?: Found<number>;
  shadows: Partial<Record<ShadowSize, Found<string>>>;
  skipped: { name: string; why: string }[];
  // Things worth saying that aren't a found value ("dark mode comes from antd's darkAlgorithm").
  notes: string[];
  // Fonts set from a variable defined elsewhere (next/font's --font-geist-sans), for a reader that
  // sees the whole project to fill in.
  pendingFonts: { role: FontRole; variable: string; name: string; source?: string | undefined }[];
};

export function emptyLook(): Look {
  return { colors: { light: new Map(), dark: new Map() }, scales: [], fonts: {}, shadows: {}, skipped: [], notes: [], pendingFonts: [] };
}

// `a` wins wherever both have a value; skipped and notes are kept from both.
export function mergeLooks(a: Look, b: Look): Look {
  const out = emptyLook();
  for (const scheme of ["light", "dark"] as const) {
    out.colors[scheme] = new Map([...b.colors[scheme], ...a.colors[scheme]]);
  }
  const names = new Set(a.scales.map((s) => s.name));
  out.scales = [...a.scales, ...b.scales.filter((s) => !names.has(s.name))];
  out.fonts = { ...b.fonts, ...a.fonts };
  out.shadows = { ...b.shadows, ...a.shadows };
  for (const k of ["baseSize", "radius", "spacing"] as const) {
    const v = a[k] ?? b[k];
    if (v !== undefined) out[k] = v;
  }
  out.skipped = [...a.skipped, ...b.skipped];
  out.notes = [...a.notes, ...b.notes];
  out.pendingFonts = [...a.pendingFonts, ...b.pendingFonts];
  return out;
}

export function isEmptyLook(look: Look): boolean {
  return (
    look.colors.light.size === 0 &&
    look.colors.dark.size === 0 &&
    look.scales.length === 0 &&
    Object.keys(look.fonts).length === 0 &&
    look.baseSize === undefined &&
    look.radius === undefined &&
    look.spacing === undefined
  );
}

// ---- names ----------------------------------------------------------------------------------

// What people call each role, across shadcn, MUI, Chakra, Bootstrap, Tokens Studio sets and
// hand-rolled variables. Matched after `canonicalName` drops prefixes like --color-, --clr-, $.
const SYNONYMS: [path: string, names: string[]][] = [
  ["intent.primary.solid", ["primary", "brand", "action", "interactive", "cta", "primary-main", "accent-color"]],
  ["intent.primary.solid-foreground", ["primary-foreground", "on-primary", "primary-fg", "on-accent", "accent-foreground-solid", "on-brand", "primary-contrast", "primary-contrast-text", "on-action", "primary-text-on"]],
  ["surface.page", ["background", "bg", "canvas", "page", "body-bg", "body-background", "bg-default", "background-default", "base", "surface-page", "app-bg", "bg-canvas", "paper-bg"]],
  ["surface.card", ["card", "paper", "surface", "surface-1", "raised", "panel", "background-paper", "bg-surface", "bg-card", "card-background", "card-bg"]],
  ["surface.overlay", ["popover", "overlay", "menu"]],
  ["intent.neutral.text-strong", ["foreground", "text", "fg", "ink", "body-color", "text-primary", "fg-default", "on-background", "on-surface", "content", "text-default", "body-text"]],
  ["intent.neutral.text", ["muted-foreground", "text-muted", "muted-text", "text-secondary", "subtle-text", "fg-muted", "secondary-text", "text-subtle", "text-tertiary"]],
  ["intent.neutral.border", ["border", "line", "divider", "stroke", "outline", "hairline", "border-color", "rule", "border-default"]],
  ["intent.neutral.border-strong", ["input", "border-strong", "input-border"]],
  ["intent.primary.focus-ring", ["ring", "focus", "focus-ring", "focus-color"]],
  ["intent.neutral.subtle", ["secondary", "subtle"]],
  ["intent.neutral.subtle-foreground", ["secondary-foreground", "subtle-foreground"]],
  ["intent.neutral.background", ["muted"]],
  ["intent.danger.solid", ["destructive", "danger", "error", "critical", "negative", "alert", "error-main"]],
  ["intent.danger.solid-foreground", ["destructive-foreground", "on-danger", "on-error", "danger-foreground"]],
  ["intent.success.solid", ["success", "positive", "ok", "success-main"]],
  ["intent.warning.solid", ["warning", "caution", "attention", "warning-main"]],
];
const BY_NAME = new Map<string, string>();
for (const [path, names] of SYNONYMS) for (const n of names) BY_NAME.set(n, path);

// shadcn's `accent` is its hover background; elsewhere "accent" is the brand color. Which one
// depends on whether the same set also has a `primary`.
const SHADCN_ACCENT = "intent.neutral.subtle-hover";

// A component's own variables (--navbar-background, $button-color): not the page's or the text's.
const COMPONENT_WORDS = new Set(["navbar", "nav", "button", "btn", "input", "field", "modal", "dialog", "table", "footer", "header", "sidebar", "menu", "dropdown", "tooltip", "badge", "alert", "tab", "tabs", "link", "code", "pre", "hero", "box", "notification", "tag", "chip", "pill", "toast", "popover", "select", "checkbox", "radio", "switch", "progress", "breadcrumb", "pagination", "panel", "footer", "toolbar", "appbar", "drawer", "list", "item", "avatar", "tooltip", "label", "form", "control", "message", "section", "column", "title", "subtitle", "heading", "icon"]);

export function canonicalName(raw: string, keepSuffix = false): string {
  const base = raw
    .replace(/^[-$@]+/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_.]+/g, "-")
    .toLowerCase()
    .replace(/^(color|colour|colors|clr|c|col|theme|ds|app|sys|semantic|palette|tw)-/, "")
    .replace(/^(color|colour)-/, "");
  return keepSuffix ? base : base.replace(/-(color|colour|clr)$/, "");
}

// Numbered series (Open Props' --surface-1, --text-2): the first is the base, the next the quieter.
const SERIES: Record<string, string[]> = {
  surface: ["surface.page", "surface.card", "surface.overlay"],
  bg: ["surface.page", "surface.card", "surface.overlay"],
  background: ["surface.page", "surface.card", "surface.overlay"],
  text: ["intent.neutral.text-strong", "intent.neutral.text"],
  fg: ["intent.neutral.text-strong", "intent.neutral.text"],
  ink: ["intent.neutral.text-strong", "intent.neutral.text"],
};
const QUIETER = /^(muted|subtle|secondary|soft|light|weak|dim|faint|quiet|2)$/;
const ON = /^(foreground|fg|ink|contrast|contrast-text|text|on|content|inverse|label)$/;

// A name's role, trying it whole, then without its leading words (--sd-color-brand-primary is
// primary, --button-bg-danger is danger), then as a numbered series.
function lookup(name: string, names: Set<string>): string | undefined {
  if (name === "accent") return names.has("primary") ? SHADCN_ACCENT : LOOK_ROLES.primary;
  if (name === "accent-foreground") return names.has("primary") ? "intent.neutral.subtle-foreground" : LOOK_ROLES.primaryForeground;
  const direct = BY_NAME.get(name);
  if (direct !== undefined) return direct;
  const series = /^([a-z]+)-?(\d)$/.exec(name);
  if (series !== null && SERIES[series[1]!] !== undefined) return SERIES[series[1]!]![Number(series[2]) - 1];
  return undefined;
}

// The token a color's name means, or undefined. `names` is every color name in the same set,
// canonical, so a name can be read against the others: accent-ink is the text on accent, and
// ink-muted the quieter text, when accent and ink are the primary and the text.
export function roleForName(raw: string, names: Set<string>, scales: Set<string> = new Set()): string | undefined {
  // Whole names first, suffix and all: $body-color is text, $border-color the borders, and so is
  // --bs-body-color under a library's prefix (but not $navbar-body-color, the navbar's own).
  const full = canonicalName(raw, true).split("-");
  for (let i = 0; i < full.length - 1 && !COMPONENT_WORDS.has(full[0]!); i++) {
    const whole = BY_NAME.get(full.slice(i).join("-"));
    if (whole !== undefined) return whole;
  }
  const name = canonicalName(raw);
  const parts = name.split("-");
  if (parts.length > 1 && COMPONENT_WORDS.has(parts[0]!) && BY_NAME.get(name) === undefined && parts[0] !== "card") return undefined;
  // --teal-surface, --gray-contrast belong to the teal and gray scales: not the card, not text.
  if (parts.length > 1 && scales.has(parts[0]!) && BY_NAME.get(name) === undefined) return undefined;
  for (let i = 0; i < parts.length; i++) {
    const tail = parts.slice(i).join("-");
    const role = lookup(tail, names);
    if (role === undefined || (i > 0 && isStateWord(parts[parts.length - 1]!))) continue;
    // A leading word that's a role of its own claims the rest: --bs-primary-bg-subtle is primary's
    // tint, not the neutral subtle. (--brand-primary: both words mean primary, so it's primary.)
    const owner = parts.slice(0, i).map((w) => lookup(w, names)).find((r) => r !== undefined && r !== role);
    if (owner !== undefined) break;
    return role;
  }
  // Pairs: <primary>-ink, on-<primary>, <danger>-foreground; <text>-muted.
  for (let cut = parts.length - 1; cut >= 1; cut--) {
    const head = parts.slice(0, cut).join("-");
    const tail = parts.slice(cut).join("-");
    const base = lookup(head, names);
    if (base === LOOK_ROLES.primary && ON.test(tail)) return LOOK_ROLES.primaryForeground;
    if (base === LOOK_ROLES.danger && ON.test(tail)) return "intent.danger.solid-foreground";
    if (base === LOOK_ROLES.foreground && QUIETER.test(tail)) return LOOK_ROLES.mutedText;
  }
  if (parts[0] === "on" && parts.length > 1) {
    const base = lookup(parts.slice(1).join("-"), names);
    if (base === LOOK_ROLES.primary) return LOOK_ROLES.primaryForeground;
    if (base === LOOK_ROLES.danger) return "intent.danger.solid-foreground";
  }
  return undefined;
}

// Hover, active and other states aren't the role itself (--primary-hover isn't primary).
function isStateWord(w: string): boolean {
  return /^(hover|active|pressed|focus|disabled|selected|visited|emphasis|strong|dark|light|alpha|\d{2,3})$/.test(w);
}

// --brand-dark is the brand in dark mode, --surface1-light the surface in light: but only when
// the same set has both (--text-light alone is a lighter text, in Bulma and many others).
export function stripScheme(name: string, names: Set<string>): { name: string; scheme: "light" | "dark" | undefined } {
  const m = /^(.*?)(-?)(light|dark)$/.exec(name);
  if (m === null || m[1] === "" || !/[a-z]/.test(m[1]!)) return { name, scheme: undefined };
  const other = m[3] === "light" ? "dark" : "light";
  if (!names.has(`${m[1]}${m[2]}${other}`)) return { name, scheme: undefined };
  return { name: m[1]!.replace(/-$/, ""), scheme: m[3] as "light" | "dark" };
}

export function fontRoleForName(raw: string): FontRole | undefined {
  const name = canonicalName(raw).replace(/^(font-family|font|ff|family|typeface|fonts)-?/, "");
  if (/^(sans|body|base|text|default|primary|ui|copy|sans-serif)$/.test(name)) return "sans";
  if (/^(heading|headings|display|title|serif|secondary|headline)$/.test(name)) return "heading";
  if (/^(mono|code|monospace)$/.test(name)) return "mono";
  // The role word anywhere beside a font word: $title-family, --type-body-family, font-family-base.
  // Not a size, weight or line height of a font ($font-size-base is a size).
  const words = name.split("-");
  if (words.some((w) => /^(size|sizes|weight|height|leading|line|spacing|tracking|letter|style|stretch|feature|variant|smoothing|scale|step)$/.test(w))) return undefined;
  if (words.some((w) => /^(mono|code|monospace)$/.test(w))) return "mono";
  if (words.some((w) => /^(heading|headings|display|title|headline)$/.test(w))) return "heading";
  if (words.some((w) => /^(body|base|sans|text|copy|ui|primary|default)$/.test(w))) return "sans";
  // Just "font-family" (--ion-font-family, $font-family): the one font, the body's.
  if (/(^|-)(font-family|family|font)$/.test(canonicalName(raw))) return "sans";
  return undefined;
}

// Font names from a CSS font-family list or an array, without quotes or generic fallbacks' order changed.
export function fontList(value: unknown): string[] {
  const list = Array.isArray(value) ? value.map(String) : typeof value === "string" ? value.split(",") : [];
  return list.map((f) => f.trim().replace(/^["']|["']$/g, "").trim()).filter((f) => f !== "" && !/^var\(/.test(f));
}

// ---- turning a look into a system --------------------------------------------------------------

// What the report says about each graded part: the benchmark reads the same keys.
export type Claim = { key: string; value?: string | undefined; source?: string | undefined; via?: string | undefined };

export type ImportResult = {
  changeset: Changeset;
  // Found in the project: "light.primary", "dark.border", "font.sans", "radius", …
  found: Claim[];
  // Not in the project, so derived from what was: the same keys ("dark" when there's no dark).
  filled: string[];
  skipped: { name: string; why: string }[];
  // Worth knowing, but nothing to fix in the import (a button that fails WCAG in the original).
  warnings: string[];
  // In plain words, what each found value became (the Import dialog's list).
  mapped: string[];
};

const PALETTE_NAMES: Record<string, string> = {
  primary: "brand", brand: "brand", accent: "brand",
  gray: "neutral", grey: "neutral", slate: "neutral", zinc: "neutral", stone: "neutral", neutral: "neutral", ink: "neutral", sand: "neutral",
  red: "red", rose: "red", amber: "amber", yellow: "amber", orange: "amber", green: "green", emerald: "green", blue: "blue", sky: "blue",
};
const STOCK_PALETTES = new Set(["brand", "neutral", "red", "amber", "green", "blue"]);

function color(found: Found<string> | undefined): ColorValue | undefined {
  return found === undefined ? undefined : parseColor(found.value);
}

function describe(path: string): string {
  const role = ROLE_OF_PATH.get(path);
  const words: Record<LookRole, string> = {
    primary: "primary color",
    primaryForeground: "text on primary",
    background: "page background",
    card: "card background",
    foreground: "main text",
    mutedText: "secondary text",
    border: "borders",
    danger: "danger color",
    success: "success color",
    warning: "warning color",
  };
  return role === undefined ? path.replace(/^intent\./, "").replace(/\./g, " ") : words[role];
}

export function lookToSystem(look: Look, name: string): ImportResult | { error: string } {
  if (isEmptyLook(look)) return { error: "no colors, fonts, sizes, corners or spacing found" };
  const ops: Changeset["ops"] = [];
  const found: Claim[] = [];
  const mapped: string[] = [];
  const warnings: string[] = [];
  const skipped = [...look.skipped];
  const light = look.colors.light;
  const dark = look.colors.dark;

  // Palettes: which scale is the brand, and its middle step as the seed.
  const scaleName = (n: string) => PALETTE_NAMES[canonicalName(n).split("-")[0]!] ?? canonicalName(n).replace(/[^a-z0-9-]/g, "").replace(/^[^a-z]+/, "");
  const primary = color(light.get(LOOK_ROLES.primary)) ?? color(dark.get(LOOK_ROLES.primary));
  const usable = look.scales.filter((s) => s.steps.length >= MIN_STEPS && s.steps.length <= CANONICAL_STEPS);
  for (const s of look.scales) if (s.steps.length > CANONICAL_STEPS) skipped.push({ name: s.name, why: `${s.steps.length} steps; tesserai palettes have at most ${CANONICAL_STEPS}` });
  // The brand scale is the one the primary color comes from, else one named like a brand.
  const nearest = (s: (typeof usable)[number]) => Math.min(...s.steps.map((st) => (primary === undefined ? Infinity : distance(primary, parseColor(st.value.value)))));
  const brandScale =
    (primary === undefined ? undefined : usable.filter((s) => nearest(s) < 1)[0]) ??
    usable.find((s) => scaleName(s.name) === "brand") ??
    (primary === undefined ? usable.find((s) => scaleName(s.name) !== "neutral") : undefined);
  const mid = (s: (typeof usable)[number]) => s.steps[Math.floor(s.steps.length / 2)]!.value.value;
  const seed = primary ?? (brandScale === undefined ? undefined : parseColor(mid(brandScale)));
  ops.push({ op: "system.create", input: { name, brandColor: seed === undefined ? "oklch(0.21 0.006 285)" : toCssOklch(seed), preset: "shadcn" } });

  const seen = new Set<string>();
  for (const s of usable) {
    let palette = s === brandScale ? "brand" : scaleName(s.name) || "palette";
    if (seen.has(palette)) palette = `${palette}-${canonicalName(s.name)}`.replace(/[^a-z0-9-]/g, "").slice(0, 40);
    seen.add(palette);
    if (STOCK_PALETTES.has(palette)) {
      ops.push({ op: "palette.setColor", input: { name: palette, color: toCssOklch(parseColor(mid(s))!) } });
      ops.push({ op: "palette.setSteps", input: { name: palette, steps: s.steps.length } });
    } else ops.push({ op: "palette.add", input: { name: palette, color: toCssOklch(parseColor(mid(s))!), steps: s.steps.length } });
    s.steps.forEach((st, i) => ops.push({ op: "palette.setStep", input: { name: palette, step: i + 1, color: toCssOklch(parseColor(st.value.value)!) } }));
    mapped.push(`${s.name} (${s.steps.map((st) => st.step).join(", ")}) → the ${palette} palette, every step exact`);
  }

  // Palettes that weren't given as scales follow the colors that were: neutral from the grays in
  // use, danger/success/warning from their own color. Then every found color is pinned exactly.
  const hasScale = (p: string) => usable.some((s) => (s === brandScale ? "brand" : scaleName(s.name)) === p);
  const neutralSeed = color(light.get(LOOK_ROLES.mutedText)) ?? color(light.get(LOOK_ROLES.border)) ?? color(light.get(LOOK_ROLES.foreground));
  if (!hasScale("neutral") && neutralSeed !== undefined) {
    const mid = { ...neutralSeed, l: 0.55, alpha: undefined } as ColorValue;
    ops.push({ op: "palette.setColor", input: { name: "neutral", color: toCssOklch(mid) } });
  }
  for (const [palette, path] of [["red", LOOK_ROLES.danger], ["green", LOOK_ROLES.success], ["amber", LOOK_ROLES.warning]] as const) {
    const c = color(light.get(path));
    if (!hasScale(palette) && c !== undefined) ops.push({ op: "palette.setColor", input: { name: palette, color: toCssOklch({ ...c, alpha: undefined } as ColorValue) } });
  }

  for (const change of foundChanges(look, skipped)) {
    ops.push(...change.ops);
    found.push({ key: change.key, value: change.value, source: change.source, via: change.via });
    mapped.push(change.mapped);
  }

  // What wasn't found is derived from what was, and said so.
  const filled: string[] = [];
  const has = (key: string) => found.some((c) => c.key === key);
  for (const role of ["primary", "primaryForeground", "background", "foreground", "border", "danger"] as const) if (!has(`light.${role}`)) filled.push(`light.${role}`);
  if (dark.size === 0) filled.push("dark");
  if (!has("font.sans")) filled.push("font.sans");
  for (const k of ["baseSize", "radius", "spacing"]) if (!has(k)) filled.push(k);

  // The original's own contrast problems are kept, and said.
  for (const scheme of ["light", "dark"] as const) {
    const pairs: [LookRole, LookRole, string][] = [
      ["primaryForeground", "primary", "Text on the primary color"],
      ["foreground", "background", "Main text on the page"],
    ];
    for (const [fg, bg, what] of pairs) {
      const a = color(look.colors[scheme].get(LOOK_ROLES[fg]));
      const b = color(look.colors[scheme].get(LOOK_ROLES[bg]));
      if (a === undefined || b === undefined) continue;
      const ratio = contrastRatio(a, b);
      if (ratio < 4.5) warnings.push(`${what}${scheme === "dark" ? " in dark" : ""} is ${ratio}:1; WCAG asks for 4.5:1. It's kept as you have it.`);
    }
  }
  warnings.push(...look.notes);

  return { changeset: { summary: `Imported ${name}`, ops }, found, filled, skipped, warnings, mapped };
}

function distance(a: ColorValue, b: ColorValue | undefined): number {
  if (b === undefined) return Infinity;
  const dl = a.l - b.l;
  const ah = (a.h * Math.PI) / 180;
  const bh = (b.h * Math.PI) / 180;
  const da = a.c * Math.cos(ah) - b.c * Math.cos(bh);
  const db = a.c * Math.sin(ah) - b.c * Math.sin(bh);
  return Math.sqrt(dl * dl + da * da + db * db) * 100;
}

// "0 1px 2px rgb(0 0 0 / 0.1), 0 4px 8px -2px #0000001a" as shadow layers.
export function parseShadow(css: string): { offsetX: ReturnType<typeof px>; offsetY: ReturnType<typeof px>; blur: ReturnType<typeof px>; spread: ReturnType<typeof px>; color: ColorValue; inset?: boolean }[] | undefined {
  const layers = css.split(/,(?![^(]*\))/).map((l) => l.trim()).filter(Boolean);
  const out = [];
  for (const layer of layers) {
    const colorMatch = /(#[0-9a-f]{3,8}\b|(?:rgb|rgba|hsl|hsla|oklch|oklab)\([^)]*\))/i.exec(layer);
    const c = colorMatch === null ? parseColor("rgb(0 0 0 / 0.1)") : parseColor(colorMatch[1]!);
    const rest = (colorMatch === null ? layer : layer.replace(colorMatch[1]!, "")).trim();
    const inset = /\binset\b/.test(rest);
    const nums = rest.replace(/\binset\b/, "").trim().split(/\s+/).filter(Boolean).map((n) => (n === "0" ? 0 : /^-?[\d.]+px$/.test(n) ? Number.parseFloat(n) : /^-?[\d.]+rem$/.test(n) ? Number.parseFloat(n) * 16 : Number.NaN));
    if (c === undefined || nums.length < 2 || nums.some(Number.isNaN)) return undefined;
    out.push({ offsetX: px(nums[0]!), offsetY: px(nums[1]!), blur: px(nums[2] ?? 0), spread: px(nums[3] ?? 0), color: c, ...(inset ? { inset: true } : {}) });
  }
  return out.length === 0 ? undefined : out;
}

// A report key in words: "light.primary" → "primary color", "font.sans" → "body font".
export function describeKey(key: string): string {
  if (key === "dark") return "dark mode";
  const [a, b] = key.split(".") as [string, string | undefined];
  if (a === "font") return b === "sans" ? "body font" : b === "heading" ? "heading font" : "code font";
  if (a === "shadow") return `${b === "sm" ? "small" : b === "lg" ? "large" : "medium"} shadow`;
  const words: Record<string, string> = { baseSize: "body text size", radius: "corner radius", spacing: "spacing unit" };
  if (words[a] !== undefined) return words[a]!;
  if ((a === "light" || a === "dark") && b !== undefined) {
    const rest = key.slice(a.length + 1);
    const role = rest in LOOK_ROLES ? describe(LOOK_ROLES[rest as LookRole]) : describe(rest);
    return a === "dark" ? `${role} (dark)` : role;
  }
  return key;
}

// One found value as the operations that set it: the first import applies all of them after making
// the system; a re-import (v2) offers each on its own, to take or leave.
export type Change = { key: string; label: string; value: string | undefined; source: string | undefined; via?: string | undefined; ops: Changeset["ops"]; mapped: string };

export function foundChanges(look: Look, skipped: { name: string; why: string }[] = []): Change[] {
  const out: Change[] = [];
  for (const scheme of ["light", "dark"] as const) {
    for (const [path, f] of look.colors[scheme]) {
      const c = parseColor(f.value);
      if (c === undefined) {
        skipped.push({ name: f.name ?? path, why: `“${f.value}” isn’t a color tesserai can read` });
        continue;
      }
      const value = toCssOklch(c);
      const [kind, a, b] = path.split(".");
      const op =
        kind === "intent" && a !== undefined && b !== undefined
          ? { op: "intent.setRole", input: { name: a, role: b, value, scheme } }
          : kind === "surface" && a !== undefined
            ? { op: "surface.set", input: { surface: a, value, scheme } }
            : { op: "token.set", input: { path, value, scheme } };
      const role = ROLE_OF_PATH.get(path);
      const key = `${scheme}.${role ?? path}`;
      out.push({ key, label: describeKey(key), value: f.value, source: f.source, via: f.via, ops: [op], mapped: `${f.name ?? path} → ${describe(path)}${scheme === "dark" ? " (dark)" : ""}` });
    }
  }
  for (const [role, f] of Object.entries(look.fonts) as [FontRole, Found<string[]>][]) {
    if (f.value.length === 0) continue;
    const key = `font.${role}`;
    out.push({ key, label: describeKey(key), value: f.value[0], source: f.source, ops: [{ op: "type.setFont", input: { role, families: f.value } }], mapped: `${f.name ?? role} → ${role} font ${f.value[0]}` });
  }
  if (look.baseSize !== undefined) {
    const v = look.baseSize.value;
    if (v >= 12 && v <= 24) out.push({ key: "baseSize", label: describeKey("baseSize"), value: String(v), source: look.baseSize.source, ops: [{ op: "type.setScale", input: { base: v } }], mapped: `${look.baseSize.name ?? "body size"} → body text ${v}px` });
    else skipped.push({ name: look.baseSize.name ?? "body size", why: `${v}px isn’t a body size tesserai can use (12–24px)` });
  }
  if (look.radius !== undefined && look.radius.value >= 0) {
    const v = look.radius.value;
    const base = Math.min(24, Math.round(v * 100) / 100);
    out.push({ key: "radius", label: describeKey("radius"), value: String(v), source: look.radius.source, ops: [{ op: "radius.set", input: { base } }], mapped: `${look.radius.name ?? "corner radius"} → corner radius ${base}px${v > 24 ? " (fully rounded, as the original)" : ""}` });
  }
  if (look.spacing !== undefined) {
    const v = look.spacing.value;
    if (v >= 2 && v <= 8) out.push({ key: "spacing", label: describeKey("spacing"), value: String(v), source: look.spacing.source, ops: [{ op: "spacing.set", input: { base: v } }], mapped: `${look.spacing.name ?? "spacing"} → spacing unit ${v}px` });
    else skipped.push({ name: look.spacing.name ?? "spacing", why: `${v}px isn’t a spacing unit tesserai can build on (2–8px)` });
  }
  for (const [size, f] of Object.entries(look.shadows) as [ShadowSize, Found<string>][]) {
    const layers = parseShadow(f.value);
    if (layers === undefined) {
      skipped.push({ name: f.name ?? `shadow ${size}`, why: `“${f.value}” isn’t a shadow tesserai can read` });
      continue;
    }
    const key = `shadow.${size}`;
    out.push({ key, label: describeKey(key), value: f.value, source: f.source, ops: [{ op: "token.set", input: { path: key, value: layers } }], mapped: `${f.name ?? `shadow ${size}`} → the ${size} shadow` });
  }
  return out;
}

// The only operations a change from an import may carry: the ones foundChanges makes. A re-import
// arrives through a link anyone could craft, so anything else (making a system, removing a palette,
// setting a component token) is refused before it's shown, let alone applied.
export function isImportOp(op: { op: string; input: unknown }): boolean {
  const i = (op.input ?? {}) as Record<string, unknown>;
  switch (op.op) {
    case "intent.setRole":
    case "surface.set":
    case "type.setFont":
    case "type.setScale":
    case "radius.set":
    case "spacing.set":
      return true;
    case "token.set":
      return typeof i.path === "string" && /^(chart\.[1-5]|shadow\.(sm|md|lg))$/.test(i.path);
    default:
      return false;
  }
}
