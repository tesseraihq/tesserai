import { addMissingComponents, createSystemFromBrand, includedComponents, parseBundle, parseColor, regenerate, upgradeComponents, type DesignSystem } from "@tesserai/core";
import { describe, expect, it } from "vitest";
import c396609 from "./__fixtures__/old-saves/c396609.json";
import e7ca91b from "./__fixtures__/old-saves/e7ca91b.json";
import s645f346 from "./__fixtures__/old-saves/645f346.json";
import { renderAll, supportedComponents } from "./render";

// A system saved by an older tesserai: every component is missing a part it has since gained (with
// that part's styles), one of its component tokens, and its size axis. This is how a Card saved
// before CardAction broke the preview on a phone that still had the old save.
// Each test gets its own copy of a fixture, since opening mutates it.
const structuredCloneJson = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

function savedByAnOlderVersion(): DesignSystem {
  const system = createSystemFromBrand("old", parseColor("#2563eb")!);
  for (const anatomy of Object.values(system.components)) {
    const dropped = anatomy.parts.filter((p) => p !== "root").at(-1);
    if (dropped !== undefined) {
      anatomy.parts = anatomy.parts.filter((p) => p !== dropped);
      for (const recipe of [anatomy.base, ...Object.values(anatomy.variants), ...Object.values(anatomy.sizes), ...Object.values(anatomy.intents)]) delete recipe[dropped];
      anatomy.compounds = anatomy.compounds.filter((c) => !(dropped in c.recipe));
    }
    const firstToken = Object.keys(anatomy.tokens)[0];
    if (firstToken !== undefined) delete anatomy.tokens[firstToken];
    if (anatomy.axes.size !== undefined) {
      delete anatomy.axes.size;
      anatomy.sizes = {};
      anatomy.compounds = anatomy.compounds.filter((c) => c.when.size === undefined);
    }
  }
  return system;
}

describe("upgradeComponents", () => {
  it("brings every component of an old save back to what the templates need", async () => {
    const system = savedByAnOlderVersion();
    // Before: at least one template fails on a missing part.
    await expect(renderAll("base-ui", system)).rejects.toThrow(/has no part/);
    expect(upgradeComponents(system).length).toBeGreaterThan(0);
    regenerate(system);
    for (const base of ["base-ui", "radix", "react-aria"] as const) {
      const files = await renderAll(base, system);
      expect(files.length).toBeGreaterThan(40);
    }
  });

  it("brings a new state's styles, not just its name: an old checkbox fills when some are chosen", () => {
    const system = createSystemFromBrand("old", parseColor("#2563eb")!);
    const box = system.components["checkbox"]!;
    box.states = box.states.filter((s) => s !== "indeterminate");
    delete box.base["root"]!.states?.["indeterminate"];
    expect(upgradeComponents(system)).toContain("checkbox: added the indeterminate state");
    expect(system.components["checkbox"]!.base["root"]!.states?.["indeterminate"]).toMatchObject({ background: "{intent.primary.solid}" });
  });

  it("keeps a state style someone set, when the state is added back", () => {
    const system = createSystemFromBrand("old", parseColor("#2563eb")!);
    const box = system.components["checkbox"]!;
    box.states = box.states.filter((s) => s !== "indeterminate");
    box.base["root"]!.states = { ...box.base["root"]!.states, indeterminate: { background: "{intent.danger.solid}" } };
    upgradeComponents(system);
    expect(system.components["checkbox"]!.base["root"]!.states?.["indeterminate"]).toEqual({ background: "{intent.danger.solid}" });
  });

  it("only adds what's missing: styles someone set are kept", () => {
    const system = createSystemFromBrand("mine", parseColor("#2563eb")!);
    const card = system.components["card"]!;
    card.parts = card.parts.filter((p) => p !== "action");
    card.base["title"] = { base: { fontWeight: "{font.weight.bold}" } };
    const changes = upgradeComponents(system);
    expect(changes).toContain("card: added action");
    expect(card.parts).toEqual(["root", "header", "title", "description", "action", "content", "footer"]);
    expect(card.base["title"]).toEqual({ base: { fontWeight: "{font.weight.bold}" } });
    // Idempotent: a second pass changes nothing.
    expect(upgradeComponents(system)).toEqual([]);
  });

  it("doesn't reset a component for a problem it already had", () => {
    const system = createSystemFromBrand("mine", parseColor("#2563eb")!);
    const card = system.components["card"]!;
    card.parts = card.parts.filter((p) => p !== "action");
    // Someone's own edit, pointing at a token that doesn't exist: not the upgrade's doing.
    card.base["title"] = { base: { fontWeight: "{font.weight.heavy}" } };
    const changes = upgradeComponents(system);
    expect(changes).toEqual(["card: added action"]);
    expect(card.base["title"]).toEqual({ base: { fontWeight: "{font.weight.heavy}" } });
  });

  // Real saves: the default system as three older versions of tesserai built it (from git history).
  // Two of them used to throw on open, which left the whole builder blank.
  const saves: [string, unknown][] = [
    ["c396609", c396609],
    ["e7ca91b", e7ca91b],
    ["645f346", s645f346],
  ];
  for (const [commit, saved] of saves) {
    it(`opens and generates a system saved by ${commit}`, async () => {
      const parsed = parseBundle(structuredCloneJson(saved));
      if (!parsed.ok) throw new Error(parsed.problem);
      addMissingComponents(parsed.system);
      upgradeComponents(parsed.system);
      regenerate(parsed.system);
      for (const base of ["base-ui", "radix", "react-aria"] as const) {
        // Every included component this library supports gets a file, plus lib/utils.ts.
        const expected = Object.keys(includedComponents(parsed.system)).filter((n) => supportedComponents(base).includes(n)).length + 1;
        expect(await renderAll(base, parsed.system)).toHaveLength(expected);
      }
    });
  }
});
