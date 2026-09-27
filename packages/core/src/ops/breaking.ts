import { componentName } from "../component-groups";
import { includedComponents, outputTokens, type DesignSystem } from "../system";
import { flattenTokens } from "../tokens";

// What would break code that already uses a system: a component taken out, an option removed (a
// prop value stops type-checking), a token removed (its variable and class stop working), or the
// component library switched. A new default or a new color changes how things look, not whether
// code compiles, so it isn't here.

export type Breaking = { kind: "base" | "prefix" | "component" | "option" | "token"; text: string };

const AXES = ["variant", "intent", "size"] as const;

export function breakingChanges(before: DesignSystem, after: DesignSystem): Breaking[] {
  const out: Breaking[] = [];
  if (before.base !== after.base) out.push({ kind: "base", text: `Components move from ${before.base} to ${after.base}: every component file is rewritten, and code using their library-specific props needs changes.` });
  // Every utility class is renamed: classes written in the project's own code stop matching.
  if (before.tailwindPrefix !== after.tailwindPrefix) {
    const name = (p: string | undefined) => (p === undefined ? "no prefix" : `the prefix ${p}:`);
    out.push({ kind: "prefix", text: `Tailwind classes change from ${name(before.tailwindPrefix)} to ${name(after.tailwindPrefix)}: classes written in your own code (bg-primary and the like) need the new form.` });
  }
  const was = includedComponents(before);
  const now = includedComponents(after);
  for (const name of Object.keys(was)) {
    const title = componentName(name);
    if (!(name in now)) {
      out.push({ kind: "component", text: `${title} is taken out: imports of @/components/ui/${name} stop working.` });
      continue;
    }
    for (const axis of AXES) {
      const gone = (was[name]!.axes[axis]?.enabled ?? []).filter((o) => !(now[name]!.axes[axis]?.enabled ?? []).includes(o));
      for (const o of gone) out.push({ kind: "option", text: `${title} no longer has the ${axis} ${o}: <${title.replace(/\s+/g, "")} ${axis}="${o}"> stops type-checking.` });
    }
  }
  // Tokens: a family that went together (a palette, a component's own) is one line.
  const a = flattenTokens(outputTokens(before));
  const b = flattenTokens(outputTokens(after));
  const removed = [...a.keys()].filter((p) => !b.has(p) && !Object.keys(was).some((c) => p.startsWith(`${c}.`) && !(c in now)));
  const families = new Map<string, string[]>();
  for (const path of removed) {
    const family = path.split(".").slice(0, -1).join(".") || path;
    families.set(family, [...(families.get(family) ?? []), path]);
  }
  for (const [family, paths] of families) {
    const whole = ![...b.keys()].some((p) => p.startsWith(`${family}.`));
    if (paths.length > 2 && whole) out.push({ kind: "token", text: `The tokens ${family}.* (${paths.length}) are gone: their CSS variables and classes stop working.` });
    else for (const p of paths) out.push({ kind: "token", text: `The token ${p} is gone: var(--${p.replace(/\./g, "-")}) and its class stop working.` });
  }
  return out;
}
