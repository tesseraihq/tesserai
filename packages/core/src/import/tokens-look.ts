import { parseColor, toCssOklch } from "../color";
import { DTCG_EXTENSION } from "../emit-dtcg";
import { readAnyColor, readPx } from "./css-look";
import { canonicalName, emptyLook, fontList, fontRoleForName, roleForName, type Found, type Look, type Scheme, type ShadowSize } from "./look";

// Reads a design-token file into a Look: W3C DTCG (2025.10 objects or older strings) or Tokens
// Studio's { value, type }. Semantic colors are placed by name (primary, bg, on-accent, line…);
// numbered groups become scales; radius, spacing, body size, fonts and shadows come from their
// usual groups. A path segment "dark" (or a file of its own, `scheme`) makes a color dark. Each
// value keeps the line it's on, and a `$extensions["tesserai.source"]` ("path:line") where a
// coding agent put one, which wins.

type Leaf = { path: string[]; type: string | undefined; value: unknown; source: string | undefined };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isToken(node: Record<string, unknown>): boolean {
  if ("$value" in node) return true;
  return "value" in node && (!isObject(node.value) || !Object.values(node.value).some(isObject)) && ("type" in node || !isObject(node.value));
}

// Where each key starts, by path: enough JSON scanning to cite a line, not a parser.
export function jsonLines(text: string): Map<string, number> {
  const out = new Map<string, number>();
  const path: (string | number)[] = [];
  const kinds: ("object" | "array")[] = [];
  const counters: number[] = [];
  let line = 1;
  let pendingKey: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === "\n") line++;
    else if (ch === '"') {
      let j = i + 1;
      let s = "";
      while (j < text.length && text[j] !== '"') {
        if (text[j] === "\\") j++;
        s += text[j];
        j++;
      }
      i = j;
      let k = i + 1;
      while (k < text.length && /\s/.test(text[k]!)) k++;
      if (text[k] === ":" && kinds.at(-1) === "object") {
        pendingKey = s;
        out.set([...path, s].join("."), line);
      } else if (kinds.at(-1) === "array") out.set([...path, counters[counters.length - 1]!].join("."), line);
    } else if (ch === "{" || ch === "[") {
      if (kinds.at(-1) === "array") path.push(counters[counters.length - 1]!);
      else if (pendingKey !== null) path.push(pendingKey);
      else if (kinds.length > 0) path.push("?");
      pendingKey = null;
      kinds.push(ch === "{" ? "object" : "array");
      counters.push(0);
    } else if (ch === "}" || ch === "]") {
      kinds.pop();
      counters.pop();
      if (kinds.length > 0) path.pop();
    } else if (ch === "," && kinds.at(-1) === "array") counters[counters.length - 1]!++;
    else if (ch === "," ) pendingKey = null;
  }
  return out;
}

function flatten(node: unknown, path: string[], type: string | undefined, out: Leaf[], file: string, lines: Map<string, number>) {
  if (!isObject(node)) return;
  const ownType = typeof node.$type === "string" ? node.$type : typeof node.type === "string" && !isToken(node) ? node.type : type;
  if (isToken(node)) {
    const tokenType = typeof node.$type === "string" ? node.$type : typeof node.type === "string" ? node.type : type;
    const ext = isObject(node.$extensions) ? node.$extensions["tesserai.source"] : undefined;
    const at = path.join(".");
    const line = lines.get(`${at}.$value.hex`) ?? lines.get(`${at}.$value.value`) ?? lines.get(`${at}.$value.0`) ?? lines.get(`${at}.$value`) ?? lines.get(`${at}.value`) ?? lines.get(at);
    out.push({ path, type: tokenType, value: "$value" in node ? node.$value : node.value, source: typeof ext === "string" ? ext : line === undefined ? undefined : `${file}:${line}` });
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    flatten(child, [...path, key], ownType, out, file, lines);
  }
}

// DTCG colors are strings or objects ({ colorSpace, components, alpha, hex }).
function toColor(value: unknown): string | undefined {
  if (typeof value === "string") return readAnyColor(value);
  if (isObject(value)) {
    const c = value.components;
    const alpha = typeof value.alpha === "number" ? value.alpha : 1;
    if (typeof value.hex === "string" && alpha === 1) return value.hex;
    if (Array.isArray(c) && c.length === 3 && c.every((n) => typeof n === "number")) {
      const space = value.colorSpace;
      const css =
        space === "oklch"
          ? `oklch(${c[0]} ${c[1]} ${c[2]} / ${alpha})`
          : space === "hsl"
            ? `hsl(${c[0]} ${c[1]}% ${c[2]}% / ${alpha})`
            : space === "srgb" || space === undefined
              ? `rgb(${c.map((n) => Math.round((n as number) * 255)).join(" ")} / ${alpha})`
              : undefined;
      return css === undefined || parseColor(css) === undefined ? undefined : css;
    }
  }
  return undefined;
}

// Style Dictionary writes sizes as bare rems ("0.5", "1") in files of { "value" } tokens with no
// types; anywhere else a bare number is px. Below 4, a bare number in such a file is a rem.
function toPx(value: unknown, bareRem = false): number | undefined {
  if (typeof value === "number") return bareRem && value < 4 ? value * 16 : value;
  if (typeof value === "string") return /^-?[\d.]+$/.test(value.trim()) ? (bareRem && Number(value) < 4 ? Number(value) * 16 : Number(value)) : readPx(value);
  if (isObject(value) && typeof value.value === "number") return value.unit === "rem" || value.unit === "em" ? value.value * 16 : value.value;
  return undefined;
}

function toShadow(value: unknown): string | undefined {
  const layers = Array.isArray(value) ? value : [value];
  const parts: string[] = [];
  for (const l of layers) {
    if (!isObject(l)) return undefined;
    const d = (v: unknown) => `${toPx(v) ?? 0}px`;
    const color = toColor(l.color);
    if (color === undefined) return undefined;
    const c = parseColor(color)!;
    parts.push(`${l.inset === true ? "inset " : ""}${d(l.offsetX)} ${d(l.offsetY)} ${d(l.blur)} ${d(l.spread)} ${toCssOklch(c)}`);
  }
  return parts.join(", ");
}

const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[\s_]+/g, "-").toLowerCase();

export function readTokenFile(json: unknown, file: string, text?: string, scheme: Scheme | undefined = undefined): Look | { error: string } {
  if (!isObject(json)) return { error: "that isn’t a token file (expected a JSON object)" };
  if (JSON.stringify(json).includes(`"${DTCG_EXTENSION}"`)) {
    return { error: "this is tesserai’s own token export; import the .tesserai.json file instead, which brings everything back exactly" };
  }
  const lines = text === undefined ? new Map<string, number>() : jsonLines(text);
  const leaves: Leaf[] = [];
  flatten(json, [], undefined, leaves, file, lines);
  const styleDictionary = leaves.length > 0 && leaves.every((l) => l.type === undefined) && !JSON.stringify(json).includes('"$value"');
  const px = (v: unknown) => toPx(v, styleDictionary);
  if (leaves.length === 0) return { error: "no tokens found (tokens have a $value, or a value and type)" };
  const byPath = new Map(leaves.map((l) => [l.path.join("."), l]));
  const resolve = (value: unknown, others?: Map<string, Leaf>): unknown => {
    let v = value;
    for (let hops = 0; hops < 10 && typeof v === "string" && /^\{[^}]+\}$/.test(v.trim()); hops++) {
      const ref = v.trim().slice(1, -1);
      const target = byPath.get(ref) ?? others?.get(ref);
      if (target === undefined) return undefined;
      v = target.value;
    }
    return v;
  };
  // The leaf an alias chain ends at: its line is where the value is written.
  const literal = (l: Leaf): Leaf => {
    let cur = l;
    for (let hops = 0; hops < 10 && typeof cur.value === "string" && /^\{[^}]+\}$/.test(cur.value.trim()); hops++) {
      const next = byPath.get(cur.value.trim().slice(1, -1));
      if (next === undefined) return cur;
      cur = next;
    }
    return cur;
  };
  const look = emptyLook();
  const used = new Set<string>();
  const key = (l: Leaf) => l.path.join(".");
  const schemeOf = (l: Leaf): Scheme => (scheme === "dark" || l.path.some((p) => /^dark$/i.test(p)) ? "dark" : "light");

  // Numbered color groups: scales, each step exact.
  const groups = new Map<string, Leaf[]>();
  for (const l of leaves) {
    if (l.path.length < 2 || !/^\d+$/.test(l.path.at(-1)!)) continue;
    const g = l.path.slice(0, -1).join(".");
    groups.set(g, [...(groups.get(g) ?? []), l]);
  }
  for (const [g, members] of groups) {
    const steps = members
      .map((l) => ({ l, color: toColor(resolve(l.value)) }))
      .filter((x): x is { l: Leaf; color: string } => x.color !== undefined)
      .sort((a, b) => Number(a.l.path.at(-1)) - Number(b.l.path.at(-1)));
    if (steps.length < 3) continue;
    look.scales.push({ name: g.split(".").at(-1)!, steps: steps.map((s) => ({ step: s.l.path.at(-1)!, value: { value: s.color, source: s.l.source, name: key(s.l) } })) });
    for (const s of steps) used.add(key(s.l));
  }

  // Semantic colors, by name.
  const names = new Set(leaves.map((l) => canonicalName(l.path.at(-1)!)));
  for (const l of leaves) {
    if (used.has(key(l))) continue;
    const color = toColor(resolve(l.value));
    if (color === undefined) continue;
    const leaf = l.path.at(-1)!;
    const chart = /^chart-?([1-5])$/.exec(kebab(leaf));
    const role = chart !== null ? `chart.${chart[1]}` : roleForName(leaf, names);
    if (role === undefined) continue;
    const s = schemeOf(l);
    if (!look.colors[s].has(role)) look.colors[s].set(role, { value: color, source: literal(l).source, name: key(l), origin: key(literal(l)) });
    used.add(key(l));
  }

  // Shape, space, type, shadows.
  const inGroup = (pattern: RegExp) => leaves.filter((l) => !used.has(key(l)) && l.path.slice(0, -1).some((p) => pattern.test(kebab(p))));
  const pick = (candidates: Leaf[], preferred: RegExp) => candidates.find((l) => preferred.test(kebab(l.path.at(-1)!)));

  const radii = [...inGroup(/^(radius|radii|rounded|border-radius|corner-radius|shape)$/), ...leaves.filter((l) => !used.has(key(l)) && (l.type === "borderRadius" || /^(radius|border-radius)$/.test(kebab(l.path.at(-1)!))))].filter((l) => px(resolve(l.value)) !== undefined);
  if (radii.length > 0) {
    const chosen = pick(radii, /^(md|default|base|m|radius|border-radius)$/) ?? radii[Math.floor(radii.length / 2)]!;
    look.radius = { value: px(resolve(chosen.value))!, source: literal(chosen).source, name: key(chosen), origin: key(literal(chosen)) };
    for (const r of radii) used.add(key(r));
  }
  const spaces = [...inGroup(/^(spacing|space|spacings|spacer)$/), ...leaves.filter((l) => !used.has(key(l)) && l.type === "spacing")].filter((l) => px(resolve(l.value)) !== undefined);
  if (spaces.length > 0) {
    const unit = pick(spaces, /^(1|xs|unit|base)$/) ?? [...spaces].sort((a, b) => px(resolve(a.value))! - px(resolve(b.value))!).find((l) => px(resolve(l.value))! >= 2);
    if (unit !== undefined) look.spacing = { value: px(resolve(unit.value))!, source: literal(unit).source, name: key(unit), origin: key(literal(unit)) };
    for (const sp of spaces) used.add(key(sp));
  }
  const sizes = [...inGroup(/^(font-size|font-sizes|fontsize|text|type-scale|size)$/), ...leaves.filter((l) => !used.has(key(l)) && (l.type === "fontSizes" || l.type === "fontSize"))].filter((l) => px(resolve(l.value)) !== undefined);
  if (sizes.length > 0) {
    const body = pick(sizes, /^(base|md|body|default|m|regular)$/);
    if (body !== undefined) look.baseSize = { value: px(resolve(body.value))!, source: literal(body).source, name: key(body), origin: key(literal(body)) };
    for (const s of sizes) used.add(key(s));
  }
  for (const l of leaves) {
    if (used.has(key(l))) continue;
    const isFamily = l.type === "fontFamily" || l.type === "fontFamilies" || l.path.slice(0, -1).some((p) => /^font-?famil|^fonts?$/.test(kebab(p)));
    if (!isFamily) continue;
    used.add(key(l));
    const role = fontRoleForName(l.path.at(-1)!);
    const list = fontList(resolve(l.value));
    if (role === undefined || list.length === 0) {
      look.skipped.push({ name: key(l), why: role === undefined ? "not a sans, heading or mono font" : "no font names in it" });
      continue;
    }
    look.fonts[role] ??= { value: list, source: literal(l).source, name: key(l), origin: key(literal(l)) };
  }
  for (const l of leaves) {
    if (used.has(key(l)) || !(l.type === "shadow" || l.type === "boxShadow" || l.path.some((p) => /^(shadow|shadows|elevation|box-shadow)$/.test(kebab(p))))) continue;
    used.add(key(l));
    const value = typeof l.value === "string" && !/^\{/.test(l.value) ? l.value : toShadow(resolve(l.value));
    const leaf = kebab(l.path.at(-1)!);
    const size: ShadowSize | undefined = /^(sm|small|1|xs)$/.test(leaf) ? "sm" : /^(md|medium|2|base|default|card)$/.test(leaf) ? "md" : /^(lg|large|3|xl)$/.test(leaf) ? "lg" : undefined;
    if (value === undefined || size === undefined) {
      look.skipped.push({ name: key(l), why: value === undefined ? "not a shadow tesserai can read" : "not a small, medium or large shadow" });
      continue;
    }
    look.shadows[size] ??= { value, source: l.source, name: key(l) };
  }

  // What's left, grouped so a big file doesn't bury the list.
  const leftover = new Map<string, number>();
  for (const l of leaves) {
    if (used.has(key(l))) continue;
    const g = l.path.slice(0, -1).join(".") || l.path[0]!;
    leftover.set(g, (leftover.get(g) ?? 0) + 1);
  }
  for (const [group, count] of [...leftover].slice(0, 30)) look.skipped.push({ name: group, why: `${count} ${count === 1 ? "token" : "tokens"} with no place in tesserai’s model` });
  if (leftover.size > 30) look.skipped.push({ name: `${leftover.size - 30} more groups`, why: "not used" });
  return look;
}

// Tokens Studio keeps sets in separate files ("core", "light", "dark") that refer to each other.
// Reads them as one: a set named or themed dark is the dark scheme.
export function readTokenSets(files: { file: string; text: string }[]): Look | { error: string } {
  const merged: Record<string, unknown> = {};
  const dark: Record<string, unknown> = {};
  let any = false;
  for (const f of files) {
    let json: unknown;
    try {
      json = JSON.parse(f.text);
    } catch {
      continue;
    }
    if (!isObject(json) || /\$(themes|metadata)\.json$/.test(f.file)) continue;
    any = true;
    Object.assign(/(^|\/)dark\.json$|[-_.]dark\.(tokens\.)?json$/i.test(f.file) ? dark : merged, json);
  }
  if (!any) return { error: "no token files" };
  // Light: the shared sets and the light one; dark: the same with the dark set over them.
  const texts = files.map((f) => f.text);
  const light = readTokenFile(merged, "", undefined);
  if ("error" in light) return light;
  const withSources = (look: Look) => {
    // Sources point at the file each value came from.
    const where = (f: Found<unknown>, scheme: Scheme = "light") => sourceOf(files, texts, f.origin ?? f.name, scheme);
    for (const scheme of ["light", "dark"] as const) for (const f of look.colors[scheme].values()) f.source = where(f, scheme);
    for (const s of look.scales) for (const st of s.steps) st.value.source = where(st.value);
    for (const f of Object.values(look.fonts)) if (f) f.source = where(f);
    for (const k of ["baseSize", "radius", "spacing"] as const) if (look[k]) look[k]!.source = where(look[k]!);
    return look;
  };
  if (Object.keys(dark).length === 0) return withSources(light);
  const darkLook = readTokenFile({ ...merged, ...dark }, "", undefined, "dark");
  if (!("error" in darkLook)) {
    // Only the dark set's own semantic colors are dark; the shared ones are already light.
    const darkNames = new Set(Object.keys(flattenNames(dark)));
    for (const [role, f] of darkLook.colors.dark) if (f.name !== undefined && darkNames.has(f.name)) light.colors.dark.set(role, { ...f });
  }
  return withSources(light);
}

function flattenNames(node: unknown, prefix: string[] = [], out: Record<string, true> = {}): Record<string, true> {
  if (!isObject(node)) return out;
  if (isToken(node)) {
    out[prefix.join(".")] = true;
    return out;
  }
  for (const [k, v] of Object.entries(node)) if (!k.startsWith("$")) flattenNames(v, [...prefix, k], out);
  return out;
}

// The file a set's value is in: the dark set's for dark colors, the others' for the rest.
function sourceOf(files: { file: string; text: string }[], texts: string[], name: string | undefined, scheme: Scheme = "light"): string | undefined {
  if (name === undefined) return undefined;
  const isDark = (f: string) => /(^|\/)dark\.json$|[-_.]dark\.(tokens\.)?json$/i.test(f);
  const order = files.map((_, i) => i).sort((a, b) => Number(isDark(files[b]!.file) === (scheme === "dark")) - Number(isDark(files[a]!.file) === (scheme === "dark")));
  for (const i of order) {
    const lines = jsonLines(texts[i]!);
    const line = lines.get(`${name}.$value.hex`) ?? lines.get(`${name}.$value.value`) ?? lines.get(`${name}.$value.0`) ?? lines.get(`${name}.$value`) ?? lines.get(`${name}.value`) ?? lines.get(name);
    if (line !== undefined) return `${files[i]!.file}:${line}`;
  }
  return undefined;
}
