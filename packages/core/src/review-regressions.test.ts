import { describe, expect, it } from "vitest";
import ts from "typescript";
import {
  PRESETS,
  applyChangeset,
  prepareSystem,
  getToken,
  setToken,
  emitPlatform,
  emitBlocks,
  webFontFamilies,
  diffSystems,
  parseBundle,
} from "./index";
const system = () => PRESETS[0]!.build();

describe("untrusted data and mode regressions", () => {
  it.each(["__proto__.reviewPolluted", "constructor.prototype.reviewPolluted"])(
    "rejects unsafe token path %s without mutating prototypes",
    (path) => {
      try {
        expect(
          applyChangeset(system(), {
            ops: [{ op: "token.add", input: { path, type: "number", value: 7 } }],
          }).ok,
        ).toBe(false);
        expect(Object.hasOwn(Object.prototype, "reviewPolluted")).toBe(false);
        expect(() => setToken({}, path, { $type: "number", $value: 7 })).toThrow();
      } finally {
        delete (Object.prototype as Record<string, unknown>).reviewPolluted;
      }
    },
  );
  it("rejects prototype-sensitive generator targets at import", () => {
    const s = system();
    s.generators.bad = { ...s.generators.space!, target: "__proto__.injected" };
    expect(parseBundle(s).ok).toBe(false);
  });
  it.each(["\n", "\r", "\u2028", "\u2029"])(
    "keeps metadata inert across line separator %j",
    (newline) => {
      const s = system();
      s.name = `Name${newline}globalThis.injected = true; //`;
      const out = ts.transpileModule(emitPlatform(s, "ts"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS },
      }).outputText;
      const context: Record<string, unknown> = {};
      new Function("exports", "globalThis", out)({}, context);
      expect(context.injected).toBeUndefined();
    },
  );
  it("emits valid distinct Mantine identifiers for reserved and colliding palette names", () => {
    const r = applyChangeset(system(), {
      ops: ["class", "foo-bar", "foo--bar"].map((name) => ({
        op: "palette.add",
        input: { name, color: "#336699" },
      })),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const out = emitPlatform(r.system, "mantine");
    expect(ts.transpileModule(out, { reportDiagnostics: true }).diagnostics).toEqual([]);
    const names = [...out.matchAll(/const (\w+): MantineColorsTuple/g)].map((m) => m[1]);
    expect(new Set(names).size).toBe(names.length);
  });
  it("orders emitted overlapping modes by resolver precedence", () => {
    const out = emitBlocks({
      x: {
        $type: "number",
        $value: 0,
        $modes: [
          { selector: { density: "compact" }, value: 1 },
          { selector: { colorScheme: "dark" }, value: 2 },
        ],
      },
    });
    const both = out.modes.filter(
      (m) =>
        (m.selector.density === undefined || m.selector.density === "compact") &&
        (m.selector.colorScheme === undefined || m.selector.colorScheme === "dark"),
    );
    expect(both.flatMap((m) => m.decls).at(-1)?.value).toBe("1");
  });
  it("validates references outside default density", () => {
    const s = system();
    getToken(s.tokens, "opacity.disabled")!.$modes = [
      { selector: { density: "compact" }, value: "{missing.compact}" },
    ];
    expect(prepareSystem(s).problems.join(" ")).toContain("missing.compact");
  });
  it("discovers fonts used only by a brand", () => {
    const s = system();
    setToken(s.tokens, "font.family.sans", {
      $type: "fontFamily",
      $value: ["Inter"],
      $modes: [{ selector: { brand: "special" }, value: ["Fraunces"] }],
    });
    expect(webFontFamilies(s)).toContain("Fraunces");
  });
  it("includes pages and other persisted settings in version differences", () => {
    const s = system();
    expect(diffSystems(s, { ...s, pages: {} }).other).toContain("pages");
    expect(diffSystems(s, { ...s, excluded: ["button"] }).other).toContain("excluded");
  });
});
it("emits the combined context when one mode switches an alias to another mode-sensitive token", () => {
  const out = emitBlocks({
    base: { $type: "number", $value: 1, $modes: [{ selector: { colorScheme: "dark" }, value: 2 }] },
    alternate: {
      $type: "number",
      $value: 3,
      $modes: [{ selector: { colorScheme: "dark" }, value: 4 }],
    },
    x: {
      $type: "number",
      $value: "{base}",
      $modes: [{ selector: { density: "compact" }, value: "{alternate}" }],
    },
  });
  const combined = out.modes.find(
    (m) => m.selector.colorScheme === "dark" && m.selector.density === "compact",
  );
  expect(combined?.decls.find((d) => d.name === "--x")?.value).toBe("4");
});
it("emits an explicit reset when a more specific mode returns to the default value", () => {
  const out = emitBlocks({
    x: {
      $type: "number",
      $value: 1,
      $modes: [
        { selector: { colorScheme: "dark" }, value: 2 },
        { selector: { colorScheme: "dark", density: "compact" }, value: 1 },
      ],
    },
  });
  expect(
    out.modes
      .find((m) => m.selector.colorScheme === "dark" && m.selector.density === "compact")
      ?.decls.find((d) => d.name === "--x")?.value,
  ).toBe("1");
});
