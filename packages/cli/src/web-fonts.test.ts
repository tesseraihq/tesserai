import { PRESETS, setToken } from "@tesserai/core";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { googleCssUrl, parseGoogleCss, syncWebFonts, webFontCss } from "./web-fonts";

// What Google Fonts answers a modern browser for a variable family: one file per subset, the
// same for every weight asked for (trimmed to two weights and three subsets).
const GOOGLE_CSS = `/* cyrillic */
@font-face {
  font-family: 'Geist';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/geist/v1/cyr.woff2) format('woff2');
  unicode-range: U+0301, U+0400-045F;
}
/* latin-ext */
@font-face {
  font-family: 'Geist';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/geist/v1/ext.woff2) format('woff2');
  unicode-range: U+0100-02BA;
}
/* latin */
@font-face {
  font-family: 'Geist';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/geist/v1/latin.woff2) format('woff2');
  unicode-range: U+0000-00FF;
}
/* latin */
@font-face {
  font-family: 'Geist';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/geist/v1/latin.woff2) format('woff2');
  unicode-range: U+0000-00FF;
}
`;

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "tesserai-webfonts-"));
});
afterEach(() => rm(dir, { recursive: true, force: true }));

describe("web fonts", () => {
  it("reads Google's CSS by subset", () => {
    const faces = parseGoogleCss(GOOGLE_CSS);
    expect(faces.map((f) => `${f.subset} ${f.weight}`)).toEqual(["cyrillic 400", "latin-ext 400", "latin 400", "latin 700"]);
    expect(faces[2]).toMatchObject({ url: "https://fonts.gstatic.com/s/geist/v1/latin.woff2", unicodeRange: "U+0000-00FF", style: "normal" });
    expect(googleCssUrl("IBM Plex Sans")).toBe("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap");
  });

  it("downloads every subset of each family the system names, once each, and writes their CSS", async () => {
    const asked: string[] = [];
    const fetched: string[] = [];
    const options = {
      system: PRESETS[0]!.build(),
      fontsDir: join(dir, "fonts"),
      record: join(dir, "tesserai", "web-fonts.json"),
      fetchText: async (url: string) => (asked.push(url), GOOGLE_CSS),
      fetchBytes: async (url: string) => (fetched.push(url), new Uint8Array([119, 79, 70, 50])),
    };
    const first = await syncWebFonts(options);
    // Geist, the preset's sans; the mono stack is the platform's own, so nothing for it.
    expect(asked).toEqual([googleCssUrl("Geist")]);
    // Cyrillic too (a browser fetches it only for Cyrillic text); the one variable file serves both weights.
    expect(fetched.sort()).toEqual(["https://fonts.gstatic.com/s/geist/v1/cyr.woff2", "https://fonts.gstatic.com/s/geist/v1/ext.woff2", "https://fonts.gstatic.com/s/geist/v1/latin.woff2"]);
    expect(first.faces).toHaveLength(4);
    expect((await readdir(join(dir, "fonts"))).length).toBe(3);
    const css = webFontCss(first.faces);
    expect(css).toContain('font-family: "Geist";');
    expect(css).toMatch(/src: url\("\.\/fonts\/geist-latin-[0-9a-f]{8}\.woff2"\) format\("woff2"\);/);

    // A second sync writes the same CSS from what's recorded, without asking Google again.
    const second = await syncWebFonts(options);
    expect(asked).toHaveLength(1);
    expect(webFontCss(second.faces)).toBe(css);
    expect(JSON.parse(await readFile(options.record, "utf8"))).toHaveProperty("Geist");
  });

  it("reports a family Google doesn't serve, and the stack falls back", async () => {
    const result = await syncWebFonts({
      system: PRESETS[0]!.build(),
      fontsDir: join(dir, "fonts"),
      record: join(dir, "tesserai", "web-fonts.json"),
      fetchText: async () => null,
      fetchBytes: async () => null,
    });
    expect(result).toEqual({ faces: [], written: [], missing: ["Geist"] });
  });
});

// What Google answers for a Korean (or Japanese, Chinese) family: the Latin subsets named in a
// comment, and the rest of the script cut into about a hundred numbered slices with no comment at
// all, each file serving every weight (trimmed to two slices and two weights).
const KOREAN_CSS = `@font-face {
  font-family: 'Noto Sans KR';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/notosanskr/v39/x.0.woff2) format('woff2');
  unicode-range: U+f9ca-fa0b, U+ff03-ff05;
}
@font-face {
  font-family: 'Noto Sans KR';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/notosanskr/v39/x.1.woff2) format('woff2');
  unicode-range: U+ac00-ac2b, U+ac2d-ac47;
}
/* latin */
@font-face {
  font-family: 'Noto Sans KR';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/notosanskr/v39/x.latin.woff2) format('woff2');
  unicode-range: U+0000-00FF;
}
@font-face {
  font-family: 'Noto Sans KR';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/notosanskr/v39/x.0.woff2) format('woff2');
  unicode-range: U+f9ca-fa0b, U+ff03-ff05;
}
@font-face {
  font-family: 'Noto Sans KR';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/notosanskr/v39/x.1.woff2) format('woff2');
  unicode-range: U+ac00-ac2b, U+ac2d-ac47;
}
/* latin */
@font-face {
  font-family: 'Noto Sans KR';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/notosanskr/v39/x.latin.woff2) format('woff2');
  unicode-range: U+0000-00FF;
}
`;

describe("web fonts in other scripts", () => {
  const korean = () => {
    const system = PRESETS[0]!.build();
    setToken(system.tokens, "font.family.sans", { $type: "fontFamily", $value: ["Noto Sans KR", "sans-serif"] });
    return system;
  };

  it("keeps every slice of a Korean family, the unnamed ones too, each with its range", async () => {
    const fetched: string[] = [];
    const result = await syncWebFonts({
      system: korean(),
      fontsDir: join(dir, "fonts"),
      record: join(dir, "tesserai", "web-fonts.json"),
      fetchText: async (url) => (url.includes("Noto") ? KOREAN_CSS : GOOGLE_CSS),
      fetchBytes: async (url) => (fetched.push(url), new Uint8Array([119, 79, 70, 50])),
    });
    expect(fetched.filter((u) => u.includes("notosanskr")).sort()).toEqual(["0", "1", "latin"].map((s) => `https://fonts.gstatic.com/s/notosanskr/v39/x.${s}.woff2`));
    const css = webFontCss(result.faces.filter((f) => f.family === "Noto Sans KR"));
    expect(css).toContain("unicode-range: U+ac00-ac2b, U+ac2d-ac47;");
    // One rule per file: a file that serves every weight says so as a range.
    expect(css.match(/@font-face/g)).toHaveLength(3);
    expect(css).toContain("font-weight: 400 700;");
  });

  it("fetches again for a project synced when only Latin was kept, reusing the files it has", async () => {
    const options = {
      system: PRESETS[0]!.build(),
      fontsDir: join(dir, "fonts"),
      record: join(dir, "tesserai", "web-fonts.json"),
      fetchText: async () => GOOGLE_CSS,
      fetchBytes: async () => new Uint8Array([119, 79, 70, 50]),
    };
    await syncWebFonts(options);
    // The record as the Latin-only CLI wrote it: family → faces, nothing else.
    const record = JSON.parse(await readFile(options.record, "utf8")) as Record<string, unknown>;
    const latinOnly = { Geist: (record["Geist"] as { file: string }[]).filter((f) => !f.file.includes("cyrillic")) };
    await writeFile(options.record, JSON.stringify(latinOnly));
    const again = await syncWebFonts(options);
    expect(again.faces.some((f) => f.file.includes("cyrillic"))).toBe(true);
    expect(again.written.every((f) => f.includes("cyrillic"))).toBe(true);
  });
});
