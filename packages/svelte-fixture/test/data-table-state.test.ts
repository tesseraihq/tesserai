import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { renderAll } from "@tesserai/templates";
import { compileModule } from "svelte/compiler";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { generatedDir } from "../harness";
import { DEFAULT_SYSTEM } from "./systems";

// The Svelte fixture renders on the server, where runes don't react, so the DataTable's state helper
// (createSvelteTable) is compiled here for the client and run under Svelte's own runtime: an effect
// reads the table as the component's markup does, and must see a filter, a page and a selection
// change. Before the fix it saw none of them, and the table in a browser never moved.
const HARNESS = `import { getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel } from "@tanstack/table-core";
import { createSvelteTable } from "./data-table.svelte.js";

export function run(flush) {
  const seen = [];
  let table;
  const stop = $effect.root(() => {
    table = createSvelteTable({
      data: [
        { email: "ken@example.com", amount: 316 },
        { email: "abe@example.com", amount: 242 },
        { email: "ada@example.com", amount: 837 },
      ],
      columns: [{ accessorKey: "email" }, { accessorKey: "amount" }],
      initialState: { pagination: { pageIndex: 0, pageSize: 2 } },
      enableRowSelection: true,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
    });
    $effect(() => {
      seen.push({
        rows: table.getRowModel().rows.map((r) => r.original.email),
        selected: table.getFilteredSelectedRowModel().rows.length,
      });
    });
  });
  flush();
  table.getColumn("email").setFilterValue("ken");
  flush();
  table.getColumn("email").setFilterValue(undefined);
  flush();
  table.nextPage();
  flush();
  table.toggleAllRowsSelected(true);
  flush();
  table.setPageIndex(0);
  table.getColumn("amount").toggleSorting(true);
  flush();
  stop();
  return seen;
}
`;

async function compile(dir: string, name: string, source: string) {
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, verbatimModuleSyntax: false } }).outputText;
  await writeFile(join(dir, name), compileModule(js, { generate: "client", filename: name }).js.code);
}

describe("the Svelte DataTable's state", () => {
  it("redraws what reads it when a filter, a page, a selection or a sort changes", async () => {
    const files = await renderAll("bits-ui", DEFAULT_SYSTEM, { format: false });
    const helper = files.find((f) => f.path.endsWith("data-table/data-table.svelte.ts"));
    expect(helper).toBeDefined();
    const dir = join(generatedDir("data-table-state"), "client");
    await mkdir(dir, { recursive: true });
    await compile(dir, "data-table.svelte.js", helper!.source);
    await compile(dir, "harness.svelte.js", HARNESS);
    // Svelte's client flushSync (the "svelte" entry is its server build under Node); the module is
    // untyped, hence the specifier by variable.
    const runtime = "svelte/internal/client";
    const { flush } = (await import(/* @vite-ignore */ runtime)) as { flush: () => void };
    const { run } = (await import(pathToFileURL(join(dir, "harness.svelte.js")).href)) as { run: (flush: () => void) => { rows: string[]; selected: number }[] };
    expect(run(flush)).toEqual([
      { rows: ["ken@example.com", "abe@example.com"], selected: 0 },
      { rows: ["ken@example.com"], selected: 0 },
      { rows: ["ken@example.com", "abe@example.com"], selected: 0 },
      { rows: ["ada@example.com"], selected: 0 },
      { rows: ["ada@example.com"], selected: 3 },
      { rows: ["ada@example.com", "ken@example.com"], selected: 3 },
    ]);
  });
});
