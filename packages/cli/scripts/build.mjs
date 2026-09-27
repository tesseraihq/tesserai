import { build } from "esbuild";
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
await rm(new URL("../dist/", import.meta.url), { recursive: true, force: true });
await build({
  absWorkingDir: root, entryPoints: ["src/cli.ts"], outdir: "dist", bundle: true,
  platform: "node", target: "node22", format: "esm", splitting: true,
  treeShaking: true, minify: true, sourcemap: true,
  // Dependencies that retain a Node require (e.g. Svelte's parser) still work in ESM chunks.
  banner: { js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);' },
  logLevel: "info",
});
