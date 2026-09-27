import type { Element, Node, Prop } from "./pages/jsx";

// A page's chart as the catalog builds it (Recharts, for the React preview), read back into what
// it shows, so the Vue and Svelte printers can write it for their own library (Unovis, LayerChart):
// the kind, the categories along x, each series' key, and the config and classes of the container.
export type PageChart = {
  kind: "bar" | "line" | "area";
  config: string;
  className: string | undefined;
  // The data as code (a JSON literal), and the field that names each category.
  data: string;
  categoryKey: string;
  categories: string[];
  series: string[];
  legend: boolean;
  tooltip: boolean;
  grid: boolean;
};

const KINDS: Record<string, PageChart["kind"]> = { BarChart: "bar", LineChart: "line", AreaChart: "area" };
const code = (prop: Prop) => (typeof prop === "object" && prop !== null && "expr" in prop ? prop.expr : undefined);

export function pageChartOf(node: Element): PageChart | null {
  if (node.tag !== "ChartContainer" || node.from !== "chart") return null;
  const chart = node.children.find((c): c is Element => c.k === "el" && c.from === "pkg:recharts" && c.tag in KINDS);
  const config = code(node.props["config"]);
  const data = chart === undefined ? undefined : code(chart.props["data"]);
  if (chart === undefined || config === undefined || data === undefined) return null;
  const children = chart.children.filter((c): c is Element => c.k === "el");
  const axis = children.find((c) => c.tag === "XAxis");
  const categoryKey = typeof axis?.props["dataKey"] === "string" ? axis.props["dataKey"] : "x";
  let rows: Record<string, unknown>[];
  try {
    rows = JSON.parse(data) as Record<string, unknown>[];
  } catch {
    return null;
  }
  const className = node.props["className"];
  return {
    kind: KINDS[chart.tag]!,
    config,
    className: typeof className === "string" ? className : undefined,
    data,
    categoryKey,
    categories: rows.map((r) => String(r[categoryKey] ?? "")),
    series: children.filter((c) => ["Bar", "Line", "Area"].includes(c.tag) && typeof c.props["dataKey"] === "string").map((c) => c.props["dataKey"] as string),
    legend: children.some((c) => c.tag === "ChartLegend"),
    tooltip: children.some((c) => c.tag === "ChartTooltip"),
    grid: children.some((c) => c.tag === "CartesianGrid"),
  };
}

// Every node of a tree, with each chart the catalog built replaced by what `write` makes of it.
export function replaceCharts(node: Node, write: (chart: PageChart, original: Element) => Node): Node {
  if (node.k === "frag") return { ...node, children: node.children.map((c) => replaceCharts(c, write)) };
  if (node.k === "trigger") return { ...node, child: replaceCharts(node.child, write) };
  if (node.k !== "el") return node;
  const chart = pageChartOf(node);
  if (chart !== null) return write(chart, node);
  return { ...node, children: node.children.map((c) => replaceCharts(c, write)) };
}
