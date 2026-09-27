import { packageName } from "@tesserai/templates";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { satisfies, subset, valid, validRange } from "semver";

// A present dependency is not necessarily usable: generated source can require a newer API.
// Check before writing anything, including with --no-install and during a dry sync.
export async function assertCompatibleDependencies(
  dir: string,
  required: readonly string[],
): Promise<void> {
  const pkg = JSON.parse(await readFile(join(dir, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const declared = { ...pkg.devDependencies, ...pkg.dependencies };
  const locations: string[] = [];
  for (let current = resolve(dir); ; current = dirname(current)) {
    locations.push(join(current, "node_modules"));
    if (dirname(current) === current) break;
  }
  for (const spec of required) {
    const name = packageName(spec);
    const range = spec.slice(name.length + 1);
    if (!range || !validRange(range) || declared[name] === undefined) continue;
    let installed: string | undefined;
    for (const path of locations) {
      try {
        const metadata = JSON.parse(await readFile(join(path, name, "package.json"), "utf8")) as {
          version?: string;
        };
        installed = metadata.version;
        break;
      } catch (error) {
        if (!["ENOENT", "ENOTDIR"].includes((error as NodeJS.ErrnoException).code ?? ""))
          throw error;
      }
    }
    const declaration = declared[name]!;
    const normalized = declaration.startsWith(`npm:${name}@`)
      ? declaration.slice(name.length + 5)
      : declaration;
    const declaredRange = validRange(normalized);
    // A stale or manually replaced node_modules folder must not hide an incompatible manifest.
    // Workspace/file/tag declarations need the resolved version; a different npm alias is not
    // evidence that the required package's API exists.
    const declarationCompatible =
      declaredRange !== null
        ? subset(declaredRange, range)
        : installed !== undefined && !normalized.startsWith("npm:");
    const compatible =
      declarationCompatible &&
      (installed === undefined
        ? declaredRange !== null
        : valid(installed) !== null && satisfies(installed, range));
    if (!compatible) {
      throw new Error(
        `${name} requires ${range} for these components; found ${declaration}${installed === undefined ? "" : ` (installed ${installed})`}. Upgrade or migrate this dependency and install it before retrying. No project files were changed.`,
      );
    }
  }
}
