import { includedComponents, PRESETS } from "@tesserai/core";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { gradeScan, type Truth } from "./grade";

// The grader, checked: a scan that says exactly what the truth says scores 100, one that says
// nothing scores near 0, and each truth points at the lines it names (a truth that drifted from its
// fixture would grade the scan against the wrong thing).
const here = fileURLToPath(new URL(".", import.meta.url));
const system = PRESETS[0]!.build();
// The fixtures written with the code, and the blind ones written from the spec alone.
const FIXTURES = ["fixtures/react", "fixtures/vue", "fixtures/svelte", "blind/react-app", "blind/vue-app", "blind/svelte-app"];
const truthOf = (name: string) => JSON.parse(readFileSync(join(here, name, "truth.json"), "utf8")) as Truth;

// The scan the truth describes.
function perfect(truth: Truth) {
  const anatomies = includedComponents(system);
  const unusedOptions: { component: string; axis: string; value: string; certain: boolean }[] = [];
  for (const [component, axes] of Object.entries(truth.options)) {
    for (const [axis, def] of Object.entries(anatomies[component]!.axes)) {
      const values = axes[axis] ?? {};
      for (const value of def?.enabled ?? []) if ((values[value] ?? 0) === 0) unusedOptions.push({ component, axis, value, certain: (values["~dynamic"] ?? 0) === 0 });
    }
  }
  const byComponent = new Map<string, { file: string; line: number; kinds: string[] }[]>();
  for (const o of truth.overrides) byComponent.set(o.component, [...(byComponent.get(o.component) ?? []), o]);
  return {
    components: Object.entries(truth.usage).map(([name, u]) => {
      const axes = truth.options[name] ?? {};
      const options = Object.fromEntries(Object.entries(axes).map(([axis, values]) => [axis, Object.fromEntries(Object.entries(values).filter(([v]) => v !== "~dynamic"))]));
      const dynamic = Object.fromEntries(Object.entries(axes).map(([axis, values]) => [axis, values["~dynamic"] ?? 0]));
      return { name, uses: u.uses, files: u.files, options, dynamic };
    }),
    unused: Object.keys(anatomies).filter((n) => truth.usage[n] === undefined),
    unusedOptions,
    overrides: [...byComponent].map(([component, sites]) => ({ component, sites })),
    suggestions: truth.suggestions,
    edited: truth.edited,
  };
}

describe("the scan grader", () => {
  for (const name of FIXTURES) {
    it(`scores the ${name} fixture's own truth 100 and an empty scan near 0`, () => {
      const truth = truthOf(name);
      const grade = gradeScan(perfect(truth), truth, system);
      expect(grade.problems).toEqual([]);
      expect(grade.score).toBe(100);
      // Nothing found: the areas where nothing is the right answer (no suggestions, no edits) still count.
      const empty = gradeScan({}, truth, system).score;
      expect(empty).toBeLessThan(10 + (truth.suggestions.length === 0 ? 10 : 0) + (truth.edited.length === 0 ? 15 : 0));
    });

    it(`finds each of the ${name} truth's lines where it says`, () => {
      const truth = truthOf(name);
      const tag = (component: string) => new RegExp(`<[A-Z][A-Za-z]*(\\.[A-Z][A-Za-z]*)?\\b`);
      for (const o of [...truth.overrides, ...truth.placementOnly]) {
        const line = readFileSync(join(here, name, o.file), "utf8").split("\n")[o.line - 1] ?? "";
        expect(line, `${o.file}:${o.line}`).toMatch(tag(o.component));
      }
      // Every option count adds up to the component's uses.
      for (const [component, axes] of Object.entries(truth.options)) {
        for (const [axis, values] of Object.entries(axes)) expect(Object.values(values).reduce((a, b) => a + b, 0), `${component}.${axis}`).toBe(truth.usage[component]!.uses);
      }
    });
  }

  it("takes points off for each kind of mistake", () => {
    const truth = truthOf("fixtures/react");
    const good = perfect(truth);
    const score = (s: unknown) => gradeScan(s, truth, system).score;
    // A placement class reported as an override, an override missed, a count off, an edit missed.
    expect(score({ ...good, overrides: [...good.overrides, { component: "card", sites: [{ file: "src/App.tsx", line: 10, kinds: ["spacing"] }] }] })).toBeLessThan(100);
    expect(score({ ...good, overrides: good.overrides.slice(1) })).toBeLessThan(100);
    expect(score({ ...good, components: good.components.map((c) => (c.name === "button" ? { ...c, uses: 9 } : c)) })).toBeLessThan(100);
    expect(score({ ...good, edited: [] })).toBeLessThan(90);
  });
});
