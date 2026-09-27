import { describe, expect, it } from "vitest";
import { DEFAULT_MODE } from "../modes";
import { applyChangeset } from "../ops/changeset";
import { PRESETS } from "../presets";
import { resolveToken } from "../resolve";
import { flattenTokens, type ColorValue } from "../tokens";
import { colorDistance, parseColor } from "../color";
import { readStylesheet } from "./css-look";
import { lookToSystem } from "./look";
import { jsonLines, readTokenFile, readTokenSets } from "./tokens-look";

function build(result: ReturnType<typeof lookToSystem>) {
  if ("error" in result) throw new Error(result.error);
  const applied = applyChangeset(PRESETS[0]!.build(), result.changeset);
  if (!applied.ok) throw new Error(applied.error);
  return applied.system;
}
const same = (system: ReturnType<typeof build>, path: string, css: string, scheme: "light" | "dark" = "light") =>
  colorDistance(resolveToken(flattenTokens(system.tokens), path, { ...DEFAULT_MODE, colorScheme: scheme }).$value as ColorValue, parseColor(css)!) < 1;

describe("reading a stylesheet", () => {
  it("keeps a :root inside a dark media query dark, and cites each line", () => {
    const css = [":root {", "  --clr-accent: #2563eb;", "  --clr-bg: #fafaf9;", "}", "@media (prefers-color-scheme: dark) {", "  :root { --clr-accent: #60a5fa; }", "}"].join("\n");
    const look = readStylesheet(css, "base.css");
    expect(look.colors.light.get("intent.primary.solid")).toMatchObject({ value: "#2563eb", source: "base.css:2" });
    expect(look.colors.dark.get("intent.primary.solid")).toMatchObject({ value: "#60a5fa", source: "base.css:6" });
  });

  it("follows Sass aliases to the line the color is written on, and reads Bootstrap's names", () => {
    const scss = ["$purple: #6f42c1;", "$primary: $purple;", "$body-color: #212529;", "$spacer: 1rem;", "$border-radius: .375rem;"].join("\n");
    const look = readStylesheet(scss, "_variables.scss");
    expect(look.colors.light.get("intent.primary.solid")).toMatchObject({ value: "#6f42c1", source: "_variables.scss:1" });
    expect(look.colors.light.get("intent.neutral.text-strong")?.value).toBe("#212529");
    expect(look.spacing?.value).toBe(4);
    expect(look.radius?.value).toBe(6);
  });

  it("reads bare RGB channels as RGB, and a legacy stylesheet's own rules", () => {
    const css = [":root { --color-background: 17 24 39; }", "body { font-family: Georgia, serif; font-size: 17px; }", ".btn-primary { background: #c2410c; color: #fff; }"].join("\n");
    const look = readStylesheet(css, "site.css");
    expect(look.colors.light.get("surface.page")?.value).toBe("rgb(17 24 39)");
    expect(look.colors.light.get("intent.primary.solid")?.value).toBe("#c2410c");
    expect(look.fonts.sans?.value[0]).toBe("Georgia");
    expect(look.baseSize?.value).toBe(17);
  });
});

describe("reading token files", () => {
  it("cites the line a value is on, following aliases, in DTCG and Tokens Studio sets", () => {
    const text = JSON.stringify({ color: { $type: "color", teal: { "600": { $value: "#0d9488" } }, primary: { $value: "{color.teal.600}" } } }, null, 2);
    const look = readTokenFile(JSON.parse(text), "t.json", text);
    if ("error" in look) throw new Error(look.error);
    expect(look.colors.light.get("intent.primary.solid")?.source).toBe(`t.json:${jsonLines(text).get("color.teal.600.$value")}`);
    const sets = readTokenSets([
      { file: "tokens/core.json", text: JSON.stringify({ core: { orange: { "600": { value: "#ea580c", type: "color" }, "500": { value: "#f97316", type: "color" }, "700": { value: "#c2410c", type: "color" } } } }) },
      { file: "tokens/light.json", text: JSON.stringify({ semantic: { accent: { value: "{core.orange.600}", type: "color" } } }) },
      { file: "tokens/dark.json", text: JSON.stringify({ semantic: { accent: { value: "{core.orange.500}", type: "color" } } }) },
    ]);
    if ("error" in sets) throw new Error(sets.error);
    expect(sets.colors.light.get("intent.primary.solid")?.value).toBe("#ea580c");
    expect(sets.colors.dark.get("intent.primary.solid")?.value).toBe("#f97316");
  });
});

describe("turning a look into a system", () => {
  it("pins what was found, fills what wasn't, and keeps the original's contrast problems as warnings", () => {
    const look = readStylesheet(":root { --primary: #0d9488; --primary-foreground: #ffffff; --radius: 6px; }", "g.css");
    const result = lookToSystem(look, "T");
    const system = build(result);
    expect(same(system, "intent.primary.solid", "#0d9488")).toBe(true);
    if ("error" in result) return;
    expect(result.found.map((c) => c.key)).toEqual(expect.arrayContaining(["light.primary", "light.primaryForeground", "radius"]));
    expect(result.filled).toEqual(expect.arrayContaining(["dark", "light.background", "font.sans"]));
    expect(result.warnings.join(" ")).toMatch(/Text on the primary color is 3\.\d+:1/);
  });
});
