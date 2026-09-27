import { cssVarName, refPath, resolveRecipe, type Anatomy } from "@tesserai/core";
import { NATIVE_STATES, utilityFor } from "./classes";
import { classString } from "./codegen";
import { flatClasses } from "./factor";

// The library each framework draws charts with, as its shadcn port does: Recharts (React), Unovis
// (Vue, as shadcn-vue) and LayerChart 2 (Svelte, as shadcn-svelte).
export type ChartLibrary = "recharts" | "unovis" | "layerchart";

// What the system paints in a chart, by role: the axes' labels, the grid, and the cursor (a line
// over line and area charts, a band behind a hovered bar).
export type ChartRole = "axis" | "grid" | "cursor-line" | "cursor-fill";
const ROLES: Record<ChartRole, { part: string; prop: "foreground" | "background" | "border" }> = {
  axis: { part: "axis", prop: "foreground" },
  grid: { part: "grid", prop: "border" },
  "cursor-line": { part: "cursor", prop: "border" },
  "cursor-fill": { part: "cursor", prop: "background" },
};

// Where each library draws a role: [role, painted as, selector]. Recharts and LayerChart take fill
// and stroke utilities on their SVG's elements; Unovis reads CSS variables, set on the container.
const PAINTED: Record<Exclude<ChartLibrary, "unovis">, [ChartRole, "fill" | "stroke", string][]> = {
  recharts: [
    ["axis", "fill", "[&_.recharts-cartesian-axis-tick_text]"],
    ["axis", "fill", "[&_.recharts-polar-angle-axis-tick_text]"],
    ["grid", "stroke", "[&_.recharts-cartesian-grid_line[stroke='#ccc']]"],
    ["grid", "stroke", "[&_.recharts-polar-grid_[stroke='#ccc']]"],
    ["grid", "stroke", "[&_.recharts-reference-line_[stroke='#ccc']]"],
    ["cursor-line", "stroke", "[&_.recharts-curve.recharts-tooltip-cursor]"],
    ["cursor-fill", "fill", "[&_.recharts-rectangle.recharts-tooltip-cursor]"],
    ["cursor-fill", "fill", "[&_.recharts-radial-bar-background-sector]"],
  ],
  layerchart: [
    ["axis", "fill", "[&_.lc-axis-tick-label]"],
    ["grid", "stroke", "[&_.lc-grid-x-rule]"],
    ["grid", "stroke", "[&_.lc-grid-y-rule]"],
    ["grid", "stroke", "[&_.lc-grid-x-radial-line]"],
    ["grid", "stroke", "[&_.lc-grid-y-radial-line]"],
    ["grid", "stroke", "[&_.lc-grid-y-radial-circle]"],
    ["cursor-line", "stroke", "[&_.lc-highlight-line]"],
    ["cursor-fill", "fill", "[&_.lc-highlight-area]"],
  ],
};
// Unovis has no band behind a hovered bar, so no cursor fill.
const UNOVIS_VARIABLES: [ChartRole, string][] = [
  ["axis", "--vis-axis-tick-label-color"],
  ["axis", "--vis-axis-label-color"],
  ["grid", "--vis-axis-grid-color"],
  ["cursor-line", "--vis-crosshair-line-stroke-color"],
];

// What each library needs beside the painted roles, none of it the system's.
const LIBRARY_CLASSES: Record<ChartLibrary, string[]> = {
  // No white ring around a hovered dot or slice, and no focus outline on the SVG's layers.
  recharts: [
    "[&_.recharts-dot[stroke='#fff']]:stroke-transparent",
    "[&_.recharts-layer]:outline-hidden",
    "[&_.recharts-sector]:outline-hidden",
    "[&_.recharts-sector[stroke='#fff']]:stroke-transparent",
    "[&_.recharts-surface]:outline-hidden",
  ],
  // The legend under the plot (Unovis draws it outside its SVG, where Recharts puts it inside), the
  // plot filling the container, the page's type in the axes at a regular weight, no ring around the
  // crosshair's dot, and Unovis' tooltip box emptied so ChartTooltipContent's is the one drawn.
  unovis: [
    "flex-col",
    "[&_[data-vis-xy-container]]:size-full",
    "[&_[data-vis-single-container]]:size-full",
    "[--vis-font-family:var(--font-sans)]",
    "[--vis-axis-tick-label-weight:normal]",
    "[--vis-crosshair-circle-stroke-color:transparent]",
    "[--vis-tooltip-padding:0px]",
    "[--vis-tooltip-background-color:transparent]",
    "[--vis-tooltip-border-color:transparent]",
    "[--vis-tooltip-text-color:currentColor]",
    "[--vis-tooltip-box-shadow:none]",
    "[--vis-tooltip-backdrop-filter:none]",
  ],
  // The chart filling the container, the axes' labels at a regular weight, no ring around a
  // highlighted point, and LayerChart's hit areas unpainted (as shadcn-svelte's container has them).
  // No outline on a bar (LayerChart's bar chart strokes them black; shadcn-svelte's examples each
  // turn it off). LayerChart draws the band over the bars, not behind them as Recharts does, so it
  // blends: multiplied on a light surface, screened on a dark one, it reads as behind them.
  layerchart: [
    "[&_.lc-root-container]:w-full",
    "[&_.lc-axis-tick-label]:font-normal",
    "[&_.lc-highlight-point]:stroke-transparent",
    "[&_.lc-tooltip-rects-g]:fill-transparent",
    "[&_.lc-layout-svg-g]:fill-transparent",
    "[&_.lc-bar]:stroke-transparent",
    "[&_.lc-highlight-area]:mix-blend-multiply",
    "dark:[&_.lc-highlight-area]:mix-blend-screen",
  ],
};

// Chart's classes, which every framework's shell prints from. The container is the one part a
// library draws into, so chartContainer writes it for each; the tooltip and legend are ours, the
// same markup in all three (CHART_CLASSES).
export function chartPieces(anatomy: Anatomy) {
  const c = (part: string, extra: string[] = []) => flatClasses(anatomy, part, { states: NATIVE_STATES }, extra);
  return {
    slots: {
      chart: chartContainer(anatomy, "recharts"),
      "chart:tooltip": c("tooltip", ["grid", "min-w-32", "items-start"]),
      "chart:tooltip-label": c("tooltip-label"),
      "chart:tooltip-value": c("tooltip-value", ["tabular-nums"]),
      "chart:legend": c("legend", ["flex", "items-center", "justify-center"]),
    },
  };
}

// The tooltip's and legend's own classes, the same in every framework.
export const CHART_CLASSES = {
  // The rows (and a row's name, beside a nested label).
  list: "grid gap-1.5",
  row: "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5",
  // The swatch before a row's name, by indicator: dot, line or dashed.
  indicator: "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
  dot: "h-2.5 w-2.5",
  line: "w-1",
  dashed: "w-0 border-[1.5px] border-dashed bg-transparent",
  nestedDashed: "my-0.5",
  body: "flex flex-1 justify-between leading-none",
  legendItem: "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3",
  legendSwatch: "h-2 w-2 shrink-0 rounded-[2px]",
} as const;

// The token each role is painted with: what every library's container agrees on.
export function chartRoleTokens(anatomy: Anatomy): Partial<Record<ChartRole, string>> {
  const recipe = resolveRecipe(anatomy, {});
  return Object.fromEntries(
    Object.entries(ROLES).flatMap(([role, { part, prop }]) => {
      const ref = recipe[part]?.base[prop];
      return ref === undefined ? [] : [[role, ref]];
    }),
  );
}

// The container's classes for a library: the layout and the axes' type size, each role in the
// system's colors where that library draws it, and what the library needs of its own.
export function chartContainer(anatomy: Anatomy, library: ChartLibrary): string[] {
  const recipe = resolveRecipe(anatomy, {});
  const ref = (role: ChartRole) => recipe[ROLES[role].part]?.base[ROLES[role].prop];
  const axisSize = flatClasses(anatomy, "axis", { states: NATIVE_STATES }).filter((c) => /^text-(\d|\(length:)/.test(c));
  const painted =
    library === "unovis"
      ? UNOVIS_VARIABLES.flatMap(([role, variable]) => {
          const value = ref(role);
          return value === undefined ? [] : [`[${variable}:var(${cssVarName(refPath(value))})]`];
        })
      : PAINTED[library].flatMap(([role, as, selector]) => {
          const value = ref(role);
          // text-neutral-text painted as a fill is fill-neutral-text.
          return value === undefined ? [] : [`${selector}:${utilityFor(ROLES[role].prop, value).replace(/^(text|bg|border)-/, `${as}-`)}`];
        });
  // Unovis sizes its axes' labels itself: the axes' type step, as its variable.
  const size = recipe["axis"]?.base.fontSize;
  const unovisSize = library === "unovis" && size !== undefined ? [`[--vis-axis-tick-label-font-size:var(${cssVarName(refPath(size))})]`] : [];
  return ["flex", "aspect-video", "justify-center", ...axisSize, ...unovisSize, ...painted, ...LIBRARY_CLASSES[library]];
}

// Chart as in shadcn (Recharts, a ChartConfig per chart, the same file on every library), its axes,
// grid, cursor and tooltip drawn from the system: Recharts' SVG takes fill and stroke, so the
// recipe's colors are turned into those.
export function renderChart(anatomy: Anatomy): string {
  const { slots } = chartPieces(anatomy);
  const container = slots.chart;
  const tooltip = slots["chart:tooltip"];
  const label = slots["chart:tooltip-label"];
  const value = slots["chart:tooltip-value"];
  const legend = slots["chart:legend"];
  const k = CHART_CLASSES;
  return `import * as React from "react"
import { cn } from "@/lib/utils"
import * as RechartsPrimitive from "recharts"
import type { TooltipValueType } from "recharts"

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const

const INITIAL_DIMENSION = { width: 320, height: 200 } as const
type TooltipNameType = number | string

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
>

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

function ChartContainer({
  id,
  className,
  children,
  config,
  initialDimension = INITIAL_DIMENSION,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"]
  initialDimension?: {
    width: number
    height: number
  }
}) {
  const uniqueId = React.useId()
  const chartId = \`chart-\${id ?? uniqueId.replace(/:/g, "")}\`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          ${classString(container)},
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer
          initialDimension={initialDimension}
        >
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, config]) => config.theme ?? config.color
  )

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => \`
\${prefix} [data-chart=\${id}] {
\${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ??
      itemConfig.color
    return color ? \`  --color-\${key}: \${color};\` : null
  })
  .join("\\n")}
}
\`
          )
          .join("\\n"),
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<"div"> & {
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: "line" | "dot" | "dashed"
    nameKey?: string
    labelKey?: string
  } & Omit<
    RechartsPrimitive.DefaultTooltipContentProps<
      TooltipValueType,
      TooltipNameType
    >,
    "accessibilityLayer"
  >) {
  const { config } = useChart()

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null
    }

    const [item] = payload
    const key = \`\${labelKey ?? item?.dataKey ?? item?.name ?? "value"}\`
    const itemConfig = getPayloadConfigFromPayload(config, item, key)
    const value =
      !labelKey && typeof label === "string"
        ? (config[label]?.label ?? label)
        : itemConfig?.label

    if (labelFormatter) {
      return (
        <div className={cn(${classString(label)}, labelClassName)}>
          {labelFormatter(value, payload)}
        </div>
      )
    }

    if (!value) {
      return null
    }

    return <div className={cn(${classString(label)}, labelClassName)}>{value}</div>
  }, [
    label,
    labelFormatter,
    payload,
    hideLabel,
    labelClassName,
    config,
    labelKey,
  ])

  if (!active || !payload?.length) {
    return null
  }

  const nestLabel = payload.length === 1 && indicator !== "dot"

  return (
    <div
      className={cn(${classString(tooltip)}, className)}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="${k.list}">
        {payload
          .filter((item) => item.type !== "none")
          .map((item, index) => {
            const key = \`\${nameKey ?? item.name ?? item.dataKey ?? "value"}\`
            const itemConfig = getPayloadConfigFromPayload(config, item, key)
            const indicatorColor = color ?? item.payload?.fill ?? item.color

            return (
              <div
                key={index}
                className={cn(
                  "${k.row}",
                  indicator === "dot" && "items-center"
                )}
              >
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && (
                        <div
                          className={cn(
                            "${k.indicator}",
                            {
                              "${k.dot}": indicator === "dot",
                              "${k.line}": indicator === "line",
                              "${k.dashed}":
                                indicator === "dashed",
                              "${k.nestedDashed}": nestLabel && indicator === "dashed",
                            }
                          )}
                          style={
                            {
                              "--color-bg": indicatorColor,
                              "--color-border": indicatorColor,
                            } as React.CSSProperties
                          }
                        />
                      )
                    )}
                    <div
                      className={cn(
                        "${k.body}",
                        nestLabel ? "items-end" : "items-center"
                      )}
                    >
                      <div className="${k.list}">
                        {nestLabel ? tooltipLabel : null}
                        <span>
                          {itemConfig?.label ?? item.name}
                        </span>
                      </div>
                      {item.value != null && (
                        <span className=${classString(value)}>
                          {typeof item.value === "number"
                            ? item.value.toLocaleString()
                            : String(item.value)}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}

const ChartLegend = RechartsPrimitive.Legend

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}: React.ComponentProps<"div"> & {
  hideIcon?: boolean
  nameKey?: string
} & RechartsPrimitive.DefaultLegendContentProps) {
  const { config } = useChart()

  if (!payload?.length) {
    return null
  }

  return (
    <div
      className={cn(
        ${classString(legend)},
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className
      )}
    >
      {payload
        .filter((item) => item.type !== "none")
        .map((item, index) => {
          const key = \`\${nameKey ?? item.dataKey ?? "value"}\`
          const itemConfig = getPayloadConfigFromPayload(config, item, key)

          return (
            <div
              key={index}
              className={cn(
                "${k.legendItem}"
              )}
            >
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div
                  className="${k.legendSwatch}"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}
              {itemConfig?.label}
            </div>
          )
        })}
    </div>
  )
}

function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string
) {
  if (typeof payload !== "object" || payload === null) {
    return undefined
  }

  const payloadPayload =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? payload.payload
      : undefined

  let configLabelKey: string = key

  if (
    key in payload &&
    typeof payload[key as keyof typeof payload] === "string"
  ) {
    configLabelKey = payload[key as keyof typeof payload] as string
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[
      key as keyof typeof payloadPayload
    ] as string
  }

  return configLabelKey in config ? config[configLabelKey] : config[key]
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
`;
}
