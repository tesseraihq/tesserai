import { TAILWIND_SPACING_REM, colorDistance, includedComponents, parseColor, platformTokens, toHex, type ColorValue, type DesignSystem } from "@tesserai/core";
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";
import { stylingOf, type Kind } from "./overrides";
import { TAILWIND_PALETTE } from "./tailwind-palette";
import { readElements, type Attr } from "./tags";

// `npx @tesserai/cli scan`: how the app uses its design system. Which components and options it uses (so
// unused ones can be left out), and which values bypass the system (a hex color, p-[13px]), each
// with the token to use instead, and an adoption score.
// It reads code with patterns, not a parser. With --fix it rewrites only exact matches (a
// hard-coded value that is a system value), so nothing looks different afterwards.

// `fix`: on that line, `from` becomes `to`; only for exact matches.
export type Finding = { file: string; line: number; text: string; suggestion: string; fix?: { from: string; to: string } };
export type Adoption = {
  // 0-100: the average of the two shares below.
  score: number;
  // Controls (buttons, inputs, selects…) that are the system's components, not raw HTML ones.
  components: { system: number; raw: number };
  // Style values that come from the system's tokens, not hard-coded.
  values: { tokens: number; hardCoded: number };
};
// One component's use. `uses`: elements of its own export (<Button>, <Dialog.Root>), not its parts.
// `options`: uses of each option by axis, a use without the prop counting for the default;
// `dynamic`: uses where the option is an expression (it could be any). `props`: the options
// written out, as before.
export type ComponentUse = {
  name: string;
  uses: number;
  files: number;
  options: Record<string, Record<string, number>>;
  dynamic: Record<string, number>;
  props: Record<string, Record<string, number>>;
};
// An option no use sets. Certain unless the axis is also set from an expression somewhere.
export type UnusedOption = { component: string; axis: string; value: string; certain: boolean };
// Where a use (or one of its parts) restyles the component: what kind of thing it changes, and the
// classes that do it. Placement (margins, width, position) isn't counted.
export type OverrideSite = { file: string; line: number; part: string; kinds: Kind[]; classes: string[] };
export type Override = { component: string; count: number; kinds: Partial<Record<Kind, number>>; sites: OverrideSite[] };
// The same override on three or more uses: something the system should offer.
export type Suggestion = { component: string; class: string; count: number; kind: Kind; message: string };
// A file tesserai generated that has been changed by hand since: the system no longer describes
// what ships (and sync keeps the edit, writing the new version beside it). `component` when it's one.
export type Edited = { file: string; component: string | null };
export type ScanResult = {
  files: number;
  components: ComponentUse[];
  unused: string[];
  unusedOptions: UnusedOption[];
  overrides: Override[];
  suggestions: Suggestion[];
  edited: Edited[];
  hardCoded: Finding[];
  adoption: Adoption;
};

// Raw controls an app has the system's components for.
const RAW_CONTROLS = /<(button|input|select|textarea|dialog)\b/g;
// Theme utilities: colors by role, radius and spacing steps (bg-primary-solid, rounded-md, p-4).
const THEME_UTILITY = /\b(?:bg|text|border|ring|fill|stroke|outline)-(?:primary|neutral|danger|warning|success|info|brand|surface)[a-z0-9-]*|\brounded-(?:none|sm|md|lg|xl|2xl|full)\b|\b(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap)-\d+(?:\.5)?\b|var\(--[a-z]/g;

const SOURCE = new Set([".tsx", ".ts", ".jsx", ".js", ".css", ".scss", ".vue", ".svelte", ".astro", ".html", ".mdx"]);
const SKIP = new Set(["node_modules", "dist", "build", ".next", ".git", ".turbo", ".vercel", "coverage", "tesserai"]);

async function walk(dir: string, root: string, out: string[], generated: Set<string>) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".storybook") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP.has(entry.name)) continue;
      // The generated components are the system itself, not a use of it.
      if (relative(root, path).split(sep).join("/").endsWith("components/ui")) continue;
      await walk(path, root, out, generated);
    } else if (SOURCE.has(extname(entry.name)) && !generated.has(relative(root, path).split(sep).join("/"))) out.push(path);
  }
}

type Candidate = { name: string; color: ColorValue };

function nearest(color: ColorValue, candidates: Candidate[]): { name: string; distance: number } | null {
  let best: { name: string; distance: number } | null = null;
  for (const c of candidates) {
    const d = colorDistance(color, c.color);
    if (best === null || d < best.distance) best = { name: c.name, distance: d };
  }
  return best;
}

function nearestSize(px: number, sizes: Record<string, number>, prefix: string): string | null {
  let best: [string, number] | null = null;
  for (const [k, v] of Object.entries(sizes)) if (best === null || Math.abs(v - px) < Math.abs(best[1] - px)) best = [k, v];
  return best === null ? null : `${prefix}${best[0].replace(/^[a-z]+(?=\d)/, "")} (${best[1]}px)`;
}

type Use = { files: Set<string>; uses: number; options: Record<string, Record<string, number>>; dynamic: Record<string, number>; props: Record<string, Record<string, number>> };
const blank = (): Use => ({ files: new Set(), uses: 0, options: {}, dynamic: {}, props: {} });
// A component's export: button → Button, alert-dialog → AlertDialog.
const pascal = (name: string) => name.replace(/(^|-)([a-z0-9])/g, (_, __, c: string) => c.toUpperCase());

// How a use sets an axis: not at all (null, the default), to an option, or from an expression.
// variant="x", variant={"x"}, :variant="'x'" are options; variant={v}, :variant="a ? 'b' : 'c'" aren't.
function optionOf(attrs: Attr[], axis: string): { value: string; dynamic: false } | { dynamic: true } | null {
  const attr = attrs.find((a) => a.name === axis || a.name === `:${axis}` || a.name === `v-bind:${axis}`);
  if (attr === undefined) return null;
  const bound = attr.name.startsWith(":") || attr.name.startsWith("v-bind:");
  if (attr.quoted && !bound) return /^[\w-]+$/.test((attr.value ?? "").trim()) ? { value: attr.value!.trim(), dynamic: false } : { dynamic: true };
  const literal = /^\s*(["'`])([\w-]+)\1\s*$/.exec(attr.value ?? "");
  return literal === null ? { dynamic: true } : { value: literal[2]!, dynamic: false };
}

// The options of used components no use sets: certain when nothing sets that axis from an expression.
function unusedOptionsOf(components: Map<string, Use>, anatomies: ReturnType<typeof includedComponents>): UnusedOption[] {
  const out: UnusedOption[] = [];
  for (const [component, use] of components) {
    if (use.uses === 0) continue;
    for (const [axis, def] of Object.entries(anatomies[component]?.axes ?? {})) {
      for (const value of def?.enabled ?? []) if ((use.options[axis]?.[value] ?? 0) === 0) out.push({ component, axis, value, certain: (use.dynamic[axis] ?? 0) === 0 });
    }
  }
  return out;
}

function tally<T extends string>(xs: T[]): Partial<Record<T, number>> {
  const out: Partial<Record<T, number>> = {};
  for (const x of xs) out[x] = (out[x] ?? 0) + 1;
  return out;
}

// What to do about an override most uses share.
const ADVICE: Record<Kind, string> = {
  color: "add a variant or intent with that color, or change the one they replace",
  radius: "change the component's corners, or add a variant with these",
  spacing: "add a size, or change the component's padding",
  size: "add a size with that height",
  typography: "set the component's type (weight, case, tracking) in the system",
  border: "change the component's border, or add a variant with it",
  shadow: "change the component's shadow, or add a variant with it",
  effects: "add it to the component's states, or a variant",
  unknown: "look at what they set",
};

// The same class on three or more uses of a component (its parts included).
function suggestionsOf(overrides: Map<string, OverrideSite[]>): Suggestion[] {
  const out: Suggestion[] = [];
  for (const [component, sites] of overrides) {
    const counts = new Map<string, number>();
    for (const site of sites) for (const cls of new Set(site.classes)) counts.set(cls, (counts.get(cls) ?? 0) + 1);
    for (const [cls, count] of counts) {
      if (count < 3) continue;
      const read = stylingOf([{ name: "className", value: cls, quoted: true }]);
      const kind = read?.kinds[0] ?? "unknown";
      out.push({ component, class: cls, count, kind, message: `${count} uses of ${pascal(component)} set ${cls}: ${ADVICE[kind]}.` });
    }
  }
  return out.sort((a, b) => b.count - a.count);
}

export async function scan(dir: string, system: DesignSystem): Promise<ScanResult> {
  const t = platformTokens(system);
  // Colors people should use: meanings' roles first (named as classes), then palette steps.
  // primarySolid → primary-solid, brand9 → brand-9: the names the theme's classes use.
  const kebab = (s: string) =>
    s
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .replace(/([a-z])(\d)/g, "$1-$2")
      .toLowerCase();
  const candidates: Candidate[] = Object.entries(t.colors.light).map(([k, rgba]) => ({
    name: kebab(k),
    color: parseColor(`rgb(${rgba.r * 255} ${rgba.g * 255} ${rgba.b * 255} / ${rgba.a})`)!,
  }));
  // Files tesserai generated (the theme, the components) are the system, not uses of it.
  const generated = new Set<string>();
  const edited: Edited[] = [];
  try {
    const manifest = JSON.parse(await readFile(join(dir, "tesserai", "manifest.json"), "utf8")) as { files?: Record<string, string> };
    for (const [path, hash] of Object.entries(manifest.files ?? {})) {
      generated.add(path);
      // The same hash sync compares (init's sha256 of the file as written); a file since removed isn't an edit.
      const current = await readFile(join(dir, ...path.split("/")), "utf8").catch(() => null);
      if (current === null || createHash("sha256").update(current).digest("hex") === hash) continue;
      edited.push({ file: path, component: /components\/ui\/([a-z0-9-]+)(?:\.[a-z]+|\/)/.exec(path)?.[1] ?? null });
    }
  } catch {
    // No manifest: nothing installed by tesserai to skip.
  }
  const files: string[] = [];
  await walk(dir, dir, files, generated);
  const components = new Map<string, Use>();
  const overrides = new Map<string, OverrideSite[]>();
  const anatomies = includedComponents(system);
  const hardCoded: Finding[] = [];
  let rawControls = 0;
  let systemControls = 0;
  let tokenValues = 0;
  const included = new Set(Object.keys(system.components).filter((c) => !system.excluded.includes(c)));

  for (const file of files) {
    const source = await readFile(file, "utf8");
    const rel = relative(dir, file).split(sep).join("/");
    // Imports of generated components: each local name, the component, and the name it exports.
    const imported = new Map<string, { component: string; exported: string }>();
    // Svelte imports a folder's index.js, and shadcn-svelte's style imports it whole
    // (import * as Dialog, then <Dialog.Root>); Vue can import a component's file by default.
    const namespaces = new Map<string, string>();
    for (const m of source.matchAll(/import\s*(?:\{([^}]+)\}|\*\s+as\s+(\w+)|(\w+))\s*from\s*["'][^"']*components\/ui\/([a-z0-9-]+)(?:\/([A-Za-z0-9.-]*))?["']/g)) {
      const component = m[4]!;
      // A default import names the file's own export: button/Button.vue is Button, card/CardHeader.vue a part.
      const fileExport = m[5] === undefined || /^index(\.[a-z]+)?$/.test(m[5]) ? pascal(component) : m[5].replace(/\.[a-z]+$/, "");
      const entry = components.get(component) ?? blank();
      entry.files.add(rel);
      components.set(component, entry);
      if (m[2] !== undefined) namespaces.set(m[2], component);
      else if (m[3] !== undefined) imported.set(m[3], { component, exported: fileExport });
      else
        for (const spec of m[1]!.split(",")) {
          const [exported, local] = spec.trim().replace(/^type\s+/, "").split(/\s+as\s+/).map((x) => x.trim());
          if (exported) imported.set(local ?? exported, { component, exported });
        }
    }
    rawControls += [...source.matchAll(RAW_CONTROLS)].length;
    tokenValues += [...source.matchAll(THEME_UTILITY)].length;
    const ext = extname(file);
    const elements = [".tsx", ".jsx", ".js", ".mjs"].includes(ext) ? readElements(source, "code") : [".vue", ".svelte", ".astro", ".html"].includes(ext) ? readElements(source, "markup") : [];
    for (const element of elements) {
      const [root, part] = element.name.split(".");
      const space = namespaces.get(root!);
      const named = space === undefined ? imported.get(element.name) : undefined;
      const component = space ?? named?.component;
      if (component === undefined) continue;
      systemControls += 1;
      const styled = stylingOf(element.attrs);
      if (styled !== null) {
        const list = overrides.get(component) ?? [];
        list.push({ file: rel, line: element.line, part: element.name, ...styled });
        overrides.set(component, list);
      }
      // Its own export: <Button>, or a namespace's root (<Dialog.Root>, <Dialog>).
      const main = space !== undefined ? part === undefined || part === "Root" : named!.exported === pascal(component) || named!.exported === "Root";
      if (!main) continue;
      const entry = components.get(component)!;
      entry.uses += 1;
      const anatomy = anatomies[component];
      for (const [axis, def] of Object.entries(anatomy?.axes ?? {})) {
        const set = optionOf(element.attrs, axis);
        const count = (bucket: Record<string, Record<string, number>>, value: string) => {
          const values = (bucket[axis] ??= {});
          values[value] = (values[value] ?? 0) + 1;
        };
        if (set === null) {
          if (def?.default !== undefined) count(entry.options, def.default);
        } else if (set.dynamic) entry.dynamic[axis] = (entry.dynamic[axis] ?? 0) + 1;
        else {
          count(entry.options, set.value);
          count(entry.props, set.value);
        }
      }
    }
    // Values that bypass the system.
    source.split("\n").forEach((lineText, i) => {
      const line = i + 1;
      for (const m of lineText.matchAll(/#[0-9a-fA-F]{3,8}\b|(?:rgba?|hsla?|oklch)\([^)]*\)/g)) {
        const color = parseColor(m[0]);
        if (color === undefined || (m[0].startsWith("#") && ![4, 5, 7, 9].includes(m[0].length))) continue;
        const near = nearest(color, candidates);
        // Perceptual similarity is useful advice, not permission to change a color. Alpha is
        // not part of CIEDE2000, so check it separately before offering an automatic fix.
        const match = near === null ? undefined : candidates.find((c) => c.name === near.name);
        const exact = near !== null && near.distance < 0.001 && match !== undefined && Math.abs((match.color.alpha ?? 1) - (color.alpha ?? 1)) < 0.000001;
        // In a stylesheet the variable; in markup the utility (bg-, text- or border- as fits).
        const css = /\.(s?css)$/.test(rel);
        const role = near?.name ?? "";
        // An arbitrary value names its utility (text-[#…]); otherwise the role suggests one.
        const written = /\b(bg|text|border|ring|fill|stroke|outline|decoration|from|to|via)-\[$/.exec(lineText.slice(0, m.index))?.[1];
        const prefix = written ?? (/(text|foreground)$/.test(role) ? "text" : /border/.test(role) ? "border" : "bg");
        const use = css ? `var(--color-${role})` : `${prefix}-${role}`;
        // Exact matches can be rewritten: an arbitrary utility (bg-[#2563eb]) or a stylesheet value.
        const fix = !exact ? undefined : written !== undefined ? { from: `${written}-[${m[0]}]`, to: `${written}-${role}` } : css ? { from: m[0], to: use } : undefined;
        hardCoded.push({
          file: rel,
          line,
          text: m[0],
          suggestion: near === null ? "use a color from the system" : `${exact ? "" : "closest: "}${use} (${toHex(candidates.find((c) => c.name === near.name)!.color)})`,
          ...(fix === undefined ? {} : { fix }),
        });
      }
      // Tailwind's own palette (bg-red-600): it renders, but in Tailwind's colors, so it doesn't
      // follow the brand or dark mode. The system's steps (red-9) don't collide: Tailwind's are 50-950.
      if (!/\.(s?css)$/.test(rel)) {
        for (const m of lineText.matchAll(/\b(bg|text|border(?:-[xytrblse])?|ring|outline|fill|stroke|from|via|to|decoration|divide|accent|caret|placeholder)-([a-z]+)-(\d{2,3})(?:\/\d{1,3})?(?![\w-])/g)) {
          const value = TAILWIND_PALETTE[m[2]!]?.[m[3]!];
          const color = value === undefined ? undefined : parseColor(value);
          if (color === undefined) continue;
          const near = nearest(color, candidates);
          hardCoded.push({ file: rel, line, text: m[0], suggestion: near === null ? "use a color from the system" : `closest: ${m[1]}-${near.name} (${toHex(candidates.find((c) => c.name === near.name)!.color)})` });
        }
      }
      for (const m of lineText.matchAll(/\b(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|space-[xy]|rounded(?:-[a-z]+)?)-\[(\d+(?:\.\d+)?)(px|rem)\]/g)) {
        const px = Number(m[2]) * (m[3] === "rem" ? 16 : 1);
        const isRadius = m[1]!.startsWith("rounded");
        // Spacing utilities multiply the unit, in half steps: p-3.5 is 3.5 units.
        const unit = TAILWIND_SPACING_REM * 16;
        const steps = Math.max(0.5, Math.round((px / unit) * 2) / 2);
        const suggestion = isRadius ? nearestSize(px, t.radius, "rounded-") : `${m[1]}-${steps} (${steps * unit}px)`;
        // Exact only: a radius that is a radius step, a space that is a whole or half step.
        const radiusKey = isRadius ? Object.entries(t.radius).find(([, v]) => Math.abs(v - px) < 0.01)?.[0] : undefined;
        const fix = isRadius
          ? radiusKey === undefined || m[1] !== "rounded"
            ? undefined
            : { from: m[0], to: `rounded-${radiusKey.replace(/^[a-z]+(?=\d)/, "")}` }
          : Math.abs(steps * unit - px) < 0.01
            ? { from: m[0], to: `${m[1]}-${steps}` }
            : undefined;
        hardCoded.push({ file: rel, line, text: m[0], suggestion: suggestion ?? "use a token", ...(fix === undefined ? {} : { fix }) });
      }
    });
  }
  return {
    files: files.length,
    components: [...components]
      .map(([name, v]) => ({ name, uses: v.uses, files: v.files.size, options: v.options, dynamic: v.dynamic, props: v.props }))
      .sort((a, b) => b.uses - a.uses || b.files - a.files),
    unused: [...included].filter((c) => !components.has(c)).sort(),
    unusedOptions: unusedOptionsOf(components, anatomies),
    overrides: [...overrides]
      .map(([component, sites]) => ({ component, count: sites.length, kinds: tally(sites.flatMap((s) => s.kinds)), sites }))
      .sort((a, b) => b.count - a.count),
    suggestions: suggestionsOf(overrides),
    edited: edited.sort((a, b) => a.file.localeCompare(b.file)),
    hardCoded,
    adoption: adoptionOf(systemControls, rawControls, tokenValues, hardCoded.length),
  };
}

function adoptionOf(system: number, raw: number, tokens: number, hardCoded: number): Adoption {
  const share = (good: number, bad: number) => (good + bad === 0 ? 1 : good / (good + bad));
  return { score: Math.round(((share(system, raw) + share(tokens, hardCoded)) / 2) * 100), components: { system, raw }, values: { tokens, hardCoded } };
}

// Rewrites the exact matches in place. Returns how many were fixed, per file.
export async function applyFixes(dir: string, findings: readonly Finding[]): Promise<Record<string, number>> {
  const byFile = new Map<string, Finding[]>();
  for (const f of findings) if (f.fix !== undefined) byFile.set(f.file, [...(byFile.get(f.file) ?? []), f]);
  const fixed: Record<string, number> = {};
  for (const [file, list] of byFile) {
    const path = join(dir, ...file.split("/"));
    const lines = (await readFile(path, "utf8")).split("\n");
    let count = 0;
    for (const f of list) {
      const i = f.line - 1;
      const text = lines[i];
      if (text === undefined || !text.includes(f.fix!.from)) continue;
      lines[i] = text.replace(f.fix!.from, f.fix!.to);
      count += 1;
    }
    if (count > 0) {
      await writeFile(path, lines.join("\n"), "utf8");
      fixed[file] = count;
    }
  }
  return fixed;
}

export function summarizeScan(result: ScanResult): string[] {
  const { adoption } = result;
  const pct = (a: number, b: number) => (a + b === 0 ? "all" : `${Math.round((a / (a + b)) * 100)}%`);
  const lines = [
    `Scanned ${result.files} ${result.files === 1 ? "file" : "files"}.`,
    "",
    `Adoption: ${adoption.score}/100`,
    `  ${pct(adoption.components.system, adoption.components.raw)} of controls are the system's components (${adoption.components.raw} raw <button>, <input>, <select>… left)`,
    `  ${pct(adoption.values.tokens, adoption.values.hardCoded)} of style values come from its tokens (${adoption.values.hardCoded} hard-coded)`,
    "",
  ];
  const counts = (values: Record<string, number>) =>
    Object.entries(values)
      .sort((a, b) => b[1] - a[1])
      .map(([v, n]) => `${v} ${n}`)
      .join(", ");
  const used = result.components.filter((c) => c.uses > 0 || c.files > 0);
  lines.push(`Most used (${used.length} components; uses · files):`);
  const width = Math.max(0, ...used.map((c) => c.name.length));
  for (const c of used) {
    const axes = Object.entries(c.options)
      .map(([axis, values]) => `${axis} ${counts(values)}${c.dynamic[axis] ? `, ${c.dynamic[axis]} set in code` : ""}`)
      .join(" · ");
    lines.push(`  ${c.name.padEnd(width)}  ${String(c.uses).padStart(3)} · ${c.files}${axes === "" ? "" : `   ${axes}`}`);
  }
  if (result.unused.length > 0) {
    lines.push("", `Never used (${result.unused.length}); leave them out in the builder to ship less:`, `  ${result.unused.join(", ")}`);
  }
  const unusedBy = new Map<string, UnusedOption[]>();
  for (const u of result.unusedOptions) unusedBy.set(`${u.component} ${u.axis}`, [...(unusedBy.get(`${u.component} ${u.axis}`) ?? []), u]);
  if (unusedBy.size > 0) {
    lines.push("", "Options no use sets (remove them, or check they're wanted):");
    for (const [key, list] of unusedBy) {
      const certain = list.filter((u) => u.certain).map((u) => u.value);
      const maybe = list.filter((u) => !u.certain).map((u) => u.value);
      lines.push(`  ${key}: ${[certain.join(", "), maybe.length === 0 ? "" : `possibly ${maybe.join(", ")} (some uses set it in code)`].filter(Boolean).join("; ")}`);
    }
  }
  if (result.overrides.length > 0) {
    lines.push("", "Overridden most (restyled with className, class, style or sx; placement not counted):");
    for (const o of result.overrides.slice(0, 12)) {
      const uses = result.components.find((c) => c.name === o.component)?.uses ?? 0;
      lines.push(`  ${o.component}: ${o.count} ${o.count === 1 ? "time" : "times"}${uses > 0 ? ` across ${uses} ${uses === 1 ? "use" : "uses"}` : ""} · ${counts(o.kinds as Record<string, number>)}`);
      for (const site of o.sites.slice(0, 3)) lines.push(`    ${site.file}:${site.line}  <${site.part}> ${site.classes.join(" ") || site.kinds.join(", ")}`);
      if (o.sites.length > 3) lines.push(`    …and ${o.sites.length - 3} more`);
    }
  }
  if (result.suggestions.length > 0) {
    lines.push("", "Suggestions:");
    for (const s of result.suggestions.slice(0, 10)) lines.push(`  ${s.message}`);
  }
  if (result.edited.length > 0) {
    lines.push("", `Edited by hand since install (${result.edited.length}); sync keeps your version, but the system no longer describes it:`);
    for (const e of result.edited) lines.push(`  ${e.file}${e.component === null ? "" : ` (${e.component})`}`);
  }
  if (result.hardCoded.length > 0) {
    lines.push("", `Hard-coded values (${result.hardCoded.length}); these won't follow the system:`);
    for (const f of result.hardCoded.slice(0, 50)) lines.push(`  ${f.file}:${f.line}  ${f.text}  → ${f.suggestion}${f.fix === undefined ? "" : "  (fixable)"}`);
    if (result.hardCoded.length > 50) lines.push(`  …and ${result.hardCoded.length - 50} more (--json for all)`);
    const fixable = result.hardCoded.filter((f) => f.fix !== undefined).length;
    if (fixable > 0) lines.push("", `${fixable} ${fixable === 1 ? "is an exact match" : "are exact matches"}: npx @tesserai/cli scan --fix rewrites ${fixable === 1 ? "it" : "them"} to the system's own (nothing looks different).`);
  } else lines.push("", "No hard-coded colors or sizes found.");
  return lines;
}
