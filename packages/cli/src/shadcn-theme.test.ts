import { compile } from "@tailwindcss/node";
import { PRESETS } from "@tesserai/core";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { init } from "./init";
import { takeOverShadcnTheme } from "./shadcn-theme";

// The globals.css `shadcn init` writes into a Next.js app (v4, neutral), trimmed of nothing that
// matters here: its theme blocks, and the base layer and imports that must survive.
const SHADCN_GLOBALS = `@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar: var(--sidebar);
  --color-primary: var(--primary);
  --color-muted-foreground: var(--muted-foreground);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --sidebar: oklch(0.985 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --sidebar: oklch(0.205 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
`;

describe("taking over shadcn's theme", () => {
  it("moves out shadcn's variables and its @theme mapping, and nothing else", () => {
    const { css, removed } = takeOverShadcnTheme(SHADCN_GLOBALS);
    expect(removed).toHaveLength(3);
    expect(css).not.toContain("--background:");
    expect(css).not.toContain("--color-background: var(--background)");
    expect(css).not.toContain("calc(var(--radius) - 2px)");
    // What isn't shadcn's theme stays exactly as it was.
    expect(css).toContain('@import "tw-animate-css";');
    expect(css).toContain("@custom-variant dark (&:is(.dark *));");
    expect(css).toContain("@apply bg-background text-foreground;");
    // Running it again changes nothing.
    expect(takeOverShadcnTheme(css)).toEqual({ css, removed: [] });
  });

  it("keeps a project's own variables and theme lines beside shadcn's", () => {
    const mine = SHADCN_GLOBALS.replace("  --radius: 0.625rem;", "  --radius: 0.625rem;\n  --header-height: 64px;").replace(
      "  --radius-lg: var(--radius);",
      "  --radius-lg: var(--radius);\n  --breakpoint-3xl: 120rem;",
    );
    const { css } = takeOverShadcnTheme(mine);
    expect(css).toMatch(/:root \{\n {2}--header-height: 64px;\n\}/);
    expect(css).toMatch(/@theme inline \{\n {2}--breakpoint-3xl: 120rem;\n\}/);
  });

  it("leaves a stylesheet with no shadcn theme alone", () => {
    const plain = `@import "tailwindcss";\n\n:root {\n  --brand: red;\n  --gap: 4px;\n}\n`;
    expect(takeOverShadcnTheme(plain)).toEqual({ css: plain, removed: [] });
  });
});

describe("tesserai init in a shadcn app", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "tesserai-shadcn-"));
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  it("makes the system's theme the one Tailwind compiles, keeping shadcn's in a file beside it", async () => {
    const project = join(dir, "app");
    await mkdir(join(project, "app"), { recursive: true });
    await writeFile(join(project, "package.json"), JSON.stringify({ name: "app", dependencies: { next: "^16", react: "^19" }, devDependencies: { tailwindcss: "^4.3.0" } }));
    await writeFile(join(project, "tsconfig.json"), JSON.stringify({ compilerOptions: { paths: { "@/*": ["./*"] } } }));
    await writeFile(join(project, "components.json"), JSON.stringify({ style: "new-york", tailwind: { css: "app/globals.css" }, aliases: { components: "@/components", ui: "@/components/ui" } }));
    await writeFile(join(project, "app/globals.css"), SHADCN_GLOBALS);
    const bundle = join(dir, "acme.tesserai.json");
    await writeFile(bundle, JSON.stringify(PRESETS[0]!.build()));

    const result = await init({ bundlePath: bundle, dir: project, base: "radix", install: false, lint: false });
    expect(result.written.some((w) => w.includes("moved shadcn's own theme"))).toBe(true);
    expect(await readFile(join(project, "tesserai/replaced-shadcn-theme.css"), "utf8")).toContain("--background: oklch(1 0 0);");

    // Compiled by Tailwind itself, as the app's build would: tesserai.css inlined where the
    // stylesheet imports it (the temporary project has no node_modules to resolve it from).
    const globals = await readFile(join(project, "app/globals.css"), "utf8");
    const importLine = /@import "(\.{1,2}\/[^"]*tesserai\.css)";/.exec(globals);
    expect(importLine).not.toBeNull();
    const system = await readFile(join(project, "app", importLine![1]!), "utf8");
    const source = globals.replace(importLine![0], system).replace('@import "tw-animate-css";', "");
    const here = dirname(fileURLToPath(import.meta.url));
    const compiler = await compile(source, { base: here, onDependency() {} });
    const out = compiler.build(["bg-background", "bg-primary", "rounded-md", "font-sans", "bg-sidebar", "text-muted-foreground"]);

    // Every shadcn utility resolves to the system's tokens (inlined, as @theme inline does), not
    // shadcn's own values: the page surface, the neutral palette, tesserai's radius and font.
    expect(out).toMatch(/\.bg-background \{\s*background-color: var\(--surface-page\)/);
    expect(out).toMatch(/\.bg-sidebar \{\s*background-color: var\(--color-neutral-background\)/);
    expect(out).toMatch(/\.bg-primary \{\s*background-color: var\(--color-primary-solid\)/);
    expect(out).toMatch(/\.rounded-md \{\s*border-radius: var\(--radius-md\)/);
    // The system's own font stack (this preset's is Geist, with its metric-matched fallback face),
    // not shadcn's next/font variable.
    expect(out).toMatch(/--font-sans: Geist, "Geist Fallback", ui-sans-serif/);
    expect(out).toMatch(/@font-face \{\s*font-family: "Geist Fallback";\s*src: local\("Arial"\);/);
    expect(out).not.toContain("calc(var(--radius) - 2px)");
    expect(out).not.toContain("var(--font-geist-sans)");
    expect(out).not.toMatch(/--background: oklch\(1 0 0\)/);
    // The page itself, without shadcn's base styles, and the browser's controls in dark mode.
    expect(out).toMatch(/body \{\s*background-color: var\(--surface-page\);\s*color: var\(--color-neutral-text-strong\)/);
    expect(out).toMatch(/\.dark \{[^}]*color-scheme: dark/);
  });
});
