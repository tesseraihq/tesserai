import { applyChangeset, PRESETS, sanitizeSvg, type DesignSystem } from "@tesserai/core";
import { ICON_TABLE, lucideSveltePath, phosphorSveltePath, remixName, remixSveltePath, renderAll, tablerSveltePath } from "@tesserai/templates";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FIXTURE_DIR, svelteCheck } from "../harness";

// Whether a module specifier reaches a typed file through its package's export map, in the
// fixture's installed packages, as TypeScript resolves it for svelte-check: each condition in turn
// (Lucide's aliases, loader-2 and the like, miss the "types" pattern and resolve through
// "svelte" to a .js with its own .d.ts).
function resolves(specifier: string): boolean {
  const parts = specifier.split("/");
  const name = specifier.startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0]!;
  const sub = `.${specifier.slice(name.length)}`;
  const dir = join(FIXTURE_DIR, "node_modules", name);
  const exports = (JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as { exports: Record<string, string | Record<string, unknown>> }).exports;
  const typed = (file: string) => {
    const path = join(dir, file);
    if (!existsSync(path)) return false;
    return !file.endsWith(".js") || existsSync(path.replace(/\.js$/, ".d.ts"));
  };
  for (const [key, target] of Object.entries(exports)) {
    const star = key.indexOf("*");
    const head = star === -1 ? key : key.slice(0, star);
    const tail = star === -1 ? "" : key.slice(star + 1);
    if (star === -1 ? key !== sub : !(sub.startsWith(head) && sub.endsWith(tail) && sub.length >= head.length + tail.length)) continue;
    const files = typeof target === "string" ? [target] : ["types", "svelte", "import", "default"].map((c) => target[c]).filter((t): t is string => typeof t === "string");
    return files.some((file) => typed(star === -1 ? file : file.replace("*", sub.slice(head.length, sub.length - tail.length))));
  }
  return false;
}

describe("every icon the templates draw is in each library's Svelte package", () => {
  const rows = Object.entries(ICON_TABLE);

  it("resolves the module check itself", () => {
    expect(resolves(lucideSveltePath("chevron-down"))).toBe(true);
    expect(resolves(lucideSveltePath("no-such-icon"))).toBe(false);
  });

  it.each(rows)("%s", async (meaning, row) => {
    const missing = [
      lucideSveltePath(meaning),
      tablerSveltePath(row.tabler),
      phosphorSveltePath(row.phosphor),
      remixSveltePath(remixName(row, "regular")),
      remixSveltePath(remixName(row, "fill")),
    ].filter((specifier) => !resolves(specifier));
    const hugeicons = (await import("@hugeicons/core-free-icons")) as Record<string, unknown>;
    if (!(row.hugeicons in hugeicons)) missing.push(`@hugeicons/core-free-icons#${row.hugeicons}`);
    expect(missing).toEqual([]);
  });
});

// Two of the system's own icons: a one-color mark, and a logo with a dark version.
const svg = (color: string) => {
  const cleaned = sanitizeSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 24"><path fill="${color}" d="M0 0h48v24H0z"/><circle fill="#f59e0b" cx="12" cy="12" r="6"/></svg>`, { currentColor: false });
  if (!cleaned.ok) throw new Error(cleaned.problem);
  return cleaned.icon.svg;
};
const mark = sanitizeSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>`);
if (!mark.ok) throw new Error(mark.problem);

function withOps(ops: { op: string; input: unknown }[]): DesignSystem {
  const applied = applyChangeset(PRESETS[0]!.build(), { summary: "icons", ops } as never);
  if (!applied.ok) throw new Error(`the icon operations don't apply: ${applied.error}`);
  return applied.system;
}

const SYSTEMS: [string, DesignSystem][] = [
  ["tabler", withOps([{ op: "icons.setLibrary", input: { library: "tabler" } }, { op: "icons.setStroke", input: { stroke: 1.5 } }])],
  ["phosphor", withOps([{ op: "icons.setLibrary", input: { library: "phosphor" } }, { op: "icons.setWeight", input: { weight: "bold" } }])],
  ["hugeicons", withOps([{ op: "icons.setLibrary", input: { library: "hugeicons" } }, { op: "icons.setStroke", input: { stroke: 1.5 } }])],
  ["remix", withOps([{ op: "icons.setLibrary", input: { library: "remix" } }, { op: "icons.setWeight", input: { weight: "fill" } }])],
  [
    "custom",
    withOps([
      { op: "icons.addCustom", input: { id: "acme-mark", icon: { name: "Acme mark", svg: mark.icon.svg } } },
      { op: "icons.addCustom", input: { id: "acme-logo", icon: { name: "Acme logo", svg: svg("#111827"), dark: svg("#f9fafb") } } },
      { op: "icons.setSpot", input: { spot: "dialog:x", icon: "custom:acme-mark" } },
      { op: "icons.setSpot", input: { spot: "spinner:loader-2", icon: "custom:acme-logo" } },
    ]),
  ],
];

// Draws the system's own icons as an app would, so their index and props are checked too.
const USAGE = {
  path: "usage.svelte",
  source: `<script lang="ts">
  import { AcmeLogoIcon, AcmeMarkIcon } from "$COMPONENTS$/icons/index.js";
</script>

<AcmeLogoIcon class="size-6" aria-label="Acme" role="img" />
<AcmeMarkIcon width={16} height={16} />
`,
};

describe.each(SYSTEMS)("the generated Svelte components on %s icons", (label, system) => {
  it("pass svelte-check, strict, with warnings failing", async () => {
    const files = await renderAll("bits-ui", system);
    const extra = label === "custom" ? [USAGE] : [];
    const diagnostics = await svelteCheck(`icons-${label}`, [...files, ...extra]);
    expect(diagnostics.map((d) => `${d.file}:${d.line} ${d.severity}: ${d.message}`)).toEqual([]);
  }, 180_000);
});
