import { describe, expect, it } from "vitest";
import { emitEslintConfig, emitOxlintConfig } from "./emit-lint";
import { PRESETS } from "./presets";

const system = PRESETS[0]!.build();
const options = { ui: "@/components/ui", componentsGlob: "src/components/ui/**", legacy: ["src/legacy/**"], exempt: ["src/marketing/**"] };

describe("lint config", () => {
  it("emits a flat eslint config with folder overrides", () => {
    const src = emitEslintConfig(system, options);
    expect(src).toContain('import { plugin as shadcn } from "@shadcn/lint";');
    expect(src).toContain('"ui": "@/components/ui"');
    expect(src).toContain('"mergeFunctions": [\n          "cn"');
    expect(src).toContain('"shadcn/no-restyle": [\n        "error"');
    expect(src).toContain('"parser": tsParser');
    expect(src).toContain('"shadcn": shadcn');
    expect(src).toContain('"src/components/ui/**"');
    expect(src).toContain('"src/legacy/**"');
    expect(src).toContain('"warn"');
    expect(src).toContain('"src/marketing/**"');
  });

  it("skips what frameworks build into the project (Nuxt's .output fails on its own directives)", () => {
    const src = emitEslintConfig(system, options);
    for (const dir of ["dist/**", ".output/**", ".nuxt/**", ".next/**", ".svelte-kit/**", "storybook-static/**"]) expect(src).toContain(`"${dir}"`);
    // A global ignore, first (SvelteKit's .svelte-kit/generated/root.svelte isn't the project's code), and oxlint's too.
    expect(src).toContain('export default defineConfig([\n  {\n    "ignores": [\n      "dist/**",');
    expect(JSON.parse(emitOxlintConfig(system, options)).ignorePatterns).toContain(".svelte-kit/**");
  });

  it("lets the generated components compute styles and carry library hook classes, but not raw colors", () => {
    // A fresh install lints clean: Progress's transform, ToggleGroup's spacing, Sonner's "toaster".
    const blocks = JSON.parse(emitOxlintConfig(system, options)) as { overrides: { files: string[]; rules: Record<string, unknown> }[] };
    const components = blocks.overrides.find((o) => o.files.includes("src/components/ui/**"))!.rules;
    expect(components["shadcn/no-inline-styles"]).toBe("off");
    expect(components["shadcn/no-unknown-classes"]).toBe("off");
    expect(components["shadcn/no-raw-colors"]).toBeUndefined();
  });

  it("emits an equivalent oxlint config as JSON", () => {
    const parsed = JSON.parse(emitOxlintConfig(system, options)) as { jsPlugins: string[]; overrides: unknown[]; rules: Record<string, unknown> };
    expect(parsed.jsPlugins).toEqual(["@shadcn/lint"]);
    expect(parsed.rules["shadcn/no-raw-colors"]).toBe("error");
    expect(parsed.overrides).toHaveLength(3);
  });
});
