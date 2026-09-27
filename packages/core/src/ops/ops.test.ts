import { describe, expect, it } from "vitest";
import { StyleProps } from "../components";
import { PRESETS } from "../presets";
import { MAX_PAGES, pageIdFor } from "../pages";
import { getToken } from "../tokens";
import { applyChangeset, diffSystems, opManifest, OPS, validateSystem } from "./index";

const base = () => PRESETS[0]!.build();

function ok(result: ReturnType<typeof applyChangeset>) {
  if (!result.ok) throw new Error(result.error);
  return result;
}

describe("operation catalog", () => {
  it("names are unique and every input has a JSON Schema", () => {
    expect(new Set(OPS.map((o) => o.name)).size).toBe(OPS.length);
    for (const entry of opManifest()) {
      expect(entry.inputSchema, entry.name).toMatchObject({ type: "object" });
      expect(entry.summary.length, entry.name).toBeGreaterThan(10);
    }
  });

  it("every preset is a valid system", () => {
    for (const preset of PRESETS) expect(validateSystem(preset.build()), preset.id).toEqual([]);
  });
});

describe("applyChangeset", () => {
  it("resizes a palette and carries every reference to the step that plays its part", () => {
    const system = base();
    const { system: next } = ok(
      applyChangeset(system, {
        ops: [
          { op: "component.setStyle", input: { component: "badge", part: "root", scope: { kind: "all" }, state: "hover", property: "background", value: "{color.brand.7}" } },
          { op: "palette.setSteps", input: { name: "brand", steps: 6 } },
        ],
      }),
    );
    expect(getToken(next.tokens, "color.brand.7")).toBeUndefined();
    expect(getToken(next.tokens, "intent.primary.solid")?.$value).toBe("{color.brand.4}");
    expect(next.components["badge"]?.base["root"]?.states?.hover?.background).toBe("{color.brand.4}");
    // The original is untouched.
    expect(getToken(system.tokens, "color.brand.10")).toBeDefined();
  });

  it("is all or nothing, and says which operation failed and why", () => {
    const system = base();
    const radiusBefore = JSON.stringify(system.generators["radius"]);
    const result = applyChangeset(system, {
      ops: [
        { op: "radius.set", input: { base: 10 } },
        { op: "palette.setColor", input: { name: "brand", color: "not a color" } },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failedAt).toBe(1);
    expect(result.error).toMatch(/not a color/);
    expect(JSON.stringify(system.generators["radius"])).toBe(radiusBefore);
  });

  it("rejects unknown operations and malformed input with the field named", () => {
    const unknown = applyChangeset(base(), { ops: [{ op: "palette.explode", input: {} }] });
    expect(unknown.ok ? "" : unknown.error).toMatch(/no operation "palette.explode"/);
    const bad = applyChangeset(base(), { ops: [{ op: "palette.setSteps", input: { name: "brand", steps: 40 } }] });
    expect(bad.ok ? "" : bad.error).toMatch(/palette.setSteps: steps/);
  });

  it("refuses to remove a palette still in use unless told where its uses go", () => {
    const refused = applyChangeset(base(), { ops: [{ op: "palette.remove", input: { name: "amber" } }] });
    expect(refused.ok ? "" : refused.error).toMatch(/warning use the amber palette/);
    const { system } = ok(applyChangeset(base(), { ops: [{ op: "palette.remove", input: { name: "amber", moveTo: "red" } }] }));
    expect(system.intents["warning"]?.scale).toBe("color.red");
    expect(system.generators["amber"]).toBeUndefined();
  });

  it("renames an intent everywhere", () => {
    const { system } = ok(applyChangeset(base(), { ops: [{ op: "intent.rename", input: { name: "primary", to: "accent" } }] }));
    expect(system.intents["accent"]).toBeDefined();
    expect(system.components["button"]?.axes.intent?.default).toBe("accent");
    expect(getToken(system.tokens, "intent.primary.solid")).toBeUndefined();
    expect(getToken(system.tokens, "intent.accent.solid")).toBeDefined();
  });

  it("renames a palette everywhere", () => {
    const { system } = ok(applyChangeset(base(), { ops: [{ op: "palette.rename", input: { name: "brand", to: "ocean" } }] }));
    expect(system.intents["primary"]?.scale).toBe("color.ocean");
    expect(getToken(system.tokens, "intent.primary.solid")?.$value).toBe("{color.ocean.7}");
    expect(getToken(system.tokens, "color.brand.7")).toBeUndefined();
  });

  it("adds a palette and an intent in one changeset, later operations seeing earlier ones", () => {
    const { system, applied } = ok(
      applyChangeset(base(), {
        ops: [
          { op: "palette.add", input: { name: "teal", color: "#0d9488", steps: 8 } },
          { op: "intent.add", input: { name: "highlight", palette: "teal", addToComponents: true } },
        ],
      }),
    );
    expect(system.components["badge"]?.axes.intent?.enabled).toContain("highlight");
    expect(getToken(system.tokens, "color.teal.8")).toBeDefined();
    expect(getToken(system.tokens, "color.teal.9")).toBeUndefined();
    expect(applied.map((a) => a.description)).toEqual(["Added a teal palette", "Added a highlight intent reading from teal"]);
  });

  it("changes the number of type steps without moving any reference off its size", () => {
    const system = base();
    const before = getToken(system.tokens, "button.font-size.md")?.$value;
    const { system: next } = ok(applyChangeset(system, { ops: [{ op: "type.setScale", input: { stepsBelow: 3 } }] }));
    // stepsBelow 2 -> 3 shifts every step number up by one; the reference follows.
    expect(before).toBe("{font.size.2}");
    expect(getToken(next.tokens, "button.font-size.md")?.$value).toBe("{font.size.3}");
  });

  it("adds a variant as a copy and styles it", () => {
    const { system } = ok(
      applyChangeset(base(), {
        ops: [
          { op: "component.addOption", input: { component: "badge", axis: "variant", name: "pill", copyFrom: "soft" } },
          { op: "component.setStyle", input: { component: "badge", part: "root", scope: { kind: "variant", name: "pill" }, property: "radius", value: "{radius.full}" } },
        ],
      }),
    );
    const pill = system.components["badge"]?.variants["pill"]?.["root"]?.base;
    expect(StyleProps.parse(pill).radius).toBe("{radius.full}");
    expect(system.components["badge"]?.axes.variant?.enabled).toContain("pill");
  });

  it("sets a surface for dark mode only", () => {
    const { system } = ok(applyChangeset(base(), { ops: [{ op: "surface.set", input: { surface: "page", value: "{color.neutral.2}", scheme: "dark" } }] }));
    const page = getToken(system.tokens, "surface.page");
    expect(page?.$value).toBe("{color.neutral.1}");
    expect(page?.$modes?.find((m) => m.selector.colorScheme === "dark")?.value).toBe("{color.neutral.2}");
    expect(page?.$meta?.pinned).toBe(true);
  });

  it("creates a new system and shapes it in one changeset (\"like Coinbase, but red\")", () => {
    const { system, applied } = ok(
      applyChangeset(base(), {
        summary: "A clean fintech system with a red primary",
        ops: [
          { op: "system.create", input: { name: "Ledger", brandColor: "#d32f2f", preset: "shadcn" } },
          { op: "type.setFont", input: { role: "sans", families: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"] } },
          { op: "radius.set", input: { base: 8 } },
          { op: "component.setDefault", input: { component: "button", axis: "size", option: "lg" } },
        ],
      }),
    );
    expect(system.name).toBe("Ledger");
    const brand = system.generators["brand"]?.config;
    expect(brand?.kind === "colorScale" ? Math.round(brand.seed.h) : null).toBe(26);
    expect(system.components["button"]?.axes.size?.default).toBe("lg");
    expect(applied[0]?.description).toBe("Created Ledger from the shadcn preset");
  });

  it("reports what changed", () => {
    const system = base();
    const { system: next } = ok(applyChangeset(system, { ops: [{ op: "intent.setPalette", input: { name: "danger", palette: "amber" } }] }));
    const diff = diffSystems(system, next);
    expect(diff.intents).toEqual(["danger"]);
    expect(diff.tokens.some((t) => t.path === "intent.danger.solid" && t.kind === "changed")).toBe(true);
  });
});

describe("naming", () => {
  it("names new systems generically, and loading a preset keeps the system's name", () => {
    // A preset's name reads like the library it's built on, so new systems never take it.
    for (const preset of PRESETS) expect(preset.build().name).toBe("My design system");
    const named = ok(applyChangeset(base(), { ops: [{ op: "system.rename", input: { name: "Acme" } }] })).system;
    const loaded = ok(applyChangeset(named, { ops: [{ op: "system.loadPreset", input: { preset: "enterprise" } }] })).system;
    expect(loaded.name).toBe("Acme");
  });
});

describe("saved pages", () => {
  const spec = { root: "page", elements: { page: { type: "Page", props: {}, children: ["title"] }, title: { type: "Heading", props: { text: "Filters" } } } };

  it("saves, renames and deletes pages, one operation each", () => {
    const saved = ok(applyChangeset(base(), { ops: [{ op: "page.save", input: { id: "filters", name: "Filters", spec, prompt: "a filter menu" } }] }));
    expect(saved.system.pages?.["filters"]).toMatchObject({ name: "Filters", prompt: "a filter menu", spec: { root: "page" } });
    expect(saved.applied[0]!.description).toBe("Page “Filters”");
    const renamed = ok(applyChangeset(saved.system, { ops: [{ op: "page.rename", input: { id: "filters", name: "Search filters" } }] }));
    expect(renamed.system.pages?.["filters"]?.name).toBe("Search filters");
    const removed = ok(applyChangeset(renamed.system, { ops: [{ op: "page.remove", input: { id: "filters" } }] }));
    expect(removed.system.pages).toEqual({});
    expect(applyChangeset(removed.system, { ops: [{ op: "page.remove", input: { id: "filters" } }] })).toMatchObject({ ok: false });
  });

  it("keeps page saving out of the manifest models see, since only the page catalog can check a page", () => {
    const names = opManifest().map((o) => o.name);
    expect(names).not.toContain("page.save");
    expect(names).toContain("page.remove");
  });

  it("limits how many pages a system keeps and how big one can be", () => {
    const many = Object.fromEntries(Array.from({ length: MAX_PAGES }, (_, i) => [`p${i}`, { name: `P${i}`, spec }]));
    const full = { ...base(), pages: many };
    expect(applyChangeset(full, { ops: [{ op: "page.save", input: { id: "one-more", name: "One more", spec } }] })).toMatchObject({ ok: false });
    expect(applyChangeset(full, { ops: [{ op: "page.save", input: { id: "p0", name: "Replaced", spec } }] })).toMatchObject({ ok: true });
    const huge = { root: "e0", elements: Object.fromEntries(Array.from({ length: 301 }, (_, i) => [`e${i}`, { type: "Text", props: {} }])) };
    expect(applyChangeset(base(), { ops: [{ op: "page.save", input: { id: "huge", name: "Huge", spec: huge } }] })).toMatchObject({ ok: false });
  });

  it("makes page ids from names", () => {
    expect(pageIdFor("Filter menu!", [])).toBe("filter-menu");
    expect(pageIdFor("Filter menu", ["filter-menu"])).toBe("filter-menu-2");
    expect(pageIdFor("2024 report", [])).toBe("report");
    expect(pageIdFor("!!!", [])).toBe("page");
  });
});

describe("what a change reaches", () => {
  it("lists the components that look different, through token references", async () => {
    const { affectedComponents } = await import("./index");
    const before = base();
    const radius = ok(applyChangeset(before, { ops: [{ op: "radius.set", input: { base: 11 } }] })).system;
    const reached = affectedComponents(before, radius);
    expect(reached).toContain("button");
    expect(reached).toContain("card");
    const danger = ok(applyChangeset(before, { ops: [{ op: "palette.setColor", input: { name: "red", color: "#b91c1c" } }] })).system;
    const byDanger = affectedComponents(before, danger);
    expect(byDanger).toContain("alert");
    expect(byDanger.length).toBeLessThan(reached.length + 30);
    expect(affectedComponents(before, before)).toEqual([]);
  });
});
