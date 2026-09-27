import { EXAMPLE_PAGES, EXAMPLE_SPECS, exampleSource, pagePrinting, printPage, renderAll, STORY_EXAMPLES, type GeneratedFile } from "@tesserai/templates";
import { expect, it } from "vitest";
import { svelteCheck } from "../harness";
import { DEFAULT_SYSTEM } from "./systems";

// Pages and docs examples printed for Svelte (svelte/page.ts), against the generated components:
// every example page and every component's example compiles under svelte-check, strict.

it("prints every example page and every component's example as Svelte that passes svelte-check", async () => {
  const files = await renderAll("bits-ui", DEFAULT_SYSTEM, { format: false });
  const printing = pagePrinting("bits-ui");
  expect(printing?.printer).toBeDefined();
  const printer = printing!.printer!;

  const pages: GeneratedFile[] = EXAMPLE_PAGES.map((page) => {
    const printed = printPage(EXAMPLE_SPECS[page](), DEFAULT_SYSTEM, files, page, { printer });
    expect(printed.problems, page).toEqual([]);
    expect(printed.source, page).not.toContain("Not printed for Svelte yet");
    return { path: `page-${page}.svelte`, source: printed.source };
  });
  // Components the Svelte set has: each example prints (the rest aren't generated for Svelte yet).
  const generated = new Set(files.map((f) => /^components\/ui\/([a-z0-9-]+)\//.exec(f.path)?.[1]).filter((c) => c !== undefined));
  const examples: GeneratedFile[] = Object.keys(STORY_EXAMPLES)
    .filter((component) => generated.has(component))
    .map((component) => {
      const source = exampleSource(DEFAULT_SYSTEM, files, component, printer);
      expect(source, component).not.toBeNull();
      expect(source!, component).not.toContain("Not printed for Svelte yet");
      return { path: `example-${component}.svelte`, source: source! };
    });
  expect(examples.length).toBeGreaterThan(25);

  const diagnostics = await svelteCheck("pages", [...files, ...pages, ...examples]);
  expect(diagnostics.map((d) => `${d.file}:${d.line} ${d.severity}: ${d.message}`)).toEqual([]);
}, 180_000);
