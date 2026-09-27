import { StyleProps, type Anatomy } from "../components";
import type { DesignSystem } from "../system";
import { flattenTokens, isTokenRef, refPath, setToken, toRef, Token, type TokenGroup } from "../tokens";

// Rewrites every reference in a system: token values (in every mode), recipes and component tokens.
// `map` receives a referenced path and returns the new path, or undefined to leave it alone.
// Rewritten tokens and recipes are parsed again, so the result is validated rather than assumed.
export function remapRefs(system: DesignSystem, map: (path: string) => string | undefined): number {
  let changed = 0;
  const rewrite = (value: unknown): unknown => {
    if (isTokenRef(value)) {
      const next = map(refPath(value));
      if (next === undefined || next === refPath(value)) return value;
      changed++;
      return toRef(next);
    }
    if (Array.isArray(value)) return value.map(rewrite);
    if (typeof value === "object" && value !== null) {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) out[k] = rewrite(v);
      return out;
    }
    return value;
  };
  rewriteGroup(system.tokens, rewrite);
  for (const anatomy of Object.values(system.components)) rewriteAnatomy(anatomy, rewrite);
  return changed;
}

function rewriteGroup(group: TokenGroup, rewrite: (value: unknown) => unknown): void {
  for (const [path, token] of flattenTokens(group)) {
    const next = Token.parse({
      ...token,
      $value: rewrite(token.$value),
      ...(token.$modes === undefined ? {} : { $modes: token.$modes.map((m) => ({ ...m, value: rewrite(m.value) })) }),
    });
    setToken(group, path, next);
  }
}

function rewriteAnatomy(anatomy: Anatomy, rewrite: (value: unknown) => unknown): void {
  const recipes = [anatomy.base, ...Object.values(anatomy.variants), ...Object.values(anatomy.sizes), ...Object.values(anatomy.intents), ...anatomy.compounds.map((c) => c.recipe)];
  for (const recipe of recipes) {
    for (const style of Object.values(recipe)) {
      if (style.base !== undefined) style.base = StyleProps.parse(rewrite(style.base));
      const states = style.states;
      if (states === undefined) continue;
      for (const [state, props] of Object.entries(states)) {
        const parsed = StyleProps.parse(rewrite(props));
        Object.assign(states, { [state]: parsed });
      }
    }
  }
  rewriteGroup(anatomy.tokens, rewrite);
}
