import { googleCssUrl, parseGoogleCss, webFontCss, webFontFamilies, type DesignSystem, type WebFace } from "@tesserai/core";

// Shared with the builder's registry, which points at Google's files instead of downloading them.
export { googleCssUrl, parseGoogleCss, webFontCss, type WebFace };
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Fonts the system names from Google Fonts (Inter, Geist, Fraunces…), downloaded into the project
// beside tesserai.css so it hosts them itself: they load in any build, offline, and the app never
// asks Google for anything. The builder's preview loads the same families from Google Fonts, so
// what's installed looks like what was designed. Every subset Google serves (core's web-fonts.ts
// says why), in the four weights the builder previews; a family Google doesn't serve is reported
// and the stack falls back.

// Which faces were downloaded, kept in tesserai/web-fonts.json so a sync writes the same CSS
// without asking Google again. "$subsets": "all" marks a record made keeping every subset; one
// without it (the CLI before 0.2.2 kept Latin only) is fetched again, reusing the files it has.
type Record_ = Record<string, WebFace[]>;
const ALL = "$subsets";

export type FetchText = (url: string) => Promise<string | null>;
export type FetchBytes = (url: string) => Promise<Uint8Array | null>;

// Google serves woff2 by the browser it's asked by.
const BROWSER = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const fetchText: FetchText = async (url) => {
  const res = await fetch(url, { headers: { "user-agent": BROWSER } });
  return res.ok ? res.text() : null;
};
const fetchBytes: FetchBytes = async (url) => {
  const res = await fetch(url);
  return res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
};

const slug = (family: string) => family.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// Downloads what's missing (unless `dryRun`) and returns every face the system's families have,
// for the CSS. `record` is tesserai/web-fonts.json; `fontsDir` is fonts/ beside tesserai.css.
export async function syncWebFonts(options: {
  system: DesignSystem;
  fontsDir: string;
  record: string;
  dryRun?: boolean;
  fetchText?: FetchText;
  fetchBytes?: FetchBytes;
}): Promise<{ faces: WebFace[]; written: string[]; missing: string[] }> {
  const families = webFontFamilies(options.system);
  let saved: Record_ = {};
  let stale = false;
  try {
    const read = JSON.parse(await readFile(options.record, "utf8")) as Record<string, unknown>;
    stale = read[ALL] !== "all";
    const { [ALL]: _, ...families } = read;
    saved = families as Record_;
  } catch {
    // None downloaded yet.
  }
  const next: Record_ = {};
  const written: string[] = [];
  const missing: string[] = [];
  for (const family of families) {
    const known = stale ? undefined : saved[family];
    if (known !== undefined && (await Promise.all(known.map((f) => exists(join(options.fontsDir, f.file))))).every(Boolean)) {
      next[family] = known;
      continue;
    }
    if (options.dryRun) continue;
    const css = await (options.fetchText ?? fetchText)(googleCssUrl(family)).catch(() => null);
    const parsed = css === null ? [] : parseGoogleCss(css);
    if (parsed.length === 0) {
      missing.push(family);
      continue;
    }
    await mkdir(options.fontsDir, { recursive: true });
    const byUrl = new Map<string, string>();
    const faces: WebFace[] = [];
    let failed = false;
    for (const face of parsed) {
      let file = byUrl.get(face.url);
      if (file === undefined) {
        // A variable font is one file for every weight: fetched once.
        // Named as before for a named subset, so a project's Latin files are kept, not fetched again.
        file = `${slug(family)}-${face.subset ?? "part"}-${createHash("sha256").update(face.url).digest("hex").slice(0, 8)}.woff2`;
        if (!(await exists(join(options.fontsDir, file)))) {
          const bytes = await (options.fetchBytes ?? fetchBytes)(face.url).catch(() => null);
          if (bytes === null) {
            failed = true;
            break;
          }
          await writeFile(join(options.fontsDir, file), bytes);
          written.push(file);
        }
        byUrl.set(face.url, file);
      }
      faces.push({ family, style: face.style, weight: face.weight, file, ...(face.unicodeRange === undefined ? {} : { unicodeRange: face.unicodeRange }) });
    }
    if (failed) missing.push(family);
    else next[family] = faces;
  }
  if (!options.dryRun && (stale || JSON.stringify(next) !== JSON.stringify(saved))) {
    await mkdir(join(options.record, ".."), { recursive: true });
    await writeFile(options.record, `${JSON.stringify({ [ALL]: "all", ...next }, null, 2)}\n`, "utf8");
  }
  return { faces: Object.values(next).flat(), written, missing };
}
