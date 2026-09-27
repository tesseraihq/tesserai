import { isLocalFamily } from "./fonts";

// Fallback faces sized to match a web font, so text doesn't jump when the font arrives (the
// technique behind Next.js's adjustFontFallback and fontaine). Until "Inter" loads, the page shows
// "Inter Fallback": Arial, scaled so its letters take Inter's width and its line box Inter's height.
// The metrics are a table of every Google Font the builder offers (font-metrics-data.ts, ~24 KB
// gzipped), loaded on its own so nothing that doesn't write a stylesheet carries it.

export type FontMetrics = { unitsPerEm: number; ascent: number; descent: number; lineGap: number; xWidthAvg: number };
// Keyed by family name in lower case: stacks are written by people, and CSS matches without case.
export type FontMetricsTable = ReadonlyMap<string, FontMetrics>;

export function fontMetricsTable(rows: readonly (readonly [string, number, number, number, number, number])[]): FontMetricsTable {
  return new Map(rows.map(([family, unitsPerEm, ascent, descent, lineGap, xWidthAvg]) => [family.toLowerCase(), { unitsPerEm, ascent, descent, lineGap, xWidthAvg }]));
}

let loading: Promise<FontMetricsTable> | null = null;
export function loadFontMetrics(): Promise<FontMetricsTable> {
  return (loading ??= import("./font-metrics-data").then((m) => fontMetricsTable(m.FONT_METRICS)));
}

// The local font a fallback is drawn from, by the kind of stack it's in (its generic family): the
// ones Next.js uses, since every desktop has them. Where a platform doesn't (Linux, Android),
// local() finds nothing and the stack carries on to its next family as before.
const LOCAL_FALLBACK = { sans: "Arial", serif: "Times New Roman", mono: "Courier New" } as const;
const LOCAL_FALLBACKS = new Set(Object.values(LOCAL_FALLBACK).map((f) => f.toLowerCase()));

export function fallbackKind(stack: readonly string[]): keyof typeof LOCAL_FALLBACK {
  for (const f of stack) {
    const generic = f.trim().toLowerCase();
    if (generic === "serif") return "serif";
    if (generic === "monospace") return "mono";
    if (generic === "sans-serif") return "sans";
  }
  return "sans";
}

// The overrides, as percentages, as Next.js computes them: scaled so the average lowercase letter is
// as wide as the web font's, then the web font's ascent, descent and line gap at that scale.
export function fallbackOverrides(font: FontMetrics, local: FontMetrics) {
  const sizeAdjust = font.xWidthAvg / font.unitsPerEm / (local.xWidthAvg / local.unitsPerEm);
  const pct = (units: number) => Math.abs(units / font.unitsPerEm / sizeAdjust) * 100;
  return { ascent: pct(font.ascent), descent: pct(font.descent), lineGap: pct(font.lineGap), sizeAdjust: sizeAdjust * 100 };
}

// What the CSS emitter uses while it writes stacks: the fallback name to put after a family (and
// a note of it), then the @font-face rules for every one it named. Families the table doesn't
// know, platform fonts and the local fallbacks themselves get none, so their stacks are unchanged.
export function fallbackCollector(table: FontMetricsTable) {
  const named = new Map<string, { family: string; local: string; font: FontMetrics; metrics: FontMetrics }>();
  return {
    name(family: string, stack: readonly string[]): string | undefined {
      const key = family.toLowerCase();
      const font = table.get(key);
      if (font === undefined || isLocalFamily(family) || LOCAL_FALLBACKS.has(key)) return undefined;
      // One face per family: the first stack it's in picks the local font (a family in both a sans
      // and a mono stack is rare, and it's the same web font either way).
      if (!named.has(key)) {
        const local = LOCAL_FALLBACK[fallbackKind(stack)];
        const metrics = table.get(local.toLowerCase());
        if (metrics === undefined) return undefined;
        named.set(key, { family, local, font, metrics });
      }
      return `${named.get(key)!.family} Fallback`;
    },
    faces(): string {
      return [...named.values()]
        .map(({ family, local, font, metrics }) => {
          const o = fallbackOverrides(font, metrics);
          return `@font-face {\n  font-family: ${JSON.stringify(`${family} Fallback`)};\n  src: local(${JSON.stringify(local)});\n  ascent-override: ${o.ascent.toFixed(2)}%;\n  descent-override: ${o.descent.toFixed(2)}%;\n  line-gap-override: ${o.lineGap.toFixed(2)}%;\n  size-adjust: ${o.sizeAdjust.toFixed(2)}%;\n}`;
        })
        .join("\n");
    },
  };
}
export type FallbackCollector = ReturnType<typeof fallbackCollector>;
