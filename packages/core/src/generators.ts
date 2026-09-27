import { z } from "zod";
import { clampToSrgb, oklch } from "./color";
import { ModeSelector } from "./modes";
import { CANONICAL_STEPS, keptSteps, MIN_STEPS } from "./palette";
import { ColorValue, deleteToken, flattenTokens, getToken, isToken, setToken, type Token, type TokenGroup } from "./tokens";
import { rem, round, snapTo } from "./units";
import { jsonEqual } from "./patch";

export const SpacingGenerator = z
  .object({
    kind: z.literal("spacing"),
    // Base unit in px; each multiplier becomes one numbered step.
    base: z.number().positive(),
    multipliers: z.array(z.number().positive()).min(1),
    // Scale factors for the density modes; every step gets a value per density. Systems saved before
    // density existed get the default factors.
    density: z.object({ compact: z.number().positive(), comfortable: z.number().positive() }).strict().default({ compact: 0.75, comfortable: 1.25 }),
  })
  .strict();

export const RadiusScaleGenerator = z
  .object({
    kind: z.literal("radiusScale"),
    // The md radius in px; the other steps are fixed ratios of it.
    base: z.number().min(0),
  })
  .strict();

export const TypeScaleGenerator = z
  .object({
    kind: z.literal("typeScale"),
    base: z.number().positive(),
    ratio: z.number().min(1),
    stepsBelow: z.number().int().min(0),
    stepsAbove: z.number().int().min(0),
    // Line-height targets: `text` at and below the base size, easing to `display` at the top step.
    leading: z.object({ text: z.number().min(1), display: z.number().min(1) }).strict(),
  })
  .strict();

export const ColorScaleGenerator = z
  .object({
    kind: z.literal("colorScale"),
    // The seed becomes the solid step in both light and dark.
    seed: ColorValue,
    // How many steps the palette has (3-12, default 12). Fewer steps keep the most important ones.
    steps: z.number().int().min(MIN_STEPS).max(CANONICAL_STEPS).optional(),
    // Multiplies every step's chroma: below 1 is calmer, above 1 more vivid (default 1).
    vibrancy: z.number().min(0).max(2).optional(),
    // Spreads every step's lightness away from the background (above 1: more contrast between
    // backgrounds, borders and text) or towards it (below 1: softer). The solid steps stay put.
    contrast: z.number().min(0.5).max(1.5).optional(),
  })
  .strict();

export const Generator = z.discriminatedUnion("kind", [
  SpacingGenerator,
  RadiusScaleGenerator,
  TypeScaleGenerator,
  ColorScaleGenerator,
]);
export type Generator = z.infer<typeof Generator>;
export type GeneratorKind = Generator["kind"];

export const DEFAULT_SPACING: z.infer<typeof SpacingGenerator> = {
  kind: "spacing",
  base: 4,
  multipliers: [0.5, 1, 2, 3, 4, 6, 8, 12, 16],
  density: { compact: 0.75, comfortable: 1.25 },
};

export const DEFAULT_RADIUS: z.infer<typeof RadiusScaleGenerator> = { kind: "radiusScale", base: 4 };

// Named steps as ratios of the base; `full` is a pill.
const RADIUS_STEPS: Record<string, number | "full"> = { none: 0, sm: 0.5, md: 1, lg: 2, xl: 3, "2xl": 4, full: "full" };

export const DEFAULT_TYPE_SCALE: z.infer<typeof TypeScaleGenerator> = {
  kind: "typeScale",
  base: 16,
  ratio: 1.2,
  stepsBelow: 2,
  stepsAbove: 6,
  leading: { text: 1.5, display: 1.15 },
};

// Roles per step follow Radix: 1 app bg, 2 subtle bg, 3-5 UI bg / hover / active,
// 6-8 borders (subtle / element / strong), 9 solid, 10 solid hover, 11-12 text (low / high contrast).
export const COLOR_SCALE_ROLES = [
  "app-background",
  "subtle-background",
  "element-background",
  "element-hover",
  "element-active",
  "border-subtle",
  "border",
  "border-strong",
  "solid",
  "solid-hover",
  "text-low",
  "text-high",
] as const;

// Step 8 (strong border, hover border) is placed to reach 3:1 against step 1 in each scheme.
const LIGHT_L = [0.993, 0.981, 0.957, 0.93, 0.9, 0.862, 0.8, 0.62, null, null, 0.5, 0.27] as const;
const LIGHT_C = [0.01, 0.03, 0.08, 0.12, 0.16, 0.2, 0.26, 0.38, 1, 1, 0.8, 0.3] as const;
const DARK_L = [0.165, 0.19, 0.235, 0.275, 0.315, 0.365, 0.435, 0.6, null, null, 0.78, 0.94] as const;
const DARK_C = [0.03, 0.05, 0.12, 0.17, 0.2, 0.24, 0.3, 0.42, 1, 1, 0.7, 0.2] as const;

// The solid hover step (10) moves away from the solid foreground: darker when the solid is dark,
// lighter when the solid is light, so hover never loses text contrast.
const SOLID_HOVER_SHIFT = 0.045;

// In dark mode the solid step is lifted so it reaches 3:1 against the dark page as a control
// border or ring (Material 3 lifts primary the same way); a near-black brand flips to near-white,
// the way shadcn's primary does. The solid foreground is chosen per scheme to match.
const DARK_SEED_LIMIT = 0.4;
const FLIPPED_SOLID_L = 0.93;
// High enough that dark text reaches 4.5:1 on the lifted solid even for saturated hues.
const DARK_SOLID_FLOOR = 0.72;

export function solidLightness(seed: ColorValue, scheme: "light" | "dark"): number {
  if (scheme === "light") return seed.l;
  return seed.l < DARK_SEED_LIMIT ? FLIPPED_SOLID_L : Math.max(seed.l, DARK_SOLID_FLOOR);
}

function scaleStep(seed: ColorValue, index: number, scheme: "light" | "dark", vibrancy = 1, contrast = 1): ColorValue {
  const L = scheme === "light" ? LIGHT_L : DARK_L;
  const C = scheme === "light" ? LIGHT_C : DARK_C;
  const solid = solidLightness(seed, scheme);
  const hover = solid + (solid > 0.6 ? SOLID_HOVER_SHIFT : -SOLID_HOVER_SHIFT);
  const fixed = L[index];
  const background = L[0];
  const spread = fixed === null || fixed === undefined ? undefined : background + (fixed - background) * contrast;
  const lightness = spread === undefined ? (index === 9 ? hover : solid) : Math.min(1, Math.max(0, spread));
  const chroma = seed.c * (C[index] ?? 1) * vibrancy;
  return clampToSrgb(oklch(lightness, chroma, seed.h));
}

function generateSpacing(g: z.infer<typeof SpacingGenerator>): TokenGroup {
  const out: TokenGroup = {};
  const compact = ModeSelector.parse({ density: "compact" });
  const comfortable = ModeSelector.parse({ density: "comfortable" });
  g.multipliers.forEach((m, i) => {
    const px = g.base * m;
    out[String(i + 1)] = {
      $type: "dimension",
      $value: rem(px),
      $modes: [
        { selector: compact, value: rem(Math.round(px * g.density.compact)) },
        { selector: comfortable, value: rem(Math.round(px * g.density.comfortable)) },
      ],
    };
  });
  return out;
}

function generateRadiusScale(g: z.infer<typeof RadiusScaleGenerator>): TokenGroup {
  const out: TokenGroup = {};
  for (const [name, ratio] of Object.entries(RADIUS_STEPS)) {
    out[name] = { $type: "dimension", $value: ratio === "full" ? { value: 9999, unit: "px" } : rem(Math.round(g.base * ratio)) };
  }
  return out;
}

function generateTypeScale(g: z.infer<typeof TypeScaleGenerator>): TokenGroup {
  const size: TokenGroup = {};
  const leading: TokenGroup = {};
  const total = g.stepsBelow + g.stepsAbove + 1;
  for (let step = 1; step <= total; step++) {
    const exponent = step - 1 - g.stepsBelow;
    const sizePx = Math.max(1, Math.round(g.base * g.ratio ** exponent));
    const t = exponent <= 0 || g.stepsAbove === 0 ? 0 : exponent / g.stepsAbove;
    const target = g.leading.text + (g.leading.display - g.leading.text) * t;
    const leadingPx = Math.max(sizePx, snapTo(sizePx * target, 4));
    size[String(step)] = { $type: "dimension", $value: rem(sizePx) };
    leading[String(step)] = { $type: "number", $value: round(leadingPx / sizePx) };
  }
  return { size, leading };
}

function generateColorScale(g: z.infer<typeof ColorScaleGenerator>): TokenGroup {
  const out: TokenGroup = {};
  const dark = ModeSelector.parse({ colorScheme: "dark" });
  keptSteps(g.steps).forEach((canonical, i) => {
    out[String(i + 1)] = {
      $type: "color",
      $value: scaleStep(g.seed, canonical - 1, "light", g.vibrancy, g.contrast),
      $modes: [{ selector: dark, value: scaleStep(g.seed, canonical - 1, "dark", g.vibrancy, g.contrast) }],
    };
  });
  return out;
}

export function generate(generator: Generator): TokenGroup {
  switch (generator.kind) {
    case "spacing":
      return generateSpacing(generator);
    case "radiusScale":
      return generateRadiusScale(generator);
    case "typeScale":
      return generateTypeScale(generator);
    case "colorScale":
      return generateColorScale(generator);
  }
}

export type ApplyResult = { written: string[]; pinned: string[] };

// Writes a generated token unless the user has pinned that path, and records what produced it.
export function writeGenerated(group: TokenGroup, path: string, token: Token, by: string, step: string): boolean {
  const existing = getToken(group, path);
  if (existing?.$meta?.pinned) return false;
  const stamped: Token = { ...token, $meta: { ...existing?.$meta, generated: { by, step } } };
  // Leaving an identical token untouched keeps regeneration a no-op for unchanged values. Compared
  // field by field, stopping at the first difference: this runs for every generated token on every
  // edit (each slider tick), and turning both into JSON each time was a real share of a tick.
  if (existing !== undefined && jsonEqual(existing, stamped)) return true;
  setToken(group, path, stamped);
  return true;
}

// Writes generated tokens under `targetPath`, skipping steps the user has pinned.
export function applyGenerator(
  group: TokenGroup,
  targetPath: string,
  id: string,
  generator: Generator,
): ApplyResult {
  const result: ApplyResult = { written: [], pinned: [] };
  const produced = new Set<string>();
  for (const [step, token] of flattenTokens(generate(generator))) {
    const path = `${targetPath}.${step}`;
    produced.add(path);
    (writeGenerated(group, path, token, id, step) ? result.written : result.pinned).push(path);
  }
  // Steps this generator made before but no longer makes (a palette went from 12 steps to 6) go,
  // pinned or not: a step that no longer exists cannot keep an override.
  const target = getToken(group, targetPath) === undefined ? pathGroup(group, targetPath) : undefined;
  for (const [step, token] of flattenTokens(target ?? {})) {
    const path = `${targetPath}.${step}`;
    if (!produced.has(path) && token.$meta?.generated?.by === id) deleteToken(group, path);
  }
  return result;
}

function pathGroup(group: TokenGroup, path: string): TokenGroup | undefined {
  let node: TokenGroup | Token | undefined = group;
  for (const segment of path.split(".")) {
    if (node === undefined || isToken(node)) return undefined;
    node = node[segment];
  }
  return node === undefined || isToken(node) ? undefined : node;
}
