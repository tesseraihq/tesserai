import { Anatomy } from "../components";
import { rem } from "./shared";

// How far along something is: a bar, with an optional label and value.
export const progress = Anatomy.parse({
  name: "progress",
  parts: ["track", "indicator", "label", "value"],
  states: [],
  axes: {},
  tokens: {
    height: { $type: "dimension", $value: rem(6) },
    radius: { $type: "dimension", $value: "{radius.full}" },
  },
  base: {
    track: { base: { background: "{intent.neutral.subtle}", height: "{progress.height}", radius: "{progress.radius}" } },
    indicator: { base: { background: "{intent.primary.solid}", duration: "{motion.duration.base}", easing: "{motion.easing.standard}" } },
    label: { base: { fontSize: "{font.size.2}", fontWeight: "{font.weight.medium}" } },
    value: { base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.2}" } },
  },
  sizes: {},
  variants: {},
});
