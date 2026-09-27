import { converter } from "culori";
import { contrastRatio, toCulori } from "./color";
import { enabledSelections, resolveRecipeCached, type Anatomy, type Selection, type StyleProps } from "./components";
import { DEFAULT_MODE, type ModeContext } from "./modes";
import { resolveToken, TokenResolveError } from "./resolve";
import { isTokenRef, refPath, toRef, type ColorValue, type Token } from "./tokens";

export const WCAG_TEXT = 4.5;
export const WCAG_NON_TEXT = 3;

export type PairKind = "text" | "non-text";

export type ContrastCheck = {
  component: string;
  part: string;
  state: string | undefined;
  selection: Selection;
  colorScheme: ModeContext["colorScheme"];
  kind: PairKind;
  // The recipe references and the concrete colors they resolved to.
  foregroundRef: string;
  backgroundRef: string;
  foreground: ColorValue;
  background: ColorValue;
  ratio: number;
  required: number;
  apca: number;
  passes: boolean;
  // Disabled states are exempt under WCAG but still reported.
  exempt: boolean;
  // The token to change and the reference to give it. Only proposed when applying it makes this
  // pair pass without making any other pair fail.
  fix: { token: string; value: string } | undefined;
};

const toRgb = converter("rgb");

// APCA (SAPC-4g, 0.1.9) lightness contrast in Lc. Sign follows polarity; callers use the magnitude.
export function apcaContrast(text: ColorValue, background: ColorValue): number {
  const luminance = (c: ColorValue): number => {
    const rgb = toRgb(toCulori(c));
    if (rgb === undefined) return 0;
    const lin = (v: number) => Math.pow(Math.min(1, Math.max(0, v)), 2.4);
    return 0.2126729 * lin(rgb.r) + 0.7151522 * lin(rgb.g) + 0.072175 * lin(rgb.b);
  };
  const clamp = (y: number) => (y > 0.022 ? y : y + Math.pow(0.022 - y, 1.414));
  const yText = clamp(luminance(text));
  const yBg = clamp(luminance(background));
  if (Math.abs(yBg - yText) < 0.0005) return 0;
  let contrast: number;
  if (yBg > yText) {
    contrast = (Math.pow(yBg, 0.56) - Math.pow(yText, 0.57)) * 1.14;
    contrast = contrast < 0.1 ? 0 : contrast - 0.027;
  } else {
    contrast = (Math.pow(yBg, 0.65) - Math.pow(yText, 0.62)) * 1.14;
    contrast = contrast > -0.1 ? 0 : contrast + 0.027;
  }
  return Math.round(contrast * 1000) / 10;
}

type Tokens = ReadonlyMap<string, Token>;

function colorOf(tokens: Tokens, ref: string, context: ModeContext): ColorValue | undefined {
  if (!isTokenRef(ref)) return undefined;
  try {
    return resolveToken(tokens, refPath(ref), context, "color").$value;
  } catch (e) {
    if (e instanceof TokenResolveError) return undefined;
    throw e;
  }
}

// Which scale step a reference chain ends in, and the token that points at it (the natural fix site).
function lastLink(tokens: Tokens, ref: string, context: ModeContext): { token: string; scale: string; step: number } | undefined {
  if (!isTokenRef(ref)) return undefined;
  const resolved = resolveToken(tokens, refPath(ref), context);
  const chain = [resolved.path, ...resolved.via];
  const last = chain.at(-1);
  const before = chain.at(-2);
  if (last === undefined || before === undefined) return undefined;
  const m = /^(.+)\.(\d+)$/.exec(last);
  const scale = m?.[1];
  const step = m?.[2];
  if (scale === undefined || step === undefined) return undefined;
  return { token: before, scale, step: Number(step) };
}

// A control border carries the fill it sits on (fill), so a border on a fill that already stands
// out from the surface isn't held to 3:1: the fill identifies the control.
type Pair = { kind: PairKind; foregroundRef: string; backgroundRef: string; fill?: string };

// Borders that identify a control (WCAG 1.4.11) and must reach 3:1. Card, table, popup and
// separator borders are decorative and are not held to it.
const CONTROL_BORDERS: Record<string, readonly string[]> = {
  input: ["root"],
  select: ["trigger"],
  checkbox: ["root"],
  button: ["root"],
  textarea: ["root"],
  "native-select": ["select"],
  "radio-group": ["item"],
  "input-otp": ["slot"],
  "input-group": ["root"],
  combobox: ["field"],
  slider: ["thumb"],
  switch: ["root"],
};

// Fills that identify a control on their own (the off track of a switch) must
// reach 3:1 against the surface too.
const CONTROL_FILLS: Record<string, readonly string[]> = { switch: ["root"] };

// The color pairs a styled part produces: its text on its fill, a control border and the focus
// ring against the surface behind the part.
function pairsOf(props: StyleProps, fallbackBackground: string, component: string, part: string, state: string | undefined): Pair[] {
  const background = props.background ?? fallbackBackground;
  const pairs: Pair[] = [];
  if (props.foreground !== undefined) {
    pairs.push({ kind: part === "icon" || part === "indicator" ? "non-text" : "text", foregroundRef: props.foreground, backgroundRef: background });
  }
  if (props.border !== undefined && (CONTROL_BORDERS[component] ?? []).includes(part)) {
    pairs.push({ kind: "non-text", foregroundRef: props.border, backgroundRef: fallbackBackground, ...(props.background === undefined ? {} : { fill: props.background }) });
  }
  // A fill only has to carry the contrast when no control border already does.
  const bordered = props.border !== undefined && (CONTROL_BORDERS[component] ?? []).includes(part);
  if (props.background !== undefined && !bordered && (CONTROL_FILLS[component] ?? []).includes(part)) {
    pairs.push({ kind: "non-text", foregroundRef: props.background, backgroundRef: fallbackBackground });
  }
  // A focus ring must stand out from the surface; a ring outside focus (an avatar badge's gap
  // against the page) is decoration.
  if (props.ring !== undefined && state === "focus-visible") pairs.push({ kind: "non-text", foregroundRef: props.ring, backgroundRef: fallbackBackground });
  return pairs;
}

const REQUIRED: Record<PairKind, number> = { text: WCAG_TEXT, "non-text": WCAG_NON_TEXT };

function keyOf(check: ContrastCheck): string {
  return [check.component, check.part, check.state ?? "", JSON.stringify(check.selection), check.kind, check.colorScheme, check.foregroundRef, check.backgroundRef].join("|");
}

// Every pair, without fix proposals.
function evaluate(anatomies: Record<string, Anatomy>, tokens: Tokens, pageSurface: string): ContrastCheck[] {
  const out: ContrastCheck[] = [];
  const seen = new Set<string>();
  // The same references recur across combinations: each is resolved once per scheme.
  const colors = new Map<string, ColorValue | undefined>();
  const color = (ref: string, context: ModeContext) => {
    const key = `${context.colorScheme}|${ref}`;
    if (!colors.has(key)) colors.set(key, colorOf(tokens, ref, context));
    return colors.get(key);
  };
  const contexts = { light: { ...DEFAULT_MODE, colorScheme: "light" }, dark: { ...DEFAULT_MODE, colorScheme: "dark" } } as const satisfies Record<string, ModeContext>;
  for (const anatomy of Object.values(anatomies)) {
    for (const selection of enabledSelections(anatomy)) {
      // Shared and read-only; the same for every fix candidate tried below.
      const recipe = resolveRecipeCached(anatomy, selection);
      const rootBackground = recipe["root"]?.base.background ?? recipe["popup"]?.base.background ?? pageSurface;
      for (const [part, style] of Object.entries(recipe)) {
        const surface = part === "root" || part === "popup" ? pageSurface : rootBackground;
        const layers: [string | undefined, StyleProps][] = [[undefined, style.base]];
        for (const [state, props] of Object.entries(style.states)) {
          if (props !== undefined) layers.push([state, { ...style.base, ...props }]);
        }
        for (const [state, props] of layers) {
          for (const pair of pairsOf(props, surface, anatomy.name, part, state)) {
            for (const colorScheme of ["light", "dark"] as const) {
              const context = contexts[colorScheme];
              const foreground = color(pair.foregroundRef, context);
              const background = color(pair.backgroundRef, context);
              if (foreground === undefined || background === undefined) continue;
              // A border on a fill that reaches 3:1 on its own (Ferrowen's black edge on an orange
              // button, on a black page in dark) identifies nothing the fill doesn't.
              const fill = pair.fill === undefined ? undefined : color(pair.fill, context);
              if (fill !== undefined && (fill.alpha ?? 1) > 0.95 && contrastRatio(fill, background) >= WCAG_NON_TEXT) continue;
              // Many combinations share the same concrete pair; report each pair of colors once per scheme.
              const dedupe = `${anatomy.name}|${part}|${state ?? ""}|${pair.kind}|${colorScheme}|${JSON.stringify([foreground, background])}`;
              if (seen.has(dedupe)) continue;
              seen.add(dedupe);
              const ratio = contrastRatio(foreground, background);
              const required = REQUIRED[pair.kind];
              out.push({
                component: anatomy.name,
                part,
                state,
                selection,
                colorScheme,
                kind: pair.kind,
                foregroundRef: pair.foregroundRef,
                backgroundRef: pair.backgroundRef,
                foreground,
                background,
                ratio,
                required,
                apca: Math.abs(apcaContrast(foreground, background)),
                passes: ratio >= required,
                exempt: state === "disabled",
                fix: undefined,
              });
            }
          }
        }
      }
    }
  }
  return out;
}

function failingKeys(checks: ContrastCheck[]): Set<string> {
  return new Set(checks.filter((c) => !c.passes && !c.exempt).map(keyOf));
}

// Tries nearby steps of the failing pair's scale, applied to the token that points at the scale.
// A candidate must fix every failing pair that reads this token (both schemes) without any pair
// that passed before failing after; if no step manages all of them, one that fixes this pair alone.
function proposeFix(
  anatomies: Record<string, Anatomy>,
  tokens: Tokens,
  pageSurface: string,
  check: ContrastCheck,
  baseline: Set<string>,
  siblings: Set<string>,
): ContrastCheck["fix"] {
  const context: ModeContext = { ...DEFAULT_MODE, colorScheme: check.colorScheme };
  const target = keyOf(check);
  let fallback: ContrastCheck["fix"];
  // The text (or border) first; when no step of its scale fixes the pair cleanly, the fill it sits
  // on (a solid a step too light for its text: success at 4.3:1 moves a step darker).
  for (const ref of [check.foregroundRef, check.backgroundRef]) {
    const link = lastLink(tokens, ref, context);
    const source = link === undefined ? undefined : tokens.get(link.token);
    if (link === undefined || source === undefined) continue;
    // However many steps this palette has.
    let size = 0;
    while (tokens.has(`${link.scale}.${size + 1}`)) size++;
    // A hover or pressed fill stays beside its fill on the same scale, a step darker or lighter
    // first and its fill's own color last: a pale hover on a dark button reads as another button,
    // and one the same as its fill isn't a hover.
    const fill = /-(hover|active)$/.test(link.token) ? lastLink(tokens, `{${link.token.replace(/-(hover|active)$/, "")}}`, context) : undefined;
    const order =
      fill !== undefined && fill.scale === link.scale
        ? [fill.step + 1, fill.step - 1, fill.step + 2, fill.step - 2, fill.step]
        : Array.from({ length: size - 1 }, (_, i) => [link.step + i + 1, link.step - i - 1]).flat();
    for (const n of order) {
      if (n < 1 || n > size || n === link.step) continue;
      const value = toRef(`${link.scale}.${n}`);
      const trial: Map<string, Token> = new Map(tokens);
      const { $modes: _modes, ...rest } = source;
      trial.set(link.token, { ...rest, $value: value });
      const after = failingKeys(evaluate(anatomies, trial, pageSurface));
      if (after.has(target)) continue;
      if ([...after].some((k) => !baseline.has(k))) continue;
      if (![...siblings].some((k) => after.has(k))) return { token: link.token, value };
      fallback ??= { token: link.token, value };
    }
  }
  return fallback;
}

// `fixes: false` skips looking for a fix to each failure, which re-checks everything once per
// candidate step: for counting what fails (a review of a change) it's most of the time taken.
export function checkContrast(anatomies: Record<string, Anatomy>, tokens: Tokens, pageSurface = "{surface.page}", options: { fixes?: boolean } = {}): ContrastCheck[] {
  const checks = evaluate(anatomies, tokens, pageSurface);
  if (options.fixes === false) return checks;
  const baseline = failingKeys(checks);
  const proposals = new Map<string, ContrastCheck["fix"]>();
  for (const check of checks) {
    if (check.passes || check.exempt) continue;
    if (!proposals.has(check.foregroundRef)) {
      const siblings = new Set(checks.filter((c) => !c.passes && !c.exempt && c.foregroundRef === check.foregroundRef).map(keyOf));
      proposals.set(check.foregroundRef, proposeFix(anatomies, tokens, pageSurface, check, baseline, siblings));
    }
    check.fix = proposals.get(check.foregroundRef);
  }
  return checks;
}

export type ContrastSummary = { checked: number; failing: number; exemptFailing: number };

export function summarizeContrast(checks: ContrastCheck[]): ContrastSummary {
  return {
    checked: checks.length,
    failing: checks.filter((c) => !c.passes && !c.exempt).length,
    exemptFailing: checks.filter((c) => !c.passes && c.exempt).length,
  };
}
