import { describe, expect, it } from "vitest";
import { PRESETS } from "./presets";
import { usageOf } from "./usage";

describe("usageOf", () => {
  const system = PRESETS[0]!.build();

  it("follows references from a palette step to intents and the components that use them", () => {
    const usage = usageOf(system, "color.brand.7");
    expect(usage.tokens).toContain("intent.primary.solid");
    // Button's fill is {intent.*.solid} and primary is one of its intents.
    expect(usage.components).toContain("button");
    expect(usage.components).toContain("badge");
  });

  it("reports nothing for a step no role reads", () => {
    const usage = usageOf(system, "color.brand.2");
    expect(usage.tokens).toEqual([]);
    expect(usage.components).toEqual([]);
  });

  it("finds components through their own tokens", () => {
    expect(usageOf(system, "radius.md").components).toContain("button");
  });
});
