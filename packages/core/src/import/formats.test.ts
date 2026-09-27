import { describe, expect, it } from "vitest";
import { pageVariables, readStylesheet } from "./css-look";
import { readThemeJson } from "./wordpress";

// Written before the readers, from each format's documentation (daisyUI 5 themes; WordPress
// theme.json v3; Ionic's --ion-* variables; Bootstrap 5.3 color modes). How they could go wrong:
// - daisyUI: base-100 read as a scale step, not the page; a dark theme (prefersdark / color-scheme)
//   read as light; --radius-field (controls) confused with --radius-box (cards).
// - WordPress: presets without the styles that use them (which slug is the button?); references
//   in either syntax (var:preset|color|x, var(--wp--preset--color--x)) not followed; the cited
//   line being the reference, not the palette entry holding the color.
// - Ionic: --ion-color-primary-shade/tint/rgb taken as the primary; .ion-palette-dark not dark.
// - Bootstrap: --bs-primary-bg-subtle taken as a neutral role; [data-bs-theme=dark] not dark.

const role = (look: ReturnType<typeof readStylesheet>, path: string, scheme: "light" | "dark" = "light") => look.colors[scheme].get(path)?.value;

describe("daisyUI 5 themes", () => {
  const css = [
    '@import "tailwindcss";',
    '@plugin "daisyui";',
    '@plugin "daisyui/theme" {',
    '  name: "harbor";',
    "  default: true;",
    "  color-scheme: light;",
    "  --color-base-100: oklch(98% 0.01 240);",
    "  --color-base-200: oklch(95% 0.02 240);",
    "  --color-base-content: oklch(22% 0.03 240);",
    "  --color-primary: oklch(52% 0.18 250);",
    "  --color-primary-content: oklch(98% 0.01 250);",
    "  --color-error: oklch(58% 0.22 25);",
    "  --radius-field: 0.375rem;",
    "  --radius-box: 1rem;",
    "}",
    '@plugin "daisyui/theme" {',
    '  name: "harbor-dark";',
    "  prefersdark: true;",
    "  color-scheme: dark;",
    "  --color-base-100: oklch(20% 0.02 240);",
    "  --color-base-content: oklch(92% 0.01 240);",
    "  --color-primary: oklch(70% 0.15 250);",
    "}",
  ].join("\n");
  const look = readStylesheet(css, "app.css");

  it("reads base-100 as the page and base-content as the text, per theme", () => {
    expect(role(look, "surface.page")).toBe("oklch(98% 0.01 240)");
    expect(role(look, "intent.neutral.text-strong")).toBe("oklch(22% 0.03 240)");
    expect(role(look, "intent.primary.solid")).toBe("oklch(52% 0.18 250)");
    expect(role(look, "intent.primary.solid-foreground")).toBe("oklch(98% 0.01 250)");
    expect(role(look, "intent.danger.solid")).toBe("oklch(58% 0.22 25)");
    expect(role(look, "surface.page", "dark")).toBe("oklch(20% 0.02 240)");
    expect(role(look, "intent.primary.solid", "dark")).toBe("oklch(70% 0.15 250)");
    expect(look.scales.find((s) => s.name === "base")).toBeUndefined();
  });

  it("takes the controls' corners, not the cards'", () => {
    expect(look.radius?.value).toBe(6);
    expect(look.colors.light.get("surface.page")?.source).toBe("app.css:7");
  });
});

describe("WordPress theme.json", () => {
  const json = {
    $schema: "https://schemas.wp.org/trunk/theme.json",
    version: 3,
    settings: {
      color: {
        palette: [
          { slug: "base", color: "#fbfaf7", name: "Base" },
          { slug: "contrast", color: "#1d1c19", name: "Contrast" },
          { slug: "accent", color: "#b4541c", name: "Accent" },
          { slug: "accent-ink", color: "#ffffff", name: "On accent" },
        ],
      },
      typography: {
        fontFamilies: [
          { slug: "body", fontFamily: "\"Source Serif 4\", Georgia, serif", name: "Body" },
          { slug: "heading", fontFamily: "Inter, sans-serif", name: "Heading" },
        ],
        fontSizes: [{ slug: "medium", size: "1.0625rem", name: "Medium" }],
      },
    },
    styles: {
      color: { background: "var(--wp--preset--color--base)", text: "var:preset|color|contrast" },
      typography: { fontFamily: "var:preset|font-family|body", fontSize: "var(--wp--preset--font-size--medium)" },
      elements: {
        button: { color: { background: "var:preset|color|accent", text: "var:preset|color|accent-ink" }, border: { radius: "4px" } },
        heading: { typography: { fontFamily: "var(--wp--preset--font-family--heading)" } },
      },
    },
  };
  const text = JSON.stringify(json, null, 2);
  const look = readThemeJson(json, "theme.json", text);

  it("reads roles from the styles that use the presets, in either reference syntax", () => {
    expect(role(look, "surface.page")).toBe("#fbfaf7");
    expect(role(look, "intent.neutral.text-strong")).toBe("#1d1c19");
    expect(role(look, "intent.primary.solid")).toBe("#b4541c");
    expect(role(look, "intent.primary.solid-foreground")).toBe("#ffffff");
    expect(look.fonts.sans?.value[0]).toBe("Source Serif 4");
    expect(look.fonts.heading?.value[0]).toBe("Inter");
    expect(look.baseSize?.value).toBe(17);
    expect(look.radius?.value).toBe(4);
  });

  it("cites the palette entry the color is written in", () => {
    const line = text.split("\n").findIndex((l) => l.includes('"#b4541c"')) + 1;
    expect(look.colors.light.get("intent.primary.solid")?.source).toBe(`theme.json:${line}`);
  });
});

describe("Ionic and Bootstrap 5.3 variables", () => {
  it("reads Ionic's palette, not its shades, and its dark palette class", () => {
    const css = [
      ":root {",
      "  --ion-color-primary: #3171e0;",
      "  --ion-color-primary-rgb: 49, 113, 224;",
      "  --ion-color-primary-contrast: #ffffff;",
      "  --ion-color-primary-shade: #2b63c5;",
      "  --ion-color-danger: #c5000f;",
      "  --ion-background-color: #f7f7f7;",
      "  --ion-text-color: #1c1c1c;",
      "  --ion-font-family: \"Nunito\", sans-serif;",
      "}",
      ".ion-palette-dark {",
      "  --ion-background-color: #121212;",
      "  --ion-text-color: #f2f2f2;",
      "}",
    ].join("\n");
    const look = readStylesheet(css, "variables.css");
    expect(role(look, "intent.primary.solid")).toBe("#3171e0");
    expect(role(look, "intent.primary.solid-foreground")).toBe("#ffffff");
    expect(role(look, "intent.danger.solid")).toBe("#c5000f");
    expect(role(look, "surface.page")).toBe("#f7f7f7");
    expect(role(look, "surface.page", "dark")).toBe("#121212");
    expect(look.fonts.sans?.value[0]).toBe("Nunito");
  });

  it("reads Bootstrap 5.3's color modes, and leaves a role's own tints alone", () => {
    const css = [
      ":root, [data-bs-theme=light] {",
      "  --bs-primary: #0b5ed7;",
      "  --bs-primary-bg-subtle: #cfe2ff;",
      "  --bs-body-bg: #ffffff;",
      "  --bs-body-color: #212529;",
      "  --bs-border-color: #dee2e6;",
      "}",
      "[data-bs-theme=dark] {",
      "  --bs-body-bg: #212529;",
      "  --bs-body-color: #dee2e6;",
      "}",
    ].join("\n");
    const look = readStylesheet(css, "custom.css");
    expect(role(look, "intent.primary.solid")).toBe("#0b5ed7");
    expect(role(look, "surface.page")).toBe("#ffffff");
    expect(role(look, "intent.neutral.text-strong")).toBe("#212529");
    expect(role(look, "intent.neutral.border")).toBe("#dee2e6");
    expect(role(look, "surface.page", "dark")).toBe("#212529");
    expect(role(look, "intent.neutral.subtle")).toBeUndefined();
  });
});

// Written before the fix. How names mislead: a component's own variable read as a global role
// (--navbar-background is the navbar's), a transparent value taken as a color, a variable the page
// is painted with (directly, or through an alias) read by its name ($paper as a card), and a
// dark-mode variable named with dark- first ($dark-page) read as light.
describe("when usage and names disagree", () => {
  it("Quasar: the page is what body paints with, and $dark-page is dark", () => {
    const vars = "$paper: #f6f4f0;\n$dark-page: #141920;\n$primary: #3d5a80;";
    const app = "body.body--light { background: $paper; color: #1f2933; }";
    const look = readStylesheet(vars, "quasar.variables.sass", [], [], new Set(pageVariables(app)));
    expect(role(look, "surface.page")).toBe("#f6f4f0");
    expect(role(look, "surface.page", "dark")).toBe("#141920");
    expect(role(look, "surface.card")).toBeUndefined();
  });

  it("Bulma: a component's variables are its own, transparent isn't a color, and an alias of the page is the page", () => {
    const css = "$paper: #f7f6f2;\n$navbar-background-color: transparent;\n$card-background-color: #ffffff;\n$body-background-color: $paper;";
    const look = readStylesheet(css, "_settings.scss");
    expect(role(look, "surface.page")).toBe("#f7f6f2");
    expect(look.colors.light.get("surface.page")?.source).toBe("_settings.scss:1");
    expect([...look.colors.light.values()].some((f) => f.value === "transparent")).toBe(false);
    expect(role(look, "surface.card")).toBe("#ffffff");
  });
});
