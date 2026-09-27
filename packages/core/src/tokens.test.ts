import { describe, expect, it } from "vitest";
import { Token, TokenGroup, getToken, setToken } from "./tokens";

const px = (value: number) => ({ value, unit: "px" as const });

describe("Token schema", () => {
  it("rejects a malformed reference", () => {
    expect(Token.safeParse({ $type: "dimension", $value: "{space.}" }).success).toBe(false);
    expect(Token.safeParse({ $type: "dimension", $value: "space.4" }).success).toBe(false);
  });

  it("rejects unknown mode axes", () => {
    const result = Token.safeParse({
      $type: "number",
      $value: 1,
      $modes: [{ selector: { platform: "ios" }, value: 2 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a value of the wrong shape for its $type", () => {
    expect(Token.safeParse({ $type: "color", $value: px(4) }).success).toBe(false);
  });
});

describe("TokenGroup", () => {
  const group = {
    space: {
      "1": { $type: "dimension", $value: px(4) },
      "2": { $type: "dimension", $value: px(8) },
    },
    button: { padding: { x: { $type: "dimension", $value: "{space.2}" } } },
  };

  it("rejects names with dots or dollars", () => {
    expect(TokenGroup.safeParse({ "a.b": { $type: "number", $value: 1 } }).success).toBe(false);
    expect(TokenGroup.safeParse({ $meta: { $type: "number", $value: 1 } }).success).toBe(false);
  });

  it("gets and sets by path", () => {
    const parsed = TokenGroup.parse(group);
    expect(getToken(parsed, "space.2")?.$value).toEqual(px(8));
    expect(getToken(parsed, "space")).toBeUndefined();
    expect(getToken(parsed, "nope.nope")).toBeUndefined();
    setToken(parsed, "radius.md", { $type: "dimension", $value: px(6) });
    expect(getToken(parsed, "radius.md")?.$value).toEqual(px(6));
    expect(() => setToken(parsed, "space.1.deeper", { $type: "number", $value: 1 })).toThrow();
  });
});
