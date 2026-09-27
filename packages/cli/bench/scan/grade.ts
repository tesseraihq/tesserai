// Grades a `scan` against a fixture's hand-written truth (docs/scan-plan.md). Every area is graded
// the same way whatever produced the result, so the scan from before this work gets a real score
// too: a field it doesn't have scores what its absence is worth, usually nothing.
import { includedComponents, type DesignSystem } from "@tesserai/core";

export type Truth = {
  framework: string;
  usage: Record<string, { uses: number; files: number }>;
  // Per component and axis: uses of each option, a use without the prop counting for the default;
  // "~dynamic" is the uses set from an expression.
  options: Record<string, Record<string, Record<string, number>>>;
  overrides: { file: string; line: number; component: string; kinds: string[] }[];
  placementOnly: { file: string; line: number; component: string }[];
  suggestions: { component: string; class: string; count: number }[];
  edited: string[];
};

// What a scan is read as. All optional: the grader reads what's there.
type Scanned = {
  components?: { name: string; uses?: number; files?: number; options?: Record<string, Record<string, number>>; dynamic?: Record<string, number>; props?: Record<string, Record<string, number>> }[];
  unused?: string[];
  unusedOptions?: { component: string; axis: string; value: string; certain: boolean }[];
  overrides?: { component: string; sites?: { file: string; line: number; kinds: string[] }[] }[];
  suggestions?: { component: string; class: string; count: number }[];
  edited?: ({ file: string } | string)[];
};

export type Grade = { score: number; areas: Record<string, number>; problems: string[] };

const WEIGHTS = { usage: 20, options: 20, overrides: 35, suggestions: 10, edited: 15 } as const;

// Two counts as a share: equal is 1, one of them 0 is 0.
const ratio = (a: number | undefined, b: number | undefined) => {
  const x = a ?? 0;
  const y = b ?? 0;
  if (x === y) return 1;
  if (x <= 0 || y <= 0) return 0;
  return Math.min(x, y) / Math.max(x, y);
};
const mean = (xs: number[]) => (xs.length === 0 ? 1 : xs.reduce((a, b) => a + b, 0) / xs.length);
// F1 of two sets of keys; both empty is right.
function f1(truth: Set<string>, got: Set<string>, problems: string[], what: string): number {
  if (truth.size === 0 && got.size === 0) return 1;
  const hit = [...got].filter((k) => truth.has(k)).length;
  for (const k of truth) if (!got.has(k)) problems.push(`${what}: missed ${k}`);
  for (const k of got) if (!truth.has(k)) problems.push(`${what}: wrongly ${k}`);
  if (hit === 0) return 0;
  const p = hit / got.size;
  const r = hit / truth.size;
  return (2 * p * r) / (p + r);
}

export function gradeScan(raw: unknown, truth: Truth, system: DesignSystem): Grade {
  const scanned = raw as Scanned;
  const problems: string[] = [];
  const components = new Map((scanned.components ?? []).map((c) => [c.name, c]));
  const anatomies = includedComponents(system);

  // --- Usage: uses and files per component, and the components never used.
  const names = new Set([...Object.keys(truth.usage), ...components.keys()]);
  const uses = mean(
    [...names].map((n) => {
      const r = ratio(truth.usage[n]?.uses, components.get(n)?.uses);
      if (r < 1) problems.push(`usage: ${n} uses ${components.get(n)?.uses ?? "?"} vs ${truth.usage[n]?.uses ?? 0}`);
      return r;
    }),
  );
  const files = mean(
    [...names].map((n) => {
      const r = ratio(truth.usage[n]?.files, components.get(n)?.files);
      if (r < 1) problems.push(`usage: ${n} in ${components.get(n)?.files ?? "?"} files vs ${truth.usage[n]?.files ?? 0}`);
      return r;
    }),
  );
  const neverTruth = new Set(Object.keys(anatomies).filter((n) => truth.usage[n] === undefined));
  const never = f1(neverTruth, new Set(scanned.unused ?? []), problems, "never used");
  const usage = 0.4 * uses + 0.3 * files + 0.3 * never;

  // --- Options: each option's uses (defaults included, dynamic uses as "~dynamic"), and the
  // options certainly never used.
  const counted = new Map<string, number>();
  for (const [component, axes] of Object.entries(truth.options)) for (const [axis, values] of Object.entries(axes)) for (const [value, n] of Object.entries(values)) counted.set(`${component}.${axis}.${value}`, n);
  const got = new Map<string, number>();
  for (const c of scanned.components ?? []) {
    const options = c.options ?? c.props ?? {};
    for (const [axis, values] of Object.entries(options)) for (const [value, n] of Object.entries(values)) got.set(`${c.name}.${axis}.${value}`, n);
    for (const [axis, n] of Object.entries(c.dynamic ?? {})) if (n > 0) got.set(`${c.name}.${axis}.~dynamic`, n);
  }
  const optionKeys = new Set([...counted.keys(), ...got.keys()].filter((k) => truth.usage[k.split(".")[0]!] !== undefined));
  const counts = mean(
    [...optionKeys].map((k) => {
      const r = ratio(counted.get(k), got.get(k));
      if (r < 1) problems.push(`options: ${k} ${got.get(k) ?? 0} vs ${counted.get(k) ?? 0}`);
      return r;
    }),
  );
  const unusedTruth = new Set<string>();
  for (const [component, axes] of Object.entries(truth.options)) {
    const anatomy = anatomies[component];
    if (anatomy === undefined) continue;
    for (const [axis, def] of Object.entries(anatomy.axes)) {
      const values = axes[axis] ?? {};
      if ((values["~dynamic"] ?? 0) > 0) continue;
      for (const option of def?.enabled ?? []) if ((values[option] ?? 0) === 0) unusedTruth.add(`${component}.${axis}.${option}`);
    }
  }
  const unusedGot = new Set((scanned.unusedOptions ?? []).filter((u) => u.certain).map((u) => `${u.component}.${u.axis}.${u.value}`));
  const unusedOptions = f1(unusedTruth, unusedGot, problems, "unused options");
  const options = 0.6 * counts + 0.4 * unusedOptions;

  // --- Overrides: where (file, line, component), and what kind on the ones found.
  const site = (o: { file: string; line: number; component: string }) => `${o.file}:${o.line} ${o.component}`;
  const truthSites = new Map(truth.overrides.map((o) => [site(o), o.kinds]));
  const gotSites = new Map<string, string[]>();
  for (const o of scanned.overrides ?? []) for (const s of o.sites ?? []) gotSites.set(site({ ...s, component: o.component }), s.kinds);
  const sites = f1(new Set(truthSites.keys()), new Set(gotSites.keys()), problems, "overrides");
  const matched = [...truthSites.keys()].filter((k) => gotSites.has(k));
  const kinds = matched.length === 0 ? 0 : mean(
    matched.map((k) => {
      const want = new Set(truthSites.get(k)!);
      const have = new Set(gotSites.get(k)!);
      const both = [...want].filter((x) => have.has(x)).length;
      const j = both / new Set([...want, ...have]).size;
      if (j < 1) problems.push(`override kinds: ${k} ${[...have].join("+") || "none"} vs ${[...want].join("+")}`);
      return j;
    }),
  );
  const overrides = 0.6 * sites + 0.4 * kinds;

  // --- Suggestions: the repeated overrides, by component and class, with how often.
  const key = (s: { component: string; class: string }) => `${s.component} ${s.class}`;
  const truthSuggestions = new Map(truth.suggestions.map((s) => [key(s), s.count]));
  const gotSuggestions = new Map((scanned.suggestions ?? []).map((s) => [key(s), s.count]));
  const named = f1(new Set(truthSuggestions.keys()), new Set(gotSuggestions.keys()), problems, "suggestions");
  const often = mean([...truthSuggestions].filter(([k]) => gotSuggestions.has(k)).map(([k, n]) => ratio(n, gotSuggestions.get(k))));
  const suggestions = 0.8 * named + 0.2 * (truthSuggestions.size === 0 ? named : often);

  // --- Edited: generated files changed by hand since they were written.
  const edited = f1(new Set(truth.edited), new Set((scanned.edited ?? []).map((e) => (typeof e === "string" ? e : e.file))), problems, "edited");

  const areas = { usage, options, overrides, suggestions, edited };
  // To a tenth: a count off by one on a fixture this size must show.
  const score = Math.round(Object.entries(WEIGHTS).reduce((sum, [area, weight]) => sum + weight * areas[area as keyof typeof areas], 0) * 10) / 10;
  return { score, areas: Object.fromEntries(Object.entries(areas).map(([k, v]) => [k, Math.round(v * 100)])), problems };
}
