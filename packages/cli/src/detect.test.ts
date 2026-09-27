import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detectProject } from "./detect";

async function project(pkg: Record<string, unknown>, dirs: string[] = [], files: Record<string, string> = {}) {
  const dir = await mkdtemp(join(tmpdir(), "tesserai-detect-"));
  await writeFile(join(dir, "package.json"), JSON.stringify(pkg));
  for (const d of dirs) await mkdir(join(dir, d), { recursive: true });
  for (const [path, content] of Object.entries(files)) await writeFile(join(dir, path), content);
  return detectProject(dir);
}
const pick = (p: Awaited<ReturnType<typeof detectProject>>) => ({ framework: p.framework, ui: p.ui, srcDir: p.srcDir, codeDir: p.codeDir, hasAlias: p.hasAlias, libPrefix: p.libPrefix });

describe("where a project keeps its code", () => {
  it("keeps React projects as they were", async () => {
    expect(pick(await project({ dependencies: { next: "16", react: "19" } }, ["src"]))).toEqual({ framework: "next", ui: "react", srcDir: "src", codeDir: "src", hasAlias: false, libPrefix: undefined });
  });

  it("finds Nuxt 4's app/ and Nuxt 3's root, with Nuxt's own @ alias", async () => {
    expect(pick(await project({ dependencies: { nuxt: "^4", vue: "^3.5" } }, ["app"]))).toMatchObject({ framework: "nuxt", ui: "vue", srcDir: "app", codeDir: "app", hasAlias: true });
    expect(pick(await project({ dependencies: { nuxt: "^3" } }))).toMatchObject({ framework: "nuxt", srcDir: "", codeDir: "" });
  });

  it("puts a Laravel app's components in resources/js", async () => {
    expect(pick(await project({ dependencies: { vue: "^3.5", "@inertiajs/vue3": "^2" }, devDependencies: { "laravel-vite-plugin": "^2", vite: "^7" } }))).toMatchObject({ framework: "laravel", ui: "vue", srcDir: "resources/js", codeDir: "resources/js" });
  });

  it("puts Svelte code in src/lib, imported as $lib, #lib on SvelteKit 3, or relatively without an alias", async () => {
    expect(pick(await project({ devDependencies: { "@sveltejs/kit": "^2", svelte: "^5" } }))).toMatchObject({ framework: "sveltekit", ui: "svelte", srcDir: "src", codeDir: "src/lib", libPrefix: "$lib" });
    expect(pick(await project({ devDependencies: { "@sveltejs/kit": "next", svelte: "^5" }, imports: { "#lib/*": "./src/lib/*" } }))).toMatchObject({ libPrefix: "#lib" });
    expect(pick(await project({ devDependencies: { svelte: "^5", vite: "^7" } }, ["src"]))).toMatchObject({ framework: "vite", codeDir: "src/lib", libPrefix: null });
    const aliased = await project({ devDependencies: { svelte: "^5", vite: "^7" } }, ["src"], { "tsconfig.json": JSON.stringify({ compilerOptions: { paths: { "$lib/*": ["./src/lib/*"] } } }) });
    expect(aliased.libPrefix).toBe("$lib");
  });
});

describe("what to add when the components' import alias is missing", async () => {
  const { aliasWarning } = await import("./init");
  it("says nothing when the alias is there", () => {
    expect(aliasWarning({ hasAlias: true, codeDir: "src" }, "react")).toBeNull();
    expect(aliasWarning({ hasAlias: false, libPrefix: "$lib", codeDir: "src/lib" }, "svelte")).toBeNull();
  });
  it("gives the lines to add, with Vite's for Vue and $lib's for Svelte", () => {
    expect(aliasWarning({ hasAlias: false, codeDir: "src" }, "vue")).toMatch(/"@\/\*": \["\.\/src\/\*"\][\s\S]*vite\.config\.ts[\s\S]*fileURLToPath/);
    expect(aliasWarning({ hasAlias: false, codeDir: "src" }, "react")).not.toMatch(/vite\.config/);
    const svelte = aliasWarning({ hasAlias: false, libPrefix: null, codeDir: "src/lib" }, "svelte");
    expect(svelte).toMatch(/relative paths, which works[\s\S]*\$lib: fileURLToPath\(new URL\("\.\/src\/lib", import\.meta\.url\)\)/);
    // Vite's Svelte template keeps compilerOptions in tsconfig.app.json; tsconfig.json only references it.
    expect(svelte).toContain("tsconfig.app.json on Vite");
  });
});

describe("reading a tsconfig", async () => {
  const { parseJsonc } = await import("./detect");
  it("takes comments and trailing commas, and leaves paths that look like comments alone", () => {
    const text = `{
  // The app's code
  "compilerOptions": { /* strict */ "strict": true, "paths": { "@/*": ["./src/*"], }, },
  "include": ["src/**/*.ts", "src/**/*.vue"],
}`;
    expect(parseJsonc(text)).toEqual({ compilerOptions: { strict: true, paths: { "@/*": ["./src/*"] } }, include: ["src/**/*.ts", "src/**/*.vue"] });
  });

  it("finds the alias in create-vite's commented tsconfig.app.json", async () => {
    const p = await project({ devDependencies: { vue: "^3.5", vite: "^8" } }, ["src"], {
      "tsconfig.json": JSON.stringify({ files: [], references: [{ path: "./tsconfig.app.json" }] }),
      "tsconfig.app.json": `{\n  // create-vite\n  "compilerOptions": { "paths": { "@/*": ["./src/*"] } },\n}\n`,
    });
    expect(p.hasAlias).toBe(true);
    expect(p.warnings).toEqual([]);
  });
});
