import { applyChangeset, PRESETS, type DesignSystem } from "@tesserai/core";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { diffLines, formatDiff, summarizeDiff } from "./diff";
import { init, sha256 } from "./init";
import { summarizeSync, sync } from "./sync";

let dir: string;
let project: string;
let bundle: string;

function withRadius(system: DesignSystem, base: number): DesignSystem {
  const copy: DesignSystem = JSON.parse(JSON.stringify(system));
  const radius = copy.generators["radius"]?.config;
  if (radius?.kind === "radiusScale") radius.base = base;
  return copy;
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "tesserai-sync-"));
  project = join(dir, "app");
  await mkdir(join(project, "src"), { recursive: true });
  await writeFile(join(project, "package.json"), JSON.stringify({ devDependencies: { vite: "^8", tailwindcss: "^4" } }));
  await writeFile(join(project, "tsconfig.json"), JSON.stringify({ compilerOptions: { paths: { "@/*": ["./src/*"] } } }));
  bundle = join(dir, "acme.tesserai.json");
  await writeFile(bundle, JSON.stringify(PRESETS[0]!.build()));
  await init({ bundlePath: bundle, dir: project, base: "base-ui", install: false });
});

afterEach(() => rm(dir, { recursive: true, force: true }));

describe("diff", () => {
  it("counts and formats line changes", () => {
    const lines = diffLines("a\nb\nc\nd", "a\nB\nc\nd\ne");
    expect(summarizeDiff(lines)).toEqual({ added: 2, removed: 1 });
    expect(formatDiff(lines, 1)).toBe("  a\n- b\n+ B\n  c\n  d\n+ e");
  });
});

describe("sync", () => {
  it("is a no-op when nothing changed", async () => {
    const result = await sync({ dir: project, force: false });
    expect(result.files.every((f) => f.outcome === "unchanged")).toBe(true);
  });

  it("updates untouched files when the bundle changes", async () => {
    const system = PRESETS[0]!.build();
    const changed = join(dir, "changed.json");
    await writeFile(changed, JSON.stringify(withRadius(system, 12)));
    const result = await sync({ dir: project, bundlePath: changed, force: false });
    const css = result.files.find((f) => f.path === "src/tesserai.css");
    expect(css?.outcome).toBe("updated");
    expect(await readFile(join(project, "src/tesserai.css"), "utf8")).toContain("--radius-md: 0.75rem;");
    // The adopted bundle is now the project's source of truth.
    expect(JSON.parse(await readFile(join(project, "tesserai/design-system.json"), "utf8"))).toEqual(withRadius(system, 12));
  });

  it("keeps a locally modified file and writes the new version beside it", async () => {
    const buttonPath = join(project, "src/components/ui/button.tsx");
    const mine = (await readFile(buttonPath, "utf8")) + "\n// my tweak\n";
    await writeFile(buttonPath, mine);
    const changed = join(dir, "changed.json");
    const system = PRESETS[0]!.build();
    system.components["button"]!.axes.variant!.enabled = ["solid", "soft"];
    await writeFile(changed, JSON.stringify(system));

    const result = await sync({ dir: project, bundlePath: changed, force: false });
    const button = result.files.find((f) => f.path === "src/components/ui/button.tsx");
    expect(button?.outcome).toBe("kept");
    expect(await readFile(buttonPath, "utf8")).toBe(mine);
    expect(await readFile(`${buttonPath}.tesserai-new`, "utf8")).not.toContain('"outline"');
    if (button?.outcome === "kept") {
      expect(button.diff.removed).toBeGreaterThan(0);
      expect(button.preview).toContain("- ");
    }

    const forced = await sync({ dir: project, force: true });
    expect(forced.files.find((f) => f.path === "src/components/ui/button.tsx")?.outcome).toBe("overwritten");
    expect(await readFile(buttonPath, "utf8")).not.toContain("my tweak");
  });

  // Accepting the offered version makes the file tesserai's again: the next change updates it,
  // rather than being set aside as though it were still an edit.
  it("updates a file whose offered version was accepted, at the next change", async () => {
    const buttonPath = join(project, "src/components/ui/button.tsx");
    await writeFile(buttonPath, (await readFile(buttonPath, "utf8")) + "\n// my tweak\n");
    const first = PRESETS[0]!.build();
    first.components["button"]!.axes.variant!.enabled = ["solid", "soft"];
    const firstPath = join(dir, "first.json");
    await writeFile(firstPath, JSON.stringify(first));
    expect((await sync({ dir: project, bundlePath: firstPath, force: false })).files.find((f) => f.path === "src/components/ui/button.tsx")?.outcome).toBe("kept");
    // Taken as offered: the new version moved over theirs.
    await writeFile(buttonPath, await readFile(`${buttonPath}.tesserai-new`, "utf8"));
    await rm(`${buttonPath}.tesserai-new`);
    const second = JSON.parse(JSON.stringify(first)) as DesignSystem;
    second.components["button"]!.axes.variant!.enabled = ["solid"];
    const secondPath = join(dir, "second.json");
    await writeFile(secondPath, JSON.stringify(second));
    const result = await sync({ dir: project, bundlePath: secondPath, force: false });
    expect(result.files.find((f) => f.path === "src/components/ui/button.tsx")?.outcome).toBe("updated");
    expect(await readFile(buttonPath, "utf8")).not.toContain('"soft"');
    // An edit still there is still theirs.
    await writeFile(buttonPath, (await readFile(buttonPath, "utf8")) + "\n// mine again\n");
    const again = await sync({ dir: project, bundlePath: firstPath, force: false });
    expect(again.files.find((f) => f.path === "src/components/ui/button.tsx")?.outcome).toBe("kept");
  });

  // A sync that brings a component needing a package the project lacks installs it, as init does,
  // so a running dev server doesn't break on a missing import; --no-install says what to run.
  it("installs the packages new components need, unless asked not to", async () => {
    const calls: string[][] = [];
    const runInstall = async (command: string, args: string[]) => void calls.push([command, ...args]);
    const skipped = await sync({ dir: project, force: false, install: false, runInstall });
    expect(calls).toEqual([]);
    expect(skipped.installed).toEqual([]);
    expect(skipped.warnings.find((w) => w.includes("install them"))).toContain("without --no-install");
    const needed = skipped.warnings.find((w) => w.includes("install them"))!;
    const result = await sync({ dir: project, force: false, install: true, runInstall });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.slice(0, 2)).toEqual(["npm", "install"]);
    expect(result.installed.length).toBeGreaterThan(0);
    for (const dep of result.installed) expect(needed).toContain(dep);
    expect(result.warnings.some((w) => w.includes("install them"))).toBe(false);
    expect(summarizeSync(result, false)[0]).toMatch(/^Installed .+ with npm$/);
    // A failed install leaves the files written and says what to run.
    const failed = await sync({ dir: project, force: false, install: true, runInstall: async () => { throw new Error("offline"); } });
    expect(failed.warnings.some((w) => w.startsWith("couldn't install") && w.includes("npm install"))).toBe(true);
  });

  it("regenerates the lint config when the system changes", async () => {
    const changed = join(dir, "changed.json");
    const system = PRESETS[0]!.build();
    system.name = "renamed";
    await writeFile(changed, JSON.stringify(system));
    const result = await sync({ dir: project, bundlePath: changed, force: false });
    expect(result.files.find((f) => f.path === "tesserai/lint.config.mjs")?.outcome).toBe("updated");
    expect(await readFile(join(project, "tesserai/lint.config.mjs"), "utf8")).toContain("renamed");
  });

  it("never overwrites a file it did not write", async () => {
    const mine = join(project, "src/components/ui/tooltip.tsx");
    const manifestPath = join(project, "tesserai/manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { base: string; files: Record<string, string> };
    delete manifest.files["src/components/ui/tooltip.tsx"];
    await writeFile(manifestPath, JSON.stringify(manifest));
    await writeFile(mine, "// hand-written\n");
    const result = await sync({ dir: project, force: false });
    expect(result.files.find((f) => f.path === "src/components/ui/tooltip.tsx")?.outcome).toBe("kept");
    expect(await readFile(mine, "utf8")).toBe("// hand-written\n");
  });

  it("removes files the system no longer produces and reports edited ones as orphaned", async () => {
    const changed = join(dir, "changed.json");
    const system = PRESETS[0]!.build();
    delete system.components["tooltip"];
    delete system.components["badge"];
    await writeFile(changed, JSON.stringify(system));
    await writeFile(join(project, "src/components/ui/badge.tsx"), "// edited\n");
    const result = await sync({ dir: project, bundlePath: changed, force: false });
    expect(result.files.find((f) => f.path === "src/components/ui/tooltip.tsx")?.outcome).toBe("removed");
    expect(result.files.find((f) => f.path === "src/components/ui/badge.tsx")?.outcome).toBe("orphaned");
    await expect(readFile(join(project, "src/components/ui/tooltip.tsx"))).rejects.toThrow();
    const manifest = JSON.parse(await readFile(join(project, "tesserai/manifest.json"), "utf8")) as { files: Record<string, string>;
    };
    expect("src/components/ui/tooltip.tsx" in manifest.files).toBe(false);
    expect("src/components/ui/badge.tsx" in manifest.files).toBe(true);
  });

  it("cleans up a .tesserai-new once the file matches again", async () => {
    const buttonPath = join(project, "src/components/ui/button.tsx");
    const original = await readFile(buttonPath, "utf8");
    await writeFile(buttonPath, original + "\n// tweak\n");
    const changed = join(dir, "changed.json");
    await writeFile(changed, JSON.stringify(withRadius(PRESETS[0]!.build(), 12)));
    await sync({ dir: project, bundlePath: changed, force: false });
    await expect(readFile(`${buttonPath}.tesserai-new`, "utf8")).resolves.toBeTruthy();
    await writeFile(buttonPath, await readFile(`${buttonPath}.tesserai-new`, "utf8"));
    await sync({ dir: project, force: false });
    await expect(readFile(`${buttonPath}.tesserai-new`)).rejects.toThrow();
  });

  it("recreates a deleted file", async () => {
    await rm(join(project, "src/components/ui/badge.tsx"));
    const result = await sync({ dir: project, force: false });
    expect(result.files.find((f) => f.path === "src/components/ui/badge.tsx")?.outcome).toBe("created");
  });

  it("switches base when the adopted bundle names another, and says which dependencies to add", async () => {
    const radix = join(dir, "radix.json");
    await writeFile(radix, JSON.stringify({ ...PRESETS[0]!.build(), base: "radix" }));
    const result = await sync({ dir: project, bundlePath: radix, force: false });
    expect(result.files.find((f) => f.path === "src/components/ui/dialog.tsx")?.outcome).toBe("updated");
    expect(await readFile(join(project, "src/components/ui/dialog.tsx"), "utf8")).toContain('from "radix-ui"');
    expect(result.warnings.join("\n")).toMatch(/radix components need radix-ui/);
    const manifest = JSON.parse(await readFile(join(project, "tesserai/manifest.json"), "utf8")) as { base: string;
    };
    expect(manifest.base).toBe("radix");
  });

  it("refuses to run without a manifest", async () => {
    await expect(sync({ dir: dir, force: false })).rejects.toThrow(/npx @tesserai\/cli init/);
  });
});

describe("sync --dry-run", () => {
  it("says what would change and writes nothing", async () => {
    const changed = join(dir, "rounder.tesserai.json");
    await writeFile(changed, JSON.stringify(withRadius(PRESETS[0]!.build(), 11)));
    const before = await readFile(join(project, "tesserai/design-system.json"), "utf8");
    const cssBefore = await readFile(join(project, "src/tesserai.css"), "utf8");
    const result = await sync({ dir: project, bundlePath: changed, force: false, dryRun: true });
    expect(result.dryRun).toBe(true);
    // A rounder system looks different but breaks nothing.
    expect(result.breaking).toEqual([]);
    expect(result.files.find((f) => f.path === "src/tesserai.css")?.outcome).toBe("updated");
    expect(await readFile(join(project, "tesserai/design-system.json"), "utf8")).toBe(before);
    expect(await readFile(join(project, "src/tesserai.css"), "utf8")).toBe(cssBefore);
    const summary = summarizeSync(result, false);
    expect(summary[0]).toMatch(/^Dry run, nothing written: \d+ would be updated/);
    expect(summary).toContain("run without --dry-run to apply");
    // Then for real.
    const applied = await sync({ dir: project, bundlePath: changed, force: false });
    expect(applied.files.find((f) => f.path === "src/tesserai.css")?.outcome).toBe("updated");
    expect(await readFile(join(project, "src/tesserai.css"), "utf8")).not.toBe(cssBefore);
  });
});

describe("sync names what a version breaks", () => {
  it("lists taken-out components and removed options before anything is written", async () => {
    const r = applyChangeset(PRESETS[0]!.build(), {
      ops: [
        { op: "component.remove", input: { component: "badge" } },
        { op: "component.removeOption", input: { component: "button", axis: "size", name: "lg" } },
      ],
    });
    if (!r.ok) throw new Error(r.error);
    const breaking = join(dir, "breaking.tesserai.json");
    await writeFile(breaking, JSON.stringify(r.system));
    const result = await sync({ dir: project, bundlePath: breaking, force: false, dryRun: true });
    const summary = summarizeSync(result, false);
    expect(summary[0]).toBe("This version would break code that uses the system:");
    expect(summary.some((l) => l.includes("Badge is taken out"))).toBe(true);
    expect(summary.some((l) => l.includes('size="lg"'))).toBe(true);
  });
});

it("failed validation leaves the followed bundle and source unchanged", async () => {
  const path = join(project, "tesserai/design-system.json");
  const before = await readFile(path, "utf8");
  const source = join(project, "tesserai/source.json");
  await writeFile(source, JSON.stringify({ link: "https://tesserai.example/s/AbCdEf123456" }));
  const originalSource = await readFile(source, "utf8");
  const bad = PRESETS[0]!.build();
  bad.tokens["broken"] = { $type: "color", $value: "{missing.color}" };
  await writeFile(bundle, JSON.stringify(bad));
  await expect(sync({ dir: project, bundlePath: bundle, force: false })).rejects.toThrow();
  expect(await readFile(path, "utf8")).toBe(before);
  expect(await readFile(source, "utf8")).toBe(originalSource);
});
it("rejects traversal in a tampered manifest before deleting files", async () => {
  const victim = join(dir, "outside.txt");
  await writeFile(victim, "keep me");
  const path = join(project, "tesserai/manifest.json");
  const manifest = JSON.parse(await readFile(path, "utf8"));
  manifest.files["../outside.txt"] = sha256("keep me");
  await writeFile(path, JSON.stringify(manifest));
  await expect(sync({ dir: project, force: false })).rejects.toThrow();
  expect(await readFile(victim, "utf8")).toBe("keep me");
});
it("rejects a manifest path that traverses a symlink before touching its target", async () => {
  const { symlink } = await import("node:fs/promises");
  const outside = join(dir, "outside");
  await mkdir(outside);
  await writeFile(join(outside, "file.txt"), "keep me");
  await symlink(outside, join(project, "linked"));
  const path = join(project, "tesserai/manifest.json");
  const manifest = JSON.parse(await readFile(path, "utf8"));
  manifest.files["linked/file.txt"] = sha256("keep me");
  await writeFile(path, JSON.stringify(manifest));
  await expect(sync({ dir: project, force: false })).rejects.toThrow(/symbolic link/);
  expect(await readFile(join(outside, "file.txt"), "utf8")).toBe("keep me");
});
