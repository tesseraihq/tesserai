import { z } from "zod";
import { DEFAULT_ANATOMIES } from "./anatomies";
import { oklch } from "./color";
import { Anatomy, recipeProblems, type ComponentState, type Recipe } from "./components";
import { DEFAULT_RADIUS, DEFAULT_SPACING, DEFAULT_TYPE_SCALE, Generator, applyGenerator, writeGenerated } from "./generators";
import { IntentDef, applyIntent, applySurfaces, type ForegroundChoice } from "./intents";
import { TokenGroup,
  TokenPath, flattenTokens, getToken, setToken, toRef, type ColorValue } from "./tokens";
import { DEFAULT_STEPS } from "./palette";
import { SavedPage } from "./pages";
import { IconSettings } from "./icons";
import { CustomFont } from "./fonts";
import { px, rem } from "./units";

export const SYSTEM_FORMAT = "tesserai/design-system@0";

export const BASES = ["base-ui", "radix", "react-aria"] as const;
export const Base = z.enum(BASES);
export type Base = z.infer<typeof Base>;

// The framework the team's apps are written in: what the docs, code tabs, page code and the AI's
// code are shown in. Installs follow the project they run in, so this is a default, never a
// rewrite. Vue is built on Reka UI and Svelte on Bits UI; `base` stays the React library, which
// the (React) preview draws with. See docs/frameworks.
export const FRAMEWORKS = ["react", "vue", "svelte"] as const;
export const Framework = z.enum(FRAMEWORKS);
export type Framework = z.infer<typeof Framework>;
// How each framework is offered: its name, the library its components are built on, and whether
// tesserai writes it yet. "soon" keeps it out of every choice people see; "beta" shows it, marked.
export const FRAMEWORK_INFO: Record<Framework, { label: string; library: string; status: "ready" | "beta" | "soon" }> = {
  react: { label: "React", library: "your choice of Base UI, Radix or React Aria", status: "ready" },
  vue: { label: "Vue", library: "Reka UI, the library shadcn-vue uses", status: "ready" },
  svelte: { label: "Svelte", library: "Bits UI, the library shadcn-svelte uses", status: "ready" },
};
export const offeredFrameworks = (): Framework[] => FRAMEWORKS.filter((f) => FRAMEWORK_INFO[f].status !== "soon");
export const frameworkOf = (system: { framework?: Framework | undefined }): Framework => system.framework ?? "react";
// The React library the preview draws a system with: its own for React, Radix for Vue and Svelte,
// whose state attributes Reka UI and Bits UI share, so the preview shows what they'll render.
export const previewBase = (system: { base: Base; framework?: Framework | undefined }): Base =>
  frameworkOf(system) === "react" ? system.base : "radix";

// A brand: a name and the operations that make it differ from the shared system (its colors,
// fonts, corners). Kept as operations, the words the builder, the AI and the command line share.
export const BrandId = z.string().regex(/^[a-z][a-z0-9-]{0,31}$/, "a brand id is lowercase letters, digits and dashes").refine((id) => id !== "default", "“default” is the shared system itself");
export const Brand = z
  .object({
    name: z.string().trim().min(1).max(40),
    ops: z.array(z.object({ op: z.string().min(1), input: z.unknown() }).strict()).max(40),
  })
  .strict();
export type Brand = z.infer<typeof Brand>;

export const DesignSystem = z
  .object({
    format: z.literal(SYSTEM_FORMAT),
    name: z.string().min(1),
    // The primitive library the generated components are built on. Bundles saved before this
    // field existed default to Base UI, which they were built for.
    base: Base.default("base-ui"),
    // Absent means React, and it's only written when it isn't, so older bundles stay as they were.
    framework: Framework.optional(),
    tokens: TokenGroup,
    // Generators run in insertion order, then intents, surfaces and component tokens; all write into `tokens`.
    generators: z.record(z.string(), z.object({ target: TokenPath, config: Generator }).strict()),
    intents: z.record(z.string(), IntentDef),
    components: z.record(z.string(), Anatomy),
    // Components left out of this system. Their recipes are kept, so switching one back on gives
    // back what it had; everything generated from the system behaves as if they did not exist.
    excluded: z.array(z.string().min(1)).default([]),
    // Pages built from the system's components, by id (see pages.ts).
    pages: z.record(z.string(), SavedPage).optional(),
    // The icon library, weight, spots and the system's own icons (see icons.ts). Absent: Lucide.
    icons: IconSettings.optional(),
    // The system's own font files, by family (see fonts.ts).
    fonts: z.record(z.string().min(1).max(60), CustomFont).optional(),
    // Other brands built from the same system: the same components, some values changed (see
    // ops/brands.ts). Keys are the ids used in `data-brand`.
    brands: z.record(BrandId, Brand).optional(),
    // The team's Tailwind class prefix (acme → acme:bg-primary), for the code people take away:
    // installs, downloads, the code shown. The preview doesn't use it; a project's own stylesheet
    // wins over it (see tailwind-prefix.ts).
    tailwindPrefix: z.string().regex(/^[a-z]{1,16}$/).optional(),
    // Guideline conventions the team keeps its own way on purpose ("our buttons are 32px on
    // touch"), by rule (see guidelines/review.ts): checks and reviews leave them be, and the AI is
    // told. Standards can't be kept aside.
    kept: z.array(z.object({ rule: z.string().min(1).max(40), note: z.string().max(200).optional() }).strict()).max(40).optional(),
  })
  .strict();
export type DesignSystem = z.infer<typeof DesignSystem>;

export type RegenerateResult = { pinned: string[]; foregrounds: Record<string, ForegroundChoice> };

export type RegenerateOptions = {
  // A component whose tokens are known to be in step with its anatomy already (the caller has
  // checked neither changed since they last were): its rewrite is skipped, and its pinned tokens
  // are left out of the result. A slider tick changes a generator, not ~90 components, and
  // rewriting all of them was most of the tick. Never skipped under a generator's target.
  skipComponent?: (name: string) => boolean;
};

// Rewrites every generated token from its source, keeping pinned tokens. Mutates `system.tokens`.
export function regenerate(system: DesignSystem, options: RegenerateOptions = {}): RegenerateResult {
  ensureDefaults(system);
  const pinned: string[] = [];
  for (const [id, { target, config }] of Object.entries(system.generators)) {
    pinned.push(...applyGenerator(system.tokens, target, id, config).pinned);
  }
  const foregrounds: Record<string, ForegroundChoice> = {};
  const stepsOf = paletteSizes(system);
  // Flattened once for every intent, after the palettes they read are written.
  const flat = flattenTokens(system.tokens);
  for (const [name, def] of Object.entries(system.intents)) {
    const result = applyIntent(system.tokens, name, def, stepsOf, flat);
    // Later palettes may alias this intent. Keep the shared map current without flattening the
    // whole system again; pinned entries already contain the value that was preserved.
    for (const path of result.written) flat.set(path, getToken(system.tokens, path)!);
    foregrounds[name] = result.foreground;
    pinned.push(...result.pinned);
  }
  const neutral = system.intents["neutral"];
  if (neutral !== undefined) pinned.push(...applySurfaces(system.tokens, neutral.scale, stepsOf(neutral.scale)).pinned);
  const targets = options.skipComponent === undefined ? [] : Object.values(system.generators).map((g) => g.target);
  for (const [name, anatomy] of Object.entries(system.components)) {
    if (options.skipComponent?.(name) && !targets.some((t) => t === name || t.startsWith(`${name}.`))) continue;
    for (const [step, token] of flattenTokens(anatomy.tokens)) {
      const path = `${name}.${step}`;
      if (!writeGenerated(system.tokens, path, token, `component:${name}`, step)) pinned.push(path);
    }
  }
  return { pinned, foregrounds };
}

// Tokens later versions rely on, added to systems saved before they existed. A group is only added
// when it is missing entirely, so tokens someone deleted on purpose stay deleted. Idempotent.
function ensureDefaults(system: DesignSystem): void {
  if (getToken(system.tokens, "font.family.heading") === undefined && getToken(system.tokens, "font.family.sans") !== undefined) {
    setToken(system.tokens, "font.family.heading", { $type: "fontFamily", $value: toRef("font.family.sans") });
  }
  const existing = [...flattenTokens(system.tokens).keys()];
  const defaults = flattenTokens(staticTokens());
  for (const group of ["font.tracking", "blur", "control", "menu"]) {
    if (existing.some((p) => p.startsWith(`${group}.`))) continue;
    for (const [p, token] of defaults) if (p.startsWith(`${group}.`)) setToken(system.tokens, p, token);
  }
  // Tokens added to a group that older saves already have. Components' own tokens read them, so
  // they come back even if deleted: without them those components wouldn't resolve.
  for (const p of ["menu.item.highlight", "menu.destructive.highlight"]) {
    if (getToken(system.tokens, p) === undefined) setToken(system.tokens, p, defaults.get(p)!);
  }
}

export function isIncluded(system: DesignSystem, component: string): boolean {
  return component in system.components && !system.excluded.includes(component);
}

// The components that are part of the system, by name, in its order.
export function includedComponents(system: DesignSystem): Record<string, Anatomy> {
  return Object.fromEntries(Object.entries(system.components).filter(([name]) => !system.excluded.includes(name)));
}

// The token tree as it should be emitted: without the tokens of left-out components.
export function outputTokens(system: DesignSystem): TokenGroup {
  if (system.excluded.length === 0) return system.tokens;
  return Object.fromEntries(Object.entries(system.tokens).filter(([name]) => !system.excluded.includes(name)));
}

// Adds components this version ships that a saved system predates, switched off so nothing grows
// without asking. Returns their names, for a "new components available" note. Mutates the system.
export function addMissingComponents(system: DesignSystem): string[] {
  const added: string[] = [];
  for (const [name, anatomy] of Object.entries(DEFAULT_ANATOMIES)) {
    if (name in system.components) continue;
    system.components[name] = fresh(Anatomy, anatomy);
    if (!system.excluded.includes(name)) system.excluded.push(name);
    added.push(name);
  }
  return added;
}

// Default styles this version changed because the old one was wrong. A saved component whose style
// is still the old default gets this version's (its base recipe's), so the fix reaches systems saved
// before it; a style someone set to anything else is theirs and stays. Saves carry no version, so
// the old value set again later is moved again: it drew the same in light mode and nothing in dark.
type RetiredStyle = { components: string[]; styles: [part: string, state: ComponentState][]; property: "background"; was: string; change: string };
const RETIRED_STYLES: RetiredStyle[] = [
  {
    // Popups sit on surface.raised, which in dark mode is the subtle fill's step: the highlighted
    // row was invisible there. Rows now read menu.item.highlight, a step up in dark mode.
    components: ["dropdown-menu", "context-menu", "menubar", "select", "combobox", "command"],
    styles: [
      ["item", "highlighted"],
      ["sub-trigger", "open"],
    ],
    property: "background",
    was: "{intent.neutral.subtle}",
    change: "highlighted rows show in dark mode",
  },
  {
    components: ["dropdown-menu", "context-menu", "menubar"],
    styles: [["destructive", "highlighted"]],
    property: "background",
    was: "{intent.danger.subtle}",
    change: "highlighted destructive rows show in dark mode",
  },
  {
    components: ["navigation-menu"],
    styles: [
      ["link", "hover"],
      ["link", "current"],
    ],
    property: "background",
    was: "{intent.neutral.subtle}",
    change: "highlighted links show in dark mode",
  },
];

// Brings components saved by an older tesserai up to what this version's templates expect: parts,
// states, component tokens and whole axes added since, each with its default styles. Only what's
// missing is added, so everything the person set stays as it is. Without it a template asks for a
// part the saved component doesn't have and generation fails. A component whose saved layout
// changed shape (a token that became a group, say) can't be patched piece by piece: if patching
// fails, or leaves styles pointing at values that don't exist, that component is reset to this
// version's and the change says so. Components the upgrade didn't touch, and problems a component
// already had, never cause a reset. Returns
// what changed. Mutates, and regenerates the tokens when anything changed.
export function upgradeComponents(system: DesignSystem): string[] {
  const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
  const changes: string[] = [];
  const touched = new Set<string>();
  // Problems a component already had (a reference someone left dangling, say) aren't the
  // upgrade's doing and never cause a reset; only new ones do.
  const tokensBefore = flattenTokens(system.tokens);
  const problemsBefore = new Map<string, Set<string>>();
  // Taken just before a component's first change (it's unchanged until then), so the usual open,
  // where nothing needs upgrading, checks no component at all.
  const before = (name: string) => {
    const anatomy = system.components[name];
    if (!problemsBefore.has(name) && anatomy !== undefined) problemsBefore.set(name, new Set(recipeProblems(anatomy, tokensBefore)));
  };
  const reset = (name: string, why: string) => {
    system.components[name] = fresh(Anatomy, DEFAULT_ANATOMIES[name]!);
    // Its token group is rewritten from the current defaults on regeneration.
    delete system.tokens[name];
    touched.delete(name);
    // A reset replaces whatever was added to it piece by piece.
    for (let i = changes.length - 1; i >= 0; i--) if (changes[i]!.startsWith(`${name}: `)) changes.splice(i, 1);
    changes.push(`${name}: reset to this version's (${why})`);
  };
  for (const [name, saved] of Object.entries(system.components)) {
    const current = DEFAULT_ANATOMIES[name];
    if (current === undefined) continue;
    try {
      const added = current.parts.filter((part) => !saved.parts.includes(part));
      if (added.length > 0) {
        before(name);
        // In the order this version lists them, with the saved ones where they were.
        saved.parts = [...saved.parts, ...added].sort((a, b) => {
          const ia = current.parts.indexOf(a);
          const ib = current.parts.indexOf(b);
          return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
        });
        const copyParts = (from: Recipe | undefined, to: Recipe) => {
          for (const part of added) if (from?.[part] !== undefined && to[part] === undefined) to[part] = clone(from[part]);
        };
        copyParts(current.base, saved.base);
        for (const [key, recipe] of Object.entries(saved.variants)) copyParts(current.variants[key], recipe);
        for (const [key, recipe] of Object.entries(saved.sizes)) copyParts(current.sizes[key], recipe);
        for (const [key, recipe] of Object.entries(saved.intents)) copyParts(current.intents[key], recipe);
        changes.push(`${name}: added ${added.join(", ")}`);
        touched.add(name);
      }
      for (const state of current.states) {
        if (saved.states.includes(state)) continue;
        before(name);
        saved.states.push(state);
        // A state is only as good as its styles: bring this version's, wherever the saved
        // component has none of its own for it.
        const copyState = (from: Recipe | undefined, to: Recipe) => {
          for (const [part, styles] of Object.entries(from ?? {})) {
            const value = styles?.states?.[state];
            const into = to[part];
            if (value === undefined || into === undefined || into.states?.[state] !== undefined) continue;
            into.states = { ...(into.states ?? {}), [state]: clone(value) };
          }
        };
        copyState(current.base, saved.base);
        for (const [key, recipe] of Object.entries(saved.variants)) copyState(current.variants[key], recipe);
        for (const [key, recipe] of Object.entries(saved.sizes)) copyState(current.sizes[key], recipe);
        for (const [key, recipe] of Object.entries(saved.intents)) copyState(current.intents[key], recipe);
        changes.push(`${name}: added the ${state} state`);
        touched.add(name);
      }
      for (const axis of ["variant", "size", "intent"] as const) {
        const axisNow = current.axes[axis];
        if (axisNow === undefined || saved.axes[axis] !== undefined) continue;
        before(name);
        saved.axes[axis] = clone(axisNow);
        const recipes = axis === "variant" ? ([current.variants, saved.variants] as const) : axis === "size" ? ([current.sizes, saved.sizes] as const) : ([current.intents, saved.intents] as const);
        for (const [key, recipe] of Object.entries(recipes[0])) if (recipes[1][key] === undefined) recipes[1][key] = clone(recipe);
        changes.push(`${name}: added ${axis}`);
        touched.add(name);
      }
      for (const [path, token] of flattenTokens(current.tokens)) {
        if (getToken(saved.tokens, path) !== undefined) continue;
        before(name);
        // Throws when a saved token sits where this version has a group.
        setToken(saved.tokens, path, clone(token));
        touched.add(name);
      }
      for (const retired of RETIRED_STYLES) {
        if (!retired.components.includes(name)) continue;
        let moved = false;
        for (const [part, state] of retired.styles) {
          const style = saved.base[part]?.states?.[state];
          const now = current.base[part]?.states?.[state]?.[retired.property];
          if (style === undefined || now === undefined || style[retired.property] !== retired.was) continue;
          before(name);
          style[retired.property] = now;
          moved = true;
        }
        if (moved) {
          changes.push(`${name}: ${retired.change}`);
          touched.add(name);
        }
      }
    } catch {
      reset(name, "its saved layout couldn't be upgraded");
    }
  }
  if (changes.length === 0 && touched.size === 0) return changes;
  try {
    regenerate(system);
  } catch {
    // A token written by an older version is in the way of one the upgrade needs: start the touched
    // components over from this version's.
    for (const name of [...touched]) reset(name, "its saved tokens couldn't be upgraded");
    regenerate(system);
  }
  // Every touched component must hold together: the upgrade may not leave a style pointing at a
  // value that doesn't exist.
  const tokens = flattenTokens(system.tokens);
  let again = false;
  for (const name of [...touched]) {
    const before = problemsBefore.get(name) ?? new Set<string>();
    if (recipeProblems(system.components[name]!, tokens).every((p) => before.has(p))) continue;
    reset(name, "its upgraded styles didn't resolve");
    again = true;
  }
  if (again) regenerate(system);
  return changes;
}

// How many steps each generated palette has, by its token path.
export function paletteSizes(system: DesignSystem): (scale: string) => number | undefined {
  const sizes = new Map<string, number | undefined>();
  for (const { target, config } of Object.values(system.generators)) {
    if (config.kind === "colorScale") sizes.set(target, config.steps);
  }
  return (scale) => sizes.get(scale);
}

const scale = (seed: ColorValue) => ({ kind: "colorScale" as const, seed, steps: DEFAULT_STEPS });

// Everything not produced by a generator: the PRD's default values, all editable.
function staticTokens(): TokenGroup {
  const shadowColor = (alpha: number) => oklch(0.2, 0.02, 260, alpha);
  const layer = (y: number, blur: number, spread: number, alpha: number) => ({
    offsetX: px(0),
    offsetY: px(y),
    blur: px(blur),
    spread: px(spread),
    color: shadowColor(alpha),
  });
  return {
    border: {
      width: { $type: "dimension", $value: px(1) },
    },
    opacity: {
      disabled: { $type: "number", $value: 0.5 },
    },
    font: {
      family: {
        sans: { $type: "fontFamily", $value: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"] },
        mono: { $type: "fontFamily", $value: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"] },
      },
      // In rem rather than em so DTCG export stays within the spec.
      tracking: {
        tighter: { $type: "dimension", $value: { value: -0.05, unit: "rem" } },
        tight: { $type: "dimension", $value: { value: -0.025, unit: "rem" } },
        normal: { $type: "dimension", $value: px(0) },
        wide: { $type: "dimension", $value: { value: 0.025, unit: "rem" } },
        wider: { $type: "dimension", $value: { value: 0.05, unit: "rem" } },
        widest: { $type: "dimension", $value: { value: 0.1, unit: "rem" } },
      },
      weight: {
        regular: { $type: "fontWeight", $value: 400 },
        medium: { $type: "fontWeight", $value: 500 },
        semibold: { $type: "fontWeight", $value: 600 },
        bold: { $type: "fontWeight", $value: 700 },
      },
    },
    shadow: {
      sm: { $type: "shadow", $value: [layer(1, 2, 0, 0.08)] },
      md: { $type: "shadow", $value: [layer(2, 4, -1, 0.08), layer(4, 8, -2, 0.08)] },
      lg: { $type: "shadow", $value: [layer(4, 8, -2, 0.1), layer(10, 24, -4, 0.12)] },
    },
    motion: {
      duration: {
        fast: { $type: "duration", $value: { value: 100, unit: "ms" } },
        base: { $type: "duration", $value: { value: 200, unit: "ms" } },
        slow: { $type: "duration", $value: { value: 320, unit: "ms" } },
      },
      easing: {
        standard: { $type: "cubicBezier", $value: [0.2, 0, 0, 1] },
        enter: { $type: "cubicBezier", $value: [0, 0, 0.2, 1] },
        exit: { $type: "cubicBezier", $value: [0.4, 0, 1, 1] },
      },
    },
    breakpoint: {
      sm: { $type: "dimension", $value: px(640) },
      md: { $type: "dimension", $value: px(768) },
      lg: { $type: "dimension", $value: px(1024) },
      xl: { $type: "dimension", $value: px(1280) },
      "2xl": { $type: "dimension", $value: px(1536) },
    },
    // What every form control shares (input, select, textarea, native select, input group, OTP
    // slots), so "rounder fields" is one change. Components reference these, never each other.
    control: {
      height: {
        sm: { $type: "dimension", $value: rem(32) },
        md: { $type: "dimension", $value: rem(36) },
        lg: { $type: "dimension", $value: rem(40) },
      },
      radius: { $type: "dimension", $value: toRef("radius.md") },
      "padding-x": { $type: "dimension", $value: toRef("space.4") },
      "font-size": { $type: "dimension", $value: toRef("font.size.2") },
    },
    // What every menu-like list shares (dropdown and context menus, menubar, select, combobox,
    // command; navigation menu links take the highlight): the floating panel and the rows in it.
    menu: {
      popup: {
        padding: { $type: "dimension", $value: toRef("space.2") },
        radius: { $type: "dimension", $value: toRef("radius.lg") },
      },
      item: {
        height: { $type: "dimension", $value: rem(32) },
        "padding-x": { $type: "dimension", $value: toRef("space.3") },
        radius: { $type: "dimension", $value: toRef("radius.sm") },
        "font-size": { $type: "dimension", $value: toRef("font.size.2") },
        // The row the keyboard or pointer is on. Popups sit on surface.raised, which in dark mode
        // is the subtle fill's own step, so there the highlight goes one step up.
        highlight: {
          $type: "color",
          $value: toRef("intent.neutral.subtle"),
          $modes: [{ selector: { colorScheme: "dark" }, value: toRef("intent.neutral.subtle-hover") }],
        },
      },
      // A destructive row (Delete) highlighted, likewise a step up in dark mode.
      destructive: {
        highlight: {
          $type: "color",
          $value: toRef("intent.danger.subtle"),
          $modes: [{ selector: { colorScheme: "dark" }, value: toRef("intent.danger.subtle-hover") }],
        },
      },
    },
    blur: {
      sm: { $type: "dimension", $value: px(4) },
      md: { $type: "dimension", $value: px(8) },
      lg: { $type: "dimension", $value: px(16) },
    },
    focus: {
      width: { $type: "dimension", $value: px(2) },
      offset: { $type: "dimension", $value: px(2) },
    },
  };
}

// Parsing through the schema yields a fresh deep copy, so no two systems share the module constants
// (a shared object frozen by one system's editor would break the next system built from it).
const fresh = <T>(schema: z.ZodType<T>, value: T): T => schema.parse(value);

// The palettes every system starts with for its meanings, at fixed hues so good and bad news
// read the same whatever the brand.
export const STOCK_MEANINGS = {
  danger: { palette: "red", seed: oklch(0.55, 0.19, 27) },
  warning: { palette: "amber", seed: oklch(0.78, 0.16, 75) },
  success: { palette: "green", seed: oklch(0.52, 0.15, 150) },
  info: { palette: "blue", seed: oklch(0.55, 0.15, 240) },
} as const;

// A complete starting system from one brand color: neutral shares the brand hue at low chroma,
// the four semantic intents use fixed hues so meaning stays recognisable across brands.
export function createSystemFromBrand(name: string, brand: ColorValue): DesignSystem {
  const system: DesignSystem = {
    format: SYSTEM_FORMAT,
    name,
    base: "base-ui",
    tokens: staticTokens(),
    generators: {
      space: { target: "space", config: fresh(Generator, DEFAULT_SPACING) },
      radius: { target: "radius", config: fresh(Generator, DEFAULT_RADIUS) },
      type: { target: "font", config: fresh(Generator, DEFAULT_TYPE_SCALE) },
      brand: { target: "color.brand", config: scale(brand) },
      neutral: { target: "color.neutral", config: scale(oklch(0.55, 0.012, brand.h)) },
      red: { target: "color.red", config: scale(STOCK_MEANINGS.danger.seed) },
      amber: { target: "color.amber", config: scale(STOCK_MEANINGS.warning.seed) },
      green: { target: "color.green", config: scale(STOCK_MEANINGS.success.seed) },
      blue: { target: "color.blue", config: scale(STOCK_MEANINGS.info.seed) },
    },
    intents: {
      primary: { scale: "color.brand" },
      neutral: { scale: "color.neutral" },
      danger: { scale: "color.red", icon: "circle-alert" },
      warning: { scale: "color.amber", icon: "triangle-alert" },
      success: { scale: "color.green", icon: "circle-check" },
      info: { scale: "color.blue", icon: "info" },
    },
    components: Object.fromEntries(Object.entries(DEFAULT_ANATOMIES).map(([id, anatomy]) => [id, fresh(Anatomy, anatomy)])),
    excluded: [],
  };
  regenerate(system);
  return system;
}
