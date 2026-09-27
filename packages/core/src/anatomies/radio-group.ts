import { Anatomy } from "../components";
import { disabled, focusRing, rem } from "./shared";

export const radioGroup = Anatomy.parse({
  name: "radio-group",
  parts: ["group", "item", "indicator"],
  states: ["hover", "focus-visible", "disabled", "selected", "invalid"],
  axes: {
    size: { enabled: ["sm", "md"], default: "md" },
  },
  tokens: {
    size: {
      sm: { $type: "dimension", $value: rem(16) },
      md: { $type: "dimension", $value: rem(20) },
    },
    "dot-size": {
      sm: { $type: "dimension", $value: rem(6) },
      md: { $type: "dimension", $value: rem(8) },
    },
    gap: { $type: "dimension", $value: "{space.4}" },
  },
  base: {
    group: { base: { gap: "{radio-group.gap}" } },
    item: {
      base: {
        background: "{intent.neutral.background}",
        border: "{intent.neutral.border-strong}",
        borderWidth: "{border.width}",
        radius: "{radius.full}",
        duration: "{motion.duration.fast}",
        easing: "{motion.easing.standard}",
        cursor: "pointer",
      },
      states: {
        hover: { background: "{intent.neutral.subtle}" },
        "focus-visible": focusRing("{intent.primary.focus-ring}"),
        // Filled when chosen, like shadcn's; the strong border keeps a light brand visible.
        selected: { background: "{intent.primary.solid}", border: "{intent.primary.border-strong}" },
        invalid: { border: "{intent.danger.border-strong}" },
        disabled,
      },
    },
    // The dot only shows inside a chosen item, so it sits on the solid fill.
    indicator: { base: { background: "{intent.primary.solid-foreground}", radius: "{radius.full}" } },
  },
  sizes: {
    sm: { item: { base: { size: "{radio-group.size.sm}" } }, indicator: { base: { size: "{radio-group.dot-size.sm}" } } },
    md: { item: { base: { size: "{radio-group.size.md}" } }, indicator: { base: { size: "{radio-group.dot-size.md}" } } },
  },
  variants: {},
});
