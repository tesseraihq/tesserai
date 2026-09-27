import type { Base } from "@tesserai/core";
import { RAC_SHAPES, REACT_ARIA_PROPS } from "../compose";

// The tree a page is built as before it's printed: elements written the Base UI / Radix way (X is
// the root, XTrigger the button, XContent the panel), which printing turns into each library's own
// code. One tree, so what the preview runs and what "copy code" gives are the same code.

export type Prop = string | number | boolean | { expr: string } | { node: Node } | undefined;
export type Element = {
  k: "el";
  tag: string;
  // The generated component the tag comes from ("sheet"); none for HTML elements.
  from?: string;
  props: Record<string, Prop>;
  children: Node[];
};
// The element that opens an overlay, around the child that shows it: Base UI's render prop, Radix's
// asChild, or in React Aria nothing at all (the root finds its pressable child itself).
// `slot` is the part React Aria's child plays (a disclosure's "trigger").
// `compose` prints it as another library would (React Aria's drawer is Base UI's).
export type Trigger = { k: "trigger"; from: string; as: string; close?: boolean; slot?: string; compose?: Base; child: Node };
// An import that code in an expression uses (a toast() call, a render function's item), printing nothing.
export type Use = { k: "use"; from: string; name: string };
export type Node = Element | Trigger | Use | { k: "text"; text: string } | { k: "expr"; code: string } | { k: "frag"; children: Node[] };

export const el = (tag: string, from: string | undefined, props: Record<string, Prop> = {}, ...children: (Node | string | null | false | undefined)[]): Element => ({
  k: "el",
  tag,
  ...(from === undefined ? {} : { from }),
  props,
  children: children.filter((c): c is Node | string => c !== null && c !== false && c !== undefined).map((c) => (typeof c === "string" ? { k: "text", text: c } : c)),
});
export const html = (tag: string, props: Record<string, Prop> = {}, ...children: (Node | string | null | false | undefined)[]) => el(tag, undefined, props, ...children);
export const frag = (...children: (Node | null | false | undefined)[]): Node => ({ k: "frag", children: children.filter((c): c is Node => c !== null && c !== false && c !== undefined) });
export const expr = (code: string): { expr: string } => ({ expr: code });
export const text = (value: string): Node => ({ k: "text", text: value });

export type PrintContext = {
  base: Base;
  // Each generated component's exports, so a part a library doesn't have is never imported.
  exports: ReadonlyMap<string, ReadonlySet<string>>;
  // Filled while printing: what to import from where.
  imports: Map<string, Set<string>>;
};

// React Aria's name for an overlay part: the root becomes XTrigger, the panel XContent or X.
function racName(ctx: PrintContext, from: string, tag: string): string | null {
  const names = ctx.exports.get(from);
  for (const shape of RAC_SHAPES) {
    if (names === undefined || !names.has(`${shape}Trigger`)) continue;
    if (tag === shape) return `${shape}Trigger`;
    if (tag === `${shape}Content`) return names.has(`${shape}Content`) ? `${shape}Content` : shape;
  }
  return null;
}

function nameFor(ctx: PrintContext, node: Element): string {
  if (node.from === undefined) return node.tag;
  const name = ctx.base === "react-aria" ? (racName(ctx, node.from, node.tag) ?? node.tag) : node.tag;
  // "pkg:<name>" is a package's own export (React Aria's Pressable, sonner's toast).
  const module = node.from === "lucide-react" ? "lucide-react" : node.from.startsWith("pkg:") ? node.from.slice(4) : `@/components/ui/${node.from}`;
  if (!ctx.imports.has(module)) ctx.imports.set(module, new Set());
  ctx.imports.get(module)!.add(name);
  return name;
}

const jsxText = (value: string) => (/[{}<>]/.test(value) || value !== value.trim() ? `{${JSON.stringify(value)}}` : value);

function printProps(ctx: PrintContext, node: Element, indent: string): string {
  const renames = ctx.base === "react-aria" && node.from !== undefined ? (REACT_ARIA_PROPS[node.tag] ?? {}) : {};
  const out: string[] = [];
  for (const [key, value] of Object.entries(node.props)) {
    if (value === undefined || value === false) continue;
    const name = renames[key] ?? key;
    if (value === true) out.push(name);
    else if (typeof value === "string") out.push(`${name}=${/["\\\n]/.test(value) ? `{${JSON.stringify(value)}}` : `"${value}"`}`);
    else if (typeof value === "number") out.push(`${name}={${value}}`);
    else if ("expr" in value) out.push(`${name}={${value.expr}}`);
    else out.push(`${name}={${print(ctx, value.node, indent).trimStart()}}`);
  }
  return out.length === 0 ? "" : ` ${out.join(" ")}`;
}

export function print(ctx: PrintContext, node: Node, indent = ""): string {
  switch (node.k) {
    case "text":
      return `${indent}${jsxText(node.text)}`;
    case "expr":
      return `${indent}{${node.code}}`;
    case "frag":
      return node.children.map((c) => print(ctx, c, indent)).filter((line) => line !== "").join("\n");
    case "use":
      nameFor(ctx, { k: "el", tag: node.name, from: node.from, props: {}, children: [] });
      return "";
    case "trigger": {
      const base = node.compose ?? ctx.base;
      if (base === "react-aria") {
        // The root finds its pressable child; a close button is any button in the "close" slot.
        const slot = node.close ? "close" : node.slot;
        const child = slot !== undefined && node.child.k === "el" ? { ...node.child, props: { ...node.child.props, slot } } : node.child;
        return print(ctx, child, indent);
      }
      const as = nameFor(ctx, { k: "el", tag: node.as, from: node.from, props: {}, children: [] });
      if (base === "radix") return `${indent}<${as} asChild>\n${print(ctx, node.child, `${indent}  `)}\n${indent}</${as}>`;
      return `${indent}<${as} render={${print(ctx, node.child, `${indent}  `).trimStart()}} />`;
    }
    case "el": {
      const name = nameFor(ctx, node);
      const props = printProps(ctx, node, `${indent}  `);
      if (node.children.length === 0) return `${indent}<${name}${props} />`;
      if (node.children.length === 1 && node.children[0]!.k === "text") return `${indent}<${name}${props}>${jsxText((node.children[0] as { text: string }).text)}</${name}>`;
      const inner = node.children.map((c) => print(ctx, c, `${indent}  `)).filter((line) => line !== "");
      if (inner.length === 0) return `${indent}<${name}${props} />`;
      return `${indent}<${name}${props}>\n${inner.join("\n")}\n${indent}</${name}>`;
    }
  }
}
