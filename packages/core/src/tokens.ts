import { z } from "zod";
import { ModeSelector } from "./modes";

const UNSAFE_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);
export const safeTokenPath = (path: string): boolean =>
  path.split(".").every((part) => /^[a-zA-Z0-9_-]+$/.test(part) && !UNSAFE_SEGMENTS.has(part));
export const TokenPath = z.string().refine(safeTokenPath, "invalid or unsafe token path");

export const TOKEN_REF_PATTERN = /^\{([a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*)\}$/;
export const TokenRef = z.string().regex(TOKEN_REF_PATTERN, "expected a token reference like {color.blue.9}")
  .refine((ref) => safeTokenPath(ref.slice(1, -1)), "unsafe token reference");
export type TokenRef = z.infer<typeof TokenRef>;

export function isTokenRef(value: unknown): value is TokenRef {
  return (
    typeof value === "string" && TOKEN_REF_PATTERN.test(value) && safeTokenPath(value.slice(1, -1))
  );
}

export function refPath(ref: TokenRef): string {
  return ref.slice(1, -1);
}

export function toRef(path: string): TokenRef {
  return `{${path}}`;
}

const orRef = <T extends z.ZodType>(schema: T) => z.union([TokenRef, schema]);

export const ColorValue = z
  .object({
    l: z.number().min(0).max(1),
    c: z.number().min(0),
    h: z.number().min(0).max(360),
    alpha: z.number().min(0).max(1).optional(),
  })
  .strict();
export type ColorValue = z.infer<typeof ColorValue>;

export const DimensionValue = z.object({ value: z.number(), unit: z.enum(["px", "rem"]) }).strict();
export type DimensionValue = z.infer<typeof DimensionValue>;

export const NumberValue = z.number();
export const FontFamilyValue = z.array(z.string().min(1)).min(1);
export const FontWeightValue = z.number().int().min(1).max(1000);

export const DurationValue = z.object({ value: z.number().min(0), unit: z.enum(["ms", "s"]) }).strict();
export type DurationValue = z.infer<typeof DurationValue>;

export const CubicBezierValue = z.tuple([z.number(), z.number(), z.number(), z.number()]);
export type CubicBezierValue = z.infer<typeof CubicBezierValue>;

export const ShadowLayer = z
  .object({
    offsetX: orRef(DimensionValue),
    offsetY: orRef(DimensionValue),
    blur: orRef(DimensionValue),
    spread: orRef(DimensionValue),
    color: orRef(ColorValue),
    inset: z.boolean().optional(),
  })
  .strict();
export const ShadowValue = z.array(ShadowLayer).min(1);
export type ShadowValue = z.infer<typeof ShadowValue>;

export const TypographyValue = z
  .object({
    fontFamily: orRef(FontFamilyValue),
    fontSize: orRef(DimensionValue),
    fontWeight: orRef(FontWeightValue),
    lineHeight: orRef(NumberValue),
    letterSpacing: orRef(DimensionValue).optional(),
  })
  .strict();
export type TypographyValue = z.infer<typeof TypographyValue>;

export const TokenMeta = z
  .object({
    generated: z.object({ by: z.string().min(1), step: z.string().min(1) }).strict().optional(),
    pinned: z.boolean().optional(),
    deprecated: z.string().optional(),
  })
  .strict();
export type TokenMeta = z.infer<typeof TokenMeta>;

function token<T extends string, V extends z.ZodType>(type: T, value: V) {
  return z
    .object({
      $type: z.literal(type),
      $value: orRef(value),
      $modes: z.array(z.object({ selector: ModeSelector, value: orRef(value) }).strict()).optional(),
      $description: z.string().optional(),
      $meta: TokenMeta.optional(),
    })
    .strict();
}

export const Token = z.discriminatedUnion("$type", [
  token("color", ColorValue),
  token("dimension", DimensionValue),
  token("number", NumberValue),
  token("fontFamily", FontFamilyValue),
  token("fontWeight", FontWeightValue),
  token("duration", DurationValue),
  token("cubicBezier", CubicBezierValue),
  token("shadow", ShadowValue),
  token("typography", TypographyValue),
]);
export type Token = z.infer<typeof Token>;
export type TokenType = Token["$type"];
export type TokenOf<T extends TokenType> = Extract<Token, { $type: T }>;

export const TOKEN_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

export type TokenGroup = { [name: string]: Token | TokenGroup };
export const TokenGroup: z.ZodType<TokenGroup> = z.lazy(() =>
  z.record(z.string().regex(TOKEN_NAME_PATTERN)
      .refine((name) => !UNSAFE_SEGMENTS.has(name), "unsafe token name"), z.union([Token, TokenGroup]),
  ),
);

export function isToken(node: Token | TokenGroup): node is Token {
  return "$type" in node && typeof node.$type === "string";
}

export function flattenTokens(group: TokenGroup, prefix = ""): Map<string, Token> {
  const out = new Map<string, Token>();
  for (const [name, node] of Object.entries(group)) {
    const path = prefix ? `${prefix}.${name}` : name;
    if (isToken(node)) out.set(path, node);
    else for (const [p, t] of flattenTokens(node, path)) out.set(p, t);
  }
  return out;
}

export function getToken(group: TokenGroup, path: string): Token | undefined {
  if (!safeTokenPath(path)) return undefined;
  let node: Token | TokenGroup | undefined = group;
  for (const segment of path.split(".")) {
    if (node === undefined || isToken(node)) return undefined;
    node = Object.hasOwn(node, segment) ? node[segment] : undefined;
  }
  return node !== undefined && isToken(node) ? node : undefined;
}

export function setToken(group: TokenGroup, path: string, token: Token): void {
  if (!safeTokenPath(path)) throw new Error(`invalid or unsafe token path "${path}"`);
  const segments = path.split(".");
  const last = segments.pop();
  if (last === undefined || last === "") throw new Error(`cannot set token at empty path "${path}"`);
  let node: TokenGroup = group;
  for (const segment of segments) {
    const next = Object.hasOwn(node, segment) ? node[segment] : undefined;
    if (next === undefined) {
      const created: TokenGroup = {};
      node[segment] = created;
      node = created;
    } else if (isToken(next)) {
      throw new Error(`cannot set ${path}: ${segment} is a token, not a group`);
    } else {
      node = next;
    }
  }
  node[last] = token;
}

// Removes the token at `path`, and any group left empty by it. Returns whether a token was removed.
export function deleteToken(group: TokenGroup, path: string): boolean {
  if (!safeTokenPath(path)) return false;
  const segments = path.split(".");
  const last = segments.pop();
  if (last === undefined) return false;
  const trail: [TokenGroup, string][] = [];
  let node: TokenGroup = group;
  for (const segment of segments) {
    const next = Object.hasOwn(node, segment) ? node[segment] : undefined;
    if (next === undefined || isToken(next)) return false;
    trail.push([node, segment]);
    node = next;
  }
  const target = node[last];
  if (target === undefined || !isToken(target)) return false;
  delete node[last];
  for (let i = trail.length - 1; i >= 0; i--) {
    const entry = trail[i];
    if (entry === undefined) break;
    const [parent, key] = entry;
    const child = parent[key];
    if (child !== undefined && !isToken(child) && Object.keys(child).length === 0) delete parent[key];
    else break;
  }
  return true;
}
