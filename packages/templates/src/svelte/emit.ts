import type { CvaConfig } from "../factor";
import { classString, cvaSource } from "../codegen";
import { LUCIDE_PACKAGES, meaningOf } from "../icons";
import type { GeneratedFile } from "../render";

// Svelte files keep every class literal in <script> (the cva config, or a `classes` constant) and
// only reference them in markup, so a class prefix can be applied to the script alone.

export const UTILS_IMPORT = (names: string[]) => `import { ${names.join(", ")} } from "$UTILS$.js";`;

// A Lucide icon by the name the React templates use (XIcon), imported one icon per module as
// shadcn-svelte does, so a bundler loads only what's drawn.
export function lucideImport(name: string): string {
  return `import ${name} from "${LUCIDE_PACKAGES.svelte}/icons/${meaningOf(name)}";`;
}

// Another generated component's barrel: `import { Button } from "$UI$/button/index.js";`.
export const uiImport = (component: string, names: string[]) => `import { ${names.join(", ")} } from "$UI$/${component}/index.js";`;

// A Bits UI namespace under shadcn-svelte's local name: `import { Dialog as DialogPrimitive } from "bits-ui";`.
export const bitsImport = (namespace: string, local = `${namespace}Primitive`) => `import { ${namespace} as ${local} } from "bits-ui";`;

export const indent = (text: string, by = "  ") => text.replace(/^(?=.)/gm, by);

// A class list as a quoted string, and a cva, for a file's script.
export const quoted = (classes: string[]) => classString(classes);
export const cva = (name: string, config: CvaConfig) => cvaSource(name, config);

// One of the thin files most parts are (shadcn-svelte's layout): a Bits part or an element with its
// data-slot, the system's classes merged with the caller's `class`, and a bindable ref.
export type PartFile = {
  path: string;
  imports: string[];
  // Names imported from the project's utils besides cn ("type WithElementRef").
  utils?: string[];
  props: string;
  // "DialogPrimitive.Title", or an element ("div") that renders its children.
  tag: string;
  element?: boolean;
  slot?: string;
  // A quoted class string, from the class helpers.
  classes?: string;
  // Parts without an element of their own (Root, Portal) have no ref.
  ref?: boolean;
  // Values the caller can bind, with their initial value: { open: "false" }.
  bindable?: Record<string, string>;
  // Other props taken out of restProps, before it: ["size = \"md\""].
  destructure?: string[];
  // Script lines after $props() ($derived values and the like).
  script?: string[];
  // Other string constants for the script, by name: { itemClasses: "\"…\"" }.
  constants?: Record<string, string>;
  // What `class` is set to, when it isn't cn(classes, className).
  classExpr?: string;
  // Attributes after the data-slot and before {...restProps}.
  attrs?: string[];
  // Markup inside the tag; an element renders its children by default.
  inner?: string;
  // Whether children is taken out of restProps (it is when inner renders it).
  children?: boolean;
};

export function partFile(p: PartFile): GeneratedFile {
  const ref = p.ref ?? true;
  const inner = p.inner ?? (p.element ? "{@render children?.()}" : undefined);
  const takesChildren = p.children ?? (inner?.includes("children") ?? false);
  const styled = p.classes !== undefined || p.classExpr !== undefined;
  const props = [
    ...(ref ? ["ref = $bindable(null)"] : []),
    ...(styled ? ["class: className"] : []),
    ...Object.entries(p.bindable ?? {}).map(([name, initial]) => `${name} = $bindable(${initial})`),
    ...(p.destructure ?? []),
    ...(takesChildren ? ["children"] : []),
    "...restProps",
  ];
  const attrs = [
    ...(ref ? [p.element ? "bind:this={ref}" : "bind:ref"] : []),
    ...Object.keys(p.bindable ?? {}).map((name) => `bind:${name}`),
    ...(p.slot === undefined ? [] : [`data-slot="${p.slot}"`]),
    ...(p.attrs ?? []),
    ...(styled ? [`class={${p.classExpr ?? "cn(classes, className)"}}`] : []),
    "{...restProps}",
  ].join(" ");
  const utils = [...(styled ? ["cn"] : []), ...(p.utils ?? [])];
  const imports = [...p.imports, ...(utils.length === 0 ? [] : [UTILS_IMPORT(utils)])];
  const constants = { ...(p.classes === undefined ? {} : { classes: p.classes }), ...(p.constants ?? {}) };
  const constantLines = Object.entries(constants).map(([name, value]) => `  const ${name} = ${value};`);
  const markup = inner === undefined ? `<${p.tag} ${attrs} />` : inner === "" ? `<${p.tag} ${attrs}></${p.tag}>` : `<${p.tag} ${attrs}>\n${indent(inner)}\n</${p.tag}>`;
  return {
    path: p.path,
    source: `<script lang="ts">
${imports.map((i) => `  ${i}`).join("\n")}
${constantLines.length === 0 ? "" : `\n${constantLines.join("\n")}\n`}
  let { ${props.join(", ")} }: ${p.props} = $props();
${(p.script ?? []).map((line) => `  ${line}`).join("\n")}
</script>

${markup}
`,
  };
}

// A .svelte file written out: an optional module script (cvas and types index.ts re-exports), the
// instance script and the markup.
export function svelteFile(path: string, parts: { module?: string; script: string; markup: string }): GeneratedFile {
  const module = parts.module === undefined ? "" : `<script lang="ts" module>\n${indent(parts.module.trim())}\n</script>\n\n`;
  return { path, source: `${module}<script lang="ts">\n${indent(parts.script.trim())}\n</script>\n\n${parts.markup.trim()}\n` };
}

export type IndexPart = { file: string; short: string; full: string };

// index.ts as shadcn-svelte writes it: each part by its short name (Root, Content) and by its full
// one (Dialog, DialogContent), so either import style keeps working. `extra` re-exports a file's
// module-script names (variants, types) under one name.
export function indexFile(path: string, parts: IndexPart[], extra: { file: string; names: string[] }[] = []): GeneratedFile {
  const extras = extra.map((e) => `export { ${e.names.join(", ")} } from "./${e.file}";\n`).join("");
  return {
    path,
    source: `${parts.map((p) => `import ${p.short} from "./${p.file}";`).join("\n")}
${extras === "" ? "" : `\n${extras}`}
export {
${parts.map((p) => `  ${p.short},`).join("\n")}
  //
${parts.filter((p) => p.short !== p.full).map((p) => `  ${p.short} as ${p.full},`).join("\n")}
};
`,
  };
}

// Parts from [file, short, full] rows, the file under the component's folder.
export const indexParts = (rows: [string, string, string][]): IndexPart[] => rows.map(([file, short, full]) => ({ file, short, full }));
