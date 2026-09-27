import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

export type PackageManager = "pnpm" | "yarn" | "bun" | "npm";

export type Project = {
  dir: string;
  // "src" when the project keeps code under src/, otherwise "": where tesserai.css and fonts go.
  // Nuxt 4 keeps it in app/, Laravel in resources/js.
  srcDir: string;
  // Where components/ui and lib/utils.ts go: srcDir, except SvelteKit's src/lib ($lib).
  codeDir: string;
  packageManager: PackageManager;
  framework: "next" | "vite" | "nuxt" | "laravel" | "sveltekit" | "unknown";
  // The UI framework its components are written in, from its dependencies; "unknown" in an empty
  // folder or when it names more than one. The project, never the system, decides this.
  ui: "react" | "vue" | "svelte" | "unknown";
  // Svelte's major version, when it's a Svelte project (tesserai writes Svelte 5 only).
  svelteMajor?: number;
  // How a Svelte project imports from src/lib: "$lib" (SvelteKit 2, or a Vite alias), "#lib"
  // (SvelteKit 3, package.json imports), or null (plain Vite with neither: imports are relative).
  libPrefix?: "$lib" | "#lib" | null;
  tailwind: "4" | "3" | "none";
  hasAlias: boolean;
  dependencies: Set<string>;
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

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

// tsconfig files are JSON with comments and trailing commas (create-vite's have both): strip them,
// leaving strings alone ("@/*" and "./src/*" look like comment starts).
export function parseJsonc(text: string): unknown {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === "\\" ? 2 : 1;
      out += text.slice(i, j + 1);
      i = j;
    } else if (c === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      out += "\n";
    } else if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end === -1 ? text.length : end + 1;
    } else out += c;
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, "$1"));
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export async function detectProject(dir: string): Promise<Project> {
  const warnings: string[] = [];
  const pkgPath = join(dir, "package.json");
  let pkg: Record<string, unknown> = {};
  if (await exists(pkgPath)) {
    const raw = await readJson(pkgPath);
    if (isRecord(raw)) pkg = raw;
  } else {
    warnings.push("no package.json found; treating the directory as a new project");
  }

  const dependencies = new Set<string>();
  for (const field of ["dependencies", "devDependencies"]) {
    const deps = pkg[field];
    if (isRecord(deps)) Object.keys(deps).forEach((d) => dependencies.add(d));
  }
  const versionOf = (name: string): string | undefined => {
    for (const field of ["dependencies", "devDependencies"]) {
      const deps = pkg[field];
      if (isRecord(deps) && typeof deps[name] === "string") return deps[name];
    }
    return undefined;
  };

  const tailwindVersion = versionOf("tailwindcss");
  const major = tailwindVersion === undefined ? undefined : /^\D*(\d+)/.exec(tailwindVersion)?.[1];
  const tailwind: Project["tailwind"] =
    tailwindVersion === undefined ? "none" : major === "4" || tailwindVersion === "latest" || major === undefined ? "4" : "3";

  let packageManager: PackageManager = "npm";
  if (await exists(join(dir, "pnpm-lock.yaml"))) packageManager = "pnpm";
  else if (await exists(join(dir, "yarn.lock"))) packageManager = "yarn";
  else if ((await exists(join(dir, "bun.lock"))) || (await exists(join(dir, "bun.lockb")))) packageManager = "bun";

  // The meta-framework first: it decides the layout.
  const framework: Project["framework"] = dependencies.has("next")
    ? "next"
    : dependencies.has("nuxt")
      ? "nuxt"
      : dependencies.has("@sveltejs/kit")
        ? "sveltekit"
        : dependencies.has("laravel-vite-plugin")
          ? "laravel"
          : dependencies.has("vite")
            ? "vite"
            : "unknown";
  const srcDir =
    framework === "nuxt"
      ? // Nuxt 4 keeps the app in app/; Nuxt 3 at the root.
        (await exists(join(dir, "app"))) ? "app" : ""
      : framework === "laravel"
        ? "resources/js"
        : (await exists(join(dir, "src"))) || framework === "sveltekit"
          ? "src"
          : "";

  // Nuxt's @ alias is built in (its tsconfig is generated under .nuxt/).
  const hasAlias = framework === "nuxt" || (await detectAlias(dir, "tsconfig.json", warnings, new Set()));
  const found = [
    dependencies.has("react") || dependencies.has("next") ? "react" : null,
    dependencies.has("vue") || dependencies.has("nuxt") ? "vue" : null,
    dependencies.has("svelte") || dependencies.has("@sveltejs/kit") ? "svelte" : null,
  ].filter((f): f is "react" | "vue" | "svelte" => f !== null);
  if (found.length > 1) warnings.push(`this project depends on ${found.join(" and ")}; tesserai follows the system's framework here`);
  const ui: Project["ui"] = found.length === 1 ? found[0]! : "unknown";
  const svelteVersion = versionOf("svelte");
  const svelteMajor = svelteVersion === undefined ? undefined : Number(/^\D*(\d+)/.exec(svelteVersion)?.[1] ?? NaN);
  // Svelte code lives in src/lib, imported as $lib (#lib on SvelteKit 3, from package.json imports).
  const codeDir = ui === "svelte" ? join(srcDir, "lib") : srcDir;
  // Read whenever Svelte is there: a project with React too gets Svelte when its system says so.
  const imports = pkg["imports"];
  const libPrefix: Project["libPrefix"] = !found.includes("svelte")
    ? undefined
    : isRecord(imports) && "#lib/*" in imports
      ? "#lib"
      : framework === "sveltekit" || (await detectAlias(dir, "tsconfig.json", [], new Set(), "$lib/*"))
        ? "$lib"
        : null;
  return {
    dir,
    srcDir,
    codeDir,
    packageManager,
    framework,
    ui,
    ...(svelteMajor === undefined || Number.isNaN(svelteMajor) ? {} : { svelteMajor }),
    ...(libPrefix === undefined ? {} : { libPrefix }),
    tailwind,
    hasAlias,
    dependencies,
    warnings,
  };
}

// Looks for a path alias ("@/*" unless told another) in a tsconfig and in the configs it references
// (Vite's react-ts template keeps paths in tsconfig.app.json behind `references`).
async function detectAlias(dir: string, file: string, warnings: string[], seen: Set<string>, alias = "@/*"): Promise<boolean> {
  const path = join(dir, file);
  if (seen.has(path) || !(await exists(path))) return false;
  seen.add(path);
  let tsconfig: unknown;
  try {
    tsconfig = parseJsonc(await readFile(path, "utf8"));
  } catch {
    warnings.push(`${file} could not be parsed; could not confirm the @/ alias`);
    return false;
  }
  if (!isRecord(tsconfig)) return false;
  const paths = isRecord(tsconfig.compilerOptions) ? tsconfig.compilerOptions.paths : undefined;
  if (isRecord(paths) && alias in paths) return true;
  const references = Array.isArray(tsconfig.references) ? tsconfig.references : [];
  for (const ref of references) {
    if (isRecord(ref) && typeof ref.path === "string" && (await detectAlias(dir, ref.path, warnings, seen, alias))) return true;
  }
  return false;
}
