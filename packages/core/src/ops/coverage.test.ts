import { describe, expect, it } from "vitest";
import { listOverrides } from "../overrides";
import { PRESETS } from "../presets";
import type { DesignSystem } from "../system";
import { getToken } from "../tokens";
import { applyChangeset } from "./index";

const base = () => PRESETS[0]!.build();

function run(system: DesignSystem, ops: { op: string; input: unknown }[]): DesignSystem {
  const result = applyChangeset(system, { ops });
  if (!result.ok) throw new Error(result.error);
  return result.system;
}

function fails(system: DesignSystem, ops: { op: string; input: unknown }[]): string {
  const result = applyChangeset(system, { ops });
  if (result.ok) throw new Error("expected the changeset to fail");
  return result.error;
}

describe("tokens in general", () => {
  it("adds a shadow and a weight, from plain values and references", () => {
    const next = run(base(), [
      { op: "token.add", input: { path: "font.weight.light", type: "fontWeight", value: "300" } },
      { op: "token.add", input: { path: "shadow.xl", type: "shadow", value: "{shadow.lg}" } },
    ]);
    expect(getToken(next.tokens, "font.weight.light")?.$value).toBe(300);
    expect(getToken(next.tokens, "shadow.xl")?.$value).toBe("{shadow.lg}");
  });

  it("ends every font stack in a generic family, so a font that hasn't loaded never shows as Times", () => {
    const next = run(base(), [
      { op: "type.setFont", input: { role: "sans", families: ["Geist"] } },
      { op: "type.setFont", input: { role: "heading", families: ["Playfair Display"] } },
      { op: "type.setFont", input: { role: "mono", families: ["JetBrains Mono"] } },
    ]);
    expect(getToken(next.tokens, "font.family.sans")?.$value).toEqual(["Geist", "sans-serif"]);
    expect(getToken(next.tokens, "font.family.heading")?.$value).toEqual(["Playfair Display", "serif"]);
    expect(getToken(next.tokens, "font.family.mono")?.$value).toEqual(["JetBrains Mono", "monospace"]);
    expect(getToken(run(base(), [{ op: "type.setFont", input: { role: "sans", families: ["Inter", "system-ui"] } }]).tokens, "font.family.sans")?.$value).toEqual(["Inter", "system-ui"]);
  });

  it("sets a shadow from CSS text, as measured on a site or copied from DevTools", () => {
    const next = run(base(), [{ op: "token.set", input: { path: "shadow.md", value: "rgba(50, 50, 93, 0.25) 0px 13px 27px -5px, inset 0 1px 0 #fff" } }]);
    expect(getToken(next.tokens, "shadow.md")?.$value).toMatchObject([
      { offsetX: { value: 0 }, offsetY: { value: 13 }, blur: { value: 27 }, spread: { value: -5 }, color: { alpha: 0.25 } },
      { offsetY: { value: 1 }, blur: { value: 0 }, inset: true },
    ]);
    for (const bad of ["none", "0 0 #000 #fff", "big and soft"]) expect(applyChangeset(base(), { ops: [{ op: "token.set", input: { path: "shadow.md", value: bad } }] }).ok).toBe(false);
  });

  it("refuses to remove a token in use unless its uses move", () => {
    const system = run(base(), [{ op: "token.add", input: { path: "font.weight.heavy", type: "fontWeight", value: 800 } }]);
    const using = run(system, [
      { op: "component.setStyle", input: { component: "badge", part: "root", scope: { kind: "all" }, property: "fontWeight", value: "{font.weight.heavy}" } },
    ]);
    expect(fails(using, [{ op: "token.remove", input: { path: "font.weight.heavy" } }])).toMatch(/used in 1 place/);
    const moved = run(using, [{ op: "token.remove", input: { path: "font.weight.heavy", moveTo: "font.weight.bold" } }]);
    expect(getToken(moved.tokens, "font.weight.heavy")).toBeUndefined();
    expect(JSON.stringify(moved.components["badge"])).toContain("{font.weight.bold}");
  });

  it("will not remove or rename a generated token", () => {
    expect(fails(base(), [{ op: "token.remove", input: { path: "space.3" } }])).toMatch(/made by the space scale/);
    expect(fails(base(), [{ op: "token.rename", input: { path: "button.gap", to: "button.spacing" } }])).toMatch(/made by the button component/);
  });

  it("renames a token everywhere", () => {
    const next = run(base(), [{ op: "token.rename", input: { path: "opacity.disabled", to: "opacity.inactive" } }]);
    expect(getToken(next.tokens, "opacity.inactive")?.$value).toBe(0.5);
    expect(JSON.stringify(next.components)).not.toContain("{opacity.disabled}");
    expect(JSON.stringify(next.components)).toContain("{opacity.inactive}");
  });

  it("sets a token for one mode only", () => {
    const next = run(base(), [{ op: "token.set", input: { path: "focus.width", value: "3px", mode: { touch: true } } }]);
    const token = getToken(next.tokens, "focus.width");
    expect(token?.$value).toEqual({ value: 2, unit: "px" });
    expect(token?.$modes).toEqual([{ selector: { touch: true }, value: { value: 3, unit: "px" } }]);
  });
});

describe("scales", () => {
  it("fewer spacing steps move every use to the nearest remaining size", () => {
    const before = base();
    const g = before.generators["space"]?.config;
    if (g?.kind !== "spacing") throw new Error("no spacing");
    const next = run(before, [{ op: "spacing.setSteps", input: { multipliers: [1, 2, 4, 8] } }]);
    expect(getToken(next.tokens, "space.5")).toBeUndefined();
    // button.padding-x.md was space.5 (×4 = 16px); ×4 is step 3 now.
    expect(getToken(next.tokens, "button.padding-x.md")?.$value).toBe("{space.3}");
  });

  it("palette contrast spreads text away from the background, leaving the solid", () => {
    const before = base();
    const next = run(before, [{ op: "palette.setContrast", input: { name: "blue", contrast: 1.3 } }]);
    const l = (s: DesignSystem, step: number) => {
      const v = getToken(s.tokens, `color.blue.${step}`)?.$value;
      return typeof v === "object" && v !== null && "l" in v ? v.l : NaN;
    };
    expect(l(next, 10)).toBeLessThan(l(before, 10));
    expect(l(next, 7)).toBeCloseTo(l(before, 7));
  });
});

describe("what have I changed", () => {
  it("lists hand-set tokens, component changes and left-out components", () => {
    const next = run(base(), [
      { op: "token.set", input: { path: "color.brand.3", value: "#eeeeff" } },
      { op: "component.setStyle", input: { component: "button", part: "root", scope: { kind: "intent", name: "primary" }, property: "radius", value: "{radius.full}" } },
      { op: "component.remove", input: { component: "kbd" } },
    ]);
    const o = listOverrides(next);
    expect(o.pinned.map((p) => p.path)).toContain("color.brand.3");
    expect(o.components.find((c) => c.component === "button")?.changes).toContain("primary root radius: {radius.full}");
    expect(o.excluded).toEqual(["kbd"]);
  });
});
