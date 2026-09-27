import { join } from "node:path";
import type { VNode } from "vue";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createLoader, FIXTURE_DIR, type Loader } from "../harness";
import { SYSTEMS, writeRun } from "./systems";

// What a Vue user writes that React's types would refuse: attributes on a component (id, name,
// aria-*), which Vue passes through. They land on the element they name, not on a root that
// renders nothing (a popover's), where Vue drops them without a word.

type Render = { h: (type: unknown, props?: unknown, children?: unknown) => VNode; renderVue: (render: () => VNode) => Promise<string> };

let ssr: Loader;
let render: Render;
let vue: Record<string, any>;
beforeAll(async () => {
  ssr = await createLoader("ssr");
  render = await ssr.load<Render>(join(FIXTURE_DIR, "harness/render-ssr.ts"));
  const dir = await writeRun("attrs-vue", "reka-ui", SYSTEMS["default"]!());
  vue = await ssr.load(join(dir, "components/ui/date-picker/index.ts"));
});
afterAll(() => ssr.close());

describe("attributes on a Vue component", () => {
  it.each(["DatePicker", "DateRangePicker"])("%s puts id and aria-* on its button, so a label can point at it", async (name) => {
    const html = await render.renderVue(() => render.h(vue[name], { id: "due", name: "due", "aria-describedby": "due-hint" }));
    const button = /<button[^>]*data-slot="date-picker"[^>]*>/.exec(html)?.[0] ?? "";
    expect(button).toContain('id="due"');
    expect(button).toContain('aria-describedby="due-hint"');
  });
});
