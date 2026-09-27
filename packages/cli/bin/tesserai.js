#!/usr/bin/env node
import { parseArgs } from "node:util";
import { existsSync, readFileSync } from "node:fs";
import { USAGE } from "./help.js";

// Validate before loading tsx, the MCP SDK, generators or formatters. No file/network work for
// help, version or invalid invocations; unsupported flags must never be silently ignored.
const commands = {
  init: { min: 1, max: 1, flags: ["dir", "base", "prefix", "install", "lint", "live"] },
  sync: { min: 0, max: 1, flags: ["dir", "force", "verbose", "dry-run", "live", "json"] },
  export: { min: 1, max: 1, flags: ["dir", "out", "brand"] },
  storybook: { min: 0, max: 0, flags: ["dir", "install"] },
  doctor: { min: 0, max: 0, flags: ["dir", "json"] },
  scan: { min: 0, max: 0, flags: ["dir", "json", "fix"] },
  import: { min: 0, max: 1, flags: ["dir", "dry-run", "out", "name", "json", "measure", "into"] },
  mcp: { min: 0, max: 0, flags: ["dir"] },
  login: { min: 0, max: 1, flags: [] },
  logout: { min: 0, max: 1, flags: [] },
};
try {
  const { positionals, values, tokens } = parseArgs({
    allowPositionals: true, allowNegative: true, tokens: true,
    options: {
      ...Object.fromEntries(["dir", "base", "prefix", "out", "brand", "name", "measure", "into"].map((key) => [key, { type: "string" }])),
      ...Object.fromEntries(["install", "lint", "force", "verbose", "dry-run", "live", "json", "fix"].map((key) => [key, { type: "boolean" }])),
      help: { type: "boolean", short: "h" }, version: { type: "boolean", short: "v" },
    },
  });
  const [command, ...args] = positionals;
  if (command !== undefined && !Object.hasOwn(commands, command)) throw new Error(`unknown command "${command}"; run tesserai --help`);
  if (values.version) {
    process.stdout.write(JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version + "\n");
  } else if (values.help || command === undefined) {
    const section = command === undefined ? USAGE : USAGE.split(/\n(?=  [a-z]+(?: |\n))/).find((s) => s.startsWith(`  ${command} `));
    process.stdout.write(section === undefined ? USAGE : `tesserai ${section.trimStart()}\n`);
  } else {
    const spec = commands[command];
    if (args.length < spec.min) throw new Error(`${command} needs ${command === "export" ? "a format" : "a bundle path or share link"}; run tesserai ${command} --help`);
    if (args.length > spec.max) throw new Error(`too many arguments for ${command}; run tesserai ${command} --help`);
    for (const token of tokens) {
      if (token.kind !== "option") continue;
      const name = token.name.replace(/^no-/, "");
      if (!spec.flags.includes(name)) throw new Error(`${command} does not accept ${token.rawName}; run tesserai ${command} --help`);
    }
    if ((process.env.TESSERAI_SOURCE ?? process.env.TESSERA_SOURCE) !== "1" && existsSync(new URL("../dist/cli.js", import.meta.url))) {
      await import("../dist/cli.js");
    } else {
      const { register } = await import("tsx/esm/api");
      register();
      await import("../src/cli.ts");
    }
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
