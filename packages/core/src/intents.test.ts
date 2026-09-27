import { describe, expect, it } from "vitest";
import { contrastRatio, oklch, parseColor, toHex } from "./color";
import { applyGenerator } from "./generators";
import { INTENT_ROLES, WHITE, applyIntent, chooseForeground } from "./intents";
import { DEFAULT_MODE } from "./modes";
import { resolveToken } from "./resolve";
import { flattenTokens, getToken, type ColorValue, type TokenGroup } from "./tokens";
import { applyChangeset } from "./ops";
import { PRESETS } from "./presets";

function systemWith(scales: Record<string, string>): TokenGroup {
  const group: TokenGroup = {};
  for (const [name, hex] of Object.entries(scales)) {
    applyGenerator(group, `color.${name}`, name, { kind: "colorScale", seed: parseColor(hex)! });
  }
  return group;
}

describe("chooseForeground", () => {
  it("prefers white on a dark solid", () => {
    const choice = chooseForeground(oklch(0.45, 0.15, 260), oklch(0.25, 0.05, 260));
    expect(choice.color).toEqual(WHITE);
    expect(choice.passes).toBe(true);
  });
  it("prefers dark text on a light solid", () => {
    const choice = chooseForeground(oklch(0.85, 0.15, 90), oklch(0.3, 0.05, 90));
    expect(choice.color).not.toEqual(WHITE);
    expect(choice.passes).toBe(true);
  });
  it("reports failure when neither reaches AA", () => {
    const choice = chooseForeground(oklch(0.6, 0.1, 200), oklch(0.55, 0.05, 200));
    expect(choice.passes).toBe(false);
  });
});

describe("applyIntent", () => {
  const group = systemWith({ blue: "#2563eb", amber: "#f59e0b" });

  it("writes every role as a reference into the scale", () => {
    const { written } = applyIntent(group, "primary", { scale: "color.blue" });
    expect(written).toHaveLength(Object.keys(INTENT_ROLES).length + 1);
    expect(getToken(group, "intent.primary.solid")?.$value).toBe("{color.blue.9}");
    expect(getToken(group, "intent.primary.border")?.$value).toBe("{color.blue.7}");
    expect(getToken(group, "intent.primary.solid")?.$meta?.generated?.by).toBe("intent:primary");
  });

  it("follows the scale into dark mode", () => {
    applyIntent(group, "primary", { scale: "color.blue" });
    const flat = flattenTokens(group);
    const light = resolveToken(flat, "intent.primary.subtle", DEFAULT_MODE, "color").$value;
    const dark = resolveToken(flat, "intent.primary.subtle", { ...DEFAULT_MODE, colorScheme: "dark" }, "color").$value;
    expect(light.l).toBeGreaterThan(0.9);
    expect(dark.l).toBeLessThan(0.3);
  });

  it("chooses white on blue and dark text on amber", () => {
    const blue = applyIntent(group, "primary", { scale: "color.blue" });
    const amber = applyIntent(group, "warning", { scale: "color.amber" });
    expect(blue.foreground.color).toEqual(WHITE);
    expect(amber.foreground.color).not.toEqual(WHITE);
    const amberSolid = resolveToken(flattenTokens(group), "intent.warning.solid", DEFAULT_MODE, "color").$value;
    expect(contrastRatio(amber.foreground.color, amberSolid)).toBeGreaterThanOrEqual(4.5);
  });

  it("gives a flipped dark brand a dark foreground in dark mode only", () => {
    const g = systemWith({ ink: "#18181b" });
    applyIntent(g, "primary", { scale: "color.ink" });
    const flat = flattenTokens(g);
    const light = resolveToken(flat, "intent.primary.solid-foreground", DEFAULT_MODE, "color").$value;
    const dark = resolveToken(flat, "intent.primary.solid-foreground", { ...DEFAULT_MODE, colorScheme: "dark" }, "color").$value;
    expect(light).toEqual(WHITE);
    expect(dark.l).toBeLessThan(0.4);
  });

  it("fails loudly when the scale does not exist", () => {
    expect(() => applyIntent(group, "nope", { scale: "color.nope" })).toThrow(/does not exist/);
  });
});

describe("a role set by hand for light only", () => {
  it("leaves dark as it was (the palette step the role pointed at, dark value and all)", () => {
    const base = PRESETS[0]!.build();
    const at = (s: typeof base, colorScheme: "light" | "dark") => resolveToken(flattenTokens(s.tokens), "intent.neutral.text-strong", { ...DEFAULT_MODE, colorScheme }).$value as ColorValue;
    const set = applyChangeset(base, { ops: [{ op: "intent.setRole", input: { name: "neutral", role: "text-strong", value: "#0d0d0d", scheme: "light" } }] });
    if (!set.ok) throw new Error(set.error);
    expect(toHex(at(set.system, "light"))).toBe("#0d0d0d");
    expect(at(set.system, "dark")).toEqual(at(base, "dark"));
  });
});
