import { z } from "zod";

// Icons: which library the generated components use, how heavy its lines are, which icon sits in
// each spot, and the system's own icons (logos and the like). Components name icons by meaning
// ("chevron-down"); the printer turns each into the chosen library's icon
// (packages/templates/src/icons.ts).

export const ICON_LIBRARIES = ["lucide", "tabler", "phosphor", "hugeicons", "remix"] as const;
export type IconLibrary = (typeof ICON_LIBRARIES)[number];

// Phosphor draws each weight separately; Remix has line and fill. The stroke libraries (Lucide,
// Tabler, Hugeicons) use `stroke` instead.
export const ICON_WEIGHTS = ["thin", "light", "regular", "bold", "fill", "duotone"] as const;
export type IconWeight = (typeof ICON_WEIGHTS)[number];

export const MAX_CUSTOM_ICONS = 300;
export const MAX_ICON_BYTES = 20_000;

// ---------- sanitizing an SVG someone brought ----------

// What's kept: shapes, groups, gradients, clipping and masks, and the attributes that draw them.
// Everything else (scripts, event handlers, foreignObject, external references, styles that could
// load anything) is dropped. The output is rebuilt from what was parsed, never passed through.
const ELEMENTS = new Set([
  "svg", "g", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon", "defs",
  "linearGradient", "radialGradient", "stop", "clipPath", "mask", "use",
]);
const ATTRIBUTES = new Set([
  "d", "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2", "width", "height", "points", "viewBox",
  "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-dasharray",
  "stroke-dashoffset", "fill-rule", "clip-rule", "opacity", "fill-opacity", "stroke-opacity", "transform", "id",
  "clip-path", "mask", "offset", "stop-color", "stop-opacity", "gradientUnits", "gradientTransform", "fx", "fy",
  "spreadMethod", "href", "xlink:href", "vector-effect",
]);
const COLOR_ATTRIBUTES = ["fill", "stroke", "stop-color"];

// A value is kept only if it can't reach outside the icon: no url() except to one of its own ids,
// no scripts, no markup.
function safeValue(name: string, value: string): string | null {
  const v = value.trim();
  if (v.length > 20_000 || /[<>"`&]/.test(v) || /javascript:|data:|expression\(|@import/i.test(v)) return null;
  if (name === "href" || name === "xlink:href") return /^#[\w-]+$/.test(v) ? v : null;
  const urls = v.match(/url\([^)]*\)/gi) ?? [];
  if (urls.some((u) => !/^url\(\s*#[\w-]+\s*\)$/i.test(u))) return null;
  return v;
}

type Node = { tag: string; attrs: [string, string][]; children: Node[] };

// A small, strict tokenizer for the SVG subset above: tags and attributes, nothing else.
function parse(input: string): Node | string {
  const text = input.replace(/<\?xml[\s\S]*?\?>/g, "").replace(/<!--[\s\S]*?-->/g, "").replace(/<!DOCTYPE[\s\S]*?>/gi, "").replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");
  const tag = /<\/?([A-Za-z][\w:.-]*)((?:\s+[\w:.-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*(\/?)>/g;
  const root: Node = { tag: "#root", attrs: [], children: [] };
  const stack: Node[] = [root];
  // Content inside a dropped element is dropped with it.
  let skipping = 0;
  let count = 0;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(text)) !== null) {
    const [whole, name = "", rawAttrs = "", selfClosing] = m;
    const closing = whole.startsWith("</");
    if (++count > 5000) return "the SVG has too many elements";
    if (closing) {
      if (skipping > 0) {
        skipping -= 1;
        continue;
      }
      if (stack.length > 1 && stack.at(-1)!.tag === name) stack.pop();
      continue;
    }
    const allowed = ELEMENTS.has(name) && skipping === 0;
    if (!allowed) {
      if (selfClosing !== "/") skipping += 1;
      continue;
    }
    const attrs: [string, string][] = [];
    for (const a of rawAttrs.matchAll(/([\w:.-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g)) {
      const key = a[1]!;
      const value = a[2] ?? a[3] ?? "";
      if (key === "style") {
        // Declarations become attributes, so exports that style inline keep their colors.
        for (const decl of value.split(";")) {
          const [prop, ...rest] = decl.split(":");
          const p = prop?.trim() ?? "";
          const v = rest.join(":");
          const safe = ATTRIBUTES.has(p) ? safeValue(p, v) : null;
          if (safe !== null) attrs.push([p, safe]);
        }
        continue;
      }
      if (!ATTRIBUTES.has(key)) continue;
      if (key === "href" || key === "xlink:href") {
        if (name !== "use") continue;
      }
      const safe = safeValue(key, value);
      if (safe !== null) attrs.push([key === "xlink:href" ? "href" : key, safe]);
    }
    // A reference that pointed outside the icon was dropped: the element goes with it.
    if (name === "use" && !attrs.some(([k]) => k === "href")) {
      if (selfClosing !== "/") skipping += 1;
      continue;
    }
    const node: Node = { tag: name, attrs, children: [] };
    stack.at(-1)!.children.push(node);
    if (selfClosing !== "/") stack.push(node);
    if (stack.length > 40) return "the SVG is nested too deeply";
  }
  const svg = root.children.find((n) => n.tag === "svg");
  return svg ?? "that isn't an SVG";
}

function print(node: Node, colorMap: (value: string) => string): string {
  const attrs = node.attrs.map(([k, v]) => ` ${k}="${COLOR_ATTRIBUTES.includes(k) ? colorMap(v) : v}"`).join("");
  return node.children.length === 0 ? `<${node.tag}${attrs}/>` : `<${node.tag}${attrs}>${node.children.map((c) => print(c, colorMap)).join("")}</${node.tag}>`;
}

function colorsOf(node: Node, into = new Set<string>()): Set<string> {
  for (const [k, v] of node.attrs) {
    if (!COLOR_ATTRIBUTES.includes(k)) continue;
    const c = v.trim().toLowerCase();
    if (c !== "none" && c !== "currentcolor" && c !== "transparent" && !c.startsWith("url(")) into.add(c);
  }
  for (const child of node.children) colorsOf(child, into);
  return into;
}

export type SanitizedSvg = {
  // The cleaned icon: an <svg> with a viewBox and no size of its own.
  svg: string;
  viewBox: string;
  // One color (or none: black by default) means it can follow the text color.
  colors: number;
  aspect: number;
};

export function sanitizeSvg(input: string, options: { currentColor?: boolean } = {}): { ok: true; icon: SanitizedSvg } | { ok: false; problem: string } {
  if (input.length > MAX_ICON_BYTES * 3) return { ok: false, problem: "that SVG is too large" };
  const parsed = parse(input);
  if (typeof parsed === "string") return { ok: false, problem: parsed };
  const get = (k: string) => parsed.attrs.find(([key]) => key === k)?.[1];
  const w = Number.parseFloat(get("width") ?? "");
  const h = Number.parseFloat(get("height") ?? "");
  const viewBox = get("viewBox") ?? (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0 ? `0 0 ${w} ${h}` : undefined);
  const box = viewBox?.split(/[\s,]+/).map(Number);
  if (viewBox === undefined || box === undefined || box.length !== 4 || box.some((n) => !Number.isFinite(n)) || box[2]! <= 0 || box[3]! <= 0) {
    return { ok: false, problem: "the SVG needs a viewBox (or a width and height)" };
  }
  if (parsed.children.length === 0) return { ok: false, problem: "the SVG draws nothing" };
  const colors = colorsOf(parsed);
  // A single-color icon follows the text color: its color becomes currentColor, and a shape with
  // no fill (black by default) is filled with it.
  const mono = (options.currentColor ?? true) && colors.size <= 1;
  const only = [...colors][0];
  const colorMap = (v: string) => (mono && only !== undefined && v.trim().toLowerCase() === only ? "currentColor" : v);
  // The root keeps what it draws with (fill, stroke…), not its size or id.
  const own = parsed.attrs.filter(([k]) => !["xmlns", "viewBox", "width", "height", "id", "x", "y"].includes(k));
  const needsFill = mono && colors.size === 0 && !own.some(([k]) => k === "fill");
  const root: Node = {
    tag: "svg",
    attrs: [["xmlns", "http://www.w3.org/2000/svg"], ["viewBox", box.join(" ")], ...own, ...(needsFill ? ([["fill", "currentColor"]] as [string, string][]) : [])],
    children: parsed.children,
  };
  const svg = print(root, colorMap);
  if (svg.length > MAX_ICON_BYTES) return { ok: false, problem: `the SVG is over ${MAX_ICON_BYTES / 1000} KB once cleaned; simplify it first` };
  return { ok: true, icon: { svg, viewBox: box.join(" "), colors: mono ? 0 : colors.size, aspect: box[2]! / box[3]! } };
}

// Stored icons are always ones sanitizing leaves as they are: the server checks every save.
const CleanSvg = z
  .string()
  .max(MAX_ICON_BYTES)
  .refine((svg) => {
    const again = sanitizeSvg(svg, { currentColor: false });
    return again.ok && again.icon.svg === svg;
  }, "the SVG isn't one tesserai cleaned");

export const CustomIcon = z
  .object({
    // Written into generated code (a comment): no control characters or line breaks.
    name: z.string().min(1).max(60).regex(/^[^\u0000-\u001f\u007f\u2028\u2029]+$/, "a name on one line"),
    svg: CleanSvg,
    // A dark-mode version, for logos whose colors don't work on dark.
    dark: CleanSvg.optional(),
  })
  .strict();
export type CustomIcon = z.infer<typeof CustomIcon>;

// What goes in a spot: a meaning ("chevron-down", drawn from the chosen library), an icon from a
// named library ("tabler:IconBolt"), or one of the system's own ("custom:acme-logo").
export const IconRef = z.string().regex(/^(?:[a-z0-9-]+|(?:lucide|tabler|phosphor|hugeicons|remix):[A-Za-z0-9]+|custom:[a-z][a-z0-9-]*)$/, "an icon reference");

export const IconSettings = z
  .object({
    library: z.enum(ICON_LIBRARIES).default("lucide"),
    stroke: z.number().min(0.5).max(3).default(2),
    weight: z.enum(ICON_WEIGHTS).default("regular"),
    // Spots changed from the default, by "<component>:<meaning>" (the icon a component draws).
    spots: z.record(z.string().max(100), IconRef).default({}),
    custom: z.record(z.string().regex(/^[a-z][a-z0-9-]{0,39}$/), CustomIcon).default({}),
  })
  .strict();
export type IconSettings = z.infer<typeof IconSettings>;

export const DEFAULT_ICONS: IconSettings = { library: "lucide", stroke: 2, weight: "regular", spots: {}, custom: {} };

export function iconSettings(system: { icons?: IconSettings | undefined }): IconSettings {
  return system.icons ?? DEFAULT_ICONS;
}

// The component name a custom icon exports: "acme-logo" -> "AcmeLogoIcon".
export function customIconName(id: string): string {
  return `${id.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("")}Icon`;
}
