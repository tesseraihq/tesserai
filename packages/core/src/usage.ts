import { includedComponents, type DesignSystem } from "./system";
import { flattenTokens, isTokenRef, refPath, type Token } from "./tokens";

// Every token path a token's value (in any mode) points at directly.
function referencesOf(token: Token): string[] {
  const out: string[] = [];
  const visit = (value: unknown) => {
    if (isTokenRef(value)) out.push(refPath(value));
    else if (Array.isArray(value)) value.forEach(visit);
    else if (typeof value === "object" && value !== null) Object.values(value).forEach(visit);
  };
  visit(token.$value);
  for (const mode of token.$modes ?? []) visit(mode.value);
  return out;
}

export type Usage = {
  // Tokens that depend on the path, directly or through other tokens, nearest first.
  tokens: string[];
  // Components whose styling ends up using the path, through a component token, a direct recipe
  // reference, or an intent wildcard ({intent.*.role}) for an intent the component has enabled.
  components: string[];
};

// What changes when the token at `path` changes. Used to show "used by" before someone edits a
// single step, so a one-off override is never a surprise.
export function usageOf(system: DesignSystem, path: string): Usage {
  return usageOfAll(system, [path]);
}

// The same for several tokens at once (one pass however many changed).
export function usageOfAll(system: DesignSystem, paths: readonly string[]): Usage {
  const flat = flattenTokens(system.tokens);
  const dependents = new Map<string, string[]>();
  for (const [p, token] of flat) {
    for (const target of referencesOf(token)) {
      const list = dependents.get(target);
      if (list === undefined) dependents.set(target, [p]);
      else list.push(p);
    }
  }

  const tokens: string[] = [];
  const seen = new Set(paths);
  const queue = [...paths];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    for (const next of dependents.get(current) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      tokens.push(next);
      queue.push(next);
    }
  }

  const components: string[] = [];
  for (const [name, anatomy] of Object.entries(includedComponents(system))) {
    const recipes = JSON.stringify([anatomy.base, anatomy.sizes, anatomy.variants, anatomy.intents, anatomy.compounds]);
    const intents = anatomy.axes.intent?.enabled ?? [];
    const uses = [...seen].some((p) => {
      if (p.startsWith(`${name}.`)) return true;
      if (recipes.includes(`{${p}}`)) return true;
      const intent = /^intent\.([^.]+)\.(.+)$/.exec(p);
      return intent !== null && intents.includes(intent[1] ?? "") && recipes.includes(`{intent.*.${intent[2]}}`);
    });
    if (uses) components.push(name);
  }
  return { tokens, components };
}
