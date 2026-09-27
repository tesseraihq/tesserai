import type { Base } from "@tesserai/templates";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { PlatformFormat } from "@tesserai/core";
import { parseArgs } from "node:util";
import { env } from "./env";


const BASES = ["base-ui", "radix", "react-aria"] as const;
function isBase(value: string): value is Base { return (BASES as readonly string[]).includes(value); }
const isLink = (value: string) => /^https?:\/\//i.test(value);

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    allowNegative: true,
    options: {
      dir: { type: "string", default: "." },
      base: { type: "string" },
      prefix: { type: "string" },
      install: { type: "boolean", default: true },
      lint: { type: "boolean", default: true },
      force: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      fix: { type: "boolean", default: false },
      upload: { type: "boolean", default: false },
      verbose: { type: "boolean", default: false },
      live: { type: "boolean", default: false },
      out: { type: "string" },
      brand: { type: "string" },
      name: { type: "string" },
      measure: { type: "string" },
      into: { type: "string" },
      json: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  const [command, bundle] = positionals;
  const log = (line: string) => (values.json ? process.stderr : process.stdout).write(`${line}\n`);

  // A project set up before the rename moves to the new file names first (not on a dry run).
  if (command !== undefined && command !== "login" && command !== "logout" && command !== "help" && command !== "import" && !values["dry-run"] && !values.help) {
    const { moveRenamedFiles } = await import("./rename");
    const moved = await moveRenamedFiles(resolve(values.dir));
    if (moved.length > 0) process.stderr.write(`Renamed for tesserai: ${moved.join(", ")}\n`);
  }

  if (command === "init") {
    const { init, summarize } = await import("./init");
    if (bundle === undefined) {
      process.stderr.write(`init needs a bundle path or share link; run npx @tesserai/cli init --help\n`);
      return 1;
    }
    if (values.base !== undefined && !isBase(values.base)) {
      process.stderr.write(`unknown base "${values.base}"; expected one of ${BASES.join(", ")}\n`);
      return 1;
    }
    const result = await init({
      bundlePath: isLink(bundle) ? bundle : resolve(bundle),
      dir: resolve(values.dir),
      ...(values.base === undefined ? {} : { base: values.base }),
      ...(values.prefix === undefined ? {} : { prefix: values.prefix === "none" ? null : values.prefix }),
      install: values.install,
      lint: values.lint,
      live: values.live,
      log,
    });
    process.stdout.write(summarize(result).join("\n") + "\n");
    return 0;
  }

  if (command === "sync") {
    const { sync, summarizeSync } = await import("./sync");
    const result = await sync({
      dir: resolve(values.dir),
      bundlePath: bundle === undefined ? undefined : isLink(bundle) ? bundle : resolve(bundle),
      force: values.force,
      live: values.live,
      dryRun: values["dry-run"],
      install: values.install,
      log,
    });
    process.stdout.write(values.json ? JSON.stringify(result, (_key, value: unknown) => value instanceof Set ? [...value] : value, 2) + "\n" : summarizeSync(result, values.verbose).join("\n") + "\n");
    return 0;
  }

  if (command === "export") {
    const { emitPlatform, parseBundle, PLATFORM_FORMATS, systemForBrand } = await import("@tesserai/core");
    const format = bundle;
    if (format === undefined || !(PLATFORM_FORMATS as readonly string[]).includes(format)) {
      process.stderr.write(`export needs a format: ${PLATFORM_FORMATS.join(", ")}\n`);
      return 1;
    }
    const path = join(resolve(values.dir), "tesserai", "design-system.json");
    const parsed = parseBundle(JSON.parse(await readFile(path, "utf8")));
    if (!parsed.ok) throw new Error(`tesserai/design-system.json isn't a valid design system: ${parsed.problem}`);
    const brands = Object.keys(parsed.system.brands ?? {});
    if (values.brand !== undefined && values.brand !== "default" && !brands.includes(values.brand)) {
      process.stderr.write(`there is no brand "${values.brand}"; ${brands.length === 0 ? "this system has none" : `its brands are ${brands.join(", ")}`}\n`);
      return 1;
    }
    const output = emitPlatform(values.brand === undefined ? parsed.system : systemForBrand(parsed.system, values.brand), format as PlatformFormat);
    if (values.out === undefined) process.stdout.write(output);
    else {
      await writeFile(resolve(values.out), output);
      log(`wrote ${values.out}`);
    }
    return 0;
  }

  if (command === "storybook") {
    const { storybook, summarizeStorybook } = await import("./storybook");
    const result = await storybook({ dir: resolve(values.dir), install: values.install, log: (line) => process.stderr.write(`${line}\n`) });
    process.stdout.write(summarizeStorybook(result).join("\n") + "\n");
    return 0;
  }

  if (command === "scan") {
    const { applyFixes, scan, summarizeScan } = await import("./scan");
    const { parseBundle } = await import("@tesserai/core");
    const dir = resolve(values.dir);
    const parsed = parseBundle(JSON.parse(await readFile(join(dir, "tesserai", "design-system.json"), "utf8")));
    if (!parsed.ok) throw new Error(`tesserai/design-system.json isn't a valid design system: ${parsed.problem}`);
    const result = await scan(dir, parsed.system);
    // --upload: kept with the system in the builder (Pro); after --fix, the scan after the fixes.
    const keep = async (kept: typeof result) => {
      if (!values.upload) return null;
      const { uploadScan } = await import("./scan-upload");
      const done = await uploadScan({ dir, result: kept, fetch: (url, init) => fetch(url, init) });
      if (!values.json) process.stderr.write(`Kept with the system as "${done.project}": see Usage in the builder (${done.url}).\n`);
      return done;
    };
    if (values.fix) {
      const fixed = await applyFixes(dir, result.hardCoded);
      const total = Object.values(fixed).reduce((a, b) => a + b, 0);
      if (!values.json) process.stdout.write(`Fixed ${total} exact ${total === 1 ? "match" : "matches"}${Object.keys(fixed).length === 0 ? "" : ` in ${Object.keys(fixed).join(", ")}`}.\n\n`);
      const after = await scan(dir, parsed.system);
      process.stdout.write(values.json ? JSON.stringify({ ...after, fixed }, null, 2) + "\n" : summarizeScan(after).join("\n") + "\n");
      const uploaded = await keep(after);
      if (values.json && uploaded !== null) process.stdout.write(JSON.stringify({ uploaded }) + "\n");
      return 0;
    }
    process.stdout.write(values.json ? JSON.stringify(result, null, 2) + "\n" : summarizeScan(result).join("\n") + "\n");
    const uploaded = await keep(result);
    if (values.json && uploaded !== null) process.stdout.write(JSON.stringify({ uploaded }) + "\n");
    return 0;
  }

  if (command === "import") {
    const { runImport } = await import("./import");
    const { DEFAULT_HOST } = await import("./auth");
    const result = await runImport({
      dir: bundle ?? values.dir,
      ...(values.name === undefined ? {} : { name: values.name }),
      ...(values.out === undefined ? {} : { out: values.out }),
      ...(values.measure === undefined ? {} : { measure: values.measure }),
      ...(values.into === undefined ? {} : { into: values.into }),
      dryRun: values["dry-run"],
      host: env("HOST") ?? DEFAULT_HOST,
      openBrowser: env("NO_BROWSER") !== "1",
      log,
    });
    if (values.json) process.stdout.write(JSON.stringify({ ok: result.ok, url: result.url, file: result.file, name: result.project.name, read: result.project.read, ignored: result.project.ignored, ...("error" in result.project.result ? { error: result.project.result.error } : { found: result.project.result.found, filled: result.project.result.filled, skipped: result.project.result.skipped, warnings: result.project.result.warnings }) }, null, 2) + "\n");
    return result.ok ? 0 : 1;
  }

  if (command === "doctor") {
    const { doctor } = await import("./doctor");
    const result = await doctor(resolve(values.dir));
    process.stdout.write(values.json ? JSON.stringify(result, null, 2) + "\n" : result.checks.map((c) => `${c.status}: ${c.id} — ${c.message}`).join("\n") + "\n");
    return result.ok ? 0 : 1;
  }

  if (command === "mcp") {
    const [{ createMcpServer }, { StdioServerTransport }] = await Promise.all([import("./mcp"), import("@modelcontextprotocol/sdk/server/stdio.js")]);
    // stdout carries the protocol from here on; nothing else may write to it.
    // Without --dir, the project is found from the editor's open folders (an install from a
    // directory or a one-click link may start the server elsewhere).
    const given = argv.some((arg) => arg === "--dir" || arg.startsWith("--dir="));
    const server = createMcpServer(resolve(values.dir), { locate: !given });
    await server.connect(new StdioServerTransport());
    return new Promise<number>(() => {});
  }

  if (command === "login") {
    const { login } = await import("./auth");
    // TESSERAI_NO_BROWSER=1 only prints the link (over SSH, or in scripts).
    const { host, email } = await login({ ...(bundle === undefined ? {} : { host: bundle }), log, openBrowser: env("NO_BROWSER") !== "1" });
    log(`Signed in to ${host} as ${email}.`);
    return 0;
  }

  if (command === "logout") {
    const { logout } = await import("./auth");
    log((await logout(bundle === undefined ? {} : { host: bundle })) ? "Signed out." : "You weren't signed in there.");
    return 0;
  }

  process.stderr.write(`unknown command "${command}"; run tesserai --help\n`);
  return 1;
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  },
);
