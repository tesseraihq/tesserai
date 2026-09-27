import { PRESETS } from "@tesserai/core";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { init } from "./init";
import { mergeBarrel, svelteAliases } from "./layout";
import { sync } from "./sync";

// Installing into Vue and Svelte projects, with the frameworks turned on the way early testers
// turn them on (they're "soon" in the builder until their betas ship).
let dir: string;
let bundle: string;
const env = process.env["TESSERAI_FRAMEWORKS"];
beforeAll(() => void (process.env["TESSERAI_FRAMEWORKS"] = "vue,svelte"));
afterAll(() => void (env === undefined ? delete process.env["TESSERAI_FRAMEWORKS"] : (process.env["TESSERAI_FRAMEWORKS"] = env)));
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "tesserai-frameworks-"));
  bundle = join(dir, "acme.tesserai.json");
  await writeFile(bundle, JSON.stringify(PRESETS[0]!.build()));
});
afterEach(() => rm(dir, { recursive: true, force: true }));

async function project(pkg: Record<string, unknown>, files: Record<string, string>): Promise<string> {
  const root = join(dir, "app");
  for (const [path, content] of Object.entries({ "package.json": JSON.stringify(pkg), "pnpm-lock.yaml": "", ...files })) {
    await mkdir(join(root, path, ".."), { recursive: true });
    await writeFile(join(root, path), content);
  }
  return root;
}

describe("installing into a Vue project", () => {
  it("writes Nuxt 4's components under app/, imported through @, with no JSX lint", async () => {
    const root = await project({ dependencies: { nuxt: "^4", vue: "^3.5" }, devDependencies: { tailwindcss: "^4.3.0" } }, { "app/assets/css/main.css": '@import "tailwindcss";\n' });
    const result = await init({ bundlePath: bundle, dir: root, install: false });
    expect(result.base).toBe("reka-ui");
    expect(result.written).toContain("app/components/ui/button/Button.vue");
    expect(result.written).toContain("app/components/ui/button/index.ts");
    expect(result.written).toContain("app/lib/utils.ts");
    // Lint reads the .vue files through vue-eslint-parser; Oxlint, which can't see templates, isn't set up.
    expect(result.written).toContain("tesserai/lint.config.mjs");
    expect(result.written).not.toContain(".oxlintrc.json");
    const lint = await readFile(join(root, "tesserai/lint.config.mjs"), "utf8");
    expect(lint).toContain('import frameworkParser from "vue-eslint-parser";');
    expect(lint).toContain('"**/*.vue"');
    expect(lint).toContain('"app/components/ui/**"');
    expect(result.missingDevDeps).toContain("vue-eslint-parser");
    expect(await readFile(join(root, "app/assets/css/main.css"), "utf8")).toContain("tesserai.css");
    expect(await readFile(join(root, "AGENTS.md"), "utf8")).toContain("v-model");
    expect(result.missingDeps).toEqual(expect.arrayContaining(["reka-ui", "@lucide/vue"]));
  });

  it("says how to end Nuxt's same-name warning for every index.ts, unless nuxt.config sets components", async () => {
    const root = await project(
      { dependencies: { nuxt: "^4", vue: "^3.5" }, devDependencies: { tailwindcss: "^4.3.0" } },
      { "app/assets/css/main.css": '@import "tailwindcss";\n', "nuxt.config.ts": "export default defineNuxtConfig({ css: ['~/assets/css/main.css'] })\n" },
    );
    const first = await init({ bundlePath: bundle, dir: root, install: false });
    expect(first.warnings.join("\n")).toContain('components: [{ path: "~/components", extensions: [".vue"] }]');
    // Run again: its own eslint.config.mjs isn't "an eslint config that already exists".
    await writeFile(join(root, "nuxt.config.ts"), "export default defineNuxtConfig({ components: [{ path: '~/components', extensions: ['.vue'] }] })\n");
    const again = await init({ bundlePath: bundle, dir: root, install: false });
    expect(again.warnings.join("\n")).not.toContain("NUXT_B3011");
    expect(again.warnings.join("\n")).not.toContain("an eslint config already exists");
  });

  it("keeps the parts of a shadcn-vue component that tesserai doesn't write, through sync too", async () => {
    const root = await project(
      { dependencies: { vue: "^3.5", "reka-ui": "^2" }, devDependencies: { vite: "^8", tailwindcss: "^4.3.0" } },
      {
        "tsconfig.json": JSON.stringify({ compilerOptions: { paths: { "@/*": ["./src/*"] } } }),
        "src/style.css": '@import "tailwindcss";\n',
        "src/components/ui/dialog/DialogScrollContent.vue": "<template><div /></template>\n",
        "src/components/ui/dialog/index.ts": 'export { default as Dialog } from "./Dialog.vue"\nexport { default as DialogScrollContent } from "./DialogScrollContent.vue"\n',
      },
    );
    await init({ bundlePath: bundle, dir: root, install: false });
    const barrel = () => readFile(join(root, "src/components/ui/dialog/index.ts"), "utf8");
    expect(await barrel()).toContain('export { default as DialogScrollContent } from "./DialogScrollContent.vue"');
    await sync({ dir: root, force: false });
    expect(await barrel()).toContain("DialogScrollContent");
  });
});

describe("installing into a Svelte project", () => {
  it("writes into src/lib, with SvelteKit 3's #lib imports and packages as dev dependencies", async () => {
    const root = await project({ devDependencies: { "@sveltejs/kit": "next", svelte: "^5.1", tailwindcss: "^4.3.0" }, imports: { "#lib/*": "./src/lib/*" } }, { "src/routes/layout.css": '@import "tailwindcss";\n' });
    const result = await init({ bundlePath: bundle, dir: root, install: false });
    expect(result.base).toBe("bits-ui");
    expect(result.written).toContain("src/lib/utils.ts");
    expect(result.written).not.toContain("src/lib/lib/utils.ts");
    const button = result.written.find((f) => /^src\/lib\/components\/ui\/button\/.+\.svelte$/.test(f))!;
    const source = await readFile(join(root, button), "utf8");
    expect(source).toContain("#lib/utils");
    expect(source).not.toMatch(/\$(UTILS|UI|LIB)\$/);
    expect(await readFile(join(root, "src/routes/layout.css"), "utf8")).toContain("tesserai.css");
    expect(await readFile(join(root, "AGENTS.md"), "utf8")).toContain("#lib/components/ui/button/index.js");
  });

  it("puts Svelte in src/lib when the system decides for a project with React and Svelte both", async () => {
    await writeFile(bundle, JSON.stringify({ ...PRESETS[0]!.build(), framework: "svelte" }));
    const root = await project({ dependencies: { react: "^19" }, devDependencies: { "@sveltejs/kit": "^2", svelte: "^5.1", tailwindcss: "^4.3.0" } }, { "src/routes/layout.css": '@import "tailwindcss";\n' });
    const result = await init({ bundlePath: bundle, dir: root, install: false });
    expect(result.base).toBe("bits-ui");
    expect(result.written).toContain("src/lib/utils.ts");
    expect(result.written.some((f) => f.startsWith("src/lib/components/ui/button/"))).toBe(true);
    expect(result.written.some((f) => f.startsWith("src/components/"))).toBe(false);
  });

  it("refuses Svelte 4, saying how to upgrade", async () => {
    const root = await project({ devDependencies: { "@sveltejs/kit": "^2", svelte: "^4.2" } }, {});
    await expect(init({ bundlePath: bundle, dir: root, install: false })).rejects.toThrow(/Svelte 4.*sv migrate/);
  });
});

describe("the pieces of placing files", () => {
  it("resolves Svelte imports relatively when the project has no lib alias", () => {
    expect(svelteAliases(null, "components/ui/button/button.svelte")).toMatchObject({ utils: "../../../utils", ui: "..", lib: "../../.." });
    expect(svelteAliases("$lib", "components/ui/button/button.svelte")).toMatchObject({ utils: "$lib/utils", ui: "$lib/components/ui" });
  });

  it("merges a barrel only with parts that exist and that tesserai doesn't write", () => {
    const ours = 'export { default as Dialog } from "./Dialog.vue"\n';
    const theirs = 'export { default as Dialog } from "./Dialog.vue"\nexport { default as Gone } from "./Gone.vue"\nexport { default as Extra } from "./Extra.vue"\n';
    const merged = mergeBarrel(ours, theirs, new Set(["Dialog.vue", "index.ts"]), new Set(["Dialog.vue", "Extra.vue", "index.ts"]));
    expect(merged).toContain("./Extra.vue");
    expect(merged).not.toContain("./Gone.vue");
    // Merging again changes nothing.
    expect(mergeBarrel(ours, merged, new Set(["Dialog.vue", "index.ts"]), new Set(["Dialog.vue", "Extra.vue", "index.ts"]))).toBe(merged);
  });
});

describe("what a beta doesn't cover yet", async () => {
  const { comingTo } = await import("./init");
  it("names the system's components a framework's beta doesn't write, and nothing for React", () => {
    const system = PRESETS[0]!.build();
    expect(comingTo(system, "radix")).toBeNull();
    expect(comingTo(system, "bits-ui")).toMatch(/coming to Svelte and aren't written yet: .*\bdirection\b/);
    expect(comingTo(system, "bits-ui")).not.toMatch(/[:,] button[,.]/);
  });
});


describe("installed dependency compatibility", () => {
  it.each([false, true])("blocks Vue Table 8 before init writes files (install=%s)", async (install) => {
    const root = await project({ dependencies: { vue: "^3.5", "@tanstack/vue-table": "^8.21.3" } }, { "src/style.css": '@import "tailwindcss";' });
    const pkg = await readFile(join(root, "package.json"), "utf8");
    await expect(init({ bundlePath: bundle, dir: root, install, lint: false, log: (line) => { if (line.startsWith("installing ")) throw new Error("unexpected package installation"); } })).rejects.toThrow(/@tanstack\/vue-table.*\^9.*\^8\.21\.3/);
    await expect(readFile(join(root, "tesserai/design-system.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    expect(await readFile(join(root, "package.json"), "utf8")).toBe(pkg);
    expect(await readFile(join(root, "src/style.css"), "utf8")).toBe('@import "tailwindcss";');
  });

  it.each([false, true])("blocks incompatible sync without changing its last good bundle (dry=%s)", async (dryRun) => {
    const root = await project({ dependencies: { vue: "^3.5", "@tanstack/vue-table": "^9" } }, { "src/style.css": '@import "tailwindcss";' });
    await init({ bundlePath: bundle, dir: root, install: false, lint: false });
    const saved = await readFile(join(root, "tesserai/design-system.json"), "utf8");
    const css = await readFile(join(root, "src/tesserai.css"), "utf8");
    await writeFile(join(root, "package.json"), JSON.stringify({ dependencies: { vue: "^3.5", "@tanstack/vue-table": "^8.21.3" } }));
    const changed = PRESETS[0]!.build(); changed.name = "New source";
    await expect(sync({ dir: root, force: false, dryRun, system: changed })).rejects.toThrow(/@tanstack\/vue-table.*\^9/);
    expect(await readFile(join(root, "tesserai/design-system.json"), "utf8")).toBe(saved);
    expect(await readFile(join(root, "src/tesserai.css"), "utf8")).toBe(css);
  });
});


it.each(["^8.21.3", "8 || 9", "workspace:*", "npm:another-table@^9"])("does not assume %s is a compatible Vue table without an installed version", async (version) => {
  const root = await project({ dependencies: { vue: "^3.5", "@tanstack/vue-table": version } }, { "src/style.css": '@import "tailwindcss";' });
  await expect(init({ bundlePath: bundle, dir: root, install: false, lint: false })).rejects.toThrow(/@tanstack\/vue-table.*\^9/);
});

it.each(["^9", "~9.2.0", "9.2.4", "npm:@tanstack/vue-table@^9"])("keeps compatible declared Vue Table %s", async (version) => {
  const root = await project({ dependencies: { vue: "^3.5", "@tanstack/vue-table": version } }, { "src/style.css": '@import "tailwindcss";' });
  const result = await init({ bundlePath: bundle, dir: root, install: false, lint: false });
  expect(result.missingDeps.some((d) => d.includes("@tanstack/vue-table"))).toBe(false);
});

it.each(["8.21.3", "9.2.4"])("checks resolved versions for workspace dependencies (%s)", async (version) => {
  const root = await project({ dependencies: { vue: "^3.5", "@tanstack/vue-table": "workspace:*" } }, {
    "src/style.css": '@import "tailwindcss";',
    "node_modules/@tanstack/vue-table/package.json": JSON.stringify({ name: "@tanstack/vue-table", version }),
  });
  const attempt = init({ bundlePath: bundle, dir: root, install: false, lint: false });
  if (version.startsWith("8")) await expect(attempt).rejects.toThrow(/@tanstack\/vue-table.*\^9.*8\.21\.3/);
  else expect((await attempt).base).toBe("reka-ui");
});
