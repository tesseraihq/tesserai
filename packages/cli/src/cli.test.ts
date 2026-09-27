import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const exec = promisify(execFile);
const bin = fileURLToPath(new URL("../bin/tesserai.js", import.meta.url));
async function cli(...args: string[]) {
  try { return { ...(await exec(process.execPath, [bin, ...args])), code: 0 }; }
  catch (e) { const error = e as { stdout: string; stderr: string; code: number }; return error; }
}

describe("the real CLI entrypoint", () => {
  it("offers successful help without loading the application runtime", async () => {
    const result = await cli("--help");
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("tesserai <command>");
    expect(result.stderr).toBe("");
    const traced = await exec(process.execPath, [bin, "--help"], { env: { ...process.env, NODE_DEBUG: "esm" } });
    expect(traced.stderr).not.toMatch(/tsx|modelcontextprotocol|prettier|anthropic/);
  });
  it("prints its version without needing a project", async () => {
    const result = await cli("--version");
    expect(result).toMatchObject({ code: 0, stderr: "" });
    expect(result.stdout).toMatch(/^\d+\.\d+\.\d+\n$/);
  });
  it.each([
    ["sync", "a.json", "b.json"],
    ["sync", "--fix"],
    ["init", "a.json", "--force"],
    ["mcp", "--json"],
    ["scan", "--base", "radix"],
    ["nope"],
  ])("rejects unsupported arguments before doing work: %s", async (...args) => {
    const result = await cli(...args);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(/unknown command|does not accept|too many/);
    expect(result.stderr).not.toMatch(/ENOENT|manifest/);
  });
});
