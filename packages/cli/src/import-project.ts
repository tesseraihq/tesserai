import { readdir, readFile, stat } from "node:fs/promises";
import { basename, dirname, extname, join, normalize, relative, sep } from "node:path";
import {
  canonicalName,
  emptyLook,
  fontRoleForName,
  isEmptyLook,
  LOOK_ROLES,
  lookToSystem,
  mergeLooks,
  parseColor,
  readStylesheet,
  pageVariables,
  readTokenFile,
  readTokenSets,
  readThemeJson,
  isThemeJson,
  roleForName,
  type ImportResult,
  type Look,
} from "@tesserai/core";
import { TAILWIND_COLORS } from "./tailwind-colors";

// `npx @tesserai/cli import`: a project's look, read from the files that define it, without
// running anything. It reads:
// - the stylesheets the app actually loads (imported from its code, @import-ed, or <link>ed; a
//   stylesheet nothing loads, like an old theme kept for reference, is left out and said);
// - design-token files (DTCG, Tokens Studio, including sets split into files);
// - fonts set through next/font, and a Tailwind v3 config's fonts, colors and corners (as text);
// - for Tailwind scales with no names on them, which step the buttons, page and borders use.
// Everything found says which file and line it came from.

export type ProjectImport = {
  name: string;
  look: Look;
  result: ImportResult | { error: string };
  // Files that contributed, relative to the project.
  read: string[];
  // Files looked at and left out, and why.
  ignored: { file: string; why: string }[];
};

// Dependencies, build output and generated copies (Django's collectstatic, Python environments).
const SKIP_DIRS = new Set(["node_modules", "dist", "build", "out", "coverage", "vendor", "storybook-static", "tesserai", "staticfiles", "static_root", "venv", ".venv", "__pycache__", "site-packages", "tmp", "log", "_site"]);
const STYLE = new Set([".css", ".scss", ".sass", ".less"]);
const CODE = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte", ".astro", ".html", ".mdx", ".erb", ".haml", ".slim", ".php", ".twig", ".jinja", ".j2", ".liquid", ".hbs", ".njk"]);
const MAX_FILES = 20_000;
// Kept for reference, not in use: legacy/, _archive/, old-theme.css, *.bak.
const OLD = /(^|\/)_?(legacy|old|deprecated|archive|backup|unused)(\/|[-_.])|\.bak\b|[-_.]old\./i;
const MAX_BYTES = 1_000_000;

// A static-site generator's own folders: Hugo keeps its theme (a library the site overrides) in
// themes/ and its build in public/ and resources/_gen.
const HUGO_SKIP = new Set(["themes", "public", "_gen"]);

async function walk(dir: string, root: string, out: string[], skip: Set<string> = SKIP_DIRS) {
  if (out.length >= MAX_FILES) return;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const path = join(dir, e.name);
    if (e.isDirectory()) {
      if (!skip.has(e.name)) await walk(path, root, out, skip);
    } else if (e.isFile()) out.push(path);
  }
}

const lineAt = (text: string, index: number) => text.slice(0, index).split("\n").length;

// A package's stylesheets, for its default variables (node_modules is otherwise never read).
async function walkModules(dir: string, out: string[], depth = 0) {
  if (depth > 5 || out.length > 400) return;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const path = join(dir, e.name);
    if (e.isDirectory() && e.name !== "node_modules" && !e.name.startsWith(".")) await walkModules(path, out, depth + 1);
    else if (e.isFile() && /\.(scss|sass|less)$/.test(e.name)) out.push(path);
  }
}

// What each file loads: import "./x.css", @import "variables", <link href="css/site.css">.
function references(text: string, file: string): string[] {
  const out: string[] = [];
  const ext = extname(file);
  const add = (spec: string) => out.push(spec);
  if (STYLE.has(ext)) {
    for (const m of text.matchAll(/@(?:import|use|forward)\s+(?:url\()?["']([^"']+)["']/g)) add(m[1]!);
  } else {
    for (const m of text.matchAll(/(?:import\s+(?:[\w{}\s,*]+\s+from\s+)?|require\(\s*)["']([^"']+\.(?:css|scss|sass|less))["']/g)) add(m[1]!);
    for (const m of text.matchAll(/<link[^>]+href=["']([^"']+\.css)["']/g)) add(m[1]!);
    // Template helpers: Django {% static 'css/site.css' %}, Rails stylesheet_link_tag "application",
    // Laravel asset('css/app.css') / @vite('resources/css/app.css'), Jinja url_for('static', …).
    for (const m of text.matchAll(/\{%\s*static\s+["']([^"']+\.(?:css|scss))["']\s*%\}/g)) add(m[1]!);
    for (const m of text.matchAll(/stylesheet_link_tag\s*\(?\s*["']([^"']+)["']/g)) add(m[1]!);
    for (const m of text.matchAll(/(?:asset|@vite)\(\s*\[?\s*["']([^"']+\.(?:css|scss|sass|less))["']/g)) add(m[1]!);
    for (const m of text.matchAll(/url_for\(\s*["']static["']\s*,\s*filename\s*=\s*["']([^"']+\.css)["']/g)) add(m[1]!);
    for (const m of text.matchAll(/<style[^>]*\bsrc=["']([^"']+)["']/g)) add(m[1]!);
  }
  return out;
}

// Stylesheets by file name, built once per import: for static-files paths ("css/site.css").
type ByName = Map<string, string[]>;
function stylesByName(files: Set<string>): ByName {
  const out: ByName = new Map();
  for (const f of files) {
    if (!STYLE.has(extname(f))) continue;
    for (const key of [basename(f), basename(f, extname(f))]) out.set(key, [...(out.get(key) ?? []), f]);
  }
  return out;
}

function resolveSpec(spec: string, from: string, root: string, files: Set<string>, byName?: ByName): string | undefined {
  if (/^(https?:)?\/\//.test(spec)) return undefined;
  const bases = spec.startsWith(".") ? [dirname(from)] : spec.startsWith("/") ? [root] : spec.startsWith("@/") || spec.startsWith("~/") ? [join(root, "src"), root] : [dirname(from), root, join(root, "src")];
  const tail = spec.replace(/^[@~]\//, "").replace(/^\//, "");
  for (const base of bases) {
    const p = normalize(join(base, tail));
    const candidates = [p, `${p}.css`, `${p}.scss`, `${p}.less`, join(dirname(p), `_${basename(p)}.scss`), join(dirname(p), `_${basename(p)}`)];
    for (const c of candidates) if (files.has(c)) return c;
  }
  // A static-files path ("css/site.css", Rails' "application"): the one file in the project that
  // ends with it, when there's exactly one.
  if (!spec.startsWith(".")) {
    const pool = byName?.get(basename(tail)) ?? [...files];
    const ends = pool.filter((f) => STYLE.has(extname(f)) && (f.endsWith(`/${tail}`) || [".css", ".scss", ".sass"].some((e) => f.endsWith(`/${tail}${e}`))));
    if (ends.length === 1) return ends[0];
  }
  return undefined;
}

// DTCG ($value), Tokens Studio (value + type), or Style Dictionary's own ({ "value": … } leaves in
// a file that sits with other tokens or says so in its name).
function looksLikeTokens(text: string, file: string): boolean {
  if (/"\$value"\s*:/.test(text)) return true;
  if (/"value"\s*:/.test(text) && /"type"\s*:\s*"(color|borderRadius|fontFamilies|fontSizes|spacing|dimension)"/.test(text)) return true;
  return /(^|\/)(tokens?|design-tokens|properties)(\/|\.)/i.test(file) && /\{\s*"value"\s*:\s*("|\d|\[)/.test(text);
}

// next/font: `const geist = Geist({ variable: "--font-geist-sans" })` → --font-geist-sans is Geist.
function nextFonts(text: string, file: string): Map<string, { family: string; source: string }> {
  const out = new Map<string, { family: string; source: string }>();
  const imported = /import\s*\{([^}]+)\}\s*from\s*["']next\/font\/google["']/.exec(text);
  if (imported === null) return out;
  const names = imported[1]!.split(",").map((n) => n.trim().split(/\s+as\s+/).pop()!).filter(Boolean);
  for (const name of names) {
    const call = new RegExp(`\\b${name}\\(\\s*\\{[^}]*variable:\\s*["'](--[\\w-]+)["']`).exec(text);
    if (call === null) continue;
    out.set(call[1]!, { family: name.replace(/_/g, " "), source: `${file}:${lineAt(text, call.index)}` });
  }
  return out;
}

// A Tailwind v3 config, as text: fonts, literal colors and corners. Never executed.
function tailwindConfig(text: string, file: string): Look {
  const look = emptyLook();
  const at = (i: number) => `${file}:${lineAt(text, i)}`;
  const block = (key: string) => {
    const m = new RegExp(`\\b${key}\\s*:\\s*\\{`).exec(text);
    if (m === null) return undefined;
    let depth = 0;
    for (let i = m.index + m[0].length - 1; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}" && --depth === 0) return { start: m.index + m[0].length, body: text.slice(m.index + m[0].length, i) };
    }
    return undefined;
  };
  const fonts = block("fontFamily");
  if (fonts !== undefined) {
    for (const m of fonts.body.matchAll(/(\w+)\s*:\s*\[\s*(['"`])(.*?)\2/g)) {
      const role = fontRoleForName(m[1]!);
      const family = m[3]!.replace(/^["']|["']$/g, "");
      if (role !== undefined && family !== "" && !/^var\(/.test(family)) look.fonts[role] ??= { value: [family], source: at(fonts.start + m.index!), name: `fontFamily.${m[1]}` };
    }
  }
  const colors = block("colors");
  if (colors !== undefined) {
    const names = new Set([...colors.body.matchAll(/(\w[\w-]*)\s*:/g)].map((m) => canonicalName(m[1]!)));
    // key: "#e11d48"   or   key: { DEFAULT: "#e11d48", foreground: "#fff" }
    for (const m of colors.body.matchAll(/["']?([\w-]+)["']?\s*:\s*(?:["']([^"']+)["']|\{([^{}]*)\})/g)) {
      const key = m[1]!;
      const entries: [string, string, number][] = [];
      if (m[2] !== undefined) entries.push([key, m[2], m.index!]);
      else
        for (const inner of m[3]!.matchAll(/["']?([\w-]+)["']?\s*:\s*["']([^"']+)["']/g)) {
          entries.push([inner[1] === "DEFAULT" ? key : `${key}-${inner[1]}`, inner[2]!, m.index! + m[0].indexOf(inner[0])]);
        }
      for (const [name, value, index] of entries) {
        if (parseColor(value) === undefined) continue;
        const role = roleForName(name, names);
        // A literal in the config has no dark variant: it's the color in both schemes (a
        // stylesheet's .dark block, read first, still wins).
        if (role !== undefined && !look.colors.light.has(role)) {
          const found = { value, source: at(colors.start + index), name: `colors.${name}` };
          look.colors.light.set(role, found);
          look.colors.dark.set(role, { ...found });
        }
      }
    }
  }
  const radius = block("borderRadius");
  if (radius !== undefined) {
    const m = /\b(DEFAULT|md|base)\s*:\s*["']([\d.]+(?:px|rem))["']/.exec(radius.body);
    if (m !== null) {
      const n = m[2]!.endsWith("rem") ? Number.parseFloat(m[2]!) * 16 : Number.parseFloat(m[2]!);
      look.radius = { value: n, source: at(radius.start + m.index), name: `borderRadius.${m[1]}` };
    }
  }
  return look;
}

// Tailwind scales with no role names: which ones the buttons, page, text and borders use.
function tailwindUsage(code: { file: string; text: string }[], look: Look): Look {
  const out = emptyLook();
  // The project's own scale step (with the line it's defined on), else Tailwind's built-in.
  const scaleValue = (name: string, step?: string): { value: string; defined?: string | undefined } | undefined => {
    if (step === undefined) {
      const v = name === "white" ? "#ffffff" : name === "black" ? "#000000" : TAILWIND_COLORS[name];
      return v === undefined ? undefined : { value: v };
    }
    const own = look.scales.find((s) => s.name === name)?.steps.find((s) => s.step === step);
    if (own !== undefined) return { value: own.value.value, defined: own.value.source };
    const v = TAILWIND_COLORS[`${name}-${step}`];
    return v === undefined ? undefined : { value: v };
  };
  type Hit = { value: string; source: string; name: string; via?: string | undefined };
  const counts = new Map<string, Map<string, { n: number; hit: Hit }>>();
  const count = (role: string, key: string, hit: Hit) => {
    const m = counts.get(role) ?? new Map();
    const e = m.get(key) ?? { n: 0, hit };
    e.n++;
    m.set(key, e);
    counts.set(role, m);
  };
  const cls = /\b(?:class|className)\s*=\s*(?:\{\s*)?["'`]([^"'`]+)["'`]/g;
  for (const { file, text } of code) {
    for (const m of text.matchAll(cls)) {
      const classes = m[1]!.split(/\s+/);
      const source = `${file}:${lineAt(text, m.index!)}`;
      const color = (prefix: string) => {
        for (const c of classes) {
          const hit = new RegExp(`^${prefix}-([a-z]+)(?:-(\\d{2,3}))?$`).exec(c);
          if (hit === null) continue;
          const value = scaleValue(hit[1]!, hit[2]);
          if (value !== undefined) return { key: c, value: value.value, defined: value.defined, name: hit[1]!, step: hit[2] };
        }
        return undefined;
      };
      const cite = (c: { key: string; value: string; defined?: string | undefined }, name: string): Hit =>
        c.defined !== undefined ? { value: c.value, source: c.defined, name: `${name}, in ${source}` } : { value: c.value, source, name, via: c.key };
      const bg = color("bg");
      const text_ = color("text");
      const border = color("border");
      const onColor = text_ !== undefined && (text_.name === "white" || text_.step === "50");
      if (bg !== undefined && onColor && bg.name !== "white") {
        const danger = /^(red|rose)$/.test(bg.name);
        count(danger ? LOOK_ROLES.danger : LOOK_ROLES.primary, bg.key, cite(bg, `${bg.key} with ${text_!.key}`));
        if (!danger) count(LOOK_ROLES.primaryForeground, text_!.key, cite(text_!, `${text_!.key} on ${bg.key}`));
      }
      if (classes.some((c) => /^(min-h-screen|h-screen|min-h-dvh)$/.test(c))) {
        if (bg !== undefined) count(LOOK_ROLES.background, bg.key, cite(bg, `${bg.key} on the page`));
        if (text_ !== undefined) count(LOOK_ROLES.foreground, text_.key, cite(text_, `${text_.key} on the page`));
      }
      if (border !== undefined) count(LOOK_ROLES.border, border.key, cite(border, border.key));
    }
  }
  for (const [role, m] of counts) {
    const best = [...m.values()].sort((a, b) => b.n - a.n)[0]!;
    out.colors.light.set(role, { value: best.hit.value, source: best.hit.source, via: best.hit.via, name: `${best.hit.name}${best.n > 1 ? ` (${best.n} places)` : ""}` });
  }
  return out;
}

function titleCase(name: string): string {
  return name
    .replace(/^@[^/]+\//, "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");
}

export async function importProject(dir: string, options: { name?: string } = {}): Promise<ProjectImport> {
  const all: string[] = [];
  const hugo = (await readdir(dir).catch(() => [] as string[])).some((f) => /^(hugo\.(toml|ya?ml|json)|config\.toml)$/.test(f));
  await walk(dir, dir, all, hugo ? new Set([...SKIP_DIRS, ...HUGO_SKIP]) : SKIP_DIRS);
  const rel = (p: string) => relative(dir, p).split(sep).join("/");
  const texts = new Map<string, string>();
  // Stylesheets and component files are read more than once and kept; server templates (PHP,
  // ERB, Twig…) are only scanned for the stylesheets they load, so they aren't.
  const kept = (p: string) => STYLE.has(extname(p)) || /\.(tsx?|jsx?|mjs|cjs|vue|svelte|astro|html|json)$/.test(p);
  const read = async (p: string) => {
    if (texts.has(p)) return texts.get(p)!;
    const s = await stat(p);
    const t = s.size > MAX_BYTES ? "" : await readFile(p, "utf8");
    if (kept(p)) texts.set(p, t);
    return t;
  };
  const files = new Set(all);
  const byName = stylesByName(files);
  const styles = all.filter((f) => STYLE.has(extname(f)));
  const code = all.filter((f) => CODE.has(extname(f)));
  const ignored: ProjectImport["ignored"] = [];

  // Which stylesheets the app loads, following @imports from those.
  const loaded = new Set<string>();
  const queue: string[] = [];
  for (const f of [...code, ...styles]) {
    for (const spec of references(await read(f), f)) {
      const target = resolveSpec(spec, f, dir, files, byName);
      if (target !== undefined && STYLE.has(extname(target)) && !loaded.has(target) && (!STYLE.has(extname(f)) || code.length === 0)) {
        loaded.add(target);
        queue.push(target);
      }
    }
  }
  while (queue.length > 0) {
    const f = queue.shift()!;
    for (const spec of references(await read(f), f)) {
      const target = resolveSpec(spec, f, dir, files, byName);
      if (target !== undefined && !loaded.has(target)) {
        loaded.add(target);
        queue.push(target);
      }
    }
  }
  // Build scripts compile stylesheets too ("sass scss/main.scss css/main.css").
  try {
    const pkg = JSON.parse(await readFile(join(dir, "package.json"), "utf8")) as { scripts?: Record<string, string> };
    for (const script of Object.values(pkg.scripts ?? {})) {
      for (const m of script.matchAll(/([\w./-]+\.(?:scss|sass|less|css))\b/g)) {
        const target = resolveSpec(`./${m[1]!.replace(/^\.\//, "")}`, join(dir, "package.json"), dir, files);
        if (target !== undefined && !loaded.has(target)) {
          loaded.add(target);
          for (const spec of references(await read(target), target)) {
            const t = resolveSpec(spec, target, dir, files);
            if (t !== undefined) loaded.add(t);
          }
        }
      }
    }
  } catch {
    // No package.json.
  }
  // Nothing loads any stylesheet (no entry file in view): read them all, except ones that look kept
  // for reference (legacy/, old-theme.css, *.bak).
  const used = loaded.size === 0 ? styles.filter((s) => !OLD.test(rel(s))) : styles.filter((s) => loaded.has(s));
  for (const s of styles) if (!used.includes(s)) ignored.push({ file: rel(s), why: loaded.size === 0 ? "it looks kept for reference, not used" : "nothing in the project loads it" });

  const looks: { look: Look; file: string; weight: number }[] = [];
  const weigh = (l: Look) => l.colors.light.size + l.colors.dark.size + l.scales.length + Object.keys(l.fonts).length;

  // Token files, with Tokens Studio sets read together.
  const tokenFiles: { file: string; text: string }[] = [];
  for (const f of all) {
    if (extname(f) !== ".json" || /(^|\/)(package|tsconfig|jsconfig|composer|theme)\.json$|lock\.json$/.test(f)) continue;
    const text = await read(f);
    if (looksLikeTokens(text, rel(f)) && !OLD.test(rel(f))) tokenFiles.push({ file: rel(f), text });
  }
  // Token files refer to each other across folders (core/, semantic/light.json): read as one set.
  const byDir = new Map<string, { file: string; text: string }[]>();
  if (tokenFiles.length > 0) byDir.set("", tokenFiles);
  for (const [, group] of byDir) {
    if (group.length > 1) {
      const look = readTokenSets(group);
      if (!("error" in look)) looks.push({ look, file: group.map((g) => g.file).join(", "), weight: 1000 + weigh(look) });
    } else {
      let json: unknown;
      try {
        json = JSON.parse(group[0]!.text);
      } catch {
        continue;
      }
      const look = readTokenFile(json, group[0]!.file, group[0]!.text);
      if (!("error" in look)) looks.push({ look, file: group[0]!.file, weight: 1000 + weigh(look) });
    }
  }
  // A Sass/Less framework the project imports (Bootstrap, Bulma, Foundation): its !default
  // variables, so the project's overrides flow through its derived ones.
  // Read once per package, however many stylesheets import it.
  const packages = new Map<string, Promise<{ css: string; file: string }[]>>();
  const packageDefaults = (pkg: string) => {
    let got = packages.get(pkg);
    if (got === undefined) {
      got = (async () => {
        const out: { css: string; file: string }[] = [];
        let bytes = 0;
        const found: string[] = [];
        await walkModules(join(dir, "node_modules", pkg), found);
        for (const f of found) {
          if (bytes > 1_500_000 || out.length >= 80) break;
          const text = await readFile(f, "utf8").catch(() => "");
          if (!/!default/.test(text)) continue;
          bytes += text.length;
          out.push({ css: text, file: rel(f) });
        }
        return out;
      })();
      packages.set(pkg, got);
    }
    return got;
  };
  const frameworkDefaults = async (file: string): Promise<{ css: string; file: string }[]> => {
    const pkgs = new Set<string>();
    for (const raw of references(await read(file), file)) {
      // "bootstrap/scss/bootstrap", "~bootstrap/…" (webpack), "@org/kit/…"; not ./local ones.
      const spec = raw.replace(/^~/, "");
      if (/^[./]/.test(spec)) continue;
      pkgs.add(spec.split("/").slice(0, spec.startsWith("@") ? 2 : 1).join("/"));
    }
    return (await Promise.all([...pkgs].map(packageDefaults))).flat();
  };
  // A WordPress block theme: theme.json itself (its styles/*.json are optional variations, not the look).
  for (const f of all) {
    if (basename(f) !== "theme.json" || OLD.test(rel(f))) continue;
    const text = await read(f);
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      continue;
    }
    if (!isThemeJson(json)) continue;
    const look = readThemeJson(json, rel(f), text);
    if (!isEmptyLook(look)) looks.push({ look, file: rel(f), weight: 1000 + weigh(look) });
  }
  // The project's own Sass/Less variables files, visible to its other stylesheets.
  const sharedVars = await Promise.all(used.filter((f) => /\.(scss|sass|less)$/.test(f) && /variables|settings|tokens|_vars|theme/i.test(basename(f))).map(async (f) => ({ css: await read(f), file: rel(f) })));
  const pageVars = new Set<string>();
  for (const s of used) for (const v of pageVariables(await read(s))) pageVars.add(v);
  for (const s of used) {
    const defaults = /\.(scss|sass|less)$/.test(s) ? await frameworkDefaults(s) : [];
    const look = readStylesheet(await read(s), rel(s), defaults, sharedVars.filter((v) => v.file !== rel(s)), pageVars);
    if (!isEmptyLook(look) || look.pendingFonts.length > 0) looks.push({ look, file: rel(s), weight: weigh(look) });
  }
  looks.sort((a, b) => b.weight - a.weight);
  let look = looks.reduce((acc, l) => mergeLooks(acc, l.look), emptyLook());

  // Fonts set through next/font.
  const fonts = new Map<string, { family: string; source: string }>();
  for (const f of code) for (const [v, e] of nextFonts(await read(f), rel(f))) fonts.set(v, e);
  for (const p of look.pendingFonts) {
    const f = fonts.get(p.variable);
    if (f === undefined || look.fonts[p.role] !== undefined) continue;
    look.fonts[p.role] = { value: [f.family], source: f.source, name: `${p.name} (next/font ${f.family})` };
    look.skipped = look.skipped.filter((s) => s.name !== p.name);
  }

  // A Tailwind v3 config, then how Tailwind classes are used.
  const configs = all.filter((f) => /(^|\/)tailwind\.config\.(js|cjs|mjs|ts)$/.test(f));
  const readFrom = [...looks.map((l) => l.file)];
  for (const c of configs) {
    const extra = tailwindConfig(await read(c), rel(c));
    if (!isEmptyLook(extra)) {
      look = mergeLooks(look, extra);
      readFrom.push(rel(c));
    }
  }
  if (!look.colors.light.has(LOOK_ROLES.primary)) {
    const usage = tailwindUsage(await Promise.all(code.filter((f) => /\.(tsx|jsx|vue|svelte|astro|html)$/.test(f)).map(async (f) => ({ file: rel(f), text: await read(f) }))), look);
    if (!isEmptyLook(usage)) {
      look = mergeLooks(look, usage);
      readFrom.push("class names in components");
    }
  }

  let name = options.name;
  if (name === undefined) {
    try {
      const pkg = JSON.parse(await readFile(join(dir, "package.json"), "utf8")) as { name?: string };
      if (pkg.name) name = titleCase(pkg.name);
    } catch {
      // No package.json: the folder's name.
    }
  }
  name ??= titleCase(basename(dir));
  const result = lookToSystem(look, name);
  return { name, look, result, read: readFrom, ignored };
}
