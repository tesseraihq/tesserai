import type { GeneratedFile } from "@tesserai/templates";
import { withoutLibraryClasses } from "./dom";

// Static class parity: every element a file gives a data-slot and classes, read from the source as
// written (unformatted), with the classes resolved from string literals, string constants and cva
// functions defined in the same file. React's JSX says className, Svelte's markup says class; both
// may set a data-slot in an object ({ "data-slot": "x", class: … }). A cva imported from another
// component (Toggle Group's toggleVariants) is left out on both sides: that component is compared
// on its own.

type CvaLike = { base: unknown; variants?: Record<string, Record<string, unknown>>; compoundVariants?: Record<string, unknown>[]; defaultVariants?: Record<string, unknown> };

// Index just past the string literal starting at i.
function skipString(src: string, i: number): number {
  const quote = src[i];
  for (let j = i + 1; j < src.length; j++) {
    if (src[j] === "\\") j++;
    else if (src[j] === quote) return j + 1;
  }
  throw new Error(`unterminated string at ${i}`);
}

// The text from src[open] (an opening bracket) to its matching close, strings skipped.
function balanced(src: string, open: number): string {
  const pairs: Record<string, string> = { "(": ")", "{": "}" };
  const close = pairs[src[open]!]!;
  let depth = 0;
  for (let i = open; i < src.length; ) {
    const ch = src[i]!;
    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipString(src, i);
      continue;
    }
    if (ch === src[open]) depth++;
    else if (ch === close && --depth === 0) return src.slice(open, i + 1);
    i++;
  }
  throw new Error(`unbalanced ${src[open]} at ${open}`);
}

// The string literals in an expression, and the identifiers outside them.
function scan(expr: string): { strings: string[]; identifiers: string[] } {
  const strings: string[] = [];
  let rest = "";
  for (let i = 0; i < expr.length; ) {
    const ch = expr[i]!;
    if (ch === '"' || ch === "'" || ch === "`") {
      const end = skipString(expr, i);
      strings.push(ch === '"' ? (JSON.parse(expr.slice(i, end)) as string) : expr.slice(i + 1, end - 1));
      rest += " ";
      i = end;
      continue;
    }
    rest += ch;
    i++;
  }
  return { strings, identifiers: rest.match(/[A-Za-z_$][\w$]*/g) ?? [] };
}

const tokens = (classes: unknown): string[] => {
  const list = Array.isArray(classes) ? (classes as string[]) : String(classes ?? "").split(/\s+/);
  return [...new Set(list.filter(Boolean))].sort();
};

// A cva as sorted class sets, so either side's formatting doesn't matter.
function normalize(cva: CvaLike, extra: string[]) {
  const variants = Object.fromEntries(
    Object.entries(cva.variants ?? {}).map(([axis, values]) => [axis, Object.fromEntries(Object.entries(values).map(([value, classes]) => [value, tokens(classes)]))]),
  );
  const compound = (cva.compoundVariants ?? [])
    .map((c) => {
      const { class: cls, ...rest } = c as { class?: unknown };
      return `${JSON.stringify(Object.entries(rest).sort(([a], [b]) => a.localeCompare(b)))} ${tokens(cls).join(" ")}`;
    })
    .sort();
  return { base: tokens([...tokens(cva.base), ...extra]), variants, compound, defaults: Object.fromEntries(Object.entries(cva.defaultVariants ?? {}).sort()) };
}

// What one element's classes are: a sorted class list, or a normalized cva plus loose classes.
export type Styled = { classes: string[] } | { cva: ReturnType<typeof normalize> };

// Each data-slot's styled elements in a set of files, keyed by slot. `attribute` is the class
// attribute's name in that framework's markup. `rename` rewrites each file first (variable names).
export function styledSlots(files: GeneratedFile[], attribute: "className" | "class"): Map<string, Styled[]> {
  const out = new Map<string, Styled[]>();
  for (const { source: src } of files) {
    const cvas = new Map<string, CvaLike>();
    for (const m of src.matchAll(/const (\w+) = cva\(/g)) {
      const args = balanced(src, m.index + m[0].length - 1);
      cvas.set(m[1]!, new Function("cva", `return cva${args};`)((base: unknown, config: object) => ({ base, ...config })) as CvaLike);
    }
    const constants = new Map<string, string>();
    for (const m of src.matchAll(/const (\w+) =\s*("(?:[^"\\]|\\.)*");/g)) constants.set(m[1]!, JSON.parse(m[2]!) as string);

    // A part whose data-slot a caller can change names its default in its props: "data-slot": dataSlot = "input".
    const slotProps = new Map([...src.matchAll(/"data-slot": (\w+) = "([^"]+)"/g)].map((m) => [m[1]!, m[2]!]));
    for (const m of src.matchAll(/data-slot="([^"]+)"|"data-slot": "([^"]+)"|data-slot=\{(\w+)\}/g)) {
      const slot = m[3] === undefined ? (m[1] ?? m[2])! : slotProps.get(m[3]);
      if (slot === undefined) continue;
      // An object's own class property, else the tag it is spread on ({...{ "data-slot": "badge" }}).
      const value = (m[2] === undefined ? undefined : objectClass(src, m.index, attribute)) ?? tagClass(src, m.index, attribute);
      if (value === undefined) continue;
      const { strings, identifiers } = scan(value);
      const classes = strings.flatMap((s) => s.split(/\s+/)).filter(Boolean);
      const used: CvaLike[] = [];
      for (const id of identifiers) {
        const cva = cvas.get(id);
        if (cva !== undefined) used.push(cva);
        const constant = constants.get(id);
        if (constant !== undefined) classes.push(...constant.split(/\s+/).filter(Boolean));
      }
      if (used.length > 1) throw new Error(`${slot} combines ${used.length} cva functions`);
      // An element whose classes all come from elsewhere (a prop, another component's cva).
      if (used.length === 0 && classes.length === 0) continue;
      const own = withoutLibraryClasses(slot, classes);
      const styled: Styled = used[0] === undefined ? { classes: tokens(own) } : { cva: normalize(used[0], own) };
      out.set(slot, [...(out.get(slot) ?? []), styled]);
    }
  }
  return out;
}

// The class attribute of the tag a data-slot="…" attribute sits in.
function tagClass(src: string, at: number, attribute: string): string | undefined {
  // Back to the tag's "<", over any attribute expressions before this one.
  let depth = 0;
  let start = at;
  for (; start >= 0; start--) {
    const ch = src[start];
    if (ch === "}") depth++;
    else if (ch === "{") depth--;
    else if (ch === "<" && depth <= 0 && /[A-Za-z]/.test(src[start + 1] ?? "")) break;
  }
  // Forward to the tag's ">", collecting its class attribute.
  depth = 0;
  for (let i = start + 1; i < src.length; ) {
    const ch = src[i]!;
    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipString(src, i);
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === ">" && depth === 0) break;
    else if (depth === 0 && src.startsWith(`${attribute}=`, i) && /[\s{]/.test(src[i - 1] ?? "")) {
      const valueAt = i + attribute.length + 1;
      const value = src[valueAt] === '"' ? src.slice(valueAt, skipString(src, valueAt)) : balanced(src, valueAt);
      return value;
    }
    i++;
  }
  return undefined;
}

// The class property of the object literal a "data-slot": "…" property sits in.
function objectClass(src: string, at: number, attribute: string): string | undefined {
  let depth = 0;
  let open = at;
  for (; open >= 0; open--) {
    if (src[open] === "}") depth++;
    else if (src[open] === "{" && depth-- === 0) break;
  }
  const object = balanced(src, open);
  // A top-level `class: …` or `className: …` property, up to the next top-level comma.
  depth = 0;
  for (let i = 1; i < object.length - 1; ) {
    const ch = object[i]!;
    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipString(object, i);
      continue;
    }
    if (ch === "{" || ch === "(" || ch === "[") depth++;
    else if (ch === "}" || ch === ")" || ch === "]") depth--;
    else if (depth === 0 && object.startsWith(`${attribute}:`, i) && /[\s{,]/.test(object[i - 1] ?? "")) {
      let end = i + attribute.length + 1;
      let d = 0;
      for (; end < object.length - 1; end++) {
        const c = object[end]!;
        if (c === '"' || c === "'" || c === "`") {
          end = skipString(object, end) - 1;
          continue;
        }
        if (c === "(" || c === "{" || c === "[") d++;
        else if (c === ")" || c === "}" || c === "]") d--;
        else if (c === "," && d === 0) break;
      }
      return object.slice(i + attribute.length + 1, end);
    }
    i++;
  }
  return undefined;
}
