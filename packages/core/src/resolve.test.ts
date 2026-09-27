import { describe, expect, it } from "vitest";
import { DEFAULT_MODE } from "./modes";
import { resolveAll, resolveToken, TokenResolveError } from "./resolve";
import { TokenGroup, flattenTokens } from "./tokens";

const px = (value: number) => ({ value, unit: "px" as const });
const blue9 = { l: 0.55, c: 0.2, h: 250 };
const blue3 = { l: 0.9, c: 0.05, h: 250 };

const tokens = flattenTokens(
  TokenGroup.parse({
    color: {
      blue: {
        "3": { $type: "color", $value: blue3 },
        "9": { $type: "color", $value: blue9 },
      },
      text: {
        primary: {
          $type: "color",
          $value: "{color.blue.9}",
          $modes: [{ selector: { colorScheme: "dark" }, value: "{color.blue.3}" }],
        },
      },
    },
    space: { "4": { $type: "dimension", $value: px(16) } },
    button: {
      padding: { x: { $type: "dimension", $value: "{space.4}" } },
      label: { $type: "color", $value: "{color.text.primary}" },
    },
    font: {
      family: { sans: { $type: "fontFamily", $value: ["Inter", "sans-serif"] } },
      size: { "2": { $type: "dimension", $value: px(14) } },
    },
    type: {
      body: {
        $type: "typography",
        $value: {
          fontFamily: "{font.family.sans}",
          fontSize: "{font.size.2}",
          fontWeight: 400,
          lineHeight: 1.5,
        },
      },
    },
    shadow: {
      sm: {
        $type: "shadow",
        $value: [{ offsetX: px(0), offsetY: px(1), blur: px(2), spread: px(0), color: "{color.blue.9}" }],
      },
    },
    broken: {
      missing: { $type: "color", $value: "{color.nope}" },
      a: { $type: "number", $value: "{broken.b}" },
      b: { $type: "number", $value: "{broken.a}" },
      wrongType: { $type: "dimension", $value: "{color.blue.9}" },
    },
  }),
);

describe("resolveToken", () => {
  it("follows a chain and records the path", () => {
    const r = resolveToken(tokens, "button.label", DEFAULT_MODE);
    expect(r.$value).toEqual(blue9);
    expect(r.via).toEqual(["color.text.primary", "color.blue.9"]);
  });

  it("picks the mode value before following references", () => {
    const r = resolveToken(tokens, "button.label", { ...DEFAULT_MODE, colorScheme: "dark" });
    expect(r.$value).toEqual(blue3);
    expect(r.via).toEqual(["color.text.primary", "color.blue.3"]);
  });

  it("resolves composite fields", () => {
    const t = resolveToken(tokens, "type.body", DEFAULT_MODE, "typography");
    expect(t.$value).toEqual({
      fontFamily: ["Inter", "sans-serif"],
      fontSize: px(14),
      fontWeight: 400,
      lineHeight: 1.5,
    });
    const s = resolveToken(tokens, "shadow.sm", DEFAULT_MODE, "shadow");
    expect(s.$value[0]?.color).toEqual(blue9);
  });

  it("reports missing references with the referencing token", () => {
    expect(() => resolveToken(tokens, "broken.missing", DEFAULT_MODE)).toThrow(
      /broken\.missing references color\.nope/,
    );
  });

  it("detects cycles", () => {
    try {
      resolveToken(tokens, "broken.a", DEFAULT_MODE);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(TokenResolveError);
      expect((e as TokenResolveError).code).toBe("cycle");
      expect((e as TokenResolveError).message).toMatch(/broken\.a -> broken\.b -> broken\.a/);
    }
  });

  it("rejects references to a token of another type", () => {
    expect(() => resolveToken(tokens, "broken.wrongType", DEFAULT_MODE)).toThrow(/expected a dimension/);
    expect(() => resolveToken(tokens, "space.4", DEFAULT_MODE, "color")).toThrow(
      /expected a color token but space\.4 is dimension/,
    );
  });
});

describe("resolveAll", () => {
  it("collects every value and every error without throwing", () => {
    const { values, errors } = resolveAll(tokens, DEFAULT_MODE);
    expect(values.size).toBe(tokens.size - 4);
    expect([...errors.keys()].sort()).toEqual(["broken.a", "broken.b", "broken.missing", "broken.wrongType"]);
    expect(errors.get("broken.b")?.code).toBe("cycle");
  });
});
