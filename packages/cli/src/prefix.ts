import { stylesheetPrefix } from "@tesserai/core";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Project } from "./detect";

// A project's Tailwind class prefix lives where Tailwind reads it, the stylesheet's import
// (`@import "tailwindcss" prefix(acme);`); everything tesserai writes follows it.

const TAILWIND_IMPORT = /^([ \t]*@import\s+["']tailwindcss["'])([^;]*);/m;

export async function readPrefix(dir: string, stylesheet: string | undefined): Promise<string | undefined> {
  if (stylesheet === undefined) return undefined;
  try {
    return stylesheetPrefix(await readFile(join(dir, stylesheet), "utf8"));
  } catch {
    return undefined;
  }
}

// Adds prefix(…) to the stylesheet's Tailwind import. False when there's no import to add it to.
export async function writePrefix(dir: string, stylesheet: string, prefix: string): Promise<boolean> {
  const path = join(dir, stylesheet);
  const content = await readFile(path, "utf8");
  const found = TAILWIND_IMPORT.exec(content);
  if (found === null) return false;
  const rest = found[2]!.replace(/\s*\bprefix\([^)]*\)/, "");
  const next = content.replace(TAILWIND_IMPORT, `${found[1]}${rest} prefix(${prefix});`);
  if (next !== content) await writeFile(path, next, "utf8");
  return true;
}

// shadcn's CLI prefixes the components it adds with components.json's tailwind.prefix.
export async function setShadcnPrefix(dir: string, prefix: string | undefined): Promise<boolean> {
  const path = join(dir, "components.json");
  let config: Record<string, unknown>;
  try {
    config = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
  } catch {
    return false;
  }
  const tailwind = typeof config["tailwind"] === "object" && config["tailwind"] !== null ? (config["tailwind"] as Record<string, unknown>) : {};
  const want = prefix ?? "";
  if ((tailwind["prefix"] ?? "") === want) return false;
  await writeFile(path, JSON.stringify({ ...config, tailwind: { ...tailwind, prefix: want } }, null, 2) + "\n", "utf8");
  return true;
}

// lib/utils.ts is written once and then the project's; tailwind-merge in it has to know the prefix.
export async function utilsPrefixWarning(project: Pick<Project, "dir" | "codeDir" | "ui">, prefix: string | undefined): Promise<string | null> {
  if (prefix === undefined) return null;
  // Svelte's code folder is src/lib itself, so its utils.ts is right in it.
  const path = project.ui === "svelte" ? join(project.dir, project.codeDir, "utils.ts") : join(project.dir, project.codeDir, "lib", "utils.ts");
  let source: string;
  try {
    source = await readFile(path, "utf8");
  } catch {
    return null;
  }
  if (!source.includes("extendTailwindMerge") || new RegExp(`prefix:\\s*["']${prefix}["']`).test(source)) return null;
  return `lib/utils.ts's tailwind-merge doesn't know the ${prefix}: prefix, so cn() can't merge classes like ${prefix}:p-2 and ${prefix}:p-4; add prefix: "${prefix}" to its extendTailwindMerge({ … })`;
}
