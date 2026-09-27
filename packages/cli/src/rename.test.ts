import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { moveRenamedFiles } from "./rename";

// A project set up before the product was named tesserai, on disk.
async function oldProject(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "tesserai-rename-"));
  await mkdir(join(dir, "tessera"), { recursive: true });
  await mkdir(join(dir, "src"), { recursive: true });
  await writeFile(join(dir, "tessera", "design-system.json"), "{}");
  await writeFile(join(dir, "tessera", "manifest.json"), JSON.stringify({ files: { "src/tessera.css": "h1", "tessera/lint.config.mjs": "h2", "src/components/ui/button.tsx": "h3" } }));
  await writeFile(join(dir, "src", "tessera.css"), ":root {}");
  await writeFile(join(dir, "src", "index.css"), '@import "tailwindcss";\n@import "./tessera.css";\n');
  await writeFile(join(dir, "eslint.config.mjs"), 'export { default } from "./tessera/lint.config.mjs";\n');
  await mkdir(join(dir, "src", "components", "ui"), { recursive: true });
  await writeFile(join(dir, "src", "components", "ui", "button.tsx.tessera-new"), "kept edit");
  return dir;
}

describe("projects set up before the rename", () => {
  it("move to the new names once, with everything that names them", async () => {
    const dir = await oldProject();
    expect(await moveRenamedFiles(dir)).toEqual(["tessera/ → tesserai/", "src/tessera.css → tesserai.css"]);
    expect(existsSync(join(dir, "tesserai", "design-system.json"))).toBe(true);
    expect(existsSync(join(dir, "src", "tesserai.css"))).toBe(true);
    expect(await readFile(join(dir, "src", "index.css"), "utf8")).toContain('@import "./tesserai.css";');
    expect(await readFile(join(dir, "eslint.config.mjs"), "utf8")).toContain("./tesserai/lint.config.mjs");
    expect(Object.keys((JSON.parse(await readFile(join(dir, "tesserai", "manifest.json"), "utf8")) as { files: object }).files)).toEqual(["src/tesserai.css", "tesserai/lint.config.mjs", "src/components/ui/button.tsx"]);
    expect(existsSync(join(dir, "src", "components", "ui", "button.tsx.tesserai-new"))).toBe(true);
    // And never again: a second run finds nothing to move.
    expect(await moveRenamedFiles(dir)).toEqual([]);
  });

  it("leaves a project that has both alone", async () => {
    const dir = await oldProject();
    await mkdir(join(dir, "tesserai"));
    expect(await moveRenamedFiles(dir)).toEqual(["src/tessera.css → tesserai.css"]);
    expect(existsSync(join(dir, "tessera", "design-system.json"))).toBe(true);
  });
});
