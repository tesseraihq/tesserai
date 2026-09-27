import { COMPONENT_ABOUT, COMPONENT_GROUPS, componentName, fullSelection, includedComponents, requirementsOf, type Base, type DesignSystem } from "@tesserai/core";
import { exportsOf } from "./pages/print";
import { pagePrinting } from "./printers";
import { BASE_DEPS, COMPONENT_DEPS, renderComponent, renderComponentFiles, supportedComponents, targetFramework, type Target } from "./render";
import { exampleSource } from "./storybook";
import { resolveSveltePlaceholders } from "./svelte/placeholders";

// How to use each component of a system: the import, the parts it exports, its options with the
// defaults, and what it brings with it. Read from the generated code, so it matches it exactly.

export type ComponentDoc = {
  name: string;
  title: string;
  group: string;
  // What it's for, in a sentence.
  about: string;
  // An example of it in use, as code for the system's library (null for one without).
  example: string | null;
  exports: string[];
  importLine: string;
  props: { name: "variant" | "intent" | "size"; options: string[]; default: string | undefined }[];
  requires: string[];
  packages: string[];
};

export async function componentDocs(system: DesignSystem, target: Target = system.base): Promise<ComponentDoc[]> {
  const supported = new Set(supportedComponents(target));
  const framework = targetFramework(target);
  const out: ComponentDoc[] = [];
  const files: { path: string; source: string }[] = [];
  for (const anatomy of Object.values(includedComponents(system))) {
    if (!supported.has(anatomy.name)) continue;
    let exports: string[];
    if (framework === "react") {
      const source = await renderComponent(target as Base, anatomy, { intents: system.intents }, { format: false });
      files.push({ path: `components/ui/${anatomy.name}.tsx`, source });
      const exported = /export\s*\{([^}]*)\}/.exec(source)?.[1] ?? "";
      exports = exported
        .split(",")
        .map((e) => e.trim().replace(/^type\s+/, ""))
        .filter(Boolean);
    } else {
      // A folder: its index.ts says what it exports. Svelte's also exports short names (Root,
      // Trigger); the docs show the full ones, which start with the component's.
      const own = await renderComponentFiles(target, anatomy, system, { format: false });
      files.push(...own);
      const pascal = anatomy.name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
      exports = [...(exportsOf(own).get(anatomy.name) ?? [])].filter((e) => framework !== "svelte" || e.startsWith(pascal) || /^[a-z]/.test(e));
    }
    const main = exports.filter((e) => !/Variants$/.test(e) && /^[A-Z]/.test(e));
    const defaults = fullSelection(anatomy, {});
    const group = COMPONENT_GROUPS.find((g) => (g.components as readonly string[]).includes(anatomy.name));
    const from = framework === "svelte" ? `$lib/components/ui/${anatomy.name}/index.js` : `@/components/ui/${anatomy.name}`;
    out.push({
      name: anatomy.name,
      title: componentName(anatomy.name),
      group: group?.label ?? "Other",
      about: COMPONENT_ABOUT[anatomy.name] ?? "",
      example: null,
      exports,
      importLine: `import { ${main.slice(0, 4).join(", ")}${main.length > 4 ? ", …" : ""} } from "${from}";`,
      props: (["variant", "intent", "size"] as const)
        .filter((axis) => anatomy.axes[axis] !== undefined)
        .map((axis) => ({ name: axis, options: anatomy.axes[axis]!.enabled, default: defaults[axis] })),
      requires: [...requirementsOf(anatomy.name)],
      packages: [...new Set([...(COMPONENT_DEPS[anatomy.name]?.[target] ?? []), BASE_DEPS[target][0]!])],
    });
  }
  // In the order shadcn's docs use: by group, then as each group lists them.
  const order = (name: string) => {
    const g = COMPONENT_GROUPS.findIndex((x) => (x.components as readonly string[]).includes(name));
    const i = g === -1 ? 999 : (COMPONENT_GROUPS[g]!.components as readonly string[]).indexOf(name);
    return (g === -1 ? COMPONENT_GROUPS.length : g) * 1000 + i;
  };
  // Examples use other components (a Field around an Input), so they're printed once all are known.
  // A framework without a page printer yet has no examples rather than React ones.
  const printing = pagePrinting(target);
  // Docs are read and copied, so Svelte's import placeholders read as a SvelteKit project's ($lib).
  const shown = (source: string | null) => (source === null || framework !== "svelte" ? source : resolveSveltePlaceholders(source));
  // React examples in the library asked for, not the system's own (asChild on Radix, render on Base UI).
  const printedFor = framework === "react" ? { ...system, base: target as Base } : system;
  for (const doc of out) doc.example = printing === null ? null : shown(exampleSource(printedFor, files, doc.name, printing.printer));
  return out.sort((a, b) => order(a.name) - order(b.name));
}
