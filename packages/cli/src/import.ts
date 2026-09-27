import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { applyChangeset, describeKey, foundChanges, lookToSystem, mergeLooks, PRESETS, type ImportResult, type Look } from "@tesserai/core";
import { DEFAULT_HOST, type Http } from "./auth";
import { importProject, type ProjectImport } from "./import-project";

// `npx @tesserai/cli import`: the project's look as a new tesserai system. It reads the project
// (import-project.ts), says what it found and where, what it filled in and what it left out, and
// opens the result in the builder: in the account when the browser is signed in, in the browser
// otherwise. It never changes the project.

export type ImportOptions = {
  dir: string;
  name?: string;
  // A running app to measure too (v3): what code doesn't define comes from what it renders.
  measure?: string;
  // An existing system's link (v2): the import updates it, as changes to review, instead of making
  // a new one.
  into?: string;
  dryRun?: boolean;
  out?: string;
  host?: string;
  http?: Http;
  openBrowser?: boolean;
  log?: (line: string) => void;
};

export type ImportOutcome = { ok: boolean; project: ProjectImport; url?: string; file?: string };

// The system id in a link to it: https://tesserai.design/systems/<id>.
export function systemIdOf(link: string): string {
  const id = /\/systems\/([0-9a-f-]{36})\b/.exec(link)?.[1];
  if (id === undefined) throw new Error(`--into takes a system's link, like https://tesserai.design/systems/…, from Share or Install in the builder`);
  return id;
}

// Each found value on its own, for a re-import to offer one at a time.
export function changesOf(look: Look) {
  return foundChanges(look).map(({ key, label, value, source, ops }) => ({ key, label, value, source, ops }));
}

export function reportOf(project: ProjectImport, via: "cli" | "mcp" | "measure" = "cli") {
  const r = project.result as ImportResult;
  return { via, read: project.read, found: r.found, filled: r.filled, skipped: r.skipped, warnings: r.warnings };
}

export function summarizeImport(project: ProjectImport): string[] {
  const lines: string[] = [];
  if ("error" in project.result) {
    lines.push(`Couldn't read a look from this project: ${project.result.error}.`);
    if (project.read.length > 0) lines.push(`Read: ${project.read.join(", ")}.`);
    for (const i of project.ignored.slice(0, 5)) lines.push(`Left out ${i.file}: ${i.why}.`);
    lines.push(
      "",
      "tesserai reads stylesheets, design-token files and Tailwind configs. When a look lives in code",
      "(antd, MUI, Chakra, styled-components, a theme object), your coding agent can read it:",
      "  1. claude mcp add tesserai -- npx @tesserai/cli mcp",
      '  2. ask it: "Import this project\'s design system into tesserai"',
      "Or, for an app on the web: Build from your website, at https://tesserai.design/app?open=build",
    );
    return lines;
  }
  const r = project.result;
  lines.push(`${project.name}: read ${project.read.join(", ")}.`, "");
  const pad = (s: string, n: number) => (s.length >= n ? `${s} ` : s + " ".repeat(n - s.length));
  const graded = r.found.filter((c) => !/^(light|dark)\.(chart|intent|surface)\./.test(c.key));
  lines.push(`Found (${graded.length}), set exactly:`);
  const shown = (key: string, value = "") => (/^(baseSize|radius|spacing)$/.test(key) && /^[\d.]+$/.test(value) ? `${value}px` : value);
  for (const c of graded) lines.push(`  ${pad(describeKey(c.key), 26)}${pad(shown(c.key, c.value), 34)}${c.source ?? ""}`);
  const others = r.found.length - graded.length;
  if (others > 0) lines.push(`  and ${others} more ${others === 1 ? "color" : "colors"} on other roles (hover, subtle, focus, charts)`);
  if (r.filled.length > 0) lines.push("", `Filled in, from what was found: ${r.filled.map(describeKey).join(", ")}.`);
  if (r.skipped.length > 0 || project.ignored.length > 0) {
    lines.push("", "Left out:");
    for (const s of r.skipped.slice(0, 12)) lines.push(`  ${s.name}: ${s.why}`);
    if (r.skipped.length > 12) lines.push(`  …and ${r.skipped.length - 12} more`);
    for (const i of project.ignored.slice(0, 5)) lines.push(`  ${i.file}: ${i.why}`);
    if (project.ignored.length > 5) lines.push(`  …and ${project.ignored.length - 5} more files`);
  }
  if (r.warnings.length > 0) lines.push("", ...r.warnings.map((w) => `Note: ${w}`));
  return lines;
}

export async function runImport(options: ImportOptions): Promise<ImportOutcome> {
  const write = options.log ?? ((line: string) => process.stdout.write(`${line}\n`));
  const log = (...lines: string[]) => lines.forEach((l) => write(l));
  let project = await importProject(resolve(options.dir), options.name === undefined ? {} : { name: options.name });
  if (options.measure !== undefined) {
    const { measureLook } = await import("./measure");
    // Ctrl-C stops the measuring cleanly (Chrome closed, its profile removed), then exits.
    const stop = new AbortController();
    const onInt = () => stop.abort();
    process.once("SIGINT", onInt);
    let measured;
    try {
      measured = await measureLook(options.measure, { signal: stop.signal });
    } finally {
      process.removeListener("SIGINT", onInt);
    }
    if (stop.signal.aborted) process.exit(130);
    // Code first: a value read from a file has an exact source; rendering fills in the rest.
    const look = mergeLooks(project.look, measured);
    project = { ...project, look, read: [...project.read, `${options.measure} (measured)`], result: lookToSystem(look, project.name) };
  }
  for (const line of summarizeImport(project)) log(line);
  if ("error" in project.result) return { ok: false, project };
  if (options.dryRun) {
    log("", "Nothing was made (--dry-run).");
    return { ok: true, project };
  }
  const applied = applyChangeset(PRESETS[0]!.build(), project.result.changeset);
  if (!applied.ok) throw new Error(`the import couldn't be made into a system: ${applied.error}`);
  const system = applied.system;

  if (options.out !== undefined) {
    const file = resolve(options.out);
    await writeFile(file, JSON.stringify(system, null, 2) + "\n");
    log("", `Wrote ${options.out}. Open it in tesserai: Import, in the Systems menu.`);
    return { ok: true, project, file };
  }

  const into = options.into === undefined ? undefined : systemIdOf(options.into);
  const host = (options.host ?? DEFAULT_HOST).replace(/\/$/, "");
  const http = options.http ?? (fetch as unknown as Http);
  const res = await http(`${host}/api/imports`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ system, report: reportOf(project), ...(into === undefined ? {} : { into, changes: changesOf(project.look) }) }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(`tesserai couldn't take the import (${res.status}${body?.message ? `: ${body.message}` : ""}). Try --out system.tesserai.json and import the file instead.`);
  }
  const { url } = (await res.json()) as { url: string };
  log(
    "",
    into === undefined ? `Open it in tesserai: ${url}` : `Review the changes in tesserai: ${url}`,
    into === undefined ? "(The link works once, for 10 minutes. Signed in, it's saved to your account; otherwise, to that browser.)" : "(The link works once, for 10 minutes. Only what you choose is changed.)",
  );
  if (options.openBrowser !== false) {
    const { openInBrowser } = await import("./auth");
    openInBrowser(url);
  }
  return { ok: true, project, url };
}
