import { toHex } from "./color";
import { cssVarName } from "./css-names";
import { INTENT_ROLES } from "./intents";
import { DEFAULT_MODE } from "./modes";
import { resolveToken } from "./resolve";
import { outputTokens, type DesignSystem } from "./system";
import { flattenTokens, type ColorValue, type DimensionValue } from "./tokens";

// The reference for people using a system: every value with the class or variable that uses it,
// generated from the system so it can't drift from it.

export type ColorDoc = { name: string; use: string; light: string; dark: string };
export type SizeDoc = { name: string; use: string; px: number };
export type TokenDocs = {
  meanings: { name: string; roles: ColorDoc[] }[];
  surfaces: ColorDoc[];
  palettes: { name: string; steps: ColorDoc[] }[];
  type: SizeDoc[];
  radius: SizeDoc[];
  spacingUnit: number;
  fonts: { role: string; use: string; families: string[] }[];
};

// Which utility a role is for: fills, borders, rings or text.
function utility(role: string): string {
  if (role === "border" || role === "border-strong") return "border";
  if (role === "focus-ring") return "ring";
  if (role === "text" || role === "text-strong" || role.endsWith("foreground")) return "text";
  return "bg";
}

const px = (d: DimensionValue) => (d.unit === "rem" ? d.value * 16 : d.value);

export function tokenDocs(system: DesignSystem): TokenDocs {
  const flat = flattenTokens(outputTokens(system));
  const light = { ...DEFAULT_MODE, colorScheme: "light" as const };
  const dark = { ...DEFAULT_MODE, colorScheme: "dark" as const };
  const color = (name: string, use: string, path: string): ColorDoc | null => {
    if (!flat.has(path)) return null;
    try {
      return {
        name,
        use,
        light: toHex(resolveToken(flat, path, light, "color").$value as ColorValue),
        dark: toHex(resolveToken(flat, path, dark, "color").$value as ColorValue),
      };
    } catch {
      return null;
    }
  };
  const size = (path: string): number | null => {
    try {
      return Math.round(px(resolveToken(flat, path, DEFAULT_MODE, "dimension").$value as DimensionValue) * 100) / 100;
    } catch {
      return null;
    }
  };
  const nonNull = <T,>(xs: (T | null)[]) => xs.filter((x): x is T => x !== null);

  const meanings = Object.keys(system.intents).map((intent) => ({
    name: intent,
    roles: nonNull(
      [...Object.keys(INTENT_ROLES), "solid-foreground"].map((role) => color(role, `${utility(role)}-${intent}-${role}`, `intent.${intent}.${role}`)),
    ),
  }));
  const surfaces = nonNull(["page", "card", "raised", "overlay", "backdrop"].map((s) => color(s, `bg-(${cssVarName(`surface.${s}`)})`, `surface.${s}`)));
  const palettes = new Map<string, ColorDoc[]>();
  for (const path of flat.keys()) {
    const m = /^color\.([a-z0-9-]+)\.(\d+)$/.exec(path);
    if (m === null) continue;
    const doc = color(m[2]!, `bg-${m[1]}-${m[2]}`, path);
    if (doc !== null) palettes.set(m[1]!, [...(palettes.get(m[1]!) ?? []), doc]);
  }
  const sized = (prefix: string, use: (key: string) => string) =>
    nonNull(
      [...flat.keys()]
        .filter((p) => p.startsWith(prefix) && !p.slice(prefix.length).includes("."))
        .map((p) => {
          const v = size(p);
          const key = p.slice(prefix.length);
          return v === null ? null : { name: key, use: use(key), px: v };
        }),
    );
  const unitToken = flat.has("space.2") ? "space.2" : "space.1";
  return {
    meanings,
    surfaces,
    palettes: [...palettes].map(([name, steps]) => ({ name, steps })),
    type: sized("font.size.", (k) => `text-${k}`),
    radius: sized("radius.", (k) => `rounded-${k}`),
    spacingUnit: size(unitToken) ?? 4,
    fonts: ["sans", "heading", "mono"].flatMap((role) => {
      try {
        return [{ role, use: `font-${role}`, families: resolveToken(flat, `font.family.${role}`, DEFAULT_MODE, "fontFamily").$value as string[] }];
      } catch {
        return [];
      }
    }),
  };
}

// A component's own tokens, as the docs list them: the variable, and the value in light and dark.
export type ComponentTokenDoc = { name: string; variable: string; light: string; dark: string; color: boolean };

export function componentTokenDocs(system: DesignSystem, component: string): ComponentTokenDoc[] {
  const flat = flattenTokens(outputTokens(system));
  const light = { ...DEFAULT_MODE, colorScheme: "light" as const };
  const dark = { ...DEFAULT_MODE, colorScheme: "dark" as const };
  const show = (value: unknown, type: string): string => {
    if (type === "color") return toHex(value as ColorValue);
    if (type === "dimension") {
      const d = value as DimensionValue;
      return `${Math.round(px(d) * 100) / 100}px`;
    }
    if (Array.isArray(value)) return value.join(", ");
    return typeof value === "object" ? JSON.stringify(value) : String(value);
  };
  const out: ComponentTokenDoc[] = [];
  for (const [path, token] of flat) {
    if (!path.startsWith(`${component}.`)) continue;
    try {
      const l = resolveToken(flat, path, light);
      const d = resolveToken(flat, path, dark);
      out.push({ name: path.slice(component.length + 1), variable: cssVarName(path), light: show(l.$value, token.$type), dark: show(d.$value, token.$type), color: token.$type === "color" });
    } catch {
      // A token that doesn't resolve isn't listed; the builder's checks report it.
    }
  }
  return out;
}
