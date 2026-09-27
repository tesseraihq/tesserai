import { describe, expect, it } from "vitest";
import { modeCssSelector, ModeSelector } from "./index";
import { emitPlatform } from "./emit-platforms";
import { PRESETS } from "./presets";
import { systemCss } from "./emit-tailwind";
import { IntentDef } from "./intents";
import { CustomIcon } from "./icons";
import type { DesignSystem } from "./system";

// A system can come from anyone (a share link, a team, an import, AI), and what it holds is written
// into CSS and code the builder's preview runs as the person viewing it. How that could go wrong,
// written down before the fix (AGENTS.md):
// 1. a free string in a JS // comment ends it with any line terminator (newline, carriage return, line and paragraph separators);
// 2. a free string in an identifier position carries non-identifier characters;
// 3. a font name written into CSS unquoted closes its declaration or rule (; { } newline /*);
// 4. a brand value inside [data-brand="…"] escapes its quotes;
// 5. tightening a schema rejects values real saved systems hold, so they no longer open;
// 6. escaping changes ordinary names' CSS, churning every project's generated files;
// 7. Kotlin and Dart string literals interpolate $;
// 8. Tailwind's compiler, which reads the theme before the browser does, takes a "!important"
//    inside a quoted value as the declaration's and cuts the value there.
// (1 and 2 are the templates' sinks: packages/templates/src/injection.test.ts.)

// CSS with its strings and comments taken out: what's left is what the browser reads as rules.
const outsideStrings = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/"(?:\\[\s\S]|[^"\\\n])*"|'(?:\\[\s\S]|[^'\\\n])*'/g, '""');

const PAYLOADS = ["x;}.evil{color:red}:root{--y:z", 'a";}.evil{color:red}', "a\\\";}.evil{x:y}", "a\n}.evil{color:red}", "a/*x*/}.evil{color:red}"];

function withSans(stack: string[]): DesignSystem {
  const system = PRESETS[0]!.build();
  const token = (system.tokens as Record<string, Record<string, Record<string, { $value: unknown }>>>)["font"]!["family"]!["sans"]!;
  token.$value = stack;
  return system;
}

describe("a system's strings never become CSS rules or code", () => {
  it("quotes any font name that isn't a plain identifier (3)", () => {
    for (const payload of PAYLOADS) {
      const css = systemCss(withSans([payload, "sans-serif"]), { includeImport: false });
      expect(outsideStrings(css), payload).not.toContain(".evil");
    }
  });

  // Tailwind's compiler reads !important even inside a quoted string, and cuts the value there:
  // a quoted name holds no literal "!" for it to find.
  it("writes a ! in a font name as an escape Tailwind can't read as !important (3)", () => {
    const css = systemCss(withSans(["x;}body{background:red!important}:root{--y:z", "sans-serif"]), { includeImport: false });
    expect(css).toContain('"x;}body{background:red\\21 important}:root{--y:z"');
    expect(css).not.toMatch(/--font-sans:[^\n]*!/);
  });

  it("leaves ordinary font names as they were (6)", () => {
    const css = systemCss(withSans(["Inter", "Geist Mono", "system-ui", "sans-serif"]), { includeImport: false });
    expect(css).toContain('--font-sans: Inter, "Geist Mono", system-ui, sans-serif');
  });

  it("escapes a brand value in a mode selector, and the schema takes only brand ids (4, 5)", () => {
    const payload = 'x"]{}.evil{color:red}[data-x="';
    expect(outsideStrings(modeCssSelector({ brand: payload }))).not.toContain(".evil");
    expect(ModeSelector.safeParse({ brand: payload }).success).toBe(false);
    for (const brand of ["default", "acme", "acme-2"]) expect(ModeSelector.safeParse({ brand }).success, brand).toBe(true);
  });

  it("takes an intent icon only as an icon name, and a custom icon's name without line breaks (1, 2, 5)", () => {
    expect(IntentDef.safeParse({ scale: "color.red", icon: 'circle-alert");}alert(1);("' }).success).toBe(false);
    for (const icon of ["circle-alert", "triangle-alert", "info", "AlertCircle"]) expect(IntentDef.safeParse({ scale: "color.red", icon }).success, icon).toBe(true);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>';
    for (const name of ["a\rimport('//evil')", "a\u2028b", "a\u2029b", "a\nb"]) expect(CustomIcon.safeParse({ name, svg }).success, JSON.stringify(name)).toBe(false);
    expect(CustomIcon.safeParse({ name: "Acme logo (dark)", svg }).success).toBe(true);
    // Every preset still opens (5).
    for (const preset of PRESETS) for (const intent of Object.values(preset.build().intents)) expect(IntentDef.safeParse(intent).success, preset.id).toBe(true);
  });

  it("keeps $ out of Kotlin and Dart string templates (7)", () => {
    const system = withSans(["${evil()}", "sans-serif"]);
    for (const format of ["kotlin", "dart"] as const) {
      const out = emitPlatform(system, format);
      expect(out, format).toContain("\\${evil()}");
      expect(out.replace(/\\\$/g, ""), format).not.toContain("${evil()}");
    }
  });
});
