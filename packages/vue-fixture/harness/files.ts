import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type GeneratedFile = { path: string; source: string };

export const FIXTURE_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
export const GENERATED_DIR = join(FIXTURE_DIR, "generated");

// Writes one run's generated files into generated/<name>/ (emptied first), laid out as in a
// project: lib/utils.ts, components/ui/…. Each run is its own @ root, so runs never see each
// other's files and tests can write theirs in parallel. Returns the folder.
export function writeGenerated(name: string, files: GeneratedFile[]): string {
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error(`a run's name is lowercase letters, digits and dashes: "${name}"`);
  const dir = join(GENERATED_DIR, name);
  rmSync(dir, { recursive: true, force: true });
  for (const file of files) {
    const path = join(dir, file.path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, file.source);
  }
  // The run's own tsconfig: the app's strict options, with @ pointing at the run, and Vue's strict
  // template checks except unknown props: data-slot and the like are attributes that fall through
  // to the element by design.
  const tsconfig = {
    extends: "../../tsconfig.app.json",
    compilerOptions: { paths: { "@/*": ["./*"] } },
    vueCompilerOptions: { checkUnknownComponents: true, checkUnknownDirectives: true, checkUnknownEvents: true },
    include: ["**/*.ts", "**/*.vue"],
  };
  writeFileSync(join(dir, "tsconfig.json"), `${JSON.stringify(tsconfig, null, 2)}\n`);
  return dir;
}
