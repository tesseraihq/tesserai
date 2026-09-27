import { compareSpecificity, selectorMatches } from "./modes";
import { withFallback } from "./fonts";
import { fallbackCollector, type FallbackCollector, type FontMetricsTable } from "./font-metrics";
import { toCssOklch } from "./color";
import { cssVarName, cssVarRef } from "./css-names";
import { DEFAULT_MODE, MODE_AXES, type ModeContext, type ModeSelector } from "./modes";
import { resolveAll, tokenInContext, type Resolved, type TokenResolveError } from "./resolve";
import {
  flattenTokens,
  isTokenRef,
  refPath,
  type ColorValue,
  type DimensionValue,
  type DurationValue,
  type TokenGroup,
  type TokenOf,
  type TokenRef,
  type TokenType,
} from "./tokens";

export type Decl = { name: string; value: string };

// A token or a resolved token: anything with a $type and a matching $value.
export type TypeValue = { [K in TokenType]: { $type: K; $value: TokenOf<K>["$value"] } }[TokenType];

const dim = (d: DimensionValue) => `${d.value}${d.unit}`;
const dur = (d: DurationValue) => `${d.value}${d.unit}`;
// Written with a generic fallback at the end, however the stack was set (withFallback), and, given
// font metrics, each web font followed by its metric-matched fallback face (font-metrics.ts).
const families = (f: string[], fallbacks?: FallbackCollector) => {
  const stack = withFallback(f);
  const named = fallbacks === undefined ? stack : stack.flatMap((n) => [n, fallbacks.name(n, stack)].filter((x) => x !== undefined));
  // Unquoted only when it is a plain identifier (Inter, sans-serif); anything else is a quoted
  // string, so a name can never close its declaration or open a rule.
  // A "!" is written as its escape: Tailwind, which reads the theme first, takes "!important" even
  // inside a string as the declaration's own and cuts the value there.
  return named.map((n) => (/^[A-Za-z_-][A-Za-z0-9_-]*$/.test(n) ? n : JSON.stringify(n).replace(/!/g, "\\21 "))).join(", ");
};
const refOr = <T>(v: TokenRef | T, format: (value: T) => string): string =>
  isTokenRef(v) ? cssVarRef(refPath(v)) : format(v);

const TYPOGRAPHY_FIELDS = ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing"] as const;
const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

export function tokenDecls(path: string, token: TypeValue, fallbacks?: FallbackCollector): Decl[] {
  const name = cssVarName(path);
  switch (token.$type) {
    case "color":
      return [{ name, value: refOr(token.$value, toCssOklch) }];
    case "dimension":
      return [{ name, value: refOr(token.$value, dim) }];
    case "number":
      return [{ name, value: refOr(token.$value, String) }];
    case "fontFamily":
      return [{ name, value: refOr(token.$value, (f) => families(f, fallbacks)) }];
    case "fontWeight":
      return [{ name, value: refOr(token.$value, String) }];
    case "duration":
      return [{ name, value: refOr(token.$value, dur) }];
    case "cubicBezier":
      return [{ name, value: refOr(token.$value, (b) => `cubic-bezier(${b.join(", ")})`) }];
    case "shadow":
      return [
        {
          name,
          value: refOr(token.$value, (layers) =>
            layers
              .map((l) =>
                [
                  l.inset ? "inset" : "",
                  refOr(l.offsetX, dim),
                  refOr(l.offsetY, dim),
                  refOr(l.blur, dim),
                  refOr(l.spread, dim),
                  refOr(l.color, toCssOklch),
                ]
                  .filter(Boolean)
                  .join(" "),
              )
              .join(", "),
          ),
        },
      ];
    case "typography": {
      const v = token.$value;
      if (isTokenRef(v)) {
        const other = cssVarName(refPath(v));
        return TYPOGRAPHY_FIELDS.map((f) => ({ name: `${name}-${kebab(f)}`, value: `var(${other}-${kebab(f)})` }));
      }
      const decls: Decl[] = [
        { name: `${name}-font-family`, value: refOr(v.fontFamily, (f) => families(f, fallbacks)) },
        { name: `${name}-font-size`, value: refOr(v.fontSize, dim) },
        { name: `${name}-font-weight`, value: refOr(v.fontWeight, String) },
        { name: `${name}-line-height`, value: refOr(v.lineHeight, String) },
      ];
      if (v.letterSpacing !== undefined) decls.push({ name: `${name}-letter-spacing`, value: refOr(v.letterSpacing, dim) });
      return decls;
    }
  }
}

function attr(name: string, value: string | boolean): string {
  // Escaped whatever the schema allowed: a value can't leave its quotes.
  return `[data-${name}="${String(value).replace(/[\\"]/g, "\\$&").replace(/[\n\r\f]/g, " ")}"]`;
}

// `.dark` follows shadcn and Tailwind's dark variant; every other axis is a data attribute.
export function modeCssSelector(selector: ModeSelector): string {
  const parts: string[] = [];
  for (const axis of MODE_AXES) {
    const value = selector[axis];
    if (value === undefined) continue;
    if (axis === "colorScheme") parts.push(value === "dark" ? ".dark" : ".light");
    else parts.push(attr(kebab(axis), value));
  }
  const [a, ...rest] = parts;
  if (a === undefined || rest.length === 0) return parts.join("");
  // Combined axes may sit on the same element or on nested ones in either order.
  const b = rest.join("");
  return `${a}${b}, ${a} ${b}, ${b} ${a}`;
}

function selectorKey(selector: ModeSelector): string {
  return MODE_AXES.map((axis) => `${axis}=${String(selector[axis] ?? "")}`).join("|");
}

function contextFor(selector: ModeSelector): ModeContext {
  const context: ModeContext = { ...DEFAULT_MODE };
  if (selector.brand !== undefined) context.brand = selector.brand;
  if (selector.colorScheme !== undefined) context.colorScheme = selector.colorScheme;
  if (selector.density !== undefined) context.density = selector.density;
  if (selector.touch !== undefined) context.touch = selector.touch;
  return context;
}

export type ModeBlock = { selector: ModeSelector; css: string; decls: Decl[] };
// fallbackFaces: the @font-face rules for the fallbacks the stacks name ("" without metrics).
export type EmitBlocks = {
  base: Decl[];
  modes: ModeBlock[];
  errors: Map<string, TokenResolveError>;
  fallbackFaces: string;
};

function sameValue(a: Resolved | undefined, b: Resolved | undefined): boolean {
  return JSON.stringify(a?.$value) === JSON.stringify(b?.$value);
}

// Base declarations keep references as var() so relationships survive into the browser.
// Mode blocks redeclare every token whose resolved value differs, with concrete values, so a scoped
// theme (a dark section inside a light page) is correct even for tokens defined by reference.
export function emitBlocks(group: TokenGroup, metrics?: FontMetricsTable): EmitBlocks {
  const flat = flattenTokens(group);
  const fallbacks = metrics === undefined ? undefined : fallbackCollector(metrics);
  const base: Decl[] = [];
  const selectors = new Map<string, ModeSelector>();
  for (const [path, token] of flat) {
    // A mode value whose selector matches the default context is the token's real base value.
    base.push(...tokenDecls(path, tokenInContext(token, DEFAULT_MODE), fallbacks));
    for (const mode of token.$modes ?? []) selectors.set(selectorKey(mode.selector), mode.selector);
  }

  // Independent axes can affect different links in an alias chain. Emit their
  // intersections too, so CSS resolves the same combined context as the token resolver.
  const authored = [...selectors.values()];
  const combined = [...authored];
  for (let i = 0; i < combined.length; i++)
    for (const other of authored) {
      const selector = combined[i]!;
      if (
        MODE_AXES.some(
          (axis) =>
            selector[axis] !== undefined &&
            other[axis] !== undefined &&
            selector[axis] !== other[axis],
        )
      )
        continue;
      const union = { ...selector, ...other };
      const key = selectorKey(union);
      if (!selectors.has(key)) {
        selectors.set(key, union);
        combined.push(union);
      }
    }

  const baseResolved = resolveAll(flat, DEFAULT_MODE);
  const modes: ModeBlock[] = [];
  for (const selector of [...selectors.values()].sort(compareSpecificity)) {
    const resolved = resolveAll(flat, contextFor(selector));
    for (const [path, error] of resolved.errors)
      baseResolved.errors.set(`${path} (${selectorKey(selector)})`, error);
    const decls: Decl[] = [];
    for (const [path, value] of resolved.values) {
      const declarations = tokenDecls(path, value, fallbacks);
      const resetsEarlier = modes.some(
        (mode) =>
          selectorMatches(mode.selector, contextFor(selector)) &&
          mode.decls.some((old) =>
            declarations.some((next) => next.name === old.name && next.value !== old.value),
          ),
      );
      if (!sameValue(value, baseResolved.values.get(path)) || resetsEarlier)
        decls.push(...declarations);
    }
    if (decls.length > 0) modes.push({ selector, css: modeCssSelector(selector), decls });
  }
  return { base, modes, errors: baseResolved.errors, fallbackFaces: fallbacks?.faces() ?? "" };
}

export function formatBlock(selector: string, decls: Decl[]): string {
  return `${selector} {\n${decls.map((d) => `  ${d.name}: ${d.value};`).join("\n")}\n}`;
}

// With font metrics (loadFontMetrics), web fonts get metric-matched fallback faces.
export function emitCss(group: TokenGroup, metrics?: FontMetricsTable): string {
  const { base, modes, fallbackFaces } = emitBlocks(group, metrics);
  return [formatBlock(":root", base), ...modes.map((m) => formatBlock(m.css, m.decls)), ...(fallbackFaces === "" ? [] : [fallbackFaces])].join("\n\n") + "\n";
}
