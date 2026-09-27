import { describe, expect, it } from "vitest";
import { emitCss } from "./emit-css";
import { DEFAULT_MODE } from "./modes";
import { applyBrands, applyChangeset, brandProblems, systemForBrand } from "./ops";
import { PRESETS } from "./presets";
import { resolveToken } from "./resolve";
import type { DesignSystem } from "./system";
import { flattenTokens, getToken } from "./tokens";

const shared = PRESETS[0]!.build();
function run(system: DesignSystem, ops: { op: string; input: unknown }[]): DesignSystem {
  const r = applyChangeset(system, { ops });
  if (!r.ok) throw new Error(r.error);
  return r.system;
}
const value = (s: DesignSystem, path: string, context = {}) => JSON.stringify(resolveToken(flattenTokens(s.tokens), path, { ...DEFAULT_MODE, ...context }).$value);

describe("brands", () => {
  const kids = run(shared, [
    { op: "brand.add", input: { name: "Acme Kids" } },
    { op: "brand.set", input: { id: "acme-kids", op: "palette.setColor", input: { name: "brand", color: "#e11d48" } } },
    { op: "brand.set", input: { id: "acme-kids", op: "radius.set", input: { base: 14 } } },
  ]);

  it("keep the shared system as it was and add the brand's values as a mode", () => {
    expect(value(kids, "color.brand.9")).toBe(value(shared, "color.brand.9"));
    expect(value(kids, "color.brand.9", { brand: "acme-kids" })).not.toBe(value(shared, "color.brand.9"));
    expect(value(kids, "radius.md", { brand: "acme-kids" })).toContain("0.875");
    // In dark mode too: the brand's own dark value, not the shared dark one.
    expect(value(kids, "color.brand.9", { brand: "acme-kids", colorScheme: "dark" })).not.toBe(value(kids, "color.brand.9", { colorScheme: "dark" }));
    // Tokens that point at the palette follow it without values of their own.
    const intent = flattenTokens(kids.tokens).get("intent.primary.subtle")!;
    expect(intent.$modes?.some((m) => m.selector.brand !== undefined) ?? false).toBe(false);
    expect(value(kids, "intent.primary.subtle", { brand: "acme-kids" })).not.toBe(value(kids, "intent.primary.subtle"));
  });

  it("can be taken back out, one change at a time, and are remade from scratch each time", () => {
    const back = run(kids, [{ op: "brand.reset", input: { id: "acme-kids", op: "radius.set" } }]);
    expect(value(back, "radius.md", { brand: "acme-kids" })).toBe(value(shared, "radius.md"));
    expect(value(back, "color.brand.9", { brand: "acme-kids" })).not.toBe(value(shared, "color.brand.9"));
    const again = JSON.parse(JSON.stringify(back)) as DesignSystem;
    applyBrands(again);
    applyBrands(again);
    expect(JSON.stringify(again.tokens)).toBe(JSON.stringify(back.tokens));
    const gone = run(back, [{ op: "brand.remove", input: { id: "acme-kids" } }]);
    expect(gone.brands).toBeUndefined();
    expect([...flattenTokens(gone.tokens).values()].some((t) => t.$modes?.some((m) => m.selector.brand !== undefined))).toBe(false);
  });

  it("follow the shared system where they don't differ", () => {
    const moved = run(kids, [{ op: "radius.set", input: { base: 2 } }]);
    // The brand's own radius stays; the shared one moved.
    expect(value(moved, "radius.md", { brand: "acme-kids" })).toContain("0.875");
    expect(value(moved, "radius.md")).toContain("0.125");
  });

  it("export one brand as a system of its own", () => {
    const alone = systemForBrand(kids, "acme-kids");
    expect(alone.brands).toBeUndefined();
    expect(value(alone, "color.brand.9")).toBe(value(kids, "color.brand.9", { brand: "acme-kids" }));
    expect(emitCss(alone.tokens)).not.toContain("data-brand");
    expect(value(systemForBrand(kids, "default"), "color.brand.9")).toBe(value(shared, "color.brand.9"));
  });

  it("refuse what a brand can't change, and say what no longer applies", () => {
    expect(applyChangeset(kids, { ops: [{ op: "brand.set", input: { id: "acme-kids", op: "palette.setColor", input: { name: "nope", color: "#000" } } }] }).ok).toBe(false);
    expect(applyChangeset(kids, { ops: [{ op: "brand.add", input: { name: "x", id: "default" } }] }).ok).toBe(false);
    const broken = JSON.parse(JSON.stringify(kids)) as DesignSystem;
    broken.brands!["acme-kids"]!.ops.push({ op: "palette.setColor", input: { name: "gone", color: "#000" } });
    expect(brandProblems(broken)["acme-kids"]).toHaveLength(1);
    expect(getToken(broken.tokens, "color.brand.9")).toBeDefined();
  });
});
