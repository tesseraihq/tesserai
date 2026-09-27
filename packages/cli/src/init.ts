import { assertCompatibleDependencies } from "./dependencies";
import { readFileSync } from "node:fs";
import {
  emitEslintConfig,
  emitOxlintConfig,
  iconSettings,
  includedComponents,
  NOT_IN_FRAMEWORK,
  systemCss,
  lintComponentSummary,
  loadFontMetrics,
  prefixProblem,
  prepareSystem,
  SHADCN_LINT_VERSION,
  LINT_PARSERS,
  type DesignSystem,
  type LintOptions,
  type Framework,
} from "@tesserai/core";
import { dependenciesFor, packageName, prefixFiles, renderAll, SHADCN_ICON_LIBRARY, supportedComponents, targetFramework, type Base, type Target } from "@tesserai/templates";
import { chooseTarget } from "./target";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { codeDirFor, mergeBarrel, placeFiles, type Placed } from "./layout";
import { z } from "zod";
import { fileURLToPath } from "node:url";
import { detectProject, type PackageManager, type Project } from "./detect";
import { downloadFonts, fontUrl, type FetchBinary } from "./fonts";
import { readPrefix, setShadcnPrefix, utilsPrefixWarning, writePrefix } from "./prefix";
import { readSource, type Fetch, type SourceFile } from "./source";
import { takeOverStylesheet } from "./shadcn-theme";
import { syncWebFonts, webFontCss, type FetchBytes, type FetchText } from "./web-fonts";
import { env } from "./env";

export type InitOptions = {
  // A bundle file, or a share link from the builder.
  bundlePath: string;
  fetch?: Fetch;
  live?: boolean;
  dir: string;
  // Overrides the base recorded in the bundle.
  base?: Base;
  install: boolean;
  // Writes the @shadcn/lint config and adds the lint script and dev dependencies.
  lint?: boolean;
  log?: (line: string) => void;
  // Downloads the system's own font files (tests pass a stand-in).
  fetchFont?: FetchBinary;
  // Stand-ins for Google Fonts (tests); TESSERAI_OFFLINE=1 skips web fonts altogether.
  fetchWebFont?: { text: FetchText; bytes: FetchBytes };
  // A Tailwind class prefix to install with (acme → acme:bg-primary), added to the stylesheet's
  // Tailwind import; null for none. Without it, the stylesheet's own prefix, if it has one.
  prefix?: string | null;
};

export type InitResult = {
  project: Project;
  base: Target;
  written: string[];
  kept: string[];
  missingDeps: string[];
  missingDevDeps: string[];
  cssPath: string;
  // The stylesheet the @import was added to, when one with `@import "tailwindcss"` was found.
  stylesheet: string | undefined;
  // The Tailwind class prefix the installed code uses.
  prefix: string | undefined;
  warnings: string[];
};

// The CLI's own version, and whether this copy came from npm: installed copies live under a
// node_modules folder (npx's cache is one too). An installed copy adds itself to the project and
// registers the MCP server through npx; a checkout of this repository runs itself directly, so
// development and tests never reach for a release that may not match or exist.
export const CLI_VERSION: string = (JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string }).version;
export const CLI_PUBLISHED = fileURLToPath(import.meta.url).split(sep).includes("node_modules");

// Dev dependencies the generated lint config needs, with the linter pinned.
export const LINT_DEV_DEPS = [`@shadcn/lint@${SHADCN_LINT_VERSION}`, "eslint", "@typescript-eslint/parser"];

export function lintOptionsFor(project: Project, framework: Framework = "react"): LintOptions {
  const ui = framework === "svelte" ? `${project.libPrefix ?? "$lib"}/components/ui` : "@/components/ui";
  return { ui, componentsGlob: `${project.codeDir === "" ? "" : `${project.codeDir}/`}components/ui/**`, ...(framework === "react" ? {} : { framework }) };
}

export const STYLESHEET_CANDIDATES = [
  "index.css",
  "globals.css",
  "global.css",
  "style.css",
  "styles.css",
  "main.css",
  "app.css",
  "app/globals.css",
  "styles/globals.css",
  // Nuxt (assets/css, under app/ on Nuxt 4) and create-vue (src/assets).
  "assets/css/main.css",
  "assets/css/tailwind.css",
  "assets/main.css",
  // SvelteKit, as sv add tailwindcss sets it up.
  "routes/layout.css",
  // Laravel keeps its stylesheet beside resources/js, not in it.
  "resources/css/app.css",
];

// Finds the project's Tailwind entry stylesheet and adds the tesserai import after Tailwind's.
// The stylesheet that loads Tailwind and tesserai.css (the one init added it to), from the project root.
export async function findStylesheet(project: Project): Promise<string | undefined> {
  const roots = project.srcDir === "" ? [""] : [project.srcDir, ""];
  for (const root of roots) {
    for (const candidate of STYLESHEET_CANDIDATES) {
      const path = join(project.dir, root, candidate);
      if (!(await exists(path))) continue;
      if ((await readFile(path, "utf8")).includes("tesserai.css")) return relative(project.dir, path).replaceAll("\\", "/");
    }
  }
  return undefined;
}

async function importIntoStylesheet(project: Project, cssPath: string): Promise<string | undefined> {
  const roots = project.srcDir === "" ? [""] : [project.srcDir, ""];
  for (const root of roots) {
    for (const candidate of STYLESHEET_CANDIDATES) {
      const path = join(project.dir, root, candidate);
      if (!(await exists(path))) continue;
      const content = await readFile(path, "utf8");
      const tailwindImport = /^[ \t]*@import\s+["']tailwindcss["'][^;]*;[ \t]*$/m.exec(content);
      if (tailwindImport === null) continue;
      let target = relative(dirname(path), cssPath).replaceAll("\\", "/");
      if (!target.startsWith(".")) target = `./${target}`;
      if (content.includes(target)) return relative(project.dir, path);
      const at = tailwindImport.index + tailwindImport[0].length;
      await writeFile(path, `${content.slice(0, at)}\n@import "${target}";${content.slice(at)}`, "utf8");
      return relative(project.dir, path);
    }
  }
  return undefined;
}

// What to add when the project has no alias for the components' imports, and why. Build configs
// aren't edited for people: a broken vite.config is hard to debug for someone who didn't write it.
export function aliasWarning(project: Pick<Project, "hasAlias" | "libPrefix" | "codeDir">, framework: Framework): string | null {
  if (framework === "svelte") {
    if (project.libPrefix !== null) return null;
    return `no $lib alias: the components import each other with relative paths, which works. To import them as $lib/components/ui/… in your own code (as the docs' examples do), add to vite.config.ts:\n  resolve: { alias: { $lib: fileURLToPath(new URL("./${project.codeDir}", import.meta.url)) } }\n(with import { fileURLToPath } from "node:url"), and to tsconfig.json (tsconfig.app.json on Vite) under compilerOptions:\n  "paths": { "$lib": ["./${project.codeDir}"], "$lib/*": ["./${project.codeDir}/*"] }`;
  }
  if (project.hasAlias) return null;
  const dir = project.codeDir === "" ? "." : `./${project.codeDir}`;
  return `no "@/*" path alias: the components import from "@/lib/utils". Add to tsconfig.json (tsconfig.app.json on Vite) under compilerOptions:\n  "paths": { "@/*": ["${dir}/*"] }${framework === "vue" ? `\nand to vite.config.ts:\n  resolve: { alias: { "@": fileURLToPath(new URL("${dir}", import.meta.url)) } }` : ""}`;
}

// Nuxt registers every file in components/ as a component, each folder's index.ts too, and warns
// at every start that it and the folder's .vue file resolve to the same name (NUXT_B3011, one per
// component). Registering only .vue files keeps the auto-imports (UiButton) and ends the warnings.
// As with the alias, the config is the user's to edit; a config that sets components is left alone.
export async function nuxtComponentsWarning(dir: string): Promise<string | null> {
  for (const file of ["nuxt.config.ts", "nuxt.config.js", "nuxt.config.mjs"]) {
    const path = join(dir, file);
    if (!(await exists(path))) continue;
    if (/\bcomponents\s*:/.test(await readFile(path, "utf8"))) return null;
    return `Nuxt registers each component folder's index.ts as a component too, and warns about every one at each start (NUXT_B3011). To register only the .vue files (auto-imports like <UiButton> keep working), add to ${file}:\n  components: [{ path: "~/components", extensions: [".vue"] }],`;
  }
  return null;
}

// A Vue or Svelte component's index.ts, merged with the one already there: exports of parts the
// project had and tesserai doesn't generate stay (see mergeBarrel).
export async function withTheirBarrel(path: string, file: Placed, placed: readonly Placed[]): Promise<string> {
  if (!/components\/ui\/[^/]+\/index\.ts$/.test(file.from) || !(await exists(path))) return file.source;
  const folder = dirname(file.path);
  const generated = new Set(placed.filter((p) => dirname(p.path) === folder).map((p) => basename(p.path)));
  const existing = new Set(await readdir(dirname(path)));
  return mergeBarrel(file.source, await readFile(path, "utf8"), generated, existing);
}

// The system's components the project's framework doesn't have, said plainly with why, or null.
export function comingTo(system: DesignSystem, target: Target): string | null {
  const framework = targetFramework(target);
  if (framework === "react") return null;
  const supported = new Set(supportedComponents(target));
  const later = Object.keys(includedComponents(system)).filter((c) => !supported.has(c)).sort();
  if (later.length === 0) return null;
  const name = framework === "vue" ? "Vue" : "Svelte";
  const why = later.map((c) => NOT_IN_FRAMEWORK[c]?.[framework]).filter(Boolean).join(" ");
  return `${later.length === 1 ? "One" : later.length} of the system's components ${later.length === 1 ? "isn't" : "aren't"} in ${name}: ${later.join(", ")}.${why === "" ? "" : ` ${why}`} The rest are installed.`;
}

const AGENTS_MARKER = "<!-- tesserai -->";

// How the components are used in each framework: the part of the section that differs.
function frameworkLines(framework: Framework, libPrefix: string | null | undefined): string {
  if (framework === "vue") {
    return `\n- They're Vue single-file components (\`<script setup lang="ts">\`), a folder each: \`import { Button } from "@/components/ui/button"\`. Pass classes with \`class\`, and bind values with \`v-model\` (\`v-model:open\` on dialogs and popovers).`;
  }
  if (framework === "svelte") {
    const lib = libPrefix ?? "$lib";
    return `\n- They're Svelte 5 components, a folder each: \`import { Button } from "${lib}/components/ui/button/index.js"\`. Pass classes with \`class\`, bind values with \`bind:value\` and \`bind:open\`, and render a trigger as your own element with \`{#snippet child({ props })}\`.`;
  }
  return "";
}

function agentsSection(system: DesignSystem, srcDir: string, prefix: string | undefined, framework: Framework = "react", libPrefix?: string | null): string {
  const ui = join(srcDir, "components/ui");
  return `${AGENTS_MARKER}
## Design system (tesserai)

This project uses the "${system.name}" design system generated by tesserai. The source of truth is \`tesserai/design-system.json\`; do not hand-edit the generated files, edit the system and run \`npx @tesserai/cli sync\`.

- Use the components in \`${ui}/\`: ${lintComponentSummary(system)}. They take \`variant\`, \`intent\` and \`size\` props; shadcn variant names (\`default\`, \`destructive\`, \`secondary\`) still work.${frameworkLines(framework, libPrefix)}
- Intents: ${Object.keys(system.intents).join(", ")}. Use them for meaning, never raw colors.
- Style only with the theme utilities (${["bg-primary-solid", "text-neutral-text", "rounded-md", "p-4"].map((c) => `\`${prefix === undefined ? c : `${prefix}:${c}`}\``).join(", ")}) and the CSS variables in \`tesserai.css\`. Never hard-code a color, radius or spacing value.${prefix === undefined ? "" : `\n- Every Tailwind class takes the \`${prefix}:\` prefix, before any variant: \`${prefix}:hover:bg-primary-solid\`, \`${prefix}:md:flex\`. Unprefixed classes do nothing here.`}
- Dark mode is the \`dark\` class on \`<html>\`; density is \`data-density="compact|default|comfortable"\`.
- After making changes, run \`npm run lint\` and fix all errors; the lint rules come from the same source as the tokens.
- Before building or changing UI, bring the components up to date: the tesserai MCP server's \`sync\` tool, or \`npx @tesserai/cli sync\` (it pulls the latest design when the project follows a tesserai link). Use \`outline\` with \`refresh: true\` to check remote changes; ordinary outlines return local state and cached freshness.
- Build UI from these components, never hand-styled elements: the MCP server's \`component_guide\` gives each one's import, props and an example, and \`example_page\` gives whole pages written with them (sign-in and settings are forms).
- To change the design itself (colors, type, spacing, radius, a variant's look), use the MCP server's \`apply_changes\` (it changes the system through checked operations and regenerates the components), or the tesserai builder when the project follows a link. Its result lists any design guidelines the change runs into (WCAG, Apple, Material); tell the developer about them.
- For how a design system should do something (sizes, touch targets, contrast, type, spacing), read the MCP server's \`guidelines\` before answering.
- The MCP server is registered in \`.mcp.json\` (Claude Code) and, for Cursor, \`.cursor/mcp.json\`. For another client, use the command and arguments in \`.mcp.json\`. These absolute paths belong to this machine; update them when moving the CLI or project.
${AGENTS_MARKER}
`;
}

export const ESLINT_CONFIG_FILES = ["eslint.config.js", "eslint.config.mjs", "eslint.config.cjs", "eslint.config.ts", "eslint.config.mts"];

// package.json is a boundary: only its shape is validated, everything else passes through untouched.
export const PackageJson = z.object({ scripts: z.record(z.string(), z.unknown()).optional() }).passthrough();

// package.json with the scripts it doesn't have yet added, written as the project wrote it: its keys
// in their order and its indentation (SvelteKit's and Vite's templates indent with tabs). Null when
// there's nothing to add or it isn't a package.json we understand.
export function withScripts(source: string, add: Record<string, string>): string | null {
  let raw: unknown;
  try {
    raw = JSON.parse(source);
  } catch {
    return null;
  }
  if (!PackageJson.safeParse(raw).success) return null;
  const pkg = raw as Record<string, unknown>;
  const scripts = { ...(pkg["scripts"] as Record<string, unknown> | undefined) };
  const missing = Object.entries(add).filter(([name]) => !(name in scripts));
  if (missing.length === 0) return null;
  for (const [name, command] of missing) scripts[name] = command;
  const indent = /^[ \t]+/m.exec(source)?.[0] ?? "  ";
  // Assigning keeps the scripts key where it was, or adds it last.
  return JSON.stringify(Object.assign({}, pkg, { scripts }), null, indent) + (source.endsWith("\n") ? "\n" : "");
}

// Adds a lint script when the project has none, without touching anything else in package.json.
async function ensureLintScript(project: Project): Promise<boolean> {
  const path = join(project.dir, "package.json");
  if (!(await exists(path))) return false;
  const next = withScripts(await readFile(path, "utf8"), { lint: "eslint ." });
  if (next === null) return false;
  await writeFile(path, next, "utf8");
  return true;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function write(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

export function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export function run(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`))));
  });
}

export function installArgs(pm: PackageManager, deps: string[]): string[] {
  return pm === "npm" ? ["install", ...deps] : ["add", ...deps];
}

// Sets components.json's iconLibrary to the system's, when the project has one. True if changed.
// AGENTS.md's tesserai section, written or brought up to date between its markers. The path when it changed.
export async function writeAgents(
  dir: string,
  system: DesignSystem,
  srcDir: string,
  prefix: string | undefined,
  { dryRun = false, create = true, framework = "react" as Framework, libPrefix }: { dryRun?: boolean; create?: boolean; framework?: Framework; libPrefix?: string | null } = {},
): Promise<string | null> {
  const agentsPath = join(dir, "AGENTS.md");
  const section = agentsSection(system, srcDir, prefix, framework, libPrefix);
  if (await exists(agentsPath)) {
    const current = await readFile(agentsPath, "utf8");
    // A section written before the rename is marked <!-- tessera -->: replaced, not added to.
    const pattern = new RegExp(`<!-- tesserai? -->[\\s\\S]*?<!-- tesserai? -->\\n?`);
    const next = pattern.test(current) ? current.replace(pattern, section) : `${current.trimEnd()}\n\n${section}`;
    if (next === current) return null;
    if (!dryRun) await writeFile(agentsPath, next, "utf8");
    return agentsPath;
  }
  if (!create) return null;
  if (!dryRun) await write(agentsPath, `# Agent instructions\n\n${section}`);
  return agentsPath;
}

// The tesserai MCP server registered where agents find it in a project: Claude Code's .mcp.json, and
// Cursor's .cursor/mcp.json when the project uses Cursor. Other servers there are kept; an existing
// tesserai entry is left as the developer set it. Return the files written.
export async function registerMcp(dir: string): Promise<string[]> {
  // Through npx and the scoped name, which resolve to the project's own copy (a dev dependency) and
  // never to another package: npm refused the unscoped name "tesserai" as too close to "tessera",
  // someone else's package. A path into npx's cache would break when the cache is cleared.
  const entry = CLI_PUBLISHED
    ? { command: "npx", args: ["-y", "@tesserai/cli", "mcp", "--dir", resolve(dir)] }
    : { command: process.execPath, args: [fileURLToPath(new URL("../bin/tesserai.js", import.meta.url)), "mcp", "--dir", resolve(dir)] };
  const targets = [".mcp.json", ...((await exists(join(dir, ".cursor"))) ? [".cursor/mcp.json"] : [])];
  const written: string[] = [];
  for (const target of targets) {
    const path = join(dir, target);
    let config: { mcpServers?: Record<string, unknown> } = {};
    if (await exists(path)) {
      try {
        config = JSON.parse(await readFile(path, "utf8")) as typeof config;
      } catch {
        continue;
      }
    }
    // Registered before the rename as "tessera": left as it is, since it runs this same CLI by path.
    if (config.mcpServers?.["tesserai"] !== undefined || config.mcpServers?.["tessera"] !== undefined) continue;
    await write(path, JSON.stringify({ ...config, mcpServers: { ...config.mcpServers, tesserai: entry } }, null, 2) + "\n");
    written.push(target);
  }
  return written;
}

export async function setIconLibrary(dir: string, system: DesignSystem): Promise<boolean> {
  const path = join(dir, "components.json");
  let config: Record<string, unknown>;
  try {
    config = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
  } catch {
    return false;
  }
  const library = SHADCN_ICON_LIBRARY[iconSettings(system).library];
  if (config["iconLibrary"] === library) return false;
  await writeFile(path, JSON.stringify({ ...config, iconLibrary: library }, null, 2) + "\n", "utf8");
  return true;
}

// A system made ready (prepareSystem), or an error saying why it can't be used.
export function preparedOrThrow(input: DesignSystem): DesignSystem {
  const prepared = prepareSystem(input);
  if (prepared.problems.length > 0) throw new Error(`the design system is broken, so nothing was written: ${prepared.problems.slice(0, 3).join("; ")}`);
  return prepared.system;
}

export async function init(options: InitOptions): Promise<InitResult> {
  const log = options.log ?? (() => {});
  const source = await readSource(options.bundlePath, options.fetch, { live: options.live ?? false });
  const { link, release } = source;
  if (release !== null) log(`installing release ${release}`);
  // Made ready the one way every system is: what an older bundle predates, its parts and tokens
  // for today's templates, rebuilt with its brands, and checked.
  const system = preparedOrThrow(source.system);
  const project = await detectProject(options.dir);
  const warnings = [...project.warnings];
  // The project's framework decides what's written; --base overrides the React library, and the
  // project's copy records the choice so sync follows it.
  const chosen = chooseTarget(project, system, options.base);
  const base = chosen.target;
  if (chosen.note !== null) warnings.push(chosen.note);
  if (targetFramework(base) === "react") system.base = base as Base;
  project.codeDir = codeDirFor(project, targetFramework(base));
  await assertCompatibleDependencies(project.dir, dependenciesFor(system, base));
  const coming = comingTo(system, base);
  if (coming !== null) warnings.push(coming);
  const written: string[] = [];
  const kept: string[] = [];
  const manifest: Record<string, string> = {};

  const at = (...parts: string[]) => join(project.dir, ...parts);
  const note = (path: string) => (relative(project.dir, path) || ".").split(sep).join("/");

  // The system itself travels with the project so sync can diff against it later.
  const bundleCopy = at("tesserai", "design-system.json");
  const bundleJson = JSON.stringify(system, null, 2) + "\n";
  await write(bundleCopy, bundleJson);
  written.push(note(bundleCopy));
  // A project installed from a link follows it: sync pulls the latest shared version.
  if (link !== null) {
    const sourcePath = at("tesserai", "source.json");
    await write(sourcePath, JSON.stringify({ link } satisfies SourceFile, null, 2) + "\n");
    written.push(note(sourcePath));
  }

  // The system's own fonts, self-hosted beside tesserai.css.
  const fonts = await downloadFonts({ system, dir: at(project.srcDir, "fonts"), ...(link === null ? {} : { host: link }), ...(options.fetchFont === undefined ? {} : { fetch: options.fetchFont }) });
  for (const name of fonts.written) written.push(note(at(project.srcDir, "fonts", name)));
  if (fonts.missing.length > 0) warnings.push(`couldn't download ${fonts.missing.join(", ")}; run npx @tesserai/cli login, then npx @tesserai/cli sync (until then the next font in the stack shows)`);

  // Fonts it names from Google Fonts, downloaded too, so they load in the project as in the builder.
  const web = await syncWebFonts({
    system,
    fontsDir: at(project.srcDir, "fonts"),
    record: at("tesserai", "web-fonts.json"),
    dryRun: env("OFFLINE") === "1" && options.fetchWebFont === undefined,
    ...(options.fetchWebFont === undefined ? {} : { fetchText: options.fetchWebFont.text, fetchBytes: options.fetchWebFont.bytes }),
  });
  for (const name of web.written) written.push(note(at(project.srcDir, "fonts", name)));
  if (web.missing.length > 0) warnings.push(`couldn't download ${web.missing.join(", ")} from Google Fonts; npx @tesserai/cli sync tries again (until then the next font in the stack shows)`);

  const cssPath = at(project.srcDir, "tesserai.css");
  const stylesheet = await importIntoStylesheet(project, cssPath);
  // The class prefix: asked for (added to the stylesheet's Tailwind import), or the stylesheet's
  // own. A prefix that's only the system's default isn't added to an app's stylesheet unasked:
  // every class the app already has would stop working.
  let prefix = await readPrefix(project.dir, stylesheet);
  if (typeof options.prefix === "string" && options.prefix !== prefix) {
    const problem = prefixProblem(options.prefix);
    if (problem !== null) throw new Error(`--prefix ${options.prefix}: ${problem}`);
    if (stylesheet !== undefined && (await writePrefix(project.dir, stylesheet, options.prefix))) {
      prefix = options.prefix;
      written.push(`${stylesheet.replaceAll("\\", "/")} (prefix(${prefix}))`);
    } else warnings.push(`no stylesheet with @import "tailwindcss" to add prefix(${options.prefix}) to; add it there, then run npx @tesserai/cli sync`);
  } else if (options.prefix === undefined && prefix === undefined && system.tailwindPrefix !== undefined) {
    warnings.push(`the system's classes use the ${system.tailwindPrefix}: prefix, but this project's Tailwind import has none, so tesserai installed them unprefixed. To use it, run npx @tesserai/cli init --prefix ${system.tailwindPrefix} (every class in the app then needs ${system.tailwindPrefix}:)`);
  } else if (prefix !== undefined && system.tailwindPrefix !== undefined && prefix !== system.tailwindPrefix) {
    warnings.push(`this project's stylesheet uses prefix(${prefix}); tesserai follows it rather than the system's ${system.tailwindPrefix}:`);
  }
  // With fallback faces sized to the web fonts, so the app's text doesn't jump as they load.
  const css = systemCss(system, { includeImport: false, fontUrl, fontMetrics: await loadFontMetrics(), ...(prefix === undefined ? {} : { prefix }) }) + webFontCss(web.faces);
  await write(cssPath, css);
  manifest[note(cssPath)] = sha256(css);
  written.push(note(cssPath));
  // shadcn's own theme would win over the system's (it comes later in the same stylesheet).
  if (stylesheet !== undefined) {
    const tookOver = await takeOverStylesheet(project.dir, stylesheet.replaceAll("\\", "/"));
    if (tookOver !== null) written.push(tookOver);
  }

  const placed = placeFiles(await prefixFiles(await renderAll(base, system), prefix), project, base);
  for (const file of placed) {
    const path = at(file.path);
    if (file.from === "lib/utils.ts" && (await exists(path))) {
      kept.push(note(path));
      continue;
    }
    const source = await withTheirBarrel(path, file, placed);
    await write(path, source);
    manifest[note(path)] = sha256(source);
    written.push(note(path));
  }

  // shadcn adds blocks with the icon library and class prefix its components.json names: keep them in step.
  if (await setIconLibrary(project.dir, system)) written.push("components.json (iconLibrary)");
  if (await setShadcnPrefix(project.dir, prefix)) written.push("components.json (tailwind.prefix)");
  const utilsWarning = await utilsPrefixWarning(project, prefix);
  if (utilsWarning !== null) warnings.push(utilsWarning);

  const agents = await writeAgents(project.dir, system, project.codeDir, prefix, { framework: targetFramework(base), libPrefix: project.libPrefix ?? null });
  if (agents !== null) written.push(note(agents));
  for (const file of await registerMcp(project.dir)) written.push(`${file} (tesserai MCP server)`);

  // The lint rules read JSX; Vue and Svelte templates get theirs later (docs/frameworks, phase 4).
  const lint = options.lint ?? true;
  const framework = targetFramework(base);
  if (lint) {
    // The shareable config is regenerated by sync; the eslint.config.mjs wrapper and .oxlintrc.json
    // are only created when the project has none, and are the user's from then on.
    const lintOptions = lintOptionsFor(project, framework);
    const shared = at("tesserai", "lint.config.mjs");
    const sharedSource = emitEslintConfig(system, lintOptions);
    await write(shared, sharedSource);
    manifest[note(shared)] = sha256(sharedSource);
    written.push(note(shared));

    const hasEslintConfig = (await Promise.all(ESLINT_CONFIG_FILES.map((f) => exists(at(f))))).some(Boolean);
    const wrapper = at("eslint.config.mjs");
    const wrapperSource = `export { default } from "./tesserai/lint.config.mjs";\n`;
    if (!hasEslintConfig) {
      await write(wrapper, wrapperSource);
      written.push(note(wrapper));
    } else if ((await exists(wrapper)) && (await readFile(wrapper, "utf8")) === wrapperSource) {
      // The one an earlier init wrote: nothing to do.
    } else {
      warnings.push("an eslint config already exists; import and spread tesserai/lint.config.mjs into it");
    }
    // Oxlint reads only the <script> of a .vue or .svelte file, so ESLint does their linting alone.
    const oxlint = at(".oxlintrc.json");
    if (framework === "react" && !(await exists(oxlint))) {
      await write(oxlint, emitOxlintConfig(system, lintOptions));
      written.push(note(oxlint));
    }
    if (await ensureLintScript(project)) written.push("package.json (lint script)");
  }

  const manifestPath = at("tesserai", "manifest.json");
  await write(manifestPath, JSON.stringify({ base, files: manifest }, null, 2) + "\n");
  written.push(note(manifestPath));

  const missingDeps = dependenciesFor(system, base).filter((d) => !project.dependencies.has(packageName(d)));
  // shadcn-svelte installs a component's packages as dev dependencies: SvelteKit bundles them.
  const depsAsDev = targetFramework(base) === "svelte";
  const lintDeps = framework === "react" ? LINT_DEV_DEPS : [...LINT_DEV_DEPS, LINT_PARSERS[framework]];
  // The CLI itself, so `npx tesserai` in the project and in its scripts runs this version.
  const cliDep = CLI_PUBLISHED && !project.dependencies.has("@tesserai/cli") ? [`@tesserai/cli@^${CLI_VERSION}`] : [];
  const missingDevDeps = [...cliDep, ...(lint ? lintDeps.filter((d) => !project.dependencies.has(d.replace(/@[^@]+$/, ""))) : [])];
  if (project.tailwind !== "4") {
    warnings.push(
      project.tailwind === "none"
        ? "tailwindcss is not installed; the generated CSS needs Tailwind v4"
        : "Tailwind v3 detected; the generated CSS uses v4 @theme syntax",
    );
  }
  const alias = aliasWarning(project, targetFramework(base));
  if (alias !== null) warnings.push(alias);
  const nuxt = project.framework === "nuxt" ? await nuxtComponentsWarning(project.dir) : null;
  if (nuxt !== null) warnings.push(nuxt);

  if (missingDeps.length > 0 && options.install) {
    log(`installing ${missingDeps.join(", ")} with ${project.packageManager}`);
    await run(project.packageManager, [...installArgs(project.packageManager, missingDeps), ...(depsAsDev ? ["-D"] : [])], project.dir);
  }
  if (missingDevDeps.length > 0 && options.install) {
    log(`installing ${missingDevDeps.join(", ")} (dev) with ${project.packageManager}`);
    await run(project.packageManager, [...installArgs(project.packageManager, missingDevDeps), "-D"], project.dir);
  }

  // Post-install verification: everything we claim to have written must be there.
  for (const file of written) {
    if (file.includes(" ")) continue;
    if (!(await exists(at(file)))) warnings.push(`expected to write ${file} but it is missing`);
  }

  return { project, base, written, kept, missingDeps, missingDevDeps, cssPath: note(cssPath), stylesheet, prefix, warnings };
}

export function summarize(result: InitResult): string[] {
  const lines = [
    `wrote ${result.written.length} files (${result.project.framework}, ${result.project.packageManager}, ${result.base} components)`,
    ...result.written.map((f) => `  ${f}`),
    ...(result.kept.length > 0 ? [`kept ${result.kept.join(", ")} (already present)`] : []),
    "",
    ...(result.stylesheet === undefined
      ? [
          `next: add this line after @import "tailwindcss" in your main stylesheet:`,
          `  @import "./${relative(join(result.project.dir, result.project.srcDir), join(result.project.dir, result.cssPath))}";`,
        ]
      : [`added @import to ${result.stylesheet}`]),
  ];
  if (result.missingDeps.length > 0) lines.push(`deps: ${result.missingDeps.join(" ")}`);
  if (result.missingDevDeps.length > 0) lines.push(`dev deps: ${result.missingDevDeps.join(" ")}`);
  for (const warning of result.warnings) lines.push(`warning: ${warning}`);
  return lines;
}
