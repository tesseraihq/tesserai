import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "./icons";
import { applyChangeset } from "./ops";
import { PRESETS } from "./presets";
import { DesignSystem } from "./system";

const clean = (svg: string) => {
  const r = sanitizeSvg(svg);
  if (!r.ok) throw new Error(r.problem);
  return r.icon;
};

describe("sanitizing SVGs people bring", () => {
  it("keeps the drawing and drops everything that could run or load something", () => {
    const icon = clean(`<?xml version="1.0"?><!-- Figma --><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" onload="alert(1)">
      <script>alert(1)</script>
      <foreignObject><div>hi</div></foreignObject>
      <a href="javascript:alert(1)"><path d="M0 0h1"/></a>
      <path d="M1 1h22v22H1z" fill="#111" onclick="steal()" style="stroke:#111;fill:url(https://evil.test/x)"/>
      <image href="https://evil.test/track.png"/>
      <use href="https://evil.test/sprite.svg#x"/>
      <use href="#local"/>
    </svg>`);
    expect(icon.svg).toBe('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M1 1h22v22H1z" fill="currentColor" stroke="currentColor"/><use href="#local"/></svg>');
    expect(icon.colors).toBe(0);
  });

  it("keeps a multi-color logo's colors, and turns one-color icons to follow the text color", () => {
    const logo = clean(`<svg viewBox="0 0 48 24"><rect width="24" height="24" fill="#E11D48"/><circle cx="36" cy="12" r="12" fill="#2563EB"/></svg>`);
    expect(logo.colors).toBe(2);
    expect(logo.aspect).toBe(2);
    expect(logo.svg).toContain('fill="#E11D48"');
    const plain = clean(`<svg viewBox="0 0 24 24"><path d="M0 0h24v24z"/></svg>`);
    expect(plain.svg).toBe('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M0 0h24v24z"/></svg>');
  });

  it("refuses what isn't a usable SVG", () => {
    expect(sanitizeSvg("<div>no</div>")).toMatchObject({ ok: false });
    expect(sanitizeSvg("<svg><path d='M0 0'/></svg>")).toMatchObject({ ok: false, problem: expect.stringMatching(/viewBox/) });
    expect(sanitizeSvg('<svg viewBox="0 0 24 24"></svg>')).toMatchObject({ ok: false, problem: "the SVG draws nothing" });
    expect(sanitizeSvg(`<svg viewBox="0 0 1 1">${"<g>".repeat(60)}<path d="M0 0"/></svg>`)).toMatchObject({ ok: false });
  });

  it("stores only icons it cleaned itself, so a save can't smuggle anything in", () => {
    const system = PRESETS[0]!.build();
    const good = clean(`<svg viewBox="0 0 24 24"><path d="M0 0h24v24z" fill="#000"/></svg>`).svg;
    const added = applyChangeset(system, { ops: [{ op: "icons.addCustom", input: { id: "acme", icon: { name: "Acme", svg: good } } }] });
    expect(added.ok).toBe(true);
    const bad = { ...system, icons: { library: "lucide", stroke: 2, weight: "regular", spots: {}, custom: { acme: { name: "Acme", svg: '<svg viewBox="0 0 1 1" onload="x()"><path d="M0 0"/></svg>' } } } };
    expect(DesignSystem.safeParse(bad).success).toBe(false);
  });
});

describe("icon operations", () => {
  it("chooses a library and weight, swaps a spot, and cleans up after a deleted icon", () => {
    const svg = clean(`<svg viewBox="0 0 24 24"><path d="M0 0h24v24z"/></svg>`).svg;
    const result = applyChangeset(PRESETS[0]!.build(), {
      ops: [
        { op: "icons.setLibrary", input: { library: "phosphor" } },
        { op: "icons.setWeight", input: { weight: "light" } },
        { op: "icons.addCustom", input: { id: "acme-logo", icon: { name: "Acme logo", svg } } },
        { op: "icons.setSpot", input: { spot: "select:chevron-down", icon: "custom:acme-logo" } },
        { op: "icons.setSpot", input: { spot: "dialog:x", icon: "tabler:IconSquareX" } },
      ],
    });
    if (!result.ok) throw new Error(result.error);
    expect(result.system.icons).toMatchObject({ library: "phosphor", weight: "light", spots: { "select:chevron-down": "custom:acme-logo" } });
    const removed = applyChangeset(result.system, { ops: [{ op: "icons.removeCustom", input: { id: "acme-logo" } }] });
    if (!removed.ok) throw new Error(removed.error);
    expect(removed.system.icons?.spots).toEqual({ "dialog:x": "tabler:IconSquareX" });
    expect(applyChangeset(PRESETS[0]!.build(), { ops: [{ op: "icons.setSpot", input: { spot: "select:chevron-down", icon: "custom:nope" } }] })).toMatchObject({ ok: false });
  });
});
