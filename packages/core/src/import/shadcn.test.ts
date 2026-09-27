import { describe, expect, it } from "vitest";
import { parseColor, toCssOklch } from "../color";
import { DEFAULT_MODE } from "../modes";
import { applyChangeset } from "../ops/changeset";
import { PRESETS } from "../presets";
import { resolveToken } from "../resolve";
import { flattenTokens, type ColorValue } from "../tokens";
import { readCssVariables, readColor } from "./css";
import { emitTailwind } from "../emit-tailwind";
import { cssVarRef } from "../css-names";
import { outputTokens } from "../system";
import { importShadcnTheme, shadcnExportPaths } from "./shadcn";

// shadcn's default theme (neutral base), as `shadcn init` writes it into globals.css.
const DEFAULT_THEME = `
@import "tailwindcss";
@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --font-sans: var(--font-geist-sans);
  --radius-lg: var(--radius);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --popover: oklch(0.205 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}

@layer base {
  * { @apply border-border outline-ring/50; }
}
`;

// shadcn's older (Tailwind v3) themes store bare HSL channels.
const V3_THEME = `
@tailwind base;
@layer base {
  :root {
    --background: 0 0% 100%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --radius: 0.5rem;
  }
  .dark {
    --primary: 217.2 91.2% 59.8%;
  }
}
`;

function resolved(system: ReturnType<typeof PRESETS[0]["build"]>, path: string, scheme: "light" | "dark"): string {
  const r = resolveToken(flattenTokens(system.tokens), path, { ...DEFAULT_MODE, colorScheme: scheme });
  return toCssOklch(r.$value as ColorValue);
}
const same = (css: string) => toCssOklch(parseColor(css)!);

describe("reading theme CSS", () => {
  it("finds light, dark and @theme variables, nested in layers or not", () => {
    const v = readCssVariables(V3_THEME);
    expect(v.light.get("primary")).toBe("221.2 83.2% 53.3%");
    expect(v.dark.get("primary")).toBe("217.2 91.2% 59.8%");
    expect(readCssVariables(DEFAULT_THEME).theme.get("font-sans")).toBe("var(--font-geist-sans)");
    expect(readColor("221.2 83.2% 53.3%")).toEqual(parseColor("hsl(221.2 83.2% 53.3%)"));
  });
});

describe("importing a shadcn theme", () => {
  it("sets every color exactly, in light and dark, on the role it plays", () => {
    const report = importShadcnTheme(DEFAULT_THEME, "My app");
    if ("error" in report) throw new Error(report.error);
    const result = applyChangeset(PRESETS[1]!.build(), report.changeset);
    if (!result.ok) throw new Error(result.error);
    const s = result.system;
    expect(s.name).toBe("My app");
    expect(resolved(s, "intent.primary.solid", "light")).toBe(same("oklch(0.205 0 0)"));
    expect(resolved(s, "intent.primary.solid", "dark")).toBe(same("oklch(0.922 0 0)"));
    expect(resolved(s, "surface.page", "dark")).toBe(same("oklch(0.145 0 0)"));
    expect(resolved(s, "intent.danger.solid", "light")).toBe(same("oklch(0.577 0.245 27.325)"));
    expect(resolved(s, "intent.neutral.border", "dark")).toBe(same("oklch(1 0 0 / 10%)"));
    expect(resolved(s, "chart.1", "light")).toBe(same("oklch(0.646 0.222 41.116)"));
    expect((s.generators["radius"]!.config as { base: number }).base).toBe(10);
    expect(report.mapped).toContain("--primary → primary color");
    // Each found value says where it is, for the import report.
    expect(report.found).toContainEqual(expect.objectContaining({ key: "light.primary", source: expect.stringMatching(/^globals\.css:\d+$/) }));
    expect(report.skipped.map((x) => x.name)).toEqual(expect.arrayContaining(["--sidebar", "--sidebar-foreground", "--font-sans"]));
  });

  it("reads older HSL-channel themes, and keeps generated dark values where the file has none", () => {
    const report = importShadcnTheme(V3_THEME);
    if ("error" in report) throw new Error(report.error);
    const result = applyChangeset(PRESETS[0]!.build(), report.changeset);
    if (!result.ok) throw new Error(result.error);
    expect(resolved(result.system, "intent.primary.solid", "light")).toBe(same("hsl(221.2 83.2% 53.3%)"));
    expect(resolved(result.system, "intent.primary.solid", "dark")).toBe(same("hsl(217.2 91.2% 59.8%)"));
    expect((result.system.generators["radius"]!.config as { base: number }).base).toBe(8);
  });

  it("goes back out as it came in: every variable exports from the token it was imported to", () => {
    const report = importShadcnTheme(DEFAULT_THEME);
    if ("error" in report) throw new Error(report.error);
    const result = applyChangeset(PRESETS[1]!.build(), report.changeset);
    if (!result.ok) throw new Error(result.error);
    const s = result.system;
    const vars = readCssVariables(DEFAULT_THEME);
    const paths = new Map(shadcnExportPaths());
    let checked = 0;
    for (const scheme of ["light", "dark"] as const) {
      for (const [name, raw] of scheme === "light" ? vars.light : vars.dark) {
        // The sidebar follows the system rather than the file; the radius isn't a color.
        if (name === "radius" || name.startsWith("sidebar")) continue;
        const path = paths.get(name);
        expect([name, path !== undefined]).toEqual([name, true]);
        expect([name, scheme, resolved(s, path!, scheme)]).toEqual([name, scheme, same(raw)]);
        checked++;
      }
    }
    // shadcn's default theme: 37 colors across light and dark, not counting the sidebar.
    expect(checked).toBe(37);
    // And the CSS names each one, sidebar included, so shadcn's own code and blocks keep working.
    const css = emitTailwind(outputTokens(s), { intents: s.intents });
    for (const [name, path] of shadcnExportPaths()) {
      if (name.startsWith("chart-")) continue;
      expect(css).toContain(`--color-${name}: ${cssVarRef(path)};`);
    }
  });

  it("says why when there's nothing to import", () => {
    expect(importShadcnTheme("body { color: red }")).toEqual({ error: "no CSS variables found under :root or .dark" });
  });
});
