import { renderAll } from "@tesserai/templates";
import { Window } from "happy-dom";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { aliasesFor, createRenderer, writeGenerated, type Renderer } from "../harness";
import { customSystem, DEFAULT_SYSTEM } from "./systems";

// The chart's own markup, which tesserai styles and neither library draws: the tooltip's box (its
// label, its rows, each row's indicator, name and value) and the legend. React's is fed by Recharts
// (a payload of series and the label under the pointer), Svelte's by LayerChart (its tooltip's
// series); given the same series, both write the same elements, classes and indicator colors. The
// container's classes are held by parity.test.ts, less each library's own selectors (dom.ts
// LIBRARY_CLASSES); the plot is its library's.

const config = `{ desktop: { label: "Desktop", color: "var(--chart-1)" }, mobile: { label: "Mobile", color: "var(--chart-2)" } }`;
const datum = { month: "Jan", desktop: 186, mobile: 1280 };
// Recharts' series, and LayerChart's, for the same datum, colored as the page colors its marks.
const recharts = (keys: string[]) => JSON.stringify(keys.map((key) => ({ name: key, dataKey: key, value: datum[key as "desktop"], color: `var(--color-${key})`, payload: datum })));
const layerchart = (keys: string[]) => JSON.stringify(keys.map((key) => ({ key, label: key, value: datum[key as "desktop"], color: `var(--color-${key})`, visible: true, config: { key } })));

const TOOLTIPS: [string, { react: string; svelte: string }][] = [
  ["two series, dots, a label", { react: `payload={${recharts(["desktop", "mobile"])}} label="Jan"`, svelte: `payload={${layerchart(["desktop", "mobile"])}} label="Jan"` }],
  ["one series, a line: the label nests beside the name", { react: `payload={${recharts(["desktop"])}} label="Jan" indicator="line"`, svelte: `payload={${layerchart(["desktop"])}} label="Jan" indicator="line"` }],
  ["dashed, no label, a class", { react: `payload={${recharts(["desktop", "mobile"])}} label="Jan" indicator="dashed" hideLabel className="w-40"`, svelte: `payload={${layerchart(["desktop", "mobile"])}} label="Jan" indicator="dashed" hideLabel class="w-40"` }],
  ["no indicator, one color for every row", { react: `payload={${recharts(["desktop", "mobile"])}} label="Jan" hideIndicator color="red"`, svelte: `payload={${layerchart(["desktop", "mobile"])}} label="Jan" hideIndicator color="red"` }],
  ["a label from the config, a class on it", { react: `payload={${recharts(["mobile"])}} label="desktop" labelClassName="italic"`, svelte: `payload={${layerchart(["mobile"])}} label="desktop" labelClassName="italic"` }],
];

// Each element under the one matching `root`: its tag, classes, inline style (as sorted declarations)
// and its own text.
function tree(html: string, root: string) {
  const window = new Window();
  window.document.body.innerHTML = html;
  const top = window.document.body.querySelector(root);
  const out =
    top === null
      ? []
      : [top, ...top.querySelectorAll("*")].map((el) => ({
          tag: el.tagName.toLowerCase(),
          classes: (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean).sort(),
          style: (el.getAttribute("style") ?? "").split(";").map((d) => d.replace(/\s+/g, "")).filter(Boolean).sort(),
          text: [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent?.trim()).filter(Boolean).join(" "),
        }));
  void window.happyDOM.close();
  return out;
}

describe.each([
  ["default", () => DEFAULT_SYSTEM],
  ["custom", customSystem],
] as const)("the %s system", (name, build) => {
  const label = `chart-${name}`;
  const ui = aliasesFor(label).ui;
  let renderer: Renderer;
  beforeAll(async () => {
    const system = build();
    renderer = await createRenderer();
    await renderer.writeReact(label, (await renderAll("radix", { ...system, base: "radix" }, { format: false })).filter((f) => f.path === "lib/utils.ts" || f.path === "components/ui/chart.tsx"));
    await writeGenerated(label, await renderAll("bits-ui", system, { format: false }));
  }, 60_000);
  afterAll(() => renderer?.close());

  async function render(entry: string, react: string, svelte: string) {
    const [r, s] = await Promise.all([
      renderer.react(label, entry, `import { ChartContainer, ChartLegendContent, ChartTooltipContent } from "@/components/ui/chart";\nfunction Entry() {\n  return <ChartContainer id="c" config={${config}}>${react}</ChartContainer>;\n}`),
      renderer.svelte(label, entry, `<script lang="ts">\n  import * as Chart from "${ui}/chart/index.js";\n</script>\n\n<Chart.Container id="c" config={${config}}>${svelte}</Chart.Container>\n`),
    ]);
    return { react: r, svelte: s };
  }

  it.each(TOOLTIPS.map(([title, props], i) => [title, props, i] as const))("the tooltip: %s", async (_, props, i) => {
    const html = await render(`tooltip-${i}`, `<ChartTooltipContent active ${props.react} />`, `<Chart.TooltipContent ${props.svelte} />`);
    const expected = tree(html.react, ".min-w-32");
    expect(expected.length).toBeGreaterThan(3);
    expect(tree(html.svelte, ".min-w-32")).toEqual(expected);
  }, 60_000);

  it.each([
    ["below the chart", "", ""],
    ["above it, with a class", `verticalAlign="top" className="gap-8"`, `verticalAlign="top" class="gap-8"`],
  ] as const)("the legend: %s", async (title, react, svelte) => {
    const payload = JSON.stringify(["desktop", "mobile"].map((key) => ({ value: key, dataKey: key, color: `var(--color-${key})`, type: "rect" })));
    const html = await render(`legend-${title.length}`, `<ChartLegendContent payload={${payload}} ${react} />`, `<Chart.LegendContent ${svelte} />`);
    const expected = tree(html.react, ".justify-center:not([data-slot])");
    expect(expected.length).toBe(5);
    // LayerChart draws its legend snippet over the plot (Recharts lays it out below), so Svelte's sits
    // on the chart's edge, in the room the chart keeps for it: the one difference.
    const [root, ...rest] = tree(html.svelte, ".justify-center:not([data-slot])");
    const edge = ["absolute", "inset-x-0", svelte === "" ? "bottom-0" : "top-0"];
    expect(root!.classes).toEqual(expect.arrayContaining(edge));
    expect([{ ...root!, classes: root!.classes.filter((c) => !edge.includes(c)) }, ...rest]).toEqual(expected);
  }, 60_000);
});
