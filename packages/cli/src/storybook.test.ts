import { PRESETS } from "@tesserai/core";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { init } from "./init";
import { storybook } from "./storybook";
import { sync } from "./sync";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "tesserai-sb-"));
});
afterEach(() => rm(dir, { recursive: true, force: true }));

async function project(): Promise<string> {
  const p = join(dir, "app");
  await mkdir(join(p, "src"), { recursive: true });
  await writeFile(join(p, "package.json"), JSON.stringify({ name: "app", dependencies: { react: "^19" }, devDependencies: { vite: "^8", tailwindcss: "^4.3.0" } }));
  await writeFile(join(p, "tsconfig.json"), JSON.stringify({ compilerOptions: { paths: { "@/*": ["./src/*"] } } }));
  await writeFile(join(p, "src/index.css"), '@import "tailwindcss";\n');
  const bundle = join(dir, "acme.tesserai.json");
  await writeFile(bundle, JSON.stringify(PRESETS[0]!.build()));
  await init({ bundlePath: bundle, dir: p, install: false, lint: false });
  return p;
}

describe("tesserai storybook", () => {
  it("writes the config and a story per component, and sync keeps them current", async () => {
    const p = await project();
    const result = await storybook({ dir: p, install: false });
    expect(result.framework).toBe("react-vite");
    expect(result.missingDevDeps).toEqual(["storybook@^10", "@storybook/react-vite@^10", "@storybook/addon-a11y@^10", "@storybook/addon-themes@^10"]);
    expect(await readFile(join(p, ".storybook/preview.tsx"), "utf8")).toContain('import "../src/index.css";');
    expect(await readFile(join(p, "src/stories/tesserai/button.stories.tsx"), "utf8")).toContain("export const Playground");
    expect(await readFile(join(p, "src/stories/tesserai/examples/dialog.tsx"), "utf8")).toContain("DialogTrigger");
    const pkg = JSON.parse(await readFile(join(p, "package.json"), "utf8")) as { scripts: Record<string, string> };
    expect(pkg.scripts).toMatchObject({ storybook: "storybook dev -p 6006", "build-storybook": "storybook build" });

    // Someone edits a story; sync keeps it and regenerates the rest.
    await writeFile(join(p, "src/stories/tesserai/badge.stories.tsx"), "// mine\n");
    const synced = await sync({ dir: p, force: false });
    expect(synced.files.find((f) => f.path === "src/stories/tesserai/badge.stories.tsx")?.outcome).toBe("kept");
    expect(synced.files.find((f) => f.path === "src/stories/tesserai/button.stories.tsx")?.outcome).toBe("unchanged");
    // Generates every component and its story twice: well past the default under a full run's load.
  }, 30_000);

  it("leaves a Storybook the project already has alone", async () => {
    const p = await project();
    await mkdir(join(p, ".storybook"));
    await writeFile(join(p, ".storybook/main.ts"), "export default {};\n");
    const result = await storybook({ dir: p, install: false });
    expect(result.kept).toContain(".storybook/main.ts");
    expect(await readFile(join(p, ".storybook/main.ts"), "utf8")).toBe("export default {};\n");
    expect(await readFile(join(p, ".storybook/main.ts.tesserai-new"), "utf8")).toContain("@storybook/addon-a11y");
  });
});
