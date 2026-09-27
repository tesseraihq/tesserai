import { describe, expect, it } from "vitest";
import { parseColor } from "./color";
import { cssVarName } from "./css-names";
import { emitCss, modeCssSelector, tokenDecls } from "./emit-css";
import { emitDtcg } from "./emit-dtcg";
import { emitTailwind } from "./emit-tailwind";
import { createSystemFromBrand } from "./system";
import { TokenGroup } from "./tokens";
import { px } from "./units";

describe("cssVarName", () => {
  it("uses Tailwind namespaces where they exist", () => {
    expect(cssVarName("color.blue.9")).toBe("--color-blue-9");
    expect(cssVarName("intent.primary.solid-hover")).toBe("--color-primary-solid-hover");
    expect(cssVarName("font.family.sans")).toBe("--font-sans");
    expect(cssVarName("font.size.3")).toBe("--text-3");
    expect(cssVarName("font.leading.3")).toBe("--text-3--line-height");
    expect(cssVarName("radius.md")).toBe("--radius-md");
    expect(cssVarName("motion.easing.standard")).toBe("--ease-standard");
  });
  it("falls back to the dashed path", () => {
    expect(cssVarName("space.4")).toBe("--space-4");
    expect(cssVarName("button.padding.x")).toBe("--button-padding-x");
  });
});

describe("tokenDecls", () => {
  it("keeps references as var()", () => {
    expect(tokenDecls("button.padding.x", { $type: "dimension", $value: "{space.4}" })).toEqual([
      { name: "--button-padding-x", value: "var(--space-4)" },
    ]);
  });
  it("formats shadows with nested references", () => {
    const [d] = tokenDecls("shadow.sm", {
      $type: "shadow",
      $value: [{ offsetX: px(0), offsetY: px(1), blur: px(2), spread: px(0), color: "{color.neutral.12}" }],
    });
    expect(d?.value).toBe("0px 1px 2px 0px var(--color-neutral-12)");
  });
  it("splits typography into properties", () => {
    const decls = tokenDecls("type.body", {
      $type: "typography",
      $value: { fontFamily: "{font.family.sans}", fontSize: px(14), fontWeight: 400, lineHeight: 1.5 },
    });
    expect(decls.map((d) => d.name)).toEqual([
      "--type-body-font-family",
      "--type-body-font-size",
      "--type-body-font-weight",
      "--type-body-line-height",
    ]);
    expect(decls[0]?.value).toBe("var(--font-sans)");
  });
  it("quotes font families with spaces", () => {
    expect(tokenDecls("font.family.sans", { $type: "fontFamily", $value: ["Inter Tight", "sans-serif"] })[0]?.value).toBe(
      '"Inter Tight", sans-serif',
    );
  });
});

describe("modeCssSelector", () => {
  it("maps single axes", () => {
    expect(modeCssSelector({ colorScheme: "dark" })).toBe(".dark");
    expect(modeCssSelector({ density: "compact" })).toBe('[data-density="compact"]');
    expect(modeCssSelector({ touch: true })).toBe('[data-touch="true"]');
  });
  it("covers same-element and nested combinations", () => {
    expect(modeCssSelector({ brand: "acme", colorScheme: "dark" })).toBe(
      '[data-brand="acme"].dark, [data-brand="acme"] .dark, .dark [data-brand="acme"]',
    );
  });
});

describe("emitCss", () => {
  const group = TokenGroup.parse({
    color: {
      blue: {
        "3": { $type: "color", $value: { l: 0.9, c: 0.05, h: 250 }, $modes: [{ selector: { colorScheme: "dark" }, value: { l: 0.25, c: 0.05, h: 250 } }] },
        "9": { $type: "color", $value: { l: 0.55, c: 0.2, h: 250 } },
      },
    },
    intent: { primary: { subtle: { $type: "color", $value: "{color.blue.3}" }, solid: { $type: "color", $value: "{color.blue.9}" } } },
    space: { "4": { $type: "dimension", $value: px(16), $modes: [{ selector: { density: "compact" }, value: px(12) }] } },
  });
  const css = emitCss(group);

  it("emits base values with references intact", () => {
    expect(css).toContain(":root {");
    expect(css).toContain("--color-primary-subtle: var(--color-blue-3);");
    expect(css).toContain("--color-blue-9: oklch(0.55 0.2 250);");
  });

  it("redeclares dependents concretely inside mode blocks", () => {
    const dark = css.slice(css.indexOf(".dark {"));
    expect(dark).toContain("--color-blue-3: oklch(0.25 0.05 250);");
    expect(dark).toContain("--color-primary-subtle: oklch(0.25 0.05 250);");
    expect(dark).not.toContain("--color-blue-9");
    expect(dark).not.toContain("--color-primary-solid");
  });

  it("emits one block per distinct selector", () => {
    expect(css).toContain('[data-density="compact"] {\n  --space-4: 12px;\n}');
  });

  it("uses a mode value that matches the default context as the base value", () => {
    const out = emitCss(
      TokenGroup.parse({
        x: { $type: "number", $value: 1, $modes: [{ selector: { colorScheme: "light" }, value: 2 }] },
      }),
    );
    expect(out).toContain("--x: 2;");
    expect(out).not.toContain(".light");
  });
});

describe("modeCssSelector with three axes", () => {
  it("still produces a valid selector list", () => {
    const s = modeCssSelector({ brand: "acme", colorScheme: "dark", density: "compact" });
    expect(s.split(", ")).toHaveLength(3);
    expect(s).toContain('[data-brand="acme"].dark[data-density="compact"]');
  });
});

describe("full system", () => {
  const system = createSystemFromBrand("acme", parseColor("#2563eb")!);

  it("emits tailwind with theme, aliases and dark block", () => {
    const out = emitTailwind(system.tokens, { intents: system.intents });
    expect(out).toContain('@import "tailwindcss";');
    expect(out).toContain("@theme static {\n  --spacing: 0.25rem;");
    expect(out).toContain("--color-primary: var(--color-primary-solid);");
    // shadcn's page background is the page surface, as the importer reads it.
    expect(out).toContain("--color-background: var(--surface-page);");
    expect(out).toContain("--color-sidebar: var(--color-neutral-background);");
    expect(out).toContain("--text-3: 1rem;");
    expect(out).toContain("--text-3--line-height: 1.5;");
    expect(out).toContain(".dark {");
  });

  // Tailwind's steps size icons, rows and popovers as well as spacing: they stay 4px whatever the
  // unit, and scale with density only.
  it("keeps Tailwind's spacing step at 0.25rem, scaled by density, whatever the unit", () => {
    const out = emitTailwind(system.tokens, { intents: system.intents });
    expect(out).toMatch(/\[data-density="compact"\][^{]*\{[^}]*--spacing: 0\.1875rem;/);
    expect(out).toMatch(/\[data-density="comfortable"\][^{]*\{[^}]*--spacing: 0\.3125rem;/);
    const halved = emitTailwind(system.tokens, { intents: system.intents, spacingUnit: "space.1" });
    expect(halved).toContain("@theme static {\n  --spacing: 0.25rem;");
    expect(halved).not.toContain("--spacing: var(");
  });

  it("emits DTCG with oklch color objects and folded extensions", () => {
    const dtcg = emitDtcg(system.tokens) as Record<string, Record<string, Record<string, Record<string, unknown>>>>;
    // The seed is the solid step: 7 in a 10-step palette.
    const solid = dtcg["color"]?.["brand"]?.["7"];
    expect(solid?.$type).toBe("color");
    expect(solid?.$value).toMatchObject({ colorSpace: "oklch", hex: "#2563eb" });
    const ext = solid?.$extensions as Record<string, Record<string, unknown>>;
    expect(ext["dev.tesserai"]?.modes).toHaveLength(1);
    expect(ext["dev.tesserai"]?.meta).toEqual({ generated: { by: "brand", step: "7" } });
    expect(dtcg["intent"]?.["primary"]?.["solid"]?.$value).toBe("{color.brand.7}");
  });
});
