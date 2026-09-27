import {
  PRESETS,
  isAvailable, BASES, applyChangeset, createSystemFromBrand, DEFAULT_ANATOMIES, enabledSelections, parseColor, partOf, resolveRecipe, type Selection } from "@tesserai/core";
import { describe, expect, it } from "vitest";
import { BASE_UI_STATES, partClasses } from "./classes";
import { factorClasses } from "./factor";
import { dependenciesFor, renderAll, supportedComponents } from "./render";

describe("factorClasses reproduces every combination of every part of every anatomy", () => {
  const expand = (config: ReturnType<typeof factorClasses>, selection: Selection) => {
    const out = [...config.base];
    for (const axis of ["variant", "intent", "size"] as const) {
      const value = selection[axis];
      if (value !== undefined) out.push(...(config.variants[axis]?.[value] ?? []));
    }
    for (const c of config.compoundVariants) {
      const hit = Object.entries(c.selection).every(([k, v]) => selection[k as keyof typeof selection] === v);
      if (hit) out.push(...c.classes);
    }
    return new Set(out);
  };
  for (const anatomy of Object.values(DEFAULT_ANATOMIES)) {
    for (const part of anatomy.parts) {
      it(`${anatomy.name}.${part}`, () => {
        const config = factorClasses(anatomy, part, { states: BASE_UI_STATES });
        for (const selection of enabledSelections(anatomy)) {
          const expected = new Set(partClasses(partOf(resolveRecipe(anatomy, selection), anatomy.name, part), { states: BASE_UI_STATES }));
          expect(expand(config, selection), JSON.stringify(selection)).toEqual(expected);
        }
      });
    }
  }
});

describe("renderAll", () => {
  const system = createSystemFromBrand("acme", parseColor("#2563eb")!);

  it("renders every component as formatted TSX", async () => {
    const files = await renderAll("base-ui", system);
    expect(files.map((f) => f.path)).toEqual(["lib/utils.ts", ...Object.keys(system.components).map((name) => `components/ui/${name}.tsx`)]);
    for (const file of files) expect(file.source, file.path).toMatchSnapshot();
  });

  // create-vite's React template turns on noUnusedLocals, and its build fails on an unused import.
  it.each(["base-ui", "radix", "react-aria"] as const)("imports nothing it doesn't use (%s)", async (base) => {
    for (const file of await renderAll(base, system)) {
      if (file.source.includes("import * as React")) expect(file.source, file.path).toMatch(/\bReact\./);
      if (/\bVariantProps\b/.test(file.source)) expect(file.source, file.path).toMatch(/\bVariantProps</);
    }
  });

  it("renders the same component set on Radix, from the radix-ui package", async () => {
    const files = await renderAll("radix", system);
    expect(files.map((f) => f.path)).toEqual((await renderAll("base-ui", system)).map((f) => f.path));
    for (const file of files) {
      // Radix has no combobox: shadcn's Radix combobox is Base UI's, and so is ours.
      if (file.path.endsWith("combobox.tsx")) expect(file.source).toContain("@base-ui/react/combobox");
      else expect(file.source, file.path).not.toContain("@base-ui/react");
      expect(file.source, file.path).toMatchSnapshot();
    }
    const checkbox = files.find((f) => f.path.endsWith("checkbox.tsx"))!.source;
    expect(checkbox).toContain('import { Checkbox as CheckboxPrimitive } from "radix-ui"');
    expect(checkbox).toContain("data-[state=checked]:bg-");
    expect(checkbox).toContain("data-[disabled]:");
  });

  it("renders the same component set on React Aria, in React Aria's idioms", async () => {
    const files = await renderAll("react-aria", system);
    // Everything Base UI has, minus what React Aria has no version of.
    const expected = (await renderAll("base-ui", system)).map((f) => f.path).filter((p) => !p.endsWith("navigation-menu.tsx"));
    expect(files.map((f) => f.path)).toEqual(expected);
    for (const file of files) {
      // React Aria has no drawer: shadcn's React Aria drawer is Base UI's, and so is ours.
      if (file.path.endsWith("drawer.tsx")) expect(file.source).toContain("@base-ui/react/drawer");
      else expect(file.source, file.path).not.toMatch(/@base-ui\/react|radix-ui/);
      expect(file.source, file.path).toMatchSnapshot();
    }
    const source = (name: string) => files.find((f) => f.path === `components/ui/${name}.tsx`)!.source;
    // The visible box is styled from the label's state.
    expect(source("checkbox")).toContain("group-data-selected:bg-");
    expect(source("checkbox")).toContain("group-data-focus-visible:ring-");
    // Interaction states come from React Aria's own data attributes.
    expect(source("button")).toContain("data-hovered:");
    expect(source("button")).toContain("data-disabled:");
    expect(source("button")).toContain("composeRenderProps(className");
    // shadcn's React Aria shape: XTrigger holds the open state, X is the content itself.
    expect(source("dialog")).toContain("<DialogTriggerPrimitive {...props} />");
    expect(source("dialog")).toMatch(/function Dialog\([\s\S]*<ModalOverlay|function Dialog\([\s\S]*<DialogOverlay/);
    expect(source("dropdown-menu")).toContain("function DropdownMenuTrigger");
    expect(source("dropdown-menu")).not.toContain("DropdownMenuCheckboxItem");
    expect(source("select")).toContain("data-placeholder:");
  });
});

describe("batch 0 vocabulary reaches generated code", () => {
  it("new properties become classes, and a left-out component is not generated", async () => {
    const system = createSystemFromBrand("t", parseColor("#7c3aed")!);
    const result = applyChangeset(system, {
      ops: [
        { op: "component.setStyle", input: { component: "button", part: "root", scope: { kind: "all" }, property: "textTransform", value: "uppercase" } },
        { op: "component.setStyle", input: { component: "button", part: "root", scope: { kind: "all" }, state: "pressed", property: "scale", value: "0.97" } },
        { op: "component.setStyle", input: { component: "button", part: "root", scope: { kind: "intent", name: "primary" }, property: "radius", value: "{radius.full}" } },
        { op: "component.remove", input: { component: "kbd" } },
      ],
    });
    if (!result.ok) throw new Error(result.error);
    const files = await renderAll("base-ui", result.system, { format: false });
    const button = files.find((f) => f.path === "components/ui/button.tsx")?.source ?? "";
    expect(button).toContain("uppercase");
    expect(button).toContain("active:scale-(--button-custom-root-scale-pressed)");
    expect(button).toMatch(/intent: \{[^}]*"primary": "[^"]*rounded-full/);
    expect(files.some((f) => f.path.includes("kbd"))).toBe(false);
    expect(dependenciesFor(result.system)).toContain("@base-ui/react");
  });
});

describe("per-component dependencies", () => {
  it("a component's own package is needed only while the component is included", () => {
    const system = createSystemFromBrand("t", parseColor("#7c3aed")!);
    expect(dependenciesFor(system)).toContain("input-otp");
    const result = applyChangeset(system, { ops: [{ op: "component.remove", input: { component: "input-otp" } }] });
    if (!result.ok) throw new Error(result.error);
    expect(dependenciesFor(result.system)).not.toContain("input-otp");
  });
});

describe("template coverage", () => {
  // A component without a template on a library is either deliberate (UNAVAILABLE says why) or a bug.
  for (const base of BASES) {
    it(`${base} has a template for every available component`, () => {
      const missing = Object.keys(DEFAULT_ANATOMIES).filter((name) => isAvailable(name, base) && !supportedComponents(base).includes(name));
      expect(missing).toEqual([]);
    });
  }
});

it("marks every generated React module using hooks or context as a client entry", async () => {
  const system = PRESETS[0]!.build();
  for (const base of ["radix", "base-ui", "react-aria"] as const) {
    const files = await renderAll(base, system, { format: false });
    for (const file of files)
      if (
        (base === "react-aria" && file.path.endsWith(".tsx")) ||
        /\b(?:use[A-Z]\w*|createContext|forwardRef)\s*(?:<[^;]+?>)?\s*\(/.test(file.source)
      )
        expect(file.source.trimStart(), file.path).toMatch(/^["']use client["'];/);
  }
});
