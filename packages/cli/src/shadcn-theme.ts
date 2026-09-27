import { shadcnExportPaths } from "@tesserai/core";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// A shadcn project's stylesheet carries shadcn's own theme: `:root` and `.dark` blocks of color
// variables, and an `@theme inline` block pointing Tailwind at them. Those come after tesserai's
// import, so they win and the project keeps shadcn's look whatever the system says. Taking over
// means moving exactly those out (into a file beside the system, so nothing is lost) and leaving
// everything else in the stylesheet as it was.

const SHADCN_NAMES = new Set([...shadcnExportPaths().map(([name]) => name), "radius"]);

// What `@theme inline` maps to shadcn's variables: colors, the radius scale and the fonts.
const THEME_LINE = /^--(color-[\w-]+|radius(-[\w-]+)?|font-(sans|mono|serif|heading))$/;

type Block = { start: number; end: number; selector: string; body: string };

// Top-level rules, and the ones one level inside `@layer base` (where older shadcn themes sit),
// found by matching braces. Comments are skipped so a brace inside one doesn't count.
function blocks(css: string): Block[] {
  const found: Block[] = [];
  const scan = (from: number, to: number, depth: number) => {
    let i = from;
    let selectorStart = from;
    while (i < to) {
      if (css.startsWith("/*", i)) {
        const close = css.indexOf("*/", i + 2);
        i = close === -1 ? to : close + 2;
        selectorStart = i;
        continue;
      }
      const ch = css[i];
      if (ch === ";") selectorStart = i + 1;
      else if (ch === "{") {
        const open = i;
        let level = 1;
        let j = i + 1;
        while (j < to && level > 0) {
          if (css.startsWith("/*", j)) {
            const close = css.indexOf("*/", j + 2);
            j = close === -1 ? to : close + 2;
            continue;
          }
          if (css[j] === "{") level++;
          else if (css[j] === "}") level--;
          j++;
        }
        const selector = css.slice(selectorStart, open).trim();
        const block = { start: selectorStart, end: j, selector, body: css.slice(open + 1, j - 1) };
        if (depth === 0 && /^@layer\s+base$/.test(selector)) scan(open + 1, j - 1, 1);
        else found.push(block);
        i = j;
        selectorStart = j;
        continue;
      }
      i++;
    }
  };
  scan(0, css.length, 0);
  return found;
}

type Decl = { name: string; text: string };
function declarations(body: string): Decl[] | null {
  const out: Decl[] = [];
  for (const raw of body.replace(/\/\*[\s\S]*?\*\//g, "").split(";")) {
    const text = raw.trim();
    if (text === "") continue;
    const colon = text.indexOf(":");
    if (colon === -1 || text.includes("{")) return null;
    out.push({ name: text.slice(0, colon).trim(), text });
  }
  return out;
}

export type Takeover = { css: string; removed: string[] };

// Returns the stylesheet without shadcn's theme, and what was taken out (empty when there was
// none, so running it again changes nothing).
export function takeOverShadcnTheme(css: string): Takeover {
  const edits: { start: number; end: number; replacement: string; removed: string }[] = [];
  for (const block of blocks(css)) {
    const decls = declarations(block.body);
    if (decls === null || decls.length === 0) continue;
    const isVariables = /^(:root|\.dark|html|html\.dark|:root\.dark)$/.test(block.selector);
    if (isVariables) {
      // Only a block that is shadcn's theme: every line a variable, and most of them shadcn's.
      if (!decls.every((d) => d.name.startsWith("--"))) continue;
      const known = decls.filter((d) => SHADCN_NAMES.has(d.name.slice(2))).length;
      if (known < 3 || known < decls.length * 0.6) continue;
      const kept = decls.filter((d) => !SHADCN_NAMES.has(d.name.slice(2)));
      const replacement = kept.length === 0 ? "" : `${block.selector} {\n${kept.map((d) => `  ${d.text};`).join("\n")}\n}`;
      edits.push({ start: block.start, end: block.end, replacement, removed: css.slice(block.start, block.end).trim() });
    } else if (/^@theme\s+inline$/.test(block.selector)) {
      const mapped = decls.filter((d) => THEME_LINE.test(d.name) && /var\(--/.test(d.text));
      if (mapped.length === 0) continue;
      const kept = decls.filter((d) => !mapped.includes(d));
      const replacement = kept.length === 0 ? "" : `@theme inline {\n${kept.map((d) => `  ${d.text};`).join("\n")}\n}`;
      edits.push({ start: block.start, end: block.end, replacement, removed: css.slice(block.start, block.end).trim() });
    }
  }
  let out = css;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    const before = out.slice(0, edit.start).replace(/\n*$/, edit.replacement === "" ? "\n" : "\n\n");
    out = `${before}${edit.replacement}${out.slice(edit.end).replace(/^\n*/, edit.replacement === "" ? "" : "\n")}`;
  }
  return { css: out.replace(/\n{3,}/g, "\n\n"), removed: edits.sort((a, b) => a.start - b.start).map((e) => e.removed) };
}

// Takes shadcn's theme out of the project's stylesheet, keeping what was removed in
// tesserai/replaced-shadcn-theme.css (added to, never overwritten, so a second run loses nothing).
// Returns what to tell the person, or null when there was nothing to take over.
export async function takeOverStylesheet(dir: string, stylesheet: string, dryRun = false): Promise<string | null> {
  const path = join(dir, stylesheet);
  const result = takeOverShadcnTheme(await readFile(path, "utf8"));
  if (result.removed.length === 0) return null;
  if (!dryRun) {
    const backup = join(dir, "tesserai", "replaced-shadcn-theme.css");
    await mkdir(join(dir, "tesserai"), { recursive: true });
    let previous = "";
    try {
      previous = await readFile(backup, "utf8");
    } catch {
      previous = `/* shadcn's own theme, taken out of ${stylesheet} by tesserai so the design system's applies.\n   Nothing here is loaded; it's kept in case you want any of it back. */\n`;
    }
    await writeFile(backup, `${previous}\n${result.removed.join("\n\n")}\n`, "utf8");
    await writeFile(path, result.css, "utf8");
  }
  return `${stylesheet}: moved shadcn's own theme to tesserai/replaced-shadcn-theme.css, so the system's colors, radius and fonts apply`;
}
