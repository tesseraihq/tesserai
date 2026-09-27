import { z } from "zod";
import {
  ComponentState,
  ENUM_PROPS,
  enabledSelections,
  ensureScopeRecipe,
  isEnumProp,
  layersFor,
  PROP_TOKEN_TYPES,
  RECIPE_REF_PATTERN,
  RecipeScope,
  scopeProps,
  scopeRecipe,
  StyleProps,
  type ComponentState as State,
  type Selection,
  type Anatomy,
  type Recipe,
  type StyleProp,
  type TokenProp,
} from "../components";
import { LITERAL_HINTS, parseLiteral } from "../literal";
import { ModeSelector } from "../modes";
import type { DesignSystem } from "../system";
import { deleteToken, getToken, isTokenRef, refPath, setToken, toRef, Token, type TokenType } from "../tokens";
import { OpError } from "./define";

// A mode a style applies in. Brand is left out: multi-brand is not a builder feature yet.
export const StyleMode = ModeSelector.omit({ brand: true }).refine((m) => Object.keys(m).length > 0, { message: "name at least one of colorScheme, density, touch" });
export type StyleMode = z.infer<typeof StyleMode>;

export const SetStyleInput = z
  .object({
    component: z.string().min(1),
    part: z.string().min(1),
    scope: RecipeScope,
    state: z.union([z.literal("default"), ComponentState]).default("default"),
    property: StyleProps.keyof(),
    // A reference ({radius.lg}, {intent.*.solid}), a plain value ("4px", "#e11d48", "600",
    // "150ms"), one of a property's words ("uppercase"), or null to remove.
    value: z.string().min(1).nullable(),
    mode: StyleMode.optional(),
  })
  .strict();
export type SetStyleInput = z.infer<typeof SetStyleInput>;

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function scopeSlug(scope: RecipeScope): string[] {
  switch (scope.kind) {
    case "all":
      return [];
    case "variant":
    case "size":
    case "intent":
      return [scope.name];
    case "combination":
      return (["variant", "intent", "size"] as const).flatMap((axis) => {
        const value = scope.when[axis];
        return value === undefined ? [] : [value];
      });
  }
}

// Where a component's own value for one property lives: button.custom.root-radius-primary-hover.
function customName(input: SetStyleInput): string {
  return [input.part, kebab(input.property), ...scopeSlug(input.scope), ...(input.state === "default" ? [] : [input.state])].join("-");
}

// Every token reference any layer of the anatomy uses.
function referencedPaths(anatomy: Anatomy): Set<string> {
  const out = new Set<string>();
  const recipes: Recipe[] = [anatomy.base, ...Object.values(anatomy.variants), ...Object.values(anatomy.sizes), ...Object.values(anatomy.intents), ...anatomy.compounds.map((c) => c.recipe)];
  for (const recipe of recipes) {
    for (const style of Object.values(recipe)) {
      for (const props of [style.base, ...Object.values(style.states ?? {})]) {
        for (const value of Object.values(props ?? {})) if (isTokenRef(value)) out.add(refPath(value));
      }
    }
  }
  return out;
}

// Custom tokens nothing references any more are deleted, so they do not pile up.
function pruneCustom(system: DesignSystem, anatomy: Anatomy): void {
  const used = referencedPaths(anatomy);
  const custom = anatomy.tokens["custom"];
  if (custom === undefined || "$type" in custom) return;
  for (const name of Object.keys(custom)) {
    const path = `${anatomy.name}.custom.${name}`;
    if (used.has(path)) continue;
    deleteToken(anatomy.tokens, `custom.${name}`);
    deleteToken(system.tokens, path);
  }
}

// The value a property takes outside a mode when it was not set at all: whatever "not there" looks like.
function neutralValue(prop: TokenProp, type: TokenType): unknown {
  if (type === "color") return { l: 0, c: 0, h: 0, alpha: 0 };
  if (type === "dimension") return { value: 0, unit: "px" };
  if (type === "shadow") return [{ offsetX: { value: 0, unit: "px" }, offsetY: { value: 0, unit: "px" }, blur: { value: 0, unit: "px" }, spread: { value: 0, unit: "px" }, color: { l: 0, c: 0, h: 0, alpha: 0 } }];
  if (prop === "opacity" || prop === "scale") return 1;
  throw new OpError(`${prop} has no value outside that mode yet; give it a normal value first`);
}

// A reference or a plain value, as a token value of the given type.
function tokenValue(prop: TokenProp, type: TokenType, value: string, intent: string | undefined): unknown {
  if (RECIPE_REF_PATTERN.test(value)) {
    if (!value.includes(".*.")) return value;
    if (intent === undefined) throw new OpError(`${value} follows the component's intent, which a single value cannot; set it for one intent (scope intent) or use a specific token`);
    return value.replace(".*.", `.${intent}.`);
  }
  const parsed = parseLiteral(type, value);
  if (parsed === undefined) throw new OpError(`${prop} takes ${LITERAL_HINTS[type]}; "${value}" is not one`);
  return parsed;
}

function makeToken(path: string, type: TokenType, fields: Record<string, unknown>): Token {
  const parsed = Token.safeParse({ $type: type, ...fields });
  if (!parsed.success) throw new OpError(`${path}: ${parsed.error.issues[0]?.message ?? "invalid value"}`);
  return parsed.data;
}

function sameMode(a: Record<string, unknown>, b: StyleMode): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const bRecord: Record<string, unknown> = b;
  return [...keys].every((k) => a[k] === bRecord[k]);
}

function checkScope(system: DesignSystem, anatomy: Anatomy, scope: RecipeScope): void {
  const known = (axis: "variant" | "intent" | "size", name: string) => {
    const options = axis === "variant" ? Object.keys(anatomy.variants) : axis === "size" ? Object.keys(anatomy.sizes) : Object.keys(system.intents);
    if (!options.includes(name)) throw new OpError(`${anatomy.name} has no ${axis} "${name}"; ${axis}s are ${options.join(", ")}`);
  };
  if (scope.kind === "variant" || scope.kind === "size" || scope.kind === "intent") known(scope.kind, scope.name);
  if (scope.kind === "combination") {
    for (const axis of ["variant", "intent", "size"] as const) {
      const value = scope.when[axis];
      if (value !== undefined) known(axis, value);
    }
  }
}

// The intent a scope fixes, which lets an intent-following reference be pinned to one intent.
function scopeIntent(scope: RecipeScope): string | undefined {
  if (scope.kind === "intent") return scope.name;
  if (scope.kind === "combination") return scope.when.intent;
  return undefined;
}

function sameScope(a: RecipeScope, b: RecipeScope): boolean {
  return JSON.stringify(RecipeScope.parse(a)) === JSON.stringify(RecipeScope.parse(b));
}

function inScope(scope: RecipeScope, selection: Selection): boolean {
  switch (scope.kind) {
    case "all":
      return true;
    case "variant":
    case "size":
    case "intent":
      return selection[scope.kind] === scope.name;
    case "combination":
      return (["variant", "intent", "size"] as const).every((axis) => scope.when[axis] === undefined || scope.when[axis] === selection[axis]);
  }
}

// What a property looks like where a scope applies, from the layers beneath it: the value a
// mode-only change must keep outside the mode. A state that sets nothing shows the default look.
// Undefined when nothing sets it; an error when it differs across the scope (it varies by size, say).
function valueBeneath(anatomy: Anatomy, scope: RecipeScope, part: string, state: State | undefined, prop: StyleProp): string | undefined {
  const values = new Set<string | undefined>();
  for (const selection of enabledSelections(anatomy).filter((s) => inScope(scope, s))) {
    const layers = layersFor(anatomy, selection);
    const at = layers.findIndex((l) => sameScope(l, scope));
    let own: string | undefined;
    let base: string | undefined;
    for (const layer of at === -1 ? layers : layers.slice(0, at)) {
      own = scopeProps(anatomy, layer, part, state)?.[prop] ?? own;
      base = scopeProps(anatomy, layer, part, undefined)?.[prop] ?? base;
    }
    values.add(state === undefined ? base : (own ?? scopeProps(anatomy, scope, part, undefined)?.[prop] ?? base));
  }
  if (values.size > 1) throw new OpError(`${prop} is not the same everywhere in this scope (it differs by variant, intent or size); pick a narrower scope`);
  return [...values][0];
}

export function applySetStyle(system: DesignSystem, anatomy: Anatomy, input: SetStyleInput): void {
  if (!anatomy.parts.includes(input.part)) throw new OpError(`${anatomy.name} has no part "${input.part}"; parts are ${anatomy.parts.join(", ")}`);
  checkScope(system, anatomy, input.scope);
  const prop: StyleProp = input.property;
  const state = input.state === "default" ? undefined : input.state;

  if (input.value === null && input.mode === undefined && scopeRecipe(anatomy, input.scope) === undefined) return;
  const recipe = ensureScopeRecipe(anatomy, input.scope);
  const partStyle = (recipe[input.part] ??= {});
  const target = state === undefined ? (partStyle.base ??= {}) : ((partStyle.states ??= {})[state] ??= {});
  const previous = target[prop];

  const write = (value: string | undefined) => {
    const next: Record<string, unknown> = { ...target };
    if (value === undefined) delete next[prop];
    else next[prop] = value;
    const parsed = StyleProps.safeParse(next);
    if (!parsed.success) throw new OpError(`${prop}: ${parsed.error.issues[0]?.message ?? "invalid value"}`);
    for (const key of Object.keys(target)) delete target[StyleProps.keyof().parse(key)];
    Object.assign(target, parsed.data);
  };

  if (isEnumProp(prop)) {
    if (input.mode !== undefined) throw new OpError(`${prop} is one word for every mode; modes apply to properties with values`);
    const words: readonly string[] = ENUM_PROPS[prop];
    if (input.value !== null && !words.includes(input.value)) throw new OpError(`${prop} is one of ${words.join(", ")}`);
    write(input.value ?? undefined);
  } else {
    const type = PROP_TOKEN_TYPES[prop];
    const name = customName(input);
    const path = `${anatomy.name}.custom.${name}`;
    const ownPath = `custom.${name}`;
    const intent = scopeIntent(input.scope);

    if (input.mode === undefined) {
      if (input.value === null) write(undefined);
      else if (RECIPE_REF_PATTERN.test(input.value)) write(input.value);
      else {
        const token = makeToken(path, type, { $value: tokenValue(prop, type, input.value, intent) });
        setToken(anatomy.tokens, ownPath, token);
        setToken(system.tokens, path, token);
        write(toRef(path));
      }
    } else {
      const mode = input.mode;
      const existing = previous === toRef(path) ? getToken(anatomy.tokens, ownPath) : undefined;
      const beneath = previous ?? valueBeneath(anatomy, input.scope, input.part, state, prop);
      const normal = existing?.$value ?? (beneath === undefined ? neutralValue(prop, type) : tokenValue(prop, type, beneath, intent));
      const others = (existing?.$modes ?? []).filter((m) => !sameMode(m.selector, mode));
      const modes = input.value === null ? others : [...others, { selector: mode, value: tokenValue(prop, type, input.value, intent) }];
      const token = makeToken(path, type, { $value: normal, ...(modes.length > 0 ? { $modes: modes } : {}) });
      setToken(anatomy.tokens, ownPath, token);
      setToken(system.tokens, path, token);
      write(toRef(path));
    }
  }
  pruneCustom(system, anatomy);
}

export function describeScope(scope: RecipeScope): string {
  switch (scope.kind) {
    case "all":
      return "all";
    case "variant":
    case "size":
    case "intent":
      return scope.name;
    case "combination":
      return scopeSlug(scope).join(" ");
  }
}

export function describeMode(mode: StyleMode | undefined): string {
  if (mode === undefined) return "";
  const parts = [
    mode.colorScheme === undefined ? undefined : `${mode.colorScheme} mode`,
    mode.density === undefined ? undefined : `${mode.density} density`,
    mode.touch === undefined ? undefined : mode.touch ? "on touch" : "without touch",
  ].filter((p) => p !== undefined);
  return ` in ${parts.join(", ")}`;
}
