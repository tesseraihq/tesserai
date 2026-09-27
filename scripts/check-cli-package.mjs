// Packs @tesserai/cli exactly as it would be published, installs the tarball outside the repository
// the way npx does, and uses the installed copy in a fresh project. The tarball it leaves in
// packages/cli/release/ is the one to publish: npm publish <that file> --access public.
//
// What would make a published CLI broken or wrong, each checked below:
// - files that shouldn't ship (sources, tests, source maps, local settings) or ones missing (bin, LICENSE);
// - a dependency npm can't install: workspace packages, or anything the bundle should already hold;
// - still marked private, versioned 0.0.0, or a licence with a blank left in it;
// - closed code bundled in: text from @tesserai/ai (its instructions and tuning);
// - needing something only this repository has, so init, doctor or the MCP server fail once installed;
// - registering the MCP server by a path into npx's cache (gone when the cache is cleared) instead of
//   `npx -y @tesserai/cli`;
// - --version disagreeing with the package.
//
// Run: pnpm cli:check. It needs no network: the bundle has no dependencies to fetch.
import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));
const cli = join(root, "packages/cli");
const release = join(cli, "release");
const failures = [];
const check = (ok, message) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${message}`);
  if (!ok) failures.push(message);
};

// 1. Pack as pnpm publishes: the prepack build runs, and workspace versions are rewritten.
await rm(release, { recursive: true, force: true });
await mkdir(release, { recursive: true });
await exec("pnpm", ["pack", "--pack-destination", release], { cwd: cli });
const [tarball] = (await readdir(release)).filter((name) => name.endsWith(".tgz")).map((name) => join(release, name));
if (tarball === undefined) throw new Error("pnpm pack wrote no tarball");
const unpacked = await mkdtemp(join(tmpdir(), "tesserai-cli-unpacked-"));
await exec("tar", ["xzf", tarball, "-C", unpacked]);
const files = (await exec("tar", ["tzf", tarball])).stdout.trim().split("\n").map((f) => f.replace(/^package\//, "")).sort();

const allowed = /^(package\.json|README\.md|LICENSE|bin\/[\w-]+\.js|dist\/[\w-]+\.js)$/;
check(files.every((f) => allowed.test(f)), `only package.json, README, LICENSE, bin and dist JavaScript ship${files.some((f) => !allowed.test(f)) ? `; also: ${files.filter((f) => !allowed.test(f)).join(", ")}` : ""}`);
for (const need of ["bin/tesserai.js", "bin/help.js", "dist/cli.js", "LICENSE", "README.md"]) check(files.includes(need), `ships ${need}`);

const pkg = JSON.parse(await readFile(join(unpacked, "package/package.json"), "utf8"));
check(pkg.private !== true, "not private");
check(/^\d+\.\d+\.\d+/.test(pkg.version) && pkg.version !== "0.0.0", `a real version (${pkg.version})`);
check(pkg.license === "MIT", "MIT licensed");
for (const kind of ["dependencies", "peerDependencies", "optionalDependencies"]) {
  check(Object.keys(pkg[kind] ?? {}).length === 0, `no ${kind}: the bundle holds everything${pkg[kind] ? ` (has ${Object.keys(pkg[kind]).join(", ")})` : ""}`);
}
check(!JSON.stringify(pkg).includes("workspace:"), "no workspace: versions left");
const license = await readFile(join(unpacked, "package/LICENSE"), "utf8").catch(() => "");
check(license.startsWith("MIT License") && !/\[[^\]]*\]/.test(license), "LICENSE is MIT with no blanks left");

// 2. Nothing from the closed AI package: its prose (instructions, tool descriptions) is what's
// closed. Text the open packages also carry (a read tool's description, say) is open.
const sources = async (dir) => (await readdir(dir, { withFileTypes: true, recursive: true }))
  .filter((e) => e.isFile() && /\.ts$/.test(e.name) && !/\.test\.ts$/.test(e.name) && !e.parentPath.includes("node_modules"))
  .map((e) => join(e.parentPath, e.name));
const openSource = (await Promise.all(["core", "templates", "cli"].map(async (p) => Promise.all((await sources(join(root, "packages", p, "src"))).map((f) => readFile(f, "utf8")))))).flat().join("\n");
const closedText = new Set();
// The public repository (scripts/export-open.mjs) has no closed package to compare against.
const closed = existsSync(join(root, "packages/ai/src"));
for (const file of closed ? await sources(join(root, "packages/ai/src")) : []) {
  for (const [, text] of (await readFile(file, "utf8")).matchAll(/"((?:[^"\\\n]|\\.){60,})"/g)) if (/ \w+ \w+ /.test(text) && !openSource.includes(text)) closedText.add(text);
}
const dist = (await Promise.all(files.filter((f) => f.endsWith(".js")).map((f) => readFile(join(unpacked, "package", f), "utf8")))).join("\n");
const leaked = [...closedText].filter((text) => dist.includes(text));
if (closed) check(closedText.size > 20 && leaked.length === 0, `none of ${closedText.size} closed strings is bundled${leaked.length ? `; found: ${leaked.slice(0, 3).join(" | ")}` : ""}`);

// 3. Installed where npx puts packages, used from there in a new project.
const work = await mkdtemp(join(tmpdir(), "tesserai-cli-check-"));
const home = join(work, "npx-home");
await mkdir(home);
await writeFile(join(home, "package.json"), JSON.stringify({ name: "npx-home", private: true }));
try {
  await exec("npm", ["install", "--offline", "--no-audit", "--no-fund", "--ignore-scripts", tarball], { cwd: home });
  check(true, "installs with nothing fetched from the registry");
} catch (error) {
  check(false, `installs with nothing fetched from the registry: ${(error.stderr || error.message).split("\n").slice(0, 2).join(" ")}`);
  console.log(`\n${failures.length} failed`);
  process.exit(1);
}
const bin = join(home, "node_modules/@tesserai/cli/bin/tesserai.js");
const env = { PATH: process.env.PATH, HOME: work, TESSERAI_OFFLINE: "1" };
const run = (...args) => exec(process.execPath, [bin, ...args], { cwd: work, env });

check((await run("--version")).stdout.trim() === pkg.version, "--version prints the package version");

const project = join(work, "app");
await mkdir(join(project, "src"), { recursive: true });
await writeFile(join(project, "package.json"), JSON.stringify({ name: "app", private: true, devDependencies: { vite: "^8.0.0", tailwindcss: "^4.0.0", "@tailwindcss/vite": "^4.0.0" }, dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" } }));
await writeFile(join(project, "tsconfig.json"), JSON.stringify({ compilerOptions: { paths: { "@/*": ["./src/*"] } } }));
await writeFile(join(project, "src/index.css"), '@import "tailwindcss";\n');
const bundle = join(work, "acme.tesserai.json");
await exec("pnpm", ["exec", "tsx", "-e", `import { PRESETS } from "@tesserai/core"; import { writeFileSync } from "node:fs"; writeFileSync(${JSON.stringify(bundle)}, JSON.stringify(PRESETS[0]!.build()));`], { cwd: cli });

try {
  await run("init", bundle, "--dir", project, "--no-install", "--no-lint");
  check(true, "init runs from the installed copy");
} catch (error) {
  check(false, `init runs from the installed copy: ${error.stderr || error.message}`);
}
const exists = (path) => readFile(join(project, path), "utf8").then(() => true, () => false);
check(await exists("tesserai/design-system.json"), "init writes the system");
check(await exists("src/components/ui/button.tsx"), "init writes components");
const mcp = JSON.parse(await readFile(join(project, ".mcp.json"), "utf8").catch(() => "{}")).mcpServers?.tesserai;
check(mcp?.command === "npx" && JSON.stringify(mcp.args) === JSON.stringify(["-y", "@tesserai/cli", "mcp", "--dir", project]), `the MCP server is registered through npx, not a cached path (${JSON.stringify(mcp)})`);

try {
  const doctor = JSON.parse((await run("doctor", "--json", "--dir", project)).stdout);
  check(doctor.ok === true, "doctor passes on the new project");
} catch (error) {
  check(false, `doctor passes on the new project: ${error.stdout || error.message}`);
}

// 4. The MCP server over stdio, from the installed copy: handshake, list, and real reads.
const server = spawn(process.execPath, [bin, "mcp", "--dir", project], { cwd: work, env, stdio: ["pipe", "pipe", "pipe"] });
const pending = new Map();
let buffer = "";
server.stdout.on("data", (chunk) => {
  buffer += chunk;
  for (let at = buffer.indexOf("\n"); at >= 0; at = buffer.indexOf("\n")) {
    const line = buffer.slice(0, at);
    buffer = buffer.slice(at + 1);
    if (!line.trim()) continue;
    const message = JSON.parse(line);
    pending.get(message.id)?.(message);
  }
});
let id = 0;
const request = (method, params) => new Promise((resolve, reject) => {
  const n = ++id;
  const timer = setTimeout(() => reject(new Error(`${method} timed out`)), 20_000);
  pending.set(n, (message) => { clearTimeout(timer); resolve(message); });
  server.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: n, method, params })}\n`);
});
try {
  await request("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "cli-check", version: "1" } });
  server.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);
  const tools = (await request("tools/list", {})).result?.tools?.map((t) => t.name) ?? [];
  check(["outline", "get_tokens", "get_component", "check_contrast", "apply_changes"].every((t) => tools.includes(t)), `the MCP server lists its tools (${tools.length})`);
  const outline = await request("tools/call", { name: "outline", arguments: {} });
  check(outline.result?.isError !== true && /components built on/.test(outline.result?.content?.[0]?.text ?? ""), "outline reads the project's system");
  const button = await request("tools/call", { name: "get_component", arguments: { component: "button" } });
  check(button.result?.isError !== true && (button.result?.content?.[0]?.text ?? "").includes('"name": "button"'), "get_component answers");
} catch (error) {
  check(false, `the MCP server answers over stdio: ${error.message}`);
} finally {
  server.kill();
}

await rm(work, { recursive: true, force: true });
await rm(unpacked, { recursive: true, force: true });
console.log(failures.length === 0 ? `\nready to publish: ${tarball}` : `\n${failures.length} failed`);
process.exitCode = failures.length === 0 ? 0 : 1;
