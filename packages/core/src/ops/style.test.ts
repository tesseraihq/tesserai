import { describe, expect, it } from "vitest";
import { dependentsOf } from "../component-groups";
import { resolveRecipe } from "../components";
import { emitCss } from "../emit-css";
import { parseLiteral } from "../literal";
import { DEFAULT_MODE } from "../modes";
import { PRESETS } from "../presets";
import { resolveToken } from "../resolve";
import { outputTokens, type DesignSystem } from "../system";
import { flattenTokens, getToken } from "../tokens";
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

const style = (input: Record<string, unknown>) => ({
  op: "component.setStyle",
  input: { component: "button", part: "root", scope: { kind: "all" }, ...input },
});

const root = (system: DesignSystem, selection: Record<string, string>) => resolveRecipe(system.components["button"]!, selection)["root"]!;

describe("recipe layers", () => {
  it("an intent layer beats the variant: only primary buttons are pill-shaped", () => {
    const next = run(base(), [style({ scope: { kind: "intent", name: "primary" }, property: "radius", value: "{radius.full}" })]);
    expect(root(next, { variant: "solid", intent: "primary" }).base.radius).toBe("{radius.full}");
    expect(root(next, { variant: "outline", intent: "primary" }).base.radius).toBe("{radius.full}");
    expect(root(next, { variant: "solid", intent: "danger" }).base.radius).toBe("{button.radius}");
  });

  it("a combination applies only where every named axis matches: solid primary buttons get a shadow", () => {
    const next = run(base(), [style({ scope: { kind: "combination", when: { variant: "solid", intent: "primary" } }, property: "shadow", value: "{shadow.md}" })]);
    expect(root(next, { variant: "solid", intent: "primary" }).base.shadow).toBe("{shadow.md}");
    expect(root(next, { variant: "soft", intent: "primary" }).base.shadow).toBeUndefined();
    expect(root(next, { variant: "solid", intent: "danger" }).base.shadow).toBeUndefined();
  });

  it("the more specific combination wins", () => {
    const next = run(base(), [
      style({ scope: { kind: "combination", when: { variant: "solid", intent: "primary", size: "lg" } }, property: "radius", value: "{radius.xl}" }),
      style({ scope: { kind: "combination", when: { variant: "solid", intent: "primary" } }, property: "radius", value: "{radius.lg}" }),
    ]);
    expect(root(next, { variant: "solid", intent: "primary", size: "lg" }).base.radius).toBe("{radius.xl}");
    expect(root(next, { variant: "solid", intent: "primary", size: "sm" }).base.radius).toBe("{radius.lg}");
  });

  it("a combination must name two axes", () => {
    expect(fails(base(), [style({ scope: { kind: "combination", when: { variant: "solid" } }, property: "radius", value: "{radius.lg}" })])).toMatch(/at least two/);
  });

  it("renaming or removing an intent carries its styles", () => {
    let next = run(base(), [
      style({ scope: { kind: "intent", name: "danger" }, property: "radius", value: "{radius.full}" }),
      style({ scope: { kind: "combination", when: { variant: "solid", intent: "danger" } }, property: "shadow", value: "{shadow.md}" }),
      { op: "intent.rename", input: { name: "danger", to: "critical" } },
    ]);
    expect(root(next, { variant: "solid", intent: "critical" }).base.radius).toBe("{radius.full}");
    expect(root(next, { variant: "solid", intent: "critical" }).base.shadow).toBe("{shadow.md}");
    next = run(next, [{ op: "intent.remove", input: { name: "critical", moveTo: "primary" } }]);
    expect(next.components["button"]!.intents["critical"]).toBeUndefined();
    expect(next.components["button"]!.compounds).toEqual([]);
  });

  it("renaming a variant carries its combinations", () => {
    const next = run(base(), [
      style({ scope: { kind: "combination", when: { variant: "solid", intent: "primary" } }, property: "shadow", value: "{shadow.md}" }),
      { op: "component.renameOption", input: { component: "button", axis: "variant", name: "solid", to: "filled" } },
    ]);
    expect(root(next, { variant: "filled", intent: "primary" }).base.shadow).toBe("{shadow.md}");
  });
});

describe("plain values", () => {
  it("4px only for buttons: a token the button owns, nothing else moves", () => {
    const before = base();
    const next = run(before, [style({ property: "radius", value: "4px" })]);
    expect(getToken(next.tokens, "button.custom.root-radius")?.$value).toEqual({ value: 4, unit: "px" });
    expect(root(next, { variant: "solid" }).base.radius).toBe("{button.custom.root-radius}");
    expect(getToken(next.tokens, "radius.md")).toEqual(getToken(before.tokens, "radius.md"));
    expect(emitCss(next.tokens)).toContain("--button-custom-root-radius: 4px");
  });

  it("scope and state are part of the token's name", () => {
    const next = run(base(), [style({ scope: { kind: "intent", name: "primary" }, state: "hover", property: "scale", value: "0.97" })]);
    expect(getToken(next.tokens, "button.custom.root-scale-primary-hover")?.$value).toBe(0.97);
  });

  it("a custom token nothing uses any more is deleted", () => {
    const next = run(base(), [style({ property: "radius", value: "4px" }), style({ property: "radius", value: "{radius.lg}" })]);
    expect(getToken(next.tokens, "button.custom.root-radius")).toBeUndefined();
    expect(next.components["button"]!.tokens["custom"]).toBeUndefined();
  });

  it("rejects a value of the wrong kind, saying what it takes", () => {
    expect(fails(base(), [style({ property: "radius", value: "big" })])).toMatch(/a length like 4px/);
    expect(fails(base(), [style({ property: "textTransform", value: "shouty" })])).toMatch(/uppercase/);
  });

  it("word-valued properties take their words", () => {
    const next = run(base(), [style({ property: "textTransform", value: "uppercase" }), style({ property: "borderStyle", value: "dashed" })]);
    expect(root(next, {}).base.textTransform).toBe("uppercase");
    expect(root(next, {}).base.borderStyle).toBe("dashed");
  });

  it("parses the forms people write", () => {
    expect(parseLiteral("dimension", "4")).toEqual({ value: 4, unit: "px" });
    expect(parseLiteral("dimension", "0.25rem")).toEqual({ value: 0.25, unit: "rem" });
    expect(parseLiteral("fontWeight", "Semi-bold")).toBe(600);
    expect(parseLiteral("duration", "0.2s")).toEqual({ value: 0.2, unit: "s" });
    expect(parseLiteral("number", "97%")).toBe(0.97);
    expect(parseLiteral("cubicBezier", "ease-out")).toEqual([0, 0, 0.58, 1]);
    expect(parseLiteral("fontFamily", `"Inter", sans-serif`)).toEqual(["Inter", "sans-serif"]);
    expect(parseLiteral("color", "#e11d48")).toBeDefined();
  });
});

describe("mode-scoped styles", () => {
  it("in dark mode cards get a thicker border; light mode keeps the one it had", () => {
    const next = run(base(), [
      { op: "component.setStyle", input: { component: "card", part: "root", scope: { kind: "all" }, property: "borderWidth", value: "2px", mode: { colorScheme: "dark" } } },
    ]);
    const card = resolveRecipe(next.components["card"]!, {})["root"]!;
    expect(card.base.borderWidth).toBe("{card.custom.root-border-width}");
    const flat = flattenTokens(next.tokens);
    const at = (colorScheme: "light" | "dark") => resolveToken(flat, "card.custom.root-border-width", { ...DEFAULT_MODE, colorScheme });
    expect(at("dark").$value).toEqual({ value: 2, unit: "px" });
    expect(at("light").$value).toEqual({ value: 1, unit: "px" });
  });

  it("a property that was not set is neutral outside the mode", () => {
    const next = run(base(), [
      { op: "component.setStyle", input: { component: "card", part: "root", scope: { kind: "all" }, property: "minHeight", value: "200px", mode: { density: "comfortable" } } },
    ]);
    expect(getToken(next.tokens, "card.custom.root-min-height")?.$value).toEqual({ value: 0, unit: "px" });
  });

  it("keeps what the property was outside the mode", () => {
    const next = run(base(), [style({ property: "radius", value: "{radius.full}", mode: { touch: true } })]);
    const token = getToken(next.tokens, "button.custom.root-radius");
    expect(token?.$value).toBe("{button.radius}");
    expect(token?.$modes).toEqual([{ selector: { touch: true }, value: "{radius.full}" }]);
  });

  it("an intent-following value needs an intent to be pinned to", () => {
    expect(fails(base(), [style({ scope: { kind: "variant", name: "solid" }, property: "background", value: "{color.brand.7}", mode: { colorScheme: "dark" } })])).toMatch(
      /follows the component's intent/,
    );
    const next = run(base(), [
      { op: "component.setStyle", input: { component: "button", part: "root", scope: { kind: "combination", when: { variant: "solid", intent: "primary" } }, property: "background", value: "{color.brand.7}", mode: { colorScheme: "dark" } } },
    ]);
    expect(getToken(next.tokens, "button.custom.root-background-solid-primary")?.$value).toBe("{intent.primary.solid}");
  });
});

describe("leaving components out", () => {
  it("a left-out component keeps its styles but emits nothing", () => {
    // Whatever needs Button goes first, each before anything it needs.
    const needers: string[] = [];
    const remaining = dependentsOf("button", Object.keys(base().components));
    while (remaining.length > 0) {
      const next = remaining.findIndex((n) => !remaining.some((m) => m !== n && dependentsOf(n, [m]).length > 0));
      needers.push(...remaining.splice(next === -1 ? 0 : next, 1));
    }
    const styled = run(base(), [
      style({ property: "radius", value: "4px" }),
      ...needers.map((component) => ({ op: "component.remove", input: { component } })),
      { op: "component.remove", input: { component: "button" } },
    ]);
    expect(styled.excluded).toEqual([...needers, "button"]);
    expect(Object.keys(outputTokens(styled))).not.toContain("button");
    const back = run(styled, [{ op: "component.restore", input: { component: "button" } }]);
    expect(back.excluded).toEqual(needers);
    expect(getToken(back.tokens, "button.custom.root-radius")?.$value).toEqual({ value: 4, unit: "px" });
  });

  it("a needed component can't be left out, and including a component includes what it needs", () => {
    expect(fails(base(), [{ op: "component.remove", input: { component: "button" } }])).toMatch(/needed by alert-dialog/);
    const out = run(base(), [
      { op: "component.remove", input: { component: "toggle-group" } },
      { op: "component.remove", input: { component: "toggle" } },
    ]);
    expect(run(out, [{ op: "component.restore", input: { component: "toggle-group" } }]).excluded).toEqual([]);
  });
});
