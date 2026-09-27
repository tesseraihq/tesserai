import { withProjectLock } from "./project-lock";
import { registerImportTool } from "./mcp-import";
import { findProject } from "./mcp-project";
import { RootsListChangedNotificationSchema } from "@modelcontextprotocol/sdk/types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CheckContrast, Explain, GetComponent, GetTokens, ListOverrides, runReadTool, systemOutline, Usage } from "@tesserai/core/mcp";
import {
  GUIDELINE_TOPICS,
  guidelineIndex,
  guidelinesFor,
  inYourSystem,
  reviewChange,
  type GuidelineTopic,
  applyChangeset,
  checkContrast,
  COMPONENT_ABOUT,
  componentName,
  diffSystems,
  flattenTokens,
  includedComponents,
  opByName,
  opManifest,
  parseBundle,
  prepareSystem,
  summarizeContrast,
  type DesignSystem,
} from "@tesserai/core";
import { EXAMPLE_PAGES, EXAMPLE_SPECS, exampleSource, exportsOf, formatSource, formatTsx, pagePrinting, prefixFiles, prefixSource, printPage, renderAll, resolveSveltePlaceholders, targetFramework, type SvelteAliases, type GeneratedFile, type Target } from "@tesserai/templates";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { detectProject } from "./detect";
import { Manifest } from "./sync";
import { chooseTarget } from "./target";
import { CLI_VERSION, findStylesheet } from "./init";
import { readPrefix } from "./prefix";
import { scan } from "./scan";
import { readSource, type Fetch } from "./source";
import { summarizeSync, sync } from "./sync";

// `npx @tesserai/cli mcp`: the project's design system for coding agents (Claude Code, Cursor, …). They read
// it, change it through the same validated operations the builder and its AI use, and regenerate
// the components, which keeps anything the developer edited by hand.

type Text = { content: { type: "text"; text: string }[]; isError?: boolean };
const text = (value: unknown, isError = false): Text => ({
  content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
  ...(isError ? { isError: true } : {}),
});

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// Svelte's import aliases under a lib prefix ($lib or #lib).
function svelteLib(lib: string): SvelteAliases {
  return { lib, utils: `${lib}/utils`, ui: `${lib}/components/ui`, hooks: `${lib}/hooks`, components: `${lib}/components` };
}

// locate: the folder wasn't given (no --dir), so the project is found from the editor's open
// folders when the first tool is called (mcp-project.ts).
export function createMcpServer(start: string, options: { fetch?: Fetch; freshnessMs?: number; requestTimeoutMs?: number; locate?: boolean } = {}): McpServer {
  let dir = start;
  let bundlePath = join(dir, "tesserai", "design-system.json");
  let sourcePath = join(dir, "tesserai", "source.json");
  const fetchImpl = options.fetch ?? fetch;
  const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
  let writes: Promise<unknown> = Promise.resolve();
  const write = <T>(work: () => Promise<T>, signal: AbortSignal) => {
    const next = writes.then(() => {
      if (signal.aborted) throw new Error("Request cancelled before any changes were written.");
      return withProjectLock(dir, work);
    });
    writes = next.catch(() => {});
    return next;
  };

  // Whether the design in tesserai has moved on since this project last synced, so an agent about
  // to build UI syncs first and uses the components as they are now, not as they were.
  async function checkFreshness(local: DesignSystem, link: string): Promise<string> {
    try {
      const remote = (await readSource(link, fetchImpl, { timeoutMs: options.requestTimeoutMs ?? 5_000 })).system;
      const normal = (s: DesignSystem) => prepareSystem(s).system;
      const diff = diffSystems(normal(local), normal(remote));
      const settings = diff.other.filter((key) => !["name", "base", "framework", "prefix"].includes(key));
      const names = new Set(Object.keys(local.components).concat(Object.keys(remote.components)));
      const touched = new Set(diff.components);
      for (const t of diff.tokens) if (names.has(t.path.split(".")[0]!)) touched.add(t.path.split(".")[0]!);
      const foundation = diff.tokens.filter((t) => !names.has(t.path.split(".")[0]!)).length;
      // The name, the library and a class prefix are the project's own business (it may install on
      // another library than the system names); only the design counts.
      if (touched.size === 0 && foundation === 0 && diff.intents.length === 0 && settings.length === 0 && diff.generators.length === 0) return `Up to date with ${link}.`;
      const what = [
        touched.size === 0 ? null : [...touched].map(componentName).join(", "),
        foundation === 0 ? null : `${foundation} foundation token${foundation === 1 ? "" : "s"} (colors, type, spacing, radius…)`,
        diff.intents.length === 0 ? null : `meanings ${diff.intents.join(", ")}`,
        settings.length === 0 ? null : `settings ${settings.join(", ")}`,
      ].filter(Boolean);
      return `The design changed in tesserai since this project last synced: ${(what.length === 0 ? "system settings" : what.join("; "))}. Call sync before building or changing UI, so new code uses the components as they are now.`;
    } catch (e) {
      return `Couldn't check ${link} for changes (${e instanceof Error ? e.message : String(e)}); call sync when it's reachable.`;
    }
  }

  let fresh: { key: string; at: number; value: string | undefined; pending: Promise<string> } | undefined;
  async function freshness(local: DesignSystem, refresh = false): Promise<string> {
    let source: string;
    try { source = await readFile(sourcePath, "utf8"); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return "This project was installed from a file, so changes made in the tesserai builder reach it only through a new bundle: npx @tesserai/cli sync <bundle or link>.";
    }
    const link = (JSON.parse(source) as { link?: string }).link;
    if (typeof link !== "string") return "tesserai/source.json needs a link; run npx @tesserai/cli sync <bundle or link> to repair it.";
    const key = source + JSON.stringify(local);
    if (fresh?.key !== key || (fresh.value !== undefined && (refresh || Date.now() - fresh.at >= (options.freshnessMs ?? 30_000)))) {
      const entry = { key, at: Date.now(), pending: checkFreshness(local, link), value: undefined as string | undefined };
      fresh = entry;
      void entry.pending.then((value) => { entry.value = value; entry.at = Date.now(); });
    }
    if (refresh) return fresh.pending;
    return fresh.value === undefined ? "Checking for updates in the background. This outline describes the local system. Call outline with refresh: true to wait for a remote check before relying on freshness." : `${fresh.value} (Checked ${Math.floor((Date.now() - fresh.at) / 1000)}s ago; cached for up to 30s.)`;
  }

  // What this project's components were installed as (its framework and library): the manifest
  // says; before an install, what init would choose.
  const projectTarget = async (system: DesignSystem): Promise<Target> => {
    try {
      return Manifest.parse(JSON.parse(await readFile(join(dir, "tesserai", "manifest.json"), "utf8"))).base;
    } catch {
      try {
        return chooseTarget(await detectProject(dir), system).target;
      } catch {
        return system.base;
      }
    }
  };
  // The components as generated for this project (its framework and library), for examples.
  let generatedFor: { key: string; files: Promise<GeneratedFile[]> } | null = null;
  const generated = (system: DesignSystem, target: Target) => {
    const key = `${target}:${JSON.stringify(system)}`;
    if (generatedFor?.key !== key) generatedFor = { key, files: renderAll(target, system, { format: false }) };
    return generatedFor.files;
  };
  const projectPrefix = async () => readPrefix(dir, await findStylesheet(await detectProject(dir)));
  // Code as it would be written in this project: formatted for its kind of file, with its class prefix.
  // As AGENTS.md says it: $lib (or #lib) — which init asks a project without the alias to add.
  const svelteLibOf = async () => (await detectProject(dir)).libPrefix ?? "$lib";
  const asWritten = async (source: string, target: Target) => {
    const prefix = await projectPrefix();
    if (targetFramework(target) === "react") {
      const formatted = await formatTsx(source).catch(() => source);
      return prefix === undefined ? formatted : prefixSource(formatted, prefix);
    }
    const svelte = targetFramework(target) === "svelte";
    const path = `example.${svelte ? "svelte" : "vue"}`;
    // Svelte's import placeholders as this project writes them: $lib or #lib.
    const resolved = svelte ? resolveSveltePlaceholders(source, svelteLib(await svelteLibOf())) : source;
    const formatted = await formatSource(path, resolved).catch(() => resolved);
    return (await prefixFiles([{ path, source: formatted }], prefix))[0]!.source;
  };
  let snapshot: { raw: string; system: DesignSystem } | undefined;
  async function load(): Promise<DesignSystem | string> {
    try {
      // Read bytes each time: external editors and rapid same-size writes invalidate reliably.
      const raw = await readFile(bundlePath, "utf8");
      if (snapshot?.raw === raw) return snapshot.system;
      const parsed = parseBundle(JSON.parse(raw));
      if (!parsed.ok) return `tesserai/design-system.json isn't a valid design system: ${parsed.problem}`;
      snapshot = { raw, system: parsed.system };
      return parsed.system;
    } catch (error) {
      return (error as NodeJS.ErrnoException).code === "ENOENT"
        ? `There's no tesserai/design-system.json in ${dir}. Install a design system first: npx @tesserai/cli init <bundle or link>. If the project is elsewhere, start the server with --dir <project folder>.`
        : `Couldn't read tesserai/design-system.json: ${error instanceof Error ? error.message : String(error)}. Fix the file and retry; restarting MCP isn't needed.`;
    }
  }

  const server = new McpServer(
    { name: "tesserai", version: CLI_VERSION },
    {
      instructions:
        "This project's UI components are generated from a tesserai design system (tesserai/design-system.json). Start with outline for fast local context. Remote freshness is cached and checked in the background; call outline with refresh: true to wait for an up-to-date remote check; if the design changed, call sync before building or changing UI. Build UI from the components in components/ui (component_guide gives each one's import, props and an example; example_page gives whole forms and pages written with them), never hand-styled elements. To change how components look (colors, type, spacing, radius, a variant's style), change the design system (apply_changes, or the tesserai builder for a project that follows a link) rather than editing the generated files: those edits are kept, but they drift from the system. list_operations shows what can be changed. For how a design system should do something, read guidelines; apply_changes says which guidelines a change runs into, so pass those on to the developer. A project that already has a design system of its own (and no tesserai/design-system.json yet) can bring its look in with import_design_system.",
    },
  );

  // Every tool works on the project, so it's found before any of them runs.
  if (options.locate === true) {
    let located: Promise<void> | null = null;
    const locate = () =>
      (located ??= (async () => {
        const canList = server.server.getClientCapabilities()?.roots !== undefined;
        dir = await findProject(start, canList ? () => server.server.listRoots() : null);
        bundlePath = join(dir, "tesserai", "design-system.json");
        sourcePath = join(dir, "tesserai", "source.json");
        snapshot = undefined;
      })());
    server.server.setNotificationHandler(RootsListChangedNotificationSchema, () => {
      located = null;
    });
    const register = server.registerTool.bind(server) as (name: string, config: unknown, handler: (...args: unknown[]) => unknown) => unknown;
    (server as unknown as { registerTool: typeof register }).registerTool = (name, config, handler) =>
      register(name, config, async (...args: unknown[]) => {
        await locate();
        return handler(...args);
      });
  }

  // Bringing a project's existing look in (mcp-import.ts).
  registerImportTool(server, () => dir);

  server.registerTool(
    "outline",
    { title: "Design system outline", inputSchema: { refresh: z.boolean().optional().describe("Wait for a fresh remote check (up to 5s). Omit for immediate local context and background freshness.") }, annotations: { ...readOnly, openWorldHint: true }, description: "A compact outline of the design system: palettes, meanings (intents), surfaces, type, spacing, radius, and every component with its parts and options." },
    async ({ refresh }) => {
      const system = await load();
      if (typeof system === "string") return text(system, true);
      // Code an agent writes has to use the project's class prefix, or its classes do nothing.
      const prefix = await projectPrefix();
      const classes = prefix === undefined ? "" : `\n\nEvery Tailwind class in this project takes the ${prefix}: prefix, before any variant: ${prefix}:bg-primary-solid, ${prefix}:hover:bg-primary-solid-hover, ${prefix}:md:flex. Unprefixed classes do nothing.`;
      return text(`${await freshness(system, refresh)}\n\n${systemOutline(system)}${classes}`);
    },
  );

  const reads: [string, string, string, z.ZodObject][] = [
    ["get_tokens", "Get tokens", "Read the tokens under a path prefix: values, per-mode values, and whether they were set by hand.", GetTokens],
    ["get_component", "Get a component", "Read one component's full definition: parts, axes, and every recipe layer.", GetComponent],
    ["explain", "Explain a token", "Follow a token's references to its final value, in light or dark.", Explain],
    ["usage", "Token usage", "What depends on a token: the tokens that reference it and the components it styles.", Usage],
    ["check_contrast", "Check contrast", "Run the contrast checks and list failing pairs with suggested fixes.", CheckContrast],
    ["list_overrides", "List overrides", "What has been customised compared with tesserai's defaults.", ListOverrides],
  ];
  for (const [name, title, description, schema] of reads) {
    server.registerTool(name, { title, description, inputSchema: schema.shape, annotations: readOnly }, async (input) => {
      const system = await load();
      if (typeof system === "string") return text(system, true);
      const result = runReadTool(system, name, input);
      return result.ok ? text(result.data) : text(result.error, true);
    });
  }

  server.registerTool(
    "guidelines",
    {
      title: "Design guidelines",
      annotations: readOnly,
      description:
        "Design guidelines on a topic (WCAG, Apple, Material and settled practice, with sources): the rule, why it matters, where it comes from. Read it before answering how a design system should do something, or making a change a guideline speaks to.",
      inputSchema: { topic: z.enum(Object.keys(GUIDELINE_TOPICS) as [GuidelineTopic, ...GuidelineTopic[]]).describe(guidelineIndex()) },
    },
    async ({ topic }) => {
      const system = await load();
      // With the project's own numbers beside each, where there's something to measure.
      return text(guidelinesFor(topic).map((g) => {
        const yours = typeof system === "string" ? undefined : inYourSystem(g.id, system);
        return yours === undefined ? g : { ...g, inThisProject: yours };
      }));
    },
  );

  server.registerTool(
    "list_operations",
    {
      title: "List operations",
      annotations: readOnly,
      description: "Every operation apply_changes accepts, by group, with what it does. describe_operation gives one operation's exact input.",
      inputSchema: { group: z.string().optional().describe("Only this group, e.g. palette, intent, type, component") },
    },
    async ({ group }) => {
      const ops = opManifest().filter((op) => group === undefined || op.group === group);
      return text(ops.map((op) => ({ name: op.name, group: op.group, summary: op.summary })));
    },
  );

  server.registerTool(
    "describe_operation",
    {
      title: "Describe an operation",
      annotations: readOnly, description: "One operation's input, as JSON Schema.", inputSchema: { name: z.string() } },
    async ({ name }) => {
      const op = opManifest().find((o) => o.name === name);
      return op === undefined ? text(`There's no operation "${name}". list_operations shows them all.`, true) : text(op);
    },
  );

  server.registerTool(
    "apply_changes",
    {
      title: "Apply changes",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
      description:
        "Change the design system with operations, applied in order, all or nothing, and checked before anything is written. Then the theme CSS and components are regenerated; files the developer edited are kept and the new version is written beside them. With preview: true, nothing is written and the result says what would change.",
      inputSchema: {
        summary: z.string().optional().describe("One sentence saying what the change does"),
        ops: z.array(z.object({ op: z.string(), input: z.unknown() })).min(1),
        preview: z.boolean().optional(),
      },
    },
    async ({ summary, ops, preview }, extra) => write(async () => {
      if (await exists(sourcePath)) {
        const link = (JSON.parse(await readFile(sourcePath, "utf8")) as { link?: string }).link;
        return text(
          `This project follows ${link ?? "a tesserai link"}, so npx @tesserai/cli sync would replace local changes. Change the system in the tesserai builder, then run npx @tesserai/cli sync. (To own the system here instead, delete tesserai/source.json.)`,
          true,
        );
      }
      const system = await load();
      if (typeof system === "string") return text(system, true);
      for (const call of ops) if (opByName(call.op) === undefined) return text(`There's no operation "${call.op}". list_operations shows them all.`, true);
      const result = applyChangeset(system, { ops: ops.map((o) => ({ op: o.op, input: o.input })), ...(summary === undefined ? {} : { summary }) });
      if (!result.ok) return text(`Nothing was changed: ${result.error}`, true);
      const diff = diffSystems(system, result.system);
      const contrast = summarizeContrast(checkContrast(includedComponents(result.system), flattenTokens(result.system.tokens)));
      // What the change runs into against the design guidelines, as the builder's AI is told.
      const guidelines = reviewChange(system, result.system).map(({ level, title, detail, recommend, sources }) => ({ level, title, detail, recommend, source: sources[0]?.name }));
      const report = {
        applied: result.applied.map((a) => a.description),
        tokensChanged: diff.tokens.length,
        componentsChanged: diff.components,
        contrast,
        ...(guidelines.length === 0 ? {} : { guidelines }),
      };
      if (preview === true) return text({ preview: true, ...report });
      if (extra.signal.aborted) return text("Request cancelled before any changes were written.", true);
      const synced = await sync({ dir, force: false, system: result.system });
      fresh = undefined;
      return text({ ...report, files: summarizeSync(synced, false) });
    }, extra.signal),
  );

  server.registerTool(
    "scan",
    {
      title: "Scan the project",
      annotations: readOnly,
      description:
        "How the app uses the design system: each component's uses and files, most used first, with each option's uses (a use without it counts for the default); components never used; options no use sets; overrides (className, class, style or sx restyling a component, by what they change; placement isn't counted); suggestions where the same override repeats; generated files edited by hand; and hard-coded colors and sizes with the token to use. Act on it: a suggestion is a change to propose to the system (a variant, a size, the component's corners), not to the app; confirm with the person before removing options or components.",
    },
    async () => {
      const system = await load();
      if (typeof system === "string") return text(system, true);
      const result = await scan(dir, system);
      // Enough of each list to act on, with the totals, so a large app doesn't flood the context.
      return text({
        ...result,
        overrides: result.overrides.map((o) => ({ ...o, sites: o.sites.slice(0, 20), sitesTotal: o.sites.length })),
        hardCoded: result.hardCoded.slice(0, 200),
        hardCodedTotal: result.hardCoded.length,
      });
    },
  );

  // Its own tool, not an option of scan: it changes what the account holds, so a client asks first.
  server.registerTool(
    "upload_scan",
    {
      title: "Upload a scan",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
      description:
        "Scan the app and keep the result with its design system in the builder (Pro), where the team sees usage beside the system and how it changes over time. Sends counts, kinds and class names only: no source, no paths but edited generated files. Needs the project to follow its system's account link and a CLI login. Only when the person asks.",
    },
    async () => {
      const system = await load();
      if (typeof system === "string") return text(system, true);
      const { uploadScan } = await import("./scan-upload");
      try {
        const done = await uploadScan({ dir, result: await scan(dir, system), fetch: fetchImpl });
        return text(`Kept with the system as "${done.project}". It shows under Usage in the builder: ${done.url}`);
      } catch (e) {
        return text(`Not kept: ${(e as Error).message}`, true);
      }
    },
  );

  server.registerTool(
    "sync",
    {
      title: "Sync the design system",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
      inputSchema: { dryRun: z.boolean().optional().describe("Show the planned file changes without writing.") },
      description:
        "Bring the project up to date with its design system: for a project that follows a tesserai link, pull the latest version first (the latest release of a private system); then regenerate the theme CSS and components. Files the developer edited are kept; the new version goes beside them. Call it before building UI when outline says the design changed.",
    },
    async ({ dryRun }, extra) => write(async () => {
      if (!(await exists(bundlePath))) return text(`There's no tesserai/design-system.json in ${dir}. Install a system with npx @tesserai/cli init first.`, true);
      const result = await sync({ dir, force: false, fetch: fetchImpl, ...(dryRun === undefined ? {} : { dryRun }) });
      if (!dryRun) fresh = undefined;
      return text(summarizeSync(result, false).join("\n"));
    }, extra.signal),
  );

  server.registerTool(
    "component_guide",
    {
      title: "Component guide",
      annotations: readOnly,
      description:
        "How to build with the system's components. Without a component: each one with what it's for and its import. With one: its import, its props and their allowed values, and an example written for this project (its library and class prefix). Use it before writing UI, so new code uses the components rather than hand-styled elements.",
      inputSchema: { component: z.string().optional().describe("A component id, e.g. button, field, select") },
    },
    async ({ component }) => {
      const system = await load();
      if (typeof system === "string") return text(system, true);
      const target = await projectTarget(system);
      const files = await generated(system, target);
      const exports = exportsOf(files);
      // Svelte's barrels also export short names (Root, Trigger); the full ones start with the component's.
      const full = (name: string, n: string) => targetFramework(target) !== "svelte" || n.startsWith(name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(""));
      const sveltePrefix = targetFramework(target) === "svelte" ? await svelteLibOf() : undefined;
      const lines = new Map(Object.keys(includedComponents(system)).map((name) => [name, sveltePrefix === undefined ? `@/components/ui/${name}` : `${sveltePrefix}/components/ui/${name}/index.js`]));
      const importLine = (name: string) => {
        const names = [...(exports.get(name) ?? [])].filter((n) => /^[A-Z]/.test(n) && !/Variants?$|Props$/.test(n) && full(name, n));
        return names.length === 0 ? null : `import { ${names.join(", ")} } from "${lines.get(name) ?? `@/components/ui/${name}`}";`;
      };
      const included = includedComponents(system);
      if (component === undefined) {
        const lines = Object.keys(included)
          .filter((name) => exports.has(name))
          .sort()
          .map((name) => `- ${name} (${componentName(name)}): ${COMPONENT_ABOUT[name] ?? ""}\n  ${importLine(name) ?? ""}`);
        return text(`Components in this system (component_guide with a component gives its props and an example):\n${lines.join("\n")}`);
      }
      const anatomy = included[component];
      if (anatomy === undefined) {
        const known = system.components[component] !== undefined;
        return text(known ? `${componentName(component)} is left out of this system; it can be included in the tesserai builder (or with apply_changes).` : `There's no component "${component}". component_guide without one lists them.`, true);
      }
      const axes = (["variant", "intent", "size"] as const).flatMap((axis) => {
        const a = anatomy.axes[axis];
        return a === undefined ? [] : [`- ${axis}: ${a.enabled.map((v) => `"${v}"`).join(" | ")}${a.default === undefined ? "" : ` (default "${a.default}")`}`];
      });
      const printing = pagePrinting(target);
      const example = printing === null ? null : exampleSource(system, files, component, printing.printer);
      return text(
        [
          `${componentName(component)}: ${COMPONENT_ABOUT[component] ?? ""}`,
          importLine(component) ?? `(${target} has no ${componentName(component)})`,
          axes.length === 0 ? "No variant, intent or size props." : `Props:\n${axes.join("\n")}`,
          example === null ? (printing === null ? "Examples in this project's framework are coming; the import and props above are right for it." : null) : `Example, as written for this project:\n\n${await asWritten(example, target)}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
      );
    },
  );

  server.registerTool(
    "example_page",
    {
      title: "Example page",
      annotations: readOnly,
      description: `A whole page written with this system's components, for this project (its library and class prefix): a pattern to follow when building similar UI. Pages: ${EXAMPLE_PAGES.join(", ")} (sign-in and settings are forms).`,
      inputSchema: { page: z.enum(EXAMPLE_PAGES) },
    },
    async ({ page }) => {
      const system = await load();
      if (typeof system === "string") return text(system, true);
      const target = await projectTarget(system);
      const printing = pagePrinting(target);
      if (printing === null) return text(`Example pages in this project's framework are coming. component_guide gives each component's import and props for it now.`, true);
      const printed = printPage(EXAMPLE_SPECS[page](), system, await generated(system, target), page, printing.printer === undefined ? {} : { printer: printing.printer });
      if (printed.source === "") return text(`The ${page} page couldn't be written: ${printed.problems.join("; ")}`, true);
      const missing = printed.missing.length === 0 ? "" : `\n\n(This system leaves out ${printed.missing.map(componentName).join(", ")}, so those parts are drawn with plain elements.)`;
      return text(`${await asWritten(printed.source, target)}${missing}`);
    },
  );

  return server;
}
