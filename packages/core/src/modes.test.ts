import { describe, expect, it } from "vitest";
import { DEFAULT_MODE, pickMostSpecific, selectorMatches, compareSpecificity } from "./modes";

describe("selectorMatches", () => {
  it("all constrained axes must match", () => {
    expect(
      selectorMatches({ colorScheme: "dark", density: "compact" }, {
        ...DEFAULT_MODE,
        colorScheme: "dark",
      }),
    ).toBe(false);
  });
});

describe("compareSpecificity", () => {
  it("more axes wins", () => {
    expect(compareSpecificity({ brand: "acme", colorScheme: "dark" }, { touch: true })).toBeGreaterThan(0);
  });
  it("on ties, the later axis wins", () => {
    expect(compareSpecificity({ colorScheme: "dark" }, { brand: "acme" })).toBeGreaterThan(0);
    expect(compareSpecificity({ touch: true }, { density: "compact" })).toBeGreaterThan(0);
  });
  it("on multi-axis ties, the selector holding the latest axis wins", () => {
    expect(compareSpecificity({ brand: "acme", touch: true }, { colorScheme: "dark", density: "compact" })).toBeGreaterThan(0);
  });
});

describe("pickMostSpecific", () => {
  const values = [
    { selector: {}, value: "base" },
    { selector: { colorScheme: "dark" as const }, value: "dark" },
    { selector: { brand: "acme" }, value: "acme" },
    { selector: { brand: "acme", colorScheme: "dark" as const }, value: "acme-dark" },
  ];

  it("falls back to the unconstrained value", () => {
    expect(pickMostSpecific(values, DEFAULT_MODE)?.value).toBe("base");
  });
  it("prefers the combination when both axes match", () => {
    expect(
      pickMostSpecific(values, { ...DEFAULT_MODE, brand: "acme", colorScheme: "dark" })?.value,
    ).toBe("acme-dark");
  });
  it("prefers colorScheme over brand on a one-axis tie", () => {
    const tie = [
      { selector: { brand: "acme" }, value: "acme" },
      { selector: { colorScheme: "dark" as const }, value: "dark" },
    ];
    expect(
      pickMostSpecific(tie, { ...DEFAULT_MODE, brand: "acme", colorScheme: "dark" })?.value,
    ).toBe("dark");
  });
  it("returns undefined when nothing matches", () => {
    expect(pickMostSpecific([{ selector: { touch: true } }], DEFAULT_MODE)).toBeUndefined();
  });
});
