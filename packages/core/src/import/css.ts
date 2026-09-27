import { parseColor } from "../color";
import type { ColorValue } from "../tokens";

// Reads CSS custom properties from a theme stylesheet: the light values (:root), the dark ones
// (.dark, or a dark media query) and Tailwind v4 @theme blocks. Not a full CSS parser: enough for
// the theme files people actually have, and it never runs any code.

export type CssVariables = { light: Map<string, string>; dark: Map<string, string>; theme: Map<string, string> };

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

// Every `selector { … }` block at any depth, as [selector, body] (bodies without nested blocks).
function blocks(css: string): [string, string][] {
  const out: [string, string][] = [];
  const stack: { selector: string; start: number }[] = [];
  let selectorStart = 0;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === "{") {
      stack.push({ selector: css.slice(selectorStart, i).trim(), start: i + 1 });
      selectorStart = i + 1;
    } else if (ch === "}") {
      const open = stack.pop();
      if (open !== undefined) out.push([open.selector.split(/[;}]/).pop()!.trim(), css.slice(open.start, i)]);
      selectorStart = i + 1;
    } else if (ch === ";" && stack.length === 0) selectorStart = i + 1;
  }
  return out;
}

function declarations(body: string, into: Map<string, string>) {
  // Only this block's own declarations: nested blocks are read separately.
  const flat = body.replace(/\{[^{}]*\}/g, "");
  for (const match of flat.matchAll(/--([a-zA-Z0-9_-]+)\s*:\s*([^;]+);?/g)) into.set(match[1]!, match[2]!.trim());
}

export function readCssVariables(css: string): CssVariables {
  const vars: CssVariables = { light: new Map(), dark: new Map(), theme: new Map() };
  for (const [selector, body] of blocks(stripComments(css))) {
    const s = selector.replace(/\s+/g, " ");
    if (/^@theme\b/.test(s)) declarations(body, vars.theme);
    else if (/(^|,\s*)(\.dark|\[data-theme=["']?dark["']?\]|:root\.dark|html\.dark)\b/.test(s) || /prefers-color-scheme:\s*dark/.test(s)) declarations(body, vars.dark);
    else if (/(^|,\s*)(:root|html|:host)\b/.test(s)) declarations(body, vars.light);
  }
  return vars;
}

// A color as a theme writes it: oklch()/hsl()/rgb()/hex, or shadcn's older bare HSL channels
// ("222.2 84% 4.9%", used as hsl(var(--x))).
export function readColor(value: string): ColorValue | undefined {
  const v = value.trim();
  if (/^-?[\d.]+\s+[\d.]+%\s+[\d.]+%(\s*\/\s*[\d.]+%?)?$/.test(v)) return parseColor(`hsl(${v})`);
  return parseColor(v);
}

// A length in px: "0.625rem" (at 16px to the rem), "10px".
export function readLength(value: string): number | undefined {
  const m = /^(-?[\d.]+)(rem|px|em)?$/.exec(value.trim());
  if (m === null) return undefined;
  const n = Number(m[1]);
  return m[2] === "rem" || m[2] === "em" ? n * 16 : n;
}
