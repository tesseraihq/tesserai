import { z } from "zod";
import { isTokenRef, refPath, TOKEN_REF_PATTERN, TokenGroup, TokenRef, type Token, type TokenType } from "./tokens";

export const ComponentState = z.enum([
  "hover",
  "focus-visible",
  "pressed",
  "disabled",
  "invalid",
  "selected",
  // Keyboard or pointer highlight inside a list (menu item, select option).
  "highlighted",
  "read-only",
  "loading",
  // Expanded or showing: an accordion item, a collapsible, a menu trigger whose menu is up.
  "open",
  // A checkbox that is neither checked nor unchecked.
  "indeterminate",
  // The page you are on, in breadcrumbs, pagination and navigation.
  "current",
  // A slider thumb or resize handle being dragged.
  "dragging",
  // A select or input showing its placeholder rather than a value.
  "placeholder",
  // Orientation is not a state in the ARIA sense, but "when vertical, the tabs stack" is styled like one.
  "horizontal",
  "vertical",
]);
export type ComponentState = z.infer<typeof ComponentState>;

// Like a token reference, but the second segment may be `*`, which is replaced by the intent name
// when a recipe is resolved: {intent.*.solid} -> {intent.danger.solid}.
export const RECIPE_REF_PATTERN = /^\{[a-zA-Z0-9_-]+(?:\.(?:\*|[a-zA-Z0-9_-]+))+\}$/;
export const RecipeRef = z.string().regex(RECIPE_REF_PATTERN, "expected a token reference, optionally with * for the intent");
export type RecipeRef = z.infer<typeof RecipeRef>;

// Properties that take one word from a fixed list rather than a token. Defined once: the schema,
// the class generator and the builder's labels all read these lists.
export const ENUM_PROPS = {
  textDecoration: ["none", "underline"],
  cursor: ["default", "pointer", "not-allowed", "text"],
  textTransform: ["none", "uppercase", "lowercase", "capitalize"],
  fontStyle: ["normal", "italic"],
  textAlign: ["start", "center", "end"],
  textOverflow: ["wrap", "truncate", "clamp-2", "clamp-3"],
  borderStyle: ["solid", "dashed", "dotted", "none"],
  objectFit: ["cover", "contain", "fill"],
  animation: ["none", "pulse", "spin"],
} as const;
export type EnumProp = keyof typeof ENUM_PROPS;

// The vocabulary a template can style. Every value is a token reference except the enums above.
export const StyleProps = z
  .object({
    background: RecipeRef,
    foreground: RecipeRef,
    border: RecipeRef,
    borderWidth: RecipeRef,
    ring: RecipeRef,
    ringWidth: RecipeRef,
    ringOffset: RecipeRef,
    ringOffsetColor: RecipeRef,
    shadow: RecipeRef,
    radius: RecipeRef,
    padding: RecipeRef,
    paddingX: RecipeRef,
    paddingY: RecipeRef,
    gap: RecipeRef,
    height: RecipeRef,
    width: RecipeRef,
    minWidth: RecipeRef,
    maxWidth: RecipeRef,
    minHeight: RecipeRef,
    maxHeight: RecipeRef,
    size: RecipeRef,
    aspectRatio: RecipeRef,
    fontFamily: RecipeRef,
    fontSize: RecipeRef,
    lineHeight: RecipeRef,
    fontWeight: RecipeRef,
    letterSpacing: RecipeRef,
    opacity: RecipeRef,
    scale: RecipeRef,
    backdropBlur: RecipeRef,
    duration: RecipeRef,
    easing: RecipeRef,
    textDecoration: z.enum(ENUM_PROPS.textDecoration),
    cursor: z.enum(ENUM_PROPS.cursor),
    textTransform: z.enum(ENUM_PROPS.textTransform),
    fontStyle: z.enum(ENUM_PROPS.fontStyle),
    textAlign: z.enum(ENUM_PROPS.textAlign),
    textOverflow: z.enum(ENUM_PROPS.textOverflow),
    borderStyle: z.enum(ENUM_PROPS.borderStyle),
    objectFit: z.enum(ENUM_PROPS.objectFit),
    animation: z.enum(ENUM_PROPS.animation),
  })
  .partial()
  .strict();
export type StyleProps = z.infer<typeof StyleProps>;
export type StyleProp = keyof StyleProps;
export type TokenProp = Exclude<StyleProp, EnumProp>;

export function isEnumProp(prop: StyleProp): prop is EnumProp {
  return prop in ENUM_PROPS;
}

export const PartStyle = z
  .object({
    base: StyleProps.optional(),
    states: z.partialRecord(ComponentState, StyleProps).optional(),
  })
  .strict();
export type PartStyle = z.infer<typeof PartStyle>;

// A recipe styles some of a component's parts. Layers merge in the order base, size, variant,
// intent, then combinations (most specific last), so a narrower layer always wins.
export const Recipe = z.record(z.string().min(1), PartStyle);
export type Recipe = z.infer<typeof Recipe>;

export const Selection = z
  .object({ variant: z.string().min(1), intent: z.string().min(1), size: z.string().min(1) })
  .partial()
  .strict();
export type Selection = z.infer<typeof Selection>;

const AXIS_NAMES = ["variant", "intent", "size"] as const;

// Styles for one combination of axis values ("solid and primary"). One axis alone is the variant,
// size or intent layer, so a combination names at least two.
export const Compound = z
  .object({
    when: Selection.refine((w) => AXIS_NAMES.filter((a) => w[a] !== undefined).length >= 2, {
      message: "a combination names at least two of variant, intent and size",
    }),
    recipe: Recipe,
  })
  .strict();
export type Compound = z.infer<typeof Compound>;

export const Axis = z
  .object({
    enabled: z.array(z.string().min(1)).min(1),
    default: z.string().min(1),
  })
  .strict()
  .refine((axis) => axis.enabled.includes(axis.default), { message: "the default option must be enabled" });
export type Axis = z.infer<typeof Axis>;

export const Anatomy = z
  .object({
    name: z.string().regex(/^[a-z][a-z0-9-]*$/),
    parts: z.array(z.string().min(1)).min(1),
    states: z.array(ComponentState),
    axes: z
      .object({
        variant: Axis.optional(),
        intent: Axis.optional(),
        size: Axis.optional(),
      })
      .strict(),
    base: Recipe,
    variants: z.record(z.string().min(1), Recipe),
    sizes: z.record(z.string().min(1), Recipe),
    // Keyed by intent name; an intent without an entry is styled by its tokens alone.
    intents: z.record(z.string().min(1), Recipe).default({}),
    compounds: z.array(Compound).default([]),
    // Component tokens, written under `<name>.*` if absent so user edits survive regeneration.
    tokens: TokenGroup,
  })
  .strict()
  .superRefine((anatomy, ctx) => {
    const parts = new Set(anatomy.parts);
    const checkRecipe = (recipe: Recipe, where: string) => {
      for (const part of Object.keys(recipe)) {
        if (!parts.has(part)) ctx.addIssue({ code: "custom", message: `${where} styles unknown part "${part}"` });
      }
    };
    checkRecipe(anatomy.base, "base");
    for (const [name, recipe] of Object.entries(anatomy.variants)) checkRecipe(recipe, `variant ${name}`);
    for (const [name, recipe] of Object.entries(anatomy.sizes)) checkRecipe(recipe, `size ${name}`);
    for (const [name, recipe] of Object.entries(anatomy.intents)) checkRecipe(recipe, `intent ${name}`);
    anatomy.compounds.forEach((c, i) => checkRecipe(c.recipe, `combination ${i + 1}`));
    for (const name of anatomy.axes.variant?.enabled ?? []) {
      if (!(name in anatomy.variants)) ctx.addIssue({ code: "custom", message: `variant "${name}" is enabled but has no recipe` });
    }
    for (const name of anatomy.axes.size?.enabled ?? []) {
      if (!(name in anatomy.sizes)) ctx.addIssue({ code: "custom", message: `size "${name}" is enabled but has no recipe` });
    }
  });
export type Anatomy = z.infer<typeof Anatomy>;

// shadcn's variant names, as variant + intent pairs. Generated components accept them so existing
// shadcn code keeps working, and a variant chosen without an intent gets the intent shadcn would give it.
export const SHADCN_VARIANT_ALIASES: Record<string, { variant: string; intent: string }> = {
  default: { variant: "solid", intent: "primary" },
  destructive: { variant: "solid", intent: "danger" },
  secondary: { variant: "soft", intent: "neutral" },
  outline: { variant: "outline", intent: "neutral" },
  ghost: { variant: "ghost", intent: "neutral" },
  link: { variant: "link", intent: "primary" },
};

export function defaultIntentFor(variant: string, fallback: string): string {
  return Object.values(SHADCN_VARIANT_ALIASES).find((a) => a.variant === variant)?.intent ?? fallback;
}

export type ResolvedPart = { base: StyleProps; states: Partial<Record<ComponentState, StyleProps>> };
export type ResolvedRecipe = Record<string, ResolvedPart>;

export function partOf(recipe: ResolvedRecipe, component: string, part: string): ResolvedPart {
  const found = recipe[part];
  if (found === undefined) throw new Error(`${component} has no part "${part}"`);
  return found;
}

function substitute(props: StyleProps, intent: string | undefined): StyleProps {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === "string" && value.includes(".*.")) {
      if (intent === undefined) throw new Error(`recipe uses ${value} but no intent was selected`);
      out[key] = value.replace(".*.", `.${intent}.`);
    } else {
      out[key] = value;
    }
  }
  // Not parsed again: the props came from a parsed recipe, and putting the intent's name into a
  // reference leaves it a reference. This runs for every option of every component (code, checks,
  // validation), where parsing each result was most of the time an edit took.
  return out as StyleProps;
}

function mergePart(target: ResolvedPart, style: PartStyle, intent: string | undefined): void {
  if (style.base !== undefined) Object.assign(target.base, substitute(style.base, intent));
  for (const [state, props] of Object.entries(style.states ?? {})) {
    const key = state as ComponentState;
    target.states[key] = { ...target.states[key], ...substitute(props, intent) };
  }
}

// Where a style lives: the whole component, one option of an axis, or a combination of options.
export const RecipeScope = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("all") }).strict(),
  z.object({ kind: z.literal("variant"), name: z.string().min(1) }).strict(),
  z.object({ kind: z.literal("size"), name: z.string().min(1) }).strict(),
  z.object({ kind: z.literal("intent"), name: z.string().min(1) }).strict(),
  z.object({ kind: z.literal("combination"), when: Compound.shape.when }).strict(),
]);
export type RecipeScope = z.infer<typeof RecipeScope>;

const axisCount = (s: Selection) => AXIS_NAMES.filter((a) => s[a] !== undefined).length;

export function sameSelection(a: Selection, b: Selection): boolean {
  return AXIS_NAMES.every((axis) => a[axis] === b[axis]);
}

// The selection with every unset axis filled in with its default.
export function fullSelection(anatomy: Anatomy, selection: Selection): Selection {
  const out: Selection = {};
  for (const axis of AXIS_NAMES) {
    const value = selection[axis] ?? anatomy.axes[axis]?.default;
    if (value !== undefined) out[axis] = value;
  }
  return out;
}

// The layers that apply to a selection, in the order they are merged (later wins).
export function layersFor(anatomy: Anatomy, selection: Selection): RecipeScope[] {
  const full = fullSelection(anatomy, selection);
  const layers: RecipeScope[] = [{ kind: "all" }];
  if (full.size !== undefined) layers.push({ kind: "size", name: full.size });
  if (full.variant !== undefined) layers.push({ kind: "variant", name: full.variant });
  if (full.intent !== undefined) layers.push({ kind: "intent", name: full.intent });
  const matching = anatomy.compounds.filter((c) => AXIS_NAMES.every((a) => c.when[a] === undefined || c.when[a] === full[a]));
  // Stable sort: equally specific combinations keep their order, so the later one wins.
  for (const c of [...matching].sort((a, b) => axisCount(a.when) - axisCount(b.when))) layers.push({ kind: "combination", when: c.when });
  return layers;
}

// The recipe a scope names, or undefined when that layer has no styles yet. Variants and sizes
// must exist; intent and combination layers are optional.
export function scopeRecipe(anatomy: Anatomy, scope: RecipeScope): Recipe | undefined {
  switch (scope.kind) {
    case "all":
      return anatomy.base;
    case "variant":
      return anatomy.variants[scope.name];
    case "size":
      return anatomy.sizes[scope.name];
    case "intent":
      return anatomy.intents[scope.name];
    case "combination":
      return anatomy.compounds.find((c) => sameSelection(c.when, scope.when))?.recipe;
  }
}

// Like scopeRecipe, but creates an empty intent or combination layer when missing. Mutates the anatomy.
export function ensureScopeRecipe(anatomy: Anatomy, scope: RecipeScope): Recipe {
  const found = scopeRecipe(anatomy, scope);
  if (found !== undefined) return found;
  if (scope.kind === "intent") return (anatomy.intents[scope.name] = {});
  if (scope.kind === "combination") {
    const recipe: Recipe = {};
    anatomy.compounds.push({ when: Compound.shape.when.parse(scope.when), recipe });
    return recipe;
  }
  const label = scope.kind === "all" ? "base" : `${scope.kind} "${scope.name}"`;
  throw new Error(`${anatomy.name} has no ${label}`);
}

// The props a scope sets for one part and state (undefined state = the default look).
export function scopeProps(anatomy: Anatomy, scope: RecipeScope, part: string, state: ComponentState | undefined): StyleProps | undefined {
  const style = scopeRecipe(anatomy, scope)?.[part];
  return state === undefined ? style?.base : style?.states?.[state];
}

// The layer whose value for `prop` wins for this selection, and that value.
export function owningLayer(
  anatomy: Anatomy,
  part: string,
  state: ComponentState | undefined,
  prop: StyleProp,
  selection: Selection,
): { scope: RecipeScope; value: string } | null {
  for (const scope of layersFor(anatomy, selection).reverse()) {
    const value = scopeProps(anatomy, scope, part, state)?.[prop];
    if (value !== undefined) return { scope, value };
  }
  return null;
}

// Flattens every layer into one style per part, with the intent substituted in.
export function resolveRecipe(anatomy: Anatomy, selection: Selection): ResolvedRecipe {
  const full = fullSelection(anatomy, selection);
  const out: ResolvedRecipe = {};
  for (const part of anatomy.parts) out[part] = { base: {}, states: {} };
  for (const scope of layersFor(anatomy, full)) {
    const recipe = scopeRecipe(anatomy, scope);
    if (recipe === undefined) {
      if (scope.kind === "variant" || scope.kind === "size") throw new Error(`${anatomy.name} has no ${scope.kind} "${scope.name}"`);
      continue;
    }
    for (const [part, style] of Object.entries(recipe)) mergePart(partOf(out, anatomy.name, part), style, full.intent);
  }
  return out;
}

// Every enabled combination of the component's axes.
export function enabledSelections(anatomy: Anatomy): Selection[] {
  const variants = anatomy.axes.variant?.enabled ?? [undefined];
  const intents = anatomy.axes.intent?.enabled ?? [undefined];
  const sizes = anatomy.axes.size?.enabled ?? [undefined];
  const out: Selection[] = [];
  for (const variant of variants) {
    for (const intent of intents) {
      for (const size of sizes) {
        const s: Selection = {};
        if (variant !== undefined) s.variant = variant;
        if (intent !== undefined) s.intent = intent;
        if (size !== undefined) s.size = size;
        out.push(s);
      }
    }
  }
  return out;
}

// The token type each style property must reference; wrong types would emit meaningless CSS.
export const PROP_TOKEN_TYPES: Record<TokenProp, TokenType> = {
  background: "color",
  foreground: "color",
  border: "color",
  ring: "color",
  ringOffsetColor: "color",
  borderWidth: "dimension",
  ringWidth: "dimension",
  ringOffset: "dimension",
  shadow: "shadow",
  radius: "dimension",
  padding: "dimension",
  paddingX: "dimension",
  paddingY: "dimension",
  gap: "dimension",
  height: "dimension",
  width: "dimension",
  minWidth: "dimension",
  maxWidth: "dimension",
  minHeight: "dimension",
  maxHeight: "dimension",
  size: "dimension",
  aspectRatio: "number",
  fontFamily: "fontFamily",
  fontSize: "dimension",
  lineHeight: "number",
  fontWeight: "fontWeight",
  letterSpacing: "dimension",
  opacity: "number",
  scale: "number",
  backdropBlur: "dimension",
  duration: "duration",
  easing: "cubicBezier",
};

function isTypedProp(prop: string): prop is keyof typeof PROP_TOKEN_TYPES {
  return prop in PROP_TOKEN_TYPES;
}

// Every problem the recipes of an anatomy would cause against a token tree, across all enabled
// combinations: references that do not exist and references to a token of the wrong type.
// Resolved recipes, remembered per component. A frozen component (the builder's are, by immer, and
// one nobody edited keeps its object from version to version) is remembered by identity; any
// other (a copy an edit is being made on) by its contents, so checking the whole system after an
// edit doesn't resolve every combination of every component again.
const byIdentity = new WeakMap<Anatomy, Map<string, ResolvedRecipe>>();
const byContent = new Map<string, Map<string, ResolvedRecipe>>();
const CONTENT_KEEP = 400;
function recipesOf(anatomy: Anatomy): Map<string, ResolvedRecipe> {
  if (Object.isFrozen(anatomy)) {
    let known = byIdentity.get(anatomy);
    if (known === undefined) byIdentity.set(anatomy, (known = new Map()));
    return known;
  }
  const key = JSON.stringify(anatomy);
  let known = byContent.get(key);
  if (known === undefined) {
    if (byContent.size >= CONTENT_KEEP) byContent.delete(byContent.keys().next().value!);
    byContent.set(key, (known = new Map()));
  }
  return known;
}
// For read-only use: the recipe is shared and frozen.
export function resolveRecipeCached(anatomy: Anatomy, selection: Selection, known = recipesOf(anatomy)): ResolvedRecipe {
  const key = `${selection.variant ?? ""}|${selection.intent ?? ""}|${selection.size ?? ""}`;
  let recipe = known.get(key);
  if (recipe === undefined) known.set(key, (recipe = deepFreeze(resolveRecipe(anatomy, selection))));
  return recipe;
}
function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

export function recipeProblems(anatomy: Anatomy, tokens: ReadonlyMap<string, Token>): string[] {
  const problems = new Set<string>();
  // The same value at the same place recurs across most combinations: each is checked once.
  const seen = new Set<string>();
  const known = recipesOf(anatomy);
  for (const selection of enabledSelections(anatomy)) {
    const recipe = resolveRecipeCached(anatomy, selection, known);
    for (const [part, style] of Object.entries(recipe)) {
      const check = (props: StyleProps, where: string) => {
        for (const [prop, value] of Object.entries(props)) {
          if (!isTokenRef(value)) continue;
          const key = `${where}\0${prop}\0${value}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const token = tokens.get(refPath(value));
          if (token === undefined) {
            problems.add(`${where}.${prop} references ${value}, which does not exist`);
          } else if (isTypedProp(prop) && token.$type !== PROP_TOKEN_TYPES[prop]) {
            problems.add(`${where}.${prop} needs a ${PROP_TOKEN_TYPES[prop]} token but ${value} is ${token.$type}`);
          }
        }
      };
      check(style.base, `${anatomy.name}.${part}`);
      for (const [state, props] of Object.entries(style.states)) if (props !== undefined) check(props, `${anatomy.name}.${part}.${state}`);
    }
  }
  return [...problems];
}

// All token references a resolved recipe uses, for validation against the token tree.
export function recipeRefs(recipe: ResolvedRecipe): TokenRef[] {
  const refs: TokenRef[] = [];
  const collect = (props: StyleProps) => {
    for (const value of Object.values(props)) {
      if (typeof value === "string" && TOKEN_REF_PATTERN.test(value)) refs.push(value);
    }
  };
  for (const part of Object.values(recipe)) {
    collect(part.base);
    for (const props of Object.values(part.states)) collect(props);
  }
  return refs;
}
