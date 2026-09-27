import { parseDate } from "@internationalized/date";
import { join } from "node:path";
import type { ReactElement } from "react";
import type { VNode } from "vue";
import { afterAll, beforeAll, describe as group, expect, it } from "vitest";
import { createLoader, FIXTURE_DIR, type Loader } from "../harness";
import { describe, scenario } from "./calendar";
import { SYSTEMS, writeRun } from "./systems";

// The calendar held to the React one by what its classes mean (calendar.ts): React's is
// react-day-picker's, Vue's Reka's, laid out alike, marking state their own ways. Rendered on the
// server with the same dates, each part (root, nav, caption, weekday, the cells and days of
// today, a selected day, a range's ends and middle, a day outside the month) has the same classes
// applied, the same tag and the same text; the date picker's trigger is compared as rendered.

type Render = {
  createElement: (type: unknown, props?: unknown, ...children: unknown[]) => ReactElement;
  h: (type: unknown, props?: unknown, children?: unknown) => VNode;
  renderReact: (element: ReactElement) => string;
  renderVue: (render: () => VNode) => Promise<string>;
};
type Cn = (...classes: string[]) => string;

let ssr: Loader;
let render: Render;
beforeAll(async () => {
  ssr = await createLoader("ssr");
  render = await ssr.load<Render>(join(FIXTURE_DIR, "harness/render-ssr.ts"));
});
afterAll(() => ssr.close());

group.each(Object.keys(SYSTEMS))("%s system", (name) => {
  let react: Record<string, unknown>;
  let vue: Record<string, unknown>;
  let cn: Cn;
  beforeAll(async () => {
    const system = SYSTEMS[name]!();
    const reactDir = await writeRun(`calendar-${name}-react`, "radix", system);
    const vueDir = await writeRun(`calendar-${name}-vue`, "reka-ui", system);
    react = await ssr.load(join(reactDir, "components/ui/calendar.tsx"));
    vue = await ssr.load(join(vueDir, "components/ui/calendar/index.ts"));
    cn = (await ssr.load<{ cn: Cn }>(join(vueDir, "lib/utils.ts"))).cn;
  });

  const s = scenario();
  const month = new Date(s.today.getFullYear(), s.today.getMonth(), 1);

  it("a single date, captioned by its month", async () => {
    const reactHtml = render.renderReact(render.createElement(react["Calendar"], { mode: "single", selected: s.selected, defaultMonth: month }));
    const vueHtml = await render.renderVue(() => render.h(vue["Calendar"], { modelValue: parseDate(s.iso(s.selected)) }));
    const expected = describe(reactHtml, s.dates, cn);
    expect(expected.filter((p) => p.classes === null).map((p) => p.name)).toEqual([]);
    expect(describe(vueHtml, s.dates, cn)).toEqual(expected);
  });

  it("a range over two months, with month and year dropdowns", async () => {
    const reactHtml = render.renderReact(render.createElement(react["Calendar"], { mode: "range", selected: { from: s.selected, to: s.end }, defaultMonth: month, numberOfMonths: 2, captionLayout: "dropdown" }));
    const vueHtml = await render.renderVue(() => render.h(vue["RangeCalendar"], { modelValue: { start: parseDate(s.iso(s.selected)), end: parseDate(s.iso(s.end)) }, numberOfMonths: 2, layout: "month-and-year" }));
    const expected = describe(reactHtml, s.dates, cn);
    expect(expected.filter((p) => p.classes === null).map((p) => p.name)).toEqual([]);
    expect(describe(vueHtml, s.dates, cn)).toEqual(expected);
  });
});
