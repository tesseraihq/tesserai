// What a className, class, style or sx on a system component changes: the design (its color,
// corners, spacing, height, type, border, shadow, effects), or only where it sits (placement: margins,
// width, position, flex and grid placement), which isn't the system falling short.
//
// Ways it could go wrong, written before the code (AGENTS.md):
// - Placement counted as an override (mt-4, w-full on a Button): placement is its own kind and a site
//   with nothing else isn't an override.
// - text-lg read as a color, or text-red-600 as type: text- is type for sizes, alignment and
//   wrapping, and color otherwise; the same for border- (width or color) and bg- (color or image).
// - A variant prefix hiding the utility (hover:bg-red-700, md:rounded-none, !p-2, -mt-2): stripped
//   before reading it; the class keeps it when reported.
// - An expression read as nothing (className={styles.danger}): a value the reader can't see is an
//   override of unknown kind; only a pass-through of the component's own className is skipped.
import type { Attr } from "./tags";

export type Kind = "color" | "radius" | "spacing" | "size" | "typography" | "border" | "shadow" | "effects" | "unknown";
type Read = Kind | "placement" | "ignore";

const TEXT_TYPE = /^text-(xs|sm|base|lg|xl|\d?xl|left|center|right|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip|\[\d)/;
const BORDER_WIDTH = /^border(-[xytrblse])?(-\d+|-\[\d)?$|^border-(solid|dashed|dotted|double|hidden|none)$/;
const BG_IMAGE = /^bg-(none|cover|contain|auto|center|top|bottom|left|right|fixed|local|scroll|repeat|no-repeat|clip-|origin-|linear-|radial-|conic-|gradient-|blend-)/;

// One utility, variants and important marks taken off.
export function readClass(cls: string): Read {
  const u = cls.slice(cls.lastIndexOf(":") + 1).replace(/^!|!$/g, "").replace(/^-/, "");
  if (u === "" || /^(group|peer)(\/|$)/.test(u)) return "ignore";
  if (/^rounded(-|$)/.test(u)) return "radius";
  if (/^(p|px|py|pt|pr|pb|pl|ps|pe|gap|gap-x|gap-y|space-x|space-y)-/.test(u)) return "spacing";
  if (/^(h|min-h|max-h|size)-/.test(u)) return "size";
  if (/^(m|mx|my|mt|mr|mb|ml|ms|me|w|min-w|max-w|inset|inset-x|inset-y|top|right|bottom|left|start|end|z|order|col|row|basis|grow|shrink|flex|self|justify-self|place-self|justify|items|content|place|overflow|float|clear|columns|aspect|object)(-|$)/.test(u)) return "placement";
  if (/^(absolute|relative|fixed|sticky|static|block|inline|inline-block|inline-flex|inline-grid|flex|grid|contents|hidden|table|visible|invisible|collapse|isolate|sr-only|not-sr-only|container|mx-auto|truncate)$/.test(u)) return u === "truncate" ? "typography" : "placement";
  if (/^(grid-cols|grid-rows|auto-cols|auto-rows|grid-flow)-/.test(u)) return "placement";
  if (TEXT_TYPE.test(u)) return "typography";
  if (/^(font|leading|tracking|indent|align|whitespace|break|line-clamp|list|hyphens)-/.test(u) || /^(uppercase|lowercase|capitalize|normal-case|italic|not-italic|underline|overline|line-through|no-underline|antialiased|subpixel-antialiased|tabular-nums|ordinal|slashed-zero|lining-nums|oldstyle-nums|proportional-nums|diagonal-fractions)$/.test(u)) return "typography";
  if (/^decoration-(solid|double|dotted|dashed|wavy|auto|from-font|\d)/.test(u)) return "typography";
  if (BORDER_WIDTH.test(u) || /^(ring|outline|divide)(-|$)/.test(u)) return /^(ring|outline|divide)-(?!\d|inset|none|offset|hidden|dashed|dotted|double|solid|x|y|\[\d)[a-z]/.test(u) ? "color" : "border";
  if (/^(border|bg|text|from|via|to|fill|stroke|accent|caret|decoration|placeholder|shadow-color)-/.test(u)) {
    if (u.startsWith("bg-") && BG_IMAGE.test(u)) return "effects";
    if (/^stroke-(\d|\[\d)/.test(u)) return "border";
    return "color";
  }
  if (/^(shadow|drop-shadow|inset-shadow)(-|$)/.test(u)) return "shadow";
  if (/^(opacity|transition|duration|ease|delay|animate|transform|scale|rotate|translate|skew|origin|blur|brightness|contrast|grayscale|hue-rotate|invert|saturate|sepia|backdrop|filter|mix-blend|bg-blend|cursor|pointer-events|select|resize|will-change|appearance|touch|scroll|snap)(-|$)/.test(u)) return "effects";
  return "unknown";
}

// A CSS property (style={{…}}, sx, style="…"), camelCase or kebab-case.
export function readStyleKey(key: string): Read {
  const k = key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  if (/^(color|bgcolor|background|backgroundColor|fill|stroke|accentColor|caretColor|borderColor|outlineColor|textDecorationColor)$/.test(k)) return "color";
  if (/^border(Top|Bottom|Left|Right|Start|End)?(Left|Right|Start|End)?Radius$|^borderRadius$/.test(k)) return "radius";
  if (/^(p|px|py|pt|pr|pb|pl|padding\w*|gap|rowGap|columnGap)$/.test(k)) return "spacing";
  if (/^(height|minHeight|maxHeight|blockSize|h)$/.test(k)) return "size";
  if (/^(font\w*|lineHeight|letterSpacing|textTransform|textAlign|textDecoration\w*|whiteSpace|wordBreak|typography)$/.test(k)) return "typography";
  if (/^(border|border(Top|Bottom|Left|Right)?(Width|Style)?|borderTop|borderBottom|borderLeft|borderRight|outline\w*)$/.test(k)) return "border";
  if (/^boxShadow$/.test(k)) return "shadow";
  if (/^(opacity|transition\w*|transform\w*|filter|backdropFilter|cursor|animation\w*|backgroundImage|mixBlendMode)$/.test(k)) return "effects";
  return "placement";
}

// Calls whose string arguments are classes; any other call's are data (includes("@")).
const CLASS_CALLS = /^(cn|clsx|cx|classNames|classnames|twMerge|twJoin|tw|cva|tv)$/;

// The class strings in an expression: cn("a", x && "b"), `a ${x ? "b" : ""}`, { "a": x }, [x && "a"].
// Not a string compared (view === 'list') or passed to another call (email.includes("@")).
function literalsIn(expr: string): string[] {
  const out: string[] = [];
  for (const m of expr.matchAll(/(["'])((?:\\.|(?!\1)[^\\])*)\1|`((?:\\.|[^`\\])*)`/g)) {
    const before = expr.slice(0, m.index).trimEnd();
    const after = expr.slice(m.index! + m[0].length).trimStart();
    if (/(===?|!==?|<=?|>=?)$/.test(before) || /^(===?|!==?|<=?|>=?)/.test(after)) continue;
    const call = /([\w$.]+)\s*\($/.exec(before);
    if (call !== null && !CLASS_CALLS.test(call[1]!.split(".").pop()!) && !/,\s*$/.test(before)) continue;
    if (m[3] !== undefined) {
      // A template literal: its text, and the strings inside its ${…}.
      out.push(m[3].replace(/\$\{(?:[^{}]|\{[^{}]*\})*\}/g, " "));
      for (const inner of m[3].matchAll(/\$\{((?:[^{}]|\{[^{}]*\})*)\}/g)) out.push(...literalsIn(inner[1]!));
    } else out.push(m[2]!);
  }
  return out;
}

// A class value in markup with {…} in it (Svelte: class="a {b ? 'c' : ''}"): its text, and the
// strings in each expression; a pass-through of the caller's class adds nothing, another value is unknown.
function markupClasses(value: string): { words: string[]; unknown: boolean } {
  let unknown = false;
  const words: string[] = [];
  const text = value.replace(/\{([^{}]*)\}/g, (_, inner: string) => {
    if (/^\s*(className|class|klass|\$\$props\.class|props\.class)\s*$/.test(inner)) return " ";
    const found = literalsIn(inner);
    if (found.length === 0) unknown = true;
    words.push(...found);
    return " ";
  });
  return { words: [text, ...words].flatMap((s) => s.split(/\s+/)).filter(Boolean), unknown };
}

// The keys of an object literal's top level: { borderRadius: 0, "&:hover": {…} }.
function keysIn(object: string): string[] | null {
  const body = object.trim();
  if (!body.startsWith("{")) return null;
  const keys: string[] = [];
  let depth = 0;
  let token = "";
  let expectKey = true;
  for (let i = 1; i < body.length - 1; i++) {
    const c = body[i]!;
    if (c === '"' || c === "'" || c === "`") {
      const end = body.indexOf(c, i + 1);
      if (depth === 0 && expectKey) token = body.slice(i + 1, end);
      i = end === -1 ? body.length : end;
    } else if (c === "{" || c === "(" || c === "[") depth++;
    else if (c === "}" || c === ")" || c === "]") depth--;
    else if (depth === 0 && c === ":" && expectKey) {
      if (token.trim()) keys.push(token.trim());
      token = "";
      expectKey = false;
    } else if (depth === 0 && c === ",") {
      expectKey = true;
      token = "";
    } else if (depth === 0 && expectKey && /[\w$&-]/.test(c)) token += c;
  }
  return keys;
}

export type Styled = { kinds: Kind[]; classes: string[] };

// What an element's styling attributes change, or null when they change nothing of the design.
export function stylingOf(attrs: Attr[]): Styled | null {
  const kinds = new Set<Kind>();
  const classes: string[] = [];
  const read = (r: Read, cls?: string) => {
    if (r === "placement" || r === "ignore") return;
    kinds.add(r);
    if (cls !== undefined) classes.push(cls);
  };
  for (const attr of attrs) {
    const name = attr.name.replace(/^(v-bind)?:/, "");
    const bound = attr.name !== name || !attr.quoted;
    const value = attr.value ?? "";
    if (name === "className" || name === "class") {
      // Passing the caller's own className through isn't an override.
      if (bound && /^\s*(props\.)?(className|class|klass|\$\$props\.class)\s*$/.test(value)) continue;
      const inMarkup = bound ? null : markupClasses(value);
      const words = inMarkup !== null ? inMarkup.words : literalsIn(value).flatMap((s) => s.split(/\s+/)).filter(Boolean);
      if ((bound && words.length === 0) || inMarkup?.unknown === true) kinds.add("unknown");
      for (const w of words) read(readClass(w), w);
    } else if (name === "style" || name === "sx") {
      if (!bound) {
        for (const decl of value.split(";")) {
          const key = decl.split(":")[0]?.trim();
          if (key) read(readStyleKey(key));
        }
        continue;
      }
      const keys = keysIn(value);
      if (keys === null) kinds.add("unknown");
      else for (const key of keys) read(key.startsWith("&") || key.startsWith("@") ? "unknown" : readStyleKey(key));
    }
  }
  return kinds.size === 0 ? null : { kinds: [...kinds].sort(), classes };
}
