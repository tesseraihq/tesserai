import { describe, expect, it } from "vitest";
import { canonicalOf, keptSteps, remapStep, stepFor } from "./palette";

describe("palette steps", () => {
  it("a 12-step palette is the canonical scale, step for step", () => {
    expect(keptSteps(12)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (let c = 1; c <= 12; c++) expect(stepFor(c, 12)).toBe(c);
  });

  it("smaller palettes keep the steps an interface needs", () => {
    expect(keptSteps(3)).toEqual([1, 9, 12]);
    expect(keptSteps(6)).toEqual([1, 3, 8, 9, 10, 12]);
  });

  it("roles read the nearest kept step, contrast roles leaning stronger", () => {
    // 6 steps: [1, 3, 8, 9, 10, 12]
    expect(stepFor(9, 6)).toBe(4); // solid
    expect(stepFor(10, 6)).toBe(5); // solid hover keeps its own step
    expect(stepFor(11, 6)).toBe(6); // text: tie between 10 and 12 goes to 12
    expect(stepFor(7, 6)).toBe(3); // border -> strong border
    expect(stepFor(4, 6)).toBe(2); // fill hover -> fill
    // Text never lands on the solid step, whatever the size.
    for (let n = 3; n <= 12; n++) expect(stepFor(11, n)).not.toBe(stepFor(9, n));
  });

  it("carries a reference across a change of size", () => {
    expect(canonicalOf(4, 6)).toBe(9);
    expect(remapStep(9, 12, 6)).toBe(4);
    expect(remapStep(4, 6, 12)).toBe(9);
    expect(remapStep(13, 12, 6)).toBeUndefined();
  });
});
