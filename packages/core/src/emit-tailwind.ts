import { cssVarName, cssVarRef } from "./css-names";
import { emitBlocks, formatBlock, type Decl } from "./emit-css";
import type { IntentDef } from "./intents";
import { fontFaces, type FontFile } from "./fonts";
import type { FontMetricsTable } from "./font-metrics";
import { iconSettings } from "./icons";
import { outputTokens, type DesignSystem } from "./system";
import { shadcnExportPaths } from "./import/shadcn";
import { getToken, type TokenGroup } from "./tokens";

// Numeric utilities share this unit with the scanner; the token spacing base is independent.
export const TAILWIND_SPACING_REM = 0.25;

export type TailwindOptions = {
  intents: Record<string, IntentDef>;
  // Token step used to derive density ratios; numeric utilities keep a 0.25rem base unit.
  spacingUnit?: string;
  // Omit `@import "tailwindcss"` when the output is imported from a stylesheet that already has it.
  includeImport?: boolean;
  // Line weight for stroke icons (Lucide, Tabler); 2 is theirs.
  iconStroke?: number;
  // A Tailwind class prefix (see tailwind-prefix.ts): classes are written acme:bg-primary.
  prefix?: string;
  // loadFontMetrics()'s table: web fonts get fallback faces sized to match them, so text doesn't
  // jump when they load. Without it the CSS is what it always was.
  fontMetrics?: FontMetricsTable;
};

// shadcn's color names stay available (bg-background, text-muted-foreground, bg-sidebar…) so
// existing shadcn code, blocks and examples keep working, each read from the token the importer
// maps that variable to. Only tokens the system has: without a danger meaning, no destructive.
export function shadcnAliases(group: TokenGroup): Decl[] {
  return shadcnExportPaths()
    .filter(([name, path]) => !name.startsWith("chart-") && getToken(group, path) !== undefined)
    .map(([name, path]) => ({ name: `--color-${name}`, value: cssVarRef(path) }));
}

// bg-chart-1, fill-chart-2… for the chart series colors, as shadcn's theme provides.
function chartAliases(group: TokenGroup): Decl[] {
  const decls: Decl[] = [];
  for (let n = 1; getToken(group, `chart.${n}`)?.$type === "color"; n++) decls.push({ name: `--color-chart-${n}`, value: cssVarRef(`chart.${n}`) });
  return decls;
}

export function emitTailwind(group: TokenGroup, options: TailwindOptions): string {
  const { base, modes, fallbackFaces } = emitBlocks(group, options.fontMetrics);
  // Tailwind's numeric utilities (gap-2, h-10, size-4) derive from --spacing, sizes as well as
  // spacing, so it stays Tailwind's 0.25rem and follows only density: a 2px unit would otherwise
  // halve every icon, row and popover (and the app's own p-4). The unit sets the space tokens.
  const unitPath = options.spacingUnit ?? "space.2";
  const unit = getToken(group, unitPath)?.$type === "dimension" ? cssVarName(unitPath) : undefined;
  const spacing = unit === undefined ? [] : [{ name: "--spacing", value: `${TAILWIND_SPACING_REM}rem` }];
  // In a density block, the unit's step there over its step at the base.
  const baseUnit = remOf(base.find((d) => d.name === unit)?.value);
  const densitySpacing = (decls: Decl[]): Decl[] => {
    const ratio = remOf(decls.find((d) => d.name === unit)?.value) / baseUnit;
    return Number.isFinite(ratio) && ratio > 0 ? [{ name: "--spacing", value: `${+(TAILWIND_SPACING_REM * ratio).toFixed(4)}rem` }] : [];
  };
  // Straight from the tokens: shadcn's names are @theme inline, so they aren't variables to read.
  const pageColor = getToken(group, "surface.page") === undefined ? "Canvas" : cssVarRef("surface.page");
  const textColor = getToken(group, "intent.neutral.text-strong") === undefined ? "CanvasText" : cssVarRef("intent.neutral.text-strong");
  const durations = base.filter((d) => d.name.startsWith("--duration-")).map((d) => d.name);
  // A density block (also set below <html>: a compact table in a comfortable page) scales
  // --spacing with it; a dark block also switches the browser's own controls.
  const modeDecls = (m: { css: string; decls: Decl[] }): Decl[] => [
    ...m.decls,
    ...(m.css.includes("data-density") ? densitySpacing(m.decls) : []),
    ...(m.css.includes(".dark") ? [{ name: "color-scheme", value: "dark" }] : []),
  ];

  // With a prefix, Tailwind renames every theme variable (--acme-color-primary), which would
  // leave the mode blocks and the components' own var() references pointing at nothing. So the
  // tokens stay plain variables under their own names, and an inline theme maps each utility to
  // them: acme:bg-primary reads var(--color-primary), as bg-primary does without one.
  const prefix = options.prefix;
  const theme =
    prefix === undefined
      ? // static: every token is a variable, used by a utility or not, so tokens read from JavaScript
        // (chart colors, a toast's width) or from your own CSS always exist.
        [formatBlock("@theme static", [...spacing, ...base])]
      : [
          formatBlock(":root", [...spacing, ...base]),
          // Breakpoints go in as values: Tailwind writes them into media queries (md:block is
          // @media (width >= 48rem)), where var() never resolves, so every responsive class would
          // stay off. They don't change with a mode, so nothing is lost.
          formatBlock("@theme inline", [...spacing, ...base].map((d) => ({ name: d.name, value: d.name.startsWith("--breakpoint-") ? d.value : `var(${d.name})` }))),
          // Tailwind's base styles take the system's fonts, as they do without a prefix.
          formatBlock("@theme", [
            ...(getToken(group, "font.family.sans") === undefined ? [] : [{ name: "--default-font-family", value: cssVarRef("font.family.sans") }]),
            ...(getToken(group, "font.family.mono") === undefined ? [] : [{ name: "--default-mono-font-family", value: cssVarRef("font.family.mono") }]),
          ]),
        ];
  const tailwindImport = prefix === undefined ? '@import "tailwindcss";' : `@import "tailwindcss" prefix(${prefix});`;

  return (
    [
      [...(options.includeImport === false ? [] : [tailwindImport]), "@custom-variant dark (&:is(.dark *));"].join("\n"),
      ...theme,
      formatBlock("@theme inline", [...shadcnAliases(group), ...chartAliases(group)]),
      MOTION_THEME,
      // Icon line weight, for the stroke libraries' icons (Lucide and Tabler draw with strokes).
      ...(options.iconStroke === undefined || options.iconStroke === 2 ? [] : [`@layer base {\n  svg.lucide, svg.tabler-icon {\n    stroke-width: ${options.iconStroke};\n  }\n}`]),
      // The page's own colors and the browser's controls (scrollbars, inputs) follow the scheme,
      // with or without shadcn's base styles in the project.
      `@layer base {\n  :root {\n    color-scheme: light;\n  }\n  body {\n    background-color: ${pageColor};\n    color: ${textColor};\n  }\n}`,
      // Motion that people have asked their system to reduce: every tesserai animation and
      // transition reads these durations.
      ...(durations.length === 0 ? [] : [`@media (prefers-reduced-motion: reduce) {\n  :root {\n${durations.map((d) => `    ${d}: 0ms;`).join("\n")}\n  }\n}`]),
      ...modes.map((m) => formatBlock(m.css, modeDecls(m))),
      ...(fallbackFaces === "" ? [] : [fallbackFaces]),
    ].join("\n\n") + "\n"
  );
}

// A length in rem ("0.75rem", "12px"); NaN for anything else (a var(), a calc()).
function remOf(value: string | undefined): number {
  const m = /^(-?[\d.]+)(rem|px)$/.exec(value ?? "");
  return m === null ? NaN : m[2] === "px" ? Number(m[1]) / 16 : Number(m[1]);
}

// Enter and exit animations driven by the motion tokens, for primitives that animate mount and
// unmount through data attributes (Radix) rather than starting-style transitions.
const MOTION_THEME = `@theme {
  --animate-enter: tesserai-enter var(--duration-base) var(--ease-enter);
  --animate-exit: tesserai-exit var(--duration-fast) var(--ease-exit);
  --animate-fade-in: tesserai-fade-in var(--duration-base) var(--ease-enter);
  --animate-fade-out: tesserai-fade-out var(--duration-fast) var(--ease-exit);
  /* Panels that slide in from an edge (sheets, drawers) set --tesserai-slide-from, e.g. 100% 0. */
  --animate-slide-in: tesserai-slide-in var(--duration-slow) var(--ease-enter);
  --animate-slide-out: tesserai-slide-out var(--duration-base) var(--ease-exit);
  /* Regions that open to their measured height (Radix accordion, collapsible) set --tesserai-expand-height. */
  --animate-expand: tesserai-expand var(--duration-base) var(--ease-standard);
  --animate-collapse: tesserai-collapse var(--duration-base) var(--ease-standard);
  @keyframes tesserai-enter {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes tesserai-exit {
    from { opacity: 1; transform: scale(1); }
    to { opacity: 0; transform: scale(0.95); }
  }
  @keyframes tesserai-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes tesserai-fade-out {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  @keyframes tesserai-slide-in {
    from { translate: var(--tesserai-slide-from, 0 100%); }
    to { translate: 0 0; }
  }
  @keyframes tesserai-expand {
    from { height: 0; }
    to { height: var(--tesserai-expand-height, auto); }
  }
  @keyframes tesserai-collapse {
    from { height: var(--tesserai-expand-height, auto); }
    to { height: 0; }
  }
  @keyframes tesserai-slide-out {
    from { translate: 0 0; }
    to { translate: var(--tesserai-slide-from, 0 100%); }
  }
}`;

// The CSS a system's code imports: its tokens as a Tailwind theme, with its icon weight.
// `fontUrl: null` leaves out the system's own (uploaded) fonts: they're served only to their account.
export function systemCss(system: DesignSystem, options: Pick<TailwindOptions, "includeImport" | "prefix" | "fontMetrics"> & { fontUrl?: ((file: FontFile, family: string) => string) | null } = {}): string {
  const icons = iconSettings(system);
  const { fontUrl, ...rest } = options;
  // The system's own fonts: served by the account in the builder, as files beside the CSS in a project.
  const faces = fontUrl === null ? "" : fontFaces(system.fonts, fontUrl ?? ((file) => `/api/fonts/${file.id}`));
  const css = emitTailwind(outputTokens(system), { intents: system.intents, ...rest, ...(icons.library === "lucide" || icons.library === "tabler" ? { iconStroke: icons.stroke } : {}) });
  // After everything else: an @import has to come first in a stylesheet.
  return faces === "" ? css : `${css}\n${faces}\n`;
}
