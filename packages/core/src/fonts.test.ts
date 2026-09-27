import { describe, expect, it } from "vitest";
import { fontFaces, fontFileName, fontFormatOf, guessFontFile } from "./fonts";
import { applyChangeset } from "./ops";
import { PRESETS } from "./presets";
import { systemCss } from "./emit-tailwind";

const id = "a".repeat(64);

describe("the system's own fonts", () => {
  it("tells font files by their first bytes", () => {
    const bytes = (s: string) => new Uint8Array([...s].map((c) => c.charCodeAt(0)));
    expect(fontFormatOf(bytes("wOF2...."))).toBe("woff2");
    expect(fontFormatOf(bytes("wOFF...."))).toBe("woff");
    expect(fontFormatOf(bytes("OTTO...."))).toBe("opentype");
    expect(fontFormatOf(new Uint8Array([0, 1, 0, 0, 9]))).toBe("truetype");
    expect(fontFormatOf(bytes("<svg"))).toBeNull();
  });

  it("guesses weight, style and family from file names", () => {
    expect(guessFontFile("AcmeSans-SemiBoldItalic.woff2")).toEqual({ weight: "600", style: "italic", family: "Acme Sans" });
    expect(guessFontFile("acme_sans_regular.ttf")).toEqual({ weight: "400", style: "normal", family: "acme sans" });
    expect(guessFontFile("AcmeSans[wght].woff2")).toMatchObject({ weight: "100 900", family: "Acme Sans" });
    expect(guessFontFile("Acme-Black.otf").weight).toBe("900");
  });

  it("writes an @font-face per file, after the theme, and refuses removing a font in use", () => {
    const font = { files: [{ id, weight: "400", style: "normal" as const, format: "woff2" as const, name: "Acme-Regular.woff2" }] };
    const added = applyChangeset(PRESETS[0]!.build(), {
      ops: [
        { op: "fonts.add", input: { family: "Acme Sans", font } },
        { op: "type.setFont", input: { role: "sans", families: ["Acme Sans", "ui-sans-serif", "sans-serif"] } },
      ],
    });
    if (!added.ok) throw new Error(added.error);
    const css = systemCss(added.system);
    expect(css.indexOf("@font-face")).toBeGreaterThan(css.indexOf("@theme"));
    expect(css).toContain(`src: url("/api/fonts/${id}") format("woff2");`);
    expect(systemCss(added.system, { fontUrl: (f, family) => `./fonts/${fontFileName(family, f)}` })).toContain(`./fonts/acme-sans-400-aaaaaaaa.woff2`);
    expect(applyChangeset(added.system, { ops: [{ op: "fonts.remove", input: { family: "Acme Sans" } }] })).toMatchObject({ ok: false });
    expect(fontFaces(undefined, () => "")).toBe("");
  });
});

describe("font stacks", () => {
  it("always end in a generic every browser has", async () => {
    const { withFallback } = await import("./fonts");
    // ui-monospace is Safari's alone: in Chrome that stack was Times.
    expect(withFallback(["ui-monospace"])).toEqual(["ui-monospace", "monospace"]);
    expect(withFallback(["Berkeley Mono"])).toEqual(["Berkeley Mono", "monospace"]);
    expect(withFallback(["Inter Variable"])).toEqual(["Inter Variable", "sans-serif"]);
    expect(withFallback(["Fraunces"])).toEqual(["Fraunces", "serif"]);
    expect(withFallback(["Geist", "sans-serif"])).toEqual(["Geist", "sans-serif"]);
    expect(withFallback(["ui-monospace"], "sans")).toEqual(["ui-monospace", "sans-serif"]);
  });
});
