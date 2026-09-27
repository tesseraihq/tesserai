import { describe, expect, it } from "vitest";
import { parseColor, toCssOklch } from "../color";
import { emitDtcg } from "../emit-dtcg";
import { DEFAULT_MODE } from "../modes";
import { applyChangeset } from "../ops/changeset";
import { PRESETS } from "../presets";
import { resolveToken } from "../resolve";
import { flattenTokens, type ColorValue } from "../tokens";
import { importDtcg } from "./dtcg";

// A W3C DTCG file of the usual shape: a Tailwind-style palette, semantic colors named the shadcn
// way (some as aliases), radius, spacing, type sizes and fonts.
const DTCG = {
  color: {
    $type: "color",
    sky: {
      "50": { $value: "#f0f9ff" }, "100": { $value: "#e0f2fe" }, "200": { $value: "#bae6fd" }, "300": { $value: "#7dd3fc" },
      "400": { $value: "#38bdf8" }, "500": { $value: "#0ea5e9" }, "600": { $value: "#0284c7" }, "700": { $value: "#0369a1" },
      "800": { $value: "#075985" }, "900": { $value: "#0c4a6e" }, "950": { $value: "#082f49" },
    },
    slate: { "100": { $value: "#f1f5f9" }, "500": { $value: "#64748b" }, "900": { $value: "#0f172a" } },
    background: { $value: "#ffffff" },
    primary: { $value: "{color.sky.600}" },
    border: { $value: { colorSpace: "srgb", components: [0.886, 0.91, 0.941] } },
  },
  radius: { $type: "dimension", sm: { $value: "4px" }, md: { $value: "0.5rem" }, lg: { $value: "12px" } },
  spacing: { $type: "dimension", "1": { $value: "4px" }, "2": { $value: "8px" }, "4": { $value: "16px" } },
  fontSize: { $type: "dimension", sm: { $value: "14px" }, base: { $value: "15px" }, lg: { $value: "18px" } },
  fontFamily: { $type: "fontFamily", sans: { $value: ["Inter", "system-ui", "sans-serif"] }, mono: { $value: "JetBrains Mono, monospace" } },
  shadow: { card: { $type: "shadow", $value: { offsetX: "0px", offsetY: "1px", blur: "2px", color: "#0000001a" } } },
};

// Tokens Studio's older format: value/type, aliases in braces.
const TOKENS_STUDIO = {
  global: {
    brand: { "100": { value: "#dbeafe", type: "color" }, "500": { value: "#3b82f6", type: "color" }, "900": { value: "#1e3a8a", type: "color" } },
    borderRadius: { md: { value: "6", type: "borderRadius" } },
  },
};

const hex = (c: string) => toCssOklch(parseColor(c)!);
function resolved(system: ReturnType<typeof PRESETS[0]["build"]>, path: string): string {
  return toCssOklch(resolveToken(flattenTokens(system.tokens), path, DEFAULT_MODE).$value as ColorValue);
}

describe("importing DTCG tokens", () => {
  it("turns scales into exact palettes and places the rest", () => {
    const report = importDtcg(DTCG, "From tokens");
    if ("error" in report) throw new Error(report.error);
    const result = applyChangeset(PRESETS[0]!.build(), report.changeset);
    if (!result.ok) throw new Error(result.error);
    const s = result.system;
    // sky is the brand (the first colorful scale); slate folds into neutral; every step exact.
    expect(resolved(s, "color.brand.1")).toBe(hex("#f0f9ff"));
    expect(resolved(s, "color.brand.11")).toBe(hex("#082f49"));
    expect(resolved(s, "color.neutral.3")).toBe(hex("#0f172a"));
    // Semantic names land on their roles, aliases followed.
    expect(resolved(s, "intent.primary.solid")).toBe(hex("#0284c7"));
    expect(resolved(s, "surface.page")).toBe(hex("#ffffff"));
    expect(resolved(s, "intent.neutral.border")).toBe(toCssOklch(parseColor("rgb(226 232 240)")!));
    expect((s.generators["radius"]!.config as { base: number }).base).toBe(8);
    expect((s.generators["space"]!.config as { base: number }).base).toBe(4);
    expect((s.generators["type"]!.config as { base: number }).base).toBe(15);
    expect(report.mapped.some((m) => m.startsWith("fontFamily.sans → sans font Inter"))).toBe(true);
    // Shadows come across now, as the medium shadow ("card" is its usual name).
    expect(report.found).toContainEqual(expect.objectContaining({ key: "shadow.md" }));
  });

  it("reads Tokens Studio's older format", () => {
    const report = importDtcg(TOKENS_STUDIO);
    if ("error" in report) throw new Error(report.error);
    const result = applyChangeset(PRESETS[0]!.build(), report.changeset);
    if (!result.ok) throw new Error(result.error);
    expect(resolved(result.system, "color.brand.2")).toBe(hex("#3b82f6"));
    expect((result.system.generators["radius"]!.config as { base: number }).base).toBe(6);
  });

  it("points tesserai's own export at the bundle, and says when nothing maps", () => {
    const own = importDtcg(emitDtcg(PRESETS[0]!.build().tokens));
    expect(own).toMatchObject({ error: expect.stringMatching(/tesserai’s own token export/) });
    expect(importDtcg({ misc: { thing: { $value: "x", $type: "string" } } })).toMatchObject({ error: expect.stringMatching(/nothing in the file maps/) });
  });
});
