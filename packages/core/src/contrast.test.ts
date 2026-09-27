import { includedComponents } from "./system";
import { applyChangeset } from "./ops";
import { describe, expect, it } from "vitest";
import { oklch, parseColor } from "./color";
import { apcaContrast, checkContrast, summarizeContrast } from "./contrast";
import { PRESETS } from "./presets";
import { createSystemFromBrand } from "./system";
import { flattenTokens, setToken } from "./tokens";

describe("apcaContrast", () => {
  it("gives black on white about Lc 106 and white on black about Lc -108", () => {
    expect(apcaContrast(oklch(0, 0, 0), oklch(1, 0, 0))).toBeCloseTo(106, 0);
    expect(apcaContrast(oklch(1, 0, 0), oklch(0, 0, 0))).toBeCloseTo(-108, 0);
  });
  it("is zero for identical colors", () => {
    expect(apcaContrast(oklch(0.5, 0.1, 30), oklch(0.5, 0.1, 30))).toBe(0);
  });
});

describe("checkContrast", () => {
  const system = createSystemFromBrand("acme", parseColor("#2563eb")!);
  const checks = checkContrast(system.components, flattenTokens(system.tokens));

  it("checks text, border and ring pairs across components, states and schemes", () => {
    expect(checks.length).toBeGreaterThan(100);
    expect(checks.some((c) => c.component === "button" && c.state === "hover" && c.colorScheme === "dark")).toBe(true);
    expect(checks.some((c) => c.kind === "non-text" && c.part === "root" && c.foregroundRef.includes("border"))).toBe(true);
  });

  it("the default system passes on every pair that is not exempt", () => {
    const failing = checks.filter((c) => !c.passes && !c.exempt);
    expect(failing.map((c) => `${c.component}.${c.part} ${c.state ?? ""} ${JSON.stringify(c.selection)} ${c.kind} ${c.colorScheme} ${c.ratio}`)).toEqual([]);
  });

  it("suggests a passing scale step, and applying it breaks nothing else", () => {
    const broken = createSystemFromBrand("acme", parseColor("#2563eb")!);
    // Text on the primary subtle background pointed at a step far too light to read.
    setToken(broken.tokens, "intent.primary.subtle-foreground", { $type: "color", $value: "{color.brand.4}" });
    const result = checkContrast(broken.components, flattenTokens(broken.tokens));
    const fail = result.find((c) => c.foregroundRef === "{intent.primary.subtle-foreground}" && c.colorScheme === "light");
    expect(fail?.passes).toBe(false);
    expect(fail?.fix).toEqual({ token: "intent.primary.subtle-foreground", value: expect.stringMatching(/^\{color\.brand\.(7|8|9|10)\}$/) });
    const fix = fail?.fix;
    if (fix === undefined) throw new Error("no fix");
    setToken(broken.tokens, fix.token, { $type: "color", $value: fix.value });
    const after = checkContrast(broken.components, flattenTokens(broken.tokens));
    expect(after.filter((c) => !c.passes && !c.exempt).map((c) => `${c.component}.${c.part} ${c.state ?? ""} ${c.colorScheme} ${c.ratio}`)).toEqual([]);
  });

  it("fixes a hover fill a step or two from its fill: never a pale hover on a dark button, nor none", () => {
    const broken = createSystemFromBrand("acme", parseColor("#2563eb")!);
    // The hover pointed at a step too light for the button's white text.
    setToken(broken.tokens, "intent.primary.solid-hover", { $type: "color", $value: "{color.brand.4}" });
    const tokens = flattenTokens(broken.tokens);
    const fill = /\.(\d+)\}$/.exec(String(tokens.get("intent.primary.solid")?.$value))?.[1];
    const fail = checkContrast(broken.components, tokens).find((c) => c.backgroundRef === "{intent.primary.solid-hover}" && c.colorScheme === "light" && !c.passes);
    expect(fail).toBeDefined();
    expect(fail?.fix?.token).toBe("intent.primary.solid-hover");
    const step = Number(/\.(\d+)\}$/.exec(fail?.fix?.value ?? "")?.[1]);
    // Beside the fill, and not the fill itself (that would be no hover at all).
    expect(Math.abs(step - Number(fill))).toBeGreaterThanOrEqual(1);
    expect(Math.abs(step - Number(fill))).toBeLessThanOrEqual(2);
  });

  for (const hex of ["#facc15", "#22d3ee", "#f97316", "#a3e635", "#18181b", "#7c3aed"]) {
    it(`a ${hex} brand passes every non-exempt pair, or every failure has a safe fix`, () => {
      const s = createSystemFromBrand("brand", parseColor(hex)!);
      const result = checkContrast(s.components, flattenTokens(s.tokens));
      const failing = result.filter((c) => !c.passes && !c.exempt);
      for (const c of failing) {
        expect(c.fix, `${c.component}.${c.part} ${c.state ?? ""} ${c.kind} ${c.colorScheme} ${c.ratio}`).toBeDefined();
      }
      for (const c of failing) setToken(s.tokens, c.fix!.token, { $type: "color", $value: c.fix!.value });
      const after = checkContrast(s.components, flattenTokens(s.tokens)).filter((c) => !c.passes && !c.exempt);
      expect(after.map((c) => `${c.component}.${c.part} ${c.state ?? ""} ${c.kind} ${c.colorScheme} ${c.ratio}`)).toEqual([]);
    });
  }

  it("marks disabled states exempt", () => {
    expect(checks.filter((c) => c.state === "disabled").every((c) => c.exempt)).toBe(true);
    const summary = summarizeContrast(checks);
    expect(summary.checked).toBe(checks.length);
    expect(summary.failing).toBe(checks.filter((c) => !c.passes && !c.exempt).length);
  });

  for (const preset of PRESETS) {
    it(`${preset.id} preset has no failing non-exempt pairs of any kind`, () => {
      const s = preset.build();
      const failing = checkContrast(s.components, flattenTokens(s.tokens)).filter((c) => !c.passes && !c.exempt);
      expect(
        failing.map((c) => `${c.component}.${c.part} ${c.state ?? ""} ${c.selection.variant ?? ""} ${c.selection.intent ?? ""} ${c.kind} ${c.colorScheme} ${c.ratio}`),
      ).toEqual([]);
    });
  }
});

describe("a control border on a fill", () => {
  it("isn't held to 3:1 when the fill already stands out; a field's, on a fill like the page, still is", () => {
    const base = PRESETS[0]!.build();
    // Buttons and fields drawn with a black edge: on the dark page it disappears.
    const edge = (component: string) => [
      { op: "component.setStyle", input: { component, part: "root", scope: { kind: "all" }, state: "default", property: "borderWidth", value: "2px" } },
      { op: "component.setStyle", input: { component, part: "root", scope: { kind: "all" }, state: "default", property: "border", value: "#000000" } },
    ];
    const edged = applyChangeset(base, { ops: [...edge("button"), ...edge("input")] });
    if (!edged.ok) throw new Error(edged.error);
    const failing = checkContrast(includedComponents(edged.system), flattenTokens(edged.system.tokens)).filter((c) => !c.passes && c.kind === "non-text" && c.colorScheme === "dark" && c.state === undefined && c.foregroundRef.includes("border"));
    expect(failing.some((c) => c.component === "button" && c.selection["variant"] === "solid")).toBe(false);
    expect(failing.some((c) => c.component === "input")).toBe(true);
  });
});
