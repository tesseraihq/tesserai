import { includedComponents, type DesignSystem } from "@tesserai/core";
import { applyIcons } from "../icons";
import { CATALOG, type BuildContext } from "./catalog";
import { frag, print, type Node, type PrintContext } from "./jsx";
import { PageSpec, type PageElement } from "./spec";
import { PAGE_TAG, pageTag } from "./tag";

export type PrintedPage = {
  // A React component file importing the system's components from @/components/ui/*.
  source: string;
  // Components the page uses that the system leaves out; they're replaced by their children or
  // their trigger, or dropped.
  missing: string[];
  // Problems with the spec itself (unknown types, invalid props), each naming the element.
  problems: string[];
};

// "export { Card, CardHeader, … }" of each generated component, by component name: a React
// component's file, or a Vue or Svelte component's index.ts ("default as Button", "Root as Dialog").
export function exportsOf(files: readonly { path: string; source: string }[]): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const file of files) {
    const name = /^components\/ui\/([a-z0-9-]+)(?:\.tsx|\/index\.ts)$/.exec(file.path)?.[1];
    if (name === undefined) continue;
    const list = [...file.source.matchAll(/export\s*\{([^}]*)\}/g)].flatMap((m) => (m[1] ?? "").replace(/\/\/[^\n]*/g, "").split(","));
    // Type-only exports ("type ButtonProps") aren't parts a page or an import line uses.
    const names = list.map((e) => e.trim()).filter((e) => e !== "" && !/^type\s/.test(e)).flatMap((e) => (/\sas\s/.test(e) ? [e.split(/\s+as\s+/)[1]!.trim(), ...(e.startsWith("default") ? [] : [e.split(/\s+as\s+/)[0]!.trim()])] : [e]));
    out.set(name, new Set(names));
  }
  return out;
}

// What a framework's page printer gets: the page as a tree (built the Radix way, whose shape Reka UI
// and Bits UI share), its state, and each component's exports. It returns the page's source.
export type PageState = { value: string; set: string; type: string; initial: string };
// The system comes too, for what it decides beyond the tree (its icon library). A printer says which
// framework it prints, for the few elements whose code differs by framework (a data table's columns).
export type PagePrinter = ((page: { root: Node; states: readonly PageState[]; exports: ReadonlyMap<string, ReadonlySet<string>>; name: string; system: DesignSystem }) => string) & {
  readonly framework?: "vue" | "svelte";
};

const pascal = (id: string) => id.split(/[^a-zA-Z0-9]+/).filter(Boolean).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");

// Prints a page spec as a React component for the system's library. `files` are the system's
// generated components (renderAll), so only parts that exist are imported.
// Every export name, for checking a page where the generated files aren't at hand.
const EVERY_NAME: ReadonlySet<string> = { has: () => true } as unknown as ReadonlySet<string>;

// A page's problems and left-out components, without the generated files: what the server checks a
// page from the AI against before anyone sees it. Every included component counts as present.
export function checkPage(input: unknown, system: DesignSystem): Pick<PrintedPage, "missing" | "problems"> {
  const { missing, problems } = printPage(input, system, new Map(Object.keys(includedComponents(system)).map((c) => [c, EVERY_NAME])));
  return { missing, problems };
}

export function printPage(
  input: unknown,
  system: DesignSystem,
  files: readonly { path: string; source: string }[] | ReadonlyMap<string, ReadonlySet<string>>,
  name = "page",
  // For the builder's preview: each element tagged for inspect mode (see tag.ts). `printer` prints
  // it for Vue or Svelte instead of React (vue/page.ts, svelte/page.ts), from their generated files.
  { tag = false, printer }: { tag?: boolean; printer?: PagePrinter } = {},
): PrintedPage {
  const parsed = PageSpec.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { source: "", missing: [], problems: [issue === undefined ? "not a page spec" : `${issue.path.join(".")}: ${issue.message}`] };
  }
  const spec = parsed.data;
  const exports = files instanceof Map ? (files as ReadonlyMap<string, ReadonlySet<string>>) : exportsOf(files as readonly { path: string; source: string }[]);
  const included = includedComponents(system);
  const missing = new Set<string>();
  const problems: string[] = [];
  const states: PageState[] = [];
  const ids = new Map<string, string>();

  const base: Omit<BuildContext, "key" | "field" | "overlay" | "inShell"> = {
    // Vue's and Svelte's components are Radix-shaped (asChild triggers, Radix's prop names).
    base: printer === undefined ? system.base : "radix",
    framework: printer === undefined ? "react" : (printer.framework ?? "react"),
    idFor: (key, hint) => {
      const known = ids.get(key);
      if (known !== undefined) return known;
      const slug = hint.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "field";
      const taken = new Set(ids.values());
      let id = slug;
      for (let n = 2; taken.has(id); n++) id = `${slug}-${n}`;
      ids.set(key, id);
      return id;
    },
    has: (component, exportName) => {
      const names = exports.get(component);
      return names !== undefined && (exportName === undefined || names.has(exportName));
    },
    axis: (component, axis) => included[component]?.axes[axis]?.enabled,
    intents: Object.keys(system.intents),
    state: (stateName, type, initial) => {
      // Each state gets its own name, so two selectable tables don't share one.
      let value = stateName;
      for (let n = 2; states.some((s) => s.value === value); n++) value = `${stateName}${n}`;
      const set = `set${value.charAt(0).toUpperCase()}${value.slice(1)}`;
      states.push({ value, set, type, initial });
      return { value, set };
    },
  };

  const build = (key: string, inherited: Pick<BuildContext, "field" | "overlay" | "inShell">, parent: string | undefined): Node => {
    const element: PageElement = spec.elements[key]!;
    const entry = CATALOG[element.type];
    const ctx: BuildContext = { ...base, ...inherited, key };
    if (entry === undefined) {
      problems.push(`${key}: there's no "${element.type}" in the catalog`);
      return frag();
    }
    if (entry.parents !== undefined && (parent === undefined || !entry.parents.includes(parent))) {
      problems.push(`${key} (${element.type}): only goes in ${entry.parents.join(" or ")}`);
      return frag();
    }
    const props = entry.props.safeParse(Object.fromEntries(Object.entries(element.props).filter(([k]) => !(entry.axes ?? []).includes(k as never))));
    if (!props.success) {
      const issue = props.error.issues[0];
      problems.push(`${key} (${element.type}): ${issue === undefined ? "invalid props" : `${issue.path.join(".") || "props"}: ${issue.message}`}`);
      return frag();
    }
    // The axes aren't in the schema (they depend on the system); they pass through and are checked
    // against the system's options when built.
    const all = { ...props.data, ...Object.fromEntries(Object.entries(element.props).filter(([k]) => (entry.axes ?? []).includes(k as never))) };
    // Content where this type takes none is a problem to report, not something to drop quietly.
    const childKeys = element.children ?? [];
    if (childKeys.length > 0 && entry.children !== true) problems.push(`${key} (${element.type}): takes no children`);
    const slotNames = entry.slotsFrom?.(all) ?? entry.slots ?? [];
    for (const slot of Object.keys(element.slots ?? {})) {
      if (!slotNames.includes(slot)) problems.push(`${key} (${element.type}): has no slot "${slot}"${slotNames.length > 0 ? ` (slots: ${slotNames.join(", ")})` : ""}`);
    }
    // A left-out component isn't there to set context for its children: they're built as if its
    // content sat directly in its parent (a Page in a left-out app shell is a full page).
    const present = entry.component === undefined || exports.has(entry.component);
    const inner = present ? { ...inherited, ...(entry.inner?.(all, ctx) ?? {}) } : inherited;
    // Content a left-out component drops isn't built at all (a left-out Table's rows would
    // otherwise complain they aren't in a Table).
    const keepsChildren = present || entry.fallback === "children";
    const children = entry.children === true && keepsChildren ? childKeys.map((k) => build(k, inner, present ? element.type : parent)) : [];
    const slots = Object.fromEntries(
      Object.entries(element.slots ?? {})
        .filter(([slot]) => slotNames.includes(slot) && (present || (slot === "trigger" && entry.fallback === "trigger")))
        .map(([slot, keys]) => [slot, keys.map((k) => build(k, slot === "trigger" ? inherited : inner, element.type))]),
    );
    if (entry.childTypes !== undefined) {
      for (const k of childKeys) {
        const type = spec.elements[k]!.type;
        if (!entry.childTypes.includes(type)) problems.push(`${k} (${type}): can't go in ${element.type}, which takes ${entry.childTypes.join(" or ")}`);
      }
    }
    if (!present) {
      missing.add(entry.component!);
      if (entry.fallback === "children") return frag(...children);
      if (entry.fallback === "trigger") return frag(...(slots["trigger"] ?? []));
      return frag();
    }
    const node = entry.build(all, { children, slots }, ctx);
    if (tag && node.k === "el") node.props[PAGE_TAG] = pageTag(element.type, key);
    return node;
  };

  const tree = build(spec.root, { field: undefined, overlay: undefined, inShell: false }, undefined);
  if (printer !== undefined) return { source: printer({ root: tree, states, exports, name, system }), missing: [...missing].sort(), problems };
  const ctx: PrintContext = { base: system.base, exports, imports: new Map() };
  // A root that's several siblings (a left-out wrapper leaves its children) needs a fragment.
  const root = tree.k === "frag" && tree.children.length === 1 ? tree.children[0]! : tree;
  const body = root.k === "frag" ? `    <>\n${print(ctx, root, "      ")}\n    </>` : print(ctx, root, "    ");
  const imports = [...ctx.imports.entries()]
    .sort(([a], [b]) => (a === "lucide-react" ? -1 : b === "lucide-react" ? 1 : a.localeCompare(b)))
    .map(([module, names]) => `import { ${[...names].sort().join(", ")} } from "${module}";`);
  // Named after the page, unless that's a part it imports (a page called "breadcrumb" uses BreadcrumbPage).
  const taken = new Set([...ctx.imports.values()].flatMap((names) => [...names]));
  let component = `${pascal(name)}Page`;
  for (let n = 2; taken.has(component); n++) component = `${pascal(name)}Page${n}`;
  const source = [
    `// ${component}: generated by tesserai from a page spec, using this system's components.`,
    ...(states.length > 0 ? ['import * as React from "react";'] : []),
    ...imports,
    "",
    `export default function ${component}() {`,
    ...states.map((s) => `  const [${s.value}, ${s.set}] = React.useState<${s.type}>(${s.initial});`),
    "  return (",
    body,
    "  );",
    "}",
    "",
  ].join("\n");
  return { source: applyIcons(source, "page", system), missing: [...missing].sort(), problems };
}
