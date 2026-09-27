import { dependenciesFor } from "@tesserai/templates";
import { PRESETS } from "@tesserai/core";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { init, summarize, withScripts } from "./init";

let dir: string;
let bundle: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "tesserai-init-"));
  bundle = join(dir, "acme.tesserai.json");
  await writeFile(bundle, JSON.stringify(PRESETS[0]!.build()));
});

afterEach(() => rm(dir, { recursive: true, force: true }));

async function viteProject(): Promise<string> {
  const project = join(dir, "app");
  await mkdir(join(project, "src"), { recursive: true });
  await writeFile(
    join(project, "package.json"),
    JSON.stringify({ name: "app", dependencies: { react: "^19", clsx: "^2" }, devDependencies: { vite: "^8", tailwindcss: "^4.3.0" } }),
  );
  await writeFile(join(project, "tsconfig.json"), JSON.stringify({ compilerOptions: { paths: { "@/*": ["./src/*"] } } }));
  await writeFile(join(project, "pnpm-lock.yaml"), "");
  await writeFile(join(project, "src/index.css"), '@import "tailwindcss";\n');
  return project;
}

describe("init", () => {
  it("writes css, components, bundle copy, manifest and AGENTS.md into src/", async () => {
    const project = await viteProject();
    const result = await init({ bundlePath: bundle, dir: project, base: "base-ui", install: false });

    expect(result.project.packageManager).toBe("pnpm");
    expect(result.project.framework).toBe("vite");
    expect(result.project.tailwind).toBe("4");
    expect(result.written.slice(0, 4)).toEqual([
      "tesserai/design-system.json",
      "src/tesserai.css",
      "src/lib/utils.ts",
      "src/components/ui/button.tsx",
    ]);
    expect(result.written).toContain("AGENTS.md");
    expect(result.written.at(-1)).toBe("tesserai/manifest.json");
    expect(result.written).toContain("tesserai/lint.config.mjs");
    expect(result.written).toContain("eslint.config.mjs");
    expect(result.written).toContain(".oxlintrc.json");
    expect(result.written).toContain("package.json (lint script)");
    expect(result.missingDevDeps).toEqual(["@shadcn/lint@0.2.0", "eslint", "@typescript-eslint/parser"]);
    const lintConfig = await readFile(join(project, "tesserai/lint.config.mjs"), "utf8");
    expect(lintConfig).toContain('"ui": "@/components/ui"');
    expect(lintConfig).toContain('"src/components/ui/**"');
    expect(await readFile(join(project, "eslint.config.mjs"), "utf8")).toContain("./tesserai/lint.config.mjs");
    const pkg = JSON.parse(await readFile(join(project, "package.json"), "utf8")) as { scripts: Record<string, string> };
    expect(pkg.scripts.lint).toBe("eslint .");
    expect(result.written.filter((f) => f.startsWith("src/components/ui/"))).toHaveLength(Object.keys(PRESETS[0]!.build().components).length);
    expect(result.stylesheet).toBe("src/index.css");
    const stylesheet = await readFile(join(project, "src/index.css"), "utf8");
    expect(stylesheet).toBe('@import "tailwindcss";\n@import "./tesserai.css";\n');
    // The base's packages plus each included component's own (input-otp, cmdk…), minus what the
    // project already has (clsx here).
    expect(result.missingDeps).toEqual(dependenciesFor(PRESETS[0]!.build()).filter((d) => d !== "clsx"));
    expect(result.missingDeps).toContain("input-otp");
    expect(result.warnings).toEqual([]);

    const css = await readFile(join(project, "src/tesserai.css"), "utf8");
    expect(css).not.toContain('@import "tailwindcss"');
    expect(css).toContain("@theme static {");
    expect(css).toContain(".dark {");

    const button = await readFile(join(project, "src/components/ui/button.tsx"), "utf8");
    expect(button).toContain('from "@base-ui/react/button"');

    const manifest = JSON.parse(await readFile(join(project, "tesserai/manifest.json"), "utf8")) as { files: Record<string, string> };
    expect(Object.keys(manifest.files)).toContain("src/components/ui/button.tsx");
    expect(manifest.files["src/components/ui/button.tsx"]).toMatch(/^[0-9a-f]{64}$/);

    const agents = await readFile(join(project, "AGENTS.md"), "utf8");
    expect(agents).toContain("## Design system (tesserai)");
    expect(summarize(result).join("\n")).toContain("added @import to src/index.css");
  });

  it("leaves an existing eslint config alone and says so", async () => {
    const project = await viteProject();
    await writeFile(join(project, "eslint.config.js"), "export default [];\n");
    const result = await init({ bundlePath: bundle, dir: project, base: "base-ui", install: false });
    expect(result.written).not.toContain("eslint.config.mjs");
    expect(result.written).toContain("tesserai/lint.config.mjs");
    expect(result.warnings.join("\n")).toMatch(/eslint config already exists/);
  });

  it("skips lint entirely with lint: false", async () => {
    const project = await viteProject();
    const result = await init({ bundlePath: bundle, dir: project, base: "base-ui", install: false, lint: false });
    expect(result.written.some((f) => f.includes("lint"))).toBe(false);
    expect(result.missingDevDeps).toEqual([]);
  });

  it("does not duplicate the stylesheet import on re-run", async () => {
    const project = await viteProject();
    await init({ bundlePath: bundle, dir: project, base: "base-ui", install: false });
    await init({ bundlePath: bundle, dir: project, base: "base-ui", install: false });
    const stylesheet = await readFile(join(project, "src/index.css"), "utf8");
    expect(stylesheet.match(/tesserai\.css/g)).toHaveLength(1);
  });

  it("keeps an existing lib/utils.ts and replaces its own AGENTS.md section on re-run", async () => {
    const project = await viteProject();
    await mkdir(join(project, "src/lib"), { recursive: true });
    await writeFile(join(project, "src/lib/utils.ts"), "// mine\n");
    await writeFile(join(project, "AGENTS.md"), "# Rules\n\nBe nice.\n");

    const first = await init({ bundlePath: bundle, dir: project, base: "base-ui", install: false });
    expect(first.kept).toEqual(["src/lib/utils.ts"]);
    expect(await readFile(join(project, "src/lib/utils.ts"), "utf8")).toBe("// mine\n");

    await init({ bundlePath: bundle, dir: project, base: "base-ui", install: false });
    const agents = await readFile(join(project, "AGENTS.md"), "utf8");
    expect(agents.startsWith("# Rules\n\nBe nice.")).toBe(true);
    expect(agents.match(/## Design system \(tesserai\)/g)).toHaveLength(1);
  });

  it("warns about a bare directory and Tailwind v3", async () => {
    const project = join(dir, "bare");
    await mkdir(project);
    await writeFile(join(project, "package.json"), JSON.stringify({ devDependencies: { tailwindcss: "^3.4.0" } }));
    const result = await init({ bundlePath: bundle, dir: project, base: "base-ui", install: false });
    expect(result.project.srcDir).toBe("");
    expect(result.written).toContain("components/ui/button.tsx");
    expect(result.warnings.join("\n")).toMatch(/Tailwind v3/);
    expect(result.warnings.join("\n")).toMatch(/alias/);
  });

  it("finds the alias through tsconfig references and the package manager from lockfiles", async () => {
    const project = join(dir, "vite-ts");
    await mkdir(join(project, "src"), { recursive: true });
    await writeFile(join(project, "package.json"), JSON.stringify({ devDependencies: { vite: "^8", tailwindcss: "next" } }));
    await writeFile(join(project, "tsconfig.json"), JSON.stringify({ references: [{ path: "./tsconfig.app.json" }] }));
    await writeFile(join(project, "tsconfig.app.json"), JSON.stringify({ compilerOptions: { paths: { "@/*": ["./src/*"] } } }));
    await writeFile(join(project, "bun.lock"), "");
    const result = await init({ bundlePath: bundle, dir: project, base: "base-ui", install: false });
    expect(result.project.hasAlias).toBe(true);
    expect(result.project.packageManager).toBe("bun");
    expect(result.project.tailwind).toBe("4");
    expect(result.warnings).toEqual([]);
  });

  it("rejects a bundle that is not a design system", async () => {
    await writeFile(bundle, JSON.stringify({ hello: 1 }));
    await expect(init({ bundlePath: bundle, dir, base: "base-ui", install: false })).rejects.toThrow();
  });
});

describe("init icons", () => {
  it("installs the system's icon library, writes its own icons, and names the library for shadcn", async () => {
    const project = await viteProject();
    await writeFile(join(project, "components.json"), JSON.stringify({ style: "new-york", iconLibrary: "lucide" }));
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M0 0h24v24z"/></svg>';
    await writeFile(bundle, JSON.stringify({ ...PRESETS[0]!.build(), icons: { library: "tabler", stroke: 1.5, weight: "regular", spots: { "select:chevron-down": "custom:acme" }, custom: { acme: { name: "Acme", svg } } } }));
    const result = await init({ bundlePath: bundle, dir: project, install: false });
    expect(result.missingDeps).toContain("@tabler/icons-react");
    expect(result.missingDeps).not.toContain("lucide-react");
    expect(JSON.parse(await readFile(join(project, "components.json"), "utf8"))).toMatchObject({ style: "new-york", iconLibrary: "tabler" });
    expect(await readFile(join(project, "src/components/icons.tsx"), "utf8")).toContain("export function AcmeIcon");
    expect(await readFile(join(project, "src/components/ui/select.tsx"), "utf8")).toContain(`import { AcmeIcon as ChevronDownIcon } from "@/components/icons";`);
    expect(await readFile(join(project, "src/tesserai.css"), "utf8")).toContain("stroke-width: 1.5");
  });
});

describe("init fonts", () => {
  it("self-hosts the system's own fonts beside tesserai.css", async () => {
    const project = await viteProject();
    const id = "b".repeat(64);
    const font = { files: [{ id, weight: "400", style: "normal", format: "woff2", name: "Acme-Regular.woff2" }] };
    const system = PRESETS[0]!.build();
    await writeFile(bundle, JSON.stringify({ ...system, fonts: { "Acme Sans": font } }));
    const asked: string[] = [];
    const result = await init({ bundlePath: bundle, dir: project, install: false, lint: false, fetchFont: async (url) => (asked.push(url), new Uint8Array([0x77, 0x4f, 0x46, 0x32])) });
    expect(asked).toEqual([`https://tesserai.design/api/fonts/${id}`]);
    expect(await readFile(join(project, "src/fonts/acme-sans-400-bbbbbbbb.woff2"))).toEqual(Buffer.from([0x77, 0x4f, 0x46, 0x32]));
    expect(await readFile(join(project, "src/tesserai.css"), "utf8")).toContain('src: url("./fonts/acme-sans-400-bbbbbbbb.woff2") format("woff2");');
    expect(result.warnings.join(" ")).not.toContain("couldn't download");
    // Without access, it says what to do, and the CSS still names the file.
    await rm(join(project, "src/fonts"), { recursive: true });
    const denied = await init({ bundlePath: bundle, dir: project, install: false, lint: false, fetchFont: async () => null });
    expect(denied.warnings.join(" ")).toContain("couldn't download Acme Sans (Acme-Regular.woff2); run npx @tesserai/cli login");
  });
});

describe("init base", () => {
  it("uses the bundle's base and asks for that base's dependencies", async () => {
    const project = await viteProject();
    await writeFile(bundle, JSON.stringify({ ...PRESETS[0]!.build(), base: "radix" }));
    const result = await init({ bundlePath: bundle, dir: project, install: false });
    expect(result.base).toBe("radix");
    expect(result.missingDeps).toContain("radix-ui");
    // Only because the default system includes Combobox, which is Base UI's on Radix (as in shadcn).
    expect(result.missingDeps).toContain("@base-ui/react");
    await writeFile(bundle, JSON.stringify({ ...PRESETS[0]!.build(), base: "radix", excluded: ["combobox"] }));
    const withoutCombobox = await init({ bundlePath: bundle, dir: await viteProject(), install: false });
    expect(withoutCombobox.missingDeps).not.toContain("@base-ui/react");
    expect(await readFile(join(project, "src/components/ui/dialog.tsx"), "utf8")).toContain('from "radix-ui"');
    const manifest = JSON.parse(await readFile(join(project, "tesserai/manifest.json"), "utf8")) as { base: string };
    expect(manifest.base).toBe("radix");
  });

  it("--base overrides the bundle and the project's copy records the choice", async () => {
    const project = await viteProject();
    const result = await init({ bundlePath: bundle, dir: project, base: "radix", install: false });
    expect(result.base).toBe("radix");
    const copy = JSON.parse(await readFile(join(project, "tesserai/design-system.json"), "utf8")) as { base: string };
    expect(copy.base).toBe("radix");
  });
});

describe("registering the MCP server for agents", () => {
  it("adds tesserai to Claude Code's .mcp.json and, in a Cursor project, Cursor's, keeping what's there", async () => {
    const project = await viteProject();
    await mkdir(join(project, ".cursor"));
    await writeFile(join(project, ".mcp.json"), JSON.stringify({ mcpServers: { github: { command: "gh-mcp" } } }));
    const result = await init({ bundlePath: bundle, dir: project, install: false, lint: false });
    expect(result.written).toContain(".mcp.json (tesserai MCP server)");
    expect(result.written).toContain(".cursor/mcp.json (tesserai MCP server)");
    const claude = JSON.parse(await readFile(join(project, ".mcp.json"), "utf8"));
    expect(claude.mcpServers).toEqual({ github: { command: "gh-mcp" }, tesserai: { command: process.execPath, args: [expect.stringMatching(/packages\/cli\/bin\/tesserai\.js$/), "mcp", "--dir", project] } });
    expect(JSON.parse(await readFile(join(project, ".cursor/mcp.json"), "utf8")).mcpServers.tesserai.args).toEqual([expect.stringMatching(/packages\/cli\/bin\/tesserai\.js$/), "mcp", "--dir", project]);
    expect(await readFile(join(project, "AGENTS.md"), "utf8")).toContain("command and arguments in `.mcp.json`");
  });

  it("leaves a tesserai entry the developer set up, and doesn't create Cursor's file without Cursor", async () => {
    const project = await viteProject();
    const own = { mcpServers: { tesserai: { command: "node", args: ["../tesserai/packages/cli/bin/tesserai.js", "mcp"] } } };
    await writeFile(join(project, ".mcp.json"), JSON.stringify(own));
    const result = await init({ bundlePath: bundle, dir: project, install: false, lint: false });
    expect(result.written.some((w) => w.includes("MCP server"))).toBe(false);
    expect(JSON.parse(await readFile(join(project, ".mcp.json"), "utf8"))).toEqual(own);
    await expect(readFile(join(project, ".cursor/mcp.json"), "utf8")).rejects.toThrow();
  });
});

describe("adding scripts to package.json", () => {
  it("keeps the project's key order and indentation (SvelteKit's templates use tabs)", () => {
    const source = '{\n\t"name": "kit",\n\t"private": true,\n\t"scripts": {\n\t\t"dev": "vite dev"\n\t},\n\t"devDependencies": {}\n}\n';
    expect(withScripts(source, { lint: "eslint ." })).toBe('{\n\t"name": "kit",\n\t"private": true,\n\t"scripts": {\n\t\t"dev": "vite dev",\n\t\t"lint": "eslint ."\n\t},\n\t"devDependencies": {}\n}\n');
    expect(withScripts('{\n    "name": "r"\n}', { lint: "eslint ." })).toBe('{\n    "name": "r",\n    "scripts": {\n        "lint": "eslint ."\n    }\n}');
    expect(withScripts(source, { dev: "other" })).toBeNull();
    expect(withScripts("not json", { lint: "eslint ." })).toBeNull();
  });
});
