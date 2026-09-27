import { describe, expect, it } from "vitest";
import { measureColors } from "./image-colors";

// An image as RGBA pixels: each entry is a color and how many pixels have it.
function pixels(...runs: [number, number, number, number, number][]): Uint8ClampedArray {
  const out: number[] = [];
  for (const [r, g, b, a, count] of runs) for (let i = 0; i < count; i++) out.push(r, g, b, a);
  return new Uint8ClampedArray(out);
}

describe("measureColors", () => {
  it("measures a flat screenshot exactly, most area first", () => {
    const colors = measureColors(pixels([255, 255, 255, 255, 9000], [17, 24, 39, 255, 800], [22, 163, 74, 255, 200]));
    expect(colors).toEqual([
      { hex: "#ffffff", share: 0.9 },
      { hex: "#111827", share: 0.08 },
      { hex: "#16a34a", share: 0.02 },
    ]);
  });

  it("keeps small text and brand colors, and drops scattered anti-aliasing", () => {
    const edges = Array.from({ length: 30 }, (_, i): [number, number, number, number, number] => [100 + i * 4, 100 + i * 4, 100 + i * 4, 255, 1]);
    const colors = measureColors(pixels([250, 250, 250, 255, 9900], [17, 17, 17, 255, 40], [0, 200, 5, 255, 30], ...edges));
    expect(colors.map((c) => c.hex)).toEqual(["#fafafa", "#111111", "#00c805"]);
  });

  it("pools similar colors in a photo, where no color is flat", () => {
    // A gradient of 2,000 slightly different blues and 2,000 slightly different sands.
    const photo = Array.from({ length: 4000 }, (_, i): [number, number, number, number, number] =>
      i < 2000 ? [30 + (i % 20), 80 + (i % 25), 200 + (i % 11), 255, 1] : [220 + (i % 15), 200 + (i % 13), 160 + (i % 17), 255, 1],
    );
    const colors = measureColors(pixels(...photo));
    expect(colors.length).toBeGreaterThanOrEqual(2);
    expect(colors.reduce((sum, c) => sum + c.share, 0)).toBeGreaterThan(0.8);
  });

  it("merges anti-aliased shades of one color", () => {
    const colors = measureColors(pixels([37, 99, 235, 255, 5000], [40, 102, 236, 255, 300], [255, 255, 255, 255, 4700]));
    expect(colors).toHaveLength(2);
    expect(colors[0]!.share).toBeCloseTo(0.53, 2);
  });

  it("skips transparent pixels, and an empty image has no colors", () => {
    expect(measureColors(pixels([0, 0, 0, 0, 500], [255, 0, 0, 255, 500]))).toEqual([{ hex: "#ff0000", share: 1 }]);
    expect(measureColors(new Uint8ClampedArray())).toEqual([]);
  });
});
