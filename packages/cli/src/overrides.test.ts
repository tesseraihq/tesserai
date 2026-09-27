import { describe, expect, it } from "vitest";
import { readClass, readStyleKey, stylingOf } from "./overrides";

describe("what an override changes", () => {
  it("reads each utility by what it changes, whatever its prefixes", () => {
    const cases: [string, string][] = [
      ["rounded-none", "radius"], ["md:rounded-[6px]", "radius"], ["bg-red-600", "color"], ["hover:bg-red-700", "color"], ["bg-[#ff0000]", "color"],
      ["text-lg", "typography"], ["text-red-600", "color"], ["text-center", "typography"], ["font-black", "typography"], ["uppercase", "typography"],
      ["border", "border"], ["border-2", "border"], ["border-red-500", "color"], ["ring-2", "border"], ["ring-blue-500", "color"],
      ["px-5", "spacing"], ["p-[13px]", "spacing"], ["gap-2", "spacing"], ["h-12", "size"], ["shadow-lg", "shadow"], ["opacity-50", "effects"],
      ["mt-2", "placement"], ["-mt-2", "placement"], ["w-full", "placement"], ["max-w-sm", "placement"], ["flex-1", "placement"], ["hidden", "placement"], ["col-span-2", "placement"],
      ["p-2!", "spacing"], ["!p-2", "spacing"], ["data-[state=open]:bg-accent", "color"], ["group", "ignore"],
    ];
    for (const [cls, kind] of cases) expect(readClass(cls), cls).toBe(kind);
    expect(["borderRadius", "backgroundColor", "padding", "marginTop", "height", "fontWeight", "boxShadow", "opacity", "bgcolor", "p", "m"].map(readStyleKey)).toEqual([
      "radius", "color", "spacing", "placement", "size", "typography", "shadow", "effects", "color", "spacing", "placement",
    ]);
  });

  it("counts a site only for what it changes of the design", () => {
    expect(stylingOf([{ name: "className", value: "mt-4 w-full", quoted: true }])).toBeNull();
    expect(stylingOf([{ name: "className", value: `cn("w-full", busy && "opacity-50")`, quoted: false }])).toEqual({ kinds: ["effects"], classes: ["opacity-50"] });
    expect(stylingOf([{ name: "style", value: "{ borderRadius: 0, marginTop: 8 }", quoted: false }])).toEqual({ kinds: ["radius"], classes: [] });
    expect(stylingOf([{ name: "style", value: "border-radius: 0; margin-top: 4px", quoted: true }])).toEqual({ kinds: ["radius"], classes: [] });
    expect(stylingOf([{ name: ":class", value: "{ 'rounded-full': round, 'mt-2': true }", quoted: true }])!.kinds).toEqual(["radius"]);
  });

  it("calls a value it can't read unknown, and a pass-through nothing", () => {
    expect(stylingOf([{ name: "className", value: "styles.danger", quoted: false }])).toEqual({ kinds: ["unknown"], classes: [] });
    expect(stylingOf([{ name: "style", value: "style", quoted: false }])).toEqual({ kinds: ["unknown"], classes: [] });
    expect(stylingOf([{ name: "className", value: "className", quoted: false }])).toBeNull();
    expect(stylingOf([{ name: "className", value: `cn("rounded-full", className)`, quoted: false }])).toEqual({ kinds: ["radius"], classes: ["rounded-full"] });
  });

  it("reads the strings inside a template literal's ${}, and leaves compared and passed-in strings out", () => {
    expect(stylingOf([{ name: "className", value: "`h-8 ${big ? \"bg-amber-100 text-amber-900\" : \"\"}`", quoted: false }])!.kinds).toEqual(["color", "size"]);
    expect(stylingOf([{ name: "className", value: `clsx("h-10", { "border-destructive": email.length > 0 && !email.includes("@") })`, quoted: false }])!.kinds).toEqual(["color", "size"]);
    expect(stylingOf([{ name: ":class", value: "{ 'bg-accent': view === 'list' }", quoted: true }])!.kinds).toEqual(["color"]);
    // Svelte's class="… {className}" passes the caller's class through; another value is unknown.
    expect(stylingOf([{ name: "class", value: "uppercase min-w-24 {className}", quoted: true }])!.kinds).toEqual(["typography"]);
    expect(stylingOf([{ name: "class", value: "uppercase {tone}", quoted: true }])!.kinds).toEqual(["typography", "unknown"]);
  });
});
