import { Anatomy } from "../components";
import { disabled, focusRing, px, rem } from "./shared";

// Two looks, as in shadcn: line (an underline on the selected tab) and segmented (shadcn's default:
// the selected tab raised out of a tinted track).
export const tabs = Anatomy.parse({
  name: "tabs",
  parts: ["list", "tab", "indicator", "panel"],
  states: ["hover", "focus-visible", "disabled", "selected"],
  axes: {
    variant: { enabled: ["line", "segmented"], default: "line" },
  },
  tokens: {
    tab: {
      height: { $type: "dimension", $value: rem(36) },
      "padding-x": { $type: "dimension", $value: "{space.4}" },
      "font-size": { $type: "dimension", $value: "{font.size.2}" },
      radius: { $type: "dimension", $value: "{radius.sm}" },
    },
    list: {
      padding: { $type: "dimension", $value: px(3) },
      radius: { $type: "dimension", $value: "{radius.md}" },
    },
    gap: { $type: "dimension", $value: "{space.2}" },
    indicator: { height: { $type: "dimension", $value: px(2) } },
  },
  base: {
    list: { base: { gap: "{tabs.gap}" } },
    tab: {
      base: {
        foreground: "{intent.neutral.text}",
        height: "{tabs.tab.height}",
        paddingX: "{tabs.tab.padding-x}",
        fontSize: "{tabs.tab.font-size}",
        fontWeight: "{font.weight.medium}",
        radius: "{tabs.tab.radius}",
        duration: "{motion.duration.fast}",
        easing: "{motion.easing.standard}",
      },
      states: {
        hover: { foreground: "{intent.neutral.text-strong}" },
        selected: { foreground: "{intent.neutral.text-strong}" },
        "focus-visible": focusRing("{intent.primary.focus-ring}"),
        disabled,
      },
    },
    indicator: {
      base: { height: "{tabs.indicator.height}", duration: "{motion.duration.base}", easing: "{motion.easing.standard}" },
    },
    panel: { base: { paddingY: "{space.5}" } },
  },
  sizes: {},
  variants: {
    line: {
      list: { base: { border: "{intent.neutral.border}", borderWidth: "{border.width}" } },
      indicator: { base: { background: "{intent.primary.solid}" } },
    },
    segmented: {
      list: { base: { background: "{intent.neutral.subtle}", padding: "{tabs.list.padding}", radius: "{tabs.list.radius}", gap: "{space.1}" } },
      tab: {
        states: { selected: { background: "{surface.raised}", shadow: "{shadow.sm}" } },
      },
    },
  },
});
