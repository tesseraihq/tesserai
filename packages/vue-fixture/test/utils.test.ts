import { PRESETS } from "@tesserai/core";
import { utilsSource } from "@tesserai/templates";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";
import { afterAll, describe, expect, it } from "vitest";

// The generated cn, run for real (against the fixture's tailwind-merge), so what it keeps and what
// it merges is the library's behaviour, not a guess about it.
const generated = join(new URL("..", import.meta.url).pathname, "generated");
await mkdir(generated, { recursive: true });
const dir = await mkdtemp(join(generated, "utils-"));
afterAll(() => rm(dir, { recursive: true, force: true }));

async function cnOf(source: string): Promise<(...inputs: string[]) => string> {
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const path = join(dir, `utils-${Math.random().toString(36).slice(2)}.mjs`);
  await writeFile(path, js);
  return ((await import(path)) as { cn: (...inputs: string[]) => string }).cn;
}

describe("the generated cn", () => {
  it("keeps a focus ring's offset width beside its offset color", async () => {
    const cn = await cnOf(utilsSource(PRESETS[0]!.build()));
    const ring = "focus-visible:ring-offset-(length:--focus-offset) focus-visible:ring-offset-(color:--color-surface-page)";
    expect(cn(ring)).toBe(ring);
    // Two widths still merge, the later winning.
    expect(cn("ring-offset-(length:--a) ring-offset-(length:--b)")).toBe("ring-offset-(length:--b)");
  });

  it("knows the type steps are sizes, so a size and a color both stay", async () => {
    const cn = await cnOf(utilsSource(PRESETS[0]!.build()));
    expect(cn("text-2 text-neutral-text")).toBe("text-2 text-neutral-text");
    expect(cn("text-2 text-3")).toBe("text-3");
  });
});
