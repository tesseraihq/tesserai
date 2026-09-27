// Google Fonts, read the way the CLI (which downloads the files) and the registry (which points at
// them) both need: the CSS URL for a family, its @font-face rules, and CSS for chosen faces.
export type WebFace = { family: string; style: string; weight: string; unicodeRange?: string; file: string };
export const WEB_FONT_SUBSETS = new Set(["latin", "latin-ext"]);

export function googleCssUrl(family: string): string {
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@400;500;600;700&display=swap`;
}

// The @font-face rules in Google's CSS, with the subset each is for (the comment before it).
export function parseGoogleCss(css: string): { subset: string; style: string; weight: string; url: string; unicodeRange?: string }[] {
  const faces = [];
  for (const m of css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g)) {
    const body = m[2]!;
    const url = /src:\s*url\(([^)]+)\)/.exec(body)?.[1]?.replace(/^['"]|['"]$/g, "");
    if (url === undefined) continue;
    const range = /unicode-range:\s*([^;]+);/.exec(body)?.[1]?.trim();
    faces.push({
      subset: m[1]!,
      style: /font-style:\s*([^;]+);/.exec(body)?.[1]?.trim() ?? "normal",
      weight: /font-weight:\s*([^;]+);/.exec(body)?.[1]?.trim() ?? "400",
      url,
      ...(range === undefined ? {} : { unicodeRange: range }),
    });
  }
  return faces;
}

// The CSS for the downloaded faces; `url` gives each file's address from tesserai.css.
export function webFontCss(faces: WebFace[], url: (file: string) => string = (file) => `./fonts/${file}`, heading = "Web fonts the system names, hosted with the app (downloaded by tesserai from Google Fonts)."): string {
  if (faces.length === 0) return "";
  const rules = faces.map((f) =>
    [
      "@font-face {",
      `  font-family: "${f.family}";`,
      `  font-style: ${f.style};`,
      `  font-weight: ${f.weight};`,
      "  font-display: swap;",
      `  src: url("${url(f.file)}") format("woff2");`,
      ...(f.unicodeRange === undefined ? [] : [`  unicode-range: ${f.unicodeRange};`]),
      "}",
    ].join("\n"),
  );
  return `\n/* ${heading} */\n${rules.join("\n\n")}\n`;
}
