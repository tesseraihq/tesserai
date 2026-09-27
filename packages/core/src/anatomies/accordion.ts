import { Anatomy } from "../components";
import { disabled, focusRing, rem } from "./shared";

// Stacked sections that open one (or several) at a time; items are divided by a rule.
export const accordion = Anatomy.parse({
  name: "accordion",
  parts: ["root", "item", "trigger", "icon", "content"],
  states: ["hover", "focus-visible", "disabled", "open"],
  axes: {},
  tokens: {
    trigger: {
      "padding-y": { $type: "dimension", $value: "{space.4}" },
      "font-size": { $type: "dimension", $value: "{font.size.2}" },
    },
    "icon-size": { $type: "dimension", $value: rem(16) },
    "content-padding": { $type: "dimension", $value: "{space.4}" },
  },
  base: {
    item: { base: { border: "{intent.neutral.border}", borderWidth: "{border.width}" } },
    trigger: {
      base: {
        foreground: "{intent.neutral.text-strong}",
        paddingY: "{accordion.trigger.padding-y}",
        fontSize: "{accordion.trigger.font-size}",
        fontWeight: "{font.weight.medium}",
        radius: "{radius.sm}",
        gap: "{space.4}",
      },
      states: { hover: { textDecoration: "underline" }, "focus-visible": focusRing("{intent.primary.focus-ring}"), disabled },
    },
    icon: { base: { foreground: "{intent.neutral.text}", size: "{accordion.icon-size}", duration: "{motion.duration.base}", easing: "{motion.easing.standard}" } },
    content: {
      base: {
        foreground: "{intent.neutral.text}",
        fontSize: "{font.size.2}",
        paddingY: "{accordion.content-padding}",
        duration: "{motion.duration.base}",
        easing: "{motion.easing.standard}",
      },
    },
  },
  sizes: {},
  variants: {},
});
