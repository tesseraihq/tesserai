import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { assertCompatibleDependencies } from "./dependencies";

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "tesserai-dependencies-"));
});
afterEach(() => rm(root, { recursive: true, force: true }));
async function json(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value));
}
const name = "@tanstack/vue-table";
const required = [`${name}@^9`];
it("resolves hoisted workspace dependencies while respecting a nearer installation", async () => {
  const app = join(root, "apps/web");
  await json(join(app, "package.json"), { dependencies: { [name]: "workspace:*" } });
  await json(join(root, "node_modules", name, "package.json"), { name, version: "9.2.4" });
  await expect(assertCompatibleDependencies(app, required)).resolves.toBeUndefined();
  await json(join(app, "node_modules", name, "package.json"), { name, version: "8.21.3" });
  await expect(assertCompatibleDependencies(app, required)).rejects.toThrow(/installed 8\.21\.3/);
});
it.each(["^8", "8 || 9", "npm:another-table@^9"])(
  "does not hide incompatible declaration %s behind installed v9",
  async (declaration) => {
    await json(join(root, "package.json"), { dependencies: { [name]: declaration } });
    await json(join(root, "node_modules", name, "package.json"), { name, version: "9.2.4" });
    await expect(assertCompatibleDependencies(root, required)).rejects.toThrow(/requires \^9/);
  },
);
it("rejects a stale installed version even when the declaration has been upgraded", async () => {
  await json(join(root, "package.json"), { dependencies: { [name]: "^9" } });
  await json(join(root, "node_modules", name, "package.json"), { name, version: "8.21.3" });
  await expect(assertCompatibleDependencies(root, required)).rejects.toThrow(/installed 8\.21\.3/);
});
