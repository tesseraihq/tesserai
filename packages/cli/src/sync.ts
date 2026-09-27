import { assertCompatibleDependencies } from "./dependencies";
import { withProjectLock } from "./project-lock";
import { breakingChanges, emitEslintConfig, loadFontMetrics, systemCss, parseBundle, type Breaking,
  type DesignSystem} from "@tesserai/core";
import { TARGETS, dependenciesFor, packageName, prefixFiles, renderAll, targetFramework } from "@tesserai/templates";
import { storybookFor } from "./storybook";
import { syncTarget } from "./target";
import { access, mkdir as fsMkdir, readFile,
  lstat,
  rm as fsRm, writeFile as fsWriteFile } from "node:fs/promises";
import { dirname, join, relative, resolve, isAbsolute, sep } from "node:path";
import { z } from "zod";
import { detectProject, type Project } from "./detect";
import { diffLines, formatDiff, summarizeDiff, type DiffSummary } from "./diff";
import { downloadFonts, fontUrl, type FetchBinary } from "./fonts";
import { installArgs, lintOptionsFor, preparedOrThrow, setIconLibrary, sha256, findStylesheet, withTheirBarrel, writeAgents } from "./init";
import { spawn } from "node:child_process";
import { codeDirFor, placeFiles } from "./layout";
import { readPrefix, setShadcnPrefix, utilsPrefixWarning } from "./prefix";
import { readSource, type Fetch, type SourceFile } from "./source";
import { takeOverStylesheet } from "./shadcn-theme";
import { syncWebFonts, webFontCss, type FetchBytes, type FetchText } from "./web-fonts";
import { env } from "./env";

function safeRelativePath(path: string): boolean {
  return (
    path.length > 0 &&
    !isAbsolute(path) &&
    !path.includes("\\") &&
    !path.includes(":") &&
    path.split("/").every((part) => part !== ".." && part !== "." && part !== "")
  );
}

async function confined(root: string, path: string): Promise<void> {
  const key = relative(root, resolve(path));
  if (!safeRelativePath(manifestKey(key))) throw new Error(`path escapes the project: ${path}`);
  let current = root;
  for (const part of key.split(sep)) {
    current = join(current, part);
    const info = await lstat(current).catch((e: NodeJS.ErrnoException) => {
      if (e.code === "ENOENT") return undefined;
      throw e;
    });
    if (info?.isSymbolicLink()) throw new Error(`refusing to modify a symbolic link: ${current}`);
  }
}

export const Manifest = z
  .object({
    // What the components were written for: a React library, reka-ui (Vue) or bits-ui (Svelte).
    base: z.enum(TARGETS),
    files: z.record(z.string().refine(safeRelativePath, "manifest paths must stay inside the project"), z.string().regex(/^[0-9a-f]{64}$/)),
    // Set by `npx @tesserai/cli storybook`: sync regenerates the stories too.
    storybook: z.object({ framework: z.enum(["react-vite", "nextjs-vite", "vue3-vite", "sveltekit", "svelte-vite"]), storiesDir: z.string(), stylesheet: z.string() }).strict().optional(),
  })
  .strict();
export type Manifest = z.infer<typeof Manifest>;

// Manifest keys use "/" whatever the platform, so a manifest travels between machines.
export function manifestKey(path: string): string {
  return path.split(sep).join("/");
}

export type SyncOptions = {
  dir: string;
  // A newer bundle (a file or a share link) to adopt; it replaces tesserai/design-system.json
  // after validation and rendering. Without one, a followed share link pulls its latest version.
  bundlePath?: string | undefined;
  // A local edit from MCP, validated and rendered before the bundle is replaced.
  system?: DesignSystem;
  fetch?: Fetch;
  // Take the current version of a private system even when it has releases.
  live?: boolean;
  // Overwrite locally modified files instead of writing the new version alongside.
  force: boolean;
  fetchFont?: FetchBinary;
  // Stand-ins for Google Fonts (tests); TESSERAI_OFFLINE=1 skips downloading web fonts.
  fetchWebFont?: { text: FetchText; bytes: FetchBytes };
  // Work out what would change and write nothing.
  dryRun?: boolean;
  // Install packages a newly included component (or a switched library) needs, with the project's
  // package manager, as init does. The command line does unless --no-install; MCP edits don't.
  install?: boolean;
  // Stand-in for running the package manager (tests).
  runInstall?: (command: string, args: string[], cwd: string) => Promise<void>;
  log?: (line: string) => void;
};

export type FileOutcome =
  | { path: string; outcome: "unchanged" }
  | { path: string; outcome: "updated"; diff: DiffSummary }
  | { path: string; outcome: "created" }
  | { path: string; outcome: "kept"; newPath: string; diff: DiffSummary; preview: string }
  | { path: string; outcome: "overwritten"; diff: DiffSummary }
  // A file the manifest tracked that the system no longer produces.
  | { path: string; outcome: "removed" }
  | { path: string; outcome: "orphaned" };

// `release`: the release pulled from the followed link, with its notes; `dryRun`: nothing was written.
// `breaking`: what the pulled version breaks in code written against the one the project had.
// `installed`: the packages sync installed (or, on a dry run, would install).
export type SyncResult = { project: Project; files: FileOutcome[]; warnings: string[]; release: { number: number; notes: string | null } | null; dryRun: boolean; breaking: Breaking[]; installed: string[] };

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readIfExists(path: string): Promise<string | undefined> {
  return (await exists(path)) ? readFile(path, "utf8") : undefined;
}

export async function sync(options: SyncOptions): Promise<SyncResult> {
  return options.dryRun ? syncProject(options) : withProjectLock(options.dir, () => syncProject(options));
}

async function syncProject(options: SyncOptions): Promise<SyncResult> {
  const log = options.log ?? (() => {});
  const project = await detectProject(options.dir);
  const warnings = [...project.warnings];
  const at = (...parts: string[]) => join(project.dir, ...parts);
  const rel = (path: string) => manifestKey(relative(project.dir, path));

  const manifestPath = at("tesserai", "manifest.json");
  const manifestRaw = await readIfExists(manifestPath);
  if (manifestRaw === undefined) throw new Error(`no tesserai/manifest.json in ${project.dir}; run npx @tesserai/cli init first`);
  const manifest = Manifest.parse(JSON.parse(manifestRaw));
  // A dry run goes through every step and writes nothing.
  const dry = options.dryRun === true;
  const planned = new Map<string, string | null>();
  const writeFile = async (path: string, data: string, _encoding?: string) => {
    await confined(project.dir, path);
    planned.set(path, data);
  };
  const rm = async (path: string) => {
    await confined(project.dir, path);
    planned.set(path, null);
  };
  const mkdir = async (_path: string, _options: { recursive: boolean }) => {};
  for (const key of Object.keys(manifest.files)) await confined(project.dir, at(...key.split("/")));
  // What was pulled, when a dry run didn't write it to tesserai/design-system.json.
  let pulled: unknown;

  const bundleCopy = at("tesserai", "design-system.json");
  const sourcePath = at("tesserai", "source.json");
  const followed = await readIfExists(sourcePath);
  // The version the project has now, to say what a newer one breaks.
  const had = await readIfExists(bundleCopy);
  const previous = had === undefined ? null : parseBundle(JSON.parse(had));
  const link = followed === undefined ? null : (JSON.parse(followed) as SourceFile).link;
  let release: SyncResult["release"] = null;
  if (options.system !== undefined) {
    pulled = options.system;
    await writeFile(bundleCopy, JSON.stringify(pulled, null, 2) + "\n");
  } else if (options.bundlePath !== undefined) {
    const adopted = await readSource(options.bundlePath, options.fetch, { live: options.live ?? false });
    pulled = adopted.system;
    await writeFile(bundleCopy, JSON.stringify(adopted.system, null, 2) + "\n");
    // Adopting a link starts following it; adopting a file stops following any link.
    if (adopted.link !== null) await writeFile(sourcePath, JSON.stringify({ link: adopted.link } satisfies SourceFile, null, 2) + "\n");
    else if (link !== null) await rm(sourcePath);
    log(`adopted ${options.bundlePath}`);
  } else if (link !== null) {
    try {
      const latest = await readSource(link, options.fetch, { live: options.live ?? false });
      pulled = latest.system;
      await writeFile(bundleCopy, JSON.stringify(latest.system, null, 2) + "\n");
      log(latest.release === null ? `pulled the latest version from ${link}` : `pulled release ${latest.release} from ${link}`);
      release = latest.release === null ? null : { number: latest.release, notes: latest.notes };
    } catch (e) {
      warnings.push(`${e instanceof Error ? e.message : String(e)}; used the copy in tesserai/design-system.json`);
    }
  }
  const parsedCopy = parseBundle(pulled ?? JSON.parse(await readFile(bundleCopy, "utf8")));
  if (!parsedCopy.ok) throw new Error(`tesserai/design-system.json is not a valid design system (${parsedCopy.problem})`);
  const breaking = pulled !== undefined && previous?.ok ? breakingChanges(previous.system, parsedCopy.system) : [];
  // Made ready the one way every system is (an older bundle gets what today's templates need; the
  // generators are the source of truth, so changed parameters are honored), and checked.
  const system = preparedOrThrow(parsedCopy.system);
  // The bundle is the source of truth for the React library; switching it in the builder and
  // syncing regenerates every component on the new primitives. The framework never changes: a
  // project installed as Vue stays Vue whatever the system shows its code in.
  const { target: base, note } = syncTarget(manifest.base, system);
  project.codeDir = codeDirFor(project, targetFramework(base));
  await assertCompatibleDependencies(project.dir, dependenciesFor(system, base));
  if (note !== null) log(note);
  if (base !== manifest.base) log(`switching components from ${manifest.base} to ${base}`);
  // Render before any helper is allowed to change project files.
  const generated = await renderAll(base, system);
  // A switched base or a newly included component can need packages the project lacks.
  if (!dry && (await setIconLibrary(project.dir, system))) log("components.json now names the system's icon library");
  const fonts = dry ? { written: [], missing: [] } : await downloadFonts({ system, dir: at(project.srcDir, "fonts"), ...(link === null ? {} : { host: link }), ...(options.fetchFont === undefined ? {} : { fetch: options.fetchFont }) });
  for (const name of fonts.written) log(`downloaded fonts/${name}`);
  if (fonts.missing.length > 0) warnings.push(`couldn't download ${fonts.missing.join(", ")}; run npx @tesserai/cli login, then sync again`);
  const web = await syncWebFonts({
    system,
    fontsDir: at(project.srcDir, "fonts"),
    record: at("tesserai", "web-fonts.json"),
    dryRun: dry || (env("OFFLINE") === "1" && options.fetchWebFont === undefined),
    ...(options.fetchWebFont === undefined ? {} : { fetchText: options.fetchWebFont.text, fetchBytes: options.fetchWebFont.bytes }),
  });
  for (const name of web.written) log(`downloaded fonts/${name}`);
  if (web.missing.length > 0) warnings.push(`couldn't download ${web.missing.join(", ")} from Google Fonts; sync again to retry`);
  // A project installed before tesserai took over shadcn's theme still has it, winning over the system's.
  const stylesheet = await findStylesheet(project);
  if (stylesheet !== undefined) {
    const tookOver = await takeOverStylesheet(project.dir, stylesheet, dry);
    if (tookOver !== null) log(dry ? `would move shadcn's own theme out of ${stylesheet}` : tookOver);
  }
  // The class prefix is the stylesheet's (its Tailwind import), whatever the system's default.
  const prefix = await readPrefix(project.dir, stylesheet);
  if (prefix === undefined && system.tailwindPrefix !== undefined) warnings.push(`the system's classes use the ${system.tailwindPrefix}: prefix, but this project's Tailwind import has none, so they're written unprefixed; add prefix(${system.tailwindPrefix}) to it to use one`);
  if (!dry && (await setShadcnPrefix(project.dir, prefix))) log(`components.json now names the ${prefix ?? "(no)"} class prefix`);
  const utilsWarning = await utilsPrefixWarning(project, prefix);
  if (utilsWarning !== null) warnings.push(utilsWarning);
  // Kept current (its component list, the prefix), never brought back once deleted.
  const agents = await writeAgents(project.dir, system, project.codeDir, prefix, { dryRun: dry, create: false, framework: targetFramework(base), libPrefix: project.libPrefix ?? null });
  if (agents !== null) log(dry ? "would update AGENTS.md" : "updated AGENTS.md");
  const needed = dependenciesFor(system, base).filter((d) => !project.dependencies.has(packageName(d)));
  const installing = needed.length > 0 && options.install === true;
  if (needed.length > 0 && !installing) warnings.push(`the ${base} components need ${needed.join(" ")}; install them${options.install === false ? " (sync installs them without --no-install)" : ""}`);

  const targets: { path: string; source: string }[] = [
    { path: at(project.srcDir, "tesserai.css"), source: systemCss(system, { includeImport: false, fontUrl, fontMetrics: await loadFontMetrics(), ...(prefix === undefined ? {} : { prefix }) }) + webFontCss(web.faces) },
  ];
  if ("tesserai/lint.config.mjs" in manifest.files) {
    targets.push({ path: at("tesserai", "lint.config.mjs"), source: emitEslintConfig(system, lintOptionsFor(project, targetFramework(base))) });
  }
  const placed = placeFiles(await prefixFiles(generated, prefix), project, base);
  for (const file of placed) {
    if (file.from === "lib/utils.ts") continue;
    targets.push({ path: at(file.path), source: await withTheirBarrel(at(file.path), file, placed) });
  }
  if (manifest.storybook !== undefined) {
    for (const file of await prefixFiles((await storybookFor(project, system, base, manifest.storybook)).files, prefix)) targets.push({ path: at(file.path), source: file.source });
  }

  const files: FileOutcome[] = [];
  const nextManifest: Manifest = { base, files: {}, ...(manifest.storybook === undefined ? {} : { storybook: manifest.storybook }) };
  const targetKeys = new Set<string>();
  for (const target of targets) {
    const key = rel(target.path);
    targetKeys.add(key);
    const current = await readIfExists(target.path);
    const nextHash = sha256(target.source);
    const stale = `${target.path}.tesserai-new`;
    if (current === undefined) {
      await mkdir(dirname(target.path), { recursive: true });
      await writeFile(target.path, target.source, "utf8");
      nextManifest.files[key] = nextHash;
      files.push({ path: key, outcome: "created" });
      continue;
    }
    if (current === target.source) {
      nextManifest.files[key] = nextHash;
      files.push({ path: key, outcome: "unchanged" });
      // The user merged an earlier .tesserai-new (or it is identical now); it has done its job.
      if (await exists(stale)) await rm(stale);
      continue;
    }
    const lines = diffLines(current, target.source);
    const diff = summarizeDiff(lines);
    const recorded = manifest.files[key];
    // A file we did not write (not in the manifest) is the user's just as much as one they edited.
    const locallyModified = recorded === undefined || sha256(current) !== recorded;
    if (locallyModified && !options.force) {
      // Never overwrite a file the user owns; leave the new version beside it to merge.
      await writeFile(stale, target.source, "utf8");
      // Recorded as the version offered: accepted as it is (copied over, or the same change made
      // by hand), the file is ours again and the next sync updates it; still edited, it matches
      // neither and stays theirs. A file we never wrote stays unrecorded.
      if (recorded !== undefined) nextManifest.files[key] = nextHash;
      files.push({ path: key, outcome: "kept", newPath: rel(stale), diff, preview: formatDiff(lines) });
      continue;
    }
    await writeFile(target.path, target.source, "utf8");
    nextManifest.files[key] = nextHash;
    if (await exists(stale)) await rm(stale);
    files.push({ path: key, outcome: locallyModified ? "overwritten" : "updated", diff });
  }

  // Files the manifest tracked that the system no longer produces: removed when untouched, kept otherwise.
  // lib/utils.ts is written once by init and never regenerated, so it is neither a target nor an orphan.
  for (const [key, hash] of Object.entries(manifest.files)) {
    if (targetKeys.has(key)) continue;
    if (key.endsWith("lib/utils.ts")) {
      nextManifest.files[key] = hash;
      continue;
    }
    const path = at(...key.split("/"));
    const current = await readIfExists(path);
    if (current === undefined) continue;
    if (sha256(current) === hash) {
      await rm(path);
      files.push({ path: key, outcome: "removed" });
    } else {
      nextManifest.files[key] = hash;
      files.push({ path: key, outcome: "orphaned" });
    }
  }

  await writeFile(manifestPath, JSON.stringify(nextManifest, null, 2) + "\n", "utf8");
  if (!dry) {
    // Keep a rollback image for every managed file. Metadata is committed last.
    const entries = [...planned].sort(
      ([a], [b]) =>
        Number(a.startsWith(at("tesserai") + sep)) - Number(b.startsWith(at("tesserai") + sep)));
    const before = new Map<string, Buffer | undefined>();
    for (const [path] of entries) {
      await confined(project.dir, path);
      before.set(
        path,
        await readFile(path).catch((e: NodeJS.ErrnoException) => {
          if (e.code === "ENOENT") return undefined;
          throw e;
        }),
      );
    }
    const changed: string[] = [];
    try {
      for (const [path, source] of entries) {
        changed.push(path);
        if (source === null) await fsRm(path, { force: true });
        else {
          await fsMkdir(dirname(path), { recursive: true });
          await fsWriteFile(path, source, "utf8");
        }
      }
    } catch (error) {
      const failures: unknown[] = [];
      for (const path of changed.reverse()) {
        try {
          const old = before.get(path);
          if (old === undefined) await fsRm(path, { force: true });
          else await fsWriteFile(path, old);
        } catch (e) {
          failures.push(e);
        }
      }
      if (failures.length)
        throw new AggregateError(
          [error, ...failures],
          "sync failed and some files could not be restored",
        );
      throw error;
    }
  }
  // After the files, so a failed install leaves the components written and says what to run.
  if (installing && !dry) {
    // shadcn-svelte installs a component's packages as dev dependencies: SvelteKit bundles them.
    const args = [...installArgs(project.packageManager, needed), ...(targetFramework(base) === "svelte" ? ["-D"] : [])];
    log(`installing ${needed.join(", ")} with ${project.packageManager}`);
    try {
      await (options.runInstall ?? runToStderr)(project.packageManager, args, project.dir);
    } catch (e) {
      warnings.push(`couldn't install ${needed.join(" ")} (${e instanceof Error ? e.message : String(e)}); run ${project.packageManager} ${args.join(" ")}`);
      return { project, files, warnings, release, dryRun: dry, breaking, installed: [] };
    }
  }
  return { project, files, warnings, release, dryRun: dry, breaking, installed: installing ? needed : [] };
}

// The package manager's own output goes to stderr, so `sync --json` prints only the result.
function runToStderr(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", 2, 2] });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`))));
  });
}

export function summarizeSync(result: SyncResult, verbose: boolean): string[] {
  const lines: string[] = [];
  const count = (outcome: FileOutcome["outcome"]) => result.files.filter((f) => f.outcome === outcome).length;
  if (result.release !== null) {
    lines.push(`Release ${result.release.number}${result.release.notes === null ? "" : ":"}`);
    if (result.release.notes !== null) lines.push(...result.release.notes.split("\n").map((l) => `  ${l}`), "");
  }
  if (result.breaking.length > 0) {
    lines.push(`${result.dryRun ? "This version would break" : "This version breaks"} code that uses the system:`, ...result.breaking.map((b) => `  ! ${b.text}`), "");
  }
  const would = result.dryRun ? "would be " : "";
  if (result.installed.length > 0) lines.push(`${result.dryRun ? "Would install" : "Installed"} ${result.installed.join(", ")} with ${result.project.packageManager}`);
  lines.push(
    `${result.dryRun ? "Dry run, nothing written: " : ""}${count("updated")} ${would}updated, ${count("created")} ${would}created, ${count("kept")} ${would}kept (yours), ${count("overwritten")} ${would}overwritten, ${count("removed")} ${would}removed, ${count("unchanged")} unchanged`,
  );
  for (const file of result.files) {
    if (file.outcome === "unchanged") continue;
    if (file.outcome === "created") lines.push(`+ ${file.path}`);
    if (file.outcome === "removed") lines.push(`- ${file.path} (no longer generated)`);
    if (file.outcome === "orphaned") lines.push(`? ${file.path} is no longer generated but you changed it; delete it when ready`);
    if (file.outcome === "updated" || file.outcome === "overwritten") {
      lines.push(`~ ${file.path} (+${file.diff.added} -${file.diff.removed}${file.outcome === "overwritten" ? ", overwrote local changes" : ""})`);
    }
    if (file.outcome === "kept") {
      lines.push(result.dryRun ? `! ${file.path} is yours; the new version would go beside it (+${file.diff.added} -${file.diff.removed})` : `! ${file.path} is yours; new version at ${file.newPath} (+${file.diff.added} -${file.diff.removed})`);
      if (verbose) lines.push(file.preview.split("\n").map((l) => `    ${l}`).join("\n"));
    }
  }
  if (count("kept") > 0 && !verbose) lines.push("run with --verbose to see the diffs, or --force to overwrite");
  if (result.dryRun && result.files.some((f) => f.outcome !== "unchanged")) lines.push("run without --dry-run to apply");
  for (const warning of result.warnings) lines.push(`warning: ${warning}`);
  return lines;
}
