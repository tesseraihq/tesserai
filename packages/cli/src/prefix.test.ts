import { compile } from "@tailwindcss/node";
import { PRESETS, systemCss } from "@tesserai/core";
import { BASES, prefixFiles, renderAll } from "@tesserai/templates";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { init } from "./init";
import { sync } from "./sync";

const here = dirname(fileURLToPath(import.meta.url));
let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "tesserai-prefix-"));
});
afterEach(() => rm(dir, { recursive: true, force: true }));

async function project(system = PRESETS[0]!.build()): Promise<{ app: string; bundle: string }> {
  const app = join(dir, "app");
  await mkdir(join(app, "src"), { recursive: true });
  await writeFile(join(app, "package.json"), JSON.stringify({ name: "app", dependencies: { react: "^19" }, devDependencies: { vite: "^8", tailwindcss: "^4.3.0" } }));
  await writeFile(join(app, "tsconfig.json"), JSON.stringify({ compilerOptions: { paths: { "@/*": ["./src/*"] } } }));
  await writeFile(join(app, "components.json"), JSON.stringify({ style: "new-york", tailwind: { css: "src/index.css", prefix: "" } }));
  await writeFile(join(app, "src/index.css"), '@import "tailwindcss";\n');
  const bundle = join(dir, "acme.tesserai.json");
  await writeFile(bundle, JSON.stringify(system));
  return { app, bundle };
}

// The app's stylesheet as Tailwind compiles it, tesserai.css inlined where it's imported.
async function compiled(app: string) {
  const globals = await readFile(join(app, "src/index.css"), "utf8");
  const tesserai = await readFile(join(app, "src/tesserai.css"), "utf8");
  return compile(globals.replace(/@import "\.\/tesserai\.css";/, tesserai), { base: here, onDependency() {} });
}

// Words in a source that could be classes (Tailwind ignores the ones that aren't).
const words = (source: string) => [...new Set(source.split(/[\s"'`]+/).map((t) => t.replace(/[,;)}\]]+$/, "").replace(/^[({[]+/, "")).filter((t) => t.length > 1 && t.length < 120))];
const selector = (cls: string) => new RegExp(`\\.${cls.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\\\${c}`).replace(/[\\^$.*+?()[\]{}|]/g, "\\$&")}(?![a-zA-Z0-9_\\\\-])`);

describe("a Tailwind class prefix", () => {
  it("installs with --prefix: the stylesheet, every class, tailwind-merge, shadcn's config and the agents' guide", async () => {
    const { app, bundle } = await project();
    const result = await init({ bundlePath: bundle, dir: app, base: "radix", install: false, lint: false, prefix: "acme" });
    expect(result.prefix).toBe("acme");
    expect(await readFile(join(app, "src/index.css"), "utf8")).toMatch(/^@import "tailwindcss" prefix\(acme\);\n@import "\.\/tesserai\.css";/);
    const button = await readFile(join(app, "src/components/ui/button.tsx"), "utf8");
    expect(button).toContain('"acme:inline-flex');
    expect(button).not.toMatch(/"inline-flex /);
    expect(await readFile(join(app, "src/lib/utils.ts"), "utf8")).toContain('extendTailwindMerge({ prefix: "acme",');
    expect(JSON.parse(await readFile(join(app, "components.json"), "utf8")).tailwind.prefix).toBe("acme");
    const agents = await readFile(join(app, "AGENTS.md"), "utf8");
    expect(agents).toContain("`acme:bg-primary-solid`");
    expect(agents).toContain("`acme:hover:bg-primary-solid`");

    // Tailwind builds the prefixed classes from the system's own variables, which dark mode and
    // density still switch; unprefixed classes build nothing.
    const out = (await compiled(app)).build(["acme:bg-primary-solid", "acme:rounded-md", "acme:gap-2", "acme:font-sans", "acme:hover:bg-primary-solid-hover", "bg-primary-solid"]);
    expect(out).toMatch(/\.acme\\:bg-primary-solid \{\s*background-color: var\(--color-primary-solid\)/);
    expect(out).toMatch(/\.acme\\:rounded-md \{\s*border-radius: var\(--radius-md\)/);
    expect(out).toMatch(/\.acme\\:gap-2 \{\s*gap: calc\(var\(--spacing\) \* 2\)/);
    expect(out).toMatch(/\.acme\\:font-sans \{\s*font-family: var\(--font-sans\)/);
    expect(out).not.toMatch(/(^|\s)\.bg-primary-solid \{/m);
    expect(out).toMatch(/\.dark \{[^}]*--color-primary-solid:/);
    expect(out).toMatch(/--acme-default-font-family: var\(--font-sans\)/);
  });

  it("keeps responsive classes working with a prefix (a breakpoint is a value, not a var(), in a media query)", async () => {
    // The sidebar is hidden md:block: with var(--breakpoint-md) in its media query it never showed.
    const { app, bundle } = await project();
    await init({ bundlePath: bundle, dir: app, base: "radix", install: false, lint: false, prefix: "acme" });
    const css = (await compiled(app)).build(["acme:md:block", "acme:sm:flex", "acme:lg:grid-cols-2"]);
    expect(css).not.toMatch(/@media[^{]*var\(--breakpoint/);
    expect(css).toMatch(/@media \(width >= (48rem|768px)\)[^{]*\{\s*\.acme\\:md\\:block/);
    expect(css).toMatch(/@media \(width >= (40rem|640px)\)/);
  });

  it("leaves no class unprefixed in any component, on every library", { timeout: 180_000 }, async () => {
    const system = PRESETS[0]!.build();
    system.excluded = [];
    const plain = await compile(systemCss(system), { base: here, onDependency() {} });
    // Words that compile as utilities but aren't classes where they appear: data-slot and role
    // values, variant names, comments.
    const notClasses: Record<string, string[]> = {
      "lib/utils.ts": ["text-2", "text-neutral-text"],
      "components/ui/table.tsx": ["container", "table", "table-row", "table-cell", "table-caption"],
      "components/ui/context-menu.tsx": ["group"],
      "components/ui/menubar.tsx": ["group"],
      "components/ui/button-group.tsx": ["group"],
      "components/ui/carousel.tsx": ["group", "outline"],
      "components/ui/data-table.tsx": ["table", "filter", "outline"],
      "components/ui/select.tsx": ["contents"],
      "components/ui/command.tsx": ["filter"],
      "components/ui/aspect-ratio.tsx": ["16"],
      ...Object.fromEntries(["pagination", "alert", "date-picker", "message-scroller"].map((c) => [`components/ui/${c}.tsx`, ["outline"]])),
    };
    for (const base of BASES) {
      const files = await renderAll(base, system);
      const prefixed = await prefixFiles(files, "acme");
      const missed: string[] = [];
      files.forEach((file, i) => {
        const candidates = words(file.source);
        const out = plain.build(candidates);
        for (const word of candidates) {
          if (!selector(word).test(out) || (notClasses[file.path] ?? []).includes(word)) continue;
          if (!prefixed[i]!.source.includes(`acme:${word}`)) missed.push(`${file.path}: ${word}`);
        }
      });
      expect([base, missed]).toEqual([base, []]);
    }
  });

  it("never adds the system's own default to an app's stylesheet, and sync follows the stylesheet", async () => {
    const system = PRESETS[0]!.build();
    system.tailwindPrefix = "acme";
    const { app, bundle } = await project(system);
    const result = await init({ bundlePath: bundle, dir: app, base: "radix", install: false, lint: false });
    expect(result.prefix).toBeUndefined();
    expect(await readFile(join(app, "src/index.css"), "utf8")).not.toContain("prefix(");
    expect(await readFile(join(app, "src/components/ui/button.tsx"), "utf8")).not.toContain("acme:");
    expect(result.warnings.some((w) => w.includes("npx @tesserai/cli init --prefix acme"))).toBe(true);

    // The team adds the prefix to their stylesheet; sync writes everything to match.
    const css = await readFile(join(app, "src/index.css"), "utf8");
    await writeFile(join(app, "src/index.css"), css.replace('@import "tailwindcss";', '@import "tailwindcss" prefix(acme);'));
    const synced = await sync({ dir: app, force: false, log: () => {} });
    expect(synced.files.find((f) => f.path === "src/components/ui/button.tsx")?.outcome).toBe("updated");
    expect(await readFile(join(app, "src/components/ui/button.tsx"), "utf8")).toContain('"acme:inline-flex');
    expect(await readFile(join(app, "src/tesserai.css"), "utf8")).toMatch(/@theme inline \{[^}]*--color-primary-solid: var\(--color-primary-solid\);/);
    expect(JSON.parse(await readFile(join(app, "components.json"), "utf8")).tailwind.prefix).toBe("acme");
    // lib/utils.ts is the project's once written; sync says what it needs rather than rewriting it.
    expect(synced.warnings.some((w) => w.includes('add prefix: "acme" to its extendTailwindMerge'))).toBe(true);
  });

  it("in a Svelte project, finds its utils.ts in src/lib to say what cn() needs for the prefix", async () => {
    // Svelte's code folder is src/lib itself: the check looked in src/lib/lib/utils.ts and never warned.
    const app = join(dir, "kit");
    await mkdir(join(app, "src/lib"), { recursive: true });
    await writeFile(join(app, "package.json"), JSON.stringify({ name: "kit", devDependencies: { "@sveltejs/kit": "^2", svelte: "^5", tailwindcss: "^4.3.0" } }));
    await writeFile(join(app, "src/app.css"), '@import "tailwindcss";\n');
    await writeFile(join(app, "src/lib/utils.ts"), 'import { extendTailwindMerge } from "tailwind-merge";\nconst twMerge = extendTailwindMerge({ extend: {} });\n');
    const bundle = join(dir, "kit.tesserai.json");
    await writeFile(bundle, JSON.stringify({ ...PRESETS[0]!.build(), framework: "svelte" }));
    const result = await init({ bundlePath: bundle, dir: app, install: false, lint: false, prefix: "tw" });
    expect(result.kept).toContain("src/lib/utils.ts");
    expect(result.warnings.some((w) => w.includes('add prefix: "tw" to its extendTailwindMerge'))).toBe(true);
  });

  it("refuses a prefix Tailwind won't take", async () => {
    const { app, bundle } = await project();
    await expect(init({ bundlePath: bundle, dir: app, install: false, lint: false, prefix: "Acme-1" })).rejects.toThrow(/lowercase letters only/);
  });
});
