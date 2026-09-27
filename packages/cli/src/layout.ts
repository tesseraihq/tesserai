import type { Framework } from "@tesserai/core";
import { resolveSveltePlaceholders, targetFramework, type GeneratedFile, type SvelteAliases, type Target } from "@tesserai/templates";
import { join, posix } from "node:path";
import type { Project } from "./detect";

// Where each generated file goes in a project, and what its imports say there. Generated paths are
// "components/ui/…" and "lib/utils.ts", from the project's code folder (srcDir for React and Vue).
// Svelte's code folder is src/lib itself, so its "lib/utils.ts" is src/lib/utils.ts, and its
// imports are shadcn-svelte's placeholders, resolved to the project's $lib, #lib, or (plain Vite
// without an alias) relative paths.
export type Placed = { from: string; path: string; source: string };

// The code folder for the framework actually written: detection guesses it from the project's own
// framework, but when that's unclear (a project with React and Svelte) the system's decides.
export const codeDirFor = (project: Pick<Project, "srcDir">, framework: Framework) => (framework === "svelte" ? join(project.srcDir, "lib") : project.srcDir);

export function placeFiles(files: readonly GeneratedFile[], project: Pick<Project, "codeDir" | "libPrefix">, target: Target): Placed[] {
  if (targetFramework(target) !== "svelte") return files.map((f) => ({ from: f.path, path: join(project.codeDir, f.path), source: f.source }));
  return files.map((f) => {
    const inLib = f.path.startsWith("lib/") ? f.path.slice("lib/".length) : f.path;
    return { from: f.path, path: join(project.codeDir, inLib), source: resolveSveltePlaceholders(f.source, svelteAliases(project.libPrefix ?? null, inLib)) };
  });
}

// The aliases a Svelte file's imports resolve to: the project's lib prefix, or paths relative to
// the file (inLib is its path inside src/lib).
export function svelteAliases(libPrefix: "$lib" | "#lib" | null, inLib: string): SvelteAliases {
  const to = (target: string) => {
    if (libPrefix !== null) return target === "" ? libPrefix : `${libPrefix}/${target}`;
    const rel = posix.relative(posix.dirname(inLib), target === "" ? "." : target);
    return rel.startsWith(".") ? rel : `./${rel}`;
  };
  return { lib: to(""), utils: to("utils"), ui: to("components/ui"), hooks: to("hooks"), components: to("components") };
}

// A component's index.ts written over one tesserai didn't write (a shadcn-vue or shadcn-svelte
// project adopting tesserai): the exports of files in the folder that tesserai doesn't generate are
// kept, or the project's imports of them would break. `existing` is the files in that folder.
export function mergeBarrel(ours: string, theirs: string, generated: ReadonlySet<string>, existing: ReadonlySet<string>): string {
  const local = (line: string) => /from\s+["']\.\/([^"']+)["']/.exec(line)?.[1];
  const kept = theirs
    .split("\n")
    .filter((line) => {
      const file = local(line);
      return file !== undefined && !generated.has(file) && existing.has(file) && !ours.includes(line.trim());
    });
  if (kept.length === 0) return ours;
  // shadcn-svelte imports a part's default export, then re-exports it by name: keep both.
  const names = kept.flatMap((line) => /^\s*import\s+(\w+)\s+from/.exec(line)?.[1] ?? []);
  const exported = names.length === 0 ? "" : `export { ${names.join(", ")} };\n`;
  return `${ours.trimEnd()}\n\n// Parts this project had before tesserai, kept.\n${kept.join("\n")}\n${exported}`;
}
