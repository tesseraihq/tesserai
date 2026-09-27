import { flattenTokens } from "./tokens";
import { modeContexts } from "./modes";
import { resolveAll } from "./resolve";
import type { TokenGroup } from "./tokens";
import { z } from "zod";

// The system's own font files (a licensed brand font), by family. The files themselves are stored
// with the account and referred to by content hash; the system says which files make up which
// family, and the CSS gets an @font-face per file.

export const FONT_FORMATS = ["woff2", "woff", "truetype", "opentype"] as const;
export type FontFormat = (typeof FONT_FORMATS)[number];
export const MAX_FONT_BYTES = 1_500_000;

export const FontFile = z
  .object({
    // sha-256 of the file, as the server stores it.
    id: z.string().regex(/^[0-9a-f]{64}$/),
    // "400", or a variable font's range "100 900".
    weight: z.string().regex(/^[1-9]00( [1-9]00)?$/),
    style: z.enum(["normal", "italic"]),
    format: z.enum(FONT_FORMATS),
    // The uploaded file's name, for people.
    name: z.string().min(1).max(120),
  })
  .strict();
export type FontFile = z.infer<typeof FontFile>;

export const CustomFont = z.object({ files: z.array(FontFile).min(1).max(24) }).strict();
export type CustomFont = z.infer<typeof CustomFont>;

export const FontFamilyName = z.string().min(1).max(60).regex(/^[\p{L}\p{N} '._-]+$/u, "letters, digits, spaces and . _ - '");

// What a font file is, from its first bytes; null when it isn't one.
export function fontFormatOf(bytes: Uint8Array): FontFormat | null {
  const tag = String.fromCharCode(...bytes.slice(0, 4));
  if (tag === "wOF2") return "woff2";
  if (tag === "wOFF") return "woff";
  if (tag === "OTTO") return "opentype";
  if (tag === "true" || (bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0)) return "truetype";
  return null;
}

const WEIGHT_WORDS: [RegExp, string][] = [
  [/thin|hairline/i, "100"],
  [/extra[-_ ]?light|ultra[-_ ]?light/i, "200"],
  [/light/i, "300"],
  [/medium/i, "500"],
  [/semi[-_ ]?bold|demi[-_ ]?bold/i, "600"],
  [/extra[-_ ]?bold|ultra[-_ ]?bold/i, "800"],
  [/black|heavy/i, "900"],
  [/bold/i, "700"],
];

// Weight and style from a file name ("Acme-SemiBoldItalic.woff2" is 600 italic); a variable font
// ("Acme[wght].woff2", "Acme-Variable.ttf") covers a range.
export function guessFontFile(name: string): { weight: string; style: "normal" | "italic"; family: string } {
  const base = name.replace(/\.(woff2?|ttf|otf)$/i, "");
  const style = /italic|oblique/i.test(base) ? "italic" : "normal";
  const variable = /\[wght|variable|[-_ ]VF\b/i.test(base);
  const weight = variable ? "100 900" : (WEIGHT_WORDS.find(([re]) => re.test(base))?.[1] ?? "400");
  const family = base
    .replace(/\[.*?\]/g, "")
    .replace(/[-_ ]?(thin|hairline|extra[-_ ]?light|ultra[-_ ]?light|light|regular|book|normal|medium|semi[-_ ]?bold|demi[-_ ]?bold|extra[-_ ]?bold|ultra[-_ ]?bold|bold|black|heavy|italic|oblique|variable|vf)/gi, "")
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  return { weight, style, family: family === "" ? "Custom font" : family };
}

// An @font-face per file of each family; `url` says where a file is served from.
export function fontFaces(fonts: Record<string, CustomFont> | undefined, url: (file: FontFile, family: string) => string): string {
  if (fonts === undefined) return "";
  const faces: string[] = [];
  for (const [family, font] of Object.entries(fonts)) {
    for (const file of font.files) {
      faces.push(
        `@font-face {\n  font-family: "${family.replace(/"/g, "")}";\n  src: url("${url(file, family)}") format("${file.format}");\n  font-weight: ${file.weight};\n  font-style: ${file.style};\n  font-display: swap;\n}`,
      );
    }
  }
  return faces.join("\n");
}

// The file name an export writes a font file under.
export function fontFileName(family: string, file: FontFile): string {
  const ext = { woff2: "woff2", woff: "woff", truetype: "ttf", opentype: "otf" }[file.format];
  const slug = family.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "font";
  return `${slug}-${file.weight.replace(" ", "-")}${file.style === "italic" ? "-italic" : ""}-${file.id.slice(0, 8)}.${ext}`;
}

// Families every platform already has: nothing to load for these.
const LOCAL_FAMILIES = new Set([
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "system-ui",
  "-apple-system",
  "BlinkMacSystemFont",
  "sans-serif",
  "serif",
  "monospace",
  "SFMono-Regular",
  "Menlo",
  "Monaco",
  "Consolas",
  "Georgia",
  "Arial",
  "Helvetica",
  "Helvetica Neue",
  "Times New Roman",
  "Segoe UI",
]);

export const isLocalFamily = (family: string) => LOCAL_FAMILIES.has(family);

// A font role's stack is [the font, fonts for other languages…, the platform's fallbacks]: Inter
// for the Latin letters, then Noto Sans KR for Korean, then system-ui and sans-serif. A browser
// takes each character from the first font that has it, so Korean text gets the Korean font and
// the rest keeps Inter. The designed families are the ones before the first the platform has.
//
// Ways it could go wrong, written before the code (AGENTS.md):
// - A language font set but never installed or previewed: every designed family is loaded, not
//   only the first.
// - A long imported stack ("Söhne, ui-sans-serif, …, Roboto") downloading its tail: only the
//   families before the first platform one count.
// - Choosing a new text font dropping the language fonts: the builder keeps them (store.ts), and
//   type.setLanguageFonts rewrites only what's between the font and its fallbacks.
// - Removing an uploaded font that a stack still uses for a language: refused, as for the first.
export function designedFamilies(stack: readonly string[]): string[] {
  const designed: string[] = [];
  for (const family of stack) {
    if (isLocalFamily(family) || /^(serif|sans-serif|monospace|cursive|fantasy|math|emoji|system-ui)$/i.test(family)) break;
    designed.push(family);
  }
  return designed;
}

// The stack with its fonts for other languages replaced: the first family and the fallbacks stay.
export function withLanguageFonts(stack: readonly string[], languages: readonly string[]): string[] {
  const designed = designedFamilies(stack);
  const first = designed[0];
  if (first === undefined) return [...languages, ...stack];
  return [first, ...languages.filter((f) => f !== first), ...stack.slice(designed.length)];
}

// The families a system asks a web font service for: every designed family of each font role
// (its font and its fonts for other languages), unless it's one of the system's own uploaded
// fonts (those come with the CSS).
export function webFontFamilies(system: { tokens: TokenGroup; fonts?: Record<string, unknown> | undefined }): string[] {
  const own = Object.keys(system.fonts ?? {});
  const families = new Set<string>();
  const flat = flattenTokens(system.tokens);
  for (const context of modeContexts(
    [...flat.values()].flatMap((t) => (t.$modes ?? []).map((m) => m.selector)),
  )) {
    for (const token of resolveAll(flat, context).values.values()) {
      if (token.$type !== "fontFamily") continue;
      for (const family of designedFamilies(token.$value)) if (!own.includes(family)) families.add(family);
    }
  }
  return [...families];
}

// A font stack always ends in a generic family every browser has, so a face still loading (or one
// that never does) falls back to the right kind rather than the browser's default serif. The ui-*
// keywords don't count: only Safari knows them, so ["ui-monospace"] alone is Times in Chrome.
const BROWSER_GENERIC = /^(serif|sans-serif|monospace|cursive|fantasy|math|emoji|system-ui)$/i;
export function withFallback(families: readonly string[], kind?: "sans" | "serif" | "mono"): string[] {
  if (families.some((f) => BROWSER_GENERIC.test(f.trim()))) return [...families];
  const guess =
    kind ??
    (families.some((f) => /mono|code|courier|consol|menlo|monaco/i.test(f))
      ? "mono"
      : families.some((f) => /serif|georgia|times|garamond|playfair|fraunces|merriweather|lora|baskerville/i.test(f) && !/sans/i.test(f))
        ? "serif"
        : "sans");
  return [...families, guess === "mono" ? "monospace" : guess === "serif" ? "serif" : "sans-serif"];
}
