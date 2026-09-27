import { parseColor } from "../color";
import { canonicalName, emptyLook, fontList, fontRoleForName, LOOK_ROLES, roleForName, stripScheme, type Look, type Scheme, type ShadowSize } from "./look";

// Reads a stylesheet (CSS, SCSS or Less) into a Look, with the line each value is on. It knows:
// - custom properties under :root / html / :host (light) and .dark, [data-theme=dark] or a
//   prefers-color-scheme: dark block (dark), including a :root nested in that media query;
// - Tailwind v4 @theme: --color-<name>-<step> scales, --font-*, --radius-*, --spacing, --text-base,
//   --shadow-*;
// - Sass ($primary: …) and Less (@primary-color: …) variables, following $a: $b;
// - the rules where a look without variables lives: body (background, color, font), primary and
//   danger buttons, cards (border and corners).
// It follows var() within the file, reads bare HSL ("221 83% 53%") and RGB ("17 24 39") channels,
// and never runs anything.

type Decl = { name: string; value: string; line: number; file: string; fromDefaults?: boolean; daisy?: boolean; shared?: boolean };
type Block = { selector: string; ancestors: string[]; decls: Decl[]; props: Decl[] };

function parseBlocks(input: string, file: string, fromDefaults = false): { blocks: Block[]; topLevel: Decl[] } {
  // Sass's indented syntax: one declaration a line, no semicolons.
  const css = /\.sass$/.test(file) ? input.replace(/\n/g, ";\n") : input;
  const blocks: Block[] = [];
  const topLevel: Decl[] = [];
  const stack: Block[] = [];
  let line = 1;
  let buf = "";
  let bufLine = 1;
  const flush = () => {
    const text = buf.trim();
    buf = "";
    if (text === "") return;
    const m = /^([$@]?-{0,2}[a-zA-Z_][\w-]*)\s*:\s*([\s\S]+)$/.exec(text);
    if (m === null) return;
    const raw = m[1]!;
    const value = m[2]!.replace(/\s*!(default|important|global)\s*$/g, "").trim();
    const d: Decl = { name: raw, value, line: bufLine, file, ...(fromDefaults ? { fromDefaults: true } : {}) };
    const top = stack.at(-1);
    if (top === undefined) {
      if (/^[$@]/.test(raw)) topLevel.push(d);
    } else if (raw.startsWith("--") || /^[$@]/.test(raw)) top.decls.push(d);
    else top.props.push(d);
  };
  for (let i = 0; i < css.length; i++) {
    const ch = css[i]!;
    if (ch === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      const stop = end === -1 ? css.length : end + 2;
      for (let j = i; j < stop; j++) if (css[j] === "\n") line++;
      i = stop - 1;
      continue;
    }
    if (ch === "/" && css[i + 1] === "/" && (i === 0 || /\s|;|\{|\}/.test(css[i - 1]!))) {
      const end = css.indexOf("\n", i);
      i = (end === -1 ? css.length : end) - 1;
      continue;
    }
    if (ch === "{") {
      const selector = buf.trim();
      buf = "";
      const block: Block = { selector, ancestors: stack.map((b) => b.selector), decls: [], props: [] };
      stack.push(block);
      blocks.push(block);
      bufLine = line;
      continue;
    }
    if (ch === "}") {
      flush();
      stack.pop();
      bufLine = line;
      continue;
    }
    if (ch === ";") {
      flush();
      bufLine = line;
      continue;
    }
    if (buf.trim() === "" && !/\s/.test(ch)) bufLine = line;
    if (ch === "\n") line++;
    buf += ch;
  }
  flush();
  return { blocks, topLevel };
}

const DARK = /(^|[\s,(])(\.dark\b|\[data-(theme|mode|color-scheme|bs-theme|color-mode|mantine-color-scheme)=["']?dark["']?\]|:root\.dark|html\.dark|\.theme-dark\b|\.theme--dark\b|\.dark-theme\b|\.dark-mode\b|\.ion-palette-dark\b)|prefers-color-scheme:\s*dark/;
const LIGHT_ROOT = /(^|,\s*|\()(:root|html|:host|\.light\b|\.theme-light\b)|\[data-(theme|mode|color-scheme|bs-theme|color-mode|mantine-color-scheme)=["']?light["']?\]/;
// daisyUI 5: @plugin "daisyui/theme" { name: …; prefersdark: true; color-scheme: dark; --color-…: … }
const DAISY = /^@plugin\s+["']daisyui\/theme["']/;

function schemeOf(block: Block): Scheme | "theme" | null {
  if (DAISY.test(block.selector)) {
    const prop = (n: string) => block.props.find((p) => p.name === n)?.value.replace(/["']/g, "").trim();
    return prop("prefersdark") === "true" || prop("color-scheme") === "dark" || /dark/.test(prop("name") ?? "") ? "dark" : "light";
  }
  const all = [...block.ancestors, block.selector];
  if (all.some((s) => DARK.test(s))) return "dark";
  if (/^@theme\b/.test(block.selector)) return "theme";
  if (LIGHT_ROOT.test(block.selector)) return "light";
  return null;
}

// "221.2 83.2% 53.3%" is shadcn's bare HSL; "17 24 39" is bare RGB (Tailwind's rgb(var(--x))).
export function readAnyColor(value: string): string | undefined {
  const v = value.trim();
  if (/^-?[\d.]+(deg)?\s+[\d.]+%\s+[\d.]+%(\s*\/\s*[\d.]+%?)?$/.test(v)) return parseColor(`hsl(${v})`) === undefined ? undefined : `hsl(${v})`;
  if (/^\d{1,3}\s+\d{1,3}\s+\d{1,3}(\s*\/\s*[\d.]+%?)?$/.test(v)) return `rgb(${v})`;
  return parseColor(v) === undefined ? undefined : v;
}

export function readPx(value: string): number | undefined {
  const m = /^(-?[\d.]+)(rem|px|em)?$/.exec(value.trim());
  if (m === null) return undefined;
  const n = Number(m[1]);
  return m[2] === "rem" || m[2] === "em" ? n * 16 : n;
}

const STEP = /^(.*?)-(\d{2,3}|[1-9]|1[0-2])$/;
const RADIUS = /^(radius|rounded|border-radius|corner-radius|corner|r-base|r|radius-(md|base|default|m))$/;
const BASE_SIZE = /^(text-base|font-size-base|fs-base|step-0|font-size|size-base|body-size|font-size-body|text-body|fs-body)$/;
const SPACING = /^(spacing|space-unit|spacing-unit|grid-unit|space-base|spacing-base|unit|base-unit)$/;
const SHADOW = /^(shadow|box-shadow|elevation)-(sm|md|lg|1|2|3)$/;

// `defaults`: a framework's own variables (Bulma's, Bootstrap's), read only so the project's
// overrides flow through them: $text: $grey-dark !default is found when the project set $grey-dark,
// and a framework default the project didn't touch is never reported as found.
// `shared`: the project's own variables from its other stylesheets (Quasar and Nuxt inject a
// variables file into every stylesheet): read so a rule here can use them, cited where they're written.
// `pageVars`: variables some stylesheet in the project paints the page with (body { background:
// $paper }): they're the page, whatever their name suggests.
export function readStylesheet(css: string, file: string, defaults: { css: string; file: string }[] = [], shared: { css: string; file: string }[] = [], pageVars: Set<string> = new Set()): Look {
  const look = emptyLook();
  const { blocks, topLevel } = parseBlocks(css, file);
  const at = (line: number, f = file) => `${f}:${line}`;

  // Every variable, by scheme. Preprocessor variables are global and count as light.
  const vars: Record<Scheme | "theme", Map<string, Decl>> = { light: new Map(), dark: new Map(), theme: new Map() };
  for (const d of defaults) for (const v of parseBlocks(d.css, d.file, true).topLevel) vars.light.set(v.name, v);
  // Other files' variables resolve here but aren't this file's to report (their own read does that).
  for (const d of shared) for (const v of parseBlocks(d.css, d.file).topLevel) if (!vars.light.has(v.name)) vars.light.set(v.name, { ...v, shared: true });
  for (const d of topLevel) vars.light.set(d.name, d);
  for (const b of blocks) {
    const scheme = schemeOf(b);
    if (scheme === null) {
      // Sass variables inside a rule are local; custom properties on other selectors aren't the theme.
      continue;
    }
    for (const d of b.decls) vars[scheme].set(d.name, DAISY.test(b.selector) ? { ...d, daisy: true } : d);
  }

  // Follows var(--x), $x and @x to a value, in the scheme first, then light, then @theme.
  const resolve = (value: string, scheme: Scheme | "theme", depth = 0): string | undefined => {
    if (depth > 8) return undefined;
    const lookup = (name: string) => vars[scheme].get(name) ?? vars.light.get(name) ?? vars.theme.get(name);
    let unresolved = false;
    const out = value
      .replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\))?[^()]*))?\)/g, (_, name: string, fallback?: string) => {
        const d = lookup(name);
        const r = d === undefined ? fallback?.trim() : resolve(d.value, scheme, depth + 1);
        if (r === undefined) unresolved = true;
        return r ?? "";
      })
      .replace(/(^|[\s(,])([$@][a-zA-Z_][\w-]*)/g, (_, pre: string, name: string) => {
        const d = lookup(name);
        const r = d === undefined ? undefined : resolve(d.value, scheme, depth + 1);
        if (r === undefined) unresolved = true;
        return pre + (r ?? "");
      });
    return unresolved ? undefined : evaluateCalc(out.trim());
  };

  // The declaration a value is actually written in: through var(--x), $x and @x aliases.
  const literal = (d: Decl, scheme: Scheme | "theme"): Decl => {
    let cur = d;
    for (let hops = 0; hops < 8; hops++) {
      const alias = /^var\(\s*(--[\w-]+)\s*\)$|^([$@][\w-]+)$/.exec(cur.value.trim());
      if (alias === null) return cur;
      const name = alias[1] ?? alias[2]!;
      const next = vars[scheme].get(name) ?? vars.light.get(name) ?? vars.theme.get(name);
      if (next === undefined) return cur;
      cur = next;
    }
    return cur;
  };

  const names = new Set<string>();
  for (const scheme of ["light", "dark", "theme"] as const) for (const n of vars[scheme].keys()) names.add(canonicalName(n));
  // What the page is painted with, through aliases: $body-background-color: $paper makes $paper
  // the page too, so it isn't also claimed as a card.
  const page = new Set(pageVars);
  for (let round = 0; round < 4; round++) {
    for (const scheme of ["light", "dark", "theme"] as const) {
      for (const d of vars[scheme].values()) {
        const isPage = page.has(d.name) || roleForName(d.name, names) === LOOK_ROLES.background;
        const alias = /^var\(\s*(--[\w-]+)\s*\)$|^([$@][\w-]+)$/.exec(d.value.trim());
        if (isPage && alias !== null) page.add(alias[1] ?? alias[2]!);
      }
    }
  }
  // The file's own color scales (--teal-1…12): their other variables are theirs.
  const scalePrefixes = new Set<string>();
  const stepCount = new Map<string, number>();
  for (const n of names) {
    const m = STEP.exec(n);
    if (m !== null) stepCount.set(m[1]!, (stepCount.get(m[1]!) ?? 0) + 1);
  }
  for (const [prefix, n] of stepCount) if (n >= 3) scalePrefixes.add(prefix);
  const scales = new Map<string, Map<string, { value: string; line: number }>>();

  for (const scheme of ["light", "dark", "theme"] as const) {
    const target: Scheme = scheme === "dark" ? "dark" : "light";
    for (const d of vars[scheme].values()) {
      if (d.fromDefaults === true && literal(d, scheme).fromDefaults === true) continue;
      if (d.shared === true) continue;
      const name = canonicalName(d.name);
      const value = resolve(d.value, scheme);
      if (/^sidebar/.test(name)) {
        look.skipped.push({ name: d.name, why: "the sidebar takes its colors from the system’s surfaces and roles" });
        continue;
      }
      if (d.daisy === true) {
        // daisyUI's own vocabulary: base-100 is the page, base-content its text, radius-field the
        // controls' corners; base-200/300, radius-box and the rest have no single role.
        const daisyRole = name === "base-100" ? LOOK_ROLES.background : name === "base-content" ? LOOK_ROLES.foreground : undefined;
        const color = value === undefined ? undefined : readAnyColor(value);
        if (daisyRole !== undefined && color !== undefined) {
          if (!look.colors[target].has(daisyRole)) look.colors[target].set(daisyRole, { value: color, source: at(d.line, d.file), name: d.name });
          continue;
        }
        if (name === "radius-field") {
          const n = value === undefined ? undefined : readPx(value);
          if (n !== undefined && target === "light") look.radius = { value: n, source: at(d.line, d.file), name: d.name };
          continue;
        }
        if (/^base-|^radius-|^size-|^(border|depth|noise)$/.test(name)) continue;
      }
      const chart = /^chart-([1-5])$/.exec(name);
      if (chart !== null) {
        const color = value === undefined ? undefined : readAnyColor(value);
        if (color !== undefined && !look.colors[target].has(`chart.${chart[1]}`)) look.colors[target].set(`chart.${chart[1]}`, { value: color, source: at(d.line), name: d.name });
        continue;
      }
      // Numbered scales: --color-brand-600, --gray-100, $blue-500.
      const step = STEP.exec(name);
      if (step !== null && scheme !== "dark" && value !== undefined && readAnyColor(value) !== undefined) {
        const scale = scales.get(step[1]!) ?? new Map();
        scale.set(step[2]!, { value: readAnyColor(value)!, line: d.line });
        scales.set(step[1]!, scale);
        continue;
      }
      // --brand-dark / --brand-light name their scheme when both are there.
      // Only custom properties switch at runtime: a Sass $text-light is a lighter text.
      const split = d.name.startsWith("--") ? stripScheme(name, names) : { name, scheme: undefined };
      // $dark-page, $light-bg: a surface or text role named for its scheme.
      const prefixed = /^(dark|light)-(.+)$/.exec(name);
      const prefixedRole = prefixed === null ? undefined : roleForName(prefixed[2]!, names, scalePrefixes);
      const schemeByPrefix = prefixedRole !== undefined && /^(surface\.|intent\.neutral\.text)/.test(prefixedRole) ? (prefixed![1] as Scheme) : undefined;
      const role = page.has(d.name) ? LOOK_ROLES.background : (schemeByPrefix !== undefined ? prefixedRole : roleForName(split.scheme === undefined ? d.name : split.name, names, scalePrefixes));
      const readable = value === undefined ? undefined : readAnyColor(value);
      // A transparent value paints nothing: it isn't a role's color.
      const color = readable !== undefined && (parseColor(readable)?.alpha ?? 1) === 0 ? undefined : readable;
      if (role !== undefined && color !== undefined) {
        const into: Scheme = schemeByPrefix ?? split.scheme ?? target;
        const lit = literal(d, scheme);
        // A framework's own default, untouched by the project: filled in, not found.
        if (lit.fromDefaults === true) continue;
        // A role set in :root wins over the same role aliased again in @theme.
        if (!look.colors[into].has(role)) look.colors[into].set(role, { value: color, source: at(lit.line, lit.file), name: d.name });
        continue;
      }
      if (role !== undefined && value === undefined && /^(var\(|[$@])/.test(d.value.trim())) {
        look.skipped.push({ name: d.name, why: `set from ${d.value}, which isn’t defined in ${file}` });
        continue;
      }
      if (scheme === "dark") continue;
      const font = fontRoleForName(d.name);
      if (font !== undefined && /font|ff|family|typeface/.test(d.name) && (value === undefined || readPx(value) === undefined)) {
        const list = value === undefined ? [] : fontList(value);
        if (list.length > 0 && look.fonts[font] === undefined) look.fonts[font] = { value: list, source: at(literal(d, scheme).line, literal(d, scheme).file), name: d.name };
        else if (list.length === 0) {
          look.skipped.push({ name: d.name, why: `the font comes from ${d.value}, set outside ${file}` });
          const ref = /var\(\s*(--[\w-]+)/.exec(d.value);
          if (ref !== null) look.pendingFonts.push({ role: font, variable: ref[1]!, name: d.name, source: at(d.line) });
        }
        continue;
      }
      const n = value === undefined ? undefined : readPx(value);
      if (RADIUS.test(name) && n !== undefined) {
        // shadcn's --radius (and --radius-md) over the rest of a radius scale.
        const rank = (x: string) => (x === "radius" ? 0 : /-(md|base|default)$/.test(x) ? 1 : 2);
        if (look.radius === undefined || rank(name) < rank(canonicalName(look.radius.name ?? ""))) look.radius = { value: n, source: at(literal(d, scheme).line, literal(d, scheme).file), name: d.name };
        continue;
      }
      if (/^radius-(sm|lg|xl|xs|2xl|full)$/.test(name)) continue;
      if (BASE_SIZE.test(name) && n !== undefined) {
        look.baseSize ??= { value: n, source: at(literal(d, scheme).line, literal(d, scheme).file), name: d.name };
        continue;
      }
      if (name === "spacer" && n !== undefined) {
        // Bootstrap's $spacer is 4 of its steps.
        look.spacing ??= { value: n / 4, source: at(literal(d, scheme).line, literal(d, scheme).file), name: d.name };
        continue;
      }
      if (SPACING.test(name) && n !== undefined) {
        look.spacing ??= { value: n, source: at(literal(d, scheme).line, literal(d, scheme).file), name: d.name };
        continue;
      }
      const shadow = SHADOW.exec(name);
      if (shadow !== null && value !== undefined) {
        const size: ShadowSize = shadow[2] === "sm" || shadow[2] === "1" ? "sm" : shadow[2] === "lg" || shadow[2] === "3" ? "lg" : "md";
        look.shadows[size] ??= { value, source: at(d.line), name: d.name };
      }
    }
  }

  for (const [name, steps] of scales) {
    if (steps.size < 3) continue;
    const ordered = [...steps].sort((a, b) => Number(a[0]) - Number(b[0]));
    look.scales.push({ name, steps: ordered.map(([step, s]) => ({ step, value: { value: s.value, source: at(s.line), name: `${name}-${step}` } })) });
  }

  // A look without variables: the rules themselves, light, then inside a dark-mode block.
  const ruleIn = (scheme: Scheme, selector: RegExp) =>
    blocks.filter((b) => {
      const s = schemeOf(b);
      const inDark = s === "dark" && !DARK.test(b.selector);
      // html, body and :root rules with plain properties count as the light page too.
      return (scheme === "light" ? s === null || (s === "light" && b.props.length > 0) : inDark) && selector.test(b.selector);
    });
  const rule = (selector: RegExp) => ruleIn("light", selector);
  const prop = (b: Block, name: RegExp) => b.props.find((p) => name.test(p.name));
  const colorIn = (value: string) => {
    const r = resolve(value, "light");
    if (r === undefined) return undefined;
    const lit = /(#[0-9a-f]{3,8}\b|(?:rgb|rgba|hsl|hsla|oklch|oklab)\([^)]*\)|\b(white|black)\b)/i.exec(r);
    return lit === null ? undefined : readAnyColor(lit[1]!);
  };
  const setRole = (role: string, value: string | undefined, d: Decl, via: string, scheme: Scheme = "light") => {
    if (value !== undefined && !look.colors[scheme].has(role)) look.colors[scheme].set(role, { value, source: at(d.line), name: via });
  };
  for (const scheme of ["light", "dark"] as const) {
    for (const b of ruleIn(scheme, /^(html|body|:root)(\s*,\s*(html|body|:root))*$/)) {
      const bg = prop(b, /^background(-color)?$/);
      // Usage beats naming: the variable the page is painted with is the page, whatever its
      // name suggested ($paper read as a card, say), so it leaves that other role.
      const via = bg === undefined ? undefined : /^(?:var\(\s*(--[\w-]+)\s*\)|([$@][\w-]+))$/.exec(bg.value.trim());
      if (via !== null && via !== undefined) {
        const name = via[1] ?? via[2]!;
        for (const [path, f] of look.colors[scheme]) if (f.name === name && path !== LOOK_ROLES.background) look.colors[scheme].delete(path);
      }
      if (bg !== undefined) setRole(LOOK_ROLES.background, colorIn(bg.value), bg, `${b.selector} background`, scheme);
      const fg = prop(b, /^color$/);
      if (fg !== undefined) setRole(LOOK_ROLES.foreground, colorIn(fg.value), fg, `${b.selector} color`, scheme);
    }
  }
  for (const b of rule(/^(html|body)(\s*,\s*(html|body))?$/)) {
    const family = prop(b, /^font-family$/);
    const list = family === undefined ? [] : fontList(resolve(family.value, "light") ?? "");
    if (family !== undefined && list.length > 0) look.fonts.sans ??= { value: list, source: at(family.line), name: `${b.selector} font-family` };
    const size = prop(b, /^font-size$/);
    const px = size === undefined ? undefined : readPx(resolve(size.value, "light") ?? "");
    if (size !== undefined && px !== undefined) look.baseSize ??= { value: px, source: at(size.line), name: `${b.selector} font-size` };
  }
  const button = (kind: string) => new RegExp(`(^|[\\s,.])(btn|button)[-_]{1,2}${kind}\\b`);
  // A status class: .error, .alert-error, .badge--success, .text-warning; not .error-page.
  const status = (kind: string) => new RegExp(`(^|[\\s,.])((alert|badge|text|bg|message|msg|notice|notification|toast|callout|tag|label|pill|chip|banner|status|is|has|flash|form|field|input|validation|help|hint)[-_]{1,2})?${kind}(?![\\w-])`);
  for (const scheme of ["light", "dark"] as const) {
    for (const [kind, role, fgRole] of [["(primary|cta|main)", LOOK_ROLES.primary, LOOK_ROLES.primaryForeground], ["(danger|destructive|error)", LOOK_ROLES.danger, undefined]] as const) {
      for (const b of ruleIn(scheme, button(kind))) {
        const bg = prop(b, /^background(-color)?$/);
        if (bg !== undefined) setRole(role, colorIn(bg.value), bg, `${b.selector} background`, scheme);
        const fg = prop(b, /^color$/);
        if (fgRole !== undefined && fg !== undefined) setRole(fgRole, colorIn(fg.value), fg, `${b.selector} color`, scheme);
      }
    }
    // Messages, badges and alerts that say what they are: .alert-error, .badge--success, .warning.
    for (const [kind, role] of [["(danger|error|destructive|critical)", LOOK_ROLES.danger], ["(success|positive)", LOOK_ROLES.success], ["(warning|caution)", LOOK_ROLES.warning]] as const) {
      for (const b of ruleIn(scheme, status(kind))) {
        // Buttons are read above: a button's `color` is the text on its fill.
        if (/(^|[\s,.])(btn|button)\b|(btn|button)[-_]/.test(b.selector)) continue;
        const bg = prop(b, /^background(-color)?$/);
        const c = prop(b, /^color$/);
        // A filled one gives its fill; a text-only one its text color. A fill that can't be read
        // (set at runtime) gives nothing: its text color isn't the status color.
        if (bg !== undefined) {
          const fill = colorIn(bg.value);
          if (fill !== undefined && !/^#?f{3,6}$|white/i.test(bg.value.trim())) setRole(role, fill, bg, `${b.selector} ${bg.name}`, scheme);
          continue;
        }
        if (c !== undefined) setRole(role, colorIn(c.value), c, `${b.selector} ${c.name}`, scheme);
      }
    }
    for (const b of ruleIn(scheme, /(^|[\s,.])(card|panel|tile)\b/)) {
      const border = prop(b, /^border(-color)?$/);
      if (border !== undefined) setRole(LOOK_ROLES.border, colorIn(border.value), border, `${b.selector} border`, scheme);
      const bg = prop(b, /^background(-color)?$/);
      if (bg !== undefined) setRole(LOOK_ROLES.card, colorIn(bg.value), bg, `${b.selector} background`, scheme);
    }
  }
  // The default corner is the controls' (buttons, inputs); a card's is usually larger.
  const corner = (selector: RegExp) => {
    for (const b of rule(selector)) {
      const radius = prop(b, /^border-radius$/);
      const px = radius === undefined ? undefined : readPx(resolve(radius.value, "light") ?? "");
      if (radius !== undefined && px !== undefined) {
        look.radius ??= { value: px, source: at(radius.line), name: `${b.selector} border-radius` };
        return;
      }
    }
  };
  corner(/(^|[\s,.])(btn|button)\b|^button\b|(^|[\s,])(input|select|textarea)\b/);
  corner(/(^|[\s,.])(card|panel|tile)\b/);
  // Headings' own font.
  for (const b of rule(/^(h1|h2|h3|\.heading|\.title|\.display)(\s*,\s*(h[1-6]|\.heading|\.title|\.display))*$/)) {
    const family = prop(b, /^font-family$/);
    const list = family === undefined ? [] : fontList(resolve(family.value, "light") ?? "");
    if (family !== undefined && list.length > 0) look.fonts.heading ??= { value: list, source: at(family.line), name: `${b.selector} font-family` };
  }
  return look;
}

// calc() with plain arithmetic, once var() is filled in: calc(62% / 2) → 31%, calc(52% * 1.3) → 67.6%.
// Anything it can't do exactly (mixed units in a sum) is left as it was.
export function evaluateCalc(value: string): string {
  let out = value;
  for (let i = 0; i < 8; i++) {
    const next = out.replace(/calc\(([^()]*)\)/g, (whole, expr: string) => {
      const r = arithmetic(expr);
      return r === undefined ? whole : r;
    });
    if (next === out) break;
    out = next;
  }
  return out;
}

function arithmetic(expr: string): string | undefined {
  const tokens = expr.match(/-?\d*\.?\d+(?:%|px|rem|em|deg)?|[-+*/]/g);
  if (tokens === null) return undefined;
  type N = { n: number; unit: string };
  const num = (t: string): N | undefined => {
    const m = /^(-?\d*\.?\d+)(%|px|rem|em|deg)?$/.exec(t);
    return m === null ? undefined : { n: Number(m[1]), unit: m[2] ?? "" };
  };
  const values: N[] = [];
  const ops: string[] = [];
  for (const t of tokens) {
    if (/^[-+*/]$/.test(t) && values.length > ops.length) ops.push(t);
    else {
      const v = num(t);
      if (v === undefined) return undefined;
      values.push(v);
    }
  }
  if (values.length !== ops.length + 1) return undefined;
  // * and / first, then + and -.
  const apply = (a: N, op: string, b: N): N | undefined => {
    if (op === "*") return a.unit !== "" && b.unit !== "" ? undefined : { n: a.n * b.n, unit: a.unit || b.unit };
    if (op === "/") return b.unit !== "" || b.n === 0 ? undefined : { n: a.n / b.n, unit: a.unit };
    if (a.unit !== b.unit) return undefined;
    return { n: op === "+" ? a.n + b.n : a.n - b.n, unit: a.unit };
  };
  for (const pass of [/[*/]/, /[-+]/]) {
    for (let i = 0; i < ops.length; ) {
      if (!pass.test(ops[i]!)) {
        i++;
        continue;
      }
      const r = apply(values[i]!, ops[i]!, values[i + 1]!);
      if (r === undefined) return undefined;
      values.splice(i, 2, r);
      ops.splice(i, 1);
    }
  }
  const r = values[0]!;
  return `${Math.round(r.n * 1000) / 1000}${r.unit}`;
}

// The variables a stylesheet paints the page with: body/html { background: $x | var(--x) }.
export function pageVariables(css: string): string[] {
  const out: string[] = [];
  for (const m of css.matchAll(/(?:^|[}\s,])(?:html|body)(?:[.#:\[][^\s,{]*)?(?:\s*,\s*(?:html|body)(?:[.#:\[][^\s,{]*)?)*\s*\{[^}]*?background(?:-color)?\s*:\s*(?:var\(\s*(--[\w-]+)\s*\)|([$@][\w-]+))\s*[;}]/g)) out.push(m[1] ?? m[2]!);
  return out;
}
