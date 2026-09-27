// Google Fonts, read the way the CLI (which downloads the files) and the registry (which points at
// them) both need: the CSS URL for a family, its @font-face rules, and CSS for chosen faces.
//
// Every subset Google serves is kept, each with its unicode-range: a browser downloads only the
// files for characters a page actually has, so Latin text costs what it did, and Korean, Japanese
// or Cyrillic text in the system's font shows in that font instead of a fallback.
//
// Ways it could go wrong, written before the code (AGENTS.md):
// - Korean, Japanese or Chinese text in the system's font falling back: Google cuts those scripts
//   into about a hundred numbered slices with no subset comment; every face is kept, named or not.
// - A page downloading megabytes it doesn't show: each face keeps its unicode-range.
// - Five hundred rules for one variable CJK family (a file per slice, repeated per weight): one
//   rule per file, its weights as a range.
export type WebFace = { family: string; style: string; weight: string; unicodeRange?: string; file: string };

export function googleCssUrl(family: string): string {
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@400;500;600;700&display=swap`;
}

// The @font-face rules in Google's CSS, with the subset each is for when a comment names it (the
// numbered slices of a Korean or Japanese family have none).
export function parseGoogleCss(css: string): { subset?: string; style: string; weight: string; url: string; unicodeRange?: string }[] {
  const faces = [];
  for (const m of css.matchAll(/(?:\/\*\s*([\w-]+)\s*\*\/\s*)?@font-face\s*\{([^}]*)\}/g)) {
    const body = m[2]!;
    const url = /src:\s*url\(([^)]+)\)/.exec(body)?.[1]?.replace(/^['"]|['"]$/g, "");
    if (url === undefined) continue;
    const range = /unicode-range:\s*([^;]+);/.exec(body)?.[1]?.trim();
    faces.push({
      ...(m[1] === undefined ? {} : { subset: m[1] }),
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
  // A variable file serves every weight: one rule, its weights as a range.
  const byFile = new Map<string, WebFace & { weights: number[] }>();
  for (const f of faces) {
    const key = [f.family, f.style, f.file, f.unicodeRange ?? ""].join("\u0000");
    const weight = Number(f.weight);
    const seen = byFile.get(key);
    if (seen === undefined) byFile.set(key, { ...f, weights: Number.isFinite(weight) ? [weight] : [] });
    else if (Number.isFinite(weight)) seen.weights.push(weight);
  }
  const weightOf = (f: WebFace & { weights: number[] }) => {
    if (f.weights.length < 2) return f.weight;
    const lo = Math.min(...f.weights);
    const hi = Math.max(...f.weights);
    return lo === hi ? String(lo) : `${lo} ${hi}`;
  };
  const rules = [...byFile.values()].map((f) =>
    [
      "@font-face {",
      `  font-family: "${f.family}";`,
      `  font-style: ${f.style};`,
      `  font-weight: ${weightOf(f)};`,
      "  font-display: swap;",
      `  src: url("${url(f.file)}") format("woff2");`,
      ...(f.unicodeRange === undefined ? [] : [`  unicode-range: ${f.unicodeRange};`]),
      "}",
    ].join("\n"),
  );
  return `\n/* ${heading} */\n${rules.join("\n\n")}\n`;
}
