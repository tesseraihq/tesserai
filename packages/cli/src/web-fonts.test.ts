import { PRESETS } from "@tesserai/core";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
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

  it("downloads the Latin files of each family the system names, once each, and writes their CSS", async () => {
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
    // Cyrillic left out; the one variable file serves both weights.
    expect(fetched.sort()).toEqual(["https://fonts.gstatic.com/s/geist/v1/ext.woff2", "https://fonts.gstatic.com/s/geist/v1/latin.woff2"]);
    expect(first.faces).toHaveLength(3);
    expect((await readdir(join(dir, "fonts"))).length).toBe(2);
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
