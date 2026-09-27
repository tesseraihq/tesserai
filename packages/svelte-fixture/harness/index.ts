import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { resolveSveltePlaceholders, type GeneratedFile, type SvelteAliases } from "@tesserai/templates";

// The fixture: a SvelteKit app with the packages generated Svelte code imports (bits-ui,
// class-variance-authority, clsx, tailwind-merge, @lucide/svelte), pinned. Generated files are
// written into src/lib/generated/<label>, one folder per caller so parallel test files don't meet,
// and checked or rendered from there. The folder is gitignored and kept after a run for debugging.
export const FIXTURE_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const GENERATED_DIR = join(FIXTURE_DIR, "src/lib/generated");
const run = promisify(execFile);
const bin = (name: string) => join(FIXTURE_DIR, "node_modules/.bin", name);

// Where a label's files land, as a SvelteKit project lays them out: lib/utils.ts, lib/components/ui/….
export const generatedDir = (label: string) => join(GENERATED_DIR, label);

// The placeholder aliases for a label's folder, the way the CLI will pass a project's own.
export function aliasesFor(label: string): SvelteAliases {
  const lib = `$lib/generated/${label}`;
  return { lib, utils: `${lib}/utils`, ui: `${lib}/components/ui`, hooks: `${lib}/hooks`, components: `${lib}/components` };
}

// renderAll's paths are from the lib folder's parent: "lib/utils.ts", "components/ui/button/…".
const libPath = (path: string) => (path.startsWith("lib/") ? path.slice("lib/".length) : path);

// Writes generated Svelte files under the label's folder with their placeholders resolved to it,
// replacing whatever the label had.
export async function writeGenerated(label: string, files: GeneratedFile[]): Promise<string> {
  if (!/^[a-z0-9-]+$/.test(label)) throw new Error(`a label is lowercase letters, digits and dashes: ${label}`);
  const dir = generatedDir(label);
  await rm(dir, { recursive: true, force: true });
  const aliases = aliasesFor(label);
  for (const file of files) {
    const target = join(dir, libPath(file.path));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, resolveSveltePlaceholders(file.source, aliases));
  }
  return dir;
}

let synced: Promise<unknown> | null = null;
// svelte-kit sync writes .svelte-kit/tsconfig.json ($lib and the app's types), which the checks extend.
function sync(): Promise<unknown> {
  if (existsSync(join(FIXTURE_DIR, ".svelte-kit/tsconfig.json"))) return Promise.resolve();
  synced ??= run(bin("svelte-kit"), ["sync"], { cwd: FIXTURE_DIR });
  return synced;
}

export type Diagnostic = { file: string; line: number; severity: "error" | "warning"; message: string };

// Writes the files and runs svelte-check on them alone, as strictly as a project could set it
// (strict, exactOptionalPropertyTypes, noUncheckedIndexedAccess; warnings count), against the
// fixture's pinned packages. Paths in the result are relative to the label's folder.
export async function svelteCheck(label: string, files: GeneratedFile[]): Promise<Diagnostic[]> {
  await sync();
  const dir = await writeGenerated(label, files);
  const tsconfig = join(dir, "tsconfig.json");
  await writeFile(tsconfig, JSON.stringify({ extends: "../../../../tsconfig.json", compilerOptions: { types: [] }, include: ["./**/*.ts", "./**/*.svelte", "../../../../.svelte-kit/ambient.d.ts"], exclude: [] }, null, 2));
  let stdout: string;
  try {
    ({ stdout } = await run(bin("svelte-check"), ["--tsconfig", tsconfig, "--output", "machine-verbose", "--fail-on-warnings"], { cwd: FIXTURE_DIR, maxBuffer: 16 * 1024 * 1024 }));
  } catch (e) {
    // svelte-check exits non-zero when it finds something; what it found is still on stdout.
    const out = (e as { stdout?: string }).stdout;
    if (out === undefined || out === "") throw e;
    stdout = out;
  }
  const diagnostics: Diagnostic[] = [];
  for (const line of stdout.split("\n")) {
    const json = line.slice(line.indexOf(" ") + 1);
    if (!json.startsWith("{")) continue;
    const d = JSON.parse(json) as { type: string; filename: string; start?: { line: number }; message: string };
    if (d.type !== "ERROR" && d.type !== "WARNING") continue;
    const file = join(FIXTURE_DIR, d.filename).replace(`${dir}/`, "");
    diagnostics.push({ file, line: (d.start?.line ?? 0) + 1, severity: d.type === "ERROR" ? "error" : "warning", message: d.message });
  }
  return diagnostics;
}

// Server rendering for parity tests: a Vite server over the fixture compiles Svelte (the generated
// components and Bits UI's own .svelte files) and TSX, and each entry module renders to HTML.
export type Renderer = {
  // Renders Svelte markup, which imports generated components through $lib (see aliasesFor).
  svelte(label: string, name: string, markup: string): Promise<string>;
  // Writes React files (renderAll's output for a React library) under the label, their @/ imports
  // pointed at them; returns their folder.
  writeReact(label: string, files: GeneratedFile[]): Promise<string>;
  // Renders TSX that defines Entry and imports the label's React files from "@/…".
  react(label: string, name: string, tsx: string): Promise<string>;
  // A module through the same pipeline: a generated .svelte file's module-script exports
  // (buttonVariants), or a React file's.
  module<T>(path: string): Promise<T>;
  close(): Promise<void>;
};

export async function createRenderer(): Promise<Renderer> {
  const [{ createServer }, { svelte }] = await Promise.all([import("vite"), import("@sveltejs/vite-plugin-svelte")]);
  const server = await createServer({
    root: FIXTURE_DIR,
    configFile: false,
    logLevel: "error",
    appType: "custom",
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    plugins: [svelte()],
    resolve: { alias: { $lib: join(FIXTURE_DIR, "src/lib") } },
    oxc: { jsx: { runtime: "automatic" } },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  // Entries and React files live beside the labels' folders ("_" keeps them apart from any label).
  const scratch = (label: string, kind: string) => join(GENERATED_DIR, `_${kind}`, label);
  const module = async <T>(path: string) => (await server.ssrLoadModule(path)) as T;
  const html = async (entry: string) => (await module<{ html: () => string }>(entry)).html();
  const at = (label: string) => (source: string) => source.replaceAll(`from "@/`, `from "${scratch(label, "react")}/`);

  return {
    async svelte(label, name, markup) {
      const dir = scratch(label, "entries");
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, `${name}.svelte`), markup);
      await writeFile(join(dir, `${name}.ts`), `import { render } from "svelte/server";\nimport Entry from "./${name}.svelte";\nexport const html = () => render(Entry).body;\n`);
      return html(join(dir, `${name}.ts`));
    },
    async writeReact(label, files) {
      const dir = scratch(label, "react");
      await rm(dir, { recursive: true, force: true });
      for (const file of files) {
        await mkdir(dirname(join(dir, file.path)), { recursive: true });
        await writeFile(join(dir, file.path), at(label)(file.source));
      }
      return dir;
    },
    async react(label, name, tsx) {
      const dir = scratch(label, "entries");
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, `${name}.tsx`), `import { renderToStaticMarkup } from "react-dom/server";\n${at(label)(tsx)}\nexport const html = () => renderToStaticMarkup(<Entry />);\n`);
      return html(join(dir, `${name}.tsx`));
    },
    module,
    close: () => server.close(),
  };
}
