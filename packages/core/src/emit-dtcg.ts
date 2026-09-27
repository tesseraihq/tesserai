import { toHex } from "./color";
import {
  ColorValue,
  ShadowValue,
  isToken,
  isTokenRef,
  type Token,
  type TokenGroup,
  type TokenRef,
  type TokenType,
} from "./tokens";

export const DTCG_EXTENSION = "dev.tesserai";

type DtcgColor = { colorSpace: "oklch"; components: [number, number, number]; alpha?: number; hex: string };

function dtcgColor(c: ColorValue): DtcgColor {
  const out: DtcgColor = { colorSpace: "oklch", components: [c.l, c.c, c.h], hex: toHex(c) };
  if (c.alpha !== undefined) out.alpha = c.alpha;
  return out;
}

function colorOrRef(v: TokenRef | ColorValue): TokenRef | DtcgColor {
  return isTokenRef(v) ? v : dtcgColor(v);
}

// Every token type but color already matches the DTCG value shape; references use the same {path} syntax.
function dtcgValue(type: TokenType, value: unknown): unknown {
  if (isTokenRef(value)) return value;
  switch (type) {
    case "color":
      return dtcgColor(ColorValue.parse(value));
    case "shadow":
      return ShadowValue.parse(value).map((l) => ({ ...l, color: colorOrRef(l.color) }));
    default:
      return value;
  }
}

function dtcgToken(token: Token): Record<string, unknown> {
  const out: Record<string, unknown> = { $type: token.$type, $value: dtcgValue(token.$type, token.$value) };
  if (token.$description !== undefined) out.$description = token.$description;
  const ext: Record<string, unknown> = {};
  if (token.$modes !== undefined) {
    ext.modes = token.$modes.map((m) => ({ selector: m.selector, value: dtcgValue(token.$type, m.value) }));
  }
  if (token.$meta !== undefined) ext.meta = token.$meta;
  if (Object.keys(ext).length > 0) out.$extensions = { [DTCG_EXTENSION]: ext };
  return out;
}

export function emitDtcg(group: TokenGroup): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, node] of Object.entries(group)) {
    out[name] = isToken(node) ? dtcgToken(node) : emitDtcg(node);
  }
  return out;
}

export function emitDtcgJson(group: TokenGroup): string {
  return JSON.stringify(emitDtcg(group), null, 2) + "\n";
}
