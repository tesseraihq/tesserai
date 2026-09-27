import type { Anatomy } from "@tesserai/core";
import { CHART_CLASSES, chartContainer, chartPieces } from "../chart";
import type { GeneratedFile } from "../render";
import { quoted, svelteFile, UTILS_IMPORT } from "./emit";

// Chart on LayerChart 2, as shadcn-svelte's: LayerChart draws the plot (BarChart, AreaChart…,
// whose tooltip and legend snippets take these parts), and ChartContainer keeps tesserai's API (a
// config per chart, its colors as --color-<key>), themed from the same roles and tokens as the
// Recharts container (chartContainer). ChartTooltip is shadcn-svelte's (LayerChart's tooltip with
// our box in it); ChartTooltipContent and ChartLegendContent are our markup and classes, the React
// file's, reading the chart's tooltip and series from LayerChart, or a payload you give them.

export function chartFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = chartPieces(anatomy);
  const k = CHART_CLASSES;
  const utils: GeneratedFile = {
    path: "chart/chart-utils.ts",
    source: `import { getContext, setContext, type Component } from "svelte";
import type { Tooltip } from "layerchart";

// Format: { THEME_NAME: CSS_SELECTOR }
export const THEMES = { light: "", dark: ".dark" } as const;

// Each series by key: its label (and icon), and its color, one for both themes or one each.
// ChartContainer sets each as --color-<key>, which the marks and the tooltip use.
export type ChartConfig = {
  [k in string]: {
    label?: string;
    icon?: Component;
  } & ({ color?: string; theme?: never } | { color?: never; theme: Record<keyof typeof THEMES, string> });
};

// A series under the pointer, as LayerChart's tooltip has it.
export type TooltipPayload = Tooltip.TooltipSeries;

// The config entry for a series: by its key or label, or by the value its data gives that key.
export function getPayloadConfigFromPayload(config: ChartConfig, payload: TooltipPayload, key: string, data?: Record<string, unknown> | null) {
  let configKey = key;
  if (payload.key === key) configKey = payload.key;
  else if (payload.label === key) configKey = payload.label;
  else if (data != null && typeof data[key] === "string") configKey = data[key] as string;
  return configKey in config ? config[configKey] : config[key];
}

const CHART_CONTEXT = Symbol("CHART_CONTEXT");

// The chart's config, and its id: the tooltip, which LayerChart portals out of the chart, carries
// it too, so the chart's --color-<key> variables (and their dark values) reach its swatches.
type ChartContextValue = { readonly config: ChartConfig; readonly id?: string };

export function setChartContext(value: ChartContextValue) {
  return setContext(CHART_CONTEXT, value);
}

export function useChart(): ChartContextValue {
  return getContext<ChartContextValue | undefined>(CHART_CONTEXT) ?? { config: {} };
}
`,
  };
  const container = svelteFile("chart/chart-container.svelte", {
    script: `import type { HTMLAttributes } from "svelte/elements";
${UTILS_IMPORT(["cn", "type WithElementRef"])}
import ChartStyle from "./chart-style.svelte";
import { setChartContext, type ChartConfig } from "./chart-utils.js";

const classes = ${quoted(chartContainer(anatomy, "layerchart"))};
const uid = $props.id();

let { ref = $bindable(null), id = uid, class: className, children, config, ...restProps }: WithElementRef<HTMLAttributes<HTMLElement>> & { config: ChartConfig } = $props();

const chartId = $derived("chart-" + (id || uid));
setChartContext({
  get config() {
    return config;
  },
  get id() {
    return chartId;
  },
});`,
    markup: `<div bind:this={ref} data-slot="chart" data-chart={chartId} class={cn(classes, className)} {...restProps}>
  <ChartStyle id={chartId} {config} />
  {@render children?.()}
</div>`,
  });
  const style = svelteFile("chart/chart-style.svelte", {
    script: `import { THEMES, type ChartConfig } from "./chart-utils.js";

// Each series' color as --color-<key>, in each theme.
let { id, config }: { id: string; config: ChartConfig } = $props();

const css = $derived.by(() => {
  const colored = Object.entries(config).filter(([, item]) => item.theme ?? item.color);
  if (colored.length === 0) return null;
  return Object.entries(THEMES)
    .map(([theme, prefix]) => \`
\${prefix} [data-chart=\${id}] {
\${colored
  .map(([key, item]) => {
    const color = item.theme?.[theme as keyof typeof THEMES] ?? item.color;
    return color ? \`  --color-\${key}: \${color};\` : null;
  })
  .join("\\n")}
}
\`)
    .join("\\n");
});`,
    markup: `{#if css}
  {#key id}
    <svelte:element this={"style"}>{css}</svelte:element>
  {/key}
{/if}`,
  });
  const tooltipContent = svelteFile("chart/chart-tooltip-content.svelte", {
    script: `import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import { getChartContext } from "layerchart";
${UTILS_IMPORT(["cn", "type WithElementRef", "type WithoutChildren"])}
import { getPayloadConfigFromPayload, useChart, type TooltipPayload } from "./chart-utils.js";

const classes = ${quoted(slots["chart:tooltip"])};
const labelClasses = ${quoted(slots["chart:tooltip-label"])};
const valueClasses = ${quoted(slots["chart:tooltip-value"])};
const listClasses = "${k.list}";
const rowClasses = "${k.row}";
const indicatorClasses = "${k.indicator}";
const dotClasses = "${k.dot}";
const lineClasses = "${k.line}";
const dashedClasses = "${k.dashed}";
const nestedDashedClasses = "${k.nestedDashed}";
const bodyClasses = "${k.body}";
const centered = "items-center";
const atEnd = "items-end";

// The tooltip's box for the data under the pointer: its label (the x value, or labelKey's), and a
// row per series with its indicator (a dot, a line or a dashed line), name and value. Inside a
// LayerChart chart it reads the chart's tooltip; payload and label give it the series and label
// yourself.
let {
  ref = $bindable(null),
  class: className,
  payload,
  label,
  hideLabel = false,
  hideIndicator = false,
  indicator = "dot",
  nameKey,
  labelKey,
  labelClassName,
  labelFormatter,
  formatter,
  color,
  ...restProps
}: WithoutChildren<WithElementRef<HTMLAttributes<HTMLDivElement>>> & {
  payload?: TooltipPayload[];
  label?: unknown;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  indicator?: "line" | "dot" | "dashed";
  nameKey?: string;
  labelKey?: string;
  labelClassName?: string;
  labelFormatter?: (value: unknown, payload: TooltipPayload[]) => string | number;
  formatter?: Snippet<[{ value: unknown; name: string; item: TooltipPayload; index: number; payload: TooltipPayload[] }]>;
  color?: string;
} = $props();

const chart = useChart();
const context = getChartContext();
const series = $derived((payload ?? context.tooltip.series).filter((item) => item.value !== undefined));
const data = $derived(context.tooltip.data as Record<string, unknown> | null);

const tooltipLabel = $derived.by(() => {
  const [first] = series;
  if (hideLabel || first === undefined) return null;
  const value =
    labelKey !== undefined
      ? getPayloadConfigFromPayload(chart.config, first, labelKey, data)?.label
      : typeof label === "string"
        ? (chart.config[label]?.label ?? label)
        : (label ?? (data != null ? context.x(data) : undefined));
  if (value === undefined || value === null || value === "") return null;
  return labelFormatter ? labelFormatter(value, series) : value instanceof Date ? value.toLocaleDateString() : String(value);
});
const nestLabel = $derived(series.length === 1 && indicator !== "dot");
const valueText = (value: unknown) => (typeof value === "number" ? value.toLocaleString() : String(value));`,
    markup: `{#snippet TooltipLabel()}
  {#if tooltipLabel !== null}
    <div class={cn(labelClasses, labelClassName)}>{tooltipLabel}</div>
  {/if}
{/snippet}

<div bind:this={ref} data-chart={chart.id} class={cn(classes, className)} {...restProps}>
  {#if !nestLabel}
    {@render TooltipLabel()}
  {/if}
  <div class={listClasses}>
    {#each series as item, index (item.key + index)}
      {@const itemConfig = getPayloadConfigFromPayload(chart.config, item, nameKey ?? item.key ?? item.label ?? "value", data)}
      {@const indicatorColor = color ?? item.color ?? "var(--color-" + item.key + ")"}
      <div class={cn(rowClasses, indicator === "dot" && centered)}>
        {#if formatter && item.value !== undefined && item.label}
          {@render formatter({ value: item.value, name: item.label, item, index, payload: series })}
        {:else}
          {#if itemConfig?.icon}
            <itemConfig.icon />
          {:else if !hideIndicator}
            <div
              style="--color-bg: {indicatorColor}; --color-border: {indicatorColor};"
              class={cn(indicatorClasses, {
                [dotClasses]: indicator === "dot",
                [lineClasses]: indicator === "line",
                [dashedClasses]: indicator === "dashed",
                [nestedDashedClasses]: nestLabel && indicator === "dashed",
              })}
            ></div>
          {/if}
          <div class={cn(bodyClasses, nestLabel ? atEnd : centered)}>
            <div class={listClasses}>
              {#if nestLabel}
                {@render TooltipLabel()}
              {/if}
              <span>{itemConfig?.label ?? item.label}</span>
            </div>
            {#if item.value !== undefined && item.value !== null}
              <span class={valueClasses}>{valueText(item.value)}</span>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>`,
  });
  const tooltip = svelteFile("chart/chart-tooltip.svelte", {
    script: `import type { ComponentProps } from "svelte";
import { Tooltip as TooltipPrimitive } from "layerchart";
import ChartTooltipContent from "./chart-tooltip-content.svelte";

// LayerChart's tooltip with the system's box in it: the chart's tooltip snippet takes it.
let props: ComponentProps<typeof ChartTooltipContent> = $props();`,
    markup: `<TooltipPrimitive.Root variant="none">
  <ChartTooltipContent {...props} />
</TooltipPrimitive.Root>`,
  });
  const legend = svelteFile("chart/chart-legend-content.svelte", {
    script: `import type { HTMLAttributes } from "svelte/elements";
import { getChartContext } from "layerchart";
${UTILS_IMPORT(["cn", "type WithElementRef", "type WithoutChildren"])}
import { useChart } from "./chart-utils.js";

const classes = ${quoted(slots["chart:legend"])};
const itemClasses = "${k.legendItem}";
const swatchClasses = "${k.legendSwatch}";
// On the chart's edge, as LayerChart places its own legend: its snippet renders over the plot, and the
// chart keeps room for it at the bottom.
const above = "absolute inset-x-0 top-0 pb-3";
const below = "absolute inset-x-0 bottom-0 pt-3";

// A row of the chart's series, each with its swatch (or icon) and label: the chart's series inside a
// LayerChart chart (its legend snippet takes it), else the config's; payload lists them yourself.
let {
  ref = $bindable(null),
  class: className,
  hideIcon = false,
  nameKey,
  verticalAlign = "bottom",
  payload,
  ...restProps
}: WithoutChildren<WithElementRef<HTMLAttributes<HTMLDivElement>>> & {
  hideIcon?: boolean;
  nameKey?: string;
  verticalAlign?: "top" | "bottom";
  payload?: { key: string; color?: string }[];
} = $props();

const chart = useChart();
const context = getChartContext();
const items = $derived(
  (payload ?? (context.series.series.length > 0 ? context.series.series : Object.keys(chart.config).map((key) => ({ key, color: undefined })))).map((item) => {
    const key = nameKey ?? item.key;
    return { key, itemConfig: chart.config[key], color: item.color ?? "var(--color-" + key + ")" };
  }),
);`,
    markup: `{#if items.length > 0}
  <div bind:this={ref} class={cn(classes, verticalAlign === "top" ? above : below, className)} {...restProps}>
    {#each items as item (item.key)}
      <div class={cn(itemClasses)}>
        {#if item.itemConfig?.icon && !hideIcon}
          <item.itemConfig.icon />
        {:else}
          <div class={swatchClasses} style="background-color: {item.color};"></div>
        {/if}
        {item.itemConfig?.label}
      </div>
    {/each}
  </div>
{/if}`,
  });
  const index: GeneratedFile = {
    path: "chart/index.ts",
    source: `import Container from "./chart-container.svelte";
import Style from "./chart-style.svelte";
import Tooltip from "./chart-tooltip.svelte";
import TooltipContent from "./chart-tooltip-content.svelte";
import LegendContent from "./chart-legend-content.svelte";

export { getPayloadConfigFromPayload, THEMES, type ChartConfig, type TooltipPayload } from "./chart-utils.js";
// LayerChart's own legend, under shadcn's name.
export { Legend, Legend as ChartLegend } from "layerchart";

export {
  Container,
  Style,
  Tooltip,
  TooltipContent,
  LegendContent,
  //
  Container as ChartContainer,
  Style as ChartStyle,
  Tooltip as ChartTooltip,
  TooltipContent as ChartTooltipContent,
  LegendContent as ChartLegendContent,
};
`,
  };
  return [container, style, tooltip, tooltipContent, legend, utils, index];
}
