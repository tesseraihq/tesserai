import { describe, expect, it } from "vitest";
import { contrastRatio, oklch, parseColor } from "./color";
import { DEFAULT_MODE } from "./modes";
import { resolveToken } from "./resolve";
import { DesignSystem, createSystemFromBrand, regenerate } from "./system";
import { flattenTokens, getToken, setToken, toRef } from "./tokens";

const clone = (system: DesignSystem): DesignSystem => DesignSystem.parse(JSON.parse(JSON.stringify(system)));

describe("createSystemFromBrand", () => {
  const system = createSystemFromBrand("acme", parseColor("#7c3aed")!);

  it("neutral shares the brand hue", () => {
    const brand = getToken(system.tokens, "color.brand.9");
    const neutral = getToken(system.tokens, "color.neutral.9");
    if (brand?.$type !== "color" || neutral?.$type !== "color") throw new Error();
    if (typeof brand.$value === "string" || typeof neutral.$value === "string") throw new Error();
    expect(Math.abs(brand.$value.h - neutral.$value.h)).toBeLessThan(1);
    expect(neutral.$value.c).toBeLessThan(0.02);
  });

  it("regenerate is idempotent", () => {
    const copy = clone(system);
    regenerate(copy);
    expect(copy).toEqual(system);
  });
});


it("regenerates aliased intent foregrounds correctly in one pass", () => {
  const s = createSystemFromBrand("Aliases", parseColor("#000000")!);
  const primary = s.intents["primary"]!;
  for (const [id, g] of Object.entries(s.generators)) if (g.target === primary.scale) delete s.generators[id];
  for (let i = 1; i <= 12; i++) {
    setToken(s.tokens, `${primary.scale}.${i}`, { $type: "color", $value: oklch(0, 0, 0) });
    setToken(s.tokens, `color.custom.${i}`, { $type: "color", $value: i === 9 ? toRef("intent.primary.solid-foreground") : oklch(0, 0, 0) });
  }
  s.intents["custom"] = { scale: "color.custom" };
  regenerate(s);
  regenerate(s);
  setToken(s.tokens, `${primary.scale}.9`, { $type: "color", $value: oklch(1, 0, 0) });
  regenerate(s);
  const flat = flattenTokens(s.tokens);
  const solid = resolveToken(flat, "intent.custom.solid", DEFAULT_MODE, "color").$value;
  const foreground = resolveToken(flat, "intent.custom.solid-foreground", DEFAULT_MODE, "color").$value;
  expect(contrastRatio(solid, foreground)).toBeGreaterThan(20);
  const once = clone(s);
  regenerate(s);
  expect(s).toEqual(once);
});
