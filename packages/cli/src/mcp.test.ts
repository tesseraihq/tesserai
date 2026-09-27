import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ListRootsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { applyChangeset, PRESETS, type DesignSystem } from "@tesserai/core";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { init } from "./init";
import { createMcpServer } from "./mcp";
import { findProject } from "./mcp-project";
import type { Fetch } from "./source";

let dir: string;
let project: string;
let client: Client | undefined;

async function connect(fetch?: Fetch) {
  if (client !== undefined) await client.close();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await createMcpServer(project, fetch === undefined ? {} : { fetch }).connect(serverTransport);
  client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(clientTransport);
}

async function call(name: string, args: Record<string, unknown> = {}) {
  const result = (await client!.callTool({ name, arguments: args })) as { content: { text: string }[]; isError?: boolean };
  return { text: result.content[0]!.text, isError: result.isError === true };
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "tesserai-mcp-"));
  project = join(dir, "app");
  await mkdir(join(project, "src"), { recursive: true });
  await writeFile(join(project, "package.json"), JSON.stringify({ devDependencies: { vite: "^8", tailwindcss: "^4" } }));
  await writeFile(join(project, "tsconfig.json"), JSON.stringify({ compilerOptions: { paths: { "@/*": ["./src/*"] } } }));
  const bundle = join(dir, "acme.tesserai.json");
  await writeFile(bundle, JSON.stringify(PRESETS[0]!.build()));
  await init({ bundlePath: bundle, dir: project, base: "base-ui", install: false });
  await connect();
});

afterEach(async () => {
  await client?.close();
  client = undefined;
  await rm(dir, { recursive: true, force: true });
});

describe("tesserai mcp", () => {
  it("offers the design system's tools", async () => {
    const { tools } = await client!.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(
      ["apply_changes", "check_contrast", "component_guide", "describe_operation", "example_page", "explain", "get_component", "get_tokens", "guidelines", "import_design_system", "list_operations", "list_overrides", "outline", "scan", "sync", "upload_scan", "usage"].sort(),
    );
    const outline = (await call("outline", { refresh: true })).text;
    expect(outline).toMatch(/^This project was installed from a file/);
    expect(outline).toContain('\n\nSystem "');
    expect(JSON.parse((await call("get_component", { component: "button" })).text).name).toBe("button");
    expect(JSON.parse((await call("list_operations", { group: "shape" })).text)).toContainEqual(expect.objectContaining({ name: "radius.set" }));
  });

  it("previews, then applies a change and regenerates the components", async () => {
    const ops = [{ op: "radius.set", input: { base: 14 } }];
    const preview = JSON.parse((await call("apply_changes", { ops, preview: true })).text);
    expect(preview).toMatchObject({ preview: true, applied: ["Medium radius 14px"] });
    const before = await readFile(join(project, "src", "tesserai.css"), "utf8");
    const applied = JSON.parse((await call("apply_changes", { summary: "Rounder", ops })).text);
    expect(applied.files[0]).toMatch(/updated/);
    const saved = JSON.parse(await readFile(join(project, "tesserai", "design-system.json"), "utf8"));
    expect(saved.generators.radius.config.base).toBe(14);
    expect(await readFile(join(project, "src", "tesserai.css"), "utf8")).not.toBe(before);
  });

  // A coding agent hears what the builder's AI hears: the guidelines, and what a change runs into.
  it("serves the design guidelines, and says what a change runs into", async () => {
    const targets = JSON.parse((await call("guidelines", { topic: "targets" })).text) as { id: string; sources: { name: string }[] }[];
    expect(targets.map((g) => g.id)).toContain("targets-minimum");
    expect(targets[0]!.sources[0]!.name).toMatch(/WCAG/);
    const small = JSON.parse((await call("apply_changes", { ops: [{ op: "token.set", input: { path: "button.height.sm", value: "20px" } }], preview: true })).text);
    expect(small.guidelines[0]).toMatchObject({ level: "must", title: "Targets at least 24×24px", source: expect.stringMatching(/WCAG 2\.2/) });
  });

  it("refuses changes that don't hold, or that a followed link would undo", async () => {
    const bad = await call("apply_changes", { ops: [{ op: "radius.set", input: { base: 99 } }] });
    expect(bad).toMatchObject({ isError: true, text: expect.stringMatching(/^Nothing was changed/) });
    expect((await call("apply_changes", { ops: [{ op: "nope", input: {} }] })).text).toMatch(/no operation "nope"/);
    await writeFile(join(project, "tesserai", "source.json"), JSON.stringify({ link: "https://tesserai.example/s/AbCdEf123456" }));
    const followed = await call("apply_changes", { ops: [{ op: "radius.set", input: { base: 4 } }] });
    expect(followed).toMatchObject({ isError: true, text: expect.stringMatching(/follows https:\/\/tesserai.example/) });
  });

  it("the agent flow: the button changes in tesserai, the agent sees it, syncs, and builds a form with it", async () => {
    // The project follows a share link; the owner then makes the button taller in the builder.
    const link = "https://tesserai.example/s/AbCdEf123456";
    let served: DesignSystem = PRESETS[0]!.build();
    const fakeFetch: Fetch = async (url) =>
      url.endsWith("/releases/latest") ? { ok: false, status: 404, json: async () => ({}) } : { ok: true, status: 200, json: async () => ({ name: served.name, body: served }) };
    await rm(project, { recursive: true, force: true });
    await mkdir(join(project, "src"), { recursive: true });
    await writeFile(join(project, "package.json"), JSON.stringify({ devDependencies: { vite: "^8", tailwindcss: "^4" } }));
    await writeFile(join(project, "tsconfig.json"), JSON.stringify({ compilerOptions: { paths: { "@/*": ["./src/*"] } } }));
    await writeFile(join(project, "src/index.css"), '@import "tailwindcss" prefix(acme);\n');
    await init({ bundlePath: link, dir: project, base: "radix", install: false, lint: false, fetch: fakeFetch });
    await connect(fakeFetch);
    expect((await call("outline", { refresh: true })).text).toMatch(new RegExp(`^Up to date with ${link}`));

    const changed = applyChangeset(served, { ops: [{ op: "component.setStyle", input: { component: "button", part: "root", scope: { kind: "all" }, property: "radius", value: "{radius.full}" } }] });
    if (!changed.ok) throw new Error(changed.error);
    served = changed.system;
    const before = await readFile(join(project, "src/components/ui/button.tsx"), "utf8");
    const outline = (await call("outline", { refresh: true })).text;
    expect(outline).toMatch(/^The design changed in tesserai since this project last synced: Button\. Call sync before building/);
    expect(outline).toContain("takes the acme: prefix");

    // sync pulls it and regenerates the button.
    const synced = (await call("sync")).text;
    expect(synced).toMatch(/components\/ui\/button\.tsx/);
    expect(await readFile(join(project, "src/components/ui/button.tsx"), "utf8")).not.toBe(before);
    expect((await call("outline", { refresh: true })).text).toMatch(/^Up to date/);

    // What the agent reads to write a form: the components, with imports, props and examples as
    // this project writes them (Radix, acme:), and a whole form to follow.
    const list = (await call("component_guide")).text;
    expect(list).toContain('- button (Button): ');
    expect(list).toContain('import { Button } from "@/components/ui/button";');
    const button = (await call("component_guide", { component: "button" })).text;
    expect(button).toMatch(/Props:\n- variant: "solid" \| /);
    expect(button).toContain("Example, as written for this project:");
    expect(button).toContain("<Button>Save changes</Button>");
    expect((await call("component_guide", { component: "nope" })).isError).toBe(true);
    const form = (await call("example_page", { page: "sign-in" })).text;
    expect(form).toContain('from "@/components/ui/button"');
    expect(form).toContain('from "@/components/ui/input"');
    expect(form).toMatch(/acme:/);
    expect(form).not.toMatch(/className="(?!acme:)[a-z]/);
  });
});

describe("the MCP server in a Svelte project", () => {
  it("gives imports and examples as the project writes them: $lib, never shadcn-svelte's placeholders", async () => {
    const env = process.env["TESSERAI_FRAMEWORKS"];
    process.env["TESSERAI_FRAMEWORKS"] = "svelte";
    try {
      const svelte = join(dir, "kit");
      await mkdir(join(svelte, "src/routes"), { recursive: true });
      await writeFile(join(svelte, "package.json"), JSON.stringify({ devDependencies: { "@sveltejs/kit": "^2", svelte: "^5", tailwindcss: "^4" } }));
      await writeFile(join(svelte, "src/routes/layout.css"), '@import "tailwindcss";\n');
      await init({ bundlePath: join(dir, "acme.tesserai.json"), dir: svelte, install: false });
      project = svelte;
      await connect();
      const guide = await call("component_guide", { component: "button" });
      expect(guide.text).toMatch(/import \{ Button \} from "\$lib\/components\/ui\/button\/index\.js";/);
      expect(guide.text).not.toContain("Root");
      expect(guide.text).not.toMatch(/import \* as React|from "react"/);
      expect(guide.text).toContain("Example, as written for this project");
      const page = await call("example_page", { page: "settings" });
      for (const text of [guide.text, page.text]) {
        expect(text).not.toMatch(/\$(UI|UTILS|LIB|HOOKS|COMPONENTS)\$/);
        expect(text).toMatch(/from "\$lib\/components\/ui\/[a-z-]+\/index\.js"/);
      }
    } finally {
      if (env === undefined) delete process.env["TESSERAI_FRAMEWORKS"];
      else process.env["TESSERAI_FRAMEWORKS"] = env;
    }
  });
});


describe("responsive, safe MCP requests", () => {
  it("serves the local outline while a single background freshness request is pending", async () => {
    await writeFile(join(project, "tesserai/source.json"), JSON.stringify({ link: "https://tesserai.example/s/AbCdEf123456" }));
    let requests = 0;
    let finish!: (value: { ok: boolean; status: number; json(): Promise<unknown> }) => void;
    await connect(async () => { requests++; return requests === 1 ? new Promise((resolve) => { finish = resolve; }) : { ok: true, status: 200, json: async () => ({ number: 1, body: PRESETS[0]!.build() }) }; });
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("outline waited for the network")), 300));
    const result = await Promise.race([call("outline"), timeout]);
    expect(result.text).toContain("Checking for updates in the background");
    expect(result.text).toContain('System "');
    await call("outline");
    expect(requests).toBe(1);
    finish({ ok: true, status: 200, json: async () => ({ number: 1, body: PRESETS[0]!.build() }) });
    expect((await call("outline", { refresh: true })).text).toMatch(/^Up to date/);
    const afterRefresh = requests;
    await call("outline");
    expect(requests).toBe(afterRefresh);
  });

  it("declares read-only tools separately from filesystem mutations", async () => {
    const { tools } = await client!.listTools();
    for (const tool of tools) {
      expect(tool.annotations?.readOnlyHint).toBe(!["apply_changes", "import_design_system", "sync", "upload_scan"].includes(tool.name));
    }
  });

  // Directories (Claude's among them) list each tool by its title, and refuse a server whose tools
  // lack one or don't say whether they change anything.
  it("gives every tool a title and says whether it's read-only or destructive", async () => {
    const { tools } = await client!.listTools();
    for (const tool of tools) {
      expect(tool.title, tool.name).toMatch(/^[A-Z][a-z]/);
      expect(tool.annotations?.readOnlyHint === true || typeof tool.annotations?.destructiveHint === "boolean", tool.name).toBe(true);
    }
  });

  it("does not lose one of two concurrent changes", async () => {
    const results = await Promise.all([
      call("apply_changes", { ops: [{ op: "radius.set", input: { base: 14 } }] }),
      call("apply_changes", { ops: [{ op: "spacing.set", input: { base: 7 } }] }),
    ]);
    expect(results.every((r) => !r.isError)).toBe(true);
    const saved = JSON.parse(await readFile(join(project, "tesserai/design-system.json"), "utf8"));
    expect(saved.generators.radius.config.base).toBe(14);
    expect(saved.generators.space.config.base).toBe(7);
  });

  it("re-reads external bundle edits and recovers after invalid JSON", async () => {
    await call("outline");
    const path = join(project, "tesserai/design-system.json");
    const saved = JSON.parse(await readFile(path, "utf8"));
    await writeFile(path, "{");
    expect((await call("outline")).isError).toBe(true);
    saved.name = "Edited outside MCP";
    await writeFile(path, JSON.stringify(saved));
    expect((await call("outline")).text).toContain("Edited outside MCP");
  });

  it("supports sync previews without modifying project files", async () => {
    const before = await readFile(join(project, "tesserai/manifest.json"), "utf8");
    const result = await call("sync", { dryRun: true });
    expect(result.isError).toBe(false);
    expect(result.text).toMatch(/dry run|nothing.*written/i);
    expect(await readFile(join(project, "tesserai/manifest.json"), "utf8")).toBe(before);
  });
});

// Installed from a directory or a one-click link, the server can start outside the project
// (mcp-project.ts). The editor lists its open folders as roots; the project is found from them.
describe("tesserai mcp without --dir", () => {
  const elsewhere = () => mkdtemp(join(tmpdir(), "tesserai-elsewhere-"));
  const url = (path: string) => pathToFileURL(path).href;

  async function connectFrom(start: string, roots: string[] | null, locate = true) {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await createMcpServer(start, { locate }).connect(serverTransport);
    const listed = { roots };
    const c = new Client({ name: "editor", version: "1.0.0" }, roots === null ? {} : { capabilities: { roots: { listChanged: true } } });
    if (roots !== null) c.setRequestHandler(ListRootsRequestSchema, async () => ({ roots: (listed.roots ?? []).map((path) => ({ uri: url(path), name: basename(path) })) }));
    await c.connect(clientTransport);
    const outline = async () => ((await c.callTool({ name: "outline", arguments: {} })) as { content: { text: string }[] }).content[0]!.text;
    return { c, outline, listed };
  }

  it("serves the project the editor has open when started somewhere else", async () => {
    const home = await elsewhere();
    const { c, outline } = await connectFrom(home, [project]);
    expect(await outline()).toMatch(/palettes|Palettes/);
    await c.close();
  });

  it("picks the open folder that holds a system, not just the first", async () => {
    const home = await elsewhere();
    const other = await elsewhere();
    const { c, outline } = await connectFrom(home, [other, project]);
    expect(await outline()).toMatch(/palettes|Palettes/);
    await c.close();
  });

  it("keeps the folder it was started in when it's the project, and never overrides --dir", async () => {
    const other = await elsewhere();
    const inside = await connectFrom(project, [other]);
    expect(await inside.outline()).toMatch(/palettes|Palettes/);
    await inside.c.close();
    const given = await connectFrom(other, [project], false);
    expect(await given.outline()).toContain(`There's no tesserai/design-system.json in ${other}`);
    await given.c.close();
  });

  it("says where it looked when the editor lists no roots", async () => {
    const home = await elsewhere();
    const { c, outline } = await connectFrom(home, null);
    expect(await outline()).toContain(`There's no tesserai/design-system.json in ${home}`);
    await c.close();
  });

  it("looks again after the editor's folders change", async () => {
    const home = await elsewhere();
    const other = await elsewhere();
    const { c, outline, listed } = await connectFrom(home, [other]);
    expect(await outline()).toContain(`There's no tesserai/design-system.json in ${other}`);
    listed.roots = [project];
    await c.sendRootsListChanged();
    await new Promise((done) => setTimeout(done, 20));
    expect(await outline()).toMatch(/palettes|Palettes/);
    await c.close();
  });

  it("gives up on an editor that never answers, and skips roots that aren't local folders", async () => {
    const home = await elsewhere();
    expect(await findProject(home, () => new Promise(() => {}), 50)).toBe(home);
    expect(await findProject(home, async () => ({ roots: [{ uri: "vscode-remote://ssh/app" }, { uri: url(project) }] }))).toBe(project);
  });
});
