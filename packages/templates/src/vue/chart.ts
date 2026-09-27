import type { Anatomy } from "@tesserai/core";
import { CHART_CLASSES, chartContainer, chartPieces } from "../chart";
import type { GeneratedFile } from "../render";
import { barrel, classList, folder, staticClasses } from "./sfc";

// Chart on Unovis, as shadcn-vue's: Unovis draws the plot (VisXYContainer, VisLine, VisAxis…) and
// its tooltip and crosshair take their content from componentToString, which renders
// ChartTooltipContent to the HTML Unovis shows. ChartContainer keeps tesserai's API (a config per
// chart, its colors as --color-<key>) and themes Unovis through its CSS variables from the same
// roles and tokens as the Recharts container (chartContainer). The tooltip's and legend's markup
// and classes are the React file's.

export function renderChart(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = chartPieces(anatomy);
  const k = CHART_CLASSES;
  const f = folder("chart");
  const index = `import type { Component, Ref } from "vue";
import { createContext } from "reka-ui";

// Format: { THEME_NAME: CSS_SELECTOR }
export const THEMES = { light: "", dark: ".dark" } as const;

// Each series by key: its label (and icon), and its color, one for both themes or one each.
// ChartContainer sets each as --color-<key>, which the marks and the tooltip use.
export type ChartConfig = Record<
  string,
  {
    label?: string | Component;
    icon?: string | Component;
  } & ({ color?: string; theme?: never } | { color?: never; theme: Record<keyof typeof THEMES, string> })
>;

export const [useChart, provideChartContext] = createContext<{ id: Ref<string>; config: Ref<ChartConfig> }>("ChartContainer");

export { componentToString } from "./utils";
// Unovis' own tooltip, crosshair and legend, under shadcn's names.
export { VisBulletLegend as ChartLegend, VisCrosshair as ChartCrosshair, VisTooltip as ChartTooltip } from "@unovis/vue";`;
  const utils: GeneratedFile = {
    path: "chart/utils.ts",
    source: `import type { Component } from "vue";
import type { ChartConfig } from ".";
import { h, render } from "vue";

// A tooltip or crosshair template for Unovis: renders the component (ChartTooltipContent) for the
// datum under the pointer, with the chart's config, to the HTML Unovis shows. Each datum is
// rendered once. Browser only: on the server there's no pointer to follow.
export function componentToString<P extends Record<string, unknown>>(config: ChartConfig, component: Component, props?: P) {
  if (typeof document === "undefined") return undefined;
  const cache = new Map<string, string>();
  return (datum: unknown, x: number | Date) => {
    const payload = datum !== null && typeof datum === "object" && "data" in datum ? (datum as { data: unknown }).data : datum;
    const key = JSON.stringify([payload, x]);
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const element = document.createElement("div");
    render(h(component, { ...props, payload, config, x }), element);
    const html = element.innerHTML;
    render(null, element);
    cache.set(key, html);
    return html;
  };
}

// The config entry for a key, or for the key's value in the datum (a pie's slice names its
// series by a field, as { browser: "chrome" }).
export function configFor(config: ChartConfig, payload: Record<string, unknown>, key: string) {
  const named = payload[key];
  return typeof named === "string" && named in config ? config[named] : config[key];
}
`,
  };
  const container = f.file(
    "ChartContainer",
    `import type { HTMLAttributes } from "vue";
import type { ChartConfig } from ".";
import { computed, toRef, useId } from "vue";
import { cn } from "@/lib/utils";
import { provideChartContext } from ".";
import ChartStyle from "./ChartStyle.vue";

// cursor: false hides the crosshair's line.
const props = defineProps<{ id?: string; class?: HTMLAttributes["class"]; config: ChartConfig; cursor?: boolean }>();
const uniqueId = useId();
const chartId = computed(() => "chart-" + (props.id ?? uniqueId));
provideChartContext({ id: chartId, config: toRef(props, "config") });`,
    `<div
  data-slot="chart"
  :data-chart="chartId"
  :class="cn(${classList(chartContainer(anatomy, "unovis"))}, props.class)"
  :style="cursor === false ? { '--vis-crosshair-line-stroke-width': '0px' } : undefined"
>
  <ChartStyle :id="chartId" :config="config" />
  <slot :id="chartId" :config="config" />
</div>`,
  );
  const style = f.file(
    "ChartStyle",
    `import type { ChartConfig } from ".";
import { Primitive } from "reka-ui";
import { computed } from "vue";
import { THEMES } from ".";

// Each series' color as --color-<key>, in each theme.
const props = defineProps<{ id: string; config: ChartConfig }>();
const css = computed(() => {
  const colored = Object.entries(props.config).filter(([, item]) => item.theme ?? item.color);
  if (colored.length === 0) return null;
  return Object.entries(THEMES)
    .map(
      ([theme, prefix]) =>
        "\\n" +
        prefix +
        " [data-chart=" +
        props.id +
        "] {\\n" +
        colored
          .map(([key, item]) => {
            const color = item.theme?.[theme as keyof typeof THEMES] ?? item.color;
            return color ? "  --color-" + key + ": " + color + ";" : null;
          })
          .join("\\n") +
        "\\n}\\n",
    )
    .join("\\n");
});`,
    `<Primitive v-if="css !== null" as="style">{{ css }}</Primitive>`,
  );
  const tooltip = f.file(
    "ChartTooltipContent",
    `import type { HTMLAttributes } from "vue";
import type { ChartConfig } from ".";
import { computed } from "vue";
import { cn } from "@/lib/utils";
import { useChart } from ".";
import { configFor } from "./utils";

// The tooltip's box for the datum under the pointer: its label (the x value, or labelKey's), and a
// row per series with its indicator (a dot, a line or a dashed line), name and value. Unovis gives
// it the datum as payload through componentToString; used as a component inside ChartContainer it
// reads the chart's config.
const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes["class"];
    labelClass?: HTMLAttributes["class"];
    payload?: Record<string, unknown>;
    config?: ChartConfig;
    x?: number | Date | string;
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "line" | "dot" | "dashed";
    nameKey?: string;
    labelKey?: string;
    color?: string;
    labelFormatter?: (x: number | Date | string) => string;
    formatter?: (value: unknown, name: string) => string;
  }>(),
  { payload: () => ({}), indicator: "dot", hideLabel: false, hideIndicator: false },
);
const chart = useChart(null);
const config = computed(() => props.config ?? chart?.config.value ?? {});

const rows = computed(() =>
  Object.entries(props.payload).flatMap(([key, value]) => {
    const itemConfig = configFor(config.value, props.payload, props.nameKey ?? key);
    if (!(key in config.value) && !(props.nameKey !== undefined && typeof value === "number")) return [];
    const fill = props.payload["fill"];
    return [{ key, value, itemConfig, color: props.color ?? (typeof fill === "string" ? fill : "var(--color-" + key + ")") }];
  }),
);
const nestLabel = computed(() => rows.value.length === 1 && props.indicator !== "dot");
const label = computed(() => {
  if (props.hideLabel) return null;
  if (props.labelKey !== undefined) {
    const named = config.value[props.labelKey]?.label ?? props.payload[props.labelKey];
    return typeof named === "string" || typeof named === "number" ? named : null;
  }
  if (props.x === undefined) return null;
  if (props.labelFormatter) return props.labelFormatter(props.x);
  const named = typeof props.x === "string" ? config.value[props.x]?.label : undefined;
  return typeof named === "string" ? named : props.x instanceof Date ? props.x.toLocaleDateString() : props.x;
});
const valueText = (value: unknown) => (typeof value === "number" ? value.toLocaleString() : String(value));`,
    `<div :class="cn(${classList(slots["chart:tooltip"])}, props.class)">
  <div v-if="!nestLabel && label !== null" :class="cn(${classList(slots["chart:tooltip-label"])}, labelClass)">{{ label }}</div>
  <div class="${k.list}">
    <div v-for="row in rows" :key="row.key" :class="cn('${k.row}', indicator === 'dot' && 'items-center')">
      <template v-if="formatter">{{ formatter(row.value, row.key) }}</template>
      <template v-else>
        <component :is="row.itemConfig.icon" v-if="row.itemConfig?.icon" />
        <div
          v-else-if="!hideIndicator"
          :class="
            cn('${k.indicator}', {
              '${k.dot}': indicator === 'dot',
              '${k.line}': indicator === 'line',
              '${k.dashed}': indicator === 'dashed',
              '${k.nestedDashed}': nestLabel && indicator === 'dashed',
            })
          "
          :style="{ '--color-bg': row.color, '--color-border': row.color }"
        />
        <div :class="cn('${k.body}', nestLabel ? 'items-end' : 'items-center')">
          <div class="${k.list}">
            <div v-if="nestLabel && label !== null" :class="cn(${classList(slots["chart:tooltip-label"])}, labelClass)">{{ label }}</div>
            <span>
              <component :is="row.itemConfig.label" v-if="row.itemConfig?.label !== undefined && typeof row.itemConfig.label !== 'string'" />
              <template v-else>{{ row.itemConfig?.label ?? row.key }}</template>
            </span>
          </div>
          <span v-if="row.value !== undefined && row.value !== null" ${staticClasses(slots["chart:tooltip-value"])}>{{ valueText(row.value) }}</span>
        </div>
      </template>
    </div>
  </div>
</div>`,
  );
  const legend = f.file(
    "ChartLegendContent",
    `import type { HTMLAttributes } from "vue";
import { computed } from "vue";
import { cn } from "@/lib/utils";
import { useChart } from ".";

// A row of the chart's series, each with its swatch (or icon) and label, from the config; or from
// payload, the series a legend lists ({ dataKey, color }), where it isn't all of them.
const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes["class"];
    hideIcon?: boolean;
    nameKey?: string;
    verticalAlign?: "top" | "bottom";
    payload?: { dataKey?: string; color?: string }[];
  }>(),
  { hideIcon: false, verticalAlign: "bottom", nameKey: undefined, payload: undefined },
);
const { config } = useChart();
const items = computed(() =>
  (props.payload ?? Object.keys(config.value).map((dataKey) => ({ dataKey, color: undefined }))).map((item) => {
    const key = props.nameKey ?? item.dataKey ?? "value";
    return { key, itemConfig: config.value[key], color: item.color ?? "var(--color-" + key + ")" };
  }),
);`,
    `<div v-if="items.length > 0" :class="cn(${classList(slots["chart:legend"])}, verticalAlign === 'top' ? 'pb-3' : 'pt-3', props.class)">
  <div v-for="item in items" :key="item.key" :class="cn('${k.legendItem}')">
    <component :is="item.itemConfig.icon" v-if="item.itemConfig?.icon && !hideIcon" />
    <div v-else class="${k.legendSwatch}" :style="{ backgroundColor: item.color }" />
    <component :is="item.itemConfig.label" v-if="item.itemConfig?.label !== undefined && typeof item.itemConfig.label !== 'string'" />
    <template v-else>{{ item.itemConfig?.label }}</template>
  </div>
</div>`,
  );
  return [container, style, tooltip, legend, utils, barrel("chart", ["ChartContainer", "ChartLegendContent", "ChartStyle", "ChartTooltipContent"], index)];
}
