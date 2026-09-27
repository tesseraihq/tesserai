// The elements in a source file, read the way its compiler would: JSX in code, and the template of
// a Vue or Svelte file. Not a parser (the CLI ships without one): a small reader that knows where
// code, strings, comments, template literals and markup begin and end, so a `>` inside
// `onClick={() => …}` doesn't end a tag, and `<Button>` in a comment or a string isn't an element.
//
// Ways it could go wrong, written before the code (AGENTS.md):
// - A generic read as a tag (useState<Foo>(), a < B): a tag starts only where an expression can.
// - Text in markup read as code (the apostrophe in <p>Don't</p> opening a "string"): children of
//   an element are text, with {…} expressions, never code.
// - A runaway read (an unclosed tag or brace) eating the rest of the file: every loop stops at the
//   end of the source, and a tag that doesn't close before it is dropped.

export type Attr = { name: string; value?: string; quoted: boolean };
export type Element = { name: string; line: number; attrs: Attr[] };

const IDENT = /[A-Za-z0-9_$]/;
const NAME = /[A-Za-z0-9_$.:-]/;

export function readElements(source: string, kind: "code" | "markup"): Element[] {
  const out: Element[] = [];
  const starts: number[] = [0];
  for (let i = 0; i < source.length; i++) if (source[i] === "\n") starts.push(i + 1);
  const lineOf = (at: number) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid]! <= at) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
  const n = source.length;

  // A quoted string from its opening quote; returns the index after the closing one.
  const skipString = (i: number): number => {
    const q = source[i];
    for (let j = i + 1; j < n; j++) {
      if (source[j] === "\\") j++;
      else if (source[j] === q) return j + 1;
      else if (source[j] === "\n" && q !== "`") return j;
    }
    return n;
  };
  // A template literal, with its ${…} expressions read as code.
  const skipTemplate = (i: number): number => {
    for (let j = i + 1; j < n; j++) {
      if (source[j] === "\\") j++;
      else if (source[j] === "`") return j + 1;
      else if (source[j] === "$" && source[j + 1] === "{") j = code(j + 2, "}") - 1;
    }
    return n;
  };
  // Can a tag start here? After something that ends an expression (a name, ")", "]"), a "<" is
  // a comparison or a generic.
  const tagCanStart = (i: number): boolean => {
    let k = i - 1;
    while (k >= 0 && /\s/.test(source[k]!)) k--;
    if (k < 0) return true;
    const prev = source[k]!;
    if (prev === ")" || prev === "]") return false;
    if (IDENT.test(prev)) {
      // "return <X", "yield <X", "=> <X" (the > of => isn't an identifier).
      let w = k;
      while (w >= 0 && IDENT.test(source[w]!)) w--;
      return ["return", "yield", "case", "default", "await", "in", "of", "else", "do"].includes(source.slice(w + 1, k + 1));
    }
    return true;
  };

  // Code, from i until `until` at depth 0 (a closing brace, or the end). Returns the index after it.
  function code(i: number, until: "}" | null): number {
    let depth = 0;
    while (i < n) {
      const c = source[i]!;
      if (c === "/" && source[i + 1] === "/") {
        while (i < n && source[i] !== "\n") i++;
      } else if (c === "/" && source[i + 1] === "*") {
        const end = source.indexOf("*/", i + 2);
        i = end === -1 ? n : end + 2;
      } else if (c === '"' || c === "'") i = skipString(i);
      else if (c === "`") i = skipTemplate(i);
      else if (c === "{" || c === "(" || c === "[") {
        depth++;
        i++;
      } else if (c === "}" || c === ")" || c === "]") {
        if (depth === 0 && c === until) return i + 1;
        depth = Math.max(0, depth - 1);
        i++;
      } else if (c === "<" && /[A-Za-z>]/.test(source[i + 1] ?? "") && tagCanStart(i)) {
        i = element(i);
      } else i++;
    }
    return n;
  }

  // Markup text (element children, a Vue or Svelte template) until the closing tag of `name`
  // (or the end). {…} is an expression. Returns the index after the closing tag.
  function text(i: number, name: string | null, svelteLike: boolean): number {
    while (i < n) {
      const c = source[i]!;
      if (c === "<" && source[i + 1] === "!" && source.startsWith("<!--", i)) {
        const end = source.indexOf("-->", i + 4);
        i = end === -1 ? n : end + 3;
      } else if (c === "<" && source[i + 1] === "/") {
        const end = source.indexOf(">", i);
        const closing = source.slice(i + 2, end === -1 ? n : end).trim();
        i = end === -1 ? n : end + 1;
        if (name === null || closing === name || closing === "") return i;
      } else if (c === "<" && /[A-Za-z]/.test(source[i + 1] ?? "")) {
        i = element(i);
      } else if (c === "{" && (kind === "code" || svelteLike || source[i + 1] === "{")) {
        i = code(i + 1, "}");
      } else i++;
    }
    return n;
  }

  // An element from its "<": records it, then reads its children. Returns the index after it.
  function element(i: number): number {
    let j = i + 1;
    // A fragment: <>…</>.
    if (source[j] === ">") return text(j + 1, "", kind === "markup");
    const nameStart = j;
    while (j < n && NAME.test(source[j]!)) j++;
    const name = source.slice(nameStart, j);
    const attrs: Attr[] = [];
    let selfClosing = false;
    let closed = false;
    while (j < n) {
      const c = source[j]!;
      if (/\s/.test(c)) j++;
      else if (c === "/" && source[j + 1] === ">") {
        selfClosing = true;
        closed = true;
        j += 2;
        break;
      } else if (c === ">") {
        closed = true;
        j++;
        break;
      } else if (c === "{") {
        // A spread {...props}, or Svelte's {name} shorthand.
        const end = code(j + 1, "}");
        const inner = source.slice(j + 1, end - 1).trim();
        if (/^[A-Za-z_$][\w$]*$/.test(inner)) attrs.push({ name: inner, value: inner, quoted: false });
        j = end;
      } else if (NAME.test(c) || c === "@" || c === "#") {
        const attrStart = j;
        j++;
        while (j < n && (NAME.test(source[j]!) || source[j] === "@")) j++;
        const attr = source.slice(attrStart, j);
        while (j < n && /[ \t]/.test(source[j]!)) j++;
        if (source[j] !== "=") {
          attrs.push({ name: attr, quoted: false });
          continue;
        }
        j++;
        while (j < n && /\s/.test(source[j]!)) j++;
        const q = source[j];
        if (q === '"' || q === "'") {
          // In markup a quoted value is text (Vue's :prop holds code, still quoted); in JSX a string.
          const end = source.indexOf(q, j + 1);
          const stop = end === -1 ? n : end;
          attrs.push({ name: attr, value: source.slice(j + 1, stop), quoted: true });
          j = stop + 1;
        } else if (q === "{") {
          const end = code(j + 1, "}");
          attrs.push({ name: attr, value: source.slice(j + 1, end - 1), quoted: false });
          j = end;
        } else {
          const vStart = j;
          while (j < n && !/[\s>]/.test(source[j]!) && !(source[j] === "/" && source[j + 1] === ">")) j++;
          attrs.push({ name: attr, value: source.slice(vStart, j), quoted: true });
        }
      } else j++;
    }
    if (!closed) return n;
    out.push({ name, line: lineOf(i), attrs });
    const lower = name.toLowerCase();
    // Void elements and self-closing ones have no children; script and style hold no markup.
    if (selfClosing || (kind === "markup" && /^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/.test(lower))) return j;
    // A script block holds the imports (read apart), not markup.
    if (lower === "script") {
      const end = source.indexOf("</script>", j);
      return end === -1 ? n : end + "</script>".length;
    }
    if (lower === "style") {
      const end = source.indexOf("</style>", j);
      return end === -1 ? n : end + "</style>".length;
    }
    return text(j, name, kind === "markup");
  }

  if (kind === "code") code(0, null);
  else text(0, null, true);
  return out;
}

// A script block's code inside markup (it holds the imports), for code-only readers.
export function scriptsOf(source: string): string {
  return [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("\n");
}
