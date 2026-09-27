import type { DesignSystem } from "../system";
import { rebuild } from "./brands";
import { deleteToken, flattenTokens, setToken, type Token } from "../tokens";

// Undoes one earlier step without undoing what came after it: a three-way revert. Each thing the
// step changed goes back to how it was before the step, but only if it still holds the value the
// step gave it. Anything changed again since is left alone and reported, never overwritten.

export type RevertResult = {
  system: DesignSystem;
  // What went back: token paths, "generator <id>", "meaning <name>", component names, "brand <id>",
  // "page <id>", "font <family>", "left out <component>", "icons", "name", "library", "framework", "class prefix".
  reverted: string[];
  // What had changed again since the step, so it was kept.
  clashed: string[];
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const essence = (t: Token | undefined) => (t === undefined ? undefined : { $value: t.$value, $modes: t.$modes });

// `only` narrows the revert to some of the step ("the radius but not the shadow"): token path
// prefixes, component names, "generator <id>" or "meaning <name>".
export function revertStep(current: DesignSystem, before: DesignSystem, after: DesignSystem, only?: readonly string[]): RevertResult {
  const draft: DesignSystem = JSON.parse(JSON.stringify(current));
  const reverted: string[] = [];
  const clashed: string[] = [];
  const wanted = (key: string) =>
    only === undefined || only.some((o) => key === o || key.startsWith(`${o}.`) || key.endsWith(` ${o}`));

  // Records: generators, meanings and components move back whole.
  const records = <T,>(label: (k: string) => string, pick: (s: DesignSystem) => Record<string, T>) => {
    const b = pick(before);
    const a = pick(after);
    const c = pick(draft);
    for (const key of new Set([...Object.keys(b), ...Object.keys(a)])) {
      if (same(b[key], a[key]) || !wanted(label(key))) continue;
      if (!same(c[key], a[key])) {
        clashed.push(label(key));
        continue;
      }
      if (b[key] === undefined) delete c[key];
      else c[key] = JSON.parse(JSON.stringify(b[key])) as T;
      reverted.push(label(key));
    }
  };
  records((k) => `generator ${k}`, (s) => s.generators);
  records((k) => `meaning ${k}`, (s) => s.intents);
  records((k) => k, (s) => s.components);
  // Brands, pages and fonts move back whole too; a step that added one takes it away again.
  const optional = <T,>(pick: (s: DesignSystem) => Record<string, T> | undefined, set: (s: DesignSystem, v: Record<string, T>) => void) => (s: DesignSystem) => {
    let found = pick(s);
    if (found === undefined) {
      found = {};
      if (s === draft) set(s, found);
    }
    return found;
  };
  records((k) => `brand ${k}`, optional((s) => s.brands, (s, v) => (s.brands = v)));
  records((k) => `page ${k}`, optional((s) => s.pages, (s, v) => (s.pages = v)));
  records((k) => `font ${k}`, optional((s) => s.fonts, (s, v) => (s.fonts = v)));
  for (const field of ["brands", "pages", "fonts"] as const) if (draft[field] !== undefined && Object.keys(draft[field]!).length === 0) delete draft[field];

  // Components left out or brought back, one at a time.
  for (const component of new Set([...before.excluded, ...after.excluded])) {
    const was = before.excluded.includes(component);
    if (was === after.excluded.includes(component) || !wanted(`left out ${component}`) || !wanted(component)) continue;
    const now = draft.excluded.includes(component);
    if (now !== after.excluded.includes(component)) clashed.push(`left out ${component}`);
    else {
      draft.excluded = was ? [...draft.excluded, component] : draft.excluded.filter((c) => c !== component);
      reverted.push(`left out ${component}`);
    }
  }
  // What the team keeps its own way, as one thing.
  if (!same(before.kept, after.kept) && wanted("kept")) {
    if (!same(draft.kept, after.kept)) clashed.push("kept");
    else {
      if (before.kept === undefined) delete draft.kept;
      else draft.kept = JSON.parse(JSON.stringify(before.kept)) as NonNullable<DesignSystem["kept"]>;
      reverted.push("kept");
    }
  }
  // The icon settings as one thing.
  if (!same(before.icons, after.icons) && wanted("icons")) {
    if (!same(draft.icons, after.icons)) clashed.push("icons");
    else {
      if (before.icons === undefined) delete draft.icons;
      else draft.icons = JSON.parse(JSON.stringify(before.icons)) as NonNullable<DesignSystem["icons"]>;
      reverted.push("icons");
    }
  }

  // Generated tokens follow their generators (and brands' values follow the brands); everything
  // else is reverted token by token.
  rebuild(draft);
  const b = flattenTokens(before.tokens);
  const a = flattenTokens(after.tokens);
  const c = flattenTokens(draft.tokens);
  for (const path of new Set([...b.keys(), ...a.keys()])) {
    const was = b.get(path);
    const became = a.get(path);
    if (same(essence(was), essence(became)) || !wanted(path)) continue;
    const now = c.get(path);
    if (same(essence(now), essence(was))) continue; // already back, e.g. regenerated
    if (!same(essence(now), essence(became))) {
      clashed.push(path);
      continue;
    }
    if (was === undefined) deleteToken(draft.tokens, path);
    else setToken(draft.tokens, path, JSON.parse(JSON.stringify(was)) as Token);
    reverted.push(path);
  }

  for (const [field, label] of [["name", "name"], ["base", "library"], ["framework", "framework"], ["tailwindPrefix", "class prefix"]] as const) {
    if (before[field] === after[field] || !wanted(label)) continue;
    if (draft[field] !== after[field]) clashed.push(label);
    else {
      if (before[field] === undefined) delete (draft as Partial<DesignSystem>)[field];
      else (draft as Record<typeof field, string | undefined>)[field] = before[field];
      reverted.push(label);
    }
  }
  // Generated tokens, and each brand's values on top of them.
  rebuild(draft);
  return { system: draft, reverted, clashed };
}
