import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyChangeset, lookToSystem, mergeLooks, parseBundle, PRESETS } from "@tesserai/core";
import { measureLook } from "../../src/measure";
import { importProject } from "../../src/import-project";
import type { Outcome } from "./grade";

// The ways an import can happen. Each gets the staged project folder and returns what it made.
// `applies` limits a route to the fixtures it can run on; `paid` routes need --yes.

export type Route = { paid: boolean; applies: (fixture: string) => boolean; run: (dir: string, fixture: string) => Promise<Outcome> };


async function direct(dir: string): Promise<Outcome> {
  const started = performance.now();
  const project = await importProject(dir);
  const seconds = (performance.now() - started) / 1000;
  if ("error" in project.result) return { ok: false, error: project.result.error, seconds, chose: project.read };
  const applied = applyChangeset(PRESETS[0]!.build(), project.result.changeset);
  if (!applied.ok) return { ok: false, error: applied.error, seconds };
  return { ok: true, system: applied.system, found: project.result.found, filled: project.result.filled, skipped: project.result.skipped, chose: project.read, seconds };
}

// The coding-agent route: Claude Code, headless, in the project, with tesserai's MCP server and
// nothing else. It may only read (Read, Glob, Grep) and call import_design_system: it can't write,
// edit or run anything. The same run a person gets from "import this project's design system into
// tesserai", minus their own settings (project and local settings only, like the drift study) and
// with a spending cap per run. The tool writes its result to a file instead of opening a link.
export const AGENT_MODEL = process.env.IMPORT_BENCH_MODEL ?? "sonnet";
export const AGENT_BUDGET_USD = Number(process.env.IMPORT_BENCH_BUDGET ?? "1.00");
const CLI = new URL("../../bin/tesserai.js", import.meta.url).pathname;
const PROMPT = "Import this project's design system into tesserai.";

async function agent(dir: string): Promise<Outcome> {
  const scratch = mkdtempSync(join(tmpdir(), "tesserai-agent-"));
  const out = join(scratch, "import.json");
  const config = join(scratch, "mcp.json");
  writeFileSync(
    config,
    JSON.stringify({
      mcpServers: {
        tesserai: {
          command: "node",
          args: [CLI, "mcp", "--dir", dir],
          env: { TESSERAI_SOURCE: "1", TESSERAI_IMPORT_OUT: out },
        },
      },
    }),
  );
  const started = performance.now();
  const args = [
    "-p", PROMPT,
    "--model", AGENT_MODEL,
    "--setting-sources", "project,local",
    "--strict-mcp-config", "--mcp-config", config,
    // All of tesserai's tools (a session that reaches for its read tools mustn't stall on a prompt);
    // still nothing that writes files or runs commands.
    "--allowedTools", "Read", "Glob", "Grep", "mcp__tesserai",
    "--disallowedTools", "Write", "Edit", "Bash", "WebFetch", "WebSearch", "Skill", "Task",
    "--max-budget-usd", String(AGENT_BUDGET_USD),
    "--no-session-persistence",
    "--output-format", "json",
  ];
  const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
    const child = spawn("claude", args, { cwd: dir, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env } });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    const timer = setTimeout(() => child.kill("SIGTERM"), 10 * 60_000);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
  const seconds = (performance.now() - started) / 1000;
  let costUsd: number | undefined;
  try {
    costUsd = (JSON.parse(result.stdout) as { total_cost_usd?: number }).total_cost_usd;
  } catch {
    // No JSON result (killed, or failed to start).
  }
  try {
    if (!existsSync(out)) return { ok: false, error: `the agent didn't import (exit ${result.code}): ${result.stderr.slice(0, 300) || result.stdout.slice(-300)}`, seconds, costUsd };
    const got = JSON.parse(readFileSync(out, "utf8")) as { system: unknown; report: { found: Outcome["found"]; filled: string[]; skipped: { name: string; why: string }[]; read: string[] } };
    const parsed = parseBundle(got.system);
    if (!parsed.ok) return { ok: false, error: parsed.problem, seconds, costUsd };
    return { ok: true, system: parsed.system, found: got.report.found, filled: got.report.filled, skipped: got.report.skipped, chose: got.report.read, seconds, costUsd };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

// The measuring route (v3): the direct route plus the page the project renders, served from the
// staged folder on localhost and measured in Chrome, as `import --measure <url>` does. A project
// with no page to serve is the direct route alone.
async function measured(dir: string): Promise<Outcome> {
  const started = performance.now();
  const project = await importProject(dir);
  let look = project.look;
  const read = [...project.read];
  if (existsSync(join(dir, "index.html"))) {
    const { createServer } = await import("node:http");
    const { readFileSync: read_ } = await import("node:fs");
    const server = createServer((req, res) => {
      const path = join(dir, decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname).replace(/\/$/, "/index.html"));
      try {
        const body = read_(path);
        const type = path.endsWith(".css") ? "text/css" : path.endsWith(".js") ? "text/javascript" : path.endsWith(".html") ? "text/html" : "application/octet-stream";
        res.writeHead(200, { "content-type": type }).end(body);
      } catch {
        res.writeHead(404).end();
      }
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const address = server.address();
    const url = `http://127.0.0.1:${typeof address === "object" && address !== null ? address.port : 0}/`;
    try {
      look = mergeLooks(look, await measureLook(url));
      read.push("the rendered page");
    } finally {
      server.close();
    }
  }
  const result = lookToSystem(look, project.name);
  const seconds = (performance.now() - started) / 1000;
  if ("error" in result) return { ok: false, error: result.error, seconds, chose: read };
  const applied = applyChangeset(PRESETS[0]!.build(), result.changeset);
  if (!applied.ok) return { ok: false, error: applied.error, seconds };
  return { ok: true, system: applied.system, found: result.found, filled: result.filled, skipped: result.skipped, chose: read, seconds };
}

export const routes: Record<"direct" | "agent" | "measure", Route> = {
  // `npx @tesserai/cli import`: known formats read directly (v1).
  direct: { paid: false, applies: () => true, run: direct },
  // The coding agent reads the project and calls the MCP tool (v1).
  agent: { paid: true, applies: () => true, run: agent },
  // `import --measure <url>`: the running app's rendered styles (v3). Only fixtures with a page.
  measure: { paid: false, applies: () => true, run: measured },
};
