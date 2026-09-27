import { describe, expect, it } from "vitest";
import { applyChangeset } from "../ops/index";
import { PRESETS } from "../presets";
import { inYourSystem } from "./yours";

const base = () => PRESETS[0]!.build();

describe("in your system", () => {
  it("follows the system as it changes, whichever way a value was set", () => {
    const r = applyChangeset(base(), { ops: [{ op: "component.setStyle", input: { component: "button", part: "root", scope: { kind: "size", name: "md" }, state: "default", property: "height", value: "38px" } }] });
    if (!r.ok) throw new Error(r.error);
    expect(inYourSystem("sizes-scale", r.system)).toMatch(/md 38px.*Inputs differ at md/);
  });
});
