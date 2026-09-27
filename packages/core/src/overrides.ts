import { DEFAULT_ANATOMIES } from "./anatomies";
import { ComponentState, scopeProps, StyleProps, type Anatomy, type RecipeScope } from "./components";
import type { DesignSystem } from "./system";
import { flattenTokens } from "./tokens";

export type Overrides = {
  // Generated tokens set by hand.
  pinned: { path: string; value: unknown }[];
  // Style changes against tesserai's defaults, one line each.
  components: { component: string; changes: string[] }[];
  excluded: string[];
};

const PROPS = StyleProps.keyof().options;
const STATES: (ComponentState | undefined)[] = [undefined, ...ComponentState.options];

function scopeName(scope: RecipeScope): string {
  if (scope.kind === "all") return "all";
  if (scope.kind === "combination") return Object.values(scope.when).filter((v) => v !== undefined).join(" ");
  return scope.name;
}

// Every layer an anatomy has styles in.
function scopesOf(anatomy: Anatomy): RecipeScope[] {
  return [
    { kind: "all" },
    ...Object.keys(anatomy.sizes).map((name): RecipeScope => ({ kind: "size", name })),
    ...Object.keys(anatomy.variants).map((name): RecipeScope => ({ kind: "variant", name })),
    ...Object.keys(anatomy.intents).map((name): RecipeScope => ({ kind: "intent", name })),
    ...anatomy.compounds.map((c): RecipeScope => ({ kind: "combination", when: c.when })),
  ];
}

function componentChanges(anatomy: Anatomy, original: Anatomy | undefined): string[] {
  const changes: string[] = [];
  for (const axis of ["variant", "intent", "size"] as const) {
    const now = anatomy.axes[axis];
    const was = original?.axes[axis];
    if (JSON.stringify(now?.enabled) !== JSON.stringify(was?.enabled)) changes.push(`${axis} options: ${now?.enabled.join(", ") ?? "none"}`);
    if (now?.default !== was?.default) changes.push(`default ${axis}: ${now?.default ?? "none"}`);
  }
  const seen = new Set<string>();
  for (const scope of [...scopesOf(anatomy), ...(original === undefined ? [] : scopesOf(original))]) {
    const key = JSON.stringify(scope);
    if (seen.has(key)) continue;
    seen.add(key);
    for (const part of anatomy.parts) {
      for (const state of STATES) {
        const now = scopeProps(anatomy, scope, part, state) ?? {};
        const was = original === undefined ? {} : (scopeProps(original, scope, part, state) ?? {});
        for (const prop of PROPS) {
          if (now[prop] === was[prop]) continue;
          const where = `${scopeName(scope)} ${part}${state === undefined ? "" : ` ${state}`} ${prop}`;
          changes.push(now[prop] === undefined ? `${where}: removed (was ${was[prop]})` : `${where}: ${now[prop]}${was[prop] === undefined ? "" : ` (was ${was[prop]})`}`);
        }
      }
    }
  }
  return changes;
}

// What has been customised in a system relative to what tesserai generates: the answer to "what
// have I changed?". Palette seeds, scales and fonts are the system's own settings, not overrides.
export function listOverrides(system: DesignSystem): Overrides {
  const pinned = [...flattenTokens(system.tokens)].filter(([, t]) => t.$meta?.pinned === true).map(([path, t]) => ({ path, value: t.$value }));
  const components = Object.entries(system.components)
    .map(([name, anatomy]) => ({ component: name, changes: componentChanges(anatomy, DEFAULT_ANATOMIES[name]) }))
    .filter((c) => c.changes.length > 0);
  return { pinned, components, excluded: [...system.excluded] };
}
