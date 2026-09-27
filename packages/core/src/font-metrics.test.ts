import { describe, expect, it } from "vitest";
import google from "./font-data/google-fonts.json";
import { emitCss } from "./emit-css";
import { systemCss } from "./emit-tailwind";
import { FONT_METRICS } from "./font-metrics-data";
import { fallbackOverrides, fontMetricsTable, loadFontMetrics } from "./font-metrics";
import { applyChangeset } from "./ops";
import { PRESETS } from "./presets";
import type { DesignSystem } from "./system";

const withFonts = (fonts: { sans: string[]; mono?: string[]; heading?: string[] }): DesignSystem => {
  const result = applyChangeset(PRESETS[0]!.build(), {
    ops: Object.entries(fonts).map(([role, families]) => ({ op: "type.setFont", input: { role, families } })),
  });
  if (!result.ok) throw new Error(result.error);
  return result.system;
};

describe("the font metrics table", () => {
  it("has five whole numbers per font, for the builder's Google Fonts and the local fallbacks", () => {
    const families = new Set((google as unknown as [string][]).map((row) => row[0].toLowerCase()));
    const seen = new Set<string>();
    for (const [family, unitsPerEm, ascent, descent, lineGap, xWidthAvg] of FONT_METRICS) {
      expect([unitsPerEm, ascent, descent, lineGap, xWidthAvg].every(Number.isInteger)).toBe(true);
      expect(unitsPerEm).toBeGreaterThan(0);
      expect(ascent).toBeGreaterThan(0);
      expect(xWidthAvg).toBeGreaterThan(0);
      expect(seen.has(family.toLowerCase())).toBe(false);
      seen.add(family.toLowerCase());
      expect(families.has(family.toLowerCase()) || ["Arial", "Times New Roman", "Courier New"].includes(family)).toBe(true);
    }
    for (const local of ["arial", "times new roman", "courier new"]) expect(seen.has(local)).toBe(true);
    // Capsize has nearly every family the builder offers; the few it lacks just get no fallback face.
    expect(seen.size / families.size).toBeGreaterThan(0.98);
  });
});

describe("metric-matched fallback faces", () => {
  it("sizes Arial to Inter as Next.js does", async () => {
    const table = await loadFontMetrics();
    const o = fallbackOverrides(table.get("inter")!, table.get("arial")!);
    // next/font writes Inter's fallback as 90.44% / 22.52% / 0.00% / 107.12%.
    expect([o.ascent, o.descent, o.lineGap, o.sizeAdjust].map((v) => v.toFixed(2))).toEqual(["90.44", "22.52", "0.00", "107.12"]);
  });

  it("puts the fallback right after its web font and adds its @font-face, drawn from the stack's kind of local font", async () => {
    const fontMetrics = await loadFontMetrics();
    const system = withFonts({ sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"], heading: ["Fraunces", "ui-serif", "Georgia", "serif"], mono: ["JetBrains Mono", "ui-monospace", "monospace"] });
    const css = systemCss(system, { fontMetrics });
    expect(css).toContain(`--font-sans: Inter, "Inter Fallback", ui-sans-serif, system-ui, sans-serif;`);
    expect(css).toContain(`--font-heading: Fraunces, "Fraunces Fallback", ui-serif, Georgia, serif;`);
    expect(css).toContain(`--font-mono: "JetBrains Mono", "JetBrains Mono Fallback", ui-monospace, monospace;`);
    expect(css).toContain(
      `@font-face {\n  font-family: "Inter Fallback";\n  src: local("Arial");\n  ascent-override: 90.44%;\n  descent-override: 22.52%;\n  line-gap-override: 0.00%;\n  size-adjust: 107.12%;\n}`,
    );
    expect(css).toContain(`font-family: "Fraunces Fallback";\n  src: local("Times New Roman");`);
    expect(css).toContain(`font-family: "JetBrains Mono Fallback";\n  src: local("Courier New");`);
    // One face per family, however many tokens name it (typography styles repeat the stacks).
    expect(css.match(/font-family: "Inter Fallback"/g)).toHaveLength(1);
  });

  it("matches families without case, and leaves unknown and platform fonts alone", () => {
    const fontMetrics = fontMetricsTable(FONT_METRICS);
    const css = emitCss(withFonts({ sans: ["inter", "sans-serif"], heading: ["Acme Grotesk", "Georgia", "serif"], mono: ["Courier New", "monospace"] }).tokens, fontMetrics);
    expect(css).toContain(`--font-sans: inter, "inter Fallback", sans-serif;`);
    expect(css).toContain(`--font-heading: "Acme Grotesk", Georgia, serif;`);
    expect(css).toContain(`--font-mono: "Courier New", monospace;`);
    expect(css.match(/@font-face/g)).toHaveLength(1);
  });

  it("changes nothing without metrics, or when every font is the platform's", () => {
    const fontMetrics = fontMetricsTable(FONT_METRICS);
    const web = withFonts({ sans: ["Inter", "ui-sans-serif", "sans-serif"] });
    expect(systemCss(web)).not.toContain("Fallback");
    expect(emitCss(web.tokens)).not.toContain("Fallback");
    const local = withFonts({ sans: ["ui-sans-serif", "system-ui", "sans-serif"], heading: ["Georgia", "serif"], mono: ["ui-monospace", "Menlo", "monospace"] });
    expect(systemCss(local, { fontMetrics })).toBe(systemCss(local));
    expect(emitCss(local.tokens, fontMetrics)).toBe(emitCss(local.tokens));
    expect(emitCss(web.tokens, new Map())).toBe(emitCss(web.tokens));
  });
});
