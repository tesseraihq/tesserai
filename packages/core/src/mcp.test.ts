import { describe, expect, it } from "vitest";
import { PRESETS } from "./index";
import { Focuses, runReadTool, systemOutline } from "./mcp";

const system = () => PRESETS[0]!.build();

describe("system outline", () => {
  it("covers what a model needs to plan, compactly and deterministically", () => {
    const outline = systemOutline(system(), { kind: "element", component: "button", part: "root", state: "disabled" });
    expect(outline).toContain("- brand:");
    expect(outline).toContain("10 steps");
    expect(outline).toContain("- primary: brand");
    expect(outline).toContain("- button: parts root, label, icon; variant solid|soft");
    expect(outline).toContain("button root (disabled)");
    expect(outline.length).toBeLessThan(6000);
    expect(systemOutline(system())).toBe(systemOutline(system()));
  });
});

describe("read tools", () => {
  it("read tools answer from the system", () => {
    const s = system();
    const explain = runReadTool(s, "explain", { path: "intent.primary.solid" });
    expect(explain.ok && JSON.stringify(explain.data)).toContain("color.brand.7");
    const usage = runReadTool(s, "usage", { path: "color.brand.7" });
    expect(usage.ok && JSON.stringify(usage.data)).toContain("button");
    const contrast = runReadTool(s, "check_contrast", {});
    expect(contrast.ok && JSON.stringify(contrast.data)).toContain('"failing":0');
    expect(runReadTool(s, "get_component", { component: "nope" }).ok).toBe(false);
  });
});

describe("focus", () => {
  it("lists everything the request is about, and refuses anything malformed", () => {
    const system = PRESETS[0]!.build();
    const outline = systemOutline(system, [
      { kind: "element", component: "button", part: "root", variant: "solid", intent: "danger", size: "md" },
      { kind: "component", component: "card" },
      { kind: "section", section: "colors" },
    ]);
    expect(outline).toContain("The user is looking at, or mentioned:\n- button root (solid danger md)\n- card\n- the colors section");
    expect(Focuses.safeParse([{ kind: "section", section: "colors" }]).success).toBe(true);
    expect(Focuses.safeParse([{ kind: "section" }]).success).toBe(false);
    expect(Focuses.safeParse([{ kind: "component", component: "x".repeat(65) }]).success).toBe(false);
    expect(Focuses.safeParse(Array.from({ length: 9 }, () => ({ kind: "section", section: "colors" }))).success).toBe(false);
  });

  it("says what's in the middle of the preview: the one component \"it\" means, or the few it could be", () => {
    const system = PRESETS[0]!.build();
    expect(systemOutline(system, [{ kind: "screen", components: ["calendar"], section: "shape" }])).toContain('- calendar, in the middle of the preview: what "it" or "this" means (the shape section is open in the panel)');
    expect(systemOutline(system, [{ kind: "screen", components: ["badge", "kbd"] }])).toContain("- in the middle of the preview, unclear which: badge, kbd");
    expect(Focuses.safeParse([{ kind: "screen", components: [] }]).success).toBe(false);
    expect(Focuses.safeParse([{ kind: "screen", components: ["a", "b", "c", "d", "e"] }]).success).toBe(false);
  });
});
