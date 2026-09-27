import { Anatomy } from "../components";

// Recharts, themed: five series colors (--chart-1 … --chart-5, as in shadcn) from the system's
// hues, and the axes, grid, cursor and tooltip from its neutrals.
export const chart = Anatomy.parse({
  name: "chart",
  parts: ["axis", "grid", "cursor", "tooltip", "tooltip-label", "tooltip-value", "legend"],
  states: [],
  axes: {},
  tokens: {
    "1": { $type: "color", $value: "{intent.primary.solid}" },
    "2": { $type: "color", $value: "{intent.info.solid}" },
    "3": { $type: "color", $value: "{intent.success.solid}" },
    "4": { $type: "color", $value: "{intent.warning.solid}" },
    "5": { $type: "color", $value: "{intent.danger.solid}" },
  },
  base: {
    axis: { base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.1}" } },
    grid: { base: { border: "{intent.neutral.border}" } },
    cursor: { base: { background: "{intent.neutral.subtle}", border: "{intent.neutral.border}" } },
    tooltip: {
      base: {
        background: "{surface.raised}",
        foreground: "{intent.neutral.text}",
        border: "{intent.neutral.border}",
        borderWidth: "{border.width}",
        radius: "{radius.lg}",
        shadow: "{shadow.lg}",
        paddingX: "{space.4}",
        paddingY: "{space.3}",
        gap: "{space.3}",
        fontSize: "{font.size.1}",
      },
    },
    "tooltip-label": { base: { foreground: "{intent.neutral.text-strong}", fontWeight: "{font.weight.medium}" } },
    "tooltip-value": { base: { foreground: "{intent.neutral.text-strong}", fontFamily: "{font.family.mono}", fontWeight: "{font.weight.medium}" } },
    legend: { base: { gap: "{space.5}" } },
  },
  sizes: {},
  variants: {},
});
