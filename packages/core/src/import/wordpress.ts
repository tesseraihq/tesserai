import { jsonLines } from "./tokens-look";
import { emptyLook, fontList, LOOK_ROLES, type Look } from "./look";
import { readPx } from "./css-look";

// A WordPress block theme's theme.json (v2/v3): the palette, fonts and sizes are presets, and which
// preset plays which role is in `styles` (the page, its text, buttons, headings). Roles come from
// those styles, following either reference syntax (var:preset|color|accent and
// var(--wp--preset--color--accent)) to the palette entry, which is the line cited.

type Preset = { value: string; path: string };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function isThemeJson(json: unknown): boolean {
  return isObject(json) && (isObject(json.settings) || isObject(json.styles)) && (typeof json.version === "number" || String(json.$schema ?? "").includes("wp.org"));
}

export function readThemeJson(json: unknown, file: string, text?: string): Look {
  const look = emptyLook();
  if (!isObject(json)) return look;
  const lines = text === undefined ? new Map<string, number>() : jsonLines(text);
  const at = (path: string) => {
    const line = lines.get(path);
    return line === undefined ? undefined : `${file}:${line}`;
  };
  const settings = isObject(json.settings) ? json.settings : {};
  const styles = isObject(json.styles) ? json.styles : {};

  // Presets by kind and slug, with where each is written.
  const presets = new Map<string, Preset>();
  const collect = (kind: string, list: unknown, valueKey: string, path: string) => {
    if (!Array.isArray(list)) return;
    list.forEach((e, i) => {
      if (isObject(e) && typeof e.slug === "string" && (typeof e[valueKey] === "string" || typeof e[valueKey] === "number")) {
        presets.set(`${kind}|${e.slug}`, { value: String(e[valueKey]), path: `${path}.${i}.${valueKey}` });
      }
    });
  };
  const color = isObject(settings.color) ? settings.color : {};
  const typography = isObject(settings.typography) ? settings.typography : {};
  collect("color", color.palette, "color", "settings.color.palette");
  collect("font-family", typography.fontFamilies, "fontFamily", "settings.typography.fontFamilies");
  collect("font-size", typography.fontSizes, "size", "settings.typography.fontSizes");

  // A style value: a preset reference in either syntax, or a literal.
  const valueOf = (raw: unknown, path: string): { value: string; source: string | undefined } | undefined => {
    if (typeof raw !== "string") return undefined;
    const ref = /^var:preset\|([\w-]+)\|([\w-]+)$/.exec(raw) ?? /^var\(--wp--preset--([\w-]+?)--([\w-]+)\)$/.exec(raw);
    if (ref !== null) {
      const p = presets.get(`${ref[1]}|${ref[2]}`);
      return p === undefined ? undefined : { value: p.value, source: at(p.path) };
    }
    return { value: raw, source: at(path) };
  };
  const get = (obj: unknown, ...keys: string[]): unknown => keys.reduce<unknown>((o, k) => (isObject(o) ? o[k] : undefined), obj);
  const setColor = (role: string, raw: unknown, path: string, name: string) => {
    const v = valueOf(raw, path);
    if (v !== undefined && !look.colors.light.has(role)) look.colors.light.set(role, { value: v.value, source: v.source, name });
  };

  setColor(LOOK_ROLES.background, get(styles, "color", "background"), "styles.color.background", "styles.color.background");
  setColor(LOOK_ROLES.foreground, get(styles, "color", "text"), "styles.color.text", "styles.color.text");
  setColor(LOOK_ROLES.primary, get(styles, "elements", "button", "color", "background"), "styles.elements.button.color.background", "the button's background");
  setColor(LOOK_ROLES.primaryForeground, get(styles, "elements", "button", "color", "text"), "styles.elements.button.color.text", "the button's text");

  const family = (raw: unknown, path: string) => {
    const v = valueOf(raw, path);
    return v === undefined ? undefined : { list: fontList(v.value), source: v.source };
  };
  const body = family(get(styles, "typography", "fontFamily"), "styles.typography.fontFamily");
  if (body !== undefined && body.list.length > 0) look.fonts.sans = { value: body.list, source: body.source, name: "styles.typography.fontFamily" };
  const heading = family(get(styles, "elements", "heading", "typography", "fontFamily") ?? get(styles, "elements", "h1", "typography", "fontFamily"), "styles.elements.heading.typography.fontFamily");
  if (heading !== undefined && heading.list.length > 0) look.fonts.heading = { value: heading.list, source: heading.source, name: "styles.elements.heading.typography.fontFamily" };

  const size = valueOf(get(styles, "typography", "fontSize"), "styles.typography.fontSize");
  const px = size === undefined ? undefined : readPx(size.value);
  if (size !== undefined && px !== undefined) look.baseSize = { value: px, source: size.source, name: "styles.typography.fontSize" };

  const radiusRaw = get(styles, "elements", "button", "border", "radius");
  const radius = typeof radiusRaw === "string" ? readPx(radiusRaw) : undefined;
  if (radius !== undefined) look.radius = { value: radius, source: at("styles.elements.button.border.radius"), name: "the button's corners" };
  return look;
}
