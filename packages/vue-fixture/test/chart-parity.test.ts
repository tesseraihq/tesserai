import { join } from "node:path";
import type { ReactElement } from "react";
import type { VNode } from "vue";
import { Window } from "happy-dom";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createLoader, FIXTURE_DIR, type Loader } from "../harness";
import { SYSTEMS, writeRun } from "./systems";

// The chart's own markup, which tesserai styles and neither library draws: the tooltip's box (its
// label, its rows, each row's indicator, name and value) and the legend. React's is fed by Recharts
// (a payload of series and the label under the pointer), Vue's by Unovis (the datum under the
// pointer, through componentToString); given the same data, both write the same elements, classes
// and indicator colors. The container's classes are held by class-parity and ssr-parity, less each
// library's own selectors (slots.ts LIBRARY_CLASSES); the plot is its library's.

type Render = {
  createElement: (type: unknown, props?: unknown, ...children: unknown[]) => ReactElement;
  h: (type: unknown, props?: unknown, children?: unknown) => VNode;
  renderReact: (element: ReactElement) => string;
  renderVue: (render: () => VNode) => Promise<string>;
};
type Parts = Record<string, unknown>;

const config = { desktop: { label: "Desktop", color: "var(--chart-1)" }, mobile: { label: "Mobile", color: "var(--chart-2)" } };
const datum = { month: "Jan", desktop: 186, mobile: 1280 };
// Recharts' payload for the same datum: a series each, colored as the page colors its marks.
const series = (keys: string[]) => keys.map((key) => ({ name: key, dataKey: key, value: datum[key as "desktop"], color: `var(--color-${key})`, payload: datum }));

// Each element under the one matching `root`: its tag, classes, inline style (as sorted declarations)
// and its own text.
function tree(html: string, root: string) {
  const window = new Window();
  window.document.body.innerHTML = html;
  const top = window.document.body.querySelector(root);
  const out = top === null ? [] : [top, ...top.querySelectorAll("*")].map((el) => ({
    tag: el.tagName.toLowerCase(),
    classes: (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean).sort(),
    style: (el.getAttribute("style") ?? "").split(";").map((d) => d.replace(/\s+/g, "")).filter(Boolean).sort(),
    text: [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent?.trim()).filter(Boolean).join(" "),
  }));
  void window.happyDOM.close();
  return out;
}

let ssr: Loader;
let render: Render;
beforeAll(async () => {
  ssr = await createLoader("ssr");
  render = await ssr.load<Render>(join(FIXTURE_DIR, "harness/render-ssr.ts"));
});
afterAll(() => ssr.close());

const TOOLTIPS: [string, { react: Record<string, unknown>; vue: Record<string, unknown> }][] = [
  ["two series, dots, a label", { react: { payload: series(["desktop", "mobile"]), label: "Jan" }, vue: { payload: datum, x: "Jan" } }],
  ["one series, a line: the label nests beside the name", { react: { payload: series(["desktop"]), label: "Jan", indicator: "line" }, vue: { payload: { month: "Jan", desktop: 186 }, x: "Jan", indicator: "line" } }],
  ["dashed, no label, a class", { react: { payload: series(["desktop", "mobile"]), label: "Jan", indicator: "dashed", hideLabel: true, className: "w-40" }, vue: { payload: datum, x: "Jan", indicator: "dashed", hideLabel: true, class: "w-40" } }],
  ["no indicator, one color for every row", { react: { payload: series(["desktop", "mobile"]), label: "Jan", hideIndicator: true, color: "red" }, vue: { payload: datum, x: "Jan", hideIndicator: true, color: "red" } }],
  ["a label from the config, a class on it", { react: { payload: series(["mobile"]), label: "desktop", labelClassName: "italic" }, vue: { payload: { mobile: 1280 }, x: "desktop", labelClass: "italic" } }],
];

describe.each(Object.keys(SYSTEMS))("%s system", (name) => {
  let react: Parts;
  let vue: Parts;
  beforeAll(async () => {
    const system = SYSTEMS[name]!();
    react = await ssr.load(join(await writeRun(`chart-${name}-react`, "radix", system), "components/ui/chart.tsx"));
    vue = await ssr.load(join(await writeRun(`chart-${name}-vue`, "reka-ui", system), "components/ui/chart/index.ts"));
  });

  it.each(TOOLTIPS)("the tooltip: %s", async (_, props) => {
    const { createElement: e, h } = render;
    const reactHtml = render.renderReact(e(react["ChartContainer"], { id: "c", config }, e(react["ChartTooltipContent"], { active: true, ...props.react })));
    const vueHtml = await render.renderVue(() => h(vue["ChartContainer"], { id: "c", config }, { default: () => h(vue["ChartTooltipContent"], { config, ...props.vue }) }));
    const expected = tree(reactHtml, ".min-w-32");
    expect(expected.length).toBeGreaterThan(3);
    expect(tree(vueHtml, ".min-w-32")).toEqual(expected);
  });

  it.each([
    ["below the chart", {}],
    ["above it, with a class", { verticalAlign: "top", className: "gap-8" }],
  ] as const)("the legend: %s", async (_, props: Record<string, string>) => {
    const { createElement: e, h } = render;
    const payload = ["desktop", "mobile"].map((key) => ({ value: key, dataKey: key, color: `var(--color-${key})`, type: "rect" }));
    const { className, ...rest } = props;
    const reactHtml = render.renderReact(e(react["ChartContainer"], { id: "c", config }, e(react["ChartLegendContent"], { payload, ...props })));
    const vueHtml = await render.renderVue(() => h(vue["ChartContainer"], { id: "c", config }, { default: () => h(vue["ChartLegendContent"], { ...rest, class: className }) }));
    const expected = tree(reactHtml, ".justify-center:not([data-slot])");
    expect(expected.length).toBe(5);
    expect(tree(vueHtml, ".justify-center:not([data-slot])")).toEqual(expected);
  });
});
