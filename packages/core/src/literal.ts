import { parseColor } from "./color";
import type { ColorValue, CubicBezierValue, DimensionValue, DurationValue, ShadowValue, TokenType } from "./tokens";

// A plain value typed by a person or the model ("4px", "600", "150ms", "#e11d48"), turned into the
// token value it stands for. Undefined when the text is not a value of that type.
export type LiteralValue = ColorValue | DimensionValue | number | string[] | DurationValue | CubicBezierValue | ShadowValue;

const NUMBER = /^-?(?:\d+\.?\d*|\.\d+)$/;

const WEIGHTS: Record<string, number> = {
  thin: 100,
  extralight: 200,
  light: 300,
  regular: 400,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
};

const CURVES: Record<string, CubicBezierValue> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
};

function dimension(text: string): DimensionValue | undefined {
  const match = /^(-?(?:\d+\.?\d*|\.\d+))(px|rem)?$/.exec(text);
  if (match === null) return undefined;
  const unit = match[2] === "rem" ? "rem" : "px";
  return { value: Number(match[1]), unit };
}

function duration(text: string): DurationValue | undefined {
  const match = /^((?:\d+\.?\d*|\.\d+))(ms|s)?$/.exec(text);
  if (match === null) return undefined;
  return { value: Number(match[1]), unit: match[2] === "s" ? "s" : "ms" };
}

function curve(text: string): CubicBezierValue | undefined {
  const named = CURVES[text];
  if (named !== undefined) return named;
  const match = /^cubic-bezier\(([^)]*)\)$/.exec(text);
  const parts = match?.[1]?.split(",").map((p) => p.trim());
  if (parts === undefined || parts.length !== 4 || !parts.every((p) => NUMBER.test(p))) return undefined;
  const [a, b, c, d] = parts.map(Number);
  if (a === undefined || b === undefined || c === undefined || d === undefined) return undefined;
  return [a, b, c, d];
}

// Splits on commas outside parentheses, so rgb(0 0 0 / 0.1), 0 1px… stays whole per layer.
function layers(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === "," && depth === 0) {
      out.push(text.slice(start, i));
      start = i + 1;
    }
  }
  out.push(text.slice(start));
  return out.map((l) => l.trim());
}

// CSS box-shadow text ("0 4px 12px rgb(0 0 0 / 0.08), inset 0 1px 0 #fff"), as the site reader
// measures it or a person copies it from DevTools. "none" isn't a shadow; a layer needs 2–4 lengths.
function shadow(input: string): ShadowValue | undefined {
  const result: ShadowValue = [];
  for (const layer of layers(input.trim())) {
    const tokens = layer.match(/[a-z-]+\([^)]*\)|\S+/gi) ?? [];
    const lengths: DimensionValue[] = [];
    let color: ColorValue | undefined;
    let inset = false;
    for (const token of tokens) {
      if (token.toLowerCase() === "inset") inset = true;
      else {
        const length = token === "0" ? { value: 0, unit: "px" as const } : dimension(token.toLowerCase());
        if (length !== undefined && /[\d.]/.test(token)) lengths.push(length);
        else if (color === undefined) color = parseColor(token);
        else return undefined;
        if (length === undefined && color === undefined) return undefined;
      }
    }
    const zero = { value: 0, unit: "px" as const };
    if (lengths.length < 2 || lengths.length > 4) return undefined;
    result.push({ offsetX: lengths[0]!, offsetY: lengths[1]!, blur: lengths[2] ?? zero, spread: lengths[3] ?? zero, color: color ?? parseColor("rgb(0 0 0 / 0.1)")!, ...(inset ? { inset: true } : {}) });
  }
  return result.length === 0 ? undefined : result;
}

export function parseLiteral(type: TokenType, input: string): LiteralValue | undefined {
  const text = input.trim().toLowerCase();
  switch (type) {
    case "color":
      return parseColor(input.trim());
    case "dimension":
      return dimension(text);
    case "number":
      if (text.endsWith("%") && NUMBER.test(text.slice(0, -1))) return Number(text.slice(0, -1)) / 100;
      return NUMBER.test(text) ? Number(text) : undefined;
    case "fontWeight": {
      const n = NUMBER.test(text) ? Number(text) : WEIGHTS[text.replace(/[\s-]/g, "")];
      return n !== undefined && Number.isInteger(n) && n >= 1 && n <= 1000 ? n : undefined;
    }
    case "fontFamily": {
      const families = input
        .split(",")
        .map((f) => f.trim().replace(/^["']|["']$/g, ""))
        .filter((f) => f !== "");
      return families.length > 0 ? families : undefined;
    }
    case "duration":
      return duration(text);
    case "cubicBezier":
      return curve(text);
    case "shadow":
      return shadow(input);
    case "typography":
      return undefined;
  }
}

// What the model or a person should write, per type, for error messages.
export const LITERAL_HINTS: Record<TokenType, string> = {
  color: "any CSS color, like #e11d48 or oklch(0.6 0.2 25)",
  dimension: "a length like 4px or 0.25rem",
  number: "a number like 0.97",
  fontFamily: "a font list like Inter, sans-serif",
  fontWeight: "a weight like 600 or bold",
  duration: "a time like 150ms or 0.2s",
  cubicBezier: "cubic-bezier(a, b, c, d) or ease, ease-in, ease-out, ease-in-out, linear",
  shadow: "CSS box-shadow text like 0 4px 12px rgb(0 0 0 / 0.08) (layers separated by commas), or a shadow token like {shadow.md}",
  typography: "a typography token",
};
