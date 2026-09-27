import { parseBundle, type DesignSystem } from "@tesserai/core";
import { prefixFiles, renderAll, resolveSveltePlaceholders, storybookFilesFor, targetFramework, type GeneratedFile, type StorybookFramework, type StorybookOptions, type Target } from "@tesserai/templates";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, posix, relative } from "node:path";
import { detectProject, type Project } from "./detect";
import { findStylesheet, installArgs, preparedOrThrow, run, sha256, withScripts } from "./init";
import { readPrefix } from "./prefix";
import { Manifest, manifestKey } from "./sync";

// `npx @tesserai/cli storybook`: a Storybook for the project's design system, with a story per component,
// light/dark and density toolbars and accessibility checks. `npx @tesserai/cli sync` keeps it current.

export const STORYBOOK_DEV_DEPS = (framework: StorybookFramework) => [`storybook@^10`, `@storybook/${framework}@^10`, "@storybook/addon-a11y@^10", "@storybook/addon-themes@^10"];

export type StorybookCliOptions = { dir: string; install?: boolean; log?: (line: string) => void };
export type StorybookCliResult = {
  framework: StorybookFramework;
  written: string[];
  // Files that exist and aren't tesserai's: the new version is written beside them.
  kept: string[];
  covered: string[];
  uncovered: string[];
  missingDevDeps: string[];
  warnings: string[];
};

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function storybook(options: StorybookCliOptions): Promise<StorybookCliResult> {
  const log = options.log ?? (() => {});
  const project = await detectProject(options.dir);
  const warnings = [...project.warnings];
  const at = (...parts: string[]) => join(project.dir, ...parts);
  const manifestPath = at("tesserai", "manifest.json");
  if (!(await exists(manifestPath))) throw new Error(`no tesserai/manifest.json in ${project.dir}; run npx @tesserai/cli init first`);
  const manifest = Manifest.parse(JSON.parse(await readFile(manifestPath, "utf8")));
  const parsed = parseBundle(JSON.parse(await readFile(at("tesserai", "design-system.json"), "utf8")));
  if (!parsed.ok) throw new Error(`tesserai/design-system.json is not a valid design system (${parsed.problem})`);
  const system = preparedOrThrow(parsed.system);

  // The Storybook for the framework the project's components were installed in.
  const target = manifest.base;
  const ui = targetFramework(target);
  const framework: StorybookFramework = ui === "vue" ? "vue3-vite" : ui === "svelte" ? (project.framework === "sveltekit" ? "sveltekit" : "svelte-vite") : project.framework === "next" ? "nextjs-vite" : "react-vite";
  if (ui === "react" && project.framework === "unknown") warnings.push("couldn't tell whether this is a Vite or Next project; set up for Vite");
  const stylesheet = await findStylesheet(project);
  if (stylesheet === undefined) warnings.push("no stylesheet imports tesserai.css; import Tailwind and tesserai.css in .storybook/preview.tsx yourself");
  const storiesDir = [project.srcDir, "stories", "tesserai"].filter(Boolean).join("/");
  const config = { framework, storiesDir, stylesheet: stylesheet === undefined ? "../tesserai.css" : relative(at(".storybook"), at(stylesheet)).replaceAll("\\", "/") };

  const result = await storybookFor(project, system, target, config);
  // Stories written with the project's class prefix, as its components are.
  result.files = await prefixFiles(result.files, await readPrefix(project.dir, stylesheet));
  const written: string[] = [];
  const kept: string[] = [];
  for (const file of result.files) {
    const path = at(file.path);
    const key = manifestKey(file.path);
    const current = (await exists(path)) ? await readFile(path, "utf8") : undefined;
    // A Storybook the project already had (or a story someone edited) stays theirs.
    if (current !== undefined && current !== file.source && manifest.files[key] !== sha256(current)) {
      await writeFile(`${path}.tesserai-new`, file.source, "utf8");
      kept.push(file.path);
      continue;
    }
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, file.source, "utf8");
    manifest.files[key] = sha256(file.source);
    written.push(file.path);
  }
  if (kept.some((f) => f.startsWith(".storybook/"))) warnings.push("this project already has a Storybook config; tesserai's is beside it as .tesserai-new: add @storybook/addon-a11y and @storybook/addon-themes, and the stories folder, to yours");
  await writeFile(manifestPath, JSON.stringify({ ...manifest, storybook: config }, null, 2) + "\n", "utf8");

  // Scripts to run it, when the project has none.
  const pkgPath = at("package.json");
  if (await exists(pkgPath)) {
    const next = withScripts(await readFile(pkgPath, "utf8"), { storybook: "storybook dev -p 6006", "build-storybook": "storybook build" });
    if (next !== null) {
      await writeFile(pkgPath, next, "utf8");
      written.push("package.json (storybook scripts)");
    }
  }

  const missingDevDeps = STORYBOOK_DEV_DEPS(framework).filter((d) => !project.dependencies.has(d.replace(/@\^?[\d.]+$/, "")));
  if (missingDevDeps.length > 0 && options.install !== false) {
    log(`installing ${missingDevDeps.join(", ")} (dev) with ${project.packageManager}`);
    await run(project.packageManager, [...installArgs(project.packageManager, missingDevDeps), "-D"], project.dir);
  }
  return { framework, written, kept, covered: result.covered, uncovered: result.uncovered, missingDevDeps, warnings };
}

// The Storybook's files for a project: generated in its framework, with a Svelte project's import
// placeholders resolved to its lib alias (or, without one, paths relative to each story file).
export async function storybookFor(project: Pick<Project, "codeDir" | "libPrefix">, system: DesignSystem, target: Target, config: StorybookOptions): Promise<{ files: GeneratedFile[]; covered: string[]; uncovered: string[] }> {
  const result = storybookFilesFor(system, await renderAll(target, system), config);
  if (targetFramework(target) !== "svelte") return result;
  const files = result.files.map((file) => {
    const to = (path: string) => {
      if (project.libPrefix !== null && project.libPrefix !== undefined) return path === "" ? project.libPrefix : `${project.libPrefix}/${path}`;
      const rel = posix.relative(posix.dirname(file.path), posix.join(project.codeDir, path));
      return rel.startsWith(".") ? rel : `./${rel}`;
    };
    return { ...file, source: resolveSveltePlaceholders(file.source, { lib: to(""), utils: to("utils"), ui: to("components/ui"), hooks: to("hooks"), components: to("components") }) };
  });
  return { ...result, files };
}

export function summarizeStorybook(result: StorybookCliResult): string[] {
  const lines = [`Storybook (${result.framework}): stories for ${result.covered.length} components`];
  if (result.uncovered.length > 0) lines.push(`  no story yet for ${result.uncovered.join(", ")}`);
  for (const f of result.kept) lines.push(`  kept yours: ${f} (tesserai's version is ${f}.tesserai-new)`);
  for (const w of result.warnings) lines.push(`  warning: ${w}`);
  lines.push("", "Run it: npm run storybook");
  return lines;
}
