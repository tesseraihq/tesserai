// A small scanner for the .svelte files tesserai generates: where the <script> and <style> blocks
// are, and each tag's attributes with their values. No Svelte parser: this runs in the builder and
// a Worker too. It knows quotes, template literals and balanced braces, which is all well-formed
// generated code needs; it isn't a validator.

export type SvelteBlock = { tag: "script" | "style"; start: number; end: number; contentStart: number; contentEnd: number };

// An attribute value: an expression (`{…}`, from its opening brace to just past the closing one),
// or text (between the quotes, which may hold `{…}` interpolations).
export type SvelteAttributeValue = { kind: "expression"; start: number; end: number } | { kind: "text"; start: number; end: number };
export type SvelteAttribute = { name: string; start: number; value: SvelteAttributeValue | null };

export type SvelteScan = { blocks: SvelteBlock[]; attributes: SvelteAttribute[] };

function skipString(s: string, i: number): number {
  const quote = s[i];
  let j = i + 1;
  while (j < s.length && s[j] !== quote) j += s[j] === "\\" ? 2 : 1;
  return j + 1;
}

function skipTemplate(s: string, i: number): number {
  let j = i + 1;
  while (j < s.length && s[j] !== "`") {
    if (s[j] === "\\") j += 2;
    else if (s[j] === "$" && s[j + 1] === "{") j = skipExpression(s, j + 1);
    else j += 1;
  }
  return j + 1;
}

// From an opening brace to just past its closing one.
export function skipExpression(s: string, i: number): number {
  let depth = 0;
  let j = i;
  while (j < s.length) {
    const c = s[j];
    if (c === '"' || c === "'") {
      j = skipString(s, j);
      continue;
    }
    if (c === "`") {
      j = skipTemplate(s, j);
      continue;
    }
    if (c === "/" && s[j + 1] === "/") {
      const nl = s.indexOf("\n", j);
      j = nl === -1 ? s.length : nl;
      continue;
    }
    if (c === "/" && s[j + 1] === "*") {
      const close = s.indexOf("*/", j + 2);
      j = close === -1 ? s.length : close + 2;
      continue;
    }
    if (c === "{") depth += 1;
    else if (c === "}") {
      depth -= 1;
      if (depth === 0) return j + 1;
    }
    j += 1;
  }
  return s.length;
}

const SPACE = /\s/;
const TAG_NAME = /[A-Za-z][\w:.-]*/y;

export function scanSvelte(s: string): SvelteScan {
  const blocks: SvelteBlock[] = [];
  const attributes: SvelteAttribute[] = [];
  const skipSpace = (at: number) => {
    let j = at;
    while (j < s.length && SPACE.test(s[j]!)) j += 1;
    return j;
  };
  const endsTag = (at: number) => s[at] === ">" || (s[at] === "/" && s[at + 1] === ">");

  // One opening tag, from its "<"; returns where scanning goes on.
  const tag = (start: number): number => {
    TAG_NAME.lastIndex = start + 1;
    const name = TAG_NAME.exec(s)![0];
    let j = start + 1 + name.length;
    let selfClosing = false;
    while (j < s.length) {
      j = skipSpace(j);
      if (s[j] === ">") {
        j += 1;
        break;
      }
      if (s[j] === "/" && s[j + 1] === ">") {
        j += 2;
        selfClosing = true;
        break;
      }
      // {...rest} and {shorthand}.
      if (s[j] === "{") {
        j = skipExpression(s, j);
        continue;
      }
      const nameStart = j;
      while (j < s.length && !SPACE.test(s[j]!) && s[j] !== "=" && !endsTag(j)) j += 1;
      if (j === nameStart) {
        j += 1;
        continue;
      }
      const attribute: SvelteAttribute = { name: s.slice(nameStart, j), start: nameStart, value: null };
      attributes.push(attribute);
      let k = skipSpace(j);
      if (s[k] !== "=") continue;
      k = skipSpace(k + 1);
      if (s[k] === "{") {
        const end = skipExpression(s, k);
        attribute.value = { kind: "expression", start: k, end };
        j = end;
      } else if (s[k] === '"' || s[k] === "'") {
        const quote = s[k];
        let e = k + 1;
        while (e < s.length && s[e] !== quote) e = s[e] === "{" ? skipExpression(s, e) : e + 1;
        attribute.value = { kind: "text", start: k + 1, end: e };
        j = e + 1;
      } else {
        let e = k;
        while (e < s.length && !SPACE.test(s[e]!) && !endsTag(e)) e = s[e] === "{" ? skipExpression(s, e) : e + 1;
        attribute.value = { kind: "text", start: k, end: e };
        j = e;
      }
    }
    if (!selfClosing && (name === "script" || name === "style")) {
      const close = s.indexOf(`</${name}`, j);
      const contentEnd = close === -1 ? s.length : close;
      const gt = close === -1 ? -1 : s.indexOf(">", close);
      const end = gt === -1 ? s.length : gt + 1;
      blocks.push({ tag: name, start, end, contentStart: j, contentEnd });
      return end;
    }
    return j;
  };

  let i = 0;
  while (i < s.length) {
    if (s.startsWith("<!--", i)) {
      const close = s.indexOf("-->", i + 4);
      i = close === -1 ? s.length : close + 3;
    } else if (s[i] === "{") i = skipExpression(s, i);
    else if (s[i] === "<" && /[A-Za-z]/.test(s[i + 1] ?? "")) i = tag(i);
    else i += 1;
  }
  return { blocks, attributes };
}

// Rewrites the markup (everything outside <script> and <style>) with `edit`, leaving the blocks as
// they are.
export function mapMarkup(source: string, edit: (markup: string) => string): string {
  const { blocks } = scanSvelte(source);
  let out = "";
  let at = 0;
  for (const block of blocks) {
    out += edit(source.slice(at, block.start)) + source.slice(block.start, block.end);
    at = block.end;
  }
  return out + edit(source.slice(at));
}
