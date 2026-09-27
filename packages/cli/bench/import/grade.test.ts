import { rmSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { applyChangeset, parseColor, PRESETS, toCssOklch, type Changeset } from "@tesserai/core";
import { grade, ROLES, type Claim, type Truth } from "./grade";
import { baseline, fixtures, stage, truthOf } from "./run";

// The benchmark's own check: a perfect import scores near 100, and each kind of mistake costs
// what it should. If these pass, a low score in a real run is the importer's, not the grader's.

const staged: string[] = [];
afterAll(() => staged.forEach((d) => rmSync(d, { recursive: true, force: true })));

// A system with every answer-key value set exactly, as an ideal importer would make it.
function ideal(truth: Truth) {
  const css = (v: string) => toCssOklch(parseColor(v)!);
  const ops: Changeset["ops"] = [{ op: "system.create", input: { name: "Ideal", brandColor: css(truth.light.primary ?? "#3b82f6"), preset: "shadcn" } }];
  for (const scheme of ["light", "dark"] as const) {
    for (const [role, value] of Object.entries(truth[scheme] ?? {})) {
      const path = ROLES[role as keyof typeof ROLES];
      const [kind, a, b] = path.split(".");
      if (kind === "surface") ops.push({ op: "surface.set", input: { surface: a, value: css(value), scheme } });
      else ops.push({ op: "intent.setRole", input: { name: a, role: b, value: css(value), scheme } });
    }
  }
  for (const [role, family] of Object.entries(truth.fonts)) ops.push({ op: "type.setFont", input: { role, families: [family] } });
  if (truth.baseSize !== undefined) ops.push({ op: "type.setScale", input: { base: truth.baseSize } });
  if (truth.radius !== undefined) ops.push({ op: "radius.set", input: { base: Math.min(24, truth.radius) } });
  if (truth.spacing !== undefined) ops.push({ op: "spacing.set", input: { base: truth.spacing } });
  const applied = applyChangeset(PRESETS[0]!.build(), { ops });
  if (!applied.ok) throw new Error(applied.error);
  return applied.system;
}

describe("the import benchmark's grader", () => {
  it("has an answer key for every fixture", () => {
    expect(fixtures().length).toBeGreaterThanOrEqual(16);
    for (const f of fixtures()) expect(truthOf(f).light.primary, f).toBeDefined();
  });

  it("scores a perfect import near 100 on every fixture", () => {
    for (const f of fixtures()) {
      const truth = truthOf(f);
      const s = grade(f, "/nonexistent", truth, { ok: true, system: ideal(truth), seconds: 0 });
      expect(s.accuracy, `${f}: ${JSON.stringify(s.items.filter((i) => i.score < 1))}`).toBeGreaterThan(0.97);
      expect(s.usable, f).toBe(1);
      expect(s.decoyHits, f).toEqual([]);
    }
  });

  it("checks what the report claims against the project, line by line", () => {
    const f = "a6-styled-components";
    const dir = stage(f);
    staged.push(dir);
    const truth = truthOf(f);
    const system = ideal(truth);
    const right: Claim[] = [
      { key: "light.primary", value: "#2563eb", source: "src/theme/palette.ts:9" },
      { key: "radius", value: "8", source: "src/theme/themes.ts:4" },
    ];
    const good = grade(f, dir, truth, { ok: true, system, found: right, seconds: 0 });
    expect(good.trust?.evidence).toBe(1);
    expect(good.trust?.precision).toBe(1);
    // A wrong line, a made-up file, and a claim about something the project doesn't define.
    const wrong: Claim[] = [
      { key: "light.primary", value: "#2563eb", source: "src/theme/palette.ts:3" },
      { key: "light.border", value: "#e5e7eb", source: "src/theme/colors.ts:1" },
    ];
    const bad = grade(f, dir, truth, { ok: true, system, found: wrong, seconds: 0 });
    expect(bad.trust?.evidence).toBe(0);
    const invented = grade(f, dir, { ...truth, absent: ["spacing"] }, { ok: true, system, found: [{ key: "spacing", value: "4", source: "src/theme/themes.ts:7" }], seconds: 0 });
    expect(invented.trust?.falseClaims).toHaveLength(1);
  });

  it("counts a decoy theme against the import", () => {
    const f = "d6-decoy-monorepo";
    const truth = truthOf(f);
    const system = ideal({ ...truth, light: { ...truth.light, primary: "#ea580c" } });
    const s = grade(f, "/nonexistent", truth, { ok: true, system, seconds: 0 });
    expect(s.decoyHits).toEqual(["primary is #ea580c"]);
    expect(s.score).toBeLessThan(0.7);
  });

  it("gives today's Import dialog its due where it can read the file", async () => {
    const dir = stage("d3-dtcg-figma");
    staged.push(dir);
    const s = grade("d3-dtcg-figma", dir, truthOf("d3-dtcg-figma"), await baseline(dir));
    expect(s.accuracy).toBe(1);
  });
});
