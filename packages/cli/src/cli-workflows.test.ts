import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { PRESETS } from "@tesserai/core";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, beforeEach, expect, it } from "vitest";
import { init } from "./init";

const bin = fileURLToPath(new URL("../bin/tesserai.js", import.meta.url));
const exec = promisify(execFile);
let dir: string;
let project: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "tesserai-cli-flow-")); project = join(dir, "app");
  await mkdir(join(project, "src"), { recursive: true });
  await writeFile(join(project, "package.json"), JSON.stringify({ devDependencies: { vite: "^8", tailwindcss: "^4" } }));
  await writeFile(join(project, "tsconfig.json"), JSON.stringify({ compilerOptions: { paths: { "@/*": ["./src/*"] } } }));
  await writeFile(join(dir, "bundle.json"), JSON.stringify(PRESETS[0]!.build()));
  await init({ bundlePath: join(dir, "bundle.json"), dir: project, install: false, lint: false });
});
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });
const run = (...args: string[]) => exec(process.execPath, [bin, ...args, "--dir", project], { env: { ...process.env, TESSERAI_OFFLINE: "1" } });

it("prints only JSON for a sync dry run, including preserved file conflicts", async () => {
  const file = join(project, "src/components/ui/button.tsx");
  const edited = (await readFile(file, "utf8")) + "\n// my customization\n";
  await writeFile(file, edited);
  const result = await run("sync", "--dry-run", "--json");
  const json = JSON.parse(result.stdout);
  expect(json.dryRun).toBe(true);
  expect(json.files).toContainEqual(expect.objectContaining({ path: "src/components/ui/button.tsx", outcome: "kept" }));
  expect(await readFile(file, "utf8")).toBe(edited);
});

it("keeps scan --fix --json parseable and reports exact replacements", async () => {
  await writeFile(join(project, "src/example.tsx"), '<div className="p-[8px]">Example</div>');
  const result = JSON.parse((await run("scan", "--fix", "--json")).stdout);
  expect(result.fixed["src/example.tsx"]).toBe(1);
  expect(result.hardCoded).toEqual([]);
  expect(await readFile(join(project, "src/example.tsx"), "utf8")).toContain("p-2");
});

it("diagnoses installation without changing it, and names broken configuration", async () => {
  const before = await readFile(join(project, "tesserai/design-system.json"), "utf8");
  const good = JSON.parse((await run("doctor", "--json")).stdout);
  expect(good.ok).toBe(true);
  expect(good.checks).toContainEqual(expect.objectContaining({ id: "system", status: "ok" }));
  expect(await readFile(join(project, "tesserai/design-system.json"), "utf8")).toBe(before);
  await writeFile(join(project, "tesserai/design-system.json"), "{");
  try { await run("doctor", "--json"); throw new Error("doctor should fail"); }
  catch (error) {
    const result = error as { code: number; stdout: string };
    expect(result.code).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({ ok: false, checks: expect.arrayContaining([expect.objectContaining({ id: "system", status: "error" })]) });
  }
});

it("serves valid MCP over real stdio and survives a rejected tool call", async () => {
  const entry = JSON.parse(await readFile(join(project, ".mcp.json"), "utf8")).mcpServers.tesserai;
  expect(entry.command).toBe(process.execPath);
  const transport = new StdioClientTransport({ ...entry, cwd: dir, stderr: "pipe", env: { PATH: process.env.PATH!, TESSERAI_OFFLINE: "1" } });
  const client = new Client({ name: "stdio-test", version: "1.0.0" });
  try {
    await client.connect(transport);
    const names = (await client.listTools()).tools.map((tool) => tool.name).sort();
    const calls: Record<string, Record<string, unknown>> = {
      outline: {}, get_tokens: { prefix: "space" }, get_component: { component: "button" },
      explain: { path: "button.height.md" }, usage: { path: "radius.md" }, check_contrast: {},
      list_overrides: {}, guidelines: { topic: "targets" }, list_operations: {},
      describe_operation: { name: "radius.set" }, component_guide: { component: "button" },
      example_page: { page: "sign-in" }, scan: {}, sync: { dryRun: true },
      apply_changes: { ops: [{ op: "radius.set", input: { base: 14 } }], preview: true },
      import_design_system: { tokens: {}, dryRun: true },
    };
    // upload_scan needs an account link and a login this project doesn't have: it refuses, saying why.
    expect([...Object.keys(calls), "upload_scan"].sort()).toEqual(names);
    const refused = await client.callTool({ name: "upload_scan", arguments: {} });
    expect(refused.isError).toBe(true);
    expect(JSON.stringify(refused.content)).toMatch(/account/);
    for (const [name, args] of Object.entries(calls)) {
      const result = await client.callTool({ name, arguments: args });
      expect(result.isError, `${name}: ${JSON.stringify(result.content)}`).not.toBe(true);
      expect(result.content).toEqual(expect.arrayContaining([expect.objectContaining({ type: "text", text: expect.any(String) })]));
    }
    const bad = await client.callTool({ name: "apply_changes", arguments: { ops: [{ op: "does.not.exist", input: {} }] } });
    expect(bad.isError).toBe(true);
    const good = await client.callTool({ name: "get_component", arguments: { component: "button" } });
    expect(good.isError).not.toBe(true);
    expect(good.content).toEqual(expect.arrayContaining([expect.objectContaining({ type: "text", text: expect.stringContaining('"name": "button"') })]));
  } finally { await client.close(); }
}, 30000);
