import { PRESETS } from "@tesserai/core";
import { componentDocs, EXAMPLE_PAGES, EXAMPLE_SPECS, pagePrinting, printPage, renderAll } from "@tesserai/templates";
import { join } from "node:path";
import type { ReactElement } from "react";
import type { VNode } from "vue";
import { describe, expect, it } from "vitest";
import { createLoader, FIXTURE_DIR, vueTsc, writeGenerated, type GeneratedFile } from "../harness";
import { ACCEPTED_DATA, ACCEPTED_SSR_DATA, acceptedData, rekaVars, slotsInHtml } from "./slots";
import { ICON_SYSTEMS } from "./systems";

type Render = {
  createElement: (type: unknown, props?: unknown, ...children: unknown[]) => ReactElement;
  h: (type: unknown, props?: unknown, children?: unknown) => VNode;
  renderReact: (element: ReactElement) => string;
  renderVue: (render: () => VNode) => Promise<string>;
};

// Pages printed for Vue (vue/page.ts): every example page and every component's docs example, on
// the default preset, against the generated Vue components, type-checked with vue-tsc as a Vue
// app would compile them.

const system = PRESETS[0]!.build();

// What the example pages use that the Vue set doesn't have yet: printPage leaves it out and says
// so (the page's other content stays). Each with the component, so a new gap is noticed.
const LEFT_OUT: Record<string, string[]> = {
  "sign-in": [],
  settings: [],
  dashboard: [],
  "data-list": [],
};

describe("Vue pages", () => {
  it("prints every example page, and each type-checks", async () => {
    const files = await renderAll("reka-ui", system);
    const printer = pagePrinting("reka-ui")!.printer!;
    const pages: GeneratedFile[] = [];
    for (const name of EXAMPLE_PAGES) {
      const printed = printPage(EXAMPLE_SPECS[name](), system, files, name, { printer });
      expect(printed.problems, name).toEqual([]);
      expect(printed.missing, name).toEqual(LEFT_OUT[name]);
      expect(printed.source, name).toMatch(/^<!-- [^\n]*-->\n<script setup lang="ts">[\s\S]*<template>/);
      pages.push({ path: `pages/${name}.vue`, source: printed.source });
    }
    // A state and its setter are v-model; a Radix trigger is the part with as-child.
    const dataList = pages.find((p) => p.path === "pages/data-list.vue")!.source;
    expect(dataList).toContain("const selected = ref<number[]>([1,4]);");
    expect(dataList).toMatch(/<SheetTrigger as-child>\s*<Button>\s*<PlusIcon \/>\s*Invite people\s*<\/Button>\s*<\/SheetTrigger>/);
    expect(dataList).toContain("{{ selected.length }}");
    expect(dataList).not.toMatch(/className|htmlFor|onCheckedChange|defaultChecked/);
    const dir = writeGenerated("pages", [...files, ...pages]);
    expect(vueTsc(dir)).toEqual([]);
  }, 120_000);

  it("draws a page's icons in the system's icon library", async () => {
    const icons = ICON_SYSTEMS["phosphor-bold"]!();
    const files = await renderAll("reka-ui", icons);
    const printer = pagePrinting("reka-ui")!.printer!;
    const pages = EXAMPLE_PAGES.map((name) => ({ path: `pages/${name}.vue`, source: printPage(EXAMPLE_SPECS[name](), icons, files, name, { printer }).source }));
    const settings = pages.find((p) => p.path === "pages/settings.vue")!.source;
    expect(settings).toContain("h(PhWarning, { ...attrs, weight: \"bold\" })");
    expect(pages.map((p) => p.source).join("\n")).not.toContain("@lucide/vue");
    expect(vueTsc(writeGenerated("pages-icons", [...files, ...pages]))).toEqual([]);
  }, 120_000);

  // The printed Vue page renders what the printed Radix page does: its data-slot elements, their
  // tags, data attributes and classes (with what the Vue set leaves out, left out of both).
  it("renders each example page as the Radix page renders", async () => {
    const trimmed = { ...system, base: "radix" as const, excluded: [...(system.excluded ?? []), ...Object.values(LEFT_OUT).flat()] };
    const [react, vue] = [await renderAll("radix", trimmed), await renderAll("reka-ui", trimmed)];
    const printer = pagePrinting("reka-ui")!.printer!;
    const reactDir = writeGenerated("pages-ssr-react", [...react, ...EXAMPLE_PAGES.map((name) => ({ path: `pages/${name}.tsx`, source: printPage(EXAMPLE_SPECS[name](), trimmed, react, name).source }))]);
    const vueDir = writeGenerated("pages-ssr-vue", [...vue, ...EXAMPLE_PAGES.map((name) => ({ path: `pages/${name}.vue`, source: printPage(EXAMPLE_SPECS[name](), trimmed, vue, name, { printer }).source }))]);
    const ssr = await createLoader("ssr");
    try {
      const render = await ssr.load<Render>(join(FIXTURE_DIR, "harness/render-ssr.ts"));
      for (const name of EXAMPLE_PAGES) {
        const Page = (await ssr.load<{ default: unknown }>(join(reactDir, `pages/${name}.tsx`))).default;
        const VuePage = (await ssr.load<{ default: unknown }>(join(vueDir, `pages/${name}.vue`))).default;
        const accepted = { ...ACCEPTED_DATA, ...ACCEPTED_SSR_DATA };
        const reactSlots = acceptedData(rekaVars(slotsInHtml(render.renderReact(render.createElement(Page)))), accepted);
        expect(reactSlots.length, name).toBeGreaterThan(5);
        expect(acceptedData(slotsInHtml(await render.renderVue(() => render.h(VuePage))), accepted), name).toEqual(reactSlots);
      }
    } finally {
      await ssr.close();
    }
  }, 120_000);

  it("gives every Vue component's docs an example that type-checks", async () => {
    const docs = await componentDocs(system, "reka-ui");
    const examples = docs.filter((d) => d.example !== null).map((d) => ({ path: `examples/${d.name}.vue`, source: d.example! }));
    // Every component of the set that has a catalog example gets one.
    expect(docs.filter((d) => d.example === null).map((d) => d.name)).toEqual(expect.not.arrayContaining(["button", "checkbox", "select", "tabs", "dialog", "sheet", "dropdown-menu"]));
    expect(examples.length).toBeGreaterThan(20);
    const dir = writeGenerated("docs-examples", [...(await renderAll("reka-ui", system)), ...examples]);
    expect(vueTsc(dir)).toEqual([]);
  }, 120_000);
});
