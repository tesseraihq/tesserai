import { access, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ESLINT_CONFIG_FILES, STYLESHEET_CANDIDATES } from "./init";

// Projects set up before the product was named tesserai have a tessera/ folder and tessera.css.
// Every command moves them to the new names first (once), and updates the three places that name
// them: the stylesheet that imports tessera.css, the eslint wrapper, and the manifest's file list.
// Returns what moved, for the command to say.

const SOURCE_DIRS = ["", "src", "app", "resources/js", "src/lib"];

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function rewrite(path: string, edit: (text: string) => string): Promise<boolean> {
  if (!(await exists(path))) return false;
  const text = await readFile(path, "utf8");
  const next = edit(text);
  if (next === text) return false;
  await writeFile(path, next, "utf8");
  return true;
}

export async function moveRenamedFiles(dir: string): Promise<string[]> {
  const moved: string[] = [];
  const oldFolder = join(dir, "tessera");
  const newFolder = join(dir, "tesserai");
  if ((await exists(join(oldFolder, "design-system.json"))) && !(await exists(newFolder))) {
    await rename(oldFolder, newFolder);
    moved.push("tessera/ → tesserai/");
  }
  for (const src of SOURCE_DIRS) {
    const from = join(dir, src, "tessera.css");
    const to = join(dir, src, "tesserai.css");
    if ((await exists(from)) && !(await exists(to))) {
      await rename(from, to);
      moved.push(`${src === "" ? "" : `${src}/`}tessera.css → tesserai.css`);
    }
  }
  if (moved.length === 0) return moved;
  // What names the old files: the import in the Tailwind stylesheet, the eslint wrapper's import,
  // and the manifest (its file list and any edits kept beside a file as .tessera-new).
  for (const src of SOURCE_DIRS)
    for (const candidate of STYLESHEET_CANDIDATES) await rewrite(join(dir, src, candidate), (t) => t.replace(/(["'/])tessera\.css(["'])/g, "$1tesserai.css$2"));
  for (const file of ESLINT_CONFIG_FILES) await rewrite(join(dir, file), (t) => t.replaceAll("./tessera/lint.config.mjs", "./tesserai/lint.config.mjs"));
  const manifest = join(newFolder, "manifest.json");
  await rewrite(manifest, (t) => t.replace(/"tessera\//g, '"tesserai/').replace(/tessera\.css"/g, 'tesserai.css"'));
  if (await exists(manifest)) {
    const files = Object.keys((JSON.parse(await readFile(manifest, "utf8")) as { files?: Record<string, unknown> }).files ?? {});
    for (const path of files) if (await exists(join(dir, `${path}.tessera-new`))) await rename(join(dir, `${path}.tessera-new`), join(dir, `${path}.tesserai-new`));
  }
  return moved;
}
