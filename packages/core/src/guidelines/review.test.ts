import { describe, expect, it } from "vitest";
import { applyChangeset } from "../ops/index";
import { PRESETS } from "../presets";
import type { DesignSystem } from "../system";
import { reviewChange } from "./review";

const base = () => PRESETS[0]!.build();
function after(ops: { op: string; input: unknown }[], from: DesignSystem = base()): DesignSystem {
  const r = applyChangeset(from, { ops });
  if (!r.ok) throw new Error(r.error);
  return r.system;
}
const set = (path: string, value: string) => ({ op: "token.set", input: { path, value } });
const ids = (before: DesignSystem, next: DesignSystem) => reviewChange(before, next).map((n) => n.guideline);

describe("reviewing a change against them", () => {
  it("says nothing about a change that breaks nothing, or about the defaults", () => {
    const b = base();
    expect(reviewChange(b, b)).toEqual([]);
    expect(ids(b, after([{ op: "radius.set", input: { base: 8 } }], b))).toEqual([]);
  });

  it("flags a target under 24px as a standard, with the number and a way back", () => {
    const b = base();
    const [n] = reviewChange(b, after([set("button.height.sm", "20px")], b));
    expect(n).toMatchObject({ guideline: "targets-minimum", level: "must" });
    expect(n!.detail).toMatch(/Button sm is now 20px tall/);
    expect(n!.recommend).toMatch(/24px/);
    expect(n!.sources[0]!.name).toMatch(/WCAG 2\.2/);
  });

  it("flags buttons and inputs of one size that stop lining up", () => {
    const b = base();
    const notes = reviewChange(b, after([set("button.height.md", "38px")], b));
    expect(notes.map((n) => n.guideline)).toEqual(["sizes-scale"]);
    expect(notes[0]!.detail).toMatch(/38px and 36px/);
  });

  // A style set on the component (stored as a token it owns) counts like a size token.
  it("measures what a component renders, whichever way its height was set", () => {
    const b = base();
    const styled = after([{ op: "component.setStyle", input: { component: "button", part: "root", scope: { kind: "size", name: "md" }, state: "default", property: "height", value: "38px" } }], b);
    expect(reviewChange(b, styled).map((n) => n.detail)).toEqual([expect.stringMatching(/38px and 36px/)]);
  });

  it("flags a size scale that goes out of order", () => {
    const b = base();
    expect(ids(b, after([set("button.height.sm", "44px")], b))).toContain("sizes-scale");
  });

  it("flags small text, a type scale that stops growing, a thin focus ring, off-grid spacing and slow motion", () => {
    const b = base();
    expect(ids(b, after([set("font.size.5", "10px")], b))).toEqual(expect.arrayContaining(["type-scale-ratio", "type-min-size"]));
    expect(reviewChange(b, after([set("focus.width", "1px")], b))).toMatchObject([{ guideline: "states-focus-visible", level: "should" }]);
    expect(ids(b, after([set("space.5", "13px")], b))).toEqual(["spacing-grid"]);
    expect(ids(b, after([set("motion.duration.base", "800ms")], b))).toEqual(["motion-duration"]);
  });

  it("flags contrast that this change broke, not what failed already", () => {
    const b = base();
    const notes = reviewChange(b, after([set("surface.page", "#8a8a8a")], b));
    expect(notes[0]).toMatchObject({ level: "must" });
    expect(notes[0]!.guideline).toMatch(/^contrast-/);
    expect(notes[0]!.detail).toMatch(/fail|:1/);
  });

  it("flags success moved onto danger's red, so good news can't read as an error", () => {
    const b = base();
    const notes = reviewChange(b, after([{ op: "intent.setPalette", input: { name: "success", palette: "red" } }], b));
    expect(notes).toMatchObject([{ guideline: "color-palettes-earn-place", level: "must" }]);
    expect(notes[0]!.detail).toMatch(/Success is now close to danger/);
  });

  it("points out stock status colors left beside a new brand, once", () => {
    const b = base();
    const notes = reviewChange(b, after([{ op: "palette.setColor", input: { name: "brand", color: "#5e6ad2" } }], b));
    expect(notes).toMatchObject([{ guideline: "color-palettes-earn-place", level: "should" }]);
    expect(notes[0]!.detail).toMatch(/green, blue, amber are still tesserai's stock colors/);
    // Tuned or removed, it's settled.
    const settled = after([{ op: "palette.setColor", input: { name: "brand", color: "#5e6ad2" } }, { op: "palette.remove", input: { name: "blue", moveTo: "brand" } }, { op: "palette.remove", input: { name: "green", moveTo: "brand" } }, { op: "palette.setVibrancy", input: { name: "amber", vibrancy: 0.7 } }], b);
    expect(reviewChange(b, settled)).toEqual([]);
  });

  it("flags a meaning moved onto a grey brand", () => {
    const b = base();
    const grey = after([{ op: "palette.setColor", input: { name: "brand", color: "#e5e5e6" } }, { op: "intent.setPalette", input: { name: "success", palette: "brand" } }], b);
    expect(reviewChange(b, grey).map((n) => n.detail)).toContainEqual(expect.stringMatching(/Success is now grey/));
  });

  // A dark site's surfaces put into light mode with the dark text left on them.
  it("flags page text that can't be read on the page or cards", () => {
    const b = base();
    const dark = after([{ op: "surface.set", input: { surface: "page", value: "#08090a", scheme: "light" } }], b);
    expect(reviewChange(b, dark).map((n) => n.detail)).toContainEqual(expect.stringMatching(/Text on the page in light mode is now 1\.\d:1/));
  });

  it("keeps to three notes, standards first", () => {
    const b = base();
    const notes = reviewChange(b, after([set("space.5", "13px"), set("motion.duration.base", "800ms"), set("font.size.5", "10px"), set("button.height.sm", "20px"), set("focus.width", "1px")], b));
    expect(notes).toHaveLength(3);
    expect(notes[0]).toMatchObject({ guideline: "targets-minimum", level: "must" });
    expect(notes.slice(1).every((n) => n.level === "should")).toBe(true);
  });

  it("is quick even when a change breaks contrast everywhere", () => {
    const b = base();
    const next = after([set("surface.page", "#8a8a8a")], b);
    const start = Date.now();
    reviewChange(b, next);
    expect(Date.now() - start).toBeLessThan(400);
  });
});

describe("keeping a convention the system's own way", () => {
  it("leaves kept conventions out of checks and reviews, never standards, and undoes like any step", async () => {
    const { standingFindings } = await import("./review");
    const { revertStep } = await import("../ops/revert");
    const b = base();
    expect(standingFindings(b).map((r) => r.rule)).toContain("touch");
    const kept = applyChangeset(b, { ops: [{ op: "guideline.keep", input: { rule: "touch", note: "Our app is desktop only" } }] });
    if (!kept.ok) throw new Error(kept.error);
    expect(kept.applied[0]!.description).toBe("Kept as is: targets under 44px on touch screens");
    expect(kept.system.kept).toEqual([{ rule: "touch", note: "Our app is desktop only" }]);
    expect(standingFindings(kept.system).map((r) => r.rule)).not.toContain("touch");
    // A change that would have been noted for it isn't.
    const smaller = after([set("button.height.lg", "38px")], kept.system);
    expect(reviewChange(kept.system, smaller).map((n) => n.rule)).not.toContain("touch");
    // Standards can't be kept aside.
    const standard = applyChangeset(b, { ops: [{ op: "guideline.keep", input: { rule: "target" } }] });
    expect(standard.ok ? "" : standard.error).toMatch(/only conventions can be kept/);
    // Undone like any step; shown again with guideline.review.
    expect(revertStep(kept.system, b, kept.system).system.kept).toBeUndefined();
    const again = applyChangeset(kept.system, { ops: [{ op: "guideline.review", input: { rule: "touch" } }] });
    expect(again.ok && again.system.kept).toBeUndefined();
  });
});
