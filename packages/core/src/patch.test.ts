import { describe, expect, it } from "vitest";
import { applyChangeset } from "./ops/changeset";
import { applyPatch, applySuggestion, checkSuggestion, diffPatch, jsonEqual, revertPatch, suggestionOf } from "./patch";
import { PRESETS } from "./presets";
import type { DesignSystem } from "./system";

const base = PRESETS[0]!.build();
function edit(system: DesignSystem, ops: { op: string; input: unknown }[]): DesignSystem {
  const r = applyChangeset(system, { ops });
  if (!r.ok) throw new Error(r.error);
  return r.system;
}

describe("patches", () => {
  it("describe a change minimally and reproduce it exactly", () => {
    const after = edit(base, [{ op: "radius.set", input: { base: 14 } }]);
    const patch = diffPatch(base, after);
    expect(patch.length).toBeGreaterThan(0);
    expect(patch.every((op) => op.path[0] === "tokens" || op.path[0] === "generators")).toBe(true);
    expect(jsonEqual(applyPatch(base, patch), after)).toBe(true);
    expect(diffPatch(base, base)).toEqual([]);
  });

  it("removes keys and shares untouched branches", () => {
    const doc = { a: { x: 1, y: 2 }, b: { z: 3 } };
    const next = applyPatch(doc, [{ path: ["a", "x"], remove: true }]);
    expect(next).toEqual({ a: { y: 2 }, b: { z: 3 } });
    expect(next.b).toBe(doc.b);
    expect(doc.a.x).toBe(1);
  });

  it("converge when two people edit different things from the same start", () => {
    const a = edit(base, [{ op: "radius.set", input: { base: 14 } }]);
    const b = edit(base, [{ op: "palette.setColor", input: { name: "brand", color: "#d03050" } }]);
    const pa = diffPatch(base, a);
    const pb = diffPatch(base, b);
    // The server applies A then B; each person applies the other's patch over their own.
    const server = applyPatch(applyPatch(base, pa), pb);
    const personA = applyPatch(a, pb);
    const personB = applyPatch(applyPatch(base, pa), pb);
    expect(jsonEqual(personA, server)).toBe(true);
    expect(jsonEqual(personB, server)).toBe(true);
    expect(server.generators["radius"]).toEqual(a.generators["radius"]);
    expect(server.generators["brand"]).toEqual(b.generators["brand"]);
  });

  it("undo one's own step without undoing someone else's later change", () => {
    const mine = edit(base, [{ op: "radius.set", input: { base: 14 } }]);
    const forward = diffPatch(base, mine);
    const theirs = edit(mine, [{ op: "palette.setColor", input: { name: "brand", color: "#d03050" } }]);
    const { doc, clashed } = revertPatch(theirs, base, forward);
    expect(clashed).toEqual([]);
    expect(doc.generators["radius"]).toEqual(base.generators["radius"]);
    expect(doc.generators["brand"]).toEqual(theirs.generators["brand"]);
    // If they changed the same thing, it stays theirs and is reported.
    const overwritten = edit(mine, [{ op: "radius.set", input: { base: 3 } }]);
    const second = revertPatch(overwritten, base, forward);
    expect(second.clashed.length).toBeGreaterThan(0);
    expect((second.doc.generators["radius"]!.config as { base: number }).base).toBe(3);
  });
});

describe("suggestions", () => {
  it("apply cleanly when nothing changed since, and know when they're already in", () => {
    const after = edit(base, [{ op: "radius.set", input: { base: 14 } }]);
    const s = suggestionOf(base, after);
    expect(checkSuggestion(base, s)).toEqual({ clashes: [], alreadyIn: false });
    const applied = applySuggestion(base, s);
    expect(jsonEqual(applied, after)).toBe(true);
    expect(checkSuggestion(applied, s)).toEqual({ clashes: [], alreadyIn: true });
  });

  it("name what someone changed since, and can keep it", () => {
    const doc = { a: 1, b: { c: 2 }, d: 5 };
    const s = suggestionOf(doc, { a: 10, b: { c: 20 }, d: 5, e: 1 });
    expect(s.base).toEqual([1, 2, null]);
    const meanwhile = { a: 1, b: { c: 3 }, d: 6 };
    expect(checkSuggestion(meanwhile, s)).toEqual({ clashes: [["b", "c"]], alreadyIn: false });
    expect(applySuggestion(meanwhile, s)).toEqual({ a: 10, b: { c: 20 }, d: 6, e: 1 });
    expect(applySuggestion(meanwhile, s, true)).toEqual({ a: 10, b: { c: 3 }, d: 6, e: 1 });
  });

  it("treat a removal as a change, and a removal someone else made as a clash", () => {
    const s = suggestionOf({ a: 1, b: 2 }, { a: 1 });
    expect(s.patch).toEqual([{ path: ["b"], remove: true }]);
    expect(checkSuggestion({ a: 1 }, s)).toEqual({ clashes: [], alreadyIn: true });
    expect(checkSuggestion({ a: 1, b: 3 }, s).clashes).toEqual([["b"]]);
  });
});

describe("suggestions on a design system", () => {
  it("carry what was set, not what regenerating makes of it", async () => {
    const { systemSuggestion } = await import("./ops/source");
    const after = edit(base, [{ op: "radius.set", input: { base: 14 } }]);
    const s = systemSuggestion(base, after);
    expect(s.patch.map((op) => op.path.join("."))).toEqual(["generators.radius.config.base"]);
    expect(diffPatch(base, after).length).toBeGreaterThan(s.patch.length);
    // A palette taken out takes its steps with it.
    const removed = edit(base, [{ op: "palette.remove", input: { name: "blue", moveTo: "brand" } }]);
    const r = systemSuggestion(base, removed);
    expect(r.patch.some((op) => "remove" in op && op.path.join(".").startsWith("tokens.color.blue"))).toBe(true);
    expect(jsonEqual(applyPatch(base, r.patch).generators, removed.generators)).toBe(true);
  });
});
