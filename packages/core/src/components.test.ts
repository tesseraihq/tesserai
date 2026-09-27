import { describe, expect, it } from "vitest";
import { DEFAULT_ANATOMIES, button, card } from "./anatomies";
import { parseColor } from "./color";
import { Anatomy, enabledSelections, recipeProblems, resolveRecipe } from "./components";
import { DEFAULT_MODE } from "./modes";
import { resolveToken } from "./resolve";
import { createSystemFromBrand, regenerate } from "./system";
import { flattenTokens, getToken } from "./tokens";

describe("Anatomy schema", () => {
  it("rejects a default that is not enabled", () => {
    const bad = { ...button, axes: { ...button.axes, size: { enabled: ["sm"], default: "md" } } };
    expect(Anatomy.safeParse(bad).success).toBe(false);
  });
  it("rejects recipes that style unknown parts", () => {
    const bad = { ...card, base: { ...card.base, nope: { base: { padding: "{space.1}" } } } };
    const result = Anatomy.safeParse(bad);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message).join("\n")).toMatch(/unknown part "nope"/);
  });
  it("rejects an enabled variant without a recipe", () => {
    const bad = { ...button, axes: { ...button.axes, variant: { enabled: ["solid", "elevated"], default: "solid" } } };
    expect(Anatomy.safeParse(bad).success).toBe(false);
  });
});

describe("resolveRecipe", () => {
  it("merges base, size and variant and substitutes the intent", () => {
    const r = resolveRecipe(button, { variant: "solid", intent: "danger", size: "lg" });
    expect(r["root"]?.base.background).toBe("{intent.danger.solid}");
    expect(r["root"]?.base.height).toBe("{button.height.lg}");
    expect(r["root"]?.base.radius).toBe("{button.radius}");
    expect(r["root"]?.states.hover?.background).toBe("{intent.danger.solid-hover}");
    expect(r["root"]?.states["focus-visible"]?.ring).toBe("{intent.danger.focus-ring}");
    expect(r["icon"]?.base.size).toBe("{button.icon-size.lg}");
  });
  it("uses axis defaults when nothing is selected", () => {
    const r = resolveRecipe(button, {});
    expect(r["root"]?.base.background).toBe("{intent.primary.solid}");
    expect(r["root"]?.base.height).toBe("{button.height.md}");
  });
  it("later recipes override earlier ones per property", () => {
    const r = resolveRecipe(button, { variant: "link" });
    expect(r["root"]?.base.textDecoration).toBe("none");
    expect(r["root"]?.states.hover?.textDecoration).toBe("underline");
    expect(r["root"]?.base.cursor).toBe("pointer");
  });
  it("throws when a wildcard has no intent", () => {
    const noIntent = Anatomy.parse({ ...button, axes: { ...button.axes, intent: undefined } });
    expect(() => resolveRecipe(noIntent, {})).toThrow(/no intent/);
  });
});

describe("enabledSelections", () => {
  it("enumerates the full grid", () => {
    expect(enabledSelections(button)).toHaveLength(5 * 6 * 4);
    expect(enabledSelections(DEFAULT_ANATOMIES["dialog"]!)).toEqual([{}]);
  });
});

describe("every anatomy against a generated system", () => {
  const system = createSystemFromBrand("acme", parseColor("#2563eb")!);
  const flat = flattenTokens(system.tokens);

  it("writes surfaces that lift in dark mode", () => {
    const light = resolveToken(flat, "surface.overlay", DEFAULT_MODE, "color").$value;
    const dark = resolveToken(flat, "surface.overlay", { ...DEFAULT_MODE, colorScheme: "dark" }, "color").$value;
    expect(light.l).toBeGreaterThan(0.98);
    expect(dark.l).toBeGreaterThan(0.2);
    expect(dark.l).toBeLessThan(0.3);
  });

  it("recipeProblems names missing and mistyped references", () => {
    const broken = Anatomy.parse({
      ...card,
      base: { ...card.base, root: { base: { ...card.base["root"]?.base, background: "{space.4}", radius: "{nope.nope}" } } },
    });
    const problems = recipeProblems(broken, flat);
    expect(problems).toContain("card.root.background needs a color token but {space.4} is dimension");
    expect(problems).toContain("card.root.radius references {nope.nope}, which does not exist");
  });

  it("keeps a pinned component token across regeneration", () => {
    const copy = JSON.parse(JSON.stringify(system)) as typeof system;
    const token = getToken(copy.tokens, "button.radius")!;
    token.$value = "{radius.full}";
    token.$meta = { ...token.$meta, pinned: true };
    const { pinned } = regenerate(copy);
    expect(pinned).toContain("button.radius");
    expect(getToken(copy.tokens, "button.radius")?.$value).toBe("{radius.full}");
  });
});
