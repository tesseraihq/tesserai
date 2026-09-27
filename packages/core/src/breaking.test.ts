import { describe, expect, it } from "vitest";
import { applyChangeset, breakingChanges } from "./ops";
import { PRESETS } from "./presets";
import type { DesignSystem } from "./system";

const base = PRESETS[0]!.build();
function run(system: DesignSystem, ops: { op: string; input: unknown }[]): DesignSystem {
  const r = applyChangeset(system, { ops });
  if (!r.ok) throw new Error(r.error);
  return r.system;
}

describe("breaking changes", () => {
  it("name what would stop code working, and nothing that only looks different", () => {
    expect(breakingChanges(base, run(base, [{ op: "radius.set", input: { base: 12 } }, { op: "palette.setColor", input: { name: "brand", color: "#e11d48" } }]))).toEqual([]);
    const after = run(base, [
      { op: "component.remove", input: { component: "badge" } },
      { op: "component.removeOption", input: { component: "button", axis: "size", name: "lg" } },
      { op: "palette.remove", input: { name: "blue", moveTo: "brand" } },
    ]);
    const texts = breakingChanges(base, after).map((b) => `${b.kind}: ${b.text}`);
    expect(texts.some((t) => t.startsWith("component: Badge is taken out"))).toBe(true);
    expect(texts.some((t) => t.includes('size="lg"'))).toBe(true);
    expect(texts.some((t) => t.startsWith("token: The tokens color.blue.*"))).toBe(true);
    // The removed component's own tokens aren't listed again.
    expect(texts.some((t) => t.includes("badge."))).toBe(false);
    expect(breakingChanges(base, run(base, [{ op: "system.setBase", input: { base: "radix" } }]))[0]?.kind).toBe("base");
  });

  it("counts a new Tailwind class prefix as breaking: classes in people's own code are renamed", () => {
    const before = PRESETS[0]!.build();
    const after = { ...before, tailwindPrefix: "acme" };
    expect(breakingChanges(before, after).map((b) => b.kind)).toEqual(["prefix"]);
    expect(breakingChanges(after, after)).toEqual([]);
  });
});
