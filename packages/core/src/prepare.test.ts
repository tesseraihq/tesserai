import { describe, expect, it } from "vitest";
import { PRESETS } from "./presets";
import { prepareSystem } from "./prepare";
import type { DesignSystem } from "./system";

describe("preparing a system from anywhere", () => {
  it("adds what an older save predates, rebuilds it with its brands, and checks it", () => {
    const old = PRESETS[0]!.build();
    // A save from before the kbd component existed, and before its button had a part it now has.
    delete old.components["kbd"];
    old.excluded = old.excluded.filter((c) => c !== "kbd");
    old.brands = { acme: { name: "Acme", ops: [{ op: "radius.set", input: { base: 2 } }] } } as DesignSystem["brands"];
    const input = JSON.stringify(old);
    const { system, added, problems } = prepareSystem(old);
    expect(added).toContain("kbd");
    expect(system.excluded).toContain("kbd");
    expect(problems).toEqual([]);
    expect(JSON.stringify(system.tokens)).toContain('"acme"');
    // The input is left as it was.
    expect(JSON.stringify(old)).toBe(input);
  });

  it("says what's broken instead of passing it on", () => {
    const broken = PRESETS[0]!.build();
    broken.intents["primary"]!.scale = "color.nowhere";
    expect(prepareSystem(broken).problems.join(" ")).toMatch(/nowhere/);
  });
});
