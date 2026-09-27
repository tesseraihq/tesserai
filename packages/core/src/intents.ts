import { z } from "zod";
import { contrastRatio, oklch } from "./color";
import { writeGenerated, type ApplyResult } from "./generators";
import { stepFor } from "./palette";
import { DEFAULT_MODE, ModeSelector } from "./modes";
import { resolveToken } from "./resolve";
import { flattenTokens, toRef, type ColorValue, type Token, type TokenGroup } from "./tokens";

// Which canonical step each role reads from; a palette with fewer steps maps each to its nearest
// kept step (see palette.ts). Foregrounds on solid are chosen by contrast, not by step.
export const INTENT_ROLES = {
  background: 1,
  subtle: 3,
  "subtle-hover": 4,
  border: 7,
  "border-strong": 8,
  // The text step: it reaches 3:1 against the page in both schemes for every hue, which the solid
  // step does not (a light solid on a light page, a dark solid on a dark page).
  "focus-ring": 11,
  solid: 9,
  "solid-hover": 10,
  text: 11,
  "subtle-foreground": 11,
  "text-strong": 12,
} as const;
export type IntentRole = keyof typeof INTENT_ROLES | "solid-foreground";

export const IntentDef = z
  .object({
    // Path of the 12-step color scale group this intent reads from, e.g. "color.blue".
    scale: z.string().min(1),
    // Icon name shown in alerts and toasts so meaning never relies on color alone.
    icon: z.string().regex(/^[A-Za-z0-9-]+$/, "an icon name").optional(),
  })
  .strict();
export type IntentDef = z.infer<typeof IntentDef>;

export const WHITE: ColorValue = oklch(1, 0, 0);
export const WCAG_AA_TEXT = 4.5;

export type ForegroundChoice = { color: ColorValue; contrast: number; passes: boolean };

// Picks the better of white and the scale's darkest step as text on the solid color.
export function chooseForeground(solid: ColorValue, darkest: ColorValue): ForegroundChoice {
  const white = contrastRatio(WHITE, solid);
  const dark = contrastRatio(darkest, solid);
  const best = white >= dark ? { color: WHITE, contrast: white } : { color: darkest, contrast: dark };
  return { ...best, passes: best.contrast >= WCAG_AA_TEXT };
}

export type ApplyIntentResult = ApplyResult & { foreground: ForegroundChoice };

// How many steps the palette at a path has; palettes not made by a generator are full 12-step ones.
export type StepsOf = (scale: string) => number | undefined;

// `flat` is the group flattened, when the caller already has it: an intent reads only its palette's
// steps, so every intent of one regeneration can share one flattening (each flattened the whole
// tree through immer's proxies, several times a slider tick).
export function applyIntent(group: TokenGroup, name: string, def: IntentDef, stepsOf: StepsOf = () => undefined, flat: Map<string, Token> = flattenTokens(group)): ApplyIntentResult {
  const steps = stepsOf(def.scale);
  const at = (canonical: number) => `${def.scale}.${stepFor(canonical, steps)}`;
  const dark = ModeSelector.parse({ colorScheme: "dark" });
  const darkContext = { ...DEFAULT_MODE, colorScheme: "dark" as const };
  // The darkest step in the light scheme is dark text in either scheme; step 12 flips in dark.
  const darkest = resolveToken(flat, at(12), DEFAULT_MODE, "color").$value;
  const foreground = chooseForeground(resolveToken(flat, at(9), DEFAULT_MODE, "color").$value, darkest);
  const darkForeground = chooseForeground(resolveToken(flat, at(9), darkContext, "color").$value, darkest);

  const result: ApplyIntentResult = { written: [], pinned: [], foreground };
  const write = (role: string, token: Token) => {
    const path = `intent.${name}.${role}`;
    (writeGenerated(group, path, token, `intent:${name}`, role) ? result.written : result.pinned).push(path);
  };

  for (const [role, step] of Object.entries(INTENT_ROLES)) {
    write(role, { $type: "color", $value: toRef(at(step)) });
  }
  // The solid step may differ between schemes (a dark brand flips to light in dark mode), so the
  // foreground is chosen per scheme and only carries a dark value when it differs.
  const same = JSON.stringify(foreground.color) === JSON.stringify(darkForeground.color);
  write("solid-foreground", {
    $type: "color",
    $value: foreground.color,
    ...(same ? {} : { $modes: [{ selector: dark, value: darkForeground.color }] }),
  });
  return result;
}

// Layered surfaces read from the neutral scale. In dark mode higher layers get lighter instead of
// relying on shadows, which barely show on dark backgrounds.
export const SURFACES = {
  page: { light: 1, dark: 1 },
  card: { light: 1, dark: 2 },
  raised: { light: 1, dark: 3 },
  overlay: { light: 1, dark: 3 },
} as const;

export function applySurfaces(group: TokenGroup, neutralScale: string, steps?: number): ApplyResult {
  const result: ApplyResult = { written: [], pinned: [] };
  const dark = ModeSelector.parse({ colorScheme: "dark" });
  const write = (name: string, token: Token) => {
    const path = `surface.${name}`;
    (writeGenerated(group, path, token, "surfaces", name) ? result.written : result.pinned).push(path);
  };
  for (const [name, layer] of Object.entries(SURFACES)) {
    write(name, {
      $type: "color",
      $value: toRef(`${neutralScale}.${stepFor(layer.light, steps)}`),
      $modes: [{ selector: dark, value: toRef(`${neutralScale}.${stepFor(layer.dark, steps)}`) }],
    });
  }
  write("backdrop", { $type: "color", $value: oklch(0, 0, 0, 0.5) });
  return result;
}
