import { describe, expect, it } from "vitest";
import { clampToSrgb, contrastRatio, isInSrgb, oklch, parseColor, toCssOklch, toHex, toRgba } from "./color";

describe("parseColor", () => {
  it("accepts hex, rgb, hsl and oklch", () => {
    for (const input of ["#3b82f6", "rgb(59 130 246)", "hsl(217 91% 60%)", "oklch(0.62 0.19 259)"]) {
      const c = parseColor(input);
      expect(c, input).toBeDefined();
      expect(c!.h).toBeGreaterThan(250);
      expect(c!.h).toBeLessThan(270);
    }
  });
  it("round-trips through hex within a step", () => {
    const c = parseColor("#3b82f6")!;
    expect(toHex(c)).toBe("#3b82f6");
  });
  it("keeps alpha only when below 1", () => {
    expect(parseColor("#3b82f680")?.alpha).toBeCloseTo(0.5, 1);
    expect(parseColor("#3b82f6")?.alpha).toBeUndefined();
  });
});

describe("gamut", () => {
  it("clamps chroma to sRGB while keeping hue and lightness", () => {
    const vivid = oklch(0.7, 0.4, 150);
    expect(isInSrgb(vivid)).toBe(false);
    const clamped = clampToSrgb(vivid);
    expect(isInSrgb(clamped)).toBe(true);
    expect(clamped.l).toBeCloseTo(0.7, 1);
    expect(clamped.h).toBeCloseTo(150, 0);
    expect(clamped.c).toBeLessThan(0.4);
  });
  it("leaves in-gamut colors alone", () => {
    const c = oklch(0.5, 0.1, 30);
    expect(clampToSrgb(c)).toEqual(c);
  });
});

describe("toRgba", () => {
  it("gives unit sRGB components and alpha", () => {
    expect(toRgba(oklch(1, 0, 0))).toEqual({ r: 1, g: 1, b: 1, a: 1 });
    expect(toRgba(oklch(0, 0, 0, 0.5))).toEqual({ r: 0, g: 0, b: 0, a: 0.5 });
    const blue = toRgba(parseColor("#3b82f6")!);
    expect(Math.round(blue.r * 255)).toBe(59);
    expect(Math.round(blue.b * 255)).toBe(246);
  });
});

describe("output", () => {
  it("formats css oklch", () => {
    expect(toCssOklch(oklch(0.5, 0.1234, 30.123))).toBe("oklch(0.5 0.1234 30.12)");
    expect(toCssOklch(oklch(0.5, 0.1, 30, 0.5))).toBe("oklch(0.5 0.1 30 / 0.5)");
  });
  it("computes wcag contrast", () => {
    expect(contrastRatio(oklch(0, 0, 0), oklch(1, 0, 0))).toBe(21);
    expect(contrastRatio(oklch(0.5, 0, 0), oklch(0.5, 0, 0))).toBe(1);
  });
});
