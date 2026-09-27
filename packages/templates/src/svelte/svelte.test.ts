import { createSystemFromBrand, parseColor } from "@tesserai/core";
import { describe, expect, it } from "vitest";
import { formatSource } from "../format";
import { dependenciesFor, renderAll, renderComponent, renderComponentFiles, supportedComponents } from "../render";

const system = createSystemFromBrand("acme", parseColor("#2563eb")!);

// React exports with no Svelte counterpart, and why.
const NOT_EXPORTED: Record<string, string> = {
  PopoverAnchor: "Bits' popover has no anchor part; its content takes a customAnchor",
  useIsMobile: "shadcn-svelte's is-mobile hook is the IsMobile class in the project's hooks folder ($HOOKS$/is-mobile.svelte.js)",
  ComboboxCollection: "Base UI's render-function collection: in Svelte the rows are written out ({#each})",
  useComboboxAnchor: "Base UI's anchor ref for the chips: in Svelte ComboboxChips anchors the list itself",
};

// The value names a React file exports: export { A, B }; and export function/const.
function reactExports(source: string): string[] {
  const names = [...source.matchAll(/^export \{([^}]*)\}/gm)].flatMap((m) => m[1]!.split(",").map((n) => n.trim()).filter((n) => n !== "" && !n.startsWith("type ")));
  return [...names, ...[...source.matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]!)];
}

// The names a Svelte barrel exports, by the name callers import.
function svelteExports(source: string): string[] {
  return [...source.matchAll(/export \{([^}]*)\}/g)].flatMap((m) =>
    m[1]!
      .split(",")
      .map((n) => n.replace(/\/\/.*$/gm, "").trim())
      .filter((n) => n !== "" && !n.startsWith("type "))
      .map((n) => n.split(/\s+as\s+/).at(-1)!.trim()),
  );
}

describe("Svelte components on Bits UI", () => {
  it("name no lint rule a project may not have, so tesserai's own lint config passes them", async () => {
    const files = await renderAll("bits-ui", system, { format: false });
    for (const file of files) expect(file.source, file.path).not.toMatch(/eslint-disable/);
  });

  it("open a sidebar button's tooltip only while the sidebar is collapsed to icons", async () => {
    // A hidden tooltip still opened on focus, and its layer took the first Escape from the mobile sheet.
    const files = await renderComponentFiles("bits-ui", system.components["sidebar"]!, system, { format: false });
    const button = files.find((f) => f.path.endsWith("sidebar-menu-button.svelte"))!.source;
    expect(button).toContain('const showsTooltip = $derived(sidebar.state === "collapsed" && !sidebar.isMobile);');
    expect(button).toContain("<Tooltip bind:open={() => tooltipOpen && showsTooltip, (open) => (tooltipOpen = open && showsTooltip)}>");
  });

  it("export every name React's output does, by its full name, beside shadcn-svelte's short one", async () => {
    for (const name of supportedComponents("bits-ui")) {
      const anatomy = system.components[name]!;
      const react = reactExports(await renderComponent("radix", anatomy, { intents: system.intents }, { format: false }));
      const index = (await renderComponentFiles("bits-ui", anatomy, system, { format: false })).find((f) => f.path.endsWith("/index.ts"))!.source;
      const svelte = new Set(svelteExports(index));
      expect(react.length, name).toBeGreaterThan(0);
      expect(react.filter((n) => !svelte.has(n) && !(n in NOT_EXPORTED)), name).toEqual([]);
      // Multi-part components also export shadcn-svelte's short names.
      if (/\bRoot\b/.test(index)) expect(index, name).toMatch(/^  Root,$/m);
    }
  });

  it("are formatted with prettier-plugin-svelte on Prettier's standalone build, and formatting is stable", async () => {
    const unformatted = await renderComponentFiles("bits-ui", system.components["dialog"]!, system, { format: false });
    const formatted = await renderComponentFiles("bits-ui", system.components["dialog"]!, system);
    const overlay = (files: typeof formatted) => files.find((f) => f.path.endsWith("dialog-overlay.svelte"))!.source;
    // The overlay's one long line is wrapped by the formatter.
    expect(overlay(formatted)).not.toBe(overlay(unformatted));
    for (const file of formatted) expect(await formatSource(file.path, file.source), file.path).toBe(file.source);
    // Every component formats once and for all.
    for (const file of (await renderAll("bits-ui", system)).filter((f) => f.path.startsWith("components/ui/"))) expect(await formatSource(file.path, file.source), file.path).toBe(file.source);
  }, 60_000);

  it("install Bits UI (2.19 on, with its date peer) and Lucide's Svelte package", () => {
    const deps = dependenciesFor(system, "bits-ui");
    expect(deps).toEqual(expect.arrayContaining(["bits-ui@^2.19", "@internationalized/date", "class-variance-authority", "clsx", "tailwind-merge", "@lucide/svelte"]));
    expect(deps).not.toContain("lucide-react");
  });
});
