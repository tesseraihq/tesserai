import { describe, expect, it } from "vitest";
import { isInSrgb, oklch, parseColor } from "./color";
import { DEFAULT_SPACING, DEFAULT_TYPE_SCALE, applyGenerator, generate } from "./generators";
import { DEFAULT_MODE } from "./modes";
import { resolveToken } from "./resolve";
import { flattenTokens, getToken, type TokenGroup } from "./tokens";
import { toPx } from "./units";

describe("spacing", () => {
  it("produces the PRD defaults in rem", () => {
    const flat = flattenTokens(generate(DEFAULT_SPACING));
    const px = [...flat.values()].map((t) => (t.$type === "dimension" && typeof t.$value !== "string" ? toPx(t.$value) : NaN));
    expect(px).toEqual([2, 4, 8, 12, 16, 24, 32, 48, 64]);
    expect(flat.get("1")?.$value).toEqual({ value: 0.125, unit: "rem" });
  });
  it("gives every step a value per density, rounded to whole px", () => {
    const flat = flattenTokens(generate(DEFAULT_SPACING));
    const compact = resolveToken(flat, "5", { ...DEFAULT_MODE, density: "compact" }, "dimension").$value;
    const comfortable = resolveToken(flat, "5", { ...DEFAULT_MODE, density: "comfortable" }, "dimension").$value;
    expect(toPx(compact)).toBe(12);
    expect(toPx(comfortable)).toBe(20);
  });
});

describe("radiusScale", () => {
  it("derives the named steps from one base", () => {
    const flat = flattenTokens(generate({ kind: "radiusScale", base: 6 }));
    const px = (name: string) => toPx(resolveToken(flat, name, DEFAULT_MODE, "dimension").$value);
    expect([px("none"), px("sm"), px("md"), px("lg"), px("xl"), px("2xl")]).toEqual([0, 3, 6, 12, 18, 24]);
    expect(px("full")).toBe(9999);
  });
  it("base 0 gives a square system", () => {
    const flat = flattenTokens(generate({ kind: "radiusScale", base: 0 }));
    expect(toPx(resolveToken(flat, "lg", DEFAULT_MODE, "dimension").$value)).toBe(0);
  });
});

describe("typeScale", () => {
  const flat = flattenTokens(generate(DEFAULT_TYPE_SCALE));

  it("rounds sizes to whole pixels", () => {
    const sizes = [...flat.entries()].filter(([k]) => k.startsWith("size.")).map(([, t]) => (t.$type === "dimension" && typeof t.$value !== "string" ? toPx(t.$value) : NaN));
    expect(sizes).toEqual([11, 13, 16, 19, 23, 28, 33, 40, 48]);
    expect(sizes.every(Number.isInteger)).toBe(true);
  });

  it("snaps line heights to the 4px grid", () => {
    for (let step = 1; step <= 9; step++) {
      const size = flat.get(`size.${step}`)!;
      const leading = flat.get(`leading.${step}`)!;
      if (size.$type !== "dimension" || typeof size.$value === "string") throw new Error();
      if (leading.$type !== "number" || typeof leading.$value === "string") throw new Error();
      const lhPx = toPx(size.$value) * leading.$value;
      expect(Math.abs(lhPx / 4 - Math.round(lhPx / 4)), `step ${step}`).toBeLessThan(0.001);
      expect(leading.$value).toBeGreaterThanOrEqual(1);
    }
  });

  it("uses tighter leading for display sizes", () => {
    const first = flat.get("leading.3")!;
    const last = flat.get("leading.9")!;
    expect(first.$value).toBeGreaterThan(last.$value as number);
  });
});

describe("colorScale", () => {
  const seed = parseColor("#3b82f6")!;
  const group = generate({ kind: "colorScale", seed });
  const flat = flattenTokens(group);
  const light = (n: number) => resolveToken(flat, String(n), DEFAULT_MODE, "color").$value;
  const dark = (n: number) =>
    resolveToken(flat, String(n), { ...DEFAULT_MODE, colorScheme: "dark" }, "color").$value;

  it("uses the seed as step 9 in light and lifts it to at least L 0.72 in dark", () => {
    expect(light(9)).toEqual(seed);
    expect(dark(9).l).toBeGreaterThanOrEqual(0.72);
    expect(dark(9).h).toBeCloseTo(seed.h, 0);
    const lightSeed = oklch(0.8, 0.12, 200);
    const lifted = flattenTokens(generate({ kind: "colorScale", seed: lightSeed }));
    expect(resolveToken(lifted, "9", { ...DEFAULT_MODE, colorScheme: "dark" }, "color").$value.l).toBeCloseTo(0.8, 2);
  });

  it("flips a near-black seed to near-white in dark mode, with hover moving away from the text", () => {
    const ink = generate({ kind: "colorScale", seed: oklch(0.21, 0.006, 285) });
    const flatInk = flattenTokens(ink);
    const darkSolid = resolveToken(flatInk, "9", { ...DEFAULT_MODE, colorScheme: "dark" }, "color").$value;
    const darkHover = resolveToken(flatInk, "10", { ...DEFAULT_MODE, colorScheme: "dark" }, "color").$value;
    const lightSolid = resolveToken(flatInk, "9", DEFAULT_MODE, "color").$value;
    const lightHover = resolveToken(flatInk, "10", DEFAULT_MODE, "color").$value;
    expect(darkSolid.l).toBeGreaterThan(0.9);
    expect(darkHover.l).toBeGreaterThan(darkSolid.l);
    expect(lightSolid.l).toBeCloseTo(0.21, 2);
    expect(lightHover.l).toBeLessThan(lightSolid.l);
  });

  it("backgrounds get darker in light mode and lighter in dark mode through step 8", () => {
    for (let n = 1; n < 8; n++) {
      expect(light(n).l, `light ${n}`).toBeGreaterThan(light(n + 1).l);
      expect(dark(n).l, `dark ${n}`).toBeLessThan(dark(n + 1).l);
    }
  });

  it("keeps hue and stays in sRGB even for a vivid seed", () => {
    const vivid = generate({ kind: "colorScale", seed: oklch(0.7, 0.35, 145) });
    for (const [, token] of flattenTokens(vivid)) {
      if (token.$type !== "color" || typeof token.$value === "string") throw new Error();
      expect(isInSrgb(token.$value)).toBe(true);
      expect(Math.abs(token.$value.h - 145)).toBeLessThan(1);
    }
  });
});

describe("applyGenerator", () => {
  it("stamps generated tokens and skips pinned ones", () => {
    const group: TokenGroup = {
      space: { "3": { $type: "dimension", $value: { value: 10, unit: "px" }, $meta: { pinned: true } } },
    };
    const result = applyGenerator(group, "space", "space", DEFAULT_SPACING);
    expect(result.pinned).toEqual(["space.3"]);
    expect(result.written).toHaveLength(8);
    expect(getToken(group, "space.3")?.$value).toEqual({ value: 10, unit: "px" });
    expect(getToken(group, "space.2")?.$meta).toEqual({ generated: { by: "space", step: "2" } });
  });

  it("re-running with new parameters recomputes unpinned steps", () => {
    const group: TokenGroup = {};
    applyGenerator(group, "space", "space", DEFAULT_SPACING);
    applyGenerator(group, "space", "space", { ...DEFAULT_SPACING, base: 8 });
    expect(getToken(group, "space.2")?.$value).toEqual({ value: 0.5, unit: "rem" });
  });
});

describe("palette size and vibrancy", () => {
  it("a 6-step palette is six steps of the same curve, and roles follow", async () => {
    const { createSystemFromBrand, regenerate, getToken, flattenTokens, oklch } = await import("./index");
    const system = createSystemFromBrand("t", oklch(0.55, 0.2, 260));
    const brand = system.generators["brand"]?.config;
    if (brand?.kind !== "colorScale") throw new Error("no brand palette");
    brand.steps = 6;
    regenerate(system);
    const steps = [...flattenTokens(system.tokens).keys()].filter((p) => p.startsWith("color.brand."));
    expect(steps).toEqual(["color.brand.1", "color.brand.2", "color.brand.3", "color.brand.4", "color.brand.5", "color.brand.6"]);
    expect(getToken(system.tokens, "intent.primary.solid")?.$value).toBe("{color.brand.4}");
    expect(getToken(system.tokens, "intent.primary.text-strong")?.$value).toBe("{color.brand.6}");
  });

  it("vibrancy scales chroma without moving lightness", async () => {
    const { generate, oklch } = await import("./index");
    const calm = generate({ kind: "colorScale", seed: oklch(0.55, 0.2, 260), vibrancy: 0.5 });
    const full = generate({ kind: "colorScale", seed: oklch(0.55, 0.2, 260) });
    const c = (g: typeof calm) => {
      const t = g["3"];
      return t !== undefined && "$value" in t && typeof t.$value === "object" && t.$value !== null && "c" in t.$value ? Number(t.$value.c) : NaN;
    };
    expect(c(calm)).toBeCloseTo(c(full) / 2, 3);
  });
});
