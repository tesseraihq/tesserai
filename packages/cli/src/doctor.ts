import { parseBundle } from "@tesserai/core";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { detectProject } from "./detect";
import { sourceApi } from "./source";
import { Manifest } from "./sync";

type Check = { id: string; status: "ok" | "warning" | "error"; message: string };
export type DoctorResult = { ok: boolean; checks: Check[] };

// Local, read-only diagnostics: no credentials, network request or package installation.
export async function doctor(dir: string): Promise<DoctorResult> {
  const checks: Check[] = [];
  async function check(id: string, work: () => Promise<string>) {
    try { checks.push({ id, status: "ok", message: await work() }); }
    catch (e) { checks.push({ id, status: "error", message: e instanceof Error ? e.message : String(e) }); }
  }
  await check("project", async () => {
    await access(join(dir, "package.json"));
    const project = await detectProject(dir);
    for (const message of project.warnings) checks.push({ id: "configuration", status: "warning", message });
    return `${project.framework}; Tailwind ${project.tailwind}; ${project.packageManager}`;
  });
  await check("system", async () => {
    const parsed = parseBundle(JSON.parse(await readFile(join(dir, "tesserai/design-system.json"), "utf8")));
    if (!parsed.ok) throw new Error(`Invalid design system: ${parsed.problem}. Restore a valid bundle or run npx @tesserai/cli init <bundle or link>.`);
    return parsed.system.name;
  });
  await check("manifest", async () => {
    const manifest = Manifest.parse(JSON.parse(await readFile(join(dir, "tesserai/manifest.json"), "utf8")));
    const conflicts = (await Promise.all(Object.keys(manifest.files).map(async (path) => {
      try { await access(join(dir, `${path}.tesserai-new`)); return path; } catch { return undefined; }
    }))).filter((path) => path !== undefined);
    if (conflicts.length > 0) checks.push({ id: "conflicts", status: "warning", message: `Review ${conflicts.length} preserved edit(s) and their .tesserai-new versions: ${conflicts.join(", ")}` });
    return `${manifest.base}; ${Object.keys(manifest.files).length} managed files`;
  });
  try {
    const source = JSON.parse(await readFile(join(dir, "tesserai/source.json"), "utf8")) as { link?: unknown };
    if (typeof source.link !== "string" || sourceApi(source.link) === null) throw new Error("Invalid tesserai/source.json link. Run npx @tesserai/cli sync <bundle or link> to repair it.");
    checks.push({ id: "source", status: "ok", message: `Follows ${source.link}; remote access was not checked.` });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") checks.push({ id: "source", status: "ok", message: "Local bundle; changes can be applied through MCP." });
    else checks.push({ id: "source", status: "error", message: `Couldn't read tesserai/source.json: ${error instanceof Error ? error.message : String(error)}` });
  }
  try {
    await access(join(dir, ".tesserai-write.lock"));
    checks.push({ id: "writer", status: "warning", message: "Another tesserai command holds the project write lock. Wait for it to finish; only remove a stale lock after confirming that process has stopped." });
  } catch { /* No writer. */ }
  return { ok: checks.every((c) => c.status !== "error"), checks };
}
