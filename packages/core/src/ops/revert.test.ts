import { describe, expect, it } from "vitest";
import { PRESETS } from "../presets";
import { flattenTokens } from "../tokens";
import type { DesignSystem } from "../system";
import { applyChangeset } from "./changeset";
import { revertStep } from "./revert";

function step(system: DesignSystem, ops: { op: string; input: unknown }[]): DesignSystem {
  const result = applyChangeset(system, { ops });
  if (!result.ok) throw new Error(result.error);
  return result.system;
}

const token = (s: DesignSystem, path: string) => flattenTokens(s.tokens).get(path)?.$value;
const radius = (s: DesignSystem) => (s.generators["radius"]?.config as { base: number }).base;

describe("revertStep", () => {
  const start = PRESETS[0]!.build();

  it("undoes an earlier step and keeps what came after it", () => {
    const before = start;
    const after = step(before, [{ op: "radius.set", input: { base: 16 } }]);
    const later = step(after, [{ op: "palette.setColor", input: { name: "brand", color: "#d03050" } }]);
    const result = revertStep(later, before, after);
    expect(radius(result.system)).toBe(radius(before));
    expect(result.reverted).toContain("generator radius");
    expect(result.clashed).toEqual([]);
    // The later brand change survives.
    expect(result.system.generators["brand"]).toEqual(later.generators["brand"]);
  });

  it("leaves something changed again since alone, and says so", () => {
    const before = start;
    const after = step(before, [{ op: "radius.set", input: { base: 16 } }]);
    const later = step(after, [{ op: "radius.set", input: { base: 2 } }]);
    const result = revertStep(later, before, after);
    expect(radius(result.system)).toBe(2);
    expect(result.clashed).toContain("generator radius");
    expect(result.reverted).toEqual([]);
  });

  it("undoes only part of a step", () => {
    const before = start;
    const after = step(before, [
      { op: "radius.set", input: { base: 16 } },
      { op: "spacing.set", input: { base: 6 } },
    ]);
    const result = revertStep(after, before, after, ["radius"]);
    expect(radius(result.system)).toBe(radius(before));
    expect(result.system.generators["space"]).toEqual(after.generators["space"]);
    expect(token(result.system, "space.4")).toEqual(token(after, "space.4"));
    const all = revertStep(after, before, after);
    expect(all.system.generators["space"]).toEqual(before.generators["space"]);
  });

  it("keeps each brand's values when undoing something else, and can take a brand back out", () => {
    const branded = step(start, [
      { op: "brand.add", input: { name: "Acme", id: "acme" } },
      { op: "brand.set", input: { id: "acme", op: "radius.set", input: { base: 2 } } },
    ]);
    const brandModes = (s: DesignSystem) => JSON.stringify([...flattenTokens(s.tokens)].filter(([, t]) => JSON.stringify(t.$modes ?? []).includes("acme")).length);
    expect(Number(brandModes(branded))).toBeGreaterThan(0);
    const after = step(branded, [{ op: "radius.set", input: { base: 16 } }]);
    const undone = revertStep(after, branded, after);
    expect(radius(undone.system)).toBe(radius(branded));
    // The brand and its values are all still there: an undo used to drop every brand's values.
    expect(undone.system.brands).toEqual(branded.brands);
    expect(brandModes(undone.system)).toBe(brandModes(branded));
    expect(undone.clashed).toEqual([]);

    // Undoing the step that added the brand takes it away.
    const gone = revertStep(branded, start, branded);
    expect(gone.system.brands).toBeUndefined();
    expect(gone.reverted).toContain("brand acme");
  });

  it("undoes leaving a component out, the icons and the class prefix", () => {
    const after = step(start, [
      { op: "component.remove", input: { component: "kbd" } },
      { op: "icons.setLibrary", input: { library: "phosphor" } },
      { op: "system.setTailwindPrefix", input: { prefix: "acme" } },
    ]);
    const undone = revertStep(after, start, after);
    expect(undone.system.excluded).toEqual(start.excluded);
    expect(undone.system.icons).toEqual(start.icons);
    expect(undone.system.tailwindPrefix).toBeUndefined();
    expect(undone.reverted).toEqual(expect.arrayContaining(["left out kbd", "icons", "class prefix"]));
  });
});

