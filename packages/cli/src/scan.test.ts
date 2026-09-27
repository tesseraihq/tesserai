import { applyChangeset, PRESETS } from "@tesserai/core";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyFixes, scan, summarizeScan, type ScanResult } from "./scan";

let dir: string;
let result: ScanResult;
const system = PRESETS[0]!.build();

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "tesserai-scan-"));
  await mkdir(join(dir, "src", "components", "ui"), { recursive: true });
  await mkdir(join(dir, "node_modules", "x"), { recursive: true });
  // Generated components and dependencies aren't the app's own code.
  await writeFile(join(dir, "src", "components", "ui", "button.tsx"), `const x = "#123456";`);
  await writeFile(join(dir, "node_modules", "x", "index.js"), `const y = "#abcdef";`);
  await writeFile(
    join(dir, "src", "App.tsx"),
    [
      `import { Button as Btn } from "@/components/ui/button";`,
      `import { Badge } from "../components/ui/badge";`,
      `export function App() {`,
      `  return <div className="p-[13px] rounded-[7px] bg-[#ffffff]" style={{ color: "#18181b" }}>`,
      `    <Btn variant="outline" intent="danger">Delete</Btn>`,
      `    <Btn variant="outline">Cancel</Btn>`,
      `    <Badge>New</Badge>`,
      `  </div>;`,
      `}`,
    ].join("\n"),
  );
  await writeFile(join(dir, "src", "styles.css"), `.hero { background: oklch(0.6 0.2 250); }`);
  result = await scan(dir, system);
});

afterAll(() => rm(dir, { recursive: true, force: true }));

describe("tesserai scan", () => {
  it("counts the components and options the app uses", () => {
    expect(result.files).toBe(2);
    const button = result.components.find((c) => c.name === "button")!;
    expect(button.props).toEqual({ variant: { outline: 2 }, intent: { danger: 1 } });
    expect(result.components.map((c) => c.name).sort()).toEqual(["badge", "button"]);
    expect(result.unused).toContain("dialog");
    expect(result.unused).not.toContain("button");
  });

  it("finds hard-coded values and names the token to use", () => {
    const texts = result.hardCoded.map((f) => f.text);
    expect(texts).toEqual(expect.arrayContaining(["#ffffff", "#18181b", "oklch(0.6 0.2 250)", "p-[13px]", "rounded-[7px]"]));
    expect(texts).not.toContain("#123456");
    expect(result.hardCoded.find((f) => f.text === "p-[13px]")!.suggestion).toBe("p-3.5 (14px)");
    expect(result.hardCoded.find((f) => f.text === "#18181b")!.suggestion).toMatch(/^(closest: )?(bg|text|border)-[a-z0-9-]+ \(#/);
    expect(result.hardCoded.find((f) => f.text === "oklch(0.6 0.2 250)")!.suggestion).toMatch(/var\(--color-[a-z0-9-]+\)/);
    expect(summarizeScan(result).join("\n")).toMatch(/Hard-coded values \(\d+\)/);
  });

  it("counts Tailwind's own palette as hard-coded, naming the system color nearest it, and not the system's steps", async () => {
    const own = await mkdtemp(join(tmpdir(), "tesserai-palette-"));
    await writeFile(join(own, "Box.tsx"), `export const Box = () => <div className="bg-red-600 hover:text-sky-700/50 bg-red-9 text-danger-text" />;`);
    const found = await scan(own, system);
    await rm(own, { recursive: true, force: true });
    expect(found.hardCoded.map((f) => f.text)).toEqual(["bg-red-600", "text-sky-700/50"]);
    expect(found.hardCoded[0]!.suggestion).toMatch(/^closest: bg-[a-z0-9-]+ \(#[0-9a-f]{6}\)$/);
    expect(found.hardCoded[0]!.fix).toBeUndefined();
  });

  it("scores adoption: components over raw controls, tokens over hard-coded values", () => {
    expect(result.adoption.components).toEqual({ system: 3, raw: 0 });
    expect(result.adoption.values.hardCoded).toBe(result.hardCoded.length);
    expect(result.adoption.score).toBeGreaterThan(0);
    expect(result.adoption.score).toBeLessThanOrEqual(100);
    expect(summarizeScan(result)[2]).toBe(`Adoption: ${result.adoption.score}/100`);
  });

  it("fixes exact matches only, so nothing looks different", async () => {
    const app = join(dir, "fix");
    await mkdir(app, { recursive: true });
    await writeFile(
      join(app, "Page.tsx"),
      [`export const Page = () => (`, `  <div className="p-[16px] p-[13px] rounded-[7px] gap-[8px]">`, `    <button className="bg-[#123456]">Raw</button>`, `  </div>`, `);`].join("\n"),
    );
    const before = await scan(app, system);
    expect(before.adoption.components).toEqual({ system: 0, raw: 1 });
    const fixable = before.hardCoded.filter((f) => f.fix !== undefined).map((f) => f.text);
    expect(fixable).toEqual(expect.arrayContaining(["p-[16px]", "gap-[8px]"]));
    expect(fixable).not.toContain("p-[13px]");
    await applyFixes(app, before.hardCoded);
    const text = await readFile(join(app, "Page.tsx"), "utf8");
    expect(text).toContain(`className="p-4 p-[13px] rounded-[7px] gap-2"`);
    const after = await scan(app, system);
    expect(after.adoption.score).toBeGreaterThan(before.adoption.score);
  });
});

describe("tesserai scan in Svelte and Vue", () => {
  it("counts components imported through a folder's index.js, whole or by name", async () => {
    const root = await mkdtemp(join(tmpdir(), "tesserai-scan-svelte-"));
    try {
      await mkdir(join(root, "src", "routes"), { recursive: true });
      await writeFile(
        join(root, "src", "routes", "+page.svelte"),
        [
          `<script lang="ts">`,
          `  import * as Dialog from "$lib/components/ui/dialog/index.js";`,
          `  import { Button } from "$lib/components/ui/button/index.js";`,
          `</script>`,
          `<Dialog.Root><Dialog.Trigger>Open</Dialog.Trigger></Dialog.Root>`,
          `<Button variant="outline" size="sm">Save</Button>`,
        ].join("\n"),
      );
      await writeFile(join(root, "src", "App.vue"), `<script setup lang="ts">\nimport { Badge } from "@/components/ui/badge";\n</script>\n<template><Badge variant="soft">New</Badge></template>\n`);
      const found = await scan(root, system);
      expect(found.components.map((c) => c.name).sort()).toEqual(["badge", "button", "dialog"]);
      expect(found.components.find((c) => c.name === "button")!.props).toEqual({ variant: { outline: 1 }, size: { sm: 1 } });
      expect(found.components.find((c) => c.name === "badge")!.props).toEqual({ variant: { soft: 1 } });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

it("never calls a nearby color or a different opacity an exact autofix", async () => {
  const root = await mkdtemp(join(tmpdir(), "tesserai-exact-colors-"));
  try {
    await writeFile(join(root, "colors.css"), '.a { color: #ffffff; }\n.b { color: #fefefe; }\n.c { color: rgba(255, 255, 255, 0.5); }');
    const found = await scan(root, system);
    expect(found.hardCoded.find((f) => f.text === "#ffffff")?.fix).toBeDefined();
    expect(found.hardCoded.find((f) => f.text === "#fefefe")?.fix).toBeUndefined();
    expect(found.hardCoded.find((f) => f.text.includes("rgba"))?.fix).toBeUndefined();
    await applyFixes(root, found.hardCoded);
    const fixed = await readFile(join(root, "colors.css"), "utf8");
    expect(fixed).toContain("#fefefe");
    expect(fixed).toContain("rgba(255, 255, 255, 0.5)");
  } finally { await rm(root, { recursive: true, force: true }); }
});


it.each([2, 8])("spacing fixes use Tailwind's numeric unit when the token base is %i", async (base) => {
  const changed = applyChangeset(system, { ops: [{ op: "spacing.set", input: { base } }] });
  if (!changed.ok) throw new Error(changed.error);
  const fixture = await mkdtemp(join(tmpdir(), "tesserai-spacing-"));
  try {
    const path = join(fixture, "Example.vue");
    await writeFile(path, '<div class="p-[8px] gap-[0.375rem] m-[7px]"></div>');
    const findings = (await scan(fixture, changed.system)).hardCoded;
    expect(findings.find((f) => f.text === "p-[8px]")?.fix).toEqual({ from: "p-[8px]", to: "p-2" });
    expect(findings.find((f) => f.text === "gap-[0.375rem]")?.fix).toEqual({ from: "gap-[0.375rem]", to: "gap-1.5" });
    expect(findings.find((f) => f.text === "m-[7px]")?.fix).toBeUndefined();
    await applyFixes(fixture, findings);
    expect(await readFile(path, "utf8")).toContain('class="p-2 gap-1.5 m-[7px]"');
  } finally { await rm(fixture, { recursive: true, force: true }); }
});

describe("tesserai scan, as analysis", () => {
  let project: string;
  let found: ScanResult;
  beforeAll(async () => {
    project = await mkdtemp(join(tmpdir(), "tesserai-analysis-"));
    await mkdir(join(project, "src", "components", "ui"), { recursive: true });
    await mkdir(join(project, "tesserai"), { recursive: true });
    const { createHash } = await import("node:crypto");
    const hash = (s: string) => createHash("sha256").update(s).digest("hex");
    const original = "export function Button() {}\n";
    await writeFile(join(project, "src", "components", "ui", "button.tsx"), original + "// changed here\n");
    await writeFile(join(project, "src", "components", "ui", "badge.tsx"), original);
    await writeFile(join(project, "tesserai", "manifest.json"), JSON.stringify({ base: "radix", files: { "src/components/ui/button.tsx": hash(original), "src/components/ui/badge.tsx": hash(original), "src/components/ui/gone.tsx": hash(original) } }));
    await writeFile(join(project, "src", "Nav.vue"), [`<script setup>`, `import NavButton from "@/components/ui/button/Button.vue";`, `import CardHeader from "@/components/ui/card/CardHeader.vue";`, `import { Root as CardRoot } from "@/components/ui/card";`, `</script>`, `<template><CardRoot><CardHeader /><NavButton>Go</NavButton></CardRoot></template>`].join("\n"));
    await writeFile(
      join(project, "src", "Page.tsx"),
      [
        `import { Button } from "@/components/ui/button";`,
        `export function Page({ v }: { v: "ghost" | "link" }) {`,
        `  return (<>`,
        `    <Button className="rounded-none" onClick={() => 1} size="sm">A</Button>`,
        `    <Button className="rounded-none mt-2">B</Button>`,
        `    <Button className="rounded-none" variant={v}>C</Button>`,
        `    <Button className="w-full">D</Button>`,
        `  </>);`,
        `}`,
      ].join("\n"),
    );
    found = await scan(project, system);
  });
  afterAll(() => rm(project, { recursive: true, force: true }));

  it("counts uses, and each option's uses with the defaults and the ones set in code", () => {
    const button = found.components.find((c) => c.name === "button")!;
    expect([button.uses, button.files]).toEqual([5, 2]);
    expect(button.options["size"]).toEqual({ sm: 1, md: 4 });
    expect(button.options["variant"]).toEqual({ solid: 4 });
    expect(button.dynamic).toEqual({ variant: 1 });
    // Sizes no use sets are certain; variants aren't, with one set in code.
    expect(found.unusedOptions.filter((u) => u.component === "button" && u.axis === "size")).toEqual([
      { component: "button", axis: "size", value: "xs", certain: true },
      { component: "button", axis: "size", value: "lg", certain: true },
    ]);
    expect(found.unusedOptions.find((u) => u.axis === "variant" && u.value === "soft")!.certain).toBe(false);
  });

  it("knows a component's own export by its file (Button.vue) and as Root, and a part as a part", () => {
    expect(found.components.find((c) => c.name === "button")!.files).toBe(2);
    const card = found.components.find((c) => c.name === "card")!;
    expect([card.uses, card.files]).toEqual([1, 1]);
  });

  it("reports overrides by what they change, leaves placement out, and suggests the repeated one", () => {
    expect(found.overrides).toEqual([{ component: "button", count: 3, kinds: { radius: 3 }, sites: expect.any(Array) }]);
    expect(found.overrides[0]!.sites.map((s) => s.line)).toEqual([4, 5, 6]);
    expect(found.suggestions).toEqual([expect.objectContaining({ component: "button", class: "rounded-none", count: 3, kind: "radius" })]);
  });

  it("lists generated files edited by hand, not ones removed or untouched", () => {
    expect(found.edited).toEqual([{ file: "src/components/ui/button.tsx", component: "button" }]);
    const text = summarizeScan(found).join("\n");
    expect(text).toMatch(/Most used/);
    expect(text).toMatch(/3 uses of Button set rounded-none/);
    expect(text).toMatch(/Edited by hand since install \(1\)/);
  });
});
