import { DEFAULT_MODE, type ModeContext, type ModeSelector } from "../modes";
import { jsonEqual } from "../patch";
import { tokenInContext } from "../resolve";
import { regenerate, type DesignSystem } from "../system";
import { flattenTokens, type Token, type TokenGroup } from "../tokens";
import { BRAND_KNOBS, opByName } from "./catalog";

// Brands: one system, several themes. A brand is the shared system with a few operations applied
// (its colors, fonts, corners). Every token that comes out different is written back into the
// shared tokens as a value for that brand's mode, in every mode the token has, so
// `[data-brand="kids"]` in the CSS (and every other output) carries the whole brand, dark and
// compact included, from the one token tree.

type Variant = { system: DesignSystem; problems: string[] };

// A plain copy. JSON rather than structuredClone: the builder runs this inside an immer draft,
// whose proxies can't be structured-cloned.
const copyOf = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

// Brand values are made here and nowhere else: they're taken out before they're made again.
export function withoutBrandModes(tokens: TokenGroup): void {
  for (const token of flattenTokens(tokens).values()) {
    if (token.$modes === undefined || !token.$modes.some((m) => m.selector.brand !== undefined)) continue;
    const kept = token.$modes.filter((m) => m.selector.brand === undefined);
    if (kept.length === 0) delete (token as { $modes?: unknown }).$modes;
    else (token as { $modes: typeof kept }).$modes = kept;
  }
}

// The shared system as a brand makes it: its operations applied to a copy, regenerated.
function variantOf(shared: DesignSystem, id: string): Variant {
  const brand = shared.brands?.[id];
  const copy = copyOf({ ...shared, brands: undefined }) as DesignSystem;
  const problems: string[] = [];
  for (const call of brand?.ops ?? []) {
    const op = call.op in BRAND_KNOBS ? opByName(call.op) : undefined;
    if (op === undefined) {
      problems.push(`${call.op} isn't something a brand can change`);
      continue;
    }
    try {
      op.run(copy, call.input);
    } catch (e) {
      problems.push(e instanceof Error ? e.message : String(e));
    }
  }
  regenerate(copy);
  return { system: copy, problems };
}

function contextFor(selector: ModeSelector): ModeContext {
  const context: ModeContext = { ...DEFAULT_MODE };
  if (selector.brand !== undefined) context.brand = selector.brand;
  if (selector.colorScheme !== undefined) context.colorScheme = selector.colorScheme;
  if (selector.density !== undefined) context.density = selector.density;
  if (selector.touch !== undefined) context.touch = selector.touch;
  return context;
}
const sameToken = (a: Token, b: Token) => jsonEqual(a.$value, b.$value) && jsonEqual(a.$modes ?? [], b.$modes ?? []);

type ModeValue = { selector: ModeSelector; value: unknown };
export type BrandModes = { values: Map<string, ModeValue[]>; problems: Record<string, string[]> };

// Every brand's values, by token path, without changing the system. Best called on a plain object
// (not an immer draft): it copies the system once per brand.
export function brandModes(system: DesignSystem): BrandModes {
  const values = new Map<string, ModeValue[]>();
  const problems: Record<string, string[]> = {};
  const ids = Object.keys(system.brands ?? {});
  if (ids.length === 0) return { values, problems };
  const stripped = copyOf(system);
  withoutBrandModes(stripped.tokens);
  const shared = flattenTokens(stripped.tokens);
  for (const id of ids) {
    const variant = variantOf(stripped, id);
    if (variant.problems.length > 0) problems[id] = variant.problems;
    for (const [path, mine] of flattenTokens(variant.system.tokens)) {
      const token = shared.get(path);
      if (token === undefined || sameToken(token, mine)) continue;
      // Every mode either copy has, plus the base, gets this brand's value for that mode.
      const selectors = new Map<string, ModeSelector>([["", {}]]);
      for (const m of [...(token.$modes ?? []), ...(mine.$modes ?? [])]) selectors.set(JSON.stringify(m.selector), m.selector);
      const entries = [...selectors.values()].map((selector) => ({ selector: { ...selector, brand: id }, value: tokenInContext(mine, contextFor(selector)).$value }));
      values.set(path, [...(values.get(path) ?? []), ...entries]);
    }
  }
  return { values, problems };
}

// Replaces the brand values in the system's tokens with these. Mutates the system.
export function writeBrandModes(system: DesignSystem, modes: BrandModes): void {
  withoutBrandModes(system.tokens);
  if (modes.values.size === 0) return;
  for (const [path, token] of flattenTokens(system.tokens)) {
    const entries = modes.values.get(path);
    if (entries !== undefined) (token as { $modes?: unknown[] }).$modes = [...(token.$modes ?? []), ...entries];
  }
}

// Writes every brand's values into the shared tokens. Call after `regenerate`. Mutates the system;
// returns what each brand couldn't apply (a palette since removed, say).
export function applyBrands(system: DesignSystem): Record<string, string[]> {
  const modes = brandModes(system);
  writeBrandModes(system, modes);
  return modes.problems;
}

// Whether any token carries brand values (left from brands since removed, say).
export function hasBrandModes(system: DesignSystem): boolean {
  for (const token of flattenTokens(system.tokens).values()) if (token.$modes?.some((m) => m.selector.brand !== undefined)) return true;
  return false;
}

// One brand as a system of its own, for outputs that take one theme (a native platform, a
// single-brand app): that brand's values are the defaults, and there are no other brands.
// "default" is the shared system without its brands.
export function systemForBrand(system: DesignSystem, id: string): DesignSystem {
  if (id === "default" || system.brands?.[id] === undefined) {
    const copy = copyOf(system);
    delete copy.brands;
    withoutBrandModes(copy.tokens);
    return copy;
  }
  const stripped = copyOf(system);
  withoutBrandModes(stripped.tokens);
  return variantOf(stripped, id).system;
}

export function brandProblems(system: DesignSystem): Record<string, string[]> {
  const problems: Record<string, string[]> = {};
  for (const id of Object.keys(system.brands ?? {})) {
    const stripped = copyOf(system);
    withoutBrandModes(stripped.tokens);
    const found = variantOf(stripped, id).problems;
    if (found.length > 0) problems[id] = found;
  }
  return problems;
}

// Regenerates the system and its brands: what every edit ends with.
export function rebuild(system: DesignSystem): void {
  regenerate(system);
  applyBrands(system);
}
