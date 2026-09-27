import { toRgba, type Rgba } from "./color";
import { INTENT_ROLES } from "./intents";
import { DEFAULT_MODE } from "./modes";
import { resolveToken } from "./resolve";
import { outputTokens, type DesignSystem } from "./system";
import { flattenTokens, type ColorValue, type DimensionValue } from "./tokens";

// The system for platforms that can't read CSS: every value resolved, colors in light and dark,
// sizes in px. One model, and a small writer per format on top of it.

export type PlatformTokens = {
  name: string;
  // Keys are camelCase names: primarySolid, surfacePage, brand9.
  colors: { light: Record<string, Rgba>; dark: Record<string, Rgba> };
  // Each color's place in a nested theme: primarySolid → ["primary", "solid"], brand9 → ["brand", "9"].
  colorPaths: Record<string, string[]>;
  space: Record<string, number>;
  radius: Record<string, number>;
  fontSize: Record<string, number>;
  fontFamily: Record<string, string[]>;
  // Each palette's steps, lightest first, for libraries built on shade scales (Mantine, Chakra).
  palettes: Record<string, { light: Rgba[]; dark: Rgba[] }>;
  // The body text size in px.
  bodySize: number;
  // Meaning name → palette name, and which step each meaning's solid color is.
  intents: Record<string, { palette: string; solidStep: number }>;
};

export const PLATFORM_FORMATS = ["scss", "ts", "panda", "stylex", "mui", "mantine", "chakra", "antd", "swift", "kotlin", "dart"] as const;
export type PlatformFormat = (typeof PLATFORM_FORMATS)[number];

export const PLATFORM_FORMAT_INFO: Record<PlatformFormat, { label: string; file: string; about: string }> = {
  scss: { label: "SCSS", file: "_tesserai.scss", about: "Variables and a light/dark map, for Sass stylesheets." },
  ts: { label: "TypeScript", file: "tesserai-theme.ts", about: "A typed theme object for styled-components, Emotion or vanilla-extract." },
  panda: { label: "Panda", file: "tesserai-panda.ts", about: "A Panda CSS preset: tokens, and colors as semantic tokens with _dark values." },
  stylex: { label: "StyleX", file: "tesserai.stylex.ts", about: "StyleX variables, dark by media query, plus a dark theme to apply by class." },
  mui: { label: "MUI", file: "tesserai-mui.ts", about: "A Material UI theme with light and dark color schemes." },
  mantine: { label: "Mantine", file: "tesserai-mantine.ts", about: "A Mantine theme: ten-shade colors, primary color, radius, spacing and fonts." },
  chakra: { label: "Chakra", file: "tesserai-chakra.ts", about: "A Chakra UI v3 system: color tokens and each meaning as a color palette." },
  antd: { label: "Ant Design", file: "tesserai-antd.ts", about: "Ant Design (v5 and v6) themes for ConfigProvider: light, and dark with antd's dark algorithm." },
  swift: { label: "SwiftUI", file: "Tesserai.swift", about: "Colors that follow the system appearance, plus spacing, radius and type sizes." },
  kotlin: { label: "Jetpack Compose", file: "Tesserai.kt", about: "Light and dark color sets, dp spacing and radius, sp type sizes." },
  dart: { label: "Flutter", file: "tesserai.dart", about: "Light and dark color classes, spacing, radius and type sizes." },
};

const camel = (parts: string[]) =>
  parts
    .join("-")
    .split(/[-._\s]+/)
    .filter(Boolean)
    .map((w, i) => (i === 0 ? w.toLowerCase() : w[0]!.toUpperCase() + w.slice(1)))
    .join("");
// Identifiers can't start with a digit: space.1 → s1, radius.2xl → r2xl.
const ident = (prefix: string, key: string) => (/^\d/.test(key) ? `${prefix}${key}` : camel([key]));

const px = (d: DimensionValue) => (d.unit === "rem" ? d.value * 16 : d.value);

export function platformTokens(system: DesignSystem): PlatformTokens {
  const flat = flattenTokens(outputTokens(system));
  const light = { ...DEFAULT_MODE, colorScheme: "light" as const };
  const dark = { ...DEFAULT_MODE, colorScheme: "dark" as const };
  const type = system.generators["type"]?.config;
  const out: PlatformTokens = {
    name: system.name,
    colors: { light: {}, dark: {} },
    colorPaths: {},
    space: {},
    radius: {},
    fontSize: {},
    fontFamily: {},
    palettes: {},
    bodySize: type?.kind === "typeScale" ? type.base : 16,
    intents: {},
  };

  const color = (key: string, path: string, place: string[]) => {
    if (!flat.has(path)) return;
    try {
      out.colors.light[key] = toRgba(resolveToken(flat, path, light, "color").$value as ColorValue);
      out.colors.dark[key] = toRgba(resolveToken(flat, path, dark, "color").$value as ColorValue);
      out.colorPaths[key] = place;
    } catch {
      // A token that can't resolve is left out rather than exported wrong.
    }
  };
  for (const intent of Object.keys(system.intents)) {
    for (const role of [...Object.keys(INTENT_ROLES), "solid-foreground"]) color(camel([intent, role]), `intent.${intent}.${role}`, [intent, role]);
  }
  for (const surface of ["page", "card", "raised", "overlay", "backdrop"]) color(camel(["surface", surface]), `surface.${surface}`, ["surface", surface]);
  for (const path of flat.keys()) {
    const m = /^color\.([a-z0-9-]+)\.(\d+)$/.exec(path);
    if (m === null) continue;
    color(camel([m[1]!, m[2]!]), path, [m[1]!, m[2]!]);
    const key = camel([m[1]!, m[2]!]);
    const light = out.colors.light[key];
    const dark = out.colors.dark[key];
    if (light === undefined || dark === undefined) continue;
    const palette = (out.palettes[m[1]!] ??= { light: [], dark: [] });
    palette.light[Number(m[2]) - 1] = light;
    palette.dark[Number(m[2]) - 1] = dark;
  }
  for (const [name, def] of Object.entries(system.intents)) {
    const palette = def.scale.replace(/^color\./, "");
    const solid = out.colors.light[camel([name, "solid"])];
    const steps = out.palettes[palette]?.light ?? [];
    const index = solid === undefined ? -1 : steps.findIndex((c) => c.r === solid.r && c.g === solid.g && c.b === solid.b);
    out.intents[name] = { palette, solidStep: index === -1 ? Math.round(steps.length * 0.7) : index + 1 };
  }

  const dimension = (group: Record<string, number>, prefix: string, tokenPrefix: string) => {
    for (const path of flat.keys()) {
      if (!path.startsWith(tokenPrefix)) continue;
      const key = path.slice(tokenPrefix.length);
      if (key.includes(".")) continue;
      try {
        group[ident(prefix, key)] = Math.round(px(resolveToken(flat, path, DEFAULT_MODE, "dimension").$value as DimensionValue) * 100) / 100;
      } catch {
        // Skipped, as above.
      }
    }
  };
  dimension(out.space, "s", "space.");
  dimension(out.radius, "r", "radius.");
  dimension(out.fontSize, "size", "font.size.");
  for (const role of ["sans", "heading", "mono"]) {
    const path = `font.family.${role}`;
    if (!flat.has(path)) continue;
    try {
      out.fontFamily[role] = resolveToken(flat, path, DEFAULT_MODE, "fontFamily").$value as string[];
    } catch {
      // Skipped.
    }
  }
  return out;
}

// ---- writers ----

const hex = (c: Rgba) =>
  `#${[c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("")}${c.a < 1 ? Math.round(c.a * 255).toString(16).padStart(2, "0") : ""}`;
const argb = (c: Rgba) => `0x${[c.a, c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0").toUpperCase()).join("")}`;
const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const header = (t: PlatformTokens, comment: string) =>
  `${comment} ${t.name.replace(/[\r\n\u2028\u2029]/g, " ")}: generated by tesserai. Change the system and export again rather than editing this file.`;

function scss(t: PlatformTokens): string {
  const lines = [header(t, "//"), ""];
  for (const [k, c] of Object.entries(t.colors.light)) lines.push(`$${kebab(k)}: ${hex(c)};`);
  lines.push("");
  for (const [k, c] of Object.entries(t.colors.dark)) lines.push(`$dark-${kebab(k)}: ${hex(c)};`);
  lines.push("");
  for (const [k, v] of Object.entries(t.space)) lines.push(`$space-${kebab(k).replace(/^s/, "")}: ${v}px;`);
  for (const [k, v] of Object.entries(t.radius)) lines.push(`$radius-${kebab(k).replace(/^r(?=\d)/, "")}: ${v}px;`);
  for (const [k, v] of Object.entries(t.fontSize)) lines.push(`$font-size-${kebab(k).replace(/^size/, "")}: ${v}px;`);
  for (const [k, v] of Object.entries(t.fontFamily)) lines.push(`$font-${k}: ${v.map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(", ")};`);
  lines.push("", "// Both schemes as one map: map.get($tesserai-colors, dark, primary-solid).", "$tesserai-colors: (");
  for (const scheme of ["light", "dark"] as const) {
    lines.push(`  ${scheme}: (`);
    for (const [k, c] of Object.entries(t.colors[scheme])) lines.push(`    ${kebab(k)}: ${hex(c)},`);
    lines.push("  ),");
  }
  lines.push(");", "");
  return lines.join("\n");
}

function ts(t: PlatformTokens): string {
  const obj = (o: Record<string, unknown>, indent = "  ") => Object.entries(o).map(([k, v]) => `${indent}${k}: ${JSON.stringify(v)},`).join("\n");
  const colors = (scheme: "light" | "dark") => Object.fromEntries(Object.entries(t.colors[scheme]).map(([k, c]) => [k, hex(c)]));
  return `${header(t, "//")}

export const light = {
${obj(colors("light"))}
} as const;

export const dark: Record<keyof typeof light, string> = {
${obj(colors("dark"))}
};

// Sizes in px.
export const space = {
${obj(t.space)}
} as const;

export const radius = {
${obj(t.radius)}
} as const;

export const fontSize = {
${obj(t.fontSize)}
} as const;

export const fontFamily = {
${Object.entries(t.fontFamily)
  .map(([k, v]) => `  ${k}: ${JSON.stringify(v.join(", "))},`)
  .join("\n")}
} as const;

export const theme = { light, dark, space, radius, fontSize, fontFamily };
export type ThemeColors = typeof light;
`;
}

// Colors nested by their place: { primary: { solid: …, "solid-foreground": … }, brand: { 9: … } }.
function nest<T>(t: PlatformTokens, leaf: (key: string) => T): Record<string, Record<string, T>> {
  const out: Record<string, Record<string, T>> = {};
  for (const key of Object.keys(t.colors.light)) {
    const [group, name] = t.colorPaths[key] ?? [key, "DEFAULT"];
    (out[group!] ??= {})[name!] = leaf(key);
  }
  return out;
}

// Sizes keyed as the utilities use them: s4 → "4", r2xl → "2xl", sizeLg → "lg".
const unprefix = (o: Record<string, number>, prefix: RegExp) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.replace(prefix, "").replace(/^([A-Z])/, (c) => c.toLowerCase()), v]));
const quoteKey = (k: string) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k));

function panda(t: PlatformTokens): string {
  const indent = (text: string, n: number) => text.replace(/\n/g, `\n${" ".repeat(n)}`);
  const values = (o: Record<string, number>) => `{\n${Object.entries(o).map(([k, v]) => `  ${quoteKey(k)}: { value: "${v}px" },`).join("\n")}\n}`;
  const colors = nest(t, (key) => ({ base: hex(t.colors.light[key]!), _dark: hex(t.colors.dark[key]!) }));
  const semantic = `{\n${Object.entries(colors)
    .map(([group, entries]) => `  ${quoteKey(group)}: {\n${Object.entries(entries).map(([k, v]) => `    ${quoteKey(k)}: { value: { base: "${v.base}", _dark: "${v._dark}" } },`).join("\n")}\n  },`)
    .join("\n")}\n}`;
  const fonts = `{\n${Object.entries(t.fontFamily).map(([k, v]) => `  ${k}: { value: ${JSON.stringify(v.map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(", "))} },`).join("\n")}\n}`;
  return `${header(t, "//")}
// In panda.config.ts: presets: ["@pandacss/preset-base", tesserai]. Dark values apply under .dark,
// Panda's default dark condition, the same class the rest of the system uses.
import { definePreset } from "@pandacss/dev";

export const tesserai = definePreset({
  name: ${JSON.stringify(t.name)},
  theme: {
    extend: {
      tokens: {
        spacing: ${indent(values(unprefix(t.space, /^s(?=\d)/)), 8)},
        radii: ${indent(values(unprefix(t.radius, /^r(?=\d)/)), 8)},
        fontSizes: ${indent(values(unprefix(t.fontSize, /^size/)), 8)},
        fonts: ${indent(fonts, 8)},
      },
      semanticTokens: {
        colors: ${indent(semantic, 8)},
      },
    },
  },
});

export default tesserai;
`;
}

function stylex(t: PlatformTokens): string {
  const block = (entries: [string, string][]) => entries.map(([k, v]) => `  ${quoteKey(k)}: ${v},`).join("\n");
  const px = (o: Record<string, number>) => block(Object.entries(o).map(([k, v]) => [k, `"${v}px"`]));
  return `${header(t, "//")}
// Import from components: stylex.create({ root: { color: colors.primarySolid, padding: space.s4 } }).
// Dark follows the system setting by default; to switch by class instead, apply darkTheme to the
// root (stylex.props(darkTheme)) when the app is dark.
import * as stylex from "@stylexjs/stylex";

const DARK = "@media (prefers-color-scheme: dark)";

export const colors = stylex.defineVars({
${block(Object.keys(t.colors.light).map((k) => [k, `{ default: "${hex(t.colors.light[k]!)}", [DARK]: "${hex(t.colors.dark[k]!)}" }`]))}
});

export const darkTheme = stylex.createTheme(colors, {
${block(Object.keys(t.colors.dark).map((k) => [k, `"${hex(t.colors.dark[k]!)}"`]))}
});

export const space = stylex.defineVars({
${px(t.space)}
});

export const radius = stylex.defineVars({
${px(t.radius)}
});

export const fontSize = stylex.defineVars({
${px(t.fontSize)}
});

export const fonts = stylex.defineVars({
${block(Object.entries(t.fontFamily).map(([k, v]) => [k, JSON.stringify(v.map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(", "))]))}
});
`;
}

// A string literal for Kotlin and Dart, whose double-quoted strings interpolate $name and ${…}.
const templateSafe = (s: string) => JSON.stringify(s).replace(/\$/g, "\\$");

function swift(t: PlatformTokens): string {
  const c = (x: Rgba) => `Color(.sRGB, red: ${x.r.toFixed(4)}, green: ${x.g.toFixed(4)}, blue: ${x.b.toFixed(4)}, opacity: ${x.a.toFixed(3)})`;
  const numbers = (o: Record<string, number>) => Object.entries(o).map(([k, v]) => `        public static let ${k}: CGFloat = ${v}`).join("\n");
  return `${header(t, "//")}

import SwiftUI

public enum Tesserai {
    /// Colors that follow the light or dark appearance.
    public enum Colors {
${Object.keys(t.colors.light)
  .map((k) => `        public static let ${k} = Color(light: ${c(t.colors.light[k]!)}, dark: ${c(t.colors.dark[k]!)})`)
  .join("\n")}
    }

    /// Points.
    public enum Space {
${numbers(t.space)}
    }

    public enum Radius {
${numbers(t.radius)}
    }

    public enum FontSize {
${numbers(t.fontSize)}
    }

    public enum FontFamily {
${Object.entries(t.fontFamily)
  .map(([k, v]) => `        public static let ${k} = ${JSON.stringify(v[0] ?? "")}`)
  .join("\n")}
    }
}

extension Color {
    /// A color that switches with the appearance.
    init(light: Color, dark: Color) {
        #if canImport(UIKit)
        self.init(UIColor { $0.userInterfaceStyle == .dark ? UIColor(dark) : UIColor(light) })
        #elseif canImport(AppKit)
        self.init(NSColor(name: nil) { $0.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua ? NSColor(dark) : NSColor(light) })
        #else
        self = light
        #endif
    }
}
`;
}

function kotlin(t: PlatformTokens): string {
  const colors = (scheme: "light" | "dark") =>
    Object.entries(t.colors[scheme])
      .map(([k, c]) => `    val ${k} = Color(${argb(c)})`)
      .join("\n");
  const dims = (o: Record<string, number>, unit: string) => Object.entries(o).map(([k, v]) => `    val ${k} = ${v}.${unit}`).join("\n");
  return `${header(t, "//")}

package tesserai

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

object TesseraiLight {
${colors("light")}
}

object TesseraiDark {
${colors("dark")}
}

object TesseraiSpace {
${dims(t.space, "dp")}
}

object TesseraiRadius {
${dims(t.radius, "dp")}
}

object TesseraiFontSize {
${dims(t.fontSize, "sp")}
}

object TesseraiFontFamily {
${Object.entries(t.fontFamily)
  .map(([k, v]) => `    const val ${k} = ${templateSafe(v[0] ?? "")}`)
  .join("\n")}
}
`;
}

function dart(t: PlatformTokens): string {
  const colors = (scheme: "light" | "dark") =>
    Object.entries(t.colors[scheme])
      .map(([k, c]) => `  static const ${k} = Color(${argb(c)});`)
      .join("\n");
  const numbers = (o: Record<string, number>) => Object.entries(o).map(([k, v]) => `  static const ${k} = ${Number.isInteger(v) ? `${v}.0` : v};`).join("\n");
  return `${header(t, "//")}

import 'package:flutter/painting.dart';

abstract final class TesseraiLight {
${colors("light")}
}

abstract final class TesseraiDark {
${colors("dark")}
}

abstract final class TesseraiSpace {
${numbers(t.space)}
}

abstract final class TesseraiRadius {
${numbers(t.radius)}
}

abstract final class TesseraiFontSize {
${numbers(t.fontSize)}
}

abstract final class TesseraiFontFamily {
${Object.entries(t.fontFamily)
  .map(([k, v]) => `  static const ${k} = ${templateSafe(v[0] ?? "")};`)
  .join("\n")}
}
`;
}

// A palette resampled to n steps, lightest first (Mantine wants 10, Chakra 11).
function resample(steps: Rgba[], n: number): Rgba[] {
  const kept = steps.filter((c) => c !== undefined);
  if (kept.length === 0) return [];
  return Array.from({ length: n }, (_, i) => kept[Math.round((i * (kept.length - 1)) / (n - 1))]!);
}

// The meanings MUI, Mantine and Chakra know, by tesserai's default names.
const MUI_ROLES: [string, string][] = [
  ["primary", "primary"],
  ["secondary", "neutral"],
  ["error", "danger"],
  ["warning", "warning"],
  ["info", "info"],
  ["success", "success"],
];

// The body size's index among the type sizes, so libraries' xs…xl can sit around it.
function sizesAroundBody(t: PlatformTokens): number[] {
  const sizes = Object.values(t.fontSize).sort((a, b) => a - b);
  const body = sizes.reduce((best, v, i) => (Math.abs(v - t.bodySize) < Math.abs(sizes[best]! - t.bodySize) ? i : best), 0);
  return [-2, -1, 0, 1, 2].map((d) => sizes[Math.min(sizes.length - 1, Math.max(0, body + d))] ?? t.bodySize);
}

function mui(t: PlatformTokens): string {
  const palette = (scheme: "light" | "dark") => {
    const c = t.colors[scheme];
    const roles = MUI_ROLES.filter(([, intent]) => c[camel([intent, "solid"])] !== undefined).map(
      ([role, intent]) =>
        `      ${role}: { main: "${hex(c[camel([intent, "solid"])]!)}", dark: "${hex(c[camel([intent, "solid-hover"])] ?? c[camel([intent, "solid"])]!)}", contrastText: "${hex(c[camel([intent, "solid-foreground"])] ?? c[camel([intent, "solid"])]!)}" },`,
    );
    const pick = (key: string, fallback: string) => (c[key] === undefined ? fallback : hex(c[key]!));
    return `{
    palette: {
${roles.join("\n")}
      background: { default: "${pick("surfacePage", "#ffffff")}", paper: "${pick("surfaceCard", "#ffffff")}" },
      text: { primary: "${pick("neutralTextStrong", "#111111")}", secondary: "${pick("neutralText", "#555555")}" },
      divider: "${pick("neutralBorder", "#dddddd")}",
    },
  }`;
  };
  const unit = t.space.s1 ?? 4;
  return `${header(t, "//")}

import { createTheme } from "@mui/material/styles";

// Light and dark as color schemes; the \`dark\` class on <html> switches, as in the web build.
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: "class" },
  colorSchemes: {
    light: ${palette("light")},
    dark: ${palette("dark")},
  },
  shape: { borderRadius: ${t.radius.md ?? 6} },
  // MUI's spacing(1) is one step of its scale: two of tesserai's units.
  spacing: ${unit * 2},
  typography: {
    fontFamily: ${JSON.stringify((t.fontFamily.sans ?? ["system-ui"]).join(", "))},
    fontSize: ${t.bodySize},
  },
});
`;
}

// Ant Design's theme: its seed and map tokens from the system's colors, per scheme, and the shared
// shape, type and spacing. Dark is antd's darkAlgorithm with the system's own dark colors over it.
function antd(t: PlatformTokens): string {
  const tokens = (scheme: "light" | "dark") => {
    const c = t.colors[scheme];
    const entries: [string, Rgba | undefined][] = [
      ["colorPrimary", c.primarySolid],
      ["colorError", c.dangerSolid],
      ["colorWarning", c.warningSolid],
      ["colorSuccess", c.successSolid],
      ["colorInfo", c.infoSolid],
      ["colorLink", c.primaryText ?? c.primarySolid],
      ["colorBgBase", c.surfacePage],
      ["colorBgLayout", c.surfacePage],
      ["colorBgContainer", c.surfaceCard],
      ["colorBgElevated", c.surfaceOverlay ?? c.surfaceCard],
      ["colorTextBase", c.neutralTextStrong],
      ["colorTextSecondary", c.neutralText],
      ["colorBorder", c.neutralBorderStrong ?? c.neutralBorder],
      ["colorBorderSecondary", c.neutralBorder],
      ["colorTextLightSolid", c.primarySolidForeground],
    ];
    return entries
      .filter((e): e is [string, Rgba] => e[1] !== undefined)
      .map(([k, v]) => `    ${k}: "${hex(v)}",`)
      .join("\n");
  };
  const shared = [
    `    borderRadius: ${t.radius.md ?? 6},`,
    `    fontFamily: ${JSON.stringify((t.fontFamily.sans ?? ["system-ui"]).join(", "))},`,
    `    fontSize: ${t.bodySize},`,
    `    sizeUnit: ${t.space.s1 ?? 4},`,
  ].join("\n");
  return `${header(t, "//")}

import { theme, type ThemeConfig } from "antd";

// Pass one to ConfigProvider: <ConfigProvider theme={dark ? darkTheme : lightTheme}>.
export const lightTheme: ThemeConfig = {
  token: {
${tokens("light")}
${shared}
  },
};

export const darkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
${tokens("dark")}
${shared}
  },
};
`;
}

function mantine(t: PlatformTokens): string {
  const tuples = Object.entries(t.palettes)
    .map(([, p], index) =>
        `const palette${index}: MantineColorsTuple = [${resample(p.light, 10)
          .map((c) => `"${hex(c)}"`).join(", ")}];`)
    .join("\n");
  const primary = t.intents.primary;
  const brand = primary === undefined ? Object.keys(t.palettes)[0] ?? "blue" : primary.palette;
  const steps = t.palettes[brand]?.light.length ?? 10;
  const shade = Math.min(9, Math.max(0, Math.round(((primary?.solidStep ?? 7) - 1) * (9 / Math.max(1, steps - 1)))));
  const [xs, sm, md, lg, xl] = sizesAroundBody(t);
  const r = t.radius;
  const s = t.space;
  return `${header(t, "//")}

import { createTheme, type MantineColorsTuple } from "@mantine/core";

${tuples}

export const theme = createTheme({
  colors: { ${Object.keys(t.palettes)
    .map((n, index) => `${JSON.stringify(n)}: palette${index}`)
    .join(", ")} },
  primaryColor: "${brand}",
  primaryShade: { light: ${shade}, dark: ${Math.min(9, shade + 1)} },
  white: "${hex(t.colors.light.surfacePage ?? { r: 1, g: 1, b: 1, a: 1 })}",
  black: "${hex(t.colors.light.neutralTextStrong ?? { r: 0, g: 0, b: 0, a: 1 })}",
  fontFamily: ${JSON.stringify((t.fontFamily.sans ?? ["system-ui"]).join(", "))},
  fontFamilyMonospace: ${JSON.stringify((t.fontFamily.mono ?? ["monospace"]).join(", "))},
  headings: { fontFamily: ${JSON.stringify((t.fontFamily.heading ?? t.fontFamily.sans ?? ["system-ui"]).join(", "))} },
  defaultRadius: "md",
  radius: { xs: "${(r.sm ?? 2) / 2}px", sm: "${r.sm ?? 4}px", md: "${r.md ?? 6}px", lg: "${r.lg ?? 8}px", xl: "${r.xl ?? 12}px" },
  spacing: { xs: "${s.s2 ?? 8}px", sm: "${s.s3 ?? 12}px", md: "${s.s4 ?? 16}px", lg: "${s.s5 ?? 20}px", xl: "${s.s6 ?? 24}px" },
  fontSizes: { xs: "${xs}px", sm: "${sm}px", md: "${md}px", lg: "${lg}px", xl: "${xl}px" },
});
`;
}

function chakra(t: PlatformTokens): string {
  const SHADES = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];
  const tokens = Object.entries(t.palettes)
    .map(([name, p]) => `        "${name}": { ${resample(p.light, 11).map((c, i) => `${SHADES[i]}: { value: "${hex(c)}" }`).join(", ")} },`)
    .join("\n");
  const both = (key: string) => {
    const l = t.colors.light[key];
    const d = t.colors.dark[key];
    return l === undefined || d === undefined ? null : `{ value: { _light: "${hex(l)}", _dark: "${hex(d)}" } }`;
  };
  // Chakra's colorPalette slots, from each meaning's roles.
  const SLOTS: [string, string][] = [
    ["solid", "solid"],
    ["contrast", "solid-foreground"],
    ["fg", "text"],
    ["muted", "subtle-hover"],
    ["subtle", "subtle"],
    ["emphasized", "border-strong"],
    ["focusRing", "focus-ring"],
  ];
  const semantic = Object.keys(t.intents)
    .map((intent) => {
      const slots = SLOTS.map(([slot, role]) => {
        const v = both(camel([intent, role]));
        return v === null ? null : `${slot}: ${v}`;
      }).filter((x) => x !== null);
      return `        "${intent}": { ${slots.join(", ")} },`;
    })
    .join("\n");
  const fam = (role: string, fallback: string) => JSON.stringify((t.fontFamily[role] ?? [fallback]).join(", "));
  return `${header(t, "//")}

import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
${tokens}
      },
      radii: { sm: { value: "${t.radius.sm ?? 4}px" }, md: { value: "${t.radius.md ?? 6}px" }, lg: { value: "${t.radius.lg ?? 8}px" }, xl: { value: "${t.radius.xl ?? 12}px" } },
      fonts: { body: { value: ${fam("sans", "system-ui")} }, heading: { value: ${fam("heading", "system-ui")} }, mono: { value: ${fam("mono", "monospace")} } },
    },
    semanticTokens: {
      colors: {
        // Each meaning works as a colorPalette: <Button colorPalette="primary">.
${semantic}
        bg: { DEFAULT: ${both("surfacePage") ?? '{ value: "white" }'}, panel: ${both("surfaceCard") ?? '{ value: "white" }'} },
        fg: { DEFAULT: ${both("neutralTextStrong") ?? '{ value: "black" }'}, muted: ${both("neutralText") ?? '{ value: "gray" }'} },
        border: { DEFAULT: ${both("neutralBorder") ?? '{ value: "gray" }'} },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
`;
}

export function emitPlatform(system: DesignSystem, format: PlatformFormat): string {
  const t = platformTokens(system);
  switch (format) {
    case "scss":
      return scss(t);
    case "ts":
      return ts(t);
    case "panda":
      return panda(t);
    case "stylex":
      return stylex(t);
    case "mui":
      return mui(t);
    case "mantine":
      return mantine(t);
    case "chakra":
      return chakra(t);
    case "antd":
      return antd(t);
    case "swift":
      return swift(t);
    case "kotlin":
      return kotlin(t);
    case "dart":
      return dart(t);
  }
}
