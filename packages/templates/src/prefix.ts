import { prefixClass, prefixClassList } from "@tesserai/core";
import type { GeneratedFile } from "./render";
import { scanSvelte, skipExpression } from "./svelte/scan";

// A Tailwind class prefix applied to generated code (acme → acme:bg-primary, acme:hover:bg-primary):
// every class where code gives classes, found in the parsed source rather than by pattern, so a
// string that isn't a class list (a data-slot, a label, a variant name) is never touched. The
// preview renders the same pixels without it, so only code people take away goes through this.

// Functions whose arguments are class lists.
const CLASS_FUNCTIONS = new Set(["cn", "clsx", "cx", "twMerge", "twJoin"]);
// Functions whose first argument is the base classes and second a config of variants (cva, and
// tailwind-variants' tv).
const VARIANT_FUNCTIONS = new Set(["cva", "tv"]);
const CLASS_PROPS = new Set(["className", "class"]);
// Props and keys holding a map of part → classes (Sonner's toastOptions.classNames, react-day-picker's).
const CLASS_MAP_PROPS = new Set(["classNames"]);

type Node = { type: string; range: [number, number]; [key: string]: unknown };
type Edit = { start: number; end: number; text: string };

const isNode = (v: unknown): v is Node => typeof v === "object" && v !== null && typeof (v as { type?: unknown }).type === "string";
const keyName = (key: unknown): string | undefined => {
  if (!isNode(key)) return undefined;
  if (key.type === "Identifier") return key["name"] as string;
  if (key.type === "Literal" && typeof key["value"] === "string") return key["value"];
  return undefined;
};

// A TSX or TS file, prefixed.
export async function prefixSource(source: string, prefix: string): Promise<string> {
  return applyEdits(source, await prefixEdits(source, prefix));
}

function applyEdits(source: string, edits: Edit[]): string {
  let out = source;
  for (const e of [...edits].sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
}

// The edits that prefix a TSX or TS program's classes.
async function prefixEdits(source: string, prefix: string): Promise<Edit[]> {
  const typescript = await import("prettier/plugins/typescript");
  // The parser reads no options for plain TSX; prettier's type asks for the printer's too.
  const ast = (await typescript.parsers.typescript.parse(source, {} as Parameters<typeof typescript.parsers.typescript.parse>[1])) as unknown as Node;
  const edits = new Map<number, Edit>();
  // Constants used where classes go: `className={indicatorClassName}` (a class list) or
  // `cn(SIZES[size])` (a map of them). Their values are classes too.
  const lists = new Set<string>();
  const maps = new Set<string>();
  const edit = (start: number, end: number, text: string) => {
    if (!edits.has(start)) edits.set(start, { start, end, text });
  };

  // A string literal: the text between its quotes, each class prefixed.
  const literal = (node: Node) => {
    const [start, end] = node.range;
    const inner = source.slice(start + 1, end - 1);
    edit(start + 1, end - 1, prefixClassList(inner, prefix));
  };

  // An expression that evaluates to classes.
  const classes = (node: unknown): void => {
    if (!isNode(node)) return;
    switch (node.type) {
      case "Literal":
        if (typeof node["value"] === "string") literal(node);
        return;
      case "TemplateLiteral": {
        const quasis = node["quasis"] as Node[];
        const expressions = node["expressions"] as Node[];
        quasis.forEach((quasi, i) => {
          const [start, end] = quasi.range;
          const text = source.slice(start, end);
          // A class that starts right after ${…} continues that value (`${size}-4`): not a class of
          // its own. One that runs into the next ${…} (`size-${n}`) is, and takes the prefix.
          const out = text.replace(/\S+/g, (token, at: number) => (i > 0 && at === 0 ? token : prefixClass(token, prefix)));
          if (out !== text) edit(start, end, out);
          // An expression standing as its own class (`flex ${active ? "bg-x" : ""}`) is classes too.
          const next = expressions[i];
          if (next !== undefined && (text === "" ? i === 0 : /\s$/.test(text))) classes(next);
        });
        return;
      }
      case "ConditionalExpression":
        classes(node["consequent"]);
        classes(node["alternate"]);
        return;
      case "LogicalExpression":
        classes(node["left"]);
        classes(node["right"]);
        return;
      case "ArrayExpression":
        for (const element of node["elements"] as unknown[]) classes(element);
        return;
      // clsx({ "bg-x": active }): the keys are the classes.
      case "ObjectExpression":
        for (const property of node["properties"] as Node[]) {
          const key = property["key"];
          if (property.type === "Property" && isNode(key) && key.type === "Literal" && typeof key["value"] === "string") literal(key);
        }
        return;
      case "Identifier":
        lists.add(node["name"] as string);
        return;
      case "MemberExpression": {
        const object = node["object"];
        if (isNode(object) && object.type === "Identifier") maps.add(object["name"] as string);
        return;
      }
      case "JSXExpressionContainer":
      case "TSAsExpression":
      case "TSSatisfiesExpression":
      case "ParenthesizedExpression":
        classes(node["expression"]);
        return;
      default:
        return;
    }
  };

  // cva's and tv's config: each variant option's classes, compound variants' class, tv's slots.
  const variantConfig = (node: unknown) => {
    if (!isNode(node) || node.type !== "ObjectExpression") return;
    for (const property of node["properties"] as Node[]) {
      if (property.type !== "Property") continue;
      const name = keyName(property["key"]);
      const value = property["value"];
      if (name === "base") classes(value);
      else if (name === "variants" && isNode(value) && value.type === "ObjectExpression") {
        for (const group of value["properties"] as Node[]) {
          const options = group["value"];
          if (isNode(options) && options.type === "ObjectExpression") for (const option of options["properties"] as Node[]) classes(option["value"]);
        }
      } else if (name === "compoundVariants" && isNode(value) && value.type === "ArrayExpression") {
        for (const compound of value["elements"] as Node[]) {
          if (!isNode(compound) || compound.type !== "ObjectExpression") continue;
          for (const p of compound["properties"] as Node[]) if (CLASS_PROPS.has(keyName(p["key"]) ?? "")) classes(p["value"]);
        }
      } else if (name === "slots" && isNode(value) && value.type === "ObjectExpression") {
        for (const slot of value["properties"] as Node[]) classes(slot["value"]);
      }
      // defaultVariants name options, not classes.
    }
  };

  // A map's values: classes, or maps of them.
  const classMap = (node: unknown): void => {
    if (isNode(node) && (node.type === "JSXExpressionContainer" || node.type === "TSAsExpression" || node.type === "TSSatisfiesExpression")) return classMap(node["expression"]);
    if (!isNode(node) || node.type !== "ObjectExpression") return classes(node);
    for (const property of node["properties"] as Node[]) if (property.type === "Property") classMap(property["value"]);
  };

  const attributeName = (node: Node) => {
    const name = node["name"];
    return isNode(name) ? (name["name"] as string | undefined) : undefined;
  };
  const declarators: Node[] = [];
  const walk = (node: unknown) => {
    if (!isNode(node)) return;
    if (node.type === "VariableDeclarator") declarators.push(node);
    if (node.type === "JSXAttribute" && CLASS_PROPS.has(attributeName(node) ?? "")) classes(node["value"]);
    else if (node.type === "JSXAttribute" && CLASS_MAP_PROPS.has(attributeName(node) ?? "")) classMap(node["value"]);
    else if (node.type === "Property" && CLASS_PROPS.has(keyName(node["key"]) ?? "")) classes(node["value"]);
    else if (node.type === "Property" && CLASS_MAP_PROPS.has(keyName(node["key"]) ?? "")) classMap(node["value"]);
    else if (node.type === "CallExpression" && isNode(node["callee"]) && node["callee"].type === "Identifier" && node["callee"]["name"] === "extendTailwindMerge") {
      // tailwind-merge has to know the prefix to tell acme:p-2 and acme:p-4 apart.
      const config = (node["arguments"] as unknown[])[0];
      if (isNode(config) && config.type === "ObjectExpression" && !(config["properties"] as Node[]).some((p) => keyName(p["key"]) === "prefix")) edit(config.range[0] + 1, config.range[0] + 1, ` prefix: "${prefix}",`);
    }
    else if (node.type === "CallExpression" && isNode(node["callee"]) && node["callee"].type === "Identifier") {
      const name = node["callee"]["name"] as string;
      const args = node["arguments"] as unknown[];
      if (CLASS_FUNCTIONS.has(name)) args.forEach(classes);
      else if (VARIANT_FUNCTIONS.has(name)) {
        classes(args[0]);
        variantConfig(args[1]);
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === "range" || key === "loc" || key === "parent") continue;
      if (Array.isArray(value)) value.forEach(walk);
      else if (isNode(value)) walk(value);
    }
  };
  walk(ast);
  // Then the constants the class positions used, once all of those are known.
  for (const d of declarators) {
    const id = d["id"];
    const name = isNode(id) && id.type === "Identifier" ? (id["name"] as string) : undefined;
    if (name === undefined) continue;
    if (lists.has(name)) classes(d["init"]);
    else if (maps.has(name)) classMap(d["init"]);
  }

  return [...edits.values()];
}

// A Vue single-file component, prefixed: its scripts as TypeScript (cn and cva calls, class keys),
// and in its template every static class="…" and every :class / v-bind:class binding, whose
// expression is read as cn's arguments are (strings, conditionals, arrays, and an object's string
// keys, which Vue's class binding takes as classes too). Attribute values are double-quoted, as the
// generated templates and Prettier write them.
export async function prefixVue(source: string, prefix: string): Promise<string> {
  let out = "";
  let at = 0;
  // <script> and <script setup> blocks.
  for (const m of source.matchAll(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/g)) {
    out += await prefixTemplate(source.slice(at, m.index), prefix);
    out += m[1]! + (await prefixSource(m[2]!, prefix)) + m[3]!;
    at = m.index + m[0].length;
  }
  return out + (await prefixTemplate(source.slice(at), prefix));
}

async function prefixTemplate(markup: string, prefix: string): Promise<string> {
  const edits: { start: number; end: number; text: string }[] = [];
  for (const m of markup.matchAll(/(\s)(:class|v-bind:class|class)="([^"]*)"/g)) {
    const [, space, name, value] = m as unknown as [string, string, string, string];
    const start = m.index + space.length + name.length + 2;
    if (name === "class") edits.push({ start, end: start + value.length, text: prefixClassList(value, prefix) });
    else {
      const wrapped = await prefixSource(`cn(${value})`, prefix);
      edits.push({ start, end: start + value.length, text: wrapped.slice(3, -1) });
    }
  }
  let out = markup;
  for (const e of edits.reverse()) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
}

// A .svelte file, prefixed. Its scripts and markup expressions are analysed as one TS program of
// the same length, so every position in it is the file's own: each <script>'s code kept, the rest
// blanked to spaces (newlines kept), and each markup expression put back where it was, a
// `class={EXPR}` as `;cn(   EXPR)` so EXPR sits in a class position (a script constant it names is
// then a class list, as `className={x}` makes it in TSX) and any other `name={EXPR}` as `;(EXPR)`,
// so a cn() or cva() call in it is found. A static `class="a b"` is prefixed where it stands, its
// `{…}` interpolations left alone. <style> is skipped.
export async function prefixSvelteSource(source: string, prefix: string): Promise<string> {
  const { blocks, attributes } = scanSvelte(source);
  const program = source.replace(/[^\r\n]/g, " ").split("");
  const put = (at: number, text: string) => {
    for (let k = 0; k < text.length; k += 1) program[at + k] = text[k]!;
  };
  for (const block of blocks) if (block.tag === "script") put(block.contentStart, source.slice(block.contentStart, block.contentEnd));
  const edits: Edit[] = [];
  for (const attribute of attributes) {
    const value = attribute.value;
    if (value === null) continue;
    if (value.kind === "text") {
      if (attribute.name === "class") edits.push(...staticClassEdits(source, value.start, value.end, prefix));
      continue;
    }
    const head = attribute.name === "class" ? ";cn(" : ";(";
    // The attribute's name, "=" and "{" are the room the head takes.
    if (value.start + 1 - attribute.start < head.length) continue;
    put(attribute.start, head);
    put(value.start + 1, source.slice(value.start + 1, value.end - 1));
    put(value.end - 1, ")");
  }
  edits.push(...(await prefixEdits(program.join(""), prefix)));
  return applyEdits(source, edits);
}

// A static class attribute's text: each class prefixed, except one that starts right after a
// `{…}` (it continues that value, as in a template literal).
function staticClassEdits(source: string, start: number, end: number, prefix: string): Edit[] {
  const edits: Edit[] = [];
  const segment = (from: number, to: number, afterExpression: boolean) => {
    const text = source.slice(from, to);
    const out = text.replace(/\S+/g, (token, at: number) => (afterExpression && at === 0 ? token : prefixClass(token, prefix)));
    if (out !== text) edits.push({ start: from, end: to, text: out });
  };
  let from = start;
  let afterExpression = false;
  let i = start;
  while (i < end) {
    if (source[i] !== "{") {
      i += 1;
      continue;
    }
    segment(from, i, afterExpression);
    i = skipExpression(source, i);
    from = i;
    afterExpression = true;
  }
  segment(from, end, afterExpression);
  return edits;
}

// Every .tsx, .ts, .vue and .svelte file in a set, prefixed; anything else as it was.
export async function prefixFiles(files: GeneratedFile[], prefix: string | undefined): Promise<GeneratedFile[]> {
  if (prefix === undefined) return files;
  return Promise.all(
    files.map(async (f) => {
      if (/\.(tsx|ts)$/.test(f.path)) return { ...f, source: await prefixSource(f.source, prefix) };
      if (f.path.endsWith(".vue")) return { ...f, source: await prefixVue(f.source, prefix) };
      if (f.path.endsWith(".svelte")) return { ...f, source: await prefixSvelteSource(f.source, prefix) };
      return f;
    }),
  );
}
