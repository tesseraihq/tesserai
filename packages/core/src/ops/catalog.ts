import { z } from "zod";
import { parseColor } from "../color";
import { Recipe, type Anatomy, type Compound } from "../components";
import type { IntentDef } from "../intents";
import { CANONICAL_STEPS, MIN_STEPS, remapStep } from "../palette";
import { presetById, PRESETS } from "../presets";
import { BASES, BrandId, FRAMEWORKS, createSystemFromBrand, paletteSizes, type DesignSystem } from "../system";
import {
  ColorValue,
  deleteToken,
  flattenTokens,
  getToken,
  isTokenRef,
  setToken,
  Token,
  TOKEN_REF_PATTERN,
  toRef,
  type TokenGroup,
  type TokenType,
} from "../tokens";
import { defineOp, erase, OpError, type AnyOp } from "./define";
import { componentName, dependentsOf, requirementsOf } from "../component-groups";
import { KEEPABLE } from "../guidelines/keepable";
import { remapRefs } from "./refs";
import { applySetStyle, describeMode, describeScope, SetStyleInput, StyleMode } from "./style";
import { LITERAL_HINTS, parseLiteral } from "../literal";
import { prefixProblem } from "../tailwind-prefix";
import { MAX_PAGES, PageId, SavedPageSpec, type SavedPage } from "../pages";
import { CustomFont, FontFamilyName, withFallback } from "../fonts";
import { CustomIcon, DEFAULT_ICONS, ICON_LIBRARIES, ICON_WEIGHTS, IconRef, MAX_CUSTOM_ICONS, type IconSettings } from "../icons";

// ---------- shared input shapes ----------

const Name = z.string().regex(/^[a-z][a-z0-9-]*$/, "lowercase letters, digits and dashes, starting with a letter");
// A color as any CSS color string ("#7c3aed", "oklch(0.6 0.2 300)", "rgb(…)") or an OKLCH object.
const ColorInput = z.union([z.string().min(1), ColorValue]);
// A value that is either a reference to another token ("{color.brand.9}") or a color.
const ColorOrRef = z.union([z.string().regex(TOKEN_REF_PATTERN), ColorInput]);
const Scheme = z.enum(["light", "dark", "both"]);
const Axis = z.enum(["variant", "intent", "size"]);

function color(input: z.infer<typeof ColorInput>): ColorValue {
  if (typeof input !== "string") return input;
  const parsed = parseColor(input);
  if (parsed === undefined) throw new OpError(`"${input}" is not a color`);
  return parsed;
}

function colorOrRef(input: z.infer<typeof ColorOrRef>): ColorValue | string {
  return typeof input === "string" && isTokenRef(input) ? input : color(input);
}

type Palette = { id: string; target: string; config: Extract<DesignSystem["generators"][string]["config"], { kind: "colorScale" }> };

function palette(system: DesignSystem, name: string): Palette {
  for (const [id, g] of Object.entries(system.generators)) {
    if (g.config.kind !== "colorScale") continue;
    if (id === name || g.target === name || g.target === `color.${name}`) return { id, target: g.target, config: g.config };
  }
  const known = Object.entries(system.generators)
    .filter(([, g]) => g.config.kind === "colorScale")
    .map(([id]) => id);
  throw new OpError(`there is no palette "${name}"; palettes are ${known.join(", ")}`);
}

function intent(system: DesignSystem, name: string): IntentDef {
  const def = system.intents[name];
  if (def === undefined) throw new OpError(`there is no intent "${name}"; intents are ${Object.keys(system.intents).join(", ")}`);
  return def;
}

function component(system: DesignSystem, name: string): Anatomy {
  const anatomy = system.components[name];
  if (anatomy === undefined) throw new OpError(`there is no component "${name}"; components are ${Object.keys(system.components).join(", ")}`);
  return anatomy;
}

function group(system: DesignSystem, path: string): TokenGroup | undefined {
  let node: DesignSystem["tokens"][string] | TokenGroup | undefined = system.tokens;
  for (const segment of path.split(".")) {
    if (node === undefined || "$type" in node) return undefined;
    node = node[segment];
  }
  return node === undefined || "$type" in node ? undefined : node;
}

function deleteGroup(system: DesignSystem, path: string): void {
  for (const [sub] of flattenTokens(group(system, path) ?? {})) deleteToken(system.tokens, `${path}.${sub}`);
}

// Sets a color token's value for one scheme or both, pinning a generated token so regeneration
// keeps the edit.
function setColor(system: DesignSystem, path: string, value: ColorValue | string, scheme: z.infer<typeof Scheme>): void {
  const token = getToken(system.tokens, path);
  if (token === undefined || token.$type !== "color") throw new OpError(`${path} is not a color token`);
  const darkOnly = (m: { selector: Record<string, unknown> }) => m.selector["colorScheme"] === "dark" && Object.keys(m.selector).length === 1;
  const { $modes: modes = [], $meta: meta, ...rest } = token;
  let nextModes: unknown[] = modes;
  if (scheme === "dark") {
    nextModes = modes.some(darkOnly) ? modes.map((m) => (darkOnly(m) ? { ...m, value } : m)) : [...modes, { selector: { colorScheme: "dark" }, value }];
  } else if (scheme === "both") {
    nextModes = modes.filter((m) => !darkOnly(m));
  } else if (!modes.some(darkOnly)) {
    // Light only: dark keeps what it had. A role that points at a palette step reads that step's
    // dark value through the reference; replacing the reference would take dark with it.
    nextModes = [...modes, { selector: { colorScheme: "dark" }, value: token.$value }];
  }
  const nextMeta = meta?.generated !== undefined ? { ...meta, pinned: true } : meta;
  const next = Token.safeParse({
    ...rest,
    $value: scheme === "dark" ? token.$value : value,
    ...(nextModes.length > 0 ? { $modes: nextModes } : {}),
    ...(nextMeta === undefined ? {} : { $meta: nextMeta }),
  });
  if (!next.success) throw new OpError(`${path}: ${next.error.issues[0]?.message ?? "invalid color"}`);
  setToken(system.tokens, path, next.data);
}

function unpin(system: DesignSystem, path: string): void {
  const token = getToken(system.tokens, path);
  if (token === undefined) throw new OpError(`there is no token ${path}`);
  if (token.$meta?.pinned) token.$meta.pinned = false;
}

// Combinations that name an option, for renaming or dropping them with it.
function renameInCompounds(anatomy: Anatomy, axis: "variant" | "intent" | "size", from: string, to: string | null): void {
  const kept: Compound[] = [];
  for (const c of anatomy.compounds) {
    if (c.when[axis] !== from) kept.push(c);
    else if (to !== null) kept.push({ ...c, when: { ...c.when, [axis]: to } });
  }
  anatomy.compounds = kept;
}

// ---------- system ----------

const renameSystem = defineOp({
  name: "system.rename",
  group: "system",
  summary: "Rename the design system.",
  input: z.object({ name: z.string().min(1) }).strict(),
  apply: (s, i) => {
    s.name = i.name.trim();
  },
  describe: (i) => `Renamed the system to ${i.name}`,
});

const setBase = defineOp({
  name: "system.setBase",
  group: "system",
  summary: "Choose the primitive library the generated components are built on. Styling is identical on all of them.",
  input: z.object({ base: z.enum(BASES) }).strict(),
  apply: (s, i) => {
    s.base = i.base;
  },
  describe: (i) => `Components now built on ${i.base}`,
});

const setFramework = defineOp({
  name: "system.setFramework",
  group: "system",
  summary: "Choose the framework the team's apps use (react, vue or svelte): the code, docs and page code are shown in it. The look is identical in every framework, and installs follow the project they run in.",
  input: z.object({ framework: z.enum(FRAMEWORKS) }).strict(),
  apply: (s, i) => {
    if (i.framework === "react") delete s.framework;
    else s.framework = i.framework;
  },
  describe: (i) => `Code shown in ${FRAMEWORK_NAMES[i.framework]}`,
});
const FRAMEWORK_NAMES = { react: "React", vue: "Vue", svelte: "Svelte" } as const;

const setTailwindPrefix = defineOp({
  name: "system.setTailwindPrefix",
  group: "system",
  summary: "Set the Tailwind class prefix the code people install uses (acme → acme:bg-primary, acme:hover:bg-primary), or null for none. Lowercase letters only. The preview is unchanged.",
  input: z.object({ prefix: z.string().nullable() }).strict(),
  apply: (s, i) => {
    if (i.prefix === null || i.prefix.trim() === "") {
      delete s.tailwindPrefix;
      return;
    }
    const prefix = i.prefix.trim();
    const problem = prefixProblem(prefix);
    if (problem !== null) throw new OpError(problem);
    s.tailwindPrefix = prefix;
  },
  describe: (i) => (i.prefix === null || i.prefix.trim() === "" ? "No Tailwind class prefix" : `Tailwind classes prefixed ${i.prefix.trim()}:`),
});

const keepGuideline = defineOp({
  name: "guideline.keep",
  group: "system",
  summary: `Keep a guideline convention the system's own way on purpose, so checks and reviews leave it be: ${Object.entries(KEEPABLE).map(([rule, words]) => `${rule} (${words})`).join("; ")}. A note can say why. Standards (contrast, 24px targets, meanings' colors) can't be kept aside.`,
  input: z.object({ rule: z.string().min(1).max(40), note: z.string().max(200).optional() }).strict(),
  apply: (s, i) => {
    if (KEEPABLE[i.rule] === undefined) throw new OpError(`only conventions can be kept: ${Object.keys(KEEPABLE).join(", ")}`);
    s.kept = [...(s.kept ?? []).filter((k) => k.rule !== i.rule), { rule: i.rule, ...(i.note === undefined || i.note.trim() === "" ? {} : { note: i.note.trim() }) }];
  },
  describe: (i) => `Kept as is: ${KEEPABLE[i.rule] ?? i.rule}`,
});

const reviewGuideline = defineOp({
  name: "guideline.review",
  group: "system",
  summary: "Stop keeping a guideline convention the system's own way: checks and reviews note it again.",
  input: z.object({ rule: z.string().min(1).max(40) }).strict(),
  apply: (s, i) => {
    const kept = (s.kept ?? []).filter((k) => k.rule !== i.rule);
    if (kept.length === 0) delete s.kept;
    else s.kept = kept;
  },
  describe: (i) => `Checked again: ${KEEPABLE[i.rule] ?? i.rule}`,
});

const loadPreset = defineOp({
  name: "system.loadPreset",
  group: "system",
  summary: `Replace the whole system with a preset: ${PRESETS.map((p) => `${p.id} (${p.description})`).join("; ")}. Discards everything else except the name.`,
  input: z.object({ preset: z.string().min(1) }).strict(),
  apply: (s, i) => {
    const preset = presetById(i.preset);
    if (preset === undefined) throw new OpError(`there is no preset "${i.preset}"; presets are ${PRESETS.map((p) => p.id).join(", ")}`);
    // A preset replaces the design, not the system's name.
    const name = s.name;
    Object.assign(s, preset.build());
    s.name = name;
  },
  describe: (i) => `Started over from the ${i.preset} preset`,
});

const createSystem = defineOp({
  name: "system.create",
  group: "system",
  summary:
    "Start a brand-new design system: a name, a brand color, and optionally a preset whose structure to start from (shadcn, material, enterprise). Replaces the current system. Follow it with more operations in the same changeset to shape it: fonts, radius, spacing, palettes, intents, component options and styles. Use this when asked to create or design a system (e.g. 'a system like Coinbase but red'), matching visual traits only, never logos or trademarks.",
  input: z.object({ name: z.string().min(1), brandColor: ColorInput, preset: z.string().min(1).optional() }).strict(),
  apply: (s, i) => {
    const brand = color(i.brandColor);
    let next: DesignSystem;
    if (i.preset === undefined) next = createSystemFromBrand(i.name.trim(), brand);
    else {
      const preset = presetById(i.preset);
      if (preset === undefined) throw new OpError(`there is no preset "${i.preset}"; presets are ${PRESETS.map((p) => p.id).join(", ")}`);
      next = preset.build();
      next.name = i.name.trim();
      const seed = next.generators["brand"]?.config;
      if (seed?.kind === "colorScale") seed.seed = brand;
      const neutral = next.generators["neutral"]?.config;
      if (neutral?.kind === "colorScale") neutral.seed = { ...neutral.seed, h: brand.h };
    }
    Object.assign(s, next);
  },
  describe: (i) => `Created ${i.name}${i.preset === undefined ? "" : ` from the ${i.preset} preset`}`,
});

// ---------- palettes ----------

const addPalette = defineOp({
  name: "palette.add",
  group: "palette",
  summary: "Add a palette generated from one color. Steps 3-12 (default 12); vibrancy 0-2 (default 1).",
  input: z.object({ name: Name, color: ColorInput, steps: z.number().int().min(MIN_STEPS).max(CANONICAL_STEPS).optional(), vibrancy: z.number().min(0).max(2).optional() }).strict(),
  apply: (s, i) => {
    if (s.generators[i.name] !== undefined || group(s, `color.${i.name}`) !== undefined) throw new OpError(`a palette called "${i.name}" already exists`);
    s.generators[i.name] = {
      target: `color.${i.name}`,
      config: { kind: "colorScale", seed: color(i.color), ...(i.steps === undefined ? {} : { steps: i.steps }), ...(i.vibrancy === undefined ? {} : { vibrancy: i.vibrancy }) },
    };
  },
  describe: (i) => `Added a ${i.name} palette`,
});

const removePalette = defineOp({
  name: "palette.remove",
  group: "palette",
  summary: "Remove a palette. Intents using it must be moved first, or name `moveTo` to move them (and any direct references) to another palette.",
  input: z.object({ name: z.string().min(1), moveTo: z.string().min(1).optional() }).strict(),
  apply: (s, i) => {
    const p = palette(s, i.name);
    const users = Object.entries(s.intents).filter(([, d]) => d.scale === p.target).map(([n]) => n);
    if (i.moveTo === undefined && users.length > 0) throw new OpError(`${users.join(", ")} use the ${p.id} palette; give moveTo or move them first`);
    if (i.moveTo !== undefined) {
      const to = palette(s, i.moveTo);
      const sizes = paletteSizes(s);
      for (const n of users) intent(s, n).scale = to.target;
      remapRefs(s, (path) => {
        const m = new RegExp(`^${p.target.replace(/\./g, "\\.")}\\.(\\d+)$`).exec(path);
        if (m === null) return undefined;
        const step = remapStep(Number(m[1]), sizes(p.target), sizes(to.target));
        return step === undefined ? undefined : `${to.target}.${step}`;
      });
    }
    delete s.generators[p.id];
    deleteGroup(s, p.target);
  },
  describe: (i) => `Removed the ${i.name} palette${i.moveTo === undefined ? "" : `, moving its uses to ${i.moveTo}`}`,
});

const renamePalette = defineOp({
  name: "palette.rename",
  group: "palette",
  summary: "Rename a palette, updating every intent and reference that uses it.",
  input: z.object({ name: z.string().min(1), to: Name }).strict(),
  apply: (s, i) => {
    const p = palette(s, i.name);
    if (s.generators[i.to] !== undefined || group(s, `color.${i.to}`) !== undefined) throw new OpError(`a palette called "${i.to}" already exists`);
    const target = `color.${i.to}`;
    const old = group(s, p.target) ?? {};
    for (const [sub, token] of flattenTokens(old)) setToken(s.tokens, `${target}.${sub}`, token);
    deleteGroup(s, p.target);
    const generator = s.generators[p.id];
    if (generator !== undefined) {
      delete s.generators[p.id];
      s.generators[i.to] = { ...generator, target };
    }
    for (const def of Object.values(s.intents)) if (def.scale === p.target) def.scale = target;
    remapRefs(s, (path) => (path.startsWith(`${p.target}.`) ? `${target}.${path.slice(p.target.length + 1)}` : undefined));
  },
  describe: (i) => `Renamed the ${i.name} palette to ${i.to}`,
});

const setPaletteColor = defineOp({
  name: "palette.setColor",
  group: "palette",
  summary: "Change the color a palette is generated from; every step, light and dark, follows. The brand palette also tints the neutral palette's hue.",
  input: z.object({ name: z.string().min(1), color: ColorInput }).strict(),
  apply: (s, i) => {
    const p = palette(s, i.name);
    const seed = color(i.color);
    p.config.seed = seed;
    if (p.id === "brand") {
      const neutral = s.generators["neutral"]?.config;
      if (neutral?.kind === "colorScale") neutral.seed = { ...neutral.seed, h: seed.h };
    }
  },
  describe: (i) => `Changed the ${i.name} palette's color`,
});

const setPaletteSteps = defineOp({
  name: "palette.setSteps",
  group: "palette",
  summary:
    "Change how many steps a palette has (3-12; new systems start with 10, and 11-12 add a pressed fill and a subtle border). Fewer steps keep the most important ones (background, fill, strong border, solid, solid hover, text…); every role and reference moves to the step that now plays its part. Overrides on the palette are reset.",
  input: z.object({ name: z.string().min(1), steps: z.number().int().min(MIN_STEPS).max(CANONICAL_STEPS) }).strict(),
  apply: (s, i) => {
    const p = palette(s, i.name);
    const from = p.config.steps;
    for (const [sub] of flattenTokens(group(s, p.target) ?? {})) {
      const token = getToken(s.tokens, `${p.target}.${sub}`);
      if (token?.$meta?.pinned) token.$meta.pinned = false;
    }
    remapRefs(s, (path) => {
      if (!path.startsWith(`${p.target}.`)) return undefined;
      const step = remapStep(Number(path.slice(p.target.length + 1)), from, i.steps);
      return step === undefined ? undefined : `${p.target}.${step}`;
    });
    if (i.steps === CANONICAL_STEPS) delete p.config.steps;
    else p.config.steps = i.steps;
  },
  describe: (i) => `The ${i.name} palette now has ${i.steps} steps`,
});

const setPaletteVibrancy = defineOp({
  name: "palette.setVibrancy",
  group: "palette",
  summary: "Make a palette calmer (below 1, down to 0 for grey) or more vivid (above 1, up to 2). Lightness is unchanged.",
  input: z.object({ name: z.string().min(1), vibrancy: z.number().min(0).max(2) }).strict(),
  apply: (s, i) => {
    const p = palette(s, i.name);
    if (i.vibrancy === 1) delete p.config.vibrancy;
    else p.config.vibrancy = i.vibrancy;
  },
  describe: (i) => `${i.name} palette vibrancy ${i.vibrancy}`,
});

const setPaletteContrast = defineOp({
  name: "palette.setContrast",
  group: "palette",
  summary: "More contrast (above 1, up to 1.5) spreads a palette's backgrounds, borders and text apart; softer (below 1, down to 0.5) brings them together. The solid steps stay. Check contrast afterwards when softening.",
  input: z.object({ name: z.string().min(1), contrast: z.number().min(0.5).max(1.5) }).strict(),
  apply: (s, i) => {
    const p = palette(s, i.name);
    if (i.contrast === 1) delete p.config.contrast;
    else p.config.contrast = i.contrast;
  },
  describe: (i) => `${i.name} palette contrast ${i.contrast}`,
});

const setPaletteStep = defineOp({
  name: "palette.setStep",
  group: "palette",
  summary: "Override one step of a palette by hand, for light, dark or both schemes. The rest stays generated.",
  input: z.object({ name: z.string().min(1), step: z.number().int().min(1).max(CANONICAL_STEPS), color: ColorInput, scheme: Scheme.default("both") }).strict(),
  apply: (s, i) => {
    const p = palette(s, i.name);
    setColor(s, `${p.target}.${i.step}`, color(i.color), i.scheme);
  },
  describe: (i) => `Set ${i.name} ${i.step}${i.scheme === "both" ? "" : ` (${i.scheme})`}`,
});

const resetPalette = defineOp({
  name: "palette.reset",
  group: "palette",
  summary: "Undo hand overrides on a palette: one step, or every step when `step` is omitted.",
  input: z.object({ name: z.string().min(1), step: z.number().int().min(1).max(CANONICAL_STEPS).optional() }).strict(),
  apply: (s, i) => {
    const p = palette(s, i.name);
    if (i.step !== undefined) unpin(s, `${p.target}.${i.step}`);
    else for (const [sub] of flattenTokens(group(s, p.target) ?? {})) unpin(s, `${p.target}.${sub}`);
  },
  describe: (i) => (i.step === undefined ? `Reset the ${i.name} palette` : `Reset ${i.name} ${i.step}`),
});

// ---------- intents ----------

const addIntent = defineOp({
  name: "intent.add",
  group: "intent",
  summary: "Add a meaning (like primary, danger, brand-secondary) that reads from a palette. Optionally enable it on every component that has intents.",
  input: z.object({ name: Name, palette: z.string().min(1), icon: z.string().min(1).optional(), addToComponents: z.boolean().default(false) }).strict(),
  apply: (s, i) => {
    if (s.intents[i.name] !== undefined) throw new OpError(`an intent called "${i.name}" already exists`);
    const p = palette(s, i.palette);
    s.intents[i.name] = { scale: p.target, ...(i.icon === undefined ? {} : { icon: i.icon }) };
    if (i.addToComponents) for (const a of Object.values(s.components)) if (a.axes.intent !== undefined && !a.axes.intent.enabled.includes(i.name)) a.axes.intent.enabled.push(i.name);
  },
  describe: (i) => `Added a ${i.name} intent reading from ${i.palette}`,
});

const removeIntent = defineOp({
  name: "intent.remove",
  group: "intent",
  summary: "Remove a meaning. Components stop offering it; references to its roles move to `moveTo`, which is required when anything references them directly.",
  input: z.object({ name: z.string().min(1), moveTo: z.string().min(1).optional() }).strict(),
  apply: (s, i) => {
    intent(s, i.name);
    if (i.moveTo !== undefined) intent(s, i.moveTo);
    for (const a of Object.values(s.components)) {
      const axis = a.axes.intent;
      if (axis === undefined || !axis.enabled.includes(i.name)) continue;
      axis.enabled = axis.enabled.filter((n) => n !== i.name);
      if (axis.enabled.length === 0) throw new OpError(`${a.name} would have no intents left`);
      if (axis.default === i.name) axis.default = i.moveTo !== undefined && axis.enabled.includes(i.moveTo) ? i.moveTo : (axis.enabled[0] ?? axis.default);
    }
    for (const a of Object.values(s.components)) {
      delete a.intents[i.name];
      renameInCompounds(a, "intent", i.name, null);
    }
    if (i.moveTo !== undefined) remapRefs(s, (path) => (path.startsWith(`intent.${i.name}.`) ? `intent.${i.moveTo}.${path.slice(`intent.${i.name}.`.length)}` : undefined));
    delete s.intents[i.name];
    deleteGroup(s, `intent.${i.name}`);
  },
  describe: (i) => `Removed the ${i.name} intent`,
});

const renameIntent = defineOp({
  name: "intent.rename",
  group: "intent",
  summary: "Rename a meaning everywhere: components' options and defaults, references, generated tokens.",
  input: z.object({ name: z.string().min(1), to: Name }).strict(),
  apply: (s, i) => {
    const def = intent(s, i.name);
    if (s.intents[i.to] !== undefined) throw new OpError(`an intent called "${i.to}" already exists`);
    s.intents = Object.fromEntries(Object.entries(s.intents).map(([n, d]) => (n === i.name ? [i.to, def] : [n, d])));
    for (const a of Object.values(s.components)) {
      const axis = a.axes.intent;
      if (axis === undefined) continue;
      axis.enabled = axis.enabled.map((n) => (n === i.name ? i.to : n));
      if (axis.default === i.name) axis.default = i.to;
    }
    for (const a of Object.values(s.components)) {
      a.intents = Object.fromEntries(Object.entries(a.intents).map(([n, r]) => [n === i.name ? i.to : n, r]));
      renameInCompounds(a, "intent", i.name, i.to);
    }
    remapRefs(s, (path) => (path.startsWith(`intent.${i.name}.`) ? `intent.${i.to}.${path.slice(`intent.${i.name}.`.length)}` : undefined));
    deleteGroup(s, `intent.${i.name}`);
  },
  describe: (i) => `Renamed the ${i.name} intent to ${i.to}`,
});

const setIntentPalette = defineOp({
  name: "intent.setPalette",
  group: "intent",
  summary: "Point a meaning at another palette, e.g. make danger orange. Everything using that meaning follows.",
  input: z.object({ name: z.string().min(1), palette: z.string().min(1) }).strict(),
  apply: (s, i) => {
    intent(s, i.name).scale = palette(s, i.palette).target;
  },
  describe: (i) => `${i.name} now uses the ${i.palette} palette`,
});

const setIntentIcon = defineOp({
  name: "intent.setIcon",
  group: "intent",
  summary: "Set or clear the lucide icon shown with a meaning in toasts and alerts (e.g. circle-alert).",
  input: z.object({ name: z.string().min(1), icon: z.string().min(1).nullable() }).strict(),
  apply: (s, i) => {
    const def = intent(s, i.name);
    if (i.icon === null) delete def.icon;
    else def.icon = i.icon;
  },
  describe: (i) => (i.icon === null ? `Removed ${i.name}'s icon` : `${i.name} uses the ${i.icon} icon`),
});

const INTENT_ROLE = z.enum([
  "background",
  "subtle",
  "subtle-hover",
  "border",
  "border-strong",
  "focus-ring",
  "solid",
  "solid-hover",
  "solid-foreground",
  "text",
  "subtle-foreground",
  "text-strong",
]);

const setIntentRole = defineOp({
  name: "intent.setRole",
  group: "intent",
  summary: "Override one role of a meaning (e.g. primary's solid) with a reference like {color.brand.7} or a color, for light, dark or both.",
  input: z.object({ name: z.string().min(1), role: INTENT_ROLE, value: ColorOrRef, scheme: Scheme.default("both") }).strict(),
  apply: (s, i) => {
    intent(s, i.name);
    setColor(s, `intent.${i.name}.${i.role}`, colorOrRef(i.value), i.scheme);
  },
  describe: (i) => `${i.name} ${i.role} set by hand`,
});

const resetIntentRole = defineOp({
  name: "intent.resetRole",
  group: "intent",
  summary: "Undo a hand override on a meaning's role.",
  input: z.object({ name: z.string().min(1), role: INTENT_ROLE }).strict(),
  apply: (s, i) => unpin(s, `intent.${i.name}.${i.role}`),
  describe: (i) => `Reset ${i.name} ${i.role}`,
});

// ---------- surfaces ----------

const SURFACE = z.enum(["page", "card", "raised", "overlay", "backdrop"]);

const setSurface = defineOp({
  name: "surface.set",
  group: "surface",
  summary: "Set a surface (page, card, raised, overlay, backdrop) to a reference like {color.neutral.2} or a color, for light, dark or both.",
  input: z.object({ surface: SURFACE, value: ColorOrRef, scheme: Scheme.default("both") }).strict(),
  apply: (s, i) => setColor(s, `surface.${i.surface}`, colorOrRef(i.value), i.scheme),
  describe: (i) => `${i.surface} surface set by hand`,
});

const resetSurface = defineOp({
  name: "surface.reset",
  group: "surface",
  summary: "Return a surface to its generated value.",
  input: z.object({ surface: SURFACE }).strict(),
  apply: (s, i) => unpin(s, `surface.${i.surface}`),
  describe: (i) => `Reset the ${i.surface} surface`,
});

// ---------- type ----------

// A stack always ends in a generic family every browser has (see withFallback).
const withGeneric = (role: "sans" | "heading" | "mono", families: string[]) => withFallback(families, role === "mono" ? "mono" : undefined);

const setFont = defineOp({
  name: "type.setFont",
  group: "type",
  summary: "Set a typeface as a font stack, first choice first: sans (everything), heading (titles; follows sans unless set) or mono (code).",
  input: z.object({ role: z.enum(["sans", "heading", "mono"]), families: z.array(z.string().min(1)).min(1) }).strict(),
  apply: (s, i) => setToken(s.tokens, `font.family.${i.role}`, { $type: "fontFamily", $value: withGeneric(i.role, i.families) }),
  describe: (i) => `${i.role} font: ${i.families[0]}`,
});

const typeGenerator = (s: DesignSystem) => {
  const config = s.generators["type"]?.config;
  if (config?.kind !== "typeScale") throw new OpError("this system has no type scale");
  return config;
};

const setTypeScale = defineOp({
  name: "type.setScale",
  group: "type",
  summary:
    "Change the type scale: body size in px (12-24), ratio between steps (1.05-1.6; 1.125 tight, 1.2 balanced, 1.25 open, 1.333 editorial), and how many steps sit below and above the body size. Changing step counts keeps every reference on the same size relative to body.",
  input: z
    .object({
      base: z.number().min(12).max(24).optional(),
      ratio: z.number().min(1.05).max(1.6).optional(),
      stepsBelow: z.number().int().min(0).max(4).optional(),
      stepsAbove: z.number().int().min(1).max(10).optional(),
    })
    .strict(),
  apply: (s, i) => {
    const t = typeGenerator(s);
    const below = i.stepsBelow ?? t.stepsBelow;
    const above = i.stepsAbove ?? t.stepsAbove;
    if (below !== t.stepsBelow || above !== t.stepsAbove) {
      const total = below + above + 1;
      remapRefs(s, (path) => {
        const m = /^font\.(size|leading)\.(\d+)$/.exec(path);
        if (m === null) return undefined;
        const exponent = Number(m[2]) - 1 - t.stepsBelow;
        const step = Math.min(total, Math.max(1, exponent + below + 1));
        return `font.${m[1]}.${step}`;
      });
    }
    if (i.base !== undefined) t.base = i.base;
    if (i.ratio !== undefined) t.ratio = i.ratio;
    t.stepsBelow = below;
    t.stepsAbove = above;
  },
  describe: (i) =>
    [i.base === undefined ? null : `body ${i.base}px`, i.ratio === undefined ? null : `ratio ${i.ratio}`, i.stepsBelow === undefined && i.stepsAbove === undefined ? null : "type steps changed"]
      .filter(Boolean)
      .join(", ") || "Type scale unchanged",
});

const setLeading = defineOp({
  name: "type.setLeading",
  group: "type",
  summary: "Line height as a multiple of the size: text (body and small sizes, 1.2-2) and display (the largest heading, 1-1.6); sizes between blend.",
  input: z.object({ text: z.number().min(1.2).max(2).optional(), display: z.number().min(1).max(1.6).optional() }).strict(),
  apply: (s, i) => {
    const t = typeGenerator(s);
    if (i.text !== undefined) t.leading.text = i.text;
    if (i.display !== undefined) t.leading.display = i.display;
  },
  describe: () => "Changed line height",
});

// ---------- spacing and shape ----------

const setSpacing = defineOp({
  name: "spacing.set",
  group: "spacing",
  summary: "The spacing unit in px (2-8) that every gap, padding and height multiplies, and the density factors (compact 0.5-1, comfortable 1-1.6).",
  input: z.object({ base: z.number().min(2).max(8).optional(), compact: z.number().min(0.5).max(1).optional(), comfortable: z.number().min(1).max(1.6).optional() }).strict(),
  apply: (s, i) => {
    const g = s.generators["space"]?.config;
    if (g?.kind !== "spacing") throw new OpError("this system has no spacing scale");
    if (i.base !== undefined) g.base = i.base;
    if (i.compact !== undefined) g.density.compact = i.compact;
    if (i.comfortable !== undefined) g.density.comfortable = i.comfortable;
  },
  describe: (i) => (i.base === undefined ? "Changed density" : `Spacing unit ${i.base}px`),
});

const setRadius = defineOp({
  name: "radius.set",
  group: "shape",
  summary: "The medium corner radius in px (0-24); the other radius steps follow (none, sm 0.5×, lg 2×, xl 3×, 2xl 4×, full = pill).",
  input: z.object({ base: z.number().min(0).max(24) }).strict(),
  apply: (s, i) => {
    const g = s.generators["radius"]?.config;
    if (g?.kind !== "radiusScale") throw new OpError("this system has no radius scale");
    g.base = i.base;
  },
  describe: (i) => `Medium radius ${i.base}px`,
});

// ---------- any token ----------

// A token value from what a person or model wrote: a reference, a plain value ("4px", "600",
// "#e11d48") or a value already in the token's shape.
function valueFor(type: TokenType, value: unknown, path: string): unknown {
  if (typeof value !== "string" || isTokenRef(value)) return value;
  if (type === "color") return color(value);
  const parsed = parseLiteral(type, value);
  if (parsed === undefined) throw new OpError(`${path} is a ${type}; give ${LITERAL_HINTS[type]}`);
  return parsed;
}

function sameSelector(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((k) => a[k] === b[k]);
}

// A component's token as people say it: "button.custom.root-height-sm" (a value set on the
// component) and "button.height.sm" are both "Button sm height"; any other token keeps its path.
const PROP_WORDS: Record<string, string> = { height: "height", "padding-x": "padding", "padding-y": "vertical padding", "font-size": "text size", "font-weight": "text weight", "icon-size": "icon size", radius: "corners", gap: "gap" };
function tokenLabel(path: string): string | undefined {
  const [component, second, third, ...rest] = path.split(".");
  if (component === undefined || second === undefined || third === undefined || rest.length > 0) return undefined;
  if (second === "custom") {
    const m = /^([a-z]+)-(height|padding-x|padding-y|font-size|font-weight|icon-size|radius|gap)(?:-(.+))?$/.exec(third);
    if (m === null) return undefined;
    const [, part, prop, scope] = m;
    return [componentName(component), scope?.replace(/-/g, " "), part === "root" ? undefined : part, PROP_WORDS[prop!]].filter(Boolean).join(" ");
  }
  return PROP_WORDS[second] !== undefined && /^(xs|sm|md|lg|xl|2xl)$/.test(third) ? `${componentName(component)} ${third} ${PROP_WORDS[second]}` : undefined;
}

// Any token in words, for what people read in a proposal and the changelog: "focus.width" →
// "Focus width", "motion.easing.exit" → "Exit curve", "surface.page" → "Page surface".
export function tokenWords(path: string): string {
  const parts = path.split(".");
  const cap = (w: string) => (w === "" ? w : `${w[0]!.toUpperCase()}${w.slice(1)}`);
  const words = (w: string) => w.replace(/-/g, " ");
  const [a = "", b = "", c = ""] = parts;
  if (a === "motion" && parts.length === 3) return `${cap(c)} ${b === "easing" ? "curve" : "duration"}`;
  if (a === "font" && b === "size") return `Text size ${c}`;
  if (a === "font" && b === "leading") return `Line height ${c}`;
  if (a === "font" && b === "weight") return `${cap(c)} weight`;
  if (a === "font" && b === "family") return `${cap(c)} typeface`;
  if (a === "surface" && parts.length === 2) return `${cap(b)} surface`;
  if (a === "intent" && parts.length === 3) return `${cap(b)} ${words(c)}`;
  if (a === "color" && parts.length === 3) return `${cap(b)} ${c}`;
  return cap(parts.map(words).join(" "));
}

const setTokenOp = defineOp({
  name: "token.set",
  group: "token",
  summary:
    "Set any token directly (focus.width, opacity.disabled, shadow.md, motion.duration.fast…). The value is a reference like {space.4}, a plain value (4px, 600, 150ms, #e11d48) or a value of the token's type. scheme (colors) or mode ({density:'compact'}, {touch:true}, {colorScheme:'dark'}) limits it to one mode. Prefer a specific operation when one exists; never use this to imitate a missing capability.",
  input: z.object({ path: z.string().min(1), value: z.unknown(), scheme: Scheme.default("both"), mode: StyleMode.optional() }).strict(),
  apply: (s, i) => {
    const token = getToken(s.tokens, i.path);
    if (token === undefined) throw new OpError(`there is no token ${i.path}`);
    if (token.$type === "color" && i.mode === undefined) {
      const value = i.value;
      if (typeof value !== "string" && ColorValue.safeParse(value).success === false) throw new OpError(`${i.path} is a color; give a color or a reference`);
      setColor(s, i.path, typeof value === "string" ? colorOrRef(value) : ColorValue.parse(value), i.scheme);
      return;
    }
    const value = valueFor(token.$type, i.value, i.path);
    const mode = i.mode;
    const next =
      mode === undefined
        ? { ...token, $value: value }
        : { ...token, $modes: [...(token.$modes ?? []).filter((m) => !sameSelector(m.selector, mode)), { selector: mode, value }] };
    const parsed = Token.safeParse(next);
    if (!parsed.success) throw new OpError(`${i.path} is a ${token.$type}; ${parsed.error.issues[0]?.message ?? "invalid value"}`);
    if (parsed.data.$meta?.generated !== undefined) parsed.data.$meta.pinned = true;
    setToken(s.tokens, i.path, parsed.data);
  },
  describe: (i) => `${tokenLabel(i.path) ?? tokenWords(i.path)}${typeof i.value === "string" && !i.value.startsWith("{") ? ` ${i.value}` : ""}${describeMode(i.mode)}`,
});

const TokenPath = z.string().regex(/^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)+$/, "a dotted path like shadow.xl or font.weight.light");
const TOKEN_TYPES = ["color", "dimension", "number", "fontFamily", "fontWeight", "duration", "cubicBezier", "shadow"] as const;

// How many places reference a token: other tokens (any mode) and component recipes.
function referenceCount(s: DesignSystem, path: string): number {
  const needle = JSON.stringify(toRef(path));
  const count = (json: string) => json.split(needle).length - 1;
  return count(JSON.stringify(s.tokens)) + Object.values(s.components).reduce((n, a) => n + count(JSON.stringify({ ...a, tokens: {} })), 0);
}

function ownToken(s: DesignSystem, path: string): Token {
  const token = getToken(s.tokens, path);
  if (token === undefined) throw new OpError(`there is no token ${path}`);
  const by = token.$meta?.generated?.by;
  if (by !== undefined) {
    const what = by.startsWith("component:") ? `the ${by.slice("component:".length)} component` : `the ${by} scale`;
    throw new OpError(`${path} is made by ${what}; change that instead`);
  }
  return token;
}

const addToken = defineOp({
  name: "token.add",
  group: "token",
  summary: "Add a token (a new shadow like shadow.xl, a weight like font.weight.light, a breakpoint, a color alias). The value is a reference, a plain value, or a value of the type.",
  input: z.object({ path: TokenPath, type: z.enum(TOKEN_TYPES), value: z.unknown(), description: z.string().optional() }).strict(),
  apply: (s, i) => {
    if (getToken(s.tokens, i.path) !== undefined) throw new OpError(`${i.path} already exists; use token.set`);
    if (group(s, i.path) !== undefined) throw new OpError(`${i.path} is a group of tokens`);
    const parsed = Token.safeParse({ $type: i.type, $value: valueFor(i.type, i.value, i.path), ...(i.description === undefined ? {} : { $description: i.description }) });
    if (!parsed.success) throw new OpError(`${i.path}: ${parsed.error.issues[0]?.message ?? "invalid value"}`);
    try {
      setToken(s.tokens, i.path, parsed.data);
    } catch (e) {
      throw new OpError(e instanceof Error ? e.message : String(e));
    }
  },
  describe: (i) => `Added ${i.path}`,
});

const removeToken = defineOp({
  name: "token.remove",
  group: "token",
  summary: "Remove a token that is not generated. Refused while anything references it, unless moveTo names a token of the same type to point those references at.",
  input: z.object({ path: z.string().min(1), moveTo: z.string().min(1).optional() }).strict(),
  apply: (s, i) => {
    const token = ownToken(s, i.path);
    const uses = referenceCount(s, i.path);
    if (uses > 0) {
      if (i.moveTo === undefined) throw new OpError(`${i.path} is used in ${uses} place${uses === 1 ? "" : "s"}; give moveTo to point them at another token`);
      const target = getToken(s.tokens, i.moveTo);
      if (target === undefined) throw new OpError(`there is no token ${i.moveTo}`);
      if (target.$type !== token.$type) throw new OpError(`${i.moveTo} is a ${target.$type}, not a ${token.$type}`);
      remapRefs(s, (p) => (p === i.path ? i.moveTo : undefined));
    }
    deleteToken(s.tokens, i.path);
  },
  describe: (i) => `Removed ${i.path}${i.moveTo === undefined ? "" : `, uses moved to ${i.moveTo}`}`,
});

const renameToken = defineOp({
  name: "token.rename",
  group: "token",
  summary: "Rename a token that is not generated, and every reference to it.",
  input: z.object({ path: z.string().min(1), to: TokenPath }).strict(),
  apply: (s, i) => {
    const token = ownToken(s, i.path);
    if (getToken(s.tokens, i.to) !== undefined || group(s, i.to) !== undefined) throw new OpError(`${i.to} already exists`);
    deleteToken(s.tokens, i.path);
    try {
      setToken(s.tokens, i.to, token);
    } catch (e) {
      throw new OpError(e instanceof Error ? e.message : String(e));
    }
    remapRefs(s, (p) => (p === i.path ? i.to : undefined));
  },
  describe: (i) => `Renamed ${i.path} to ${i.to}`,
});

const setSpacingSteps = defineOp({
  name: "spacing.setSteps",
  group: "spacing",
  summary:
    "Choose the spacing steps as multiples of the unit, smallest first (the default is 0.5, 1, 2, 3, 4, 6, 8, 12, 16 → space.1-space.9). Anything using a step that goes moves to the nearest remaining size.",
  input: z.object({ multipliers: z.array(z.number().positive()).min(1).max(24) }).strict(),
  apply: (s, i) => {
    const g = s.generators["space"]?.config;
    if (g?.kind !== "spacing") throw new OpError("this system has no spacing scale");
    const next = [...i.multipliers].sort((a, b) => a - b);
    if (new Set(next).size !== next.length) throw new OpError("each step must be a different size");
    const nearest = (m: number) => next.reduce((best, n, j) => (Math.abs(n - m) < Math.abs((next[best] ?? n) - m) ? j : best), 0) + 1;
    const moves = new Map(g.multipliers.map((m, j) => [`space.${j + 1}`, `space.${nearest(m)}`]));
    remapRefs(s, (p) => moves.get(p));
    g.multipliers = next;
  },
  describe: (i) => `${i.multipliers.length} spacing steps`,
});

const resetToken = defineOp({
  name: "token.reset",
  group: "token",
  summary: "Return a generated token to its generated value.",
  input: z.object({ path: z.string().min(1) }).strict(),
  apply: (s, i) => unpin(s, i.path),
  describe: (i) => `Reset ${i.path}`,
});

// ---------- components ----------

const setOptionEnabled = defineOp({
  name: "component.setOption",
  group: "component",
  summary: "Include or leave out one option of a component's variant, intent or size axis. Left-out options disappear from its props, types and preview.",
  input: z.object({ component: z.string().min(1), axis: Axis, option: z.string().min(1), enabled: z.boolean() }).strict(),
  apply: (s, i) => {
    const a = component(s, i.component).axes[i.axis];
    if (a === undefined) throw new OpError(`${i.component} has no ${i.axis} axis`);
    if (i.enabled) {
      if (!a.enabled.includes(i.option)) a.enabled.push(i.option);
      return;
    }
    if (a.default === i.option) throw new OpError(`${i.option} is the default ${i.axis}; choose another default first`);
    if (a.enabled.length === 1) throw new OpError(`at least one ${i.axis} must stay`);
    a.enabled = a.enabled.filter((o) => o !== i.option);
  },
  describe: (i) => `${i.enabled ? "Included" : "Left out"} ${i.component} ${i.axis} ${i.option}`,
});

const setDefault = defineOp({
  name: "component.setDefault",
  group: "component",
  summary: "Choose the variant, intent or size a component uses when none is given.",
  input: z.object({ component: z.string().min(1), axis: Axis, option: z.string().min(1) }).strict(),
  apply: (s, i) => {
    const a = component(s, i.component).axes[i.axis];
    if (a === undefined) throw new OpError(`${i.component} has no ${i.axis} axis`);
    if (!a.enabled.includes(i.option)) a.enabled.push(i.option);
    a.default = i.option;
  },
  describe: (i) => `${i.component} defaults to ${i.axis} ${i.option}`,
});

const addOption = defineOp({
  name: "component.addOption",
  group: "component",
  summary: "Add a variant or size to a component, optionally starting as a copy of an existing one (copyFrom). Intents come from the system; use intent.add for new ones.",
  input: z.object({ component: z.string().min(1), axis: z.enum(["variant", "size"]), name: Name, copyFrom: z.string().min(1).optional() }).strict(),
  apply: (s, i) => {
    const a = component(s, i.component);
    const record = i.axis === "variant" ? a.variants : a.sizes;
    if (record[i.name] !== undefined) throw new OpError(`${i.component} already has a ${i.axis} "${i.name}"`);
    const source = i.copyFrom === undefined ? {} : record[i.copyFrom];
    if (source === undefined) throw new OpError(`${i.component} has no ${i.axis} "${i.copyFrom}"`);
    // Parsing through the schema makes an independent copy.
    record[i.name] = Recipe.parse(source);
    const axis = (a.axes[i.axis] ??= { enabled: [], default: i.name });
    if (!axis.enabled.includes(i.name)) axis.enabled.push(i.name);
  },
  describe: (i) => `Added ${i.component} ${i.axis} ${i.name}${i.copyFrom === undefined ? "" : ` (copy of ${i.copyFrom})`}`,
});

const removeOption = defineOp({
  name: "component.removeOption",
  group: "component",
  summary: "Delete a variant or size from a component entirely (its styles too). Use component.setOption to only leave it out.",
  input: z.object({ component: z.string().min(1), axis: z.enum(["variant", "size"]), name: z.string().min(1) }).strict(),
  apply: (s, i) => {
    const a = component(s, i.component);
    const record = i.axis === "variant" ? a.variants : a.sizes;
    if (record[i.name] === undefined) throw new OpError(`${i.component} has no ${i.axis} "${i.name}"`);
    const axis = a.axes[i.axis];
    if (axis !== undefined) {
      if (axis.default === i.name) throw new OpError(`${i.name} is the default ${i.axis}; choose another default first`);
      axis.enabled = axis.enabled.filter((o) => o !== i.name);
    }
    delete record[i.name];
    renameInCompounds(a, i.axis, i.name, null);
  },
  describe: (i) => `Deleted ${i.component} ${i.axis} ${i.name}`,
});

const renameOption = defineOp({
  name: "component.renameOption",
  group: "component",
  summary: "Rename a variant or size of a component (the prop value changes in generated code).",
  input: z.object({ component: z.string().min(1), axis: z.enum(["variant", "size"]), name: z.string().min(1), to: Name }).strict(),
  apply: (s, i) => {
    const a = component(s, i.component);
    const record = i.axis === "variant" ? a.variants : a.sizes;
    const recipe = record[i.name];
    if (recipe === undefined) throw new OpError(`${i.component} has no ${i.axis} "${i.name}"`);
    if (record[i.to] !== undefined) throw new OpError(`${i.component} already has a ${i.axis} "${i.to}"`);
    const renamed = Object.fromEntries(Object.entries(record).map(([k, v]) => (k === i.name ? [i.to, recipe] : [k, v])));
    if (i.axis === "variant") a.variants = renamed;
    else a.sizes = renamed;
    const axis = a.axes[i.axis];
    if (axis !== undefined) {
      axis.enabled = axis.enabled.map((o) => (o === i.name ? i.to : o));
      if (axis.default === i.name) axis.default = i.to;
    }
    renameInCompounds(a, i.axis, i.name, i.to);
  },
  describe: (i) => `Renamed ${i.component} ${i.axis} ${i.name} to ${i.to}`,
});

const setStyle = defineOp({
  name: "component.setStyle",
  group: "component",
  summary:
    "Set or remove (value null) one style property of a component part. scope: all of the component, one variant, size or intent, or a combination of at least two ({kind:'combination', when:{variant:'solid', intent:'primary'}}); narrower scopes win. state: default or hover, disabled, open… value: a reference like {intent.*.solid} (follows the component's intent), {color.red.9}, {radius.lg}, {space.4}; a plain value like 4px, #e11d48, 600, 150ms, 0.97 (stored as a token owned by the component, so nothing else changes); or a property's word (uppercase, dashed, pointer…). mode: only in dark mode, a density or on touch ({colorScheme:'dark'}); outside it the value stays as it was.",
  input: SetStyleInput,
  apply: (s, i) => applySetStyle(s, component(s, i.component), i),
  describe: (i) =>
    `${i.value === null ? "Removed" : "Set"} ${i.component}${i.part === "root" ? "" : ` ${i.part}`} ${i.property}${i.state === "default" ? "" : ` when ${i.state}`} (${describeScope(i.scope)})${describeMode(i.mode)}`,
});

const removeComponent = defineOp({
  name: "component.remove",
  group: "component",
  summary: "Leave a component out of the system: no file, no CSS variables, not in the preview. Its styles are kept, so component.restore brings it back as it was.",
  input: z.object({ component: z.string().min(1) }).strict(),
  apply: (s, i) => {
    component(s, i.component);
    const needing = dependentsOf(i.component, Object.keys(s.components).filter((n) => !s.excluded.includes(n)));
    if (needing.length > 0) throw new OpError(`${i.component} is needed by ${needing.join(", ")}; leave ${needing.length === 1 ? "that" : "those"} out first`);
    if (!s.excluded.includes(i.component)) s.excluded.push(i.component);
  },
  describe: (i) => `Left out ${i.component}`,
});

const restoreComponent = defineOp({
  name: "component.restore",
  group: "component",
  summary: "Bring a left-out component back, with the styles it had, and any component it needs.",
  input: z.object({ component: z.string().min(1) }).strict(),
  apply: (s, i) => {
    component(s, i.component);
    const bring = new Set([i.component, ...requirementsOf(i.component)]);
    s.excluded = s.excluded.filter((n) => !bring.has(n));
  },
  describe: (i) => `Included ${i.component}`,
});

// ---------- pages ----------

function page(s: DesignSystem, id: string): SavedPage {
  const found = s.pages?.[id];
  if (found === undefined) throw new OpError(`there is no page "${id}"`);
  return found;
}

const savePage = defineOp({
  name: "page.save",
  group: "page",
  summary: "Add a page built from the system's components, or replace the page with this id.",
  input: z.object({ id: PageId, name: z.string().min(1).max(60), spec: SavedPageSpec, prompt: z.string().max(4000).optional() }).strict(),
  apply: (s, i) => {
    const pages = (s.pages ??= {});
    if (!(i.id in pages) && Object.keys(pages).length >= MAX_PAGES) throw new OpError(`a system keeps at most ${MAX_PAGES} pages`);
    pages[i.id] = { name: i.name, spec: i.spec, ...(i.prompt === undefined ? {} : { prompt: i.prompt }) };
  },
  describe: (i) => `Page “${i.name}”`,
  unlisted: true,
});

const renamePage = defineOp({
  name: "page.rename",
  group: "page",
  summary: "Rename a saved page.",
  input: z.object({ id: z.string().min(1), name: z.string().min(1).max(60) }).strict(),
  apply: (s, i) => {
    page(s, i.id).name = i.name;
  },
  describe: (i) => `Renamed a page to “${i.name}”`,
});

const removePage = defineOp({
  name: "page.remove",
  group: "page",
  summary: "Delete a saved page.",
  input: z.object({ id: z.string().min(1) }).strict(),
  apply: (s, i) => {
    page(s, i.id);
    delete s.pages![i.id];
  },
  describe: (i) => `Deleted page ${i.id}`,
});

// ---------- icons ----------

function icons(s: DesignSystem): IconSettings {
  return (s.icons ??= { ...DEFAULT_ICONS, spots: {}, custom: {} });
}

const setIconLibrary = defineOp({
  name: "icons.setLibrary",
  group: "icon",
  summary: "Choose the icon library the components use: lucide (default), tabler, phosphor, hugeicons (free set) or remix.",
  input: z.object({ library: z.enum(ICON_LIBRARIES) }).strict(),
  apply: (s, i) => {
    icons(s).library = i.library;
  },
  describe: (i) => `Icons from ${i.library === "hugeicons" ? "Hugeicons" : i.library.charAt(0).toUpperCase() + i.library.slice(1)}`,
});

const setIconStroke = defineOp({
  name: "icons.setStroke",
  group: "icon",
  summary: "Set how thick icon lines are, in pixels at 24px (0.5 to 3; 2 is the default). Applies to Lucide, Tabler and Hugeicons.",
  input: z.object({ stroke: z.number().min(0.5).max(3) }).strict(),
  apply: (s, i) => {
    icons(s).stroke = i.stroke;
  },
  describe: (i) => `Icon lines ${i.stroke}px`,
});

const setIconWeight = defineOp({
  name: "icons.setWeight",
  group: "icon",
  summary: "Set the icon weight for Phosphor (thin, light, regular, bold, fill, duotone) or Remix (regular is line, fill is filled).",
  input: z.object({ weight: z.enum(ICON_WEIGHTS) }).strict(),
  apply: (s, i) => {
    icons(s).weight = i.weight;
  },
  describe: (i) => `Icon weight ${i.weight}`,
});

const setIconSpot = defineOp({
  name: "icons.setSpot",
  group: "icon",
  summary:
    "Change the icon in one spot, named '<component>:<icon>' (e.g. 'select:chevron-down', 'alert:circle-alert'): to another icon by meaning ('chevron-down', 'plus'), an icon from a library ('tabler:IconBolt'), or one of the system's own ('custom:acme-logo'). icon null goes back to the default.",
  input: z.object({ spot: z.string().regex(/^[a-z][a-z0-9-]*:[a-z0-9-]+$/), icon: IconRef.nullable() }).strict(),
  apply: (s, i) => {
    const settings = icons(s);
    if (i.icon?.startsWith("custom:") && !(i.icon.slice(7) in settings.custom)) throw new OpError(`there is no icon "${i.icon.slice(7)}" of the system's own`);
    if (i.icon === null) delete settings.spots[i.spot];
    else settings.spots[i.spot] = i.icon;
  },
  describe: (i) => (i.icon === null ? `${i.spot} back to its own icon` : `${i.spot} uses ${i.icon}`),
});

const addCustomIcon = defineOp({
  name: "icons.addCustom",
  group: "icon",
  summary: "Add one of the system's own icons (a logo, a product mark) from an already-cleaned SVG. The builder cleans uploads first.",
  input: z.object({ id: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/), icon: CustomIcon }).strict(),
  apply: (s, i) => {
    const custom = icons(s).custom;
    if (!(i.id in custom) && Object.keys(custom).length >= MAX_CUSTOM_ICONS) throw new OpError(`a system keeps at most ${MAX_CUSTOM_ICONS} icons of its own`);
    custom[i.id] = i.icon;
  },
  describe: (i) => `Icon “${i.icon.name}”`,
  unlisted: true,
});

const renameCustomIcon = defineOp({
  name: "icons.renameCustom",
  group: "icon",
  summary: "Rename one of the system's own icons (its display name; its id stays).",
  input: z.object({ id: z.string().min(1), name: z.string().min(1).max(60) }).strict(),
  apply: (s, i) => {
    const icon = icons(s).custom[i.id];
    if (icon === undefined) throw new OpError(`there is no icon "${i.id}" of the system's own`);
    icon.name = i.name;
  },
  describe: (i) => `Renamed an icon to “${i.name}”`,
});

const removeCustomIcon = defineOp({
  name: "icons.removeCustom",
  group: "icon",
  summary: "Delete one of the system's own icons; spots using it go back to their default.",
  input: z.object({ id: z.string().min(1) }).strict(),
  apply: (s, i) => {
    const settings = icons(s);
    if (!(i.id in settings.custom)) throw new OpError(`there is no icon "${i.id}" of the system's own`);
    delete settings.custom[i.id];
    for (const [spot, ref] of Object.entries(settings.spots)) if (ref === `custom:${i.id}`) delete settings.spots[spot];
  },
  describe: (i) => `Deleted icon ${i.id}`,
});

// ---------- fonts of the system's own ----------

const addFont = defineOp({
  name: "fonts.add",
  group: "font",
  summary: "Add (or replace) a family of the system's own font files, uploaded to the account first.",
  input: z.object({ family: FontFamilyName, font: CustomFont }).strict(),
  apply: (s, i) => {
    (s.fonts ??= {})[i.family] = i.font;
  },
  describe: (i) => `Font “${i.family}”`,
  unlisted: true,
});

const removeFont = defineOp({
  name: "fonts.remove",
  group: "font",
  summary: "Remove one of the system's own font families. Refused while a font role uses it.",
  input: z.object({ family: z.string().min(1) }).strict(),
  apply: (s, i) => {
    if (s.fonts?.[i.family] === undefined) throw new OpError(`there is no font "${i.family}" of the system's own`);
    for (const role of ["sans", "heading", "mono"]) {
      const token = getToken(s.tokens, `font.family.${role}`);
      if (token?.$type === "fontFamily" && Array.isArray(token.$value) && token.$value[0] === i.family) throw new OpError(`the ${role} font uses ${i.family}; choose another first`);
    }
    delete s.fonts[i.family];
  },
  describe: (i) => `Removed font “${i.family}”`,
});

// ---------- brands ----------

// What a brand can change, each by the operation that changes it for the shared system: a
// palette's color, a font role, the corner radius. One value per knob; setting it again replaces it.
export const BRAND_KNOBS = { "palette.setColor": setPaletteColor, "type.setFont": setFont, "radius.set": setRadius } as const;
export type BrandKnob = keyof typeof BRAND_KNOBS;

export function knobKey(op: string, input: unknown): string {
  const i = (typeof input === "object" && input !== null ? input : {}) as { name?: unknown; role?: unknown };
  if (op === "palette.setColor") return `${op}:${String(i.name)}`;
  if (op === "type.setFont") return `${op}:${String(i.role)}`;
  return op;
}

// "Acme Kids" → "acme-kids", made unique among the brands already there.
export function brandIdFor(name: string, taken: readonly string[]): string {
  const stem = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/^[^a-z]+/, "").slice(0, 28) || "brand";
  const base = stem === "default" ? "brand" : stem;
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`;
  return id;
}

function brandOf(s: DesignSystem, id: string) {
  const brand = s.brands?.[id];
  if (brand === undefined) throw new OpError(`there is no brand ${id}${s.brands && Object.keys(s.brands).length > 0 ? ` (brands: ${Object.keys(s.brands).join(", ")})` : ""}`);
  return brand;
}

const addBrand = defineOp({
  name: "brand.add",
  group: "brand",
  summary:
    "Add a brand: another theme of the same system, sharing its components. It starts identical to the shared system; brand.set then changes its palette colors, fonts or radius. Brands switch with data-brand=\"<id>\" on any element.",
  input: z.object({ name: z.string().trim().min(1).max(40), id: BrandId.optional() }).strict(),
  apply: (s, i) => {
    const taken = Object.keys(s.brands ?? {});
    if (Object.keys(s.brands ?? {}).length >= 12) throw new OpError("a system has at most 12 brands");
    const id = i.id ?? brandIdFor(i.name, taken);
    if (taken.includes(id)) throw new OpError(`there is already a brand ${id}`);
    s.brands = { ...s.brands, [id]: { name: i.name, ops: [] } };
  },
  describe: (i) => `Added the brand ${i.name}`,
});

const removeBrand = defineOp({
  name: "brand.remove",
  group: "brand",
  summary: "Remove a brand. The shared system and the other brands are unchanged.",
  input: z.object({ id: z.string().min(1) }).strict(),
  apply: (s, i) => {
    brandOf(s, i.id);
    const { [i.id]: _gone, ...rest } = s.brands!;
    s.brands = Object.keys(rest).length === 0 ? undefined : rest;
  },
  describe: (i) => `Removed the brand ${i.id}`,
});

const renameBrand = defineOp({
  name: "brand.rename",
  group: "brand",
  summary: "Rename a brand. Its id (used in data-brand) stays the same.",
  input: z.object({ id: z.string().min(1), name: z.string().trim().min(1).max(40) }).strict(),
  apply: (s, i) => {
    brandOf(s, i.id).name = i.name;
  },
  describe: (i) => `Renamed the brand ${i.id} to ${i.name}`,
});

const setBrand = defineOp({
  name: "brand.set",
  group: "brand",
  summary:
    "Change one thing about a brand, with the operation that would change it for the shared system: palette.setColor ({name, color}), type.setFont ({role, families}) or radius.set ({base}). brand.reset takes a change out again.",
  input: z.object({ id: z.string().min(1), op: z.enum(Object.keys(BRAND_KNOBS) as [BrandKnob, ...BrandKnob[]]), input: z.unknown() }).strict(),
  apply: (s, i) => {
    const brand = brandOf(s, i.id);
    const parsed = BRAND_KNOBS[i.op].input.safeParse(i.input);
    if (!parsed.success) throw new OpError(`${i.op}: ${parsed.error.issues[0]?.message ?? "invalid input"}`);
    const palette = (parsed.data as { name?: string }).name;
    if (i.op === "palette.setColor" && s.generators[palette ?? ""]?.config.kind !== "colorScale") throw new OpError(`there is no palette ${palette}`);
    const call = { op: i.op, input: parsed.data };
    const at = brand.ops.findIndex((o) => knobKey(o.op, o.input) === knobKey(i.op, parsed.data));
    if (at === -1) brand.ops.push(call);
    else brand.ops[at] = call;
  },
  describe: (i) => `${i.id}: ${BRAND_KNOBS[i.op].describe(i.input as never)}`,
});

const resetBrand = defineOp({
  name: "brand.reset",
  group: "brand",
  summary: "Take one change out of a brand, so it follows the shared system there again: a palette's color (target: the palette), a font role (target: sans, heading or mono) or the radius.",
  input: z.object({ id: z.string().min(1), op: z.enum(Object.keys(BRAND_KNOBS) as [BrandKnob, ...BrandKnob[]]), target: z.string().min(1).optional() }).strict(),
  apply: (s, i) => {
    const brand = brandOf(s, i.id);
    const key = i.op === "radius.set" ? i.op : `${i.op}:${i.target ?? ""}`;
    const kept = brand.ops.filter((o) => knobKey(o.op, o.input) !== key);
    if (kept.length === brand.ops.length) throw new OpError(`${i.id} doesn't change that`);
    brand.ops = kept;
  },
  describe: (i) => `${i.id}: ${i.op === "radius.set" ? "radius" : (i.target ?? "")} back to the shared system`,
});

// ---------- the catalog ----------

export const OPS: AnyOp[] = [
  erase(renameSystem),
  erase(setBase),
  erase(setFramework),
  erase(setTailwindPrefix),
  erase(keepGuideline),
  erase(reviewGuideline),
  erase(loadPreset),
  erase(createSystem),
  erase(addPalette),
  erase(removePalette),
  erase(renamePalette),
  erase(setPaletteColor),
  erase(setPaletteSteps),
  erase(setPaletteVibrancy),
  erase(setPaletteContrast),
  erase(setPaletteStep),
  erase(resetPalette),
  erase(addIntent),
  erase(removeIntent),
  erase(renameIntent),
  erase(setIntentPalette),
  erase(setIntentIcon),
  erase(setIntentRole),
  erase(resetIntentRole),
  erase(setSurface),
  erase(resetSurface),
  erase(setFont),
  erase(setTypeScale),
  erase(setLeading),
  erase(setSpacing),
  erase(setSpacingSteps),
  erase(setRadius),
  erase(setTokenOp),
  erase(addToken),
  erase(removeToken),
  erase(renameToken),
  erase(resetToken),
  erase(setOptionEnabled),
  erase(setDefault),
  erase(addOption),
  erase(removeOption),
  erase(renameOption),
  erase(setStyle),
  erase(removeComponent),
  erase(restoreComponent),
  erase(savePage),
  erase(renamePage),
  erase(removePage),
  erase(setIconLibrary),
  erase(setIconStroke),
  erase(setIconWeight),
  erase(setIconSpot),
  erase(addCustomIcon),
  erase(renameCustomIcon),
  erase(removeCustomIcon),
  erase(addFont),
  erase(removeFont),
  erase(addBrand),
  erase(removeBrand),
  erase(renameBrand),
  erase(setBrand),
  erase(resetBrand),
];

export function opByName(name: string): AnyOp | undefined {
  return OPS.find((op) => op.name === name);
}
